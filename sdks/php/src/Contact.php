<?php

namespace Kibamail;

/**
 * Represents a contact in Kibamail.
 *
 * @property-read string $id The unique identifier for the contact
 * @property-read string $email The contact's email address
 * @property-read string|null $firstName The contact's first name
 * @property-read string|null $lastName The contact's last name
 * @property-read string|null $phone The contact's phone number
 * @property-read string|null $country The contact's country
 * @property-read string|null $timezone The contact's timezone
 * @property-read string|null $city The contact's city
 * @property-read string $status The contact's subscription status
 * @property-read string|null $subscribedAt When the contact subscribed
 * @property-read string|null $unsubscribedAt When the contact unsubscribed
 * @property-read array<string, mixed> $properties Custom properties for the contact
 * @property-read string $createdAt When the contact was created
 * @property-read string $updatedAt When the contact was last updated
 */
class Contact extends Resource
{
    //
}
