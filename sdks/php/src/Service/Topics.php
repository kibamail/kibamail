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
     *
     * @param array{
     *     name: string,
     *     description?: string|null,
     *     visibility?: string,
     *     defaultOptIn?: bool
     * } $parameters Topic creation parameters
     *
     * @return Topic The created topic
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
     *
     * @param string $id The topic ID
     * @param array{
     *     name?: string,
     *     description?: string|null,
     *     visibility?: string,
     *     defaultOptIn?: bool
     * } $parameters Topic update parameters
     *
     * @return Topic The updated topic
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

    /**
     * Retrieve all contacts subscribed to a specific topic.
     *
     * Returns a paginated list of contacts who are subscribed to the given topic.
     *
     * @param string $topicId The ID of the topic
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options Pagination options
     *
     * @return Collection<Contact> Paginated list of contacts subscribed to the topic
     */
    public function contacts(string $topicId, array $options = []): Collection
    {
        $payload = Payload::list("v1/topics/{$topicId}/contacts", $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('contacts', $result);
    }
}
