<?php

namespace Kibamail\ValueObjects\Transporter;

use GuzzleHttp\Psr7\Request;
use InvalidArgumentException;
use Kibamail;
use Kibamail\Enums\Transporter\ContentType;
use Kibamail\Enums\Transporter\Method;
use Kibamail\ValueObjects\ResourceUri;
use Psr\Http\Message\RequestInterface;

final class Payload
{
    /**
     * Create a new Transporter Payload instance.
     */
    public function __construct(
        private readonly ContentType $contentType,
        private readonly Method $method,
        private readonly ResourceUri $uri,
        private readonly array $parameters = []
    ) {
        //
    }

    /**
     * Create a payload for listing resources.
     */
    public static function list(string $resource, array $options = []): self
    {
        $searchParams = [];

        if (array_key_exists('limit', $options)) {
            $searchParams['limit'] = $options['limit'];
        }

        if (array_key_exists('after', $options)) {
            $searchParams['after'] = $options['after'];
        }

        if (array_key_exists('before', $options)) {
            $searchParams['before'] = $options['before'];
        }

        $uri = ResourceUri::list(
            ! empty($searchParams) ? $resource . '?' . http_build_query($searchParams) : $resource
        );

        return new self(ContentType::JSON, Method::GET, $uri);
    }

    /**
     * Create a payload for getting a resource.
     */
    public static function get(string $resource, string $id): self
    {
        if (trim($id) === '') {
            throw new InvalidArgumentException("The {$resource} ID must be a non-empty string.");
        }

        return new self(ContentType::JSON, Method::GET, ResourceUri::get($resource, $id));
    }

    /**
     * Create a payload for creating a resource.
     */
    public static function create(string $resource, array $parameters): self
    {
        return new self(ContentType::JSON, Method::POST, ResourceUri::create($resource), $parameters);
    }

    /**
     * Create a payload for updating a resource.
     */
    public static function update(string $resource, string $id, array $parameters): self
    {
        return new self(ContentType::JSON, Method::PUT, ResourceUri::update($resource, $id), $parameters);
    }

    /**
     * Create a payload for deleting a resource.
     */
    public static function delete(string $resource, string $id): self
    {
        return new self(ContentType::JSON, Method::DELETE, ResourceUri::delete($resource, $id));
    }

    /**
     * Create a payload for searching resources.
     */
    public static function search(string $resource, array $parameters): self
    {
        return new self(ContentType::JSON, Method::POST, ResourceUri::search($resource), $parameters);
    }

    /**
     * Create a payload for a multipart file upload.
     */
    public static function multipart(string $resource, array $parameters): self
    {
        return new self(ContentType::MULTIPART, Method::POST, ResourceUri::create($resource), $parameters);
    }

    /**
     * Create a PSR-7 Request instance.
     */
    public function toRequest(BaseUri $baseUri, Headers $headers): RequestInterface
    {
        $body = null;
        $uri = $baseUri->toString() . $this->uri->toString();

        if ($this->contentType === ContentType::MULTIPART) {
            $boundary = bin2hex(random_bytes(16));

            $headers = $headers
                ->withUserAgent('kibamail-php', Kibamail::VERSION)
                ->with('Content-Type', "multipart/form-data; boundary={$boundary}");

            $body = $this->buildMultipartBody($boundary);

            return new Request($this->method->value, $uri, $headers->toArray(), $body);
        }

        $headers = $headers
            ->withUserAgent('kibamail-php', Kibamail::VERSION)
            ->withContentType($this->contentType);

        if (in_array($this->method, [Method::POST, Method::PATCH, Method::PUT], true)) {
            $body = json_encode(
                $this->parameters === [] || ! array_is_list($this->parameters)
                    ? (object) $this->parameters
                    : $this->parameters,
                JSON_THROW_ON_ERROR
            );
        }

        return new Request($this->method->value, $uri, $headers->toArray(), $body);
    }

    /**
     * Build a multipart/form-data body string.
     */
    private function buildMultipartBody(string $boundary): string
    {
        $body = '';

        foreach ($this->parameters as $name => $value) {
            if (is_array($value)) {
                foreach ($value as $item) {
                    $body .= "--{$boundary}\r\n";
                    $body .= "Content-Disposition: form-data; name=\"{$name}\"\r\n\r\n";
                    $body .= "{$item}\r\n";
                }
            } else {
                $body .= "--{$boundary}\r\n";
                $body .= "Content-Disposition: form-data; name=\"{$name}\"\r\n\r\n";
                $body .= "{$value}\r\n";
            }
        }

        $body .= "--{$boundary}--\r\n";

        return $body;
    }
}
