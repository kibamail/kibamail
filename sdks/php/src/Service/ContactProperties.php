<?php

namespace Kibamail\Service;

use Kibamail\Collection;
use Kibamail\ContactProperty;
use Kibamail\ValueObjects\Transporter\Payload;

class ContactProperties extends Service
{
    /**
     * Retrieve a single contact property by ID.
     */
    public function get(string $id): ContactProperty
    {
        $payload = Payload::get('v1/contact-properties', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('contact-properties', $result);
    }

    /**
     * Create a contact property.
     *
     * @param array{
     *     name: string,
     *     type: string,
     *     defaultValue?: string|null
     * } $parameters Contact property creation parameters
     *
     * @return ContactProperty The created contact property
     */
    public function create(array $parameters): ContactProperty
    {
        $payload = Payload::create('v1/contact-properties', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('contact-properties', $result);
    }

    /**
     * List all contact properties.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function list(array $options = []): Collection
    {
        $payload = Payload::list('v1/contact-properties', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('contact-properties', $result);
    }

    /**
     * Update a contact property by ID.
     *
     * @param string $id The contact property ID
     * @param array{
     *     name?: string,
     *     type?: string,
     *     defaultValue?: string|null
     * } $parameters Contact property update parameters
     *
     * @return ContactProperty The updated contact property
     */
    public function update(string $id, array $parameters): ContactProperty
    {
        $payload = Payload::update('v1/contact-properties', $id, $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('contact-properties', $result);
    }

    /**
     * Delete a contact property by ID.
     */
    public function delete(string $id): ContactProperty
    {
        $payload = Payload::delete('v1/contact-properties', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('contact-properties', $result);
    }
}
