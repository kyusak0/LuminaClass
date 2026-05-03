<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Guardian extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_id', 
        'child_id',
    ];
    
    /**
     * Родитель (опекун)
     */
    public function parent()
    {
        return $this->belongsTo(User::class, 'parent_id');
    }
    
    /**
     * Ребенок
     */
    public function child()
    {
        return $this->belongsTo(User::class, 'child_id');
    }
}
