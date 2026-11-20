<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\District;
use App\Models\Item;
use App\Models\StockRequest;
use App\Models\StockTransaction;
use App\Models\SystemSetting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    /** Current stock list with FIFO batch breakdown. */
    public function currentStock()
    {
        $items = Item::with(['category', 'batches'])->orderBy('code')->get();

        $rows = $items->map(function ($i) {
            $qty = (int) $i->batches->sum('quantity_remaining');
            $value = $i->batches->sum(fn ($b) => $b->quantity_remaining * (float) $b->unit_cost);

            return ['item' => $i, 'qty' => $qty, 'value' => $value, 'low' => $qty <= $i->min_stock];
        });

        $pdf = Pdf::loadView('reports.current_stock', [
            'org' => $this->org(),
            'generatedAt' => now(),
            'rows' => $rows,
            'totalValue' => $rows->sum('value'),
            'lowCount' => $rows->where('low', true)->count(),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('Current_Stock_Report_' . now()->format('Y-m-d') . '.pdf');
    }

    /** Annual report: stock movement per item plus requests by department and district. */
    public function annual(Request $request)
    {
        $year = (int) ($request->validate(['year' => 'nullable|integer|min:2000|max:2100'])['year'] ?? now()->year);

        $start = Carbon::create($year, 1, 1)->toDateString();
        $end = Carbon::create($year, 12, 31)->toDateString();

        // Opening / received / issued per item, straight from the ledger.
        $movement = StockTransaction::selectRaw(
            "item_id,
             SUM(CASE WHEN type = 'receipt' AND DATE(occurred_on) < ? THEN quantity ELSE 0 END) AS rec_before,
             SUM(CASE WHEN type = 'issue'   AND DATE(occurred_on) < ? THEN quantity ELSE 0 END) AS iss_before,
             SUM(CASE WHEN type = 'receipt' AND DATE(occurred_on) BETWEEN ? AND ? THEN quantity ELSE 0 END) AS rec_year,
             SUM(CASE WHEN type = 'issue'   AND DATE(occurred_on) BETWEEN ? AND ? THEN quantity ELSE 0 END) AS iss_year",
            [$start, $start, $start, $end, $start, $end]
        )->whereDate('occurred_on', '<=', $end)->groupBy('item_id')->get()->keyBy('item_id');

        $stockRows = Item::with('category')->orderBy('code')->get()->map(function ($i) use ($movement) {
            $m = $movement->get($i->id);
            $opening = (int) ($m->rec_before ?? 0) - (int) ($m->iss_before ?? 0);
            $received = (int) ($m->rec_year ?? 0);
            $issued = (int) ($m->iss_year ?? 0);

            return [
                'item' => $i,
                'opening' => $opening,
                'received' => $received,
                'issued' => $issued,
                'closing' => $opening + $received - $issued,
            ];
        });

        $requests = StockRequest::whereDate('request_date', '>=', $start)->whereDate('request_date', '<=', $end)->with('items')->get();

        $summarise = function ($collection) {
            return [
                'total' => $collection->count(),
                'issued' => $collection->where('status', 'issued')->count(),
                'rejected' => $collection->where('status', 'rejected')->count(),
                'units' => (int) $collection->where('status', 'issued')->sum(fn ($r) => $r->items->sum('issued_qty')),
            ];
        };

        $deptRows = Department::orderBy('name')->get()->map(
            fn ($d) => ['org' => $d, 'stats' => $summarise($requests->where('department_id', $d->id))]
        );

        $distRows = District::orderBy('number')->get()->map(
            fn ($d) => ['org' => $d, 'stats' => $summarise($requests->where('district_id', $d->id))]
        );

        $pdf = Pdf::loadView('reports.annual', [
            'org' => $this->org(),
            'year' => $year,
            'generatedAt' => now(),
            'overall' => $summarise($requests),
            'stockRows' => $stockRows,
            'deptRows' => $deptRows,
            'distRows' => $distRows,
        ])->setPaper('a4', 'landscape');

        return $pdf->download("Annual_Stock_Report_{$year}.pdf");
    }

    private function org(): string
    {
        return SystemSetting::where('key', 'organisation_name')->value('value') ?: 'Measurement Department';
    }
}
