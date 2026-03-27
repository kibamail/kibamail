<?php

namespace Kibamail;

/**
 * Represents a sending domain in Kibamail.
 *
 * @property-read string $id The unique identifier for the domain
 * @property-read string $name The domain name
 * @property-read bool $dkimVerified Whether DKIM is verified
 * @property-read bool $returnPathVerified Whether return path is verified
 * @property-read bool $trackingVerified Whether tracking is verified
 * @property-read bool $openTrackingEnabled Whether open tracking is enabled
 * @property-read bool $clickTrackingEnabled Whether click tracking is enabled
 * @property-read array|null $dnsRecords The DNS records for domain configuration
 * @property-read string $createdAt When the domain was created
 */
class Domain extends Resource
{
    //
}
