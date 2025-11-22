<?php

use Kibamail\Collection;
use Kibamail\Topic;

it('can create a topic', function () {
    $client = createClient();

    $result = $client->topics->create([
        'name' => 'Product Updates',
        'description' => 'Latest product news',
        'visibility' => 'PUBLIC',
        'defaultOptIn' => true,
    ]);

    expect($result)->toBeInstanceOf(Topic::class)
        ->and($result->id)->not()->toBeNull();
});

it('can list topics', function () {
    $client = createClient();

    $result = $client->topics->list();

    expect($result)->toBeInstanceOf(Collection::class)
        ->and($result->data())->toBeArray();
});

it('can get a topic', function () {
    $client = createClient();

    $topic = $client->topics->create([
        'name' => 'Newsletter',
    ]);

    $result = $client->topics->get($topic->id);

    expect($result)->toBeInstanceOf(Topic::class)
        ->and($result->id)->toBe($topic->id);
});

it('can update a topic', function () {
    $client = createClient();

    $topic = $client->topics->create([
        'name' => 'Original Name',
    ]);

    $result = $client->topics->update($topic->id, [
        'name' => 'Updated Name',
    ]);

    expect($result)->toBeInstanceOf(Topic::class);
});

it('can delete a topic', function () {
    $client = createClient();

    $topic = $client->topics->create([
        'name' => 'To Delete',
    ]);

    $result = $client->topics->delete($topic->id);

    expect($result)->toBeInstanceOf(Topic::class);
});
