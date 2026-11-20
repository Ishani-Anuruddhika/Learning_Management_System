<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserNotification extends Model
{
    protected $table = 'notifications';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['is_read' => 'boolean'];
    }
}
