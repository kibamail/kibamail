<?php

namespace Kibamail\Contracts;

use ArrayAccess;
use JsonSerializable;

interface Resource extends ArrayAccess, JsonSerializable
{
    /**
     * Create a new resource from the given attributes.
     */
    public static function from(array $attributes): static;

    /**
     * Get an attribute by name.
     */
    public function getAttribute(string $name): mixed;

    /**
     * Get all attributes for the resource.
     */
    public function getAttributes(): array;

    /**
     * Convert the resource instance into an array.
     */
    public function toArray(): array;

    /**
     * Convert the resource instance into JSON.
     */
    public function toJson(int $options = 0): string;
}
