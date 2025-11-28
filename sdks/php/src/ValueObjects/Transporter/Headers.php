<?php

namespace Kibamail\ValueObjects\Transporter;

use Kibamail\Enums\Transporter\ContentType;
use Kibamail\ValueObjects\ApiKey;

class Headers
{
    /**
     * Create a new Headers instance.
     */
    private function __construct(
        private readonly array $headers
    ) {
        //
    }

    /**
     * Create headers with authorization.
     */
    public static function withAuthorization(ApiKey $apiKey): self
    {
        return new self([
            'Authorization' => "Bearer {$apiKey->toString()}",
        ]);
    }

    /**
     * Create headers from an array.
     */
    public static function from(array $headers): self
    {
        return new self($headers);
    }

    /**
     * Add a header to the headers.
     */
    public function with(string $name, string $value): self
    {
        return new self([
            ...$this->headers,
            $name => $value,
        ]);
    }

    /**
     * Add content type header.
     */
    public function withContentType(ContentType $contentType): self
    {
        return $this->with('Content-Type', $contentType->value);
    }

    /**
     * Add user agent header.
     */
    public function withUserAgent(string $identifier, string $version): self
    {
        return $this->with('User-Agent', "{$identifier}/{$version}");
    }

    /**
     * Merge with another Headers instance.
     */
    public function merge(Headers $headers): self
    {
        return new self([
            ...$this->headers,
            ...$headers->toArray(),
        ]);
    }

    /**
     * Get the headers as an array.
     */
    public function toArray(): array
    {
        return $this->headers;
    }
}
