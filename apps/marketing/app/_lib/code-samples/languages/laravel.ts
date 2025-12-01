export const language = "php";
export const label = "Laravel";

export const code = `<?php

use Illuminate\\Support\\Facades\\Mail;
use App\\Mail\\WelcomeEmail;

Mail::to('user@example.com')
    ->send(new WelcomeEmail($user));

// Or using the Kibamail facade directly
Kibamail::send([
    'from' => 'hello@yourdomain.com',
    'to' => 'user@example.com',
    'subject' => 'Welcome to Kibamail',
    'html' => '<h1>Hello World</h1>',
]);
`;
