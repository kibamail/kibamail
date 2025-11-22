<?php

namespace Kibamail\Exceptions;

use Exception;

class TransporterException extends Exception
{
    /**
     * Create a new Transporter Exception instance.
     */
    public function __construct(\Throwable $exception)
    {
        parent::__construct($exception->getMessage(), 0, $exception);
    }
}
