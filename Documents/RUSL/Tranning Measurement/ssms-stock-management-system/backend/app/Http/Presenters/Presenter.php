<?php

namespace App\Http\Presenters;

use App\Models\Department;
use App\Models\District;
use App\Models\Item;
use App\Models\StockRequest;
use App\Models\StockTransaction;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\RequestWorkflow;

/**
 * Shapes API output to match the camelCase types used by the React front end.
 * IDs are returned as strings.
 */
class Presenter
{
    public static function user(User $u): array
    {
        $u->loadMissing('role.permissions');

        return [
            'id' => (string) $u->id,
            'username' => $u->username,
            'name' => $u->name,
            'title' => $u->title,
            'role' => $u->role->name,
            'roleLabel' => $u->role->label,
            'districtId' => $u->district_id ? (string) $u->district_id : null,
            'deptId' => $u->department_id ? (string) $u->department_id : null,
            'permissions' => $u->permissionKeys(),
        ];
    }

    /** Row for the admin Users page. */
    public static function appUser(User $u): array
    {
        $u->loadMissing(['role', 'department', 'district']);

        return [
            'id' => (string) $u->id,
            'username' => $u->username,
            'name' => $u->name,
            'email' => $u->email,
            'employeeId' => $u->employee_id,
            'title' => $u->title,
            'role' => $u->role->name,
            'roleLabel' => $u->role->label,
            'departmentId' => $u->department_id ? (string) $u->department_id : null,
            'districtId' => $u->district_id ? (string) $u->district_id : null,
            'assignedTo' => $u->district?->name ? $u->district->name . ' District' : ($u->department?->name ? $u->department->name . ' Dept' : null),
            'isActive' => $u->is_active,
            'registrationStatus' => $u->registration_status,
        ];
    }

    public static function department(Department $d): array
    {
        return [
            'id' => (string) $d->id,
            'name' => $d->name,
            'head' => (string) $d->head_name,
            'email' => (string) $d->email,
            'phone' => (string) $d->phone,
        ];
    }

    public static function district(District $d): array
    {
        return [
            'id' => (string) $d->id,
            'number' => $d->number,
            'name' => $d->name,
            'head' => (string) $d->head_name,
            'email' => (string) $d->email,
            'phone' => (string) $d->phone,
        ];
    }

    /** Expects category + batches loaded. */
    public static function item(Item $i): array
    {
        return [
            'id' => (string) $i->id,
            'code' => $i->code,
            'name' => $i->name,
            'category' => $i->category->name,
            'unit' => $i->unit,
            'minStock' => $i->min_stock,
            'batches' => $i->batches->map(fn ($b) => [
                'id' => (string) $b->id,
                'batchNo' => $b->batch_no,
                'receivedDate' => $b->received_date->toDateString(),
                'quantity' => $b->quantity_received,
                'issuedQty' => $b->quantity_received - $b->quantity_remaining,
                'unitCost' => (float) $b->unit_cost,
                'expiryDate' => $b->expiry_date?->toDateString(),
            ])->values()->all(),
        ];
    }

    /** Expects items, approvals.approver, requester, department, district loaded. */
    public static function request(StockRequest $r, User $viewer): array
    {
        return [
            'id' => (string) $r->id,
            'requestNo' => $r->request_no,
            'requestDate' => $r->request_date->toDateString(),
            'requesterType' => $r->requester_type,
            'departmentId' => $r->department_id ? (string) $r->department_id : null,
            'districtId' => $r->district_id ? (string) $r->district_id : null,
            'requesterName' => $r->requester?->name,
            'items' => $r->items->map(fn ($li) => [
                'stockItemId' => (string) $li->item_id,
                'requestedQty' => $li->requested_qty,
                'issuedQty' => $li->issued_qty,
            ])->values()->all(),
            'status' => $r->status,
            'approvalHistory' => $r->approvals->map(fn ($a) => [
                'role' => $a->stage,
                'label' => RequestWorkflow::LABELS[$a->stage] ?? $a->stage,
                'approvedBy' => $a->approver?->name,
                'date' => $a->acted_at->toDateString(),
                'notes' => $a->notes,
                'action' => $a->action,
            ])->values()->all(),
            'notes' => $r->notes,
            'canAct' => RequestWorkflow::stepFor($r, $viewer) !== null,
        ];
    }

    /** Expects item and batch and request loaded. */
    public static function transaction(StockTransaction $t): array
    {
        return [
            'id' => (string) $t->id,
            'date' => $t->occurred_on->toDateString(),
            'type' => $t->type,
            'itemId' => (string) $t->item_id,
            'itemName' => $t->item->name,
            'batchNo' => $t->batch->batch_no,
            'quantity' => $t->quantity,
            'requestNo' => $t->request?->request_no,
            'reference' => (string) $t->reference,
        ];
    }

    public static function notification(UserNotification $n): array
    {
        return [
            'id' => (string) $n->id,
            'message' => $n->message,
            'isRead' => $n->is_read,
            'requestId' => $n->stock_request_id ? (string) $n->stock_request_id : null,
            'createdAt' => $n->created_at->toIso8601String(),
        ];
    }
}
