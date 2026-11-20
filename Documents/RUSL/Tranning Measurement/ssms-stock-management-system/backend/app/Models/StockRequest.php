<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockRequest extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['request_date' => 'date'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockRequestItem::class);
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(RequestApproval::class)->orderBy('acted_at')->orderBy('id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    /**
     * Which requests a user is allowed to see:
     *  - view_all_requests  -> everything (admin, accounts, store officer)
     *  - approve_coordinator -> district (external) requests only
     *  - create_request     -> only their own district / department
     */
    public function scopeVisibleTo(Builder $q, User $user): Builder
    {
        if ($user->hasPermission('view_all_requests')) {
            return $q;
        }
        if ($user->hasPermission('approve_coordinator')) {
            return $q->where('requester_type', 'external');
        }
        if ($user->hasPermission('view_own_requests')) {
            if ($user->district_id) {
                return $q->where('district_id', $user->district_id);
            }
            if ($user->department_id) {
                return $q->where('department_id', $user->department_id);
            }
        }
        return $q->whereRaw('1 = 0');
    }
}
