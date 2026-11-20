<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const DISTRICTS = [
        'Colombo',
        'Gampaha',
        'Kalutara',
        'Kandy',
        'Matale',
        'Nuwara Eliya',
        'Galle',
        'Matara',
        'Hambantota',
        'Jaffna',
        'Kilinochchi',
        'Mannar',
        'Mullaitivu',
        'Vavuniya',
        'Trincomalee',
        'Batticaloa',
        'Ampara',
        'Kurunegala',
        'Puttalam',
        'Anuradhapura',
        'Polonnaruwa',
        'Badulla',
        'Monaragala',
        'Ratnapura',
        'Kegalle',
    ];

    public function up(): void
    {
        $now = now();
        DB::table('districts')->insertOrIgnore(array_map(
            fn (string $name, int $index) => [
                'number' => $index + 1,
                'name' => $name,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            self::DISTRICTS,
            array_keys(self::DISTRICTS)
        ));
    }

    public function down(): void
    {
        // Keep these records on rollback; district records may already be in use.
    }
};
