/**
 * ACME Certificate Tool
 *
 * Provides functionality for obtaining SSL certificates from Let's Encrypt
 * using the ACME protocol.
 *
 * Features:
 * - CSR generation
 * - HTTP-01 challenge handling
 * - Certificate issuance
 */

import * as acme from "acme-client";
import { env } from "@/env/schema";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ module: "acme-certificate-tool" });

/**
 * ACME client wrapper for Let's Encrypt certificate provisioning
 */
export class AcmeCertificateTool {
  private accountKey: Buffer | string | null = null;
  private domain: string | null = null;

  /**
   * Set the domain for certificate operations
   */
  forDomain(domain: string): this {
    this.domain = domain;
    logger.debug({ domain }, "ACME tool configured for domain");
    return this;
  }

  /**
   * Set the ACME account key
   */
  setAccountKey(accountKey: Buffer | string): this {
    this.accountKey = accountKey;
    return this;
  }

  /**
   * Get the ACME client instance
   */
  client(): acme.Client {
    if (!this.accountKey) {
      throw new Error("Account key not set. Call setAccountKey() first.");
    }

    logger.debug(
      { directoryUrl: env.ACME_DIRECTORY_URL },
      "Creating ACME client"
    );

    return new acme.Client({
      directoryUrl: env.ACME_DIRECTORY_URL,
      accountKey: this.accountKey,
    });
  }

  /**
   * Create a Certificate Signing Request (CSR)
   *
   * @returns Tuple of [privateKey, csr]
   */
  async createCsr(): Promise<[Buffer, Buffer]> {
    if (!this.domain) {
      throw new Error("Domain not set. Call forDomain() first.");
    }

    logger.info(
      { domain: this.domain },
      "Creating Certificate Signing Request (CSR)"
    );
    const result = await acme.forge.createCsr({
      commonName: this.domain,
    });
    logger.info({ domain: this.domain }, "CSR created successfully");
    return result;
  }

  /**
   * Issue a certificate for the configured domain
   *
   * This handles the full ACME flow:
   * 1. Creates a CSR
   * 2. Initiates the ACME order with HTTP-01 challenge validation
   * 3. Returns the issued certificate
   *
   * @param onChallengeCreate - Called when the challenge needs to be served
   * @param onChallengeRemove - Called when the challenge can be removed
   * @returns Object containing the certificate and private key
   */
  async issueCertificate(
    onChallengeCreate: (
      token: string,
      keyAuthorization: string
    ) => Promise<void>,
    onChallengeRemove: (token: string) => Promise<void>
  ): Promise<{
    certificate: string;
    privateKey: Buffer;
  }> {
    const startTime = Date.now();

    if (!this.domain) {
      throw new Error("Domain not set. Call forDomain() first.");
    }

    if (!this.accountKey) {
      throw new Error("Account key not set. Call setAccountKey() first.");
    }

    logger.info(
      { domain: this.domain, directoryUrl: env.ACME_DIRECTORY_URL },
      "Starting ACME certificate issuance process"
    );

    logger.info({ domain: this.domain }, "Step 1/3: Creating CSR");
    const [privateKey, csr] = await this.createCsr();

    logger.info(
      { domain: this.domain },
      "Step 2/3: Initiating ACME order with HTTP-01 challenge"
    );

    let challengeCount = 0;
    const certificate = await this.client().auto({
      csr,
      termsOfServiceAgreed: true,
      skipChallengeVerification: true,
      email: env.ACME_CONTACT_EMAIL,
      challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        challengeCount++;
        logger.info(
          {
            domain: this.domain,
            challengeType: challenge.type,
            tokenPrefix: challenge.token.slice(0, 8),
            identifier: authz.identifier.value,
          },
          "HTTP-01 challenge received - storing challenge token"
        );
        await onChallengeCreate(challenge.token, keyAuthorization);
        logger.info(
          {
            domain: this.domain,
            tokenPrefix: challenge.token.slice(0, 8),
          },
          "Challenge token stored - waiting for Let's Encrypt validation"
        );
      },
      challengeRemoveFn: async (authz, challenge, _keyAuthorization) => {
        logger.info(
          {
            domain: this.domain,
            tokenPrefix: challenge.token.slice(0, 8),
            identifier: authz.identifier.value,
          },
          "Challenge completed - removing challenge token"
        );
        await onChallengeRemove(challenge.token);
      },
    });

    const durationMs = Date.now() - startTime;
    logger.info(
      {
        domain: this.domain,
        durationMs,
        durationSec: Math.round(durationMs / 1000),
        challengeCount,
        certificateLength: certificate.length,
      },
      "Step 3/3: Certificate issued successfully"
    );

    return {
      certificate,
      privateKey,
    };
  }
}

/**
 * Create a new ACME certificate tool instance
 */
export function createAcmeTool(): AcmeCertificateTool {
  return new AcmeCertificateTool();
}
