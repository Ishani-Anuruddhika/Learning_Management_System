<?php

namespace App\Http\Controllers;

use App\Http\Presenters\Presenter;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = UserNotification::where('user_id', $request->user()->id);

        return response()->json([
            'unread' => (clone $q)->where('is_read', false)->count(),
            'items' => (clone $q)->orderByDesc('id')->limit(50)->get()->map(fn ($n) => Presenter::notification($n)),
        ]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        UserNotification::where('user_id', $request->user()->id)->whereKey($id)->update(['is_read' => true]);

        return response()->json(['message' => 'ok']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        UserNotification::where('user_id', $request->user()->id)->where('is_read', false)->update(['is_read' => true]);

        return response()->json(['message' => 'ok']);
    }
}
