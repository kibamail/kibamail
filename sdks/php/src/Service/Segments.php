<?php

namespace Kibamail\Service;

use Kibamail\Collection;
use Kibamail\Segment;
use Kibamail\ValueObjects\Transporter\Payload;

class Segments extends Service
{
    /**
     * Retrieve a single segment by ID.
     */
    public function get(string $id): Segment
    {
        $payload = Payload::get('v1/segments', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('segments', $result);
    }

    /**
     * Create a segment.
     *
     * @param array{
     *     name: string,
     *     description?: string|null,
     *     conditions: array
     * } $parameters Segment creation parameters
     *
     * @return Segment The created segment
     */
    public function create(array $parameters): Segment
    {
        $payload = Payload::create('v1/segments', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('segments', $result);
    }

    /**
     * List all segments.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function list(array $options = []): Collection
    {
        $payload = Payload::list('v1/segments', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('segments', $result);
    }

    /**
     * Update a segment by ID.
     *
     * @param string $id The segment ID
     * @param array{
     *     name?: string,
     *     description?: string|null,
     *     conditions?: array
     * } $parameters Segment update parameters
     *
     * @return Segment The updated segment
     */
    public function update(string $id, array $parameters): Segment
    {
        $payload = Payload::update('v1/segments', $id, $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('segments', $result);
    }

    /**
     * Delete a segment by ID.
     */
    public function delete(string $id): Segment
    {
        $payload = Payload::delete('v1/segments', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('segments', $result);
    }

    /**
     * Retrieve all contacts that match a segment's filter conditions.
     *
     * Returns a paginated list of contacts belonging to the specified segment.
     *
     * @param string $segmentId The ID of the segment
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options Pagination options
     *
     * @return Collection<Contact> Paginated list of contacts in the segment
     */
    public function contacts(string $segmentId, array $options = []): Collection
    {
        $payload = Payload::list("v1/segments/{$segmentId}/contacts", $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('contacts', $result);
    }
}
