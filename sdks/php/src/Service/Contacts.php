<?php

namespace Kibamail\Service;

use Kibamail\Collection;
use Kibamail\Contact;
use Kibamail\ValueObjects\Transporter\Payload;

class Contacts extends Service
{
    /**
     * Retrieve a single contact by ID.
     */
    public function get(string $id): Contact
    {
        $payload = Payload::get('v1/contacts', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('contacts', $result);
    }

    /**
     * Create a contact.
     */
    public function create(array $parameters): Contact
    {
        $payload = Payload::create('v1/contacts', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('contacts', $result);
    }

    /**
     * List all contacts.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function list(array $options = []): Collection
    {
        $payload = Payload::list('v1/contacts', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('contacts', $result);
    }

    /**
     * Update a contact by ID.
     */
    public function update(string $id, array $parameters): Contact
    {
        $payload = Payload::update('v1/contacts', $id, $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('contacts', $result);
    }

    /**
     * Delete a contact by ID.
     */
    public function delete(string $id): Contact
    {
        $payload = Payload::delete('v1/contacts', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('contacts', $result);
    }

    /**
     * Search contacts.
     */
    public function search(array $parameters): Collection
    {
        $payload = Payload::search('v1/contacts', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('contacts', $result);
    }
}
