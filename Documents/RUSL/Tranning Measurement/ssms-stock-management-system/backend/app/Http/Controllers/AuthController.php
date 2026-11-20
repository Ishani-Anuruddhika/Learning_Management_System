<?php

namespace App\Http\Controllers;

use App\Http\Presenters\Presenter;
use App\Models\PasswordResetRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::with('role.permissions')->where('username', $data['username'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid username or password.'], 422);
        }

        if (! $user->is_active) {
            $message = match ($user->registration_status) {
                'pending' => 'Your account request is waiting for administrator approval.',
                'rejected' => 'Your account request was not approved. Contact the administrator.',
                default => 'This account is disabled. Contact the administrator.',
            };

            return response()->json(['message' => $message], 403);
        }

        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => Presenter::user($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(Presenter::user($request->user()));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    /**
     * Step 1 of "forgot password": email a single-use link.
     * The answer is always the same, so nobody can use this form to discover which usernames exist.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['login' => 'required|string|max:255']);

        $response = ['message' => 'If an account matches and has an email address on file, a reset link has been sent. '
            . 'No email? Ask the system administrator to reset your password.'];

        $user = User::where('is_active', true)
            ->where(fn ($q) => $q->where('username', $data['login'])->orWhere('email', $data['login']))
            ->first();

        if (! $user || ! $user->email) {
            return response()->json($response);
        }

        PasswordResetRequest::where('user_id', $user->id)->delete(); // only the newest link works

        $token = Str::random(64);
        $minutes = config('ssms.reset_link_minutes');

        PasswordResetRequest::create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addMinutes($minutes),
        ]);

        $link = rtrim(config('ssms.frontend_url'), '/') . '/?reset=' . $token;

        try {
            Mail::raw(
                "Hello {$user->name},\n\n"
                . "Use this link to choose a new password for the Stock Control System:\n{$link}\n\n"
                . "The link works once and expires in {$minutes} minutes. "
                . "If you did not ask for this, ignore this email — your password has not changed.",
                fn ($m) => $m->to($user->email)->subject('Reset your Stock Control System password')
            );
        } catch (\Throwable $e) {
            report($e); // a mail outage must not reveal whether the account exists
        }

        // Local development only: show the link so you can test without a mail server.
        // (With MAIL_MAILER=log it is also written to storage/logs/laravel.log.)
        if (app()->environment('local') && config('app.debug')) {
            $response['devResetLink'] = $link;
        }

        return response()->json($response);
    }

    /** Step 2: the emailed link carries the token; the user chooses a new password. */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string|size:64',
            'password' => 'required|string|min:8|max:100|confirmed',
        ]);

        $invalid = response()->json(['message' => 'This reset link is invalid or has expired. Request a new one.'], 422);

        $row = PasswordResetRequest::where('token_hash', hash('sha256', $data['token']))
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (! $row) {
            return $invalid;
        }

        $user = User::find($row->user_id);

        if (! $user || ! $user->is_active) {
            return $invalid;
        }

        DB::transaction(function () use ($user, $data) {
            $user->update(['password' => $data['password']]);
            $user->tokens()->delete();                                   // sign out everywhere
            PasswordResetRequest::where('user_id', $user->id)->delete(); // link is now spent
        });

        return response()->json(['message' => 'Your password has been updated. You can now sign in.']);
    }

    /** A signed-in user changing their own password. */
    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'currentPassword' => 'required|string',
            'password' => 'required|string|min:8|max:100|confirmed|different:currentPassword',
        ]);

        $user = $request->user();

        if (! Hash::check($data['currentPassword'], $user->password)) {
            return response()->json(['message' => 'Your current password is not correct.'], 422);
        }

        $user->update(['password' => $data['password']]);

        // Keep this device signed in, sign every other session out.
        $current = $user->currentAccessToken();
        $others = $user->tokens();
        if (isset($current->id)) {
            $others->where('id', '!=', $current->id);
        }
        $others->delete();

        return response()->json(['message' => 'Password changed.']);
    }
}
