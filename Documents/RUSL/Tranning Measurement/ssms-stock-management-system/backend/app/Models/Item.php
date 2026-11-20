<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    protected $guarded = [];

    public function category(): BelongsTo
    {
        return $this->belongsTo(ItemCategory::class, 'category_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(StockBatch::class)->orderBy('received_date')->orderBy('id');
    }

    public function availableQty(): int
    {
        return (int) $this->batches->sum('quantity_remaining');
    }
}
