<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_requests', function (Blueprint $t) {
            $t->id();
            $t->string('request_no', 40)->unique();
            $t->date('request_date');
            $t->enum('requester_type', ['internal', 'external']);
            $t->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('district_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('requester_id')->constrained('users');
            $t->text('notes')->nullable();
            $t->string('status', 24)->default('pending')->index();
            $t->timestamps();
        });

        // A request can ask for several items (the Figma design has multi-item requests).
        Schema::create('stock_request_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('stock_request_id')->constrained()->cascadeOnDelete();
            $t->foreignId('item_id')->constrained();
            $t->unsignedInteger('requested_qty');
            $t->unsignedInteger('issued_qty')->default(0);
            $t->unique(['stock_request_id', 'item_id']);
        });

        // One row per approval/rejection step (coordinator stage, accounts stage, store officer).
        Schema::create('request_approvals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('stock_request_id')->constrained()->cascadeOnDelete();
            $t->string('stage', 40);
            $t->foreignId('approver_id')->constrained('users');
            $t->enum('action', ['approved', 'rejected']);
            $t->text('notes')->nullable();
            $t->timestamp('acted_at')->useCurrent();
        });

        // FIFO audit trail: exactly which batch supplied each issued quantity.
        Schema::create('stock_issues', function (Blueprint $t) {
            $t->id();
            $t->foreignId('stock_request_item_id')->constrained()->cascadeOnDelete();
            $t->foreignId('batch_id')->constrained('stock_batches');
            $t->unsignedInteger('quantity');
            $t->foreignId('issued_by')->constrained('users');
            $t->timestamp('issued_at')->useCurrent();
        });

        // Ledger of receipts and issues (drives the Transactions page and the annual report).
        Schema::create('stock_transactions', function (Blueprint $t) {
            $t->id();
            $t->enum('type', ['receipt', 'issue']);
            $t->date('occurred_on')->index();
            $t->foreignId('item_id')->constrained();
            $t->foreignId('batch_id')->constrained('stock_batches');
            $t->unsignedInteger('quantity');
            $t->foreignId('stock_request_id')->nullable()->constrained()->nullOnDelete();
            $t->string('reference')->nullable();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transactions');
        Schema::dropIfExists('stock_issues');
        Schema::dropIfExists('request_approvals');
        Schema::dropIfExists('stock_request_items');
        Schema::dropIfExists('stock_requests');
    }
};
