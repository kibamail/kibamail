/**
 * Webhook Dispatch Job Processor
 *
 * Processes queued webhook events by enriching minimal ID payloads
 * with full entity data and publishing to Outpost.
 */

import { prisma } from "@/lib/db";
import { outpost } from "@/webhooks/client/client";
import {
  enrichContact,
  enrichBroadcast,
  enrichTopic,
  enrichSegment,
  enrichForm,
  enrichFormSubmission,
  enrichAutomation,
  enrichAutomationRun,
  enrichTransactionalEmail,
  enrichDomain,
  enrichSuppression,
  enrichApiKey,
  enrichConversation,
  enrichConversationMessage,
  enrichBroadcastSend,
} from "@/webhooks/enrichers";
import type { WebhookTopicName, WebhookPayloadMap } from "@/webhooks/payloads";
import type { WebhookJobPayloadMap } from "@/webhooks/job-payloads";
import type { JobProcessor } from "@/lib/queue/types";
import { queueLogger } from "@/lib/queue/logger";

const logger = queueLogger.child({ job: "dispatch-webhook" });

/**
 * Main webhook dispatch job processor
 */
export const dispatchWebhook: JobProcessor<
  "webhooks",
  "dispatch-webhook"
> = async (data, jobId) => {
  const { workspaceId, topic, payload, timestamp, idempotencyKey } = data;

  logger.info({ jobId, topic, workspaceId }, "Processing webhook dispatch");

  try {
    // Enrich the payload based on the topic
    const enrichedData = await enrichPayload(
      topic as WebhookTopicName,
      payload
    );

    if (!enrichedData) {
      logger.warn(
        { jobId, topic, payload },
        "Failed to enrich webhook payload - entities not found"
      );
      return;
    }

    // Publish to Outpost
    const result = await outpost.publish({
      tenant_id: workspaceId,
      topic,
      data: {
        topic,
        ...enrichedData,
      },
      metadata: {
        timestamp,
        ...(idempotencyKey && { idempotency_key: idempotencyKey }),
      },
      eligible_for_retry: true,
    });

    logger.info(
      { jobId, topic, workspaceId, eventId: result?.id },
      "Webhook dispatched successfully"
    );
  } catch (error) {
    logger.error(
      { jobId, topic, workspaceId, error },
      "Failed to dispatch webhook"
    );
    throw error;
  }
};

/**
 * Enriches a minimal job payload into a full webhook payload
 */
async function enrichPayload(
  topic: WebhookTopicName,
  payload: Record<string, unknown>
): Promise<WebhookPayloadMap[WebhookTopicName] | null> {
  switch (topic) {
    // -------------------------------------------------------------------------
    // EMAIL DELIVERY EVENTS
    // -------------------------------------------------------------------------
    case "email.delivered":
    case "email.rejected":
    case "email.failed": {
      const p = payload as WebhookJobPayloadMap[typeof topic];
      const [contact, broadcast, sendInfo] = await Promise.all([
        p.contactId ? enrichContact(p.contactId) : null,
        p.broadcastId ? enrichBroadcast(p.broadcastId) : null,
        enrichBroadcastSend(p.sendingId),
      ]);

      return {
        event: {
          sendingId: p.sendingId,
          recipient: sendInfo?.email ?? "",
          timestamp: new Date().toISOString(),
          responseCode: p.responseCode,
          responseMessage: p.responseMessage,
        },
        contact,
        broadcast,
      };
    }

    case "email.bounced": {
      const p = payload as WebhookJobPayloadMap["email.bounced"];
      const [contact, broadcast, sendInfo] = await Promise.all([
        p.contactId ? enrichContact(p.contactId) : null,
        p.broadcastId ? enrichBroadcast(p.broadcastId) : null,
        enrichBroadcastSend(p.sendingId),
      ]);

      return {
        event: {
          sendingId: p.sendingId,
          recipient: sendInfo?.email ?? "",
          timestamp: new Date().toISOString(),
          bounceType: p.bounceType,
          bounceClassification: p.bounceClassification,
          responseCode: p.responseCode,
          responseMessage: p.responseMessage,
        },
        contact,
        broadcast,
      };
    }

    case "email.soft_bounced": {
      const p = payload as WebhookJobPayloadMap["email.soft_bounced"];
      const [contact, broadcast, sendInfo] = await Promise.all([
        p.contactId ? enrichContact(p.contactId) : null,
        p.broadcastId ? enrichBroadcast(p.broadcastId) : null,
        enrichBroadcastSend(p.sendingId),
      ]);

      return {
        event: {
          sendingId: p.sendingId,
          recipient: sendInfo?.email ?? "",
          timestamp: new Date().toISOString(),
          bounceType: "soft",
          bounceClassification: p.bounceClassification,
          responseCode: p.responseCode,
          responseMessage: p.responseMessage,
        },
        contact,
        broadcast,
      };
    }

    case "email.complained": {
      const p = payload as WebhookJobPayloadMap["email.complained"];
      const [contact, broadcast, sendInfo] = await Promise.all([
        p.contactId ? enrichContact(p.contactId) : null,
        p.broadcastId ? enrichBroadcast(p.broadcastId) : null,
        enrichBroadcastSend(p.sendingId),
      ]);

      return {
        event: {
          sendingId: p.sendingId,
          recipient: sendInfo?.email ?? "",
          timestamp: new Date().toISOString(),
          feedbackType: p.feedbackType,
        },
        contact,
        broadcast,
      };
    }

    case "email.queued": {
      const p = payload as WebhookJobPayloadMap["email.queued"];
      const [contact, broadcast, sendInfo] = await Promise.all([
        p.contactId ? enrichContact(p.contactId) : null,
        p.broadcastId ? enrichBroadcast(p.broadcastId) : null,
        enrichBroadcastSend(p.sendingId),
      ]);

      return {
        event: {
          sendingId: p.sendingId,
          recipient: sendInfo?.email ?? "",
          timestamp: new Date().toISOString(),
        },
        contact,
        broadcast,
      };
    }

    // -------------------------------------------------------------------------
    // EMAIL ENGAGEMENT EVENTS
    // -------------------------------------------------------------------------
    case "email.opened": {
      const p = payload as WebhookJobPayloadMap["email.opened"];
      const [contact, broadcast, sendInfo] = await Promise.all([
        p.contactId ? enrichContact(p.contactId) : null,
        p.broadcastId ? enrichBroadcast(p.broadcastId) : null,
        enrichBroadcastSend(p.sendingId),
      ]);

      return {
        event: {
          sendingId: p.sendingId,
          recipient: sendInfo?.email ?? "",
          timestamp: new Date().toISOString(),
          userAgent: p.userAgent,
          ipAddress: p.ipAddress,
          country: p.country,
          city: p.city,
          device: p.device,
          browser: p.browser,
        },
        contact,
        broadcast,
      };
    }

    case "email.clicked": {
      const p = payload as WebhookJobPayloadMap["email.clicked"];
      const [contact, broadcast, sendInfo] = await Promise.all([
        p.contactId ? enrichContact(p.contactId) : null,
        p.broadcastId ? enrichBroadcast(p.broadcastId) : null,
        enrichBroadcastSend(p.sendingId),
      ]);

      return {
        event: {
          sendingId: p.sendingId,
          recipient: sendInfo?.email ?? "",
          timestamp: new Date().toISOString(),
          url: p.url,
          userAgent: p.userAgent,
          ipAddress: p.ipAddress,
          country: p.country,
          city: p.city,
          device: p.device,
          browser: p.browser,
        },
        contact,
        broadcast,
      };
    }

    case "email.unsubscribed": {
      const p = payload as WebhookJobPayloadMap["email.unsubscribed"];
      const [contact, broadcast, sendInfo, topicEntity] = await Promise.all([
        p.contactId ? enrichContact(p.contactId) : null,
        p.broadcastId ? enrichBroadcast(p.broadcastId) : null,
        enrichBroadcastSend(p.sendingId),
        p.topicId ? enrichTopic(p.topicId) : null,
      ]);

      return {
        event: {
          sendingId: p.sendingId,
          recipient: sendInfo?.email ?? "",
          timestamp: new Date().toISOString(),
          method: p.method,
          topicId: p.topicId,
        },
        contact,
        broadcast,
        topic: topicEntity,
      };
    }

    case "email.list_unsubscribed": {
      const p = payload as WebhookJobPayloadMap["email.list_unsubscribed"];
      const [contact, broadcast, sendInfo] = await Promise.all([
        p.contactId ? enrichContact(p.contactId) : null,
        p.broadcastId ? enrichBroadcast(p.broadcastId) : null,
        enrichBroadcastSend(p.sendingId),
      ]);

      return {
        event: {
          sendingId: p.sendingId,
          recipient: sendInfo?.email ?? "",
          timestamp: new Date().toISOString(),
          method: "list_unsubscribe",
          topicId: null,
        },
        contact,
        broadcast,
      };
    }

    // -------------------------------------------------------------------------
    // CONTACT EVENTS
    // -------------------------------------------------------------------------
    case "contact.created": {
      const p = payload as WebhookJobPayloadMap["contact.created"];
      const contact = await enrichContact(p.contactId);
      if (!contact) return null;

      return {
        contact,
        source: {
          type: p.sourceType,
          formId: p.formId,
          importId: p.importId,
        },
      };
    }

    case "contact.updated": {
      const p = payload as WebhookJobPayloadMap["contact.updated"];
      const contact = await enrichContact(p.contactId);
      if (!contact) return null;

      return {
        contact,
        previousValues: p.previousValues,
        changedFields: p.changedFields,
      };
    }

    case "contact.deleted": {
      const p = payload as WebhookJobPayloadMap["contact.deleted"];
      const contact = await enrichContact(p.contactId);
      if (!contact) return null;

      return { contact };
    }

    case "contact.subscribed": {
      const p = payload as WebhookJobPayloadMap["contact.subscribed"];
      const contact = await enrichContact(p.contactId);
      if (!contact) return null;

      return {
        contact,
        method: p.method,
        formId: p.formId,
      };
    }

    case "contact.unsubscribed": {
      const p = payload as WebhookJobPayloadMap["contact.unsubscribed"];
      const contact = await enrichContact(p.contactId);
      if (!contact) return null;

      return {
        contact,
        method: p.method,
        reason: p.reason,
      };
    }

    case "contact.status_changed": {
      const p = payload as WebhookJobPayloadMap["contact.status_changed"];
      const contact = await enrichContact(p.contactId);
      if (!contact) return null;

      return {
        contact,
        previousStatus: p.previousStatus as typeof contact.status,
        newStatus: p.newStatus as typeof contact.status,
        reason: p.reason,
      };
    }

    // -------------------------------------------------------------------------
    // TOPIC SUBSCRIPTION EVENTS
    // -------------------------------------------------------------------------
    case "contact.topic_subscribed": {
      const p = payload as WebhookJobPayloadMap["contact.topic_subscribed"];
      const [contact, topicEntity] = await Promise.all([
        enrichContact(p.contactId),
        enrichTopic(p.topicId),
      ]);
      if (!contact || !topicEntity) return null;

      return { contact, topic: topicEntity };
    }

    case "contact.topic_unsubscribed": {
      const p = payload as WebhookJobPayloadMap["contact.topic_unsubscribed"];
      const [contact, topicEntity] = await Promise.all([
        enrichContact(p.contactId),
        enrichTopic(p.topicId),
      ]);
      if (!contact || !topicEntity) return null;

      return { contact, topic: topicEntity, method: p.method };
    }

    case "topic.created": {
      const p = payload as WebhookJobPayloadMap["topic.created"];
      const topicEntity = await enrichTopic(p.topicId);
      if (!topicEntity) return null;

      return { topic: topicEntity };
    }

    case "topic.updated": {
      const p = payload as WebhookJobPayloadMap["topic.updated"];
      const topicEntity = await enrichTopic(p.topicId);
      if (!topicEntity) return null;

      return {
        topic: topicEntity,
        previousValues: p.previousValues,
        changedFields: p.changedFields,
      };
    }

    case "topic.deleted": {
      const p = payload as WebhookJobPayloadMap["topic.deleted"];
      const topicEntity = await enrichTopic(p.topicId);
      if (!topicEntity) return null;

      return { topic: topicEntity };
    }

    // -------------------------------------------------------------------------
    // BROADCAST EVENTS
    // -------------------------------------------------------------------------
    case "broadcast.created": {
      const p = payload as WebhookJobPayloadMap["broadcast.created"];
      const broadcast = await enrichBroadcast(p.broadcastId);
      if (!broadcast) return null;

      return { broadcast };
    }

    case "broadcast.updated": {
      const p = payload as WebhookJobPayloadMap["broadcast.updated"];
      const broadcast = await enrichBroadcast(p.broadcastId);
      if (!broadcast) return null;

      return {
        broadcast,
        previousValues: p.previousValues,
        changedFields: p.changedFields,
      };
    }

    case "broadcast.scheduled": {
      const p = payload as WebhookJobPayloadMap["broadcast.scheduled"];
      const broadcast = await enrichBroadcast(p.broadcastId);
      if (!broadcast) return null;

      return { broadcast, scheduledFor: p.scheduledFor };
    }

    case "broadcast.sent": {
      const p = payload as WebhookJobPayloadMap["broadcast.sent"];
      const broadcast = await enrichBroadcast(p.broadcastId);
      if (!broadcast) return null;

      return { broadcast };
    }

    case "broadcast.paused": {
      const p = payload as WebhookJobPayloadMap["broadcast.paused"];
      const broadcast = await enrichBroadcast(p.broadcastId);
      if (!broadcast) return null;

      return { broadcast, reason: p.reason };
    }

    case "broadcast.cancelled": {
      const p = payload as WebhookJobPayloadMap["broadcast.cancelled"];
      const broadcast = await enrichBroadcast(p.broadcastId);
      if (!broadcast) return null;

      return { broadcast, reason: p.reason };
    }

    case "broadcast.failed": {
      const p = payload as WebhookJobPayloadMap["broadcast.failed"];
      const broadcast = await enrichBroadcast(p.broadcastId);
      if (!broadcast) return null;

      return { broadcast, error: p.error };
    }

    // -------------------------------------------------------------------------
    // TRANSACTIONAL EMAIL EVENTS
    // -------------------------------------------------------------------------
    case "transactional_email.sent": {
      const p = payload as WebhookJobPayloadMap["transactional_email.sent"];
      const transactionalEmail = await enrichTransactionalEmail(
        p.transactionalEmailId
      );
      if (!transactionalEmail) return null;

      // Try to find contact by email
      const contact = await findContactByEmail(transactionalEmail.toEmail);

      return { transactionalEmail, contact };
    }

    case "transactional_email.delivered": {
      const p =
        payload as WebhookJobPayloadMap["transactional_email.delivered"];
      const transactionalEmail = await enrichTransactionalEmail(
        p.transactionalEmailId
      );
      if (!transactionalEmail) return null;

      const contact = await findContactByEmail(transactionalEmail.toEmail);

      return {
        transactionalEmail,
        contact,
        event: {
          sendingId: transactionalEmail.sendingId,
          recipient: transactionalEmail.toEmail,
          timestamp: new Date().toISOString(),
          responseCode: p.responseCode,
          responseMessage: p.responseMessage,
        },
      };
    }

    case "transactional_email.bounced": {
      const p = payload as WebhookJobPayloadMap["transactional_email.bounced"];
      const transactionalEmail = await enrichTransactionalEmail(
        p.transactionalEmailId
      );
      if (!transactionalEmail) return null;

      const contact = await findContactByEmail(transactionalEmail.toEmail);

      return {
        transactionalEmail,
        contact,
        event: {
          sendingId: transactionalEmail.sendingId,
          recipient: transactionalEmail.toEmail,
          timestamp: new Date().toISOString(),
          bounceType: p.bounceType,
          bounceClassification: p.bounceClassification,
          responseCode: p.responseCode,
          responseMessage: p.responseMessage,
        },
      };
    }

    case "transactional_email.complained": {
      const p =
        payload as WebhookJobPayloadMap["transactional_email.complained"];
      const transactionalEmail = await enrichTransactionalEmail(
        p.transactionalEmailId
      );
      if (!transactionalEmail) return null;

      const contact = await findContactByEmail(transactionalEmail.toEmail);

      return {
        transactionalEmail,
        contact,
        event: {
          sendingId: transactionalEmail.sendingId,
          recipient: transactionalEmail.toEmail,
          timestamp: new Date().toISOString(),
          feedbackType: p.feedbackType,
        },
      };
    }

    case "transactional_email.opened": {
      const p = payload as WebhookJobPayloadMap["transactional_email.opened"];
      const transactionalEmail = await enrichTransactionalEmail(
        p.transactionalEmailId
      );
      if (!transactionalEmail) return null;

      const contact = await findContactByEmail(transactionalEmail.toEmail);

      return {
        transactionalEmail,
        contact,
        event: {
          sendingId: transactionalEmail.sendingId,
          recipient: transactionalEmail.toEmail,
          timestamp: new Date().toISOString(),
          userAgent: p.userAgent,
          ipAddress: p.ipAddress,
          country: p.country,
          city: p.city,
          device: p.device,
          browser: p.browser,
        },
      };
    }

    case "transactional_email.clicked": {
      const p = payload as WebhookJobPayloadMap["transactional_email.clicked"];
      const transactionalEmail = await enrichTransactionalEmail(
        p.transactionalEmailId
      );
      if (!transactionalEmail) return null;

      const contact = await findContactByEmail(transactionalEmail.toEmail);

      return {
        transactionalEmail,
        contact,
        event: {
          sendingId: transactionalEmail.sendingId,
          recipient: transactionalEmail.toEmail,
          timestamp: new Date().toISOString(),
          url: p.url,
          userAgent: p.userAgent,
          ipAddress: p.ipAddress,
          country: p.country,
          city: p.city,
          device: p.device,
          browser: p.browser,
        },
      };
    }

    // -------------------------------------------------------------------------
    // SEGMENT EVENTS
    // -------------------------------------------------------------------------
    case "segment.created": {
      const p = payload as WebhookJobPayloadMap["segment.created"];
      const segment = await enrichSegment(p.segmentId);
      if (!segment) return null;

      return { segment };
    }

    case "segment.updated": {
      const p = payload as WebhookJobPayloadMap["segment.updated"];
      const segment = await enrichSegment(p.segmentId);
      if (!segment) return null;

      return {
        segment,
        previousValues: p.previousValues,
        changedFields: p.changedFields,
      };
    }

    case "segment.deleted": {
      const p = payload as WebhookJobPayloadMap["segment.deleted"];
      const segment = await enrichSegment(p.segmentId);
      if (!segment) return null;

      return { segment };
    }

    case "segment.contact_entered": {
      const p = payload as WebhookJobPayloadMap["segment.contact_entered"];
      const [segment, contact] = await Promise.all([
        enrichSegment(p.segmentId),
        enrichContact(p.contactId),
      ]);
      if (!segment || !contact) return null;

      return { segment, contact };
    }

    case "segment.contact_exited": {
      const p = payload as WebhookJobPayloadMap["segment.contact_exited"];
      const [segment, contact] = await Promise.all([
        enrichSegment(p.segmentId),
        enrichContact(p.contactId),
      ]);
      if (!segment || !contact) return null;

      return { segment, contact };
    }

    // -------------------------------------------------------------------------
    // FORM EVENTS
    // -------------------------------------------------------------------------
    case "form.created": {
      const p = payload as WebhookJobPayloadMap["form.created"];
      const form = await enrichForm(p.formId);
      if (!form) return null;

      return { form };
    }

    case "form.updated": {
      const p = payload as WebhookJobPayloadMap["form.updated"];
      const form = await enrichForm(p.formId);
      if (!form) return null;

      return {
        form,
        previousValues: p.previousValues,
        changedFields: p.changedFields,
      };
    }

    case "form.published": {
      const p = payload as WebhookJobPayloadMap["form.published"];
      const form = await enrichForm(p.formId);
      if (!form) return null;

      return { form };
    }

    case "form.unpublished": {
      const p = payload as WebhookJobPayloadMap["form.unpublished"];
      const form = await enrichForm(p.formId);
      if (!form) return null;

      return { form };
    }

    case "form.submission": {
      const p = payload as WebhookJobPayloadMap["form.submission"];
      const [form, submission] = await Promise.all([
        enrichForm(p.formId),
        enrichFormSubmission(p.submissionId),
      ]);
      if (!form || !submission) return null;

      const contact = submission.contactId
        ? await enrichContact(submission.contactId)
        : null;

      return { form, submission, contact };
    }

    case "form.submission_verified": {
      const p = payload as WebhookJobPayloadMap["form.submission_verified"];
      const [form, submission] = await Promise.all([
        enrichForm(p.formId),
        enrichFormSubmission(p.submissionId),
      ]);
      if (!form || !submission || !submission.contactId) return null;

      const contact = await enrichContact(submission.contactId);
      if (!contact) return null;

      return { form, submission, contact };
    }

    case "form.submission_spam": {
      const p = payload as WebhookJobPayloadMap["form.submission_spam"];
      const [form, submission] = await Promise.all([
        enrichForm(p.formId),
        enrichFormSubmission(p.submissionId),
      ]);
      if (!form || !submission) return null;

      return { form, submission, spamReason: p.spamReason };
    }

    // -------------------------------------------------------------------------
    // AUTOMATION EVENTS
    // -------------------------------------------------------------------------
    case "automation.created": {
      const p = payload as WebhookJobPayloadMap["automation.created"];
      const automation = await enrichAutomation(p.automationId);
      if (!automation) return null;

      return { automation };
    }

    case "automation.updated": {
      const p = payload as WebhookJobPayloadMap["automation.updated"];
      const automation = await enrichAutomation(p.automationId);
      if (!automation) return null;

      return {
        automation,
        previousValues: p.previousValues,
        changedFields: p.changedFields,
      };
    }

    case "automation.published": {
      const p = payload as WebhookJobPayloadMap["automation.published"];
      const automation = await enrichAutomation(p.automationId);
      if (!automation) return null;

      return { automation };
    }

    case "automation.paused": {
      const p = payload as WebhookJobPayloadMap["automation.paused"];
      const automation = await enrichAutomation(p.automationId);
      if (!automation) return null;

      return { automation, reason: p.reason };
    }

    case "automation.contact_entered": {
      const p = payload as WebhookJobPayloadMap["automation.contact_entered"];
      const [automation, automationRun, contact] = await Promise.all([
        enrichAutomation(p.automationId),
        enrichAutomationRun(p.automationRunId),
        enrichContact(p.contactId),
      ]);
      if (!automation || !automationRun || !contact) return null;

      return {
        automation,
        automationRun,
        contact,
        trigger: {
          type: p.triggerType as typeof automation.triggerType,
          sourceId: p.triggerSourceId,
        },
      };
    }

    case "automation.contact_exited": {
      const p = payload as WebhookJobPayloadMap["automation.contact_exited"];
      const [automation, automationRun, contact] = await Promise.all([
        enrichAutomation(p.automationId),
        enrichAutomationRun(p.automationRunId),
        enrichContact(p.contactId),
      ]);
      if (!automation || !automationRun || !contact) return null;

      return {
        automation,
        automationRun,
        contact,
        exitReason: p.exitReason,
      };
    }

    case "automation.step_completed": {
      const p = payload as WebhookJobPayloadMap["automation.step_completed"];
      const [automation, automationRun, contact] = await Promise.all([
        enrichAutomation(p.automationId),
        enrichAutomationRun(p.automationRunId),
        enrichContact(p.contactId),
      ]);
      if (!automation || !automationRun || !contact) return null;

      return {
        automation,
        automationRun,
        contact,
        step: {
          nodeId: p.nodeId,
          nodeType: p.nodeType,
          nodeName: p.nodeName,
        },
      };
    }

    case "automation.failed": {
      const p = payload as WebhookJobPayloadMap["automation.failed"];
      const [automation, automationRun, contact] = await Promise.all([
        enrichAutomation(p.automationId),
        enrichAutomationRun(p.automationRunId),
        enrichContact(p.contactId),
      ]);
      if (!automation || !automationRun || !contact) return null;

      return {
        automation,
        automationRun,
        contact,
        error: p.error,
        failedNodeId: p.failedNodeId,
      };
    }

    // -------------------------------------------------------------------------
    // CONVERSATION EVENTS
    // -------------------------------------------------------------------------
    case "conversation.created": {
      const p = payload as WebhookJobPayloadMap["conversation.created"];
      const [conversation, initialMessage] = await Promise.all([
        enrichConversation(p.conversationId),
        enrichConversationMessage(p.initialMessageId),
      ]);
      if (!conversation || !initialMessage) return null;

      const contact = conversation.contactId
        ? await enrichContact(conversation.contactId)
        : null;

      return { conversation, contact, initialMessage };
    }

    case "conversation.message_received": {
      const p =
        payload as WebhookJobPayloadMap["conversation.message_received"];
      const [conversation, message] = await Promise.all([
        enrichConversation(p.conversationId),
        enrichConversationMessage(p.messageId),
      ]);
      if (!conversation || !message) return null;

      const contact = conversation.contactId
        ? await enrichContact(conversation.contactId)
        : null;

      return { conversation, contact, message };
    }

    case "conversation.message_sent": {
      const p = payload as WebhookJobPayloadMap["conversation.message_sent"];
      const [conversation, message] = await Promise.all([
        enrichConversation(p.conversationId),
        enrichConversationMessage(p.messageId),
      ]);
      if (!conversation || !message) return null;

      const contact = conversation.contactId
        ? await enrichContact(conversation.contactId)
        : null;

      return { conversation, contact, message };
    }

    case "conversation.closed": {
      const p = payload as WebhookJobPayloadMap["conversation.closed"];
      const conversation = await enrichConversation(p.conversationId);
      if (!conversation) return null;

      const contact = conversation.contactId
        ? await enrichContact(conversation.contactId)
        : null;

      return { conversation, contact };
    }

    case "conversation.archived": {
      const p = payload as WebhookJobPayloadMap["conversation.archived"];
      const conversation = await enrichConversation(p.conversationId);
      if (!conversation) return null;

      const contact = conversation.contactId
        ? await enrichContact(conversation.contactId)
        : null;

      return { conversation, contact };
    }

    // -------------------------------------------------------------------------
    // DOMAIN EVENTS
    // -------------------------------------------------------------------------
    case "domain.created": {
      const p = payload as WebhookJobPayloadMap["domain.created"];
      const domain = await enrichDomain(p.domainId);
      if (!domain) return null;

      return { domain };
    }

    case "domain.verified": {
      const p = payload as WebhookJobPayloadMap["domain.verified"];
      const domain = await enrichDomain(p.domainId);
      if (!domain) return null;

      return { domain, verificationType: p.verificationType };
    }

    case "domain.verification_failed": {
      const p = payload as WebhookJobPayloadMap["domain.verification_failed"];
      const domain = await enrichDomain(p.domainId);
      if (!domain) return null;

      return {
        domain,
        verificationType: p.verificationType,
        error: p.error,
      };
    }

    case "domain.deleted": {
      const p = payload as WebhookJobPayloadMap["domain.deleted"];
      const domain = await enrichDomain(p.domainId);
      if (!domain) return null;

      return { domain };
    }

    // -------------------------------------------------------------------------
    // SUPPRESSION EVENTS
    // -------------------------------------------------------------------------
    case "suppression.added": {
      const p = payload as WebhookJobPayloadMap["suppression.added"];
      const entry = await enrichSuppression(p.suppressionId);
      if (!entry) return null;

      const [contact, topicEntity] = await Promise.all([
        entry.contactId ? enrichContact(entry.contactId) : null,
        entry.topicId ? enrichTopic(entry.topicId) : null,
      ]);

      return { entry, contact, topic: topicEntity };
    }

    case "suppression.removed": {
      const p = payload as WebhookJobPayloadMap["suppression.removed"];
      const entry = await enrichSuppression(p.suppressionId);
      if (!entry) return null;

      const contact = entry.contactId
        ? await enrichContact(entry.contactId)
        : null;

      return { entry, contact };
    }

    // -------------------------------------------------------------------------
    // API KEY EVENTS
    // -------------------------------------------------------------------------
    case "api_key.created": {
      const p = payload as WebhookJobPayloadMap["api_key.created"];
      const apiKey = await enrichApiKey(p.apiKeyId);
      if (!apiKey) return null;

      return { apiKey };
    }

    case "api_key.revoked": {
      const p = payload as WebhookJobPayloadMap["api_key.revoked"];
      const apiKey = await enrichApiKey(p.apiKeyId);
      if (!apiKey) return null;

      return { apiKey };
    }

    default:
      logger.warn({ topic }, "Unknown webhook topic");
      return null;
  }
}

/**
 * Helper to find a contact by email (for transactional emails)
 */
async function findContactByEmail(email: string) {
  // This is a simplified lookup - in practice you might need workspaceId
  const contact = await prisma.contact.findFirst({
    where: { email },
  });

  return contact ? enrichContact(contact.id) : null;
}
