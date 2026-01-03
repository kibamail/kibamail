<?php

use Kibamail\Collection;
use Kibamail\Form;

it('can create a form', function () {
    $client = createClient();

    $result = $client->forms->create([
        'name' => 'Newsletter Signup',
        'description' => 'Subscribe to our newsletter',
    ]);

    expect($result)->toBeInstanceOf(Form::class)
        ->and($result->id)->not()->toBeNull();
});

it('can list forms', function () {
    $client = createClient();

    $result = $client->forms->list();

    expect($result)->toBeInstanceOf(Collection::class)
        ->and($result->data())->toBeArray();
});

it('can get a form', function () {
    $client = createClient();

    $form = $client->forms->create([
        'name' => 'Contact Form',
    ]);

    $result = $client->forms->get($form->id);

    expect($result)->toBeInstanceOf(Form::class)
        ->and($result->id)->toBe($form->id);
});

it('can update a form', function () {
    $client = createClient();

    $form = $client->forms->create([
        'name' => 'Original Form',
    ]);

    $result = $client->forms->update($form->id, [
        'name' => 'Updated Form',
    ]);

    expect($result)->toBeInstanceOf(Form::class);
});

it('can delete a form', function () {
    $client = createClient();

    $form = $client->forms->create([
        'name' => 'Form to Delete',
    ]);

    $result = $client->forms->delete($form->id);

    expect($result)->toBeInstanceOf(Form::class);
});
