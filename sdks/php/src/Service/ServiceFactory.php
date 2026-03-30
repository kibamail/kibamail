<?php

namespace Kibamail\Service;

use Kibamail\Contracts\Transporter;

class ServiceFactory
{
    /**
     * A list of service classes.
     *
     * @var array<string, class-string<Service>>
     */
    private static array $classMap = [
        'contacts' => Contacts::class,
        'topics' => Topics::class,
        'segments' => Segments::class,
        'forms' => Forms::class,
        'apiKeys' => ApiKeys::class,
        'contactProperties' => ContactProperties::class,
        'emails' => Emails::class,
        'domains' => Domains::class,
        'broadcasts' => Broadcasts::class,
        'automations' => Automations::class,
        'events' => Events::class,
        'marketingEmails' => MarketingEmails::class,
    ];

    /**
     * A list of available services.
     *
     * @var array<string, Service>
     */
    private array $services = [];

    /**
     * Create a new Service Factory instance.
     */
    public function __construct(
        private readonly Transporter $transporter
    ) {
        //
    }

    /**
     * Get the given service by name.
     */
    public function getService(string $name): ?Service
    {
        $serviceClass = self::$classMap[$name] ?? null;

        if (! $serviceClass) {
            return null;
        }

        if (! array_key_exists($name, $this->services)) {
            $this->services[$name] = new $serviceClass($this->transporter);
        }

        return $this->services[$name];
    }
}
