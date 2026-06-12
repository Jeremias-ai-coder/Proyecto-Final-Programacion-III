<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Appointment;

class User extends Model
{
    use SoftDeletes;

    protected $table = 'users';
    protected $fillable = ['name', 'email', 'role', 'password'];
    public $timestamps = false;
    protected $dates = ['deleted_at'];

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function rememberTokens()
    {
        return $this->hasMany(UserRememberToken::class);
    }
}

