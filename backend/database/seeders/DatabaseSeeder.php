<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        \App\Models\User::create([
            'name' => 'Администратор 1',
            'login' => 'admin1@gmail.com',
            'password' => 'admin1',
            'avatar' => null,
            'role' => 'admin'
        ]);

        \App\Models\User::create([
            'name' => 'Ученик 1',
            'login' => 'student1@gmail.com',
            'password' => 'student1',
            'avatar' => null,
            'role' => 'student'
        ]);

        \App\Models\User::create([
            'name' => 'Учитель 1',
            'login' => 'teacher1@gmail.com',
            'password' => 'teacher1',
            'avatar' => null,
            'role' => 'teacher'
        ]);

        \App\Models\User::create([
            'name' => 'Родитель 1',
            'login' => 'parent1@gmail.com',
            'password' => 'parent1',
            'avatar' => null,
            'role' => 'parent'
        ]);
    }
}
