<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tutor extends Model
{
    use HasFactory;

    protected $fillable = ['tutor_id', 'supervised_group_id', 'name'];

    public function user(){
        return $this->belongsTo(User::class, 'tutor_id');
    }

    public function group()
    {
        return $this->belongsTo(Group::class, 'supervised_group_id');
    }
}
