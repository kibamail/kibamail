<?php

use Kibamail\Collection;
use Kibamail\ContactProperty;

it('can create a contact property', function () {
    $client = createClient();

    $result = $client->contactProperties->create([
        'name' => 'Company Size',
        'type' => 'NUMBER',
        'defaultValue' => '0',
    ]);

    expect($result)->toBeInstanceOf(ContactProperty::class)
        ->and($result->id)->not()->toBeNull();
});

it('can list contact properties', function () {
    $client = createClient();

    $result = $client->contactProperties->list();

    expect($result)->toBeInstanceOf(Collection::class)
        ->and($result->data())->toBeArray();
});

it('can get a contact property', function () {
    $client = createClient();

    $property = $client->contactProperties->create([
        'name' => 'Department',
        'type' => 'STRING',
    ]);

    $result = $client->contactProperties->get($property->id);

    expect($result)->toBeInstanceOf(ContactProperty::class)
        ->and($result->id)->toBe($property->id);
});

it('can update a contact property', function () {
    $client = createClient();

    $property = $client->contactProperties->create([
        'name' => 'Job Title',
        'type' => 'STRING',
    ]);

    $result = $client->contactProperties->update($property->id, [
        'defaultValue' => 'Employee',
    ]);

    expect($result)->toBeInstanceOf(ContactProperty::class);
});

it('can delete a contact property', function () {
    $client = createClient();

    $property = $client->contactProperties->create([
        'name' => 'Property to Delete',
        'type' => 'STRING',
    ]);

    $result = $client->contactProperties->delete($property->id);

    expect($result)->toBeInstanceOf(ContactProperty::class);
});
