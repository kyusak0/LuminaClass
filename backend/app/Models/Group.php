<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 
        'subject', 
        'desc',
        'slug',];

    public function students(){
        return $this->hasMany(Student::class);
    }

    public function teacher()
    {
        return $this->hasOne(Tutor::class, 'supervised_group_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'group_id');
    }

    public function messages()
    {
        return $this->hasMany(GroupMessage::class);
    }

    // public function organization(){
    //     return $this->belongsTo(Organization::class, 'organization_id');
    // }
}
