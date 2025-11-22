<?php

namespace Kibamail;

use BadMethodCallException;
use Kibamail\Contracts\Resource as ResourceContract;

class Resource implements ResourceContract
{
    /**
     * The resource's attributes.
     */
    protected array $attributes = [];

    /**
     * Create a new Resource instance.
     */
    public function __construct(array $attributes = [])
    {
        $this->fill($attributes);
    }

    /**
     * Create a new resource from the given attributes.
     */
    public static function from(array $attributes): static
    {
        return new static($attributes);
    }

    /**
     * Fill the resource with an array of attributes.
     */
    protected function fill(array $attributes): void
    {
        foreach ($attributes as $key => $value) {
            $this->attributes[$key] = $value;
        }
    }

    /**
     * Get an attribute by name.
     */
    public function getAttribute(string $name): mixed
    {
        return $this->attributes[$name] ?? null;
    }

    /**
     * Get all attributes for the resource.
     */
    public function getAttributes(): array
    {
        return $this->attributes;
    }

    /**
     * Convert the resource instance into an array.
     */
    public function toArray(): array
    {
        return $this->getAttributes();
    }

    /**
     * Convert the resource instance into JSON.
     */
    public function toJson(int $options = 0): string
    {
        return json_encode($this->jsonSerialize(), $options);
    }

    /**
     * Convert the object into something JSON serializable.
     */
    public function jsonSerialize(): mixed
    {
        return $this->toArray();
    }

    /**
     * Dynamically retrieve attributes on the resource.
     */
    public function __get(string $name): mixed
    {
        return $this->getAttribute($name);
    }

    /**
     * Get all the attributes when dumping the resource.
     */
    public function __debugInfo(): array
    {
        return $this->getAttributes();
    }

    /**
     * {@inheritdoc}
     */
    public function offsetExists(mixed $offset): bool
    {
        return ! is_null($this->getAttribute($offset));
    }

    /**
     * {@inheritdoc}
     */
    public function offsetGet(mixed $offset): mixed
    {
        return $this->getAttribute($offset);
    }

    /**
     * {@inheritdoc}
     */
    public function offsetSet(mixed $offset, mixed $value): void
    {
        throw new BadMethodCallException('Cannot set resource attributes.');
    }

    /**
     * {@inheritdoc}
     */
    public function offsetUnset(mixed $offset): void
    {
        throw new BadMethodCallException('Cannot unset resource attributes.');
    }
}
