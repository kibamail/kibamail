<?php

namespace Kibamail\Service;

use Kibamail\Event;
use Kibamail\ValueObjects\Transporter\Payload;

class Events extends Service
{
    /**
     * Create an event.
     *
     * @param array{
     *     eventName: string,
     *     contactId: string,
     *     payload?: array<string, mixed>
     * } $parameters Event creation parameters
     *
     * @return Event The created event
     */
    public function create(array $parameters): Event
    {
        $payload = Payload::create('v1/events', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('events', $result);
    }
}
