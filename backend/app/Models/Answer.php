<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Answer extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'answer_id',
        'students_comment',
        'teachers_comment',
        'mark',
        'user_id',
        'slug',
    ];

    public function task(){
        return $this->belongsTo(Task::class);
    }

    public function file(){
        return $this->belongsTo(File::class, 'answer_id');
    }

    public function user(){
        return $this->belongsTo(User::class);
    }
}
