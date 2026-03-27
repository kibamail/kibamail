<?php

namespace Kibamail;

/**
 * Represents a transactional email in Kibamail.
 *
 * @property-read string $id The unique identifier for the email
 * @property-read string $sendingId The sending identifier for tracking
 * @property-read array|null $from The sender address object
 * @property-read string|array $to The recipient email address(es)
 * @property-read string $subject The email subject line
 * @property-read string $status The delivery status of the email
 * @property-read int $openCount The number of times the email was opened
 * @property-read int $clickCount The number of times links were clicked
 * @property-read string $createdAt When the email was created
 * @property-read string|null $sentAt When the email was sent
 * @property-read string|null $deliveredAt When the email was delivered
 * @property-read string|null $bouncedAt When the email bounced
 * @property-read array|null $metadata Custom metadata attached to the email
 */
class Email extends Resource
{
    //
}
