/**
 * MTA DMARC Reports - Handler
 *
 * Receives DMARC aggregate reports forwarded from KumoMTA.
 * Reports arrive as RFC822 messages with gzipped XML attachments.
 *
 * Uses existing handler: getTenantByDmarcCode to validate the DMARC code
 */

import type { NextRequest } from "next/server";
import { getTenantByDmarcCode } from "@/app/(main)/api/internal/v1/tenants/[tenantId]/handler";
import { responseOk } from "@/lib/api/responses";
import { queueLogger } from "@/lib/queue";

const logger = queueLogger.child({ module: "dmarc-reports" });

/**
 * POST /api/internal/v1/mta/dmarc/reports
 *
 * Receives DMARC aggregate reports from KumoMTA.
 * Headers:
 *   - X-Dmarc-Recipient: The recipient address (re+{code}@dmarc.kbmta.net)
 *   - X-Dmarc-Sender: The sender address (reporting domain)
 * Body: Raw RFC822 message
 */
export async function receiveDmarcReport(request: NextRequest) {
  const recipient = request.headers.get("x-dmarc-recipient") || "unknown";
  const sender = request.headers.get("x-dmarc-sender") || "unknown";

  // Extract DMARC code from recipient (format: re+{code}@dmarc.kbmta.net)
  const codeMatch = recipient.match(/re\+([^@]+)@/);
  const dmarcCode = codeMatch ? codeMatch[1] : null;

  logger.info({ recipient, sender, dmarcCode }, "Received DMARC report");

  if (!dmarcCode) {
    logger.warn({ recipient }, "Could not extract DMARC code from recipient");
    return responseOk({ received: true, processed: false });
  }

  try {
    // Validate the DMARC code using existing handler
    const response = await getTenantByDmarcCode(dmarcCode);
    const data = await response.json();

    logger.info(
      {
        dmarcCode,
        workspaceId: data.workspace_id,
        domain: data.domain,
        reporterDomain: sender.split("@")[1] || sender,
      },
      "DMARC report received and validated",
    );

    return responseOk({ received: true, processed: true });
  } catch {
    logger.warn({ dmarcCode }, "DMARC code not found");
    return responseOk({ received: true, processed: false });
  }
}
