<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Notification extends Model
{
    protected $table = 'notifications';
    protected $fillable = ['user_id', 'title', 'message', 'type', 'is_read'];
    public $timestamps = false;

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
