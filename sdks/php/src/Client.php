<?php

namespace Kibamail;

use Kibamail\Contracts\Client as ClientContract;
use Kibamail\Contracts\Transporter;
use Kibamail\Service\ServiceFactory;

/**
 * Client used to send requests to the Kibamail API.
 *
 * @property Service\Contacts $contacts
 * @property Service\Topics $topics
 * @property Service\Segments $segments
 * @property Service\Forms $forms
 * @property Service\ApiKeys $apiKeys
 * @property Service\ContactProperties $contactProperties
 * @property Service\Emails $emails
 * @property Service\Domains $domains
 * @property Service\Broadcasts $broadcasts
 * @property Service\Automations $automations
 * @property Service\Events $events
 * @property Service\Inbox $inbox
 * @property Service\MarketingEmails $marketingEmails
 */
class Client implements ClientContract
{
    /**
     * The service factory instance.
     */
    private ServiceFactory $serviceFactory;

    /**
     * Create a new Client instance with the given transporter.
     */
    public function __construct(
        private readonly Transporter $transporter
    ) {
        //
    }

    /**
     * Magic method to retrieve a service by name.
     */
    public function __get(string $name)
    {
        return $this->getService($name);
    }

    /**
     * Magic method to retrieve a service by name.
     */
    public function __call(string $name, array $arguments)
    {
        return $this->getService($name);
    }

    /**
     * Attach the given API service to the client.
     */
    private function getService(string $name)
    {
        if (! isset($this->serviceFactory)) {
            $this->serviceFactory = new ServiceFactory($this->transporter);
        }

        return $this->serviceFactory->getService($name);
    }
}
