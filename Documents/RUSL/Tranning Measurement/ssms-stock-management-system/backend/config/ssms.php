<?php

return [
    // Where the React app lives. Used to build the link in password-reset emails.
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

    // Minutes a password-reset link stays valid.
    'reset_link_minutes' => (int) env('RESET_LINK_MINUTES', 60),
];
