<?php

namespace Kibamail\Service;

use Kibamail\Collection;
use Kibamail\Enums\Transporter\ContentType;
use Kibamail\Enums\Transporter\Method;
use Kibamail\Inbox as InboxResource;
use Kibamail\Resource;
use Kibamail\ValueObjects\ResourceUri;
use Kibamail\ValueObjects\Transporter\Payload;

class Inbox extends Service
{
    /**
     * List all inbox conversations.
     *
     * @param array{'limit'?: int, 'before'?: string, 'after'?: string} $options
     */
    public function listConversations(array $options = []): Collection
    {
        $payload = Payload::list('v1/inbox/conversations', $options);
        $result = $this->transporter->request($payload);

        return $this->createResource('inbox', $result);
    }

    /**
     * Retrieve a single conversation by ID.
     */
    public function getConversation(string $conversationId): InboxResource
    {
        $payload = Payload::get('v1/inbox/conversations', $conversationId);
        $result = $this->transporter->request($payload);

        return $this->createResource('inbox', $result);
    }

    /**
     * Update a conversation by ID.
     *
     * @param string $conversationId The conversation ID
     * @param array{
     *     status?: string
     * } $parameters Conversation update parameters
     *
     * @return InboxResource The updated conversation
     */
    public function updateConversation(string $conversationId, array $parameters): InboxResource
    {
        $payload = Payload::update('v1/inbox/conversations', $conversationId, $parameters);
        $result = $this->transporter->request($payload);

        return $this->createResource('inbox', $result);
    }

    /**
     * Send a reply to an existing conversation.
     *
     * @param string $conversationId The conversation ID
     * @param array{
     *     body?: string,
     *     html?: string
     * } $parameters Reply parameters
     *
     * @return Resource The reply response
     */
    public function reply(string $conversationId, array $parameters): Resource
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::POST,
            ResourceUri::withAction('v1/inbox/conversations', $conversationId, 'replies'),
            $parameters
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('inbox', $result);
    }

    /**
     * Retrieve aggregate inbox statistics.
     */
    public function stats(): Resource
    {
        $payload = new Payload(
            ContentType::JSON,
            Method::GET,
            ResourceUri::list('v1/inbox/stats')
        );
        $result = $this->transporter->request($payload);

        return $this->createResource('inbox', $result);
    }
}
