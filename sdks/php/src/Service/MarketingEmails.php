<?php

namespace Kibamail\Service;

use Kibamail\Collection;
use Kibamail\Enums\Transporter\ContentType;
use Kibamail\Enums\Transporter\Method;
use Kibamail\MarketingEmail;
use Kibamail\Resource;
use Kibamail\ValueObjects\ResourceUri;
use Kibamail\ValueObjects\Transporter\Payload;

class MarketingEmails extends Service
{
    /**
     * Create a marketing email.
     *
     * @param array{
     *     name: string,
     *     subject?: string,
     *     emailContent?: array,
     *     from?: string,
     *     replyTo?: string
     * } $parameters Marketing email creation parameters
     *
     * @return MarketingEmail The created marketing email
     */
    public function create(array $parameters): MarketingEmail
    {
        $payload = Payload::create('v1/marketing-emails', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('marketing-emails', $result);
    }

    /**
     * List all marketing emails.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function list(array $options = []): Collection
    {
        $payload = Payload::list('v1/marketing-emails', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('marketing-emails', $result);
    }

    /**
     * Retrieve a single marketing email by ID.
     */
    public function get(string $id): MarketingEmail
    {
        $payload = Payload::get('v1/marketing-emails', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('marketing-emails', $result);
    }

    /**
     * Update a marketing email by ID.
     *
     * @param string $id The marketing email ID
     * @param array{
     *     name?: string,
     *     subject?: string,
     *     emailContent?: array,
     *     from?: string,
     *     replyTo?: string
     * } $parameters Marketing email update parameters
     *
     * @return MarketingEmail The updated marketing email
     */
    public function update(string $id, array $parameters): MarketingEmail
    {
        $payload = Payload::update('v1/marketing-emails', $id, $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('marketing-emails', $result);
    }

    /**
     * Delete a marketing email by ID.
     */
    public function delete(string $id): MarketingEmail
    {
        $payload = Payload::delete('v1/marketing-emails', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('marketing-emails', $result);
    }

    /**
     * Preview a marketing email by ID.
     */
    public function preview(string $id): Resource
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::GET,
            ResourceUri::withAction('v1/marketing-emails', $id, 'preview')
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('marketing-emails', $result);
    }

    /**
     * Retrieve statistics for a marketing email.
     */
    public function stats(string $id): Resource
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::GET,
            ResourceUri::withAction('v1/marketing-emails', $id, 'stats')
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('marketing-emails', $result);
    }
}
