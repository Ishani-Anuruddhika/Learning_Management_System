<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DistrictController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RequestController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::get('/register/options', [RegistrationController::class, 'options']);
Route::post('/register', [RegistrationController::class, 'register'])->middleware('throttle:5,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Reference data every signed-in user needs (names shown on requests, request form).
    Route::get('/departments', [DepartmentController::class, 'index']);
    Route::get('/districts', [DistrictController::class, 'index']);
    Route::get('/categories', [ItemController::class, 'categories']);
    Route::get('/items', [ItemController::class, 'index'])->middleware('permission:view_stock');

    Route::get('/dashboard', [DashboardController::class, 'show']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);

    // Stock catalogue
    Route::post('/categories', [ItemController::class, 'storeCategory'])->middleware('permission:manage_item_categories');
    Route::post('/items', [ItemController::class, 'store'])->middleware('permission:manage_items');
    Route::put('/items/{item}', [ItemController::class, 'update'])->middleware('permission:manage_items');
    Route::delete('/items/{item}', [ItemController::class, 'destroy'])->middleware('permission:manage_items');
    Route::post('/items/{item}/batches', [ItemController::class, 'receiveBatch'])->middleware('permission:receive_stock');

    // Organisation (admin)
    Route::post('/departments', [DepartmentController::class, 'store'])->middleware('permission:manage_departments');
    Route::put('/departments/{department}', [DepartmentController::class, 'update'])->middleware('permission:manage_departments');
    Route::delete('/departments/{department}', [DepartmentController::class, 'destroy'])->middleware('permission:manage_departments');
    Route::post('/districts', [DistrictController::class, 'store'])->middleware('permission:manage_districts');
    Route::put('/districts/{district}', [DistrictController::class, 'update'])->middleware('permission:manage_districts');
    Route::delete('/districts/{district}', [DistrictController::class, 'destroy'])->middleware('permission:manage_districts');

    // Stock requests and the approval chain
    Route::get('/requests', [RequestController::class, 'index'])
        ->middleware('permission:view_own_requests,view_all_requests,approve_coordinator,approve_accounts,issue_stock');
    Route::get('/requests/{id}', [RequestController::class, 'show'])
        ->middleware('permission:view_own_requests,view_all_requests,approve_coordinator,approve_accounts,issue_stock');
    Route::post('/requests', [RequestController::class, 'store'])->middleware('permission:create_request');
    Route::post('/requests/{id}/approve', [RequestController::class, 'approve'])
        ->middleware('permission:approve_coordinator,approve_accounts,issue_stock');
    Route::post('/requests/{id}/reject', [RequestController::class, 'reject'])
        ->middleware('permission:approve_coordinator,approve_accounts,issue_stock');

    Route::get('/transactions', [TransactionController::class, 'index'])->middleware('permission:view_transactions');

    // PDF reports
    Route::get('/reports/current-stock', [ReportController::class, 'currentStock'])->middleware('permission:generate_stock_report');
    Route::get('/reports/annual', [ReportController::class, 'annual'])->middleware('permission:generate_annual_report');

    // Admin: users and settings
    Route::get('/roles', [UserController::class, 'roles'])->middleware('permission:manage_users');
    Route::get('/users', [UserController::class, 'index'])->middleware('permission:manage_users');
    Route::post('/users', [UserController::class, 'store'])->middleware('permission:manage_users');
    Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:manage_users');
    Route::post('/users/{user}/approve', [UserController::class, 'approve'])->middleware('permission:manage_users');
    Route::post('/users/{user}/reject', [UserController::class, 'reject'])->middleware('permission:manage_users');
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->middleware('permission:manage_users');
    Route::get('/settings', [SettingController::class, 'index'])->middleware('permission:manage_settings');
    Route::put('/settings', [SettingController::class, 'update'])->middleware('permission:manage_settings');
});
