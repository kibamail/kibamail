<?php

namespace Kibamail\Service;

use Kibamail\Automation;
use Kibamail\Collection;
use Kibamail\Enums\Transporter\ContentType;
use Kibamail\Enums\Transporter\Method;
use Kibamail\Resource;
use Kibamail\ValueObjects\ResourceUri;
use Kibamail\ValueObjects\Transporter\Payload;

class Automations extends Service
{
    /**
     * Create an automation.
     *
     * @param array{
     *     name: string,
     *     description?: string|null,
     *     trigger?: array,
     *     nodes?: array,
     *     edges?: array
     * } $parameters Automation creation parameters
     *
     * @return Automation The created automation
     */
    public function create(array $parameters): Automation
    {
        $payload = Payload::create('v1/automations', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('automations', $result);
    }

    /**
     * List all automations.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string, 'status'?: string} $options
     */
    public function list(array $options = []): Collection
    {
        $searchParams = [];

        foreach (['limit', 'after', 'before', 'status'] as $key) {
            if (array_key_exists($key, $options)) {
                $searchParams[$key] = $options[$key];
            }
        }

        $resource = 'v1/automations';

        if (! empty($searchParams)) {
            $resource .= '?' . http_build_query($searchParams);
        }

        $payload = new Payload(ContentType::JSON, Method::GET, ResourceUri::list($resource));
        $result = $this->transporter->request($payload);

        return $this->createResource('automations', $result);
    }

    /**
     * Retrieve a single automation by ID.
     */
    public function get(string $id): Automation
    {
        $payload = Payload::get('v1/automations', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('automations', $result);
    }

    /**
     * Update an automation by ID.
     *
     * @param string $id The automation ID
     * @param array{
     *     name?: string,
     *     description?: string|null,
     *     trigger?: array,
     *     nodes?: array,
     *     edges?: array
     * } $parameters Automation update parameters
     *
     * @return Automation The updated automation
     */
    public function update(string $id, array $parameters): Automation
    {
        $payload = Payload::update('v1/automations', $id, $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('automations', $result);
    }

    /**
     * Delete an automation by ID.
     */
    public function delete(string $id): Automation
    {
        $payload = Payload::delete('v1/automations', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('automations', $result);
    }

    /**
     * Publish an automation.
     */
    public function publish(string $id): Automation
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::POST,
            ResourceUri::withAction('v1/automations', $id, 'publish')
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('automations', $result);
    }

    /**
     * Archive an automation.
     */
    public function archive(string $id): Automation
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::POST,
            ResourceUri::withAction('v1/automations', $id, 'archive')
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('automations', $result);
    }

    /**
     * Trigger an automation for specific contacts.
     *
     * @param array{
     *     contactId?: string,
     *     contactIds?: array<string>,
     *     payload?: array<string, mixed>
     * } $parameters Trigger parameters
     *
     * @return Resource The trigger result
     */
    public function trigger(string $id, array $parameters): Resource
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::POST,
            ResourceUri::withAction('v1/automations', $id, 'trigger'),
            $parameters
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('automations', $result);
    }

    /**
     * Simulate an automation run.
     *
     * @param array{
     *     contactId?: string,
     *     payload?: array<string, mixed>
     * } $parameters Simulation parameters
     *
     * @return Resource The simulation result
     */
    public function simulate(string $id, array $parameters): Resource
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::POST,
            ResourceUri::withAction('v1/automations', $id, 'simulate'),
            $parameters
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('automations', $result);
    }
}
