<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\District;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(BaseSeeder::class);
    }

    private function roleId(string $name): int
    {
        return Role::where('name', $name)->value('id');
    }

    private function payload(array $extra = []): array
    {
        return array_merge([
            'name' => 'New Person', 'employeeId' => 'E-100', 'email' => 'new@example.com', 'username' => 'new.person',
            'roleId' => $this->roleId('store_officer'), 'password' => 'a-good-password', 'password_confirmation' => 'a-good-password',
        ], $extra);
    }

    private function admin(): User
    {
        return User::where('username', 'admin')->first();
    }

    public function test_registration_creates_a_pending_account_that_cannot_sign_in(): void
    {
        $this->postJson('/api/register', $this->payload())->assertCreated();

        $user = User::where('username', 'new.person')->first();
        $this->assertFalse($user->is_active);
        $this->assertSame('pending', $user->registration_status);

        $this->postJson('/api/login', ['username' => 'new.person', 'password' => 'a-good-password'])
            ->assertStatus(403)
            ->assertJsonFragment(['message' => 'Your account request is waiting for administrator approval.']);
    }

    public function test_admin_role_cannot_be_requested(): void
    {
        $this->postJson('/api/register', $this->payload(['roleId' => $this->roleId('admin')]))->assertStatus(422);
        $this->assertSame(0, User::where('username', 'new.person')->count());
    }

    public function test_district_and_department_heads_must_choose_their_organisation(): void
    {
        $this->postJson('/api/register', $this->payload(['roleId' => $this->roleId('district_head')]))->assertStatus(422);
        $this->postJson('/api/register', $this->payload(['roleId' => $this->roleId('dept_head'), 'username' => 'dept.person', 'email' => 'd@example.com']))
            ->assertStatus(422);

        $district = District::where('number', 1)->first();
        $this->postJson('/api/register', $this->payload([
            'roleId' => $this->roleId('district_head'), 'districtId' => $district->id,
        ]))->assertCreated();

        $this->assertSame($district->id, User::where('username', 'new.person')->value('district_id'));
    }

    public function test_admins_are_notified_and_can_approve_so_the_user_can_sign_in(): void
    {
        $this->postJson('/api/register', $this->payload())->assertCreated();
        $this->assertDatabaseHas('notifications', ['user_id' => $this->admin()->id]);

        $user = User::where('username', 'new.person')->first();

        Sanctum::actingAs($this->admin());
        $this->postJson("/api/users/{$user->id}/approve")->assertOk()->assertJsonPath('registrationStatus', 'approved');

        $this->postJson('/api/login', ['username' => 'new.person', 'password' => 'a-good-password'])
            ->assertOk()->assertJsonPath('user.role', 'store_officer');
    }

    public function test_rejected_request_stays_locked_out(): void
    {
        $this->postJson('/api/register', $this->payload())->assertCreated();
        $user = User::where('username', 'new.person')->first();

        Sanctum::actingAs($this->admin());
        $this->postJson("/api/users/{$user->id}/reject")->assertOk()->assertJsonPath('registrationStatus', 'rejected');

        $this->postJson('/api/login', ['username' => 'new.person', 'password' => 'a-good-password'])->assertStatus(403);
    }

    public function test_only_admins_can_approve(): void
    {
        $this->postJson('/api/register', $this->payload())->assertCreated();
        $user = User::where('username', 'new.person')->first();

        $storeOfficer = User::create([
            'name' => 'S', 'username' => 'store.s', 'password' => 'password123', 'role_id' => $this->roleId('store_officer'),
        ]);
        Sanctum::actingAs($storeOfficer);

        $this->postJson("/api/users/{$user->id}/approve")->assertForbidden();
    }

    public function test_options_endpoint_is_public_and_hides_admin_role(): void
    {
        $options = $this->getJson('/api/register/options')->assertOk()->json();
        $roles = $options['roles'];
        $districts = $options['districts'];

        $this->assertNotContains('admin', array_column($roles, 'name'));
        $this->assertContains('district_head', array_column($roles, 'name'));
        $this->assertCount(25, $districts);
        $this->assertSame('Kegalle', $districts[24]['name']);
        $this->assertSame(25, $districts[24]['number']);
    }
}
