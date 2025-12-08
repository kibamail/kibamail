<?php

namespace Kibamail;

/**
 * Represents a topic (subscription category) in Kibamail.
 *
 * @property-read string $id The unique identifier for the topic
 * @property-read string $name The topic name
 * @property-read string|null $description The topic description
 * @property-read string $visibility The topic visibility ('public' or 'private')
 * @property-read bool $defaultOptIn Whether contacts are opted in by default
 * @property-read string $createdAt When the topic was created
 * @property-read string $updatedAt When the topic was last updated
 */
class Topic extends Resource
{
    //
}
