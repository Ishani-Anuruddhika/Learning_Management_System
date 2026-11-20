<?php

namespace Tests\Feature;

use App\Models\Item;
use Database\Seeders\BaseSeeder;
use Database\Seeders\DemoDataSeeder;
use Database\Seeders\ItemCatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockCatalogueTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalogue_seeds_real_items_idempotently_without_demo_inventory(): void
    {
        $this->seed(BaseSeeder::class);
        $this->seed(ItemCatalogueSeeder::class);
        $this->seed(DemoDataSeeder::class);

        $this->assertDatabaseCount('items', 127);
        $this->assertDatabaseCount('stock_batches', 0);
        $this->assertDatabaseCount('stock_requests', 0);
        $this->assertDatabaseHas('items', [
            'code' => 'PAP-001',
            'name' => 'A4 Paper Pkt',
            'unit' => 'Packet',
            'min_stock' => 100,
        ]);
        $this->assertSame(
            'Writing Instruments',
            Item::where('code', 'WRI-001')->firstOrFail()->category->name
        );
        $this->assertDatabaseMissing('items', ['code' => 'STA-001']);

        $this->seed(ItemCatalogueSeeder::class);

        $this->assertDatabaseCount('items', 127);
    }
}
