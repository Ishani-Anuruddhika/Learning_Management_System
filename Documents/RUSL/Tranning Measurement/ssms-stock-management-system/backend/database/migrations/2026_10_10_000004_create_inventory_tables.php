<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('item_categories', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->timestamps();
        });

        Schema::create('items', function (Blueprint $t) {
            $t->id();
            $t->string('code', 40)->unique();
            $t->string('name');
            $t->foreignId('category_id')->constrained('item_categories');
            $t->string('unit', 40)->default('Piece');
            $t->unsignedInteger('min_stock')->default(0);
            $t->timestamps();
        });

        Schema::create('suppliers', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('contact_info')->nullable();
            $t->string('address')->nullable();
            $t->timestamps();
        });

        // One row per intake lot. FIFO = oldest received_date (then id) with quantity_remaining > 0.
        Schema::create('stock_batches', function (Blueprint $t) {
            $t->id();
            $t->foreignId('item_id')->constrained()->cascadeOnDelete();
            $t->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $t->string('batch_no', 60);
            $t->date('received_date');
            $t->date('expiry_date')->nullable();
            $t->unsignedInteger('quantity_received');
            $t->unsignedInteger('quantity_remaining');
            $t->decimal('unit_cost', 12, 2)->default(0);
            $t->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->unique(['item_id', 'batch_no']);
            $t->index(['item_id', 'received_date', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_batches');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('items');
        Schema::dropIfExists('item_categories');
    }
};
