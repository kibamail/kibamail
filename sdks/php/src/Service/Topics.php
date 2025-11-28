<?php

namespace Kibamail\Service;

use Kibamail\Collection;
use Kibamail\Topic;
use Kibamail\ValueObjects\Transporter\Payload;

class Topics extends Service
{
    /**
     * Retrieve a single topic by ID.
     */
    public function get(string $id): Topic
    {
        $payload = Payload::get('v1/topics', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('topics', $result);
    }

    /**
     * Create a topic.
     */
    public function create(array $parameters): Topic
    {
        $payload = Payload::create('v1/topics', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('topics', $result);
    }

    /**
     * List all topics.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function list(array $options = []): Collection
    {
        $payload = Payload::list('v1/topics', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('topics', $result);
    }

    /**
     * Update a topic by ID.
     */
    public function update(string $id, array $parameters): Topic
    {
        $payload = Payload::update('v1/topics', $id, $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('topics', $result);
    }

    /**
     * Delete a topic by ID.
     */
    public function delete(string $id): Topic
    {
        $payload = Payload::delete('v1/topics', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('topics', $result);
    }
}
