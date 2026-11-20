<?php

namespace App\Http\Controllers;

use App\Http\Presenters\Presenter;
use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\StockBatch;
use App\Models\StockRequestItem;
use App\Models\StockTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    public function categories(): JsonResponse
    {
        return response()->json(ItemCategory::orderBy('name')->pluck('name'));
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:120|unique:item_categories,name']);
        ItemCategory::create($data);

        return response()->json(ItemCategory::orderBy('name')->pluck('name'), 201);
    }

    public function index(): JsonResponse
    {
        $items = Item::with(['category', 'batches'])->orderBy('code')->get();

        return response()->json($items->map(fn ($i) => Presenter::item($i)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $item = Item::create($data);

        return response()->json(Presenter::item($item->load(['category', 'batches'])), 201);
    }

    public function update(Request $request, Item $item): JsonResponse
    {
        $item->update($this->validated($request, $item->id));

        return response()->json(Presenter::item($item->load(['category', 'batches'])));
    }

    public function destroy(Item $item): JsonResponse
    {
        if ($item->batches()->exists() || StockRequestItem::where('item_id', $item->id)->exists()) {
            abort(422, 'This item has stock batches or requests and cannot be deleted.');
        }

        $item->delete();

        return response()->json(['message' => 'Item deleted.']);
    }

    /** Receive stock: records a new FIFO batch and a receipt in the ledger. */
    public function receiveBatch(Request $request, Item $item): JsonResponse
    {
        $data = $request->validate([
            'batchNo' => ['required', 'string', 'max:60', Rule::unique('stock_batches', 'batch_no')->where('item_id', $item->id)],
            'receivedDate' => 'required|date|before_or_equal:today',
            'quantity' => 'required|integer|min:1|max:10000000',
            'unitCost' => 'required|numeric|min:0',
            'expiryDate' => 'nullable|date|after_or_equal:receivedDate',
            'supplier' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($item, $data, $request) {
            $supplierId = null;
            if (! empty($data['supplier'])) {
                $supplierId = \App\Models\Supplier::firstOrCreate(['name' => $data['supplier']])->id;
            }

            $batch = StockBatch::create([
                'item_id' => $item->id,
                'supplier_id' => $supplierId,
                'batch_no' => $data['batchNo'],
                'received_date' => $data['receivedDate'],
                'expiry_date' => $data['expiryDate'] ?? null,
                'quantity_received' => $data['quantity'],
                'quantity_remaining' => $data['quantity'],
                'unit_cost' => $data['unitCost'],
                'added_by' => $request->user()->id,
            ]);

            StockTransaction::create([
                'type' => 'receipt',
                'occurred_on' => $data['receivedDate'],
                'item_id' => $item->id,
                'batch_id' => $batch->id,
                'quantity' => $data['quantity'],
                'reference' => $data['supplier'] ?? 'Stock received',
                'user_id' => $request->user()->id,
            ]);
        });

        return response()->json(Presenter::item($item->load(['category', 'batches'])), 201);
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $v = $request->validate([
            'code' => ['required', 'string', 'max:40', Rule::unique('items', 'code')->ignore($ignoreId)],
            'name' => 'required|string|max:255',
            'category' => 'required|string|exists:item_categories,name',
            'unit' => 'required|string|max:40',
            'minStock' => 'required|integer|min:0',
        ]);

        return [
            'code' => $v['code'],
            'name' => $v['name'],
            'category_id' => ItemCategory::where('name', $v['category'])->value('id'),
            'unit' => $v['unit'],
            'min_stock' => $v['minStock'],
        ];
    }
}
