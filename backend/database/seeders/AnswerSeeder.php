<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AnswerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $comments = [
            'Хорошее задание, но сложновато',
            'Интересно, сделал быстро',
            'Можно было бы добавить примеров',
            'Понравилось, жду продолжения',
            'Немного запутанно, но разобрался',
            'Отличная задача для практики',
            'Слишком легко, хочется сложнее'
        ];

        $user_ids = [2, 3, 4, 7, 8, 9, 10];

        foreach ($user_ids as $index => $user_id) {
            DB::table('answers')->insert([
                'task_id' => 1,
                'answer_id' => 1,
                'students_comment' => $comments[$index % count($comments)],
                'user_id' => $user_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}