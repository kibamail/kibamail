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
}
