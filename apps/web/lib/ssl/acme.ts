/**
 * ACME Certificate Tool
 *
 * Provides functionality for obtaining SSL certificates from Let's Encrypt
 * using the ACME protocol.
 *
 * Features:
 * - Account creation and management
 * - CSR generation
 * - HTTP-01 challenge handling
 * - Certificate issuance
 */

import * as acme from "acme-client";
import type { Account } from "acme-client/types/rfc8555";
import { env } from "@/env/schema";

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

    return new acme.Client({
      directoryUrl: env.ACME_DIRECTORY_URL,
      accountKey: this.accountKey,
    });
  }

  /**
   * Generate a new ACME account private key
   */
  async generateAccountKey(): Promise<Buffer> {
    return acme.forge.createPrivateKey();
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

    return acme.forge.createCsr({
      commonName: this.domain,
    });
  }

  /**
   * Create a new ACME account with Let's Encrypt
   *
   * This should only be called once per installation.
   * The account key should be stored securely for future use.
   */
  async createAccount(): Promise<{
    accountKey: Buffer;
    account: Account;
  }> {
    const accountKey = await this.generateAccountKey();
    this.accountKey = accountKey;

    const account = await this.client().createAccount({
      termsOfServiceAgreed: true,
      contact: [`mailto:${env.ACME_CONTACT_EMAIL}`],
    });

    return { accountKey, account };
  }

  /**
   * Issue a certificate for the configured domain
   *
   * This handles the full ACME flow:
   * 1. Creates a CSR
   * 2. Initiates the ACME order
   * 3. Calls the challenge handlers for HTTP-01 validation
   * 4. Returns the issued certificate
   *
   * @param onChallengeCreate - Called when the challenge needs to be served
   * @param onChallengeRemove - Called when the challenge can be removed
   * @returns Object containing the certificate and private key
   */
  async issueCertificate(
    onChallengeCreate: (
      token: string,
      keyAuthorization: string,
    ) => Promise<void>,
    onChallengeRemove: (token: string) => Promise<void>,
  ): Promise<{
    certificate: string;
    privateKey: Buffer;
  }> {
    if (!this.domain) {
      throw new Error("Domain not set. Call forDomain() first.");
    }

    if (!this.accountKey) {
      throw new Error("Account key not set. Call setAccountKey() first.");
    }

    // Create CSR
    const [privateKey, csr] = await this.createCsr();

    // Ensure account exists
    await this.client().createAccount({
      termsOfServiceAgreed: true,
      contact: [`mailto:${env.ACME_CONTACT_EMAIL}`],
    });

    // Issue certificate with auto challenge handling
    const certificate = await this.client().auto({
      csr,
      termsOfServiceAgreed: true,
      skipChallengeVerification: true,
      email: env.ACME_CONTACT_EMAIL,
      challengeCreateFn: async (_authz, challenge, keyAuthorization) => {
        await onChallengeCreate(challenge.token, keyAuthorization);
      },
      challengeRemoveFn: async (_authz, challenge, _keyAuthorization) => {
        await onChallengeRemove(challenge.token);
      },
    });

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
