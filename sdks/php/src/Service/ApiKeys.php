<?php

namespace Kibamail\Service;

use Kibamail\ApiKey;
use Kibamail\Collection;
use Kibamail\ValueObjects\Transporter\Payload;

class ApiKeys extends Service
{
    /**
     * Create an API key.
     */
    public function create(array $parameters): ApiKey
    {
        $payload = Payload::create('v1/api-keys', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('api-keys', $result);
    }

    /**
     * List all API keys.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function list(array $options = []): Collection
    {
        $payload = Payload::list('v1/api-keys', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('api-keys', $result);
    }

    /**
     * Delete an API key by ID.
     */
    public function delete(string $id): ApiKey
    {
        $payload = Payload::delete('v1/api-keys', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('api-keys', $result);
    }
}
