<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Business;
use App\Models\User;

class BusinessStaff extends Model
{
    protected $table = 'business_staff';
    protected $fillable = ['business_id', 'user_id'];
    public $timestamps = false;

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
