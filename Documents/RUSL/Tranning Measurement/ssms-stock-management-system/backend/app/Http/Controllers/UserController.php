<?php

namespace App\Http\Controllers;

use App\Http\Presenters\Presenter;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function roles(): JsonResponse
    {
        return response()->json(Role::orderBy('id')->get(['id', 'name', 'label'])->map(fn ($r) => [
            'id' => (string) $r->id, 'name' => $r->name, 'label' => $r->label,
        ]));
    }

    public function index(): JsonResponse
    {
        $users = User::with(['role', 'department', 'district'])->orderBy('name')->get();

        return response()->json($users->map(fn ($u) => Presenter::appUser($u)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            ...$this->rules(),
            'username' => 'required|string|max:60|alpha_dash|unique:users,username',
            'email' => 'nullable|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|max:100',
        ]);

        $this->assertOrganisation($data);

        $user = User::create($this->attributes($data) + ['password' => $data['password']]);

        return response()->json(Presenter::appUser($user), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            ...$this->rules(),
            'username' => ['required', 'string', 'max:60', 'alpha_dash', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'isActive' => 'required|boolean',
        ]);

        $this->assertOrganisation($data);

        if ($user->id === $request->user()->id && ! $data['isActive']) {
            abort(422, 'You cannot disable your own account.');
        }

        $user->update($this->attributes($data) + [
            'is_active' => $data['isActive'],
            'registration_status' => $data['isActive'] ? 'approved' : $user->registration_status,
        ]);

        if (! $user->is_active) {
            $user->tokens()->delete(); // sign them out everywhere
        }

        return response()->json(Presenter::appUser($user->fresh()));
    }

    /** Approve a self-registered account (the admin may have corrected the role/organisation first). */
    public function approve(User $user): JsonResponse
    {
        $role = $user->role->name;
        if (($role === 'dept_head' && ! $user->department_id) || ($role === 'district_head' && ! $user->district_id)) {
            abort(422, 'Edit the user first and choose their department or district.');
        }

        $user->update(['is_active' => true, 'registration_status' => 'approved']);

        if ($user->email) {
            try {
                Mail::raw(
                    "Hello {$user->name},\n\nYour Stock Control System account ({$user->username}) has been approved. You can now sign in.",
                    fn ($m) => $m->to($user->email)->subject('Your account has been approved')
                );
            } catch (\Throwable $e) {
                report($e); // approval still stands if the email fails
            }
        }

        return response()->json(Presenter::appUser($user->fresh()));
    }

    public function reject(User $user): JsonResponse
    {
        if ($user->registration_status !== 'pending') {
            abort(422, 'Only pending requests can be rejected. Use Disable for existing accounts.');
        }

        $user->update(['is_active' => false, 'registration_status' => 'rejected']);

        return response()->json(Presenter::appUser($user->fresh()));
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['password' => 'required|string|min:8|max:100']);

        $user->update(['password' => $data['password']]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Password reset.']);
    }

    private function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'employeeId' => 'nullable|string|max:40',
            'title' => 'nullable|string|max:255',
            'roleId' => 'required|integer|exists:roles,id',
            'departmentId' => 'nullable|integer|exists:departments,id',
            'districtId' => 'nullable|integer|exists:districts,id',
        ];
    }

    /** Department heads must belong to a department, district heads to a district. */
    private function assertOrganisation(array $data): void
    {
        $role = Role::findOrFail($data['roleId'])->name;

        if ($role === 'dept_head' && empty($data['departmentId'])) {
            abort(422, 'Choose a department for a Department Head.');
        }
        if ($role === 'district_head' && empty($data['districtId'])) {
            abort(422, 'Choose a district for a District Head.');
        }
    }

    private function attributes(array $data): array
    {
        $role = Role::findOrFail($data['roleId'])->name;

        return [
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'] ?? null,
            'employee_id' => $data['employeeId'] ?? null,
            'title' => $data['title'] ?? null,
            'role_id' => $data['roleId'],
            'department_id' => $role === 'dept_head' ? $data['departmentId'] : null,
            'district_id' => $role === 'district_head' ? $data['districtId'] : null,
        ];
    }
}
