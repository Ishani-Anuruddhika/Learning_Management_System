<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\District;
use App\Models\Role;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Public "create account" page. It never creates a working account: the new user is saved as
 * PENDING and cannot sign in until an administrator approves it (and may change the role first).
 */
class RegistrationController extends Controller
{
    /** Dropdown data for the form. Names only; nothing sensitive. The Admin role cannot be requested. */
    public function options(): JsonResponse
    {
        return response()->json([
            'roles' => Role::where('name', '!=', 'admin')->orderBy('id')->get(['id', 'name', 'label'])
                ->map(fn ($r) => ['id' => (string) $r->id, 'name' => $r->name, 'label' => $r->label]),
            'departments' => Department::orderBy('name')->get(['id', 'name'])
                ->map(fn ($d) => ['id' => (string) $d->id, 'name' => $d->name]),
            'districts' => District::orderBy('number')->get(['id', 'number', 'name'])
                ->map(fn ($d) => ['id' => (string) $d->id, 'number' => $d->number, 'name' => $d->name]),
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $roles = Role::where('name', '!=', 'admin')->get()->keyBy('id');

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'employeeId' => 'required|string|max:40',
            'email' => 'required|email|max:255|unique:users,email',
            'username' => 'required|string|min:4|max:60|alpha_dash|unique:users,username',
            'roleId' => ['required', 'integer', Rule::in($roles->keys()->all())],
            'departmentId' => 'nullable|integer|exists:departments,id',
            'districtId' => 'nullable|integer|exists:districts,id',
            'password' => 'required|string|min:8|max:100|confirmed',
        ]);

        $role = $roles[(int) $data['roleId']];
        $department = null;
        $district = null;

        if ($role->name === 'dept_head') {
            $department = Department::find($data['departmentId'] ?? null)
                ?? abort(422, 'Choose your department.');
        }
        if ($role->name === 'district_head') {
            $district = District::find($data['districtId'] ?? null)
                ?? abort(422, 'Choose your district.');
        }

        $user = User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'],
            'employee_id' => $data['employeeId'],
            'title' => $role->label . ($district ? " — {$district->name}" : ($department ? " — {$department->name}" : '')),
            'password' => $data['password'],
            'role_id' => $role->id,
            'department_id' => $department?->id,
            'district_id' => $district?->id,
            'is_active' => false,
            'registration_status' => 'pending',
        ]);

        // Tell every admin there is something to approve.
        User::where('is_active', true)
            ->whereHas('role.permissions', fn ($q) => $q->where('key', 'manage_users'))
            ->pluck('id')
            ->each(fn ($adminId) => UserNotification::create([
                'user_id' => $adminId,
                'stock_request_id' => null,
                'message' => "New account request from {$user->name} ({$role->label}) is waiting for your approval on the Users page.",
            ]));

        return response()->json([
            'message' => 'Your account request has been sent. An administrator must approve it before you can sign in.',
        ], 201);
    }
}
