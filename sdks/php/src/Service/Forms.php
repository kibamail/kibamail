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
}
