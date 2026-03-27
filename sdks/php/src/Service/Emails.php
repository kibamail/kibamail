<?php

namespace Kibamail\Service;

use Kibamail\Collection;
use Kibamail\Email;
use Kibamail\Enums\Transporter\ContentType;
use Kibamail\Enums\Transporter\Method;
use Kibamail\Resource;
use Kibamail\ValueObjects\ResourceUri;
use Kibamail\ValueObjects\Transporter\Payload;

class Emails extends Service
{
    /**
     * Send a transactional email.
     *
     * @param array{
     *     from: string,
     *     to: string|array<string>,
     *     subject?: string,
     *     html?: string,
     *     text?: string,
     *     template?: array{id: string, variables?: array<string, mixed>},
     *     replyTo?: array{email: string, name?: string},
     *     previewText?: string,
     *     metadata?: array<string, mixed>,
     *     attachments?: array
     * } $parameters Email sending parameters
     *
     * @return Email The sent email
     */
    public function send(array $parameters): Email
    {
        $payload = Payload::create('v1/emails/send', $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('emails', $result);
    }

    /**
     * List transactional emails.
     *
     * @param array{
     *     'limit'?: int,
     *     'before'?: string,
     *     'after'?: string,
     *     'status'?: string,
     *     'to'?: string,
     *     'subject'?: string,
     *     'from_date'?: string,
     *     'to_date'?: string
     * } $options
     */
    public function list(array $options = []): Collection
    {
        $searchParams = [];

        foreach (['limit', 'after', 'before', 'status', 'to', 'subject', 'from_date', 'to_date'] as $key) {
            if (array_key_exists($key, $options)) {
                $searchParams[$key] = $options[$key];
            }
        }

        $resource = 'v1/emails';

        if (! empty($searchParams)) {
            $resource .= '?' . http_build_query($searchParams);
        }

        $payload = new Payload(ContentType::JSON, Method::GET, ResourceUri::list($resource));
        $result = $this->transporter->request($payload);

        return $this->createResource('emails', $result);
    }

    /**
     * Retrieve a single email by ID.
     */
    public function get(string $id): Email
    {
        $payload = Payload::get('v1/emails', $id);
        $result = $this->transporter->request($payload);

        return $this->createResource('emails', $result);
    }

    /**
     * Retrieve events for an email.
     */
    public function events(string $id): Resource
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::GET,
            ResourceUri::withAction('v1/emails', $id, 'events')
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('emails', $result);
    }

    /**
     * Retrieve the content of an email.
     */
    public function content(string $id): Resource
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::GET,
            ResourceUri::withAction('v1/emails', $id, 'content')
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('emails', $result);
    }
}
