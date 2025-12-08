<?php

namespace Kibamail;

/**
 * Represents an API key in Kibamail.
 *
 * @property-read string $id The unique identifier for the API key
 * @property-read string $name The API key name
 * @property-read string|null $key The API key value (only returned on creation)
 * @property-read string $createdAt When the API key was created
 */
class ApiKey extends Resource
{
    //
}
