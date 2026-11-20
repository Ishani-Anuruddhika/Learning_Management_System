<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\District;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Demo accounts copied from the Figma Make mock data. Demo passwords are for local use only. */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $roles = Role::pluck('id', 'name');

        $departments = [
            ['Administration', 'Mr. Ajith Perera', 'admin@dmuss.gov.lk', '011-2345678', 'admin.head'],
            ['Finance', 'Mrs. Dilani Bandara', 'finance@dmuss.gov.lk', '011-2345679', 'finance.head'],
            ['Human Resources', 'Mr. Nimal Jayawardena', 'hr@dmuss.gov.lk', '011-2345680', 'hr.head'],
            ['IT Department', 'Ms. Sachini Rodrigo', 'it@dmuss.gov.lk', '011-2345681', 'it.head'],
            ['Operations', 'Mr. Rohan Fernando', 'ops@dmuss.gov.lk', '011-2345682', 'ops.head'],
            ['Procurement', 'Mrs. Kamani Silva', 'proc@dmuss.gov.lk', '011-2345683', 'proc.head'],
            ['Legal', 'Mr. Pradeep Gunasekara', 'legal@dmuss.gov.lk', '011-2345684', 'legal.head'],
            ['Public Relations', 'Ms. Thilini Wijesinghe', 'pr@dmuss.gov.lk', '011-2345685', 'pr.head'],
        ];

        foreach ($departments as [$name, $head, $email, $phone, $username]) {
            $department = Department::updateOrCreate(['name' => $name], [
                'head_name' => $head, 'email' => $email, 'phone' => $phone,
            ]);
            User::updateOrCreate(['username' => $username], [
                'name' => $head, 'title' => "Head — {$name}", 'role_id' => $roles['dept_head'],
                'department_id' => $department->id, 'password' => 'dept123',
                'is_active' => true, 'registration_status' => 'approved',
            ]);
        }

        $titles = ['Mr.', 'Mrs.', 'Ms.', 'Mr.', 'Mrs.', 'Mr.', 'Ms.', 'Mr.'];
        $names = ['K. Perera', 'R. Silva', 'S. Fernando', 'N. Bandara', 'P. Jayawardena', 'A. Wickramasinghe', 'D. Rajapaksa', 'T. Gunawardena'];

        foreach (District::orderBy('number')->get() as $i => $district) {
            $head = $titles[$i % 8] . ' ' . $names[$i % 8];
            $slug = Str::slug($district->name);
            $district->update([
                'head_name' => $head,
                'email' => "{$slug}@district.dmuss.gov.lk",
                'phone' => sprintf('0%d-2%s', 21 + $i, substr((string) (100000 + $i * 1000), 0, 6)),
            ]);
            User::updateOrCreate(['username' => "{$slug}.head"], [
                'name' => $head, 'title' => "District Head — {$district->name}", 'role_id' => $roles['district_head'],
                'district_id' => $district->id, 'password' => 'dist123',
                'is_active' => true, 'registration_status' => 'approved',
            ]);
        }

        $chain = [
            ['coordinator', 'Mr. S. Wickramasinghe', 'Head of District Coordinator', 'district_coordinator', 'coord123'],
            ['accounts', 'Mrs. R. Jayawardena', 'Head of Accounts', 'head_accounts', 'acc123'],
            ['store', 'Mr. P. Dissanayake', 'Store Officer', 'store_officer', 'store123'],
        ];

        foreach ($chain as [$username, $name, $title, $role, $password]) {
            User::updateOrCreate(['username' => $username], [
                'name' => $name, 'title' => $title, 'role_id' => $roles[$role], 'password' => $password,
                'is_active' => true, 'registration_status' => 'approved',
            ]);
        }
    }
}
