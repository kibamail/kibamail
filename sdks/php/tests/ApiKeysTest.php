<?php

use Kibamail\ApiKey;
use Kibamail\Collection;

it('can create an api key', function () {
    $client = createClient();

    $result = $client->apiKeys->create([
        'name' => 'Production Key',
        'scopes' => ['read:contacts', 'write:contacts'],
    ]);

    expect($result)->toBeInstanceOf(ApiKey::class)
        ->and($result->key)->not()->toBeNull()
        ->and($result->id)->not()->toBeNull();
});

it('can list api keys', function () {
    $client = createClient();

    $result = $client->apiKeys->list();

    expect($result)->toBeInstanceOf(Collection::class)
        ->and($result->data())->toBeArray();
});

it('can delete an api key', function () {
    $client = createClient();

    $apiKey = $client->apiKeys->create([
        'name' => 'Key to Delete',
        'scopes' => ['read:contacts'],
    ]);

    $result = $client->apiKeys->delete($apiKey->id);

    expect($result)->toBeInstanceOf(ApiKey::class);
});
