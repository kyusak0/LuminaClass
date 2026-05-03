<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [ 
        'name',
        'email',
        'surname',
        'tel',
        'target', 
        'messanger'
    ];

    public function user(){
        return $this->hasOne(User::class);
    }
}
