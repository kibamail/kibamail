<?php

namespace Kibamail\Service;

use Kibamail\ApiKey;
use Kibamail\Collection;
use Kibamail\ValueObjects\Transporter\Payload;

class ApiKeys extends Service
{
    /**
     * Create an API key.
     *
     * **Warning:** This endpoint requires session authentication (user login), not API key authentication.
     * Calling this method with API key authentication will result in an authentication error.
     * Use this method only when authenticated via user session.
     *
     * @param array{'name': string} $parameters The API key creation parameters
     *
     * @return ApiKey The created API key (includes the key value only on creation)
     *
     * @throws \Kibamail\Exceptions\ErrorException When authentication fails or parameters are invalid
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
