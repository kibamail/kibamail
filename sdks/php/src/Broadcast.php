<?php

namespace Kibamail;

/**
 * Represents a broadcast (campaign) in Kibamail.
 *
 * @property-read string $id The unique identifier for the broadcast
 * @property-read string $name The broadcast name
 * @property-read string $status The broadcast status
 * @property-read array|null $emailContent The email content configuration
 * @property-read string|null $from The sender address
 * @property-read string|null $replyTo The reply-to address
 * @property-read string|null $segmentId The target segment ID
 * @property-read string|null $topicId The associated topic ID
 * @property-read string|null $sendAt When the broadcast is scheduled to send
 * @property-read string $createdAt When the broadcast was created
 */
class Broadcast extends Resource
{
    //
}
