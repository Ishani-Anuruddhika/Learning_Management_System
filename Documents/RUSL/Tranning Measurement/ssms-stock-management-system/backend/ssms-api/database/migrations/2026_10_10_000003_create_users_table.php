<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Replaces Laravel's default users migration (the setup script deletes the default one).
return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('username', 60)->unique();
            $t->string('email')->nullable()->unique();
            $t->string('employee_id', 40)->nullable();
            $t->string('title')->nullable();
            $t->string('password');
            $t->foreignId('role_id')->constrained();
            $t->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('district_id')->nullable()->constrained()->nullOnDelete();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
