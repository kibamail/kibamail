<?php

namespace Kibamail\Exceptions;

use Exception;

class ErrorException extends Exception
{
    /**
     * The error details from the API.
     */
    private array $error;

    /**
     * Create a new Error Exception instance.
     */
    public function __construct(array $error)
    {
        $this->error = $error;

        $message = $error['message'] ?? 'An error occurred';
        $code = isset($error['code']) && is_numeric($error['code']) ? (int) $error['code'] : 0;

        parent::__construct($message, $code);
    }

    /**
     * Get the error details.
     */
    public function getError(): array
    {
        return $this->error;
    }

    /**
     * Get the error type.
     */
    public function getErrorType(): ?string
    {
        return $this->error['type'] ?? null;
    }

    /**
     * Get the error code.
     */
    public function getErrorCode(): ?string
    {
        return $this->error['code'] ?? null;
    }

    /**
     * Get the request ID.
     */
    public function getRequestId(): ?string
    {
        return $this->error['requestId'] ?? null;
    }
}
