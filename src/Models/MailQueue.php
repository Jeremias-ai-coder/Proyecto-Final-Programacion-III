<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailQueue extends Model
{
    protected $table = 'mail_queue';
    protected $fillable = ['recipient_email', 'recipient_name', 'subject', 'body', 'status', 'attempts', 'error_message'];
    
    // Dejar Eloquent manejar created_at y updated_at automáticamente
    public $timestamps = true;
}
