<?php

namespace Kibamail;

/**
 * Represents a marketing email in Kibamail.
 *
 * @property-read string $id The unique identifier for the marketing email
 * @property-read string $name The marketing email name
 * @property-read string $subject The email subject line
 * @property-read string $status The marketing email status
 * @property-read array|null $emailContent The email content configuration
 * @property-read string|null $from The sender address
 * @property-read string|null $replyTo The reply-to address
 * @property-read string $createdAt When the marketing email was created
 * @property-read string|null $updatedAt When the marketing email was last updated
 */
class MarketingEmail extends Resource
{
    //
}
