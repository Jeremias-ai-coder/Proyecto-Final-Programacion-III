<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Appointment;

class User extends Model
{
    use SoftDeletes;

    protected $table = 'users';
    protected $fillable = ['name', 'email', 'role', 'password', 'email_notifications', 'phone', 'whatsapp_notifications'];
    public $timestamps = false;
    protected $dates = ['deleted_at'];
    protected $hidden = ['password'];

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function rememberTokens()
    {
        return $this->hasMany(UserRememberToken::class);
    }
}

