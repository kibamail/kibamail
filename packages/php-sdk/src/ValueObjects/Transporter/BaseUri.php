<?php

namespace Kibamail\ValueObjects\Transporter;

class BaseUri
{
    /**
     * Create a new Base URI instance.
     */
    private function __construct(
        private readonly string $baseUri
    ) {
        //
    }

    /**
     * Create a new Base URI from a string.
     */
    public static function from(string $baseUri): self
    {
        return new self($baseUri);
    }

    /**
     * Get the base URI as a string.
     */
    public function toString(): string
    {
        $uri = $this->baseUri;

        if (! str_starts_with($uri, 'http://') && ! str_starts_with($uri, 'https://')) {
            $uri = "https://{$uri}";
        }

        return rtrim($uri, '/');
    }

    /**
     * Get the base URI as a string.
     */
    public function __toString(): string
    {
        return $this->toString();
    }
}
