<?php

namespace Kibamail\Service;

use Kibamail\Collection;
use Kibamail\Domain;
use Kibamail\Enums\Transporter\ContentType;
use Kibamail\Enums\Transporter\Method;
use Kibamail\ValueObjects\ResourceUri;
use Kibamail\ValueObjects\Transporter\Payload;

class Domains extends Service
{
    /**
     * Create a sending domain.
     *
     * @param array{
     *     name: string,
     *     openTrackingEnabled?: bool,
     *     clickTrackingEnabled?: bool
     * } $parameters Domain creation parameters
     *
     * @return Domain The created domain
     */
    public function create(array $parameters): Domain
    {
        $payload = Payload::create('v1/domains', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('domains', $result);
    }

    /**
     * List all sending domains.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function list(array $options = []): Collection
    {
        $payload = Payload::list('v1/domains', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('domains', $result);
    }

    /**
     * Retrieve a single domain by ID.
     */
    public function get(string $id): Domain
    {
        $payload = Payload::get('v1/domains', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('domains', $result);
    }

    /**
     * Update a domain by ID.
     *
     * @param string $id The domain ID
     * @param array{
     *     openTrackingEnabled?: bool,
     *     clickTrackingEnabled?: bool
     * } $parameters Domain update parameters
     *
     * @return Domain The updated domain
     */
    public function update(string $id, array $parameters): Domain
    {
        $payload = Payload::update('v1/domains', $id, $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('domains', $result);
    }

    /**
     * Delete a domain by ID.
     */
    public function delete(string $id): Domain
    {
        $payload = Payload::delete('v1/domains', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('domains', $result);
    }

    /**
     * Verify a domain's DNS records.
     */
    public function verify(string $id): Domain
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::POST,
            ResourceUri::withAction('v1/domains', $id, 'verify')
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('domains', $result);
    }
}
