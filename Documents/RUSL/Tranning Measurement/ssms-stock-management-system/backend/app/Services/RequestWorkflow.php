<?php

namespace App\Services;

use App\Models\RequestApproval;
use App\Models\StockBatch;
use App\Models\StockIssue;
use App\Models\StockRequest;
use App\Models\StockTransaction;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The approval chain and FIFO issuing rules.
 *
 *   External (district):  pending -> coord_approved -> accounts_approved -> issued
 *   Internal (department):         pending         -> accounts_approved -> issued
 *   Any acting step can also reject -> rejected
 */
class RequestWorkflow
{
    public const LABELS = [
        'district_coordinator' => 'Head of District Coordinator',
        'head_accounts' => 'Head of Accounts',
        'store_officer' => 'Store Officer',
    ];

    /** The step (if any) this user may perform on this request right now. */
    public static function stepFor(StockRequest $r, User $u): ?array
    {
        $external = $r->requester_type === 'external';

        if ($u->hasPermission('approve_coordinator') && $external && $r->status === 'pending') {
            return ['stage' => 'district_coordinator', 'next' => 'coord_approved'];
        }

        if ($u->hasPermission('approve_accounts')
            && (($external && $r->status === 'coord_approved') || (! $external && $r->status === 'pending'))) {
            return ['stage' => 'head_accounts', 'next' => 'accounts_approved'];
        }

        if ($u->hasPermission('issue_stock') && $r->status === 'accounts_approved') {
            return ['stage' => 'store_officer', 'next' => 'issued'];
        }

        return null;
    }

    /** Create a request for a district head (external) or department head (internal). */
    public function submit(User $user, array $itemQuantities, ?string $notes): StockRequest
    {
        $role = $user->role->name;

        if ($role === 'district_head' && $user->district_id) {
            $type = 'external';
        } elseif ($role === 'dept_head' && $user->department_id) {
            $type = 'internal';
        } else {
            $this->fail('Your account is not linked to a district or department, so it cannot raise requests.', 422);
        }

        return DB::transaction(function () use ($user, $type, $itemQuantities, $notes) {
            $request = StockRequest::create([
                'request_no' => 'TMP-' . uniqid(),
                'request_date' => now()->toDateString(),
                'requester_type' => $type,
                'department_id' => $type === 'internal' ? $user->department_id : null,
                'district_id' => $type === 'external' ? $user->district_id : null,
                'requester_id' => $user->id,
                'notes' => $notes,
                'status' => 'pending',
            ]);

            $request->update(['request_no' => sprintf('RQ-%s-%04d', now()->format('Y'), $request->id)]);

            foreach ($itemQuantities as $itemId => $qty) {
                $request->items()->create(['item_id' => $itemId, 'requested_qty' => $qty]);
            }

            $firstApprover = $type === 'external' ? 'approve_coordinator' : 'approve_accounts';
            $this->notifyPermission(
                $firstApprover,
                $request,
                "New request {$request->request_no} from {$this->requesterLabel($request)} is awaiting your approval."
            );

            return $request;
        });
    }

    public function approve(StockRequest $request, User $user): StockRequest
    {
        return DB::transaction(function () use ($request, $user) {
            $r = StockRequest::whereKey($request->id)->lockForUpdate()->firstOrFail();
            $step = self::stepFor($r, $user);

            if (! $step) {
                $this->fail('You cannot act on this request at its current stage.', 403);
            }

            if ($step['next'] === 'issued') {
                $this->issue($r, $user);
            }

            RequestApproval::create([
                'stock_request_id' => $r->id,
                'stage' => $step['stage'],
                'approver_id' => $user->id,
                'action' => 'approved',
            ]);

            $r->update(['status' => $step['next']]);

            $this->notifyAfterApproval($r, $step, $user);

            return $r;
        });
    }

    public function reject(StockRequest $request, User $user, ?string $notes): StockRequest
    {
        return DB::transaction(function () use ($request, $user, $notes) {
            $r = StockRequest::whereKey($request->id)->lockForUpdate()->firstOrFail();
            $step = self::stepFor($r, $user);

            if (! $step) {
                $this->fail('You cannot act on this request at its current stage.', 403);
            }

            RequestApproval::create([
                'stock_request_id' => $r->id,
                'stage' => $step['stage'],
                'approver_id' => $user->id,
                'action' => 'rejected',
                'notes' => $notes,
            ]);

            $r->update(['status' => 'rejected']);

            $reason = $notes ? " Reason: {$notes}" : '';
            $this->notify($r->requester_id, $r, "Your request {$r->request_no} was rejected by " . self::LABELS[$step['stage']] . ".{$reason}");

            return $r;
        });
    }

    /**
     * FIFO issue: for every requested item, drain the oldest batch first (received_date, then id),
     * moving on to the next batch until the quantity is covered. Rolls back everything if any
     * item is short. Must be called inside a DB transaction.
     */
    private function issue(StockRequest $r, User $user): void
    {
        $r->load('items.item');
        $reference = $this->requesterLabel($r);

        foreach ($r->items as $line) {
            $need = $line->requested_qty;

            /** @var Collection<int, StockBatch> $batches */
            $batches = StockBatch::where('item_id', $line->item_id)
                ->where('quantity_remaining', '>', 0)
                ->orderBy('received_date')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $available = (int) $batches->sum('quantity_remaining');

            if ($available < $need) {
                $this->fail("Insufficient stock for {$line->item->name}: requested {$need}, available {$available}.", 422);
            }

            foreach ($batches as $batch) {
                if ($need <= 0) {
                    break;
                }

                $take = min($batch->quantity_remaining, $need);
                $batch->decrement('quantity_remaining', $take);

                StockIssue::create([
                    'stock_request_item_id' => $line->id,
                    'batch_id' => $batch->id,
                    'quantity' => $take,
                    'issued_by' => $user->id,
                ]);

                StockTransaction::create([
                    'type' => 'issue',
                    'occurred_on' => now()->toDateString(),
                    'item_id' => $line->item_id,
                    'batch_id' => $batch->id,
                    'quantity' => $take,
                    'stock_request_id' => $r->id,
                    'reference' => $reference,
                    'user_id' => $user->id,
                ]);

                $need -= $take;
            }

            $line->update(['issued_qty' => $line->requested_qty]);
        }
    }

    public function requesterLabel(StockRequest $r): string
    {
        $r->loadMissing(['district', 'department', 'requester']);
        $org = $r->requester_type === 'external'
            ? ($r->district?->name . ' District')
            : ($r->department?->name . ' Dept');

        return $org . ' — ' . $r->requester?->name;
    }

    private function notifyAfterApproval(StockRequest $r, array $step, User $actor): void
    {
        $label = self::LABELS[$step['stage']];

        if ($step['next'] === 'coord_approved') {
            $this->notify($r->requester_id, $r, "Your request {$r->request_no} was approved by {$label} and is now with Accounts.");
            $this->notifyPermission('approve_accounts', $r, "Request {$r->request_no} was approved by the Coordinator and awaits Accounts approval.");
        } elseif ($step['next'] === 'accounts_approved') {
            $this->notify($r->requester_id, $r, "Your request {$r->request_no} was approved by {$label} and is waiting for the Store Officer.");
            $this->notifyPermission('issue_stock', $r, "Request {$r->request_no} is approved and ready to issue.");
        } else {
            $this->notify($r->requester_id, $r, "Your request {$r->request_no} has been issued by the Store.");
        }
    }

    private function notify(int $userId, StockRequest $r, string $message): void
    {
        UserNotification::create([
            'user_id' => $userId,
            'stock_request_id' => $r->id,
            'message' => $message,
        ]);
    }

    private function notifyPermission(string $permissionKey, StockRequest $r, string $message): void
    {
        User::where('is_active', true)
            ->whereHas('role.permissions', fn ($q) => $q->where('key', $permissionKey))
            ->pluck('id')
            ->each(fn ($id) => $this->notify($id, $r, $message));
    }

    private function fail(string $message, int $status): never
    {
        throw new HttpResponseException(response()->json(['message' => $message], $status));
    }
}
