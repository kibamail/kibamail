# Kibamail PHP SDK

Official PHP SDK for the [Kibamail API](https://kibamail.com).

## Installation

```bash
composer require kibamail/kibamail
```

## Requirements

- PHP 8.1 or higher
- Composer

## Usage

### Initialize the client

```php
<?php

use Kibamail;

$client = Kibamail::client('kb_your_api_key_here');
```

### List contacts

```php
$contacts = $client->contacts->list();

foreach ($contacts->data() as $contact) {
    echo $contact->email . PHP_EOL;
}
```

### Create a contact

```php
$contact = $client->contacts->create([
    'email' => 'john.doe@example.com',
    'firstName' => 'John',
    'lastName' => 'Doe',
    'properties' => [
        'Company' => 'Acme Inc',
    ],
]);

echo "Contact created: {$contact->id}" . PHP_EOL;
```

### Get a contact

```php
$contact = $client->contacts->get('contact_123');

echo "Email: {$contact->email}" . PHP_EOL;
```

### Update a contact

```php
$contact = $client->contacts->update('contact_123', [
    'firstName' => 'Jane',
]);
```

### Delete a contact

```php
$client->contacts->delete('contact_123');
```

### Search contacts

```php
$results = $client->contacts->search([
    'conditions' => [
        '$and' => [
            ['field' => 'status', 'operator' => 'eq', 'value' => 'SUBSCRIBED'],
        ],
    ],
]);
```

## Available Resources

The SDK provides access to the following resources:

### Contacts

```php
$client->contacts->create($parameters);
$client->contacts->list($options);
$client->contacts->get($id);
$client->contacts->update($id, $parameters);
$client->contacts->delete($id);
$client->contacts->search($parameters);
```

### Topics

```php
$client->topics->create($parameters);
$client->topics->list($options);
$client->topics->get($id);
$client->topics->update($id, $parameters);
$client->topics->delete($id);
```

### Segments

```php
$client->segments->create($parameters);
$client->segments->list($options);
$client->segments->get($id);
$client->segments->update($id, $parameters);
$client->segments->delete($id);
```

### Forms

```php
$client->forms->create($parameters);
$client->forms->list($options);
$client->forms->get($id);
$client->forms->update($id, $parameters);
$client->forms->delete($id);
```

### API Keys

```php
$client->apiKeys->create($parameters);
$client->apiKeys->list($options);
$client->apiKeys->delete($id);
```

### Contact Properties

```php
$client->contactProperties->create($parameters);
$client->contactProperties->list($options);
$client->contactProperties->get($id);
$client->contactProperties->update($id, $parameters);
$client->contactProperties->delete($id);
```

## Error Handling

The SDK throws exceptions for API errors:

```php
use Kibamail\Exceptions\ErrorException;

try {
    $contact = $client->contacts->create([
        'email' => 'invalid-email',
    ]);
} catch (ErrorException $e) {
    echo "Error: {$e->getMessage()}" . PHP_EOL;
    echo "Type: {$e->getErrorType()}" . PHP_EOL;
    echo "Code: {$e->getErrorCode()}" . PHP_EOL;
    echo "Request ID: {$e->getRequestId()}" . PHP_EOL;
}
```

## Development

This package is part of the Kibamail monorepo.

### Testing

The SDK uses integration tests with a Prism mock server:

```bash
# Run tests (automatically starts test infrastructure)
composer test

# With coverage
composer test:coverage
```

### From Monorepo Root

```bash
# Start test infrastructure
make test-sdk-infra-start

# Run all SDK tests
make test-all-sdks

# Stop test infrastructure
make test-sdk-infra-stop
```

## License

MIT
