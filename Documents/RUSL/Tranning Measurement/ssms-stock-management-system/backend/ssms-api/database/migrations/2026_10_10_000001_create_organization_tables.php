<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->string('head_name')->nullable();
            $t->string('email')->nullable();
            $t->string('phone', 40)->nullable();
            $t->timestamps();
        });

        Schema::create('districts', function (Blueprint $t) {
            $t->id();
            $t->unsignedSmallInteger('number')->unique();
            $t->string('name')->unique();
            $t->string('head_name')->nullable();
            $t->string('email')->nullable();
            $t->string('phone', 40)->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('districts');
        Schema::dropIfExists('departments');
    }
};
