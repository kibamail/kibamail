<?php

namespace Kibamail\Exceptions;

use Exception;
use JsonException;

class UnserializableResponse extends Exception
{
    /**
     * Create a new Unserializable Response Exception instance.
     */
    public function __construct(
        JsonException $exception,
        private readonly ?string $contents = null
    ) {
        parent::__construct($exception->getMessage(), 0, $exception);
    }

    /**
     * Get the response contents.
     */
    public function getContents(): ?string
    {
        return $this->contents;
    }
}
