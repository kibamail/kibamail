<?php

namespace Kibamail\Service;

use Kibamail\ApiKey;
use Kibamail\Automation;
use Kibamail\Broadcast;
use Kibamail\Collection;
use Kibamail\Contact;
use Kibamail\ContactProperty;
use Kibamail\Contracts\Transporter;
use Kibamail\Domain;
use Kibamail\Email;
use Kibamail\Event;
use Kibamail\Form;
use Kibamail\MarketingEmail;
use Kibamail\Resource;
use Kibamail\Segment;
use Kibamail\Topic;

abstract class Service
{
    /**
     * @var array<string, class-string<\Kibamail\Resource>>
     */
    protected array $mapping = [
        'contacts' => Contact::class,
        'topics' => Topic::class,
        'segments' => Segment::class,
        'forms' => Form::class,
        'api-keys' => ApiKey::class,
        'contact-properties' => ContactProperty::class,
        'emails' => Email::class,
        'domains' => Domain::class,
        'broadcasts' => Broadcast::class,
        'automations' => Automation::class,
        'events' => Event::class,
        'marketing-emails' => MarketingEmail::class,
    ];

    /**
     * Create a service instance with the given transporter.
     */
    public function __construct(
        protected readonly Transporter $transporter
    ) {
        //
    }

    /**
     * Create a new resource for the given type with the given attributes.
     */
    protected function createResource(string $resourceType, array $attributes): Resource
    {
        $class = $this->mapping[$resourceType] ?? Resource::class;

        if (isset($attributes['data']) && is_array($attributes['data'])) {
            foreach ($attributes['data'] as $key => $value) {
                $attributes['data'][$key] = $class::from($value);
            }

            return Collection::from($attributes);
        }

        return $class::from($attributes);
    }
}
