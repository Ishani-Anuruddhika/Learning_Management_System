<?php

namespace Tests\Feature;

use App\Models\PasswordResetRequest;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(BaseSeeder::class);
    }

    private function user(array $extra = []): User
    {
        return User::create(array_merge([
            'name' => 'Test User', 'username' => 'tester', 'email' => 'tester@example.com',
            'password' => 'old-password-1', 'role_id' => Role::where('name', 'store_officer')->value('id'),
        ], $extra));
    }

    private function link(User $user, string $token, string $expires = '+60 minutes'): void
    {
        PasswordResetRequest::create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->modify($expires),
        ]);
    }

    public function test_forgot_password_gives_the_same_answer_for_known_and_unknown_accounts(): void
    {
        $this->user();

        $known = $this->postJson('/api/forgot-password', ['login' => 'tester'])->assertOk()->json('message');
        $unknown = $this->postJson('/api/forgot-password', ['login' => 'nobody-here'])->assertOk()->json('message');

        $this->assertSame($known, $unknown);
        $this->assertSame(1, PasswordResetRequest::count());   // link created only for the real account
    }

    public function test_valid_link_resets_password_once(): void
    {
        $user = $this->user();
        $token = str_repeat('a', 64);
        $this->link($user, $token);

        $this->postJson('/api/reset-password', [
            'token' => $token, 'password' => 'brand-new-pass', 'password_confirmation' => 'brand-new-pass',
        ])->assertOk();

        $this->assertTrue(Hash::check('brand-new-pass', $user->fresh()->password));

        // The link cannot be used a second time.
        $this->postJson('/api/reset-password', [
            'token' => $token, 'password' => 'another-pass-2', 'password_confirmation' => 'another-pass-2',
        ])->assertStatus(422);
    }

    public function test_expired_link_is_rejected(): void
    {
        $user = $this->user();
        $token = str_repeat('b', 64);
        $this->link($user, $token, '-1 minute');

        $this->postJson('/api/reset-password', [
            'token' => $token, 'password' => 'brand-new-pass', 'password_confirmation' => 'brand-new-pass',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('old-password-1', $user->fresh()->password));
    }

    public function test_reset_requires_matching_confirmation(): void
    {
        $user = $this->user();
        $token = str_repeat('c', 64);
        $this->link($user, $token);

        $this->postJson('/api/reset-password', [
            'token' => $token, 'password' => 'brand-new-pass', 'password_confirmation' => 'different',
        ])->assertStatus(422);
    }

    public function test_signed_in_user_can_change_password_only_with_the_right_current_one(): void
    {
        $user = $this->user();
        Sanctum::actingAs($user);

        $this->postJson('/api/change-password', [
            'currentPassword' => 'wrong', 'password' => 'new-password-9', 'password_confirmation' => 'new-password-9',
        ])->assertStatus(422);

        $this->postJson('/api/change-password', [
            'currentPassword' => 'old-password-1', 'password' => 'new-password-9', 'password_confirmation' => 'new-password-9',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password-9', $user->fresh()->password));
    }
}
