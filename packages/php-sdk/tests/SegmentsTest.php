<?php

use Kibamail\Collection;
use Kibamail\Segment;

it('can create a segment', function () {
    $client = createClient();

    $result = $client->segments->create([
        'name' => 'High Value Customers',
        'description' => 'Customers with high lifetime value',
        'conditions' => [
            '$and' => [
                ['field' => 'status', 'operator' => 'eq', 'value' => 'SUBSCRIBED'],
            ],
        ],
    ]);

    expect($result)->toBeInstanceOf(Segment::class)
        ->and($result->id)->not()->toBeNull();
});

it('can list segments', function () {
    $client = createClient();

    $result = $client->segments->list();

    expect($result)->toBeInstanceOf(Collection::class)
        ->and($result->data())->toBeArray();
});

it('can get a segment', function () {
    $client = createClient();

    $segment = $client->segments->create([
        'name' => 'Active Users',
        'conditions' => [
            '$and' => [
                ['field' => 'status', 'operator' => 'eq', 'value' => 'SUBSCRIBED'],
            ],
        ],
    ]);

    $result = $client->segments->get($segment->id);

    expect($result)->toBeInstanceOf(Segment::class)
        ->and($result->id)->toBe($segment->id);
});

it('can update a segment', function () {
    $client = createClient();

    $segment = $client->segments->create([
        'name' => 'Original Segment',
        'conditions' => [
            '$and' => [
                ['field' => 'status', 'operator' => 'eq', 'value' => 'SUBSCRIBED'],
            ],
        ],
    ]);

    $result = $client->segments->update($segment->id, [
        'name' => 'Updated Segment',
    ]);

    expect($result)->toBeInstanceOf(Segment::class);
});

it('can delete a segment', function () {
    $client = createClient();

    $segment = $client->segments->create([
        'name' => 'Segment to Delete',
        'conditions' => [
            '$and' => [
                ['field' => 'status', 'operator' => 'eq', 'value' => 'SUBSCRIBED'],
            ],
        ],
    ]);

    $result = $client->segments->delete($segment->id);

    expect($result)->toBeInstanceOf(Segment::class);
});
