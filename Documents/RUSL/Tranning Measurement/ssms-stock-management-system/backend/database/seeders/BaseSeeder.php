<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\ItemCategory;
use App\Models\Permission;
use App\Models\Role;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Seeder;

class BaseSeeder extends Seeder
{
    public const DISTRICTS = [
        'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
        'Mullaitivu', 'Vavuniya', 'Trincomalee', 'Batticaloa', 'Ampara',
        'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
        'Monaragala', 'Ratnapura', 'Kegalle',
    ];

    public const CATEGORIES = [
        'Books & Envelopes', 'Cleaning & Housekeeping', 'Computer Accessories',
        'Filing & Binding', 'General & Other', 'Laboratory Supplies', 'Networking',
        'Office Accessories', 'Office Equipment', 'Paper', 'Power & Batteries',
        'Printer Toners & Ribbons', 'Sealing & Labelling', 'Writing Instruments',
    ];

    /** key => description */
    public const PERMISSIONS = [
        'manage_users' => 'Create, edit and disable user accounts',
        'manage_departments' => 'Manage internal departments',
        'manage_districts' => 'Manage the 25 districts',
        'manage_items' => 'Create, edit and delete stock items',
        'manage_item_categories' => 'Manage item categories',
        'receive_stock' => 'Receive / add stock batches',
        'view_stock' => 'View current stock',
        'view_all_batches' => 'View all stock batches',
        'create_request' => 'Create stock requests (own department / district only)',
        'view_own_requests' => 'View own requests',
        'view_all_requests' => 'View all requests',
        'view_pending_district_requests' => 'View pending district requests',
        'approve_coordinator' => 'Approve / reject district requests (Coordinator stage)',
        'approve_accounts' => 'Approve / reject requests (Accounts stage)',
        'issue_stock' => 'Issue approved stock using FIFO',
        'check_availability' => 'Check stock availability',
        'view_transactions' => 'View stock transactions',
        'generate_stock_report' => 'Generate / download the current stock report (PDF)',
        'generate_annual_report' => 'Generate / download the annual report (PDF)',
        'manage_settings' => 'Manage system settings',
    ];

    /** role name => [label, permission keys]  (from the Role Permissions document) */
    public const ROLES = [
        'admin' => ['Admin', [
            'manage_users', 'manage_departments', 'manage_districts', 'manage_items', 'manage_item_categories',
            'receive_stock', 'view_stock', 'view_all_batches', 'view_all_requests', 'view_pending_district_requests',
            'check_availability', 'view_transactions', 'generate_stock_report', 'generate_annual_report', 'manage_settings',
        ]],
        'dept_head' => ['Department Head', ['view_stock', 'create_request', 'view_own_requests']],
        'district_head' => ['District Head', ['view_stock', 'create_request', 'view_own_requests']],
        'district_coordinator' => ['Head of District Coordinator', [
            'view_stock', 'view_pending_district_requests', 'approve_coordinator',
        ]],
        'head_accounts' => ['Head of Accounts', [
            'view_stock', 'manage_items', 'manage_item_categories', 'view_all_batches', 'view_all_requests',
            'view_pending_district_requests', 'approve_accounts', 'check_availability', 'view_transactions',
            'generate_stock_report', 'generate_annual_report',
        ]],
        'store_officer' => ['Store Officer', [
            'view_stock', 'manage_item_categories', 'receive_stock', 'view_all_batches', 'view_all_requests',
            'issue_stock', 'check_availability', 'view_transactions', 'generate_stock_report', 'generate_annual_report',
        ]],
    ];

    public function run(): void
    {
        foreach (self::PERMISSIONS as $key => $description) {
            Permission::updateOrCreate(['key' => $key], ['description' => $description]);
        }

        foreach (self::ROLES as $name => [$label, $keys]) {
            $role = Role::updateOrCreate(['name' => $name], ['label' => $label]);
            $role->permissions()->sync(Permission::whereIn('key', $keys)->pluck('id'));
        }

        foreach (self::DISTRICTS as $i => $name) {
            District::updateOrCreate(['number' => $i + 1], ['name' => $name]);
        }

        foreach (self::CATEGORIES as $name) {
            ItemCategory::firstOrCreate(['name' => $name]);
        }

        User::firstOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'System Administrator',
                'title' => 'Administrator',
                'role_id' => Role::where('name', 'admin')->value('id'),
                // Set ADMIN_PASSWORD in .env before seeding a real deployment.
                'password' => env('ADMIN_PASSWORD', 'ChangeMe#12345'),
            ]
        );

        SystemSetting::firstOrCreate(['key' => 'organisation_name'], ['value' => 'Measurement Department']);
    }
}
