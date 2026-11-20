<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\District;
use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\Role;
use App\Models\StockBatch;
use App\Models\StockIssue;
use App\Models\StockRequest;
use App\Models\StockTransaction;
use App\Models\User;
use Database\Seeders\BaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(BaseSeeder::class);
    }

    private function user(string $role, array $extra = []): User
    {
        return User::create(array_merge([
            'name' => ucfirst($role),
            'username' => $role . uniqid(),
            'password' => 'password123',
            'role_id' => Role::where('name', $role)->value('id'),
        ], $extra));
    }

    private function item(): Item
    {
        return Item::create([
            'code' => 'T-' . uniqid(), 'name' => 'Test item',
            'category_id' => ItemCategory::first()->id, 'unit' => 'Piece', 'min_stock' => 5,
        ]);
    }

    private function batch(Item $item, string $no, string $date, int $qty): StockBatch
    {
        return StockBatch::create([
            'item_id' => $item->id, 'batch_no' => $no, 'received_date' => $date,
            'quantity_received' => $qty, 'quantity_remaining' => $qty, 'unit_cost' => 10,
        ]);
    }

    private function deptHead(): User
    {
        $dept = Department::create(['name' => 'Dept ' . uniqid()]);

        return $this->user('dept_head', ['department_id' => $dept->id]);
    }

    private function districtHead(int $number = 1): User
    {
        return $this->user('district_head', ['district_id' => District::where('number', $number)->value('id')]);
    }

    private function act(User $user, string $action, int $requestId)
    {
        Sanctum::actingAs($user);

        return $this->postJson("/api/requests/{$requestId}/{$action}");
    }

    private function raise(User $user, Item $item, int $qty): int
    {
        Sanctum::actingAs($user);

        return $this->postJson('/api/requests', ['items' => [['stockItemId' => $item->id, 'qty' => $qty]]])
            ->assertCreated()->json('id');
    }

    public function test_internal_request_goes_accounts_then_store_and_issues_fifo_across_batches(): void
    {
        $item = $this->item();
        $older = $this->batch($item, 'A', '2024-01-01', 10);
        $newer = $this->batch($item, 'B', '2024-02-01', 10);

        $id = $this->raise($this->deptHead(), $item, 15);

        $this->act($this->user('head_accounts'), 'approve', $id)->assertOk()->assertJsonPath('status', 'accounts_approved');
        $this->act($this->user('store_officer'), 'approve', $id)->assertOk()->assertJsonPath('status', 'issued');

        $this->assertSame(0, $older->fresh()->quantity_remaining);   // oldest drained first
        $this->assertSame(5, $newer->fresh()->quantity_remaining);   // remainder from the next batch
        $this->assertSame(2, StockIssue::count());
        $this->assertSame(2, StockTransaction::where('type', 'issue')->count());
    }

    public function test_district_request_needs_coordinator_before_accounts(): void
    {
        $item = $this->item();
        $this->batch($item, 'A', '2024-01-01', 10);

        $id = $this->raise($this->districtHead(), $item, 4);

        $this->act($this->user('head_accounts'), 'approve', $id)->assertForbidden();   // too early
        $this->act($this->user('district_coordinator'), 'approve', $id)->assertOk()->assertJsonPath('status', 'coord_approved');
        $this->act($this->user('head_accounts'), 'approve', $id)->assertOk()->assertJsonPath('status', 'accounts_approved');
        $this->act($this->user('store_officer'), 'approve', $id)->assertOk()->assertJsonPath('status', 'issued');
    }

    public function test_coordinator_cannot_see_or_act_on_internal_requests(): void
    {
        $item = $this->item();
        $this->batch($item, 'A', '2024-01-01', 10);
        $id = $this->raise($this->deptHead(), $item, 2);

        $this->act($this->user('district_coordinator'), 'approve', $id)->assertNotFound();
    }

    public function test_insufficient_stock_blocks_issue_and_rolls_back(): void
    {
        $item = $this->item();
        $batch = $this->batch($item, 'A', '2024-01-01', 3);
        $id = $this->raise($this->deptHead(), $item, 5);

        $this->act($this->user('head_accounts'), 'approve', $id)->assertOk();
        $this->act($this->user('store_officer'), 'approve', $id)->assertStatus(422);

        $this->assertSame('accounts_approved', StockRequest::find($id)->status);
        $this->assertSame(3, $batch->fresh()->quantity_remaining);
        $this->assertSame(0, StockIssue::count());
    }

    public function test_rejection_stops_the_request(): void
    {
        $item = $this->item();
        $this->batch($item, 'A', '2024-01-01', 10);
        $id = $this->raise($this->deptHead(), $item, 2);

        Sanctum::actingAs($this->user('head_accounts'));
        $this->postJson("/api/requests/{$id}/reject", ['notes' => 'Over allocation'])
            ->assertOk()->assertJsonPath('status', 'rejected');
    }

    public function test_district_head_only_sees_own_district_requests(): void
    {
        $item = $this->item();
        $this->batch($item, 'A', '2024-01-01', 10);

        $one = $this->districtHead(1);
        $two = $this->districtHead(2);
        $id = $this->raise($one, $item, 1);

        Sanctum::actingAs($two);
        $this->getJson('/api/requests')->assertOk()->assertJsonCount(0);
        $this->getJson("/api/requests/{$id}")->assertNotFound();
    }

    public function test_requesters_cannot_manage_items_or_approve(): void
    {
        $head = $this->deptHead();
        Sanctum::actingAs($head);

        $this->postJson('/api/items', ['code' => 'X', 'name' => 'X', 'category' => 'Tools', 'unit' => 'Piece', 'minStock' => 1])
            ->assertForbidden();
        $this->postJson('/api/requests/1/approve')->assertForbidden();
    }

    public function test_login_returns_token_and_permissions(): void
    {
        $user = $this->user('store_officer', ['username' => 'store1', 'password' => 'secret-pass-1']);

        $this->postJson('/api/login', ['username' => 'store1', 'password' => 'secret-pass-1'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'role', 'permissions']])
            ->assertJsonPath('user.role', 'store_officer');

        $this->postJson('/api/login', ['username' => 'store1', 'password' => 'wrong'])->assertStatus(422);
    }
}
