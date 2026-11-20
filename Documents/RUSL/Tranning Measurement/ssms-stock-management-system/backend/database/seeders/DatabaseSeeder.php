<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Always: roles, permissions, 25 districts, categories, admin account, settings.
        $this->call(BaseSeeder::class);
        $this->call(ItemCatalogueSeeder::class);

        // Demo users only in local dev, or when SEED_DEMO=true. Never seed demo
        // passwords into production.
        if (app()->environment('local') || filter_var(env('SEED_DEMO', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->call(DemoDataSeeder::class);
        }
    }
}
