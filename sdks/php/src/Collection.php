<?php

namespace Kibamail;

class Collection extends Resource
{
    /**
     * Get the data items.
     */
    public function data(): array
    {
        return $this->getAttribute('data') ?? [];
    }

    /**
     * Check if there are more items.
     */
    public function hasMore(): bool
    {
        return $this->getAttribute('hasMore') ?? false;
    }

    /**
     * Check if there are previous items.
     */
    public function hasPrevious(): bool
    {
        return $this->getAttribute('hasPrevious') ?? false;
    }
}
