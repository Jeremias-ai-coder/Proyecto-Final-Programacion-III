<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class UserRememberToken extends Model
{
    protected $table = 'user_remember_tokens';
    protected $fillable = ['user_id', 'selector', 'hashed_validator', 'expires_at'];
    public $timestamps = false;

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
