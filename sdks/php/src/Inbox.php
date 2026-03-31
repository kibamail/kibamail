<?php

namespace Kibamail;

/**
 * Represents an inbox conversation in Kibamail.
 *
 * @property-read string $id The unique identifier for the conversation
 * @property-read string $status The conversation status
 * @property-read string|null $subject The conversation subject
 * @property-read array|null $messages The conversation messages
 * @property-read string|null $contactId The associated contact ID
 * @property-read string $createdAt When the conversation was created
 * @property-read string $updatedAt When the conversation was last updated
 */
class Inbox extends Resource
{
    //
}
