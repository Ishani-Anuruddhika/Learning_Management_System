<?php

namespace App\Http\Controllers;

use App\Http\Presenters\Presenter;
use App\Models\District;
use App\Models\StockRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DistrictController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(District::orderBy('number')->get()->map(fn ($d) => Presenter::district($d)));
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Presenter::district(District::create($this->validated($request))), 201);
    }

    public function update(Request $request, District $district): JsonResponse
    {
        $district->update($this->validated($request, $district->id));

        return response()->json(Presenter::district($district));
    }

    public function destroy(District $district): JsonResponse
    {
        if (User::where('district_id', $district->id)->exists()
            || StockRequest::where('district_id', $district->id)->exists()) {
            abort(422, 'This district has users or requests and cannot be deleted.');
        }

        $district->delete();

        return response()->json(['message' => 'District deleted.']);
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $v = $request->validate([
            'number' => ['required', 'integer', 'min:1', Rule::unique('districts', 'number')->ignore($ignoreId)],
            'name' => ['required', 'string', 'max:255', Rule::unique('districts', 'name')->ignore($ignoreId)],
            'head' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:40',
        ]);

        return [
            'number' => $v['number'],
            'name' => $v['name'],
            'head_name' => $v['head'] ?? null,
            'email' => $v['email'] ?? null,
            'phone' => $v['phone'] ?? null,
        ];
    }
}
