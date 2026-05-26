<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;
    protected $fillable = [
        'group_id', 
        'task_id', 
        'title', 
        'description', 
        'deadline', 
        'user_id',
        'slug',
    ]; 

    public function group(){
        return $this->belongsTo(Group::class);
    }

    public function file(){
        return $this->belongsTo(File::class, 'task_id');
    }

    public function answers(){
        return $this->hasMany(Answer::class);
    }

    public function user(){
        return $this->belongsTo(User::class);
    }
}
