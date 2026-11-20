<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(SystemSetting::pluck('value', 'key'));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string|max:1000',
        ]);

        foreach ($data['settings'] as $key => $value) {
            if (! preg_match('/^[a-z0-9_]{1,80}$/', (string) $key)) {
                abort(422, "Invalid setting key: {$key}");
            }
            SystemSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'updated_by' => $request->user()->id]
            );
        }

        return response()->json(SystemSetting::pluck('value', 'key'));
    }
}
