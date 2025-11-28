<?php

namespace Kibamail\Contracts;

use Kibamail\ValueObjects\Transporter\Payload;

interface Transporter
{
    /**
     * Sends a request to the Kibamail API.
     *
     * @return array<array-key, mixed>
     */
    public function request(Payload $payload): array;
}
