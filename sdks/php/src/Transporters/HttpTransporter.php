<?php

namespace Kibamail\Transporters;

use Closure;
use GuzzleHttp\Exception\ClientException;
use JsonException;
use Kibamail\Contracts\Transporter;
use Kibamail\Exceptions\ErrorException;
use Kibamail\Exceptions\TransporterException;
use Kibamail\Exceptions\UnserializableResponse;
use Kibamail\ValueObjects\Transporter\BaseUri;
use Kibamail\ValueObjects\Transporter\Headers;
use Kibamail\ValueObjects\Transporter\Payload;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\ResponseInterface;

class HttpTransporter implements Transporter
{
    /**
     * Create a new HTTP Transporter instance.
     */
    public function __construct(
        private readonly ClientInterface $client,
        private readonly BaseUri $baseUri,
        private readonly Headers $headers,
    ) {
        //
    }

    /**
     * Sends a request to the Kibamail API.
     *
     * @return array<array-key, mixed>
     *
     * @throws ErrorException|TransporterException|UnserializableResponse
     */
    public function request(Payload $payload): array
    {
        $request = $payload->toRequest($this->baseUri, $this->headers);

        $response = $this->sendRequest(fn () => $this->client->sendRequest($request));
        $contents = $response->getBody()->getContents();
        $contentType = $response->getHeaderLine('Content-Type');

        $this->throwIfJsonError($response, $contents);

        if (! str_contains($contentType, 'application/json')) {
            throw new UnserializableResponse(
                new JsonException(
                    "Unexpected Content-Type '{$contentType}'. Response body: " . substr($contents, 0, 200)
                ),
                $contents
            );
        }

        if (trim($contents) === '') {
            throw new UnserializableResponse(
                new JsonException('Empty response body'),
                $contents
            );
        }

        try {
            $data = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $jsonException) {
            throw new UnserializableResponse($jsonException, $contents);
        }

        return $data;
    }

    /**
     * Send the given request callable.
     */
    private function sendRequest(Closure $callable): ResponseInterface
    {
        try {
            return $callable();
        } catch (ClientExceptionInterface $clientException) {
            if ($clientException instanceof ClientException) {
                $this->throwIfJsonError(
                    $clientException->getResponse(),
                    $clientException->getResponse()->getBody()->getContents()
                );
            }

            throw new TransporterException($clientException);
        }
    }

    /**
     * Throw an exception if there is a JSON error.
     */
    protected function throwIfJsonError(ResponseInterface $response, string $contents): void
    {
        if ($response->getStatusCode() < 400) {
            return;
        }

        if (! str_contains($response->getHeaderLine('Content-Type'), 'application/json')) {
            return;
        }

        try {
            $response = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);

            if (isset($response['error']) && is_array($response['error'])) {
                throw new ErrorException($response['error']);
            }
        } catch (JsonException $jsonException) {
            throw new UnserializableResponse($jsonException, $contents);
        }
    }
}
