<?php

use Kibamail\Client;
use Kibamail\Transporters\HttpTransporter;
use Kibamail\ValueObjects\ApiKey;
use Kibamail\ValueObjects\Transporter\BaseUri;
use Kibamail\ValueObjects\Transporter\Headers;

/**
 * Create a test client instance connected to the Prism mock server.
 */
function createClient(): Client
{
    $apiKey = ApiKey::from('kb_test_mock_api_key_12345');
    $baseUri = BaseUri::from(getenv('MOCK_API_URL') ?: 'http://localhost:4010');
    $headers = Headers::withAuthorization($apiKey);

    $httpClient = new \GuzzleHttp\Client();
    $transporter = new HttpTransporter($httpClient, $baseUri, $headers);

    return new Client($transporter);
}
