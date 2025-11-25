<?php

use Kibamail\Collection;
use Kibamail\Contact;

it('can create a contact', function () {
    $client = createClient();

    $result = $client->contacts->create([
        'email' => 'john.doe@example.com',
        'firstName' => 'John',
        'lastName' => 'Doe',
    ]);

    expect($result)->toBeInstanceOf(Contact::class)
        ->and($result->id)->not()->toBeNull();
});

it('can list contacts', function () {
    $client = createClient();

    $result = $client->contacts->list();

    expect($result)->toBeInstanceOf(Collection::class)
        ->and($result->data())->toBeArray();
});

it('can get a contact', function () {
    $client = createClient();

    // First create a contact
    $contact = $client->contacts->create([
        'email' => 'jane.doe@example.com',
    ]);

    // Then retrieve it
    $result = $client->contacts->get($contact->id);

    expect($result)->toBeInstanceOf(Contact::class)
        ->and($result->id)->toBe($contact->id);
});

it('can update a contact', function () {
    $client = createClient();

    // First create a contact
    $contact = $client->contacts->create([
        'email' => 'update.test@example.com',
    ]);

    // Then update it
    $result = $client->contacts->update($contact->id, [
        'firstName' => 'Updated',
    ]);

    expect($result)->toBeInstanceOf(Contact::class)
        ->and($result->id)->toBe($contact->id);
});

it('can delete a contact', function () {
    $client = createClient();

    // First create a contact
    $contact = $client->contacts->create([
        'email' => 'delete.test@example.com',
    ]);

    // Then delete it
    $result = $client->contacts->delete($contact->id);

    expect($result)->toBeInstanceOf(Contact::class);
});

it('can search contacts', function () {
    $client = createClient();

    $result = $client->contacts->search([
        'conditions' => [
            '$and' => [
                ['field' => 'status', 'operator' => 'eq', 'value' => 'SUBSCRIBED'],
            ],
        ],
    ]);

    expect($result)->toBeInstanceOf(Collection::class)
        ->and($result->data())->toBeArray();
});
