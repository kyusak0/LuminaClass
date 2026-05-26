<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'login',
        'password',
        'avatar',
        'role',
        'is_blocked',
        'blocked_at',
    ];

    public function files(){
        return $this->hasMany(File::class, 'author_id');
    }

    public function tasks(){
        return $this->hasMany(Task::class);
    }

    public function answers(){
        return $this->hasMany(Answer::class);
    }

    public function groups(){
        return $this->hasMany(Student::class, 'student_id');
    }

    public function tutors(){
        return $this->hasMany(Tutor::class, 'tutor_id');
    }

    public function students(){
        return $this->hasMany(Tutor::class, 'student_id');
    }

    public function guardianships()
    {
        return $this->hasMany(Guardian::class, 'parent_id');
    }
    
    /**
     * Получить детей пользователя (если он родитель)
     */
    public function children()
    {
        return $this->belongsToMany(User::class, 'guardians', 'parent_id', 'child_id');
    }
    
    /**
     * Детские отношения (где пользователь является ребенком)
     */
    public function guardians()
    {
        return $this->hasMany(Guardian::class, 'child_id');
    }
    
    /**
     * Получить родителей пользователя (если он ребенок)
     */
    public function parents()
    {
        return $this->belongsToMany(User::class, 'guardians', 'child_id', 'parent_id');
    }

    public function isParent()
    {
        return $this->guardianships()->exists();
    }
    
    /**
     * Проверка, является ли пользователь ребенком
     */
    public function isChild()
    {
        return $this->guardians()->exists();
    }
    
    /**
     * Получить всех опекунов (родителей + другие типы)
     */
    public function allGuardians()
    {
        return $this->parents()->wherePivotIn('guardian_type', ['parent', 'guardian']);
    }

    public function isBlocked(): bool
    {
        return (bool) $this->is_blocked;
    }

    // Блокировка пользователя
    public function block(): void
    {
        $this->update([
            'is_blocked' => true,
            'blocked_at' => now(),
        ]);
    }

    public function getBlockReason(): ?string
    {
        if (!$this->is_blocked) {
            return null;
        }
        
        return 'Пользователь заблокирован администратором';
    }

    // Mutator для автоматической установки даты при блокировке
    public function setIsBlockedAttribute($value)
    {
        $this->attributes['is_blocked'] = $value;
        
        if ($value) {
            $this->attributes['blocked_at'] = now();
        } elseif (!$value && isset($this->attributes['blocked_at'])) {
            $this->attributes['blocked_at'] = null;
        }
    }

    // Scope для получения только активных пользователей
    public function scopeActive($query)
    {
        return $query->where('is_blocked', false);
    }

    // Scope для получения заблокированных пользователей
    public function scopeBlocked($query)
    {
        return $query->where('is_blocked', true);
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_blocked' => 'boolean',
        'blocked_at' => 'datetime',
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];
}
