<?php

namespace Kibamail\Service;

use Kibamail\Broadcast;
use Kibamail\Collection;
use Kibamail\Enums\Transporter\ContentType;
use Kibamail\Enums\Transporter\Method;
use Kibamail\Resource;
use Kibamail\ValueObjects\ResourceUri;
use Kibamail\ValueObjects\Transporter\Payload;

class Broadcasts extends Service
{
    /**
     * Create a broadcast.
     *
     * @param array{
     *     name: string,
     *     emailContent?: array,
     *     from?: string,
     *     replyTo?: string,
     *     segmentId?: string,
     *     topicId?: string,
     *     sendAt?: string
     * } $parameters Broadcast creation parameters
     *
     * @return Broadcast The created broadcast
     */
    public function create(array $parameters): Broadcast
    {
        $payload = Payload::create('v1/broadcasts', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('broadcasts', $result);
    }

    /**
     * List all broadcasts.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function list(array $options = []): Collection
    {
        $payload = Payload::list('v1/broadcasts', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('broadcasts', $result);
    }

    /**
     * Retrieve a single broadcast by ID.
     */
    public function get(string $id): Broadcast
    {
        $payload = Payload::get('v1/broadcasts', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('broadcasts', $result);
    }

    /**
     * Update a broadcast by ID.
     *
     * @param string $id The broadcast ID
     * @param array{
     *     name?: string,
     *     emailContent?: array,
     *     from?: string,
     *     replyTo?: string,
     *     segmentId?: string,
     *     topicId?: string,
     *     sendAt?: string
     * } $parameters Broadcast update parameters
     *
     * @return Broadcast The updated broadcast
     */
    public function update(string $id, array $parameters): Broadcast
    {
        $payload = Payload::update('v1/broadcasts', $id, $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('broadcasts', $result);
    }

    /**
     * Delete a broadcast by ID.
     */
    public function delete(string $id): Broadcast
    {
        $payload = Payload::delete('v1/broadcasts', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('broadcasts', $result);
    }

    /**
     * Send a broadcast immediately.
     */
    public function send(string $id): Broadcast
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::POST,
            ResourceUri::withAction('v1/broadcasts', $id, 'send')
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('broadcasts', $result);
    }

    /**
     * Create and send a broadcast in one step.
     *
     * @param array{
     *     name: string,
     *     emailContent?: array,
     *     from?: string,
     *     replyTo?: string,
     *     segmentId?: string,
     *     topicId?: string
     * } $parameters Broadcast creation and sending parameters
     *
     * @return Broadcast The created and sent broadcast
     */
    public function createAndSend(array $parameters): Broadcast
    {
        $payload = Payload::create('v1/broadcasts/create-and-send', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('broadcasts', $result);
    }

    /**
     * List sends for a broadcast.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function sends(string $id, array $options = []): Collection
    {
        $searchParams = [];

        foreach (['limit', 'after', 'before'] as $key) {
            if (array_key_exists($key, $options)) {
                $searchParams[$key] = $options[$key];
            }
        }

        $resource = 'v1/broadcasts/' . $id . '/sends';

        if (! empty($searchParams)) {
            $resource .= '?' . http_build_query($searchParams);
        }

        $payload = new Payload(ContentType::JSON, Method::GET, ResourceUri::list($resource));
        $result = $this->transporter->request($payload);

        return $this->createResource('broadcasts', $result);
    }

    /**
     * Retrieve statistics for a broadcast.
     */
    public function stats(string $id): Resource
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::GET,
            ResourceUri::withAction('v1/broadcasts', $id, 'stats')
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('broadcasts', $result);
    }
}
