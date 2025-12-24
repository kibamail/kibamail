import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import type {
  Broadcast,
  EmailContent,
  Segment,
  SendingDomain,
  SenderIdentity,
  Topic,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  validateContentLinks,
  type LinksValidationResult,
  type ExtractedLink,
} from "./links-validator";

export type { LinksValidationResult, ExtractedLink };

dayjs.extend(advancedFormat);

export interface ReadinessCheckItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  reason?: string;
}

export interface BroadcastReadinessResult {
  ready: boolean;
  checklist: ReadinessCheckItem[];
  recipientCount: number;
  audienceType: "all" | "topic" | "segment";
  audienceName?: string;
  linksValidation: LinksValidationResult;
}

type BroadcastWithRelations = Broadcast & {
  emailContent: EmailContent | null;
  senderIdentity:
    | (SenderIdentity & {
        sendingDomain: SendingDomain | null;
      })
    | null;
  sendingDomain: SendingDomain | null;
};

export class BroadcastReadinessChecker {
  private workspaceId: string;
  private broadcast: BroadcastWithRelations;
  private topic: Topic | null = null;
  private segment: Segment | null = null;
  private recipientCount = 0;
  private linksValidation: LinksValidationResult = {
    links: [],
    allValid: true,
    validCount: 0,
    invalidCount: 0,
  };

  constructor(workspaceId: string, broadcast: BroadcastWithRelations) {
    this.workspaceId = workspaceId;
    this.broadcast = broadcast;
  }

  async check(): Promise<BroadcastReadinessResult> {
    await Promise.all([this.loadAudienceData(), this.validateLinks()]);
    await this.calculateRecipientCount();

    const checklist = this.buildChecklist();
    const { audienceType, audienceName } = this.getAudienceInfo();

    return {
      ready: checklist.every((item) => item.completed),
      checklist,
      recipientCount: this.recipientCount,
      audienceType,
      audienceName,
      linksValidation: this.linksValidation,
    };
  }

  private async validateLinks(): Promise<void> {
    const contentJson = this.broadcast.emailContent?.contentJson;
    if (contentJson) {
      this.linksValidation = await validateContentLinks(contentJson);
    }
  }

  private async loadAudienceData(): Promise<void> {
    const [topic, segment] = await Promise.all([
      this.broadcast.topicId
        ? prisma.topic.findUnique({ where: { id: this.broadcast.topicId } })
        : null,
      this.broadcast.segmentId
        ? prisma.segment.findUnique({ where: { id: this.broadcast.segmentId } })
        : null,
    ]);

    this.topic = topic;
    this.segment = segment;
  }

  private async calculateRecipientCount(): Promise<void> {
    if (this.broadcast.topicId && this.topic) {
      this.recipientCount = await prisma.contactTopic.count({
        where: {
          topicId: this.broadcast.topicId,
          status: "SUBSCRIBED",
          contact: {
            workspaceId: this.workspaceId,
            status: "SUBSCRIBED",
          },
        },
      });
    } else if (this.broadcast.segmentId && this.segment) {
      if (this.segment.type === "STATIC") {
        this.recipientCount = await prisma.contactSegment.count({
          where: {
            segmentId: this.broadcast.segmentId,
            contact: {
              workspaceId: this.workspaceId,
              status: "SUBSCRIBED",
            },
          },
        });
      } else {
        this.recipientCount = await prisma.contact.count({
          where: {
            workspaceId: this.workspaceId,
            status: "SUBSCRIBED",
          },
        });
      }
    } else {
      this.recipientCount = await prisma.contact.count({
        where: {
          workspaceId: this.workspaceId,
          status: "SUBSCRIBED",
        },
      });
    }
  }

  private getAudienceInfo(): {
    audienceType: "all" | "topic" | "segment";
    audienceName?: string;
  } {
    if (this.broadcast.topicId && this.topic) {
      return { audienceType: "topic", audienceName: this.topic.name };
    }
    if (this.broadcast.segmentId && this.segment) {
      return { audienceType: "segment", audienceName: this.segment.name };
    }
    return { audienceType: "all" };
  }

  private buildChecklist(): ReadinessCheckItem[] {
    const checklist: ReadinessCheckItem[] = [];

    checklist.push(this.checkFromEmail());
    checklist.push(this.checkSubject());
    checklist.push(this.checkUnsubscribeLink());
    checklist.push(this.checkLinks());
    checklist.push(this.checkSendTime());
    checklist.push(this.checkRecipients());

    return checklist;
  }

  private checkLinks(): ReadinessCheckItem {
    const { links, allValid, invalidCount } = this.linksValidation;
    const totalLinks = links.length;

    if (totalLinks === 0) {
      return {
        id: "links",
        label: "No links to validate",
        description: "All links in your email must be valid",
        completed: true,
      };
    }

    const label = allValid
      ? `All ${totalLinks} link${totalLinks === 1 ? "" : "s"} valid`
      : `${invalidCount} of ${totalLinks} link${
          totalLinks === 1 ? "" : "s"
        } invalid`;

    return {
      id: "links",
      label,
      description: "All links in your email must be valid",
      completed: allValid,
      reason: !allValid
        ? `${invalidCount} link${
            invalidCount === 1 ? " is" : "s are"
          } invalid or unreachable`
        : undefined,
    };
  }

  private checkFromEmail(): ReadinessCheckItem {
    const hasSenderIdentity = !!this.broadcast.senderIdentity;
    const sendingDomain =
      this.broadcast.senderIdentity?.sendingDomain ||
      this.broadcast.sendingDomain;
    const isDomainVerified = sendingDomain
      ? !!(
          sendingDomain.dkimVerifiedAt &&
          sendingDomain.returnPathDomainVerifiedAt
        )
      : false;

    const senderEmail =
      hasSenderIdentity && this.broadcast.senderIdentity?.sendingDomain
        ? `${this.broadcast.senderIdentity.email}@${this.broadcast.senderIdentity.sendingDomain.name}`
        : null;

    const label = senderEmail ? `Send from ${senderEmail}` : "From email";

    return {
      id: "from_email",
      label,
      description: "A verified sender email address is required",
      completed: hasSenderIdentity && isDomainVerified,
      reason: !hasSenderIdentity
        ? "No sender email configured"
        : !isDomainVerified
        ? "Sending domain is not fully verified"
        : undefined,
    };
  }

  private checkSubject(): ReadinessCheckItem {
    const hasSubject = !!this.broadcast.emailContent?.subject?.trim();

    return {
      id: "subject",
      label: "Subject line",
      description: "A subject line is required for your broadcast",
      completed: hasSubject,
      reason: !hasSubject ? "No subject line set" : undefined,
    };
  }

  private checkUnsubscribeLink(): ReadinessCheckItem {
    const hasUnsubscribeUrl = this.hasUnsubscribeLinkInContent();

    return {
      id: "unsubscribe_url",
      label: "Unsubscribe link",
      description: "An unsubscribe link is required in your email",
      completed: hasUnsubscribeUrl,
      reason: !hasUnsubscribeUrl
        ? "No unsubscribe link found in email content"
        : undefined,
    };
  }

  private hasUnsubscribeLinkInContent(): boolean {
    const contentHtml = this.broadcast.emailContent?.contentHtml || "";
    if (contentHtml.includes("{{unsubscribe_url}}")) {
      return true;
    }

    const contentJson = this.broadcast.emailContent?.contentJson;
    if (contentJson) {
      return JSON.stringify(contentJson).includes("{{unsubscribe_url}}");
    }

    return false;
  }

  private checkSendTime(): ReadinessCheckItem {
    const hasSendTime = !!this.broadcast.sendAt;
    const label = hasSendTime
      ? `Send on ${dayjs(this.broadcast.sendAt).format("Do MMM [at] h:mma")}`
      : "Send time";

    return {
      id: "send_time",
      label,
      description: "Schedule when the broadcast should be sent",
      completed: hasSendTime,
      reason: !hasSendTime ? "No send time scheduled" : undefined,
    };
  }

  private checkRecipients(): ReadinessCheckItem {
    const hasRecipients = this.recipientCount > 0;

    return {
      id: "recipients",
      label: `Send to ${this.recipientCount.toLocaleString()} recipients`,
      description: "At least one recipient is required",
      completed: hasRecipients,
      reason: !hasRecipients ? "No recipients in selected audience" : undefined,
    };
  }
}

/**
 * Convenience function to check broadcast readiness
 */
export async function checkBroadcastReadiness(
  workspaceId: string,
  broadcast: BroadcastWithRelations
): Promise<BroadcastReadinessResult> {
  const checker = new BroadcastReadinessChecker(workspaceId, broadcast);
  return checker.check();
}

/**
 * Get the reasons why a broadcast is not ready
 * Useful for error messages in the send endpoint
 */
export function getReadinessErrors(result: BroadcastReadinessResult): string[] {
  return result.checklist
    .filter((item) => !item.completed && item.reason)
    .map((item) => item.reason!);
}
