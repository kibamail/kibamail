<?php

namespace Kibamail;

/**
 * Represents a segment (contact filter) in Kibamail.
 *
 * @property-read string $id The unique identifier for the segment
 * @property-read string $name The segment name
 * @property-read string|null $description The segment description
 * @property-read array $conditions The filter conditions for this segment
 * @property-read string $createdAt When the segment was created
 * @property-read string $updatedAt When the segment was last updated
 */
class Segment extends Resource
{
    //
}
