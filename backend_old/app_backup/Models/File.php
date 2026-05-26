<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class File extends Model
{
    use HasFactory;

    protected $fillable = [
        'original_name',
        'path',
        'mime_type',
        'size',
        'author_id'
    ];

    public function user(){
        return $this->belongsTo(User::class, 'author_id');
    }

    public function task(){
        return $this->hasOne(Task::class, 'task_id');
    }

    public function answer(){
        return $this->hasOne(Answer::class, 'answer_id');
    }
}
