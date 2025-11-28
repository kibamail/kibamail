<?php

namespace Kibamail\ValueObjects;

class ResourceUri
{
    /**
     * Create a new Resource URI instance.
     */
    private function __construct(
        private readonly string $uri
    ) {
        //
    }

    /**
     * Create a URI for listing resources.
     */
    public static function list(string $resource): self
    {
        return new self("/{$resource}");
    }

    /**
     * Create a URI for getting a resource.
     */
    public static function get(string $resource, string $id): self
    {
        return new self("/{$resource}/{$id}");
    }

    /**
     * Create a URI for creating a resource.
     */
    public static function create(string $resource): self
    {
        return new self("/{$resource}");
    }

    /**
     * Create a URI for updating a resource.
     */
    public static function update(string $resource, string $id): self
    {
        return new self("/{$resource}/{$id}");
    }

    /**
     * Create a URI for deleting a resource.
     */
    public static function delete(string $resource, string $id): self
    {
        return new self("/{$resource}/{$id}");
    }

    /**
     * Create a URI with a custom action.
     */
    public static function withAction(string $resource, string $id, string $action): self
    {
        return new self("/{$resource}/{$id}/{$action}");
    }

    /**
     * Create a URI for searching resources.
     */
    public static function search(string $resource): self
    {
        return new self("/{$resource}/search");
    }

    /**
     * Get the URI as a string.
     */
    public function toString(): string
    {
        return $this->uri;
    }

    /**
     * Get the URI as a string.
     */
    public function __toString(): string
    {
        return $this->toString();
    }
}
