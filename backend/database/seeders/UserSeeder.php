<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = [
            ['name' => 'Администратор 1', 'login' => 'admin1', 'password' => 'admin1', 'avatar' => null, 'role' => 'admin'],
        ];

        // Студенты 
        $students = [
            ['name' => 'Иван Петров', 'login' => 'ivan_petrov', 'password' => 'student1', 'avatar' => null, 'role' => 'student'],
            ['name' => 'Мария Сидорова', 'login' => 'maria_sidorova', 'password' => 'student2', 'avatar' => null, 'role' => 'student'],
            ['name' => 'Алексей Смирнов', 'login' => 'alexey_smirnov', 'password' => 'student3', 'avatar' => null, 'role' => 'student'],
            ['name' => 'Елена Кузнецова', 'login' => 'elena_kuznetsova', 'password' => 'student4', 'avatar' => null, 'role' => 'student'],
            ['name' => 'Дмитрий Попов', 'login' => 'dmitry_popov', 'password' => 'student5', 'avatar' => null, 'role' => 'student'],
            ['name' => 'Анна Васильева', 'login' => 'anna_vasilyeva', 'password' => 'student6', 'avatar' => null, 'role' => 'student'],
            ['name' => 'Сергей Павлов', 'login' => 'sergey_pavlov', 'password' => 'student7', 'avatar' => null, 'role' => 'student'],
            ['name' => 'Татьяна Соколова', 'login' => 'tatyana_sokolova', 'password' => 'student8', 'avatar' => null, 'role' => 'student'],
            ['name' => 'Андрей Михайлов', 'login' => 'andrey_mikhailov', 'password' => 'student9', 'avatar' => null, 'role' => 'student'],
        ];

        // Учителя
        $teachers = [
            ['name' => 'Екатерина Волкова', 'login' => 'ekaterina_volkova', 'password' => 'teacher1', 'avatar' => null, 'role' => 'teacher'],
            ['name' => 'Владимир Морозов', 'login' => 'vladimir_morozov', 'password' => 'teacher2', 'avatar' => null, 'role' => 'teacher'],
            ['name' => 'Ольга Новикова', 'login' => 'olga_novikova', 'password' => 'teacher3', 'avatar' => null, 'role' => 'teacher'],
        ];

        // Объединяем
        $allUsers = array_merge($users, $students, $teachers);

        // Создаём 
        foreach ($allUsers as $user) {
            \App\Models\User::create($user);
        }
    }
}
