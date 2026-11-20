<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\BaseSeeder;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoAccountsTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeder_refreshes_credentials_for_all_displayed_accounts(): void
    {
        $this->seed(BaseSeeder::class);
        $this->seed(DemoDataSeeder::class);

        User::where('username', 'coordinator')->update(['password' => 'stale-password', 'is_active' => false]);

        $this->seed(DemoDataSeeder::class);

        foreach ([
            ['colombo.head', 'dist123'],
            ['it.head', 'dept123'],
            ['coordinator', 'coord123'],
            ['accounts', 'acc123'],
            ['store', 'store123'],
        ] as [$username, $password]) {
            $this->postJson('/api/login', compact('username', 'password'))->assertOk();
        }
    }
}
