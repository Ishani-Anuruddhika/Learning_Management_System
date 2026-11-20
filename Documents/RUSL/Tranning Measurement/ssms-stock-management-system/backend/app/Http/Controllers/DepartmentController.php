<?php

namespace App\Http\Controllers;

use App\Http\Presenters\Presenter;
use App\Models\Department;
use App\Models\StockRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Department::orderBy('name')->get()->map(fn ($d) => Presenter::department($d)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $dept = Department::create($data);

        return response()->json(Presenter::department($dept), 201);
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        $department->update($this->validated($request, $department->id));

        return response()->json(Presenter::department($department));
    }

    public function destroy(Department $department): JsonResponse
    {
        if (User::where('department_id', $department->id)->exists()
            || StockRequest::where('department_id', $department->id)->exists()) {
            abort(422, 'This department has users or requests and cannot be deleted.');
        }

        $department->delete();

        return response()->json(['message' => 'Department deleted.']);
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $v = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('departments', 'name')->ignore($ignoreId)],
            'head' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:40',
        ]);

        return [
            'name' => $v['name'],
            'head_name' => $v['head'] ?? null,
            'email' => $v['email'] ?? null,
            'phone' => $v['phone'] ?? null,
        ];
    }
}
