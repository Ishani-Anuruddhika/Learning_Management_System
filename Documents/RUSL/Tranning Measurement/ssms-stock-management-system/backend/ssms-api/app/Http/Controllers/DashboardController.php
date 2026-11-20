<?php

namespace App\Http\Controllers;

use App\Http\Presenters\Presenter;
use App\Models\Item;
use App\Models\StockRequest;
use App\Models\StockTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $items = Item::with('batches')->orderBy('code')->get();

        $stockOf = fn ($item) => (int) $item->batches->sum('quantity_remaining');

        $totalValue = $items->sum(
            fn ($item) => $item->batches->sum(fn ($b) => $b->quantity_remaining * (float) $b->unit_cost)
        );

        $low = $items->filter(fn ($i) => $stockOf($i) <= $i->min_stock)->values();

        $visible = StockRequest::visibleTo($user);

        $recent = [];
        if ($user->hasPermission('view_transactions')) {
            $recent = StockTransaction::with(['item', 'batch', 'request'])
                ->orderByDesc('occurred_on')->orderByDesc('id')->limit(6)->get()
                ->map(fn ($t) => Presenter::transaction($t))->all();
        }

        return response()->json([
            'totalItems' => $items->count(),
            'totalValue' => round($totalValue, 2),
            'pending' => (clone $visible)->where('status', 'pending')->count(),
            'issued' => (clone $visible)->where('status', 'issued')->count(),
            'totalRequests' => (clone $visible)->count(),
            'lowStock' => $low->count(),
            'lowStockItems' => $low->map(fn ($i) => [
                'id' => (string) $i->id,
                'code' => $i->code,
                'name' => $i->name,
                'unit' => $i->unit,
                'stock' => $stockOf($i),
                'minStock' => $i->min_stock,
            ])->all(),
            'recentTransactions' => $recent,
        ]);
    }
}
