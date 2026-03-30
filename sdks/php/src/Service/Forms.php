<?php

namespace Kibamail\Service;

use Kibamail\Collection;
use Kibamail\Form;
use Kibamail\ValueObjects\Transporter\Payload;

class Forms extends Service
{
    /**
     * Retrieve a single form by ID.
     */
    public function get(string $id): Form
    {
        $payload = Payload::get('v1/forms', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('forms', $result);
    }

    /**
     * Create a form.
     *
     * @param array{
     *     name: string,
     *     description?: string|null,
     *     fields?: array
     * } $parameters Form creation parameters
     *
     * @return Form The created form
     */
    public function create(array $parameters): Form
    {
        $payload = Payload::create('v1/forms', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('forms', $result);
    }

    /**
     * List all forms.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function list(array $options = []): Collection
    {
        $payload = Payload::list('v1/forms', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('forms', $result);
    }

    /**
     * Update a form by ID.
     *
     * @param string $id The form ID
     * @param array{
     *     name?: string,
     *     description?: string|null,
     *     fields?: array
     * } $parameters Form update parameters
     *
     * @return Form The updated form
     */
    public function update(string $id, array $parameters): Form
    {
        $payload = Payload::update('v1/forms', $id, $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('forms', $result);
    }

    /**
     * Delete a form by ID.
     */
    public function delete(string $id): Form
    {
        $payload = Payload::delete('v1/forms', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('forms', $result);
    }

    /**
     * Publish a draft form.
     */
    public function publish(string $id): Form
    {
        $payload = Payload::create('v1/forms/' . $id . '/publish', []);
        $result = $this->transporter->request($payload);

        return $this->createResource('forms', $result);
    }

    /**
     * List all versions of a form.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function versions(string $id, array $options = []): Collection
    {
        $payload = Payload::list('v1/forms/' . $id . '/versions', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('forms', $result);
    }

    /**
     * Submit data to a published form.
     *
     * @param string $id The form ID
     * @param array<string, mixed> $data Key-value pairs matching the form's fieldMapping
     *
     * @return Form The submission response
     */
    public function submit(string $id, array $data): Form
    {
        $payload = Payload::create('v1/forms/' . $id . '/submissions', $data);
        $result = $this->transporter->request($payload);

        return $this->createResource('forms', $result);
    }

    /**
     * Create a new version of a form.
     */
    public function createVersion(string $id, array $parameters = []): Form
    {
        $payload = Payload::create('v1/forms/' . $id . '/versions', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('forms', $result);
    }
}
