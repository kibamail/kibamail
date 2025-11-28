<?php

use GuzzleHttp\Client as GuzzleClient;
use Kibamail\Client;
use Kibamail\Transporters\HttpTransporter;
use Kibamail\ValueObjects\ApiKey;
use Kibamail\ValueObjects\Transporter\BaseUri;
use Kibamail\ValueObjects\Transporter\Headers;

class Kibamail
{
    /**
     * The current SDK version.
     */
    public const VERSION = '0.1.0';

    /**
     * Creates a new Kibamail Client with the given API key.
     */
    public static function client(string $apiKey): Client
    {
        $apiKey = ApiKey::from($apiKey);
        $baseUri = BaseUri::from(getenv('KIBAMAIL_BASE_URL') ?: 'api.kibamail.com');
        $headers = Headers::withAuthorization($apiKey);

        $client = new GuzzleClient();
        $transporter = new HttpTransporter($client, $baseUri, $headers);

        return new Client($transporter);
    }
}
