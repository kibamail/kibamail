<?php

namespace Kibamail\ValueObjects;

class ApiKey
{
    /**
     * Create a new API Key instance.
     */
    private function __construct(
        private readonly string $apiKey
    ) {
        //
    }

    /**
     * Create a new API Key from a string.
     */
    public static function from(string $apiKey): self
    {
        return new self($apiKey);
    }

    /**
     * Get the API key as a string.
     */
    public function toString(): string
    {
        return $this->apiKey;
    }

    /**
     * Get the API key as a string.
     */
    public function __toString(): string
    {
        return $this->toString();
    }
}
