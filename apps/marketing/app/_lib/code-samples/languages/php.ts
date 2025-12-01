export const language = "php";
export const label = "PHP";

export const code = `<?php

use Kibamail\\Kibamail;

$kibamail = new Kibamail('your-api-key');

$kibamail->emails->send([
    'from' => 'hello@yourdomain.com',
    'to' => 'user@example.com',
    'subject' => 'Welcome to Kibamail',
    'html' => '<h1>Hello World</h1>',
]);
`;
