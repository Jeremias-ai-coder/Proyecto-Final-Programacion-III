<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Appointment;

class User extends Model
{
    protected $table = 'users';
    protected $fillable = ['name', 'email', 'role', 'password'];
    public $timestamps = false;

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }
}
