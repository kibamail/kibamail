<?php

namespace Kibamail;

/**
 * Represents an automation in Kibamail.
 *
 * @property-read string $id The unique identifier for the automation
 * @property-read string $name The automation name
 * @property-read string|null $description The automation description
 * @property-read string $status The automation status (DRAFT, PUBLISHED, ARCHIVED)
 * @property-read int $version The automation version number
 * @property-read string|null $triggerType The type of trigger for this automation
 * @property-read array|null $trigger The trigger configuration
 * @property-read array $nodes The workflow nodes
 * @property-read array $edges The workflow edges
 * @property-read string|null $publishedAt When the automation was published
 * @property-read string $createdAt When the automation was created
 */
class Automation extends Resource
{
    //
}
