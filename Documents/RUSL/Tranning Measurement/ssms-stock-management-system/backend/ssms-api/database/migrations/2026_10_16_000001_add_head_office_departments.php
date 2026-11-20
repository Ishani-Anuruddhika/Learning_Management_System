<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const DEPARTMENTS = [
        'Administration Division',
        'Finance Division',
        'Government Audit Division',
        'Planning Division',
        'Quotation Division',
        'Maintenance Division',
        'IT Division',
        'Training Division',
        'Internal Audit Division',
        'Director Staff Division',
        'Information & Publication Division',
        'Work Shop Division',
        'DMCU Division',
        'LAB',
        'Registration',
        'Chemical Lab',
        'Pressure Lab',
        'Electrical Lab',
        'Humanity & Moisture Lab',
        'Petrol Pump & Pattern Approval',
    ];

    public function up(): void
    {
        $now = now();
        DB::table('departments')->insertOrIgnore(array_map(
            fn (string $name) => [
                'name' => $name,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            self::DEPARTMENTS
        ));
    }

    public function down(): void
    {
        // Keep these records on rollback; department records may already be in use.
    }
};
