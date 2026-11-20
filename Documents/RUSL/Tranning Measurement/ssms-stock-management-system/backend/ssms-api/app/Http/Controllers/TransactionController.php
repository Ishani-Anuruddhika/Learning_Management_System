<?php

namespace App\Http\Controllers;

use App\Http\Presenters\Presenter;
use App\Models\StockTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rows = StockTransaction::with(['item', 'batch', 'request'])
            ->when($request->query('type'), fn ($q, $t) => $q->where('type', $t))
            ->orderByDesc('occurred_on')
            ->orderByDesc('id')
            ->limit(1000)
            ->get();

        return response()->json($rows->map(fn ($t) => Presenter::transaction($t)));
    }
}
