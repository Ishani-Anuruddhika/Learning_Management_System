<?php

namespace App\Http\Controllers;

use App\Http\Presenters\Presenter;
use App\Models\StockRequest;
use App\Services\RequestWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RequestController extends Controller
{
    private const WITH = ['items', 'approvals.approver', 'requester', 'department', 'district'];

    public function __construct(private RequestWorkflow $workflow)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $requests = StockRequest::visibleTo($user)
            ->with(self::WITH)
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('request_date')
            ->orderByDesc('id')
            ->get();

        return response()->json($requests->map(fn ($r) => Presenter::request($r, $user)));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $r = StockRequest::visibleTo($user)->with(self::WITH)->findOrFail($id);

        return response()->json(Presenter::request($r, $user));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1|max:50',
            'items.*.stockItemId' => 'required|integer|exists:items,id',
            'items.*.qty' => 'required|integer|min:1|max:1000000',
        ]);

        // Merge duplicate lines for the same item.
        $quantities = [];
        foreach ($data['items'] as $row) {
            $id = (int) $row['stockItemId'];
            $quantities[$id] = ($quantities[$id] ?? 0) + (int) $row['qty'];
        }

        $created = $this->workflow->submit($request->user(), $quantities, $data['notes'] ?? null);

        return response()->json($this->fresh($created->id, $request), 201);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $r = StockRequest::visibleTo($request->user())->findOrFail($id);
        $this->workflow->approve($r, $request->user());

        return response()->json($this->fresh($id, $request));
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['notes' => 'nullable|string|max:1000']);

        $r = StockRequest::visibleTo($request->user())->findOrFail($id);
        $this->workflow->reject($r, $request->user(), $data['notes'] ?? null);

        return response()->json($this->fresh($id, $request));
    }

    private function fresh(int $id, Request $request): array
    {
        return Presenter::request(StockRequest::with(self::WITH)->findOrFail($id), $request->user());
    }
}
