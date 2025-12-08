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
     *
     * @param array{
     *     email: string,
     *     firstName?: string|null,
     *     lastName?: string|null,
     *     phone?: string|null,
     *     country?: string|null,
     *     timezone?: string|null,
     *     city?: string|null,
     *     properties?: array<string, mixed>,
     *     subscriptions?: array<array{topicId: string, status: string}>
     * } $parameters Contact creation parameters
     *
     * @return Contact The created contact
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
     *
     * @param string $id The contact ID
     * @param array{
     *     email?: string,
     *     firstName?: string|null,
     *     lastName?: string|null,
     *     phone?: string|null,
     *     country?: string|null,
     *     timezone?: string|null,
     *     city?: string|null,
     *     properties?: array<string, mixed>,
     *     subscriptions?: array<array{topicId: string, status: string}>
     * } $parameters Contact update parameters
     *
     * @return Contact The updated contact
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
     *
     * @param array{
     *     query?: string,
     *     filters?: array,
     *     limit?: int,
     *     after?: string,
     *     before?: string
     * } $parameters Search parameters
     *
     * @return Collection<Contact> Paginated list of matching contacts
     */
    public function search(array $parameters): Collection
    {
        $payload = Payload::search('v1/contacts', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('contacts', $result);
    }
}
