<?php

namespace Kibamail;

/**
 * Represents a custom contact property in Kibamail.
 *
 * @property-read string $id The unique identifier for the property
 * @property-read string $name The property name (used as the key)
 * @property-read string $type The property type ('text', 'number', 'date', 'boolean', etc.)
 * @property-read string|null $defaultValue The default value for this property
 * @property-read string $createdAt When the property was created
 * @property-read string $updatedAt When the property was last updated
 */
class ContactProperty extends Resource
{
    //
}
