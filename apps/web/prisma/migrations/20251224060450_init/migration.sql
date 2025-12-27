-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('UNCONFIRMED', 'SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContactSourceType" AS ENUM ('MANUAL', 'IMPORT', 'FORM', 'API');

-- CreateEnum
CREATE TYPE "ContactImportStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactPropertyType" AS ENUM ('DATE', 'NUMBER', 'STRING');

-- CreateEnum
CREATE TYPE "TopicVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "TopicSubscriptionStatus" AS ENUM ('SUBSCRIBED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('DYNAMIC', 'STATIC');

-- CreateEnum
CREATE TYPE "SuppressionScope" AS ENUM ('GLOBAL', 'TOPIC');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('MANUAL', 'BOUNCED', 'COMPLAINED', 'UNSUBSCRIBED', 'LEGAL_REQUEST', 'INVALID_EMAIL');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('CONTACT_SUBSCRIBED', 'PROPERTY_UPDATED', 'FORM_SUBMITTED', 'API', 'EVENT', 'SEGMENT_ENTRY', 'SEGMENT_EXIT', 'EMAIL_ENGAGEMENT');

-- CreateEnum
CREATE TYPE "AutomationNodeType" AS ENUM ('FORM_FILLED', 'CONTACT_SUBSCRIBED', 'CONTACT_PROPERTY_UPDATED', 'WEBHOOK_TRIGGER', 'SEND_EMAIL', 'SEND_WEBHOOK', 'UPDATE_CONTACT', 'UNSUBSCRIBE_CONTACT', 'ADD_TO_TOPIC', 'REMOVE_FROM_TOPIC', 'IF_ELSE', 'PERCENTAGE_SPLIT', 'TIME_DELAY');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PageViewType" AS ENUM ('FORM', 'LANDING_PAGE');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('SIGN_UP', 'SURVEY');

-- CreateEnum
CREATE TYPE "FormDisplay" AS ENUM ('POPUP', 'INLINE_EMBED');

-- CreateEnum
CREATE TYPE "FormSubmissionStatus" AS ENUM ('PENDING', 'PROCESSED', 'SPAM', 'FAILED');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'QUEUED_FOR_SENDING', 'SENDING', 'SENT', 'SENDING_FAILED', 'DRAFT_ARCHIVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WinningCriteria" AS ENUM ('OPENS', 'CLICKS', 'CONVERSIONS');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('Queued', 'Delivery', 'Reception', 'Bounce', 'TransientFailure', 'Expiration', 'AdminBounce', 'OOB', 'Feedback', 'Rejection', 'AdminRebind', 'Any', 'Click', 'Open');

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "logtoInvitationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPreview" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "city" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'SUBSCRIBED',
    "sourceType" "ContactSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "subscribedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyFloat0" DOUBLE PRECISION,
    "propertyFloat1" DOUBLE PRECISION,
    "propertyFloat2" DOUBLE PRECISION,
    "propertyFloat3" DOUBLE PRECISION,
    "propertyFloat4" DOUBLE PRECISION,
    "propertyFloat5" DOUBLE PRECISION,
    "propertyFloat6" DOUBLE PRECISION,
    "propertyFloat7" DOUBLE PRECISION,
    "propertyFloat8" DOUBLE PRECISION,
    "propertyFloat9" DOUBLE PRECISION,
    "propertyFloat10" DOUBLE PRECISION,
    "propertyFloat11" DOUBLE PRECISION,
    "propertyFloat12" DOUBLE PRECISION,
    "propertyFloat13" DOUBLE PRECISION,
    "propertyFloat14" DOUBLE PRECISION,
    "propertyFloat15" DOUBLE PRECISION,
    "propertyFloat16" DOUBLE PRECISION,
    "propertyFloat17" DOUBLE PRECISION,
    "propertyFloat18" DOUBLE PRECISION,
    "propertyFloat19" DOUBLE PRECISION,
    "propertyFloat20" DOUBLE PRECISION,
    "propertyFloat21" DOUBLE PRECISION,
    "propertyFloat22" DOUBLE PRECISION,
    "propertyFloat23" DOUBLE PRECISION,
    "propertyFloat24" DOUBLE PRECISION,
    "propertyFloat25" DOUBLE PRECISION,
    "propertyFloat26" DOUBLE PRECISION,
    "propertyFloat27" DOUBLE PRECISION,
    "propertyFloat28" DOUBLE PRECISION,
    "propertyFloat29" DOUBLE PRECISION,
    "propertyFloat30" DOUBLE PRECISION,
    "propertyFloat31" DOUBLE PRECISION,
    "propertyFloat32" DOUBLE PRECISION,
    "propertyFloat33" DOUBLE PRECISION,
    "propertyFloat34" DOUBLE PRECISION,
    "propertyString0" TEXT,
    "propertyString1" TEXT,
    "propertyString2" TEXT,
    "propertyString3" TEXT,
    "propertyString4" TEXT,
    "propertyString5" TEXT,
    "propertyString6" TEXT,
    "propertyString7" TEXT,
    "propertyString8" TEXT,
    "propertyString9" TEXT,
    "propertyString10" TEXT,
    "propertyString11" TEXT,
    "propertyString12" TEXT,
    "propertyString13" TEXT,
    "propertyString14" TEXT,
    "propertyString15" TEXT,
    "propertyString16" TEXT,
    "propertyString17" TEXT,
    "propertyString18" TEXT,
    "propertyString19" TEXT,
    "propertyString20" TEXT,
    "propertyString21" TEXT,
    "propertyString22" TEXT,
    "propertyString23" TEXT,
    "propertyString24" TEXT,
    "propertyString25" TEXT,
    "propertyString26" TEXT,
    "propertyString27" TEXT,
    "propertyString28" TEXT,
    "propertyString29" TEXT,
    "propertyString30" TEXT,
    "propertyString31" TEXT,
    "propertyString32" TEXT,
    "propertyString33" TEXT,
    "propertyString34" TEXT,
    "propertyString35" TEXT,
    "propertyString36" TEXT,
    "propertyString37" TEXT,
    "propertyString38" TEXT,
    "propertyString39" TEXT,
    "propertyString40" TEXT,
    "propertyString41" TEXT,
    "propertyString42" TEXT,
    "propertyString43" TEXT,
    "propertyString44" TEXT,
    "propertyString45" TEXT,
    "propertyString46" TEXT,
    "propertyString47" TEXT,
    "propertyString48" TEXT,
    "propertyString49" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_properties" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "type" "ContactPropertyType" NOT NULL,
    "defaultValue" TEXT,
    "deleted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "TopicVisibility" NOT NULL DEFAULT 'PUBLIC',
    "defaultOptIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_topics" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "status" "TopicSubscriptionStatus" NOT NULL DEFAULT 'SUBSCRIBED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "SegmentType" NOT NULL DEFAULT 'DYNAMIC',
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_segments" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppression_list" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT,
    "email" TEXT NOT NULL,
    "scope" "SuppressionScope" NOT NULL DEFAULT 'GLOBAL',
    "topicId" TEXT,
    "reason" "SuppressionReason" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppression_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_imports" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "ContactImportStatus" NOT NULL DEFAULT 'PENDING',
    "columnMapping" JSONB NOT NULL,
    "topicIds" JSONB NOT NULL DEFAULT '[]',
    "autoSubscribe" BOOLEAN NOT NULL DEFAULT false,
    "updateExisting" BOOLEAN NOT NULL DEFAULT false,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AutomationStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "triggerType" "AutomationTrigger" NOT NULL,
    "triggerConfig" JSONB,
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB,
    "stats" JSONB DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_runs" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentNodeId" TEXT,
    "executionState" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forms" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "FormType" NOT NULL DEFAULT 'SIGN_UP',
    "display" "FormDisplay" NOT NULL DEFAULT 'INLINE_EMBED',
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "publishedVersionId" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB,
    "fieldMapping" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT,
    "status" "FormSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrerUrl" TEXT,
    "landingPageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fieldString0" TEXT,
    "fieldString1" TEXT,
    "fieldString2" TEXT,
    "fieldString3" TEXT,
    "fieldString4" TEXT,
    "fieldString5" TEXT,
    "fieldString6" TEXT,
    "fieldString7" TEXT,
    "fieldString8" TEXT,
    "fieldString9" TEXT,
    "fieldString10" TEXT,
    "fieldString11" TEXT,
    "fieldString12" TEXT,
    "fieldString13" TEXT,
    "fieldString14" TEXT,
    "fieldString15" TEXT,
    "fieldString16" TEXT,
    "fieldString17" TEXT,
    "fieldString18" TEXT,
    "fieldString19" TEXT,
    "fieldString20" TEXT,
    "fieldString21" TEXT,
    "fieldString22" TEXT,
    "fieldString23" TEXT,
    "fieldString24" TEXT,
    "fieldString25" TEXT,
    "fieldString26" TEXT,
    "fieldString27" TEXT,
    "fieldString28" TEXT,
    "fieldString29" TEXT,
    "fieldString30" TEXT,
    "fieldString31" TEXT,
    "fieldString32" TEXT,
    "fieldString33" TEXT,
    "fieldString34" TEXT,
    "fieldString35" TEXT,
    "fieldString36" TEXT,
    "fieldString37" TEXT,
    "fieldString38" TEXT,
    "fieldString39" TEXT,
    "fieldNum0" DOUBLE PRECISION,
    "fieldNum1" DOUBLE PRECISION,
    "fieldNum2" DOUBLE PRECISION,
    "fieldNum3" DOUBLE PRECISION,
    "fieldNum4" DOUBLE PRECISION,
    "fieldNum5" DOUBLE PRECISION,
    "fieldNum6" DOUBLE PRECISION,
    "fieldNum7" DOUBLE PRECISION,
    "fieldNum8" DOUBLE PRECISION,
    "fieldNum9" DOUBLE PRECISION,
    "fieldNum10" DOUBLE PRECISION,
    "fieldNum11" DOUBLE PRECISION,
    "fieldNum12" DOUBLE PRECISION,
    "fieldNum13" DOUBLE PRECISION,
    "fieldNum14" DOUBLE PRECISION,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "formId" TEXT,
    "pageType" "PageViewType" NOT NULL DEFAULT 'FORM',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "country" TEXT,
    "city" TEXT,
    "referrerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SendingDomain" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dkimSubDomain" TEXT NOT NULL,
    "dkimPublicKey" TEXT NOT NULL,
    "dkimPrivateKey" TEXT NOT NULL,
    "dkimVerifiedAt" TIMESTAMP(3),
    "returnPathSubDomain" TEXT NOT NULL,
    "returnPathDomainCnameValue" TEXT NOT NULL,
    "returnPathDomainVerifiedAt" TIMESTAMP(3),
    "trackingSubDomain" TEXT NOT NULL,
    "trackingDomainCnameValue" TEXT NOT NULL,
    "trackingDomainVerifiedAt" TIMESTAMP(3),
    "trackingDomainSslVerifiedAt" TIMESTAMP(3),
    "dmarcReportingCode" TEXT NOT NULL,
    "dmarcVerifiedAt" TIMESTAMP(3),
    "trackingSslCertKey" TEXT,
    "trackingSslCertSecret" TEXT,
    "openTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "clickTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxSendPerDay" INTEGER NOT NULL DEFAULT 100,
    "maxSendPerHour" INTEGER NOT NULL DEFAULT 10,
    "recordsLastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SendingDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SenderIdentity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sendingDomainId" TEXT NOT NULL,
    "emailVerificationCode" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "emailVerificationCodeExpiresAt" TIMESTAMP(3),
    "replyToEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SenderIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailContent" (
    "id" TEXT NOT NULL,
    "contentJson" JSONB,
    "styles" JSONB,
    "contentText" TEXT,
    "contentHtml" TEXT,
    "subject" TEXT,
    "previewText" TEXT,
    "updatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segmentId" TEXT,
    "topicId" TEXT,
    "trackClicks" BOOLEAN,
    "trackOpens" BOOLEAN,
    "emailContentId" TEXT,
    "senderIdentityId" TEXT,
    "replyToIdentityId" TEXT,
    "sendingDomainId" TEXT,
    "winningAbTestVariantId" TEXT,
    "waitingTimeToPickWinner" INTEGER DEFAULT 4,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "isAbTest" BOOLEAN NOT NULL DEFAULT false,
    "winningCriteria" "WinningCriteria",
    "winningWaitTime" INTEGER,
    "sendAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbTestVariant" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "emailContentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sendAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbTestVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "sendingId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "type" "EventType" NOT NULL DEFAULT 'Any',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sendingDomainId" TEXT,
    "broadcastId" TEXT,
    "contactId" TEXT,
    "senderIdentityId" TEXT,
    "recipient" TEXT,
    "queue" TEXT,
    "siteName" TEXT,
    "size" INTEGER,
    "totalAttempts" INTEGER,
    "links" JSONB,
    "nodeId" TEXT,
    "egressPool" TEXT,
    "egressSource" TEXT,
    "deliveryProtocol" TEXT,
    "receptionProtocol" TEXT,
    "clickTrackingEnabled" BOOLEAN,
    "openTrackingEnabled" BOOLEAN,
    "responseCode" INTEGER,
    "responseContent" TEXT,
    "responseCommand" TEXT,
    "responseEnhancedCodeClass" INTEGER,
    "responseEnhancedCodeSubject" INTEGER,
    "responseEnhancedCodeDetail" INTEGER,
    "peerAddressName" TEXT,
    "peerAddressAddr" TEXT,
    "bounceClassification" TEXT,
    "originCountry" TEXT,
    "originState" TEXT,
    "originCity" TEXT,
    "originDevice" TEXT,
    "originBrowser" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_logtoInvitationId_key" ON "invitations"("logtoInvitationId");

-- CreateIndex
CREATE INDEX "invitations_inviteeEmail_idx" ON "invitations"("inviteeEmail");

-- CreateIndex
CREATE INDEX "invitations_workspaceId_idx" ON "invitations"("workspaceId");

-- CreateIndex
CREATE INDEX "invitations_expiresAt_idx" ON "invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_workspaceId_idx" ON "api_keys"("workspaceId");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_createdAt_idx" ON "api_keys"("createdAt");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_idx" ON "contacts"("workspaceId");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_status_idx" ON "contacts"("status");

-- CreateIndex
CREATE INDEX "contacts_createdAt_idx" ON "contacts"("createdAt");

-- CreateIndex
CREATE INDEX "contacts_subscribedAt_idx" ON "contacts"("subscribedAt");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyFloat0_idx" ON "contacts"("workspaceId", "propertyFloat0");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyFloat1_idx" ON "contacts"("workspaceId", "propertyFloat1");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyFloat2_idx" ON "contacts"("workspaceId", "propertyFloat2");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyFloat3_idx" ON "contacts"("workspaceId", "propertyFloat3");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyFloat4_idx" ON "contacts"("workspaceId", "propertyFloat4");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyFloat5_idx" ON "contacts"("workspaceId", "propertyFloat5");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyFloat6_idx" ON "contacts"("workspaceId", "propertyFloat6");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyFloat7_idx" ON "contacts"("workspaceId", "propertyFloat7");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyFloat8_idx" ON "contacts"("workspaceId", "propertyFloat8");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyFloat9_idx" ON "contacts"("workspaceId", "propertyFloat9");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyString0_idx" ON "contacts"("workspaceId", "propertyString0");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyString1_idx" ON "contacts"("workspaceId", "propertyString1");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyString2_idx" ON "contacts"("workspaceId", "propertyString2");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyString3_idx" ON "contacts"("workspaceId", "propertyString3");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyString4_idx" ON "contacts"("workspaceId", "propertyString4");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyString5_idx" ON "contacts"("workspaceId", "propertyString5");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyString6_idx" ON "contacts"("workspaceId", "propertyString6");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyString7_idx" ON "contacts"("workspaceId", "propertyString7");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyString8_idx" ON "contacts"("workspaceId", "propertyString8");

-- CreateIndex
CREATE INDEX "contacts_workspaceId_propertyString9_idx" ON "contacts"("workspaceId", "propertyString9");

-- CreateIndex
CREATE INDEX "contacts_sourceType_idx" ON "contacts"("sourceType");

-- CreateIndex
CREATE INDEX "contacts_sourceId_idx" ON "contacts"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_workspaceId_email_key" ON "contacts"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "contact_properties_workspaceId_idx" ON "contact_properties"("workspaceId");

-- CreateIndex
CREATE INDEX "contact_properties_workspaceId_deleted_at_idx" ON "contact_properties"("workspaceId", "deleted_at");

-- CreateIndex
CREATE INDEX "contact_properties_type_idx" ON "contact_properties"("type");

-- CreateIndex
CREATE UNIQUE INDEX "contact_properties_workspaceId_name_key" ON "contact_properties"("workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "contact_properties_workspaceId_slot_key" ON "contact_properties"("workspaceId", "slot");

-- CreateIndex
CREATE INDEX "topics_workspaceId_idx" ON "topics"("workspaceId");

-- CreateIndex
CREATE INDEX "topics_workspaceId_deleted_at_idx" ON "topics"("workspaceId", "deleted_at");

-- CreateIndex
CREATE INDEX "topics_visibility_idx" ON "topics"("visibility");

-- CreateIndex
CREATE INDEX "contact_topics_contactId_idx" ON "contact_topics"("contactId");

-- CreateIndex
CREATE INDEX "contact_topics_topicId_idx" ON "contact_topics"("topicId");

-- CreateIndex
CREATE INDEX "contact_topics_status_idx" ON "contact_topics"("status");

-- CreateIndex
CREATE UNIQUE INDEX "contact_topics_contactId_topicId_key" ON "contact_topics"("contactId", "topicId");

-- CreateIndex
CREATE INDEX "segments_workspaceId_idx" ON "segments"("workspaceId");

-- CreateIndex
CREATE INDEX "segments_workspaceId_deleted_at_idx" ON "segments"("workspaceId", "deleted_at");

-- CreateIndex
CREATE INDEX "segments_type_idx" ON "segments"("type");

-- CreateIndex
CREATE INDEX "contact_segments_contactId_idx" ON "contact_segments"("contactId");

-- CreateIndex
CREATE INDEX "contact_segments_segmentId_idx" ON "contact_segments"("segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_segments_contactId_segmentId_key" ON "contact_segments"("contactId", "segmentId");

-- CreateIndex
CREATE INDEX "suppression_list_workspaceId_idx" ON "suppression_list"("workspaceId");

-- CreateIndex
CREATE INDEX "suppression_list_contactId_idx" ON "suppression_list"("contactId");

-- CreateIndex
CREATE INDEX "suppression_list_email_idx" ON "suppression_list"("email");

-- CreateIndex
CREATE INDEX "suppression_list_scope_idx" ON "suppression_list"("scope");

-- CreateIndex
CREATE INDEX "suppression_list_topicId_idx" ON "suppression_list"("topicId");

-- CreateIndex
CREATE INDEX "suppression_list_reason_idx" ON "suppression_list"("reason");

-- CreateIndex
CREATE UNIQUE INDEX "suppression_list_workspaceId_email_topicId_key" ON "suppression_list"("workspaceId", "email", "topicId");

-- CreateIndex
CREATE INDEX "contact_imports_workspaceId_idx" ON "contact_imports"("workspaceId");

-- CreateIndex
CREATE INDEX "contact_imports_status_idx" ON "contact_imports"("status");

-- CreateIndex
CREATE INDEX "contact_imports_createdAt_idx" ON "contact_imports"("createdAt");

-- CreateIndex
CREATE INDEX "contact_imports_workspaceId_status_idx" ON "contact_imports"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "automations_workspaceId_idx" ON "automations"("workspaceId");

-- CreateIndex
CREATE INDEX "automations_workspaceId_status_idx" ON "automations"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "automations_workspaceId_deleted_at_idx" ON "automations"("workspaceId", "deleted_at");

-- CreateIndex
CREATE INDEX "automations_parentId_idx" ON "automations"("parentId");

-- CreateIndex
CREATE INDEX "automations_triggerType_idx" ON "automations"("triggerType");

-- CreateIndex
CREATE INDEX "automations_version_idx" ON "automations"("version");

-- CreateIndex
CREATE UNIQUE INDEX "automations_workspaceId_parentId_status_key" ON "automations"("workspaceId", "parentId", "status");

-- CreateIndex
CREATE INDEX "automation_runs_workspaceId_idx" ON "automation_runs"("workspaceId");

-- CreateIndex
CREATE INDEX "automation_runs_automationId_idx" ON "automation_runs"("automationId");

-- CreateIndex
CREATE INDEX "automation_runs_contactId_idx" ON "automation_runs"("contactId");

-- CreateIndex
CREATE INDEX "automation_runs_status_idx" ON "automation_runs"("status");

-- CreateIndex
CREATE INDEX "automation_runs_currentNodeId_idx" ON "automation_runs"("currentNodeId");

-- CreateIndex
CREATE INDEX "automation_runs_startedAt_idx" ON "automation_runs"("startedAt");

-- CreateIndex
CREATE INDEX "automation_runs_completedAt_idx" ON "automation_runs"("completedAt");

-- CreateIndex
CREATE INDEX "automation_runs_scheduledAt_idx" ON "automation_runs"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "automation_runs_automationId_contactId_key" ON "automation_runs"("automationId", "contactId");

-- CreateIndex
CREATE INDEX "forms_workspace_parent_status_idx" ON "forms"("workspaceId", "parentId", "status");

-- CreateIndex
CREATE INDEX "forms_workspaceId_idx" ON "forms"("workspaceId");

-- CreateIndex
CREATE INDEX "forms_workspaceId_status_idx" ON "forms"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "forms_workspaceId_deleted_at_idx" ON "forms"("workspaceId", "deleted_at");

-- CreateIndex
CREATE INDEX "forms_parentId_idx" ON "forms"("parentId");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_idx" ON "form_submissions"("workspaceId");

-- CreateIndex
CREATE INDEX "form_submissions_formId_idx" ON "form_submissions"("formId");

-- CreateIndex
CREATE INDEX "form_submissions_contactId_idx" ON "form_submissions"("contactId");

-- CreateIndex
CREATE INDEX "form_submissions_status_idx" ON "form_submissions"("status");

-- CreateIndex
CREATE INDEX "form_submissions_createdAt_idx" ON "form_submissions"("createdAt");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_fieldString0_idx" ON "form_submissions"("workspaceId", "fieldString0");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_fieldString1_idx" ON "form_submissions"("workspaceId", "fieldString1");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_fieldString2_idx" ON "form_submissions"("workspaceId", "fieldString2");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_fieldString3_idx" ON "form_submissions"("workspaceId", "fieldString3");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_fieldString4_idx" ON "form_submissions"("workspaceId", "fieldString4");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_fieldNum0_idx" ON "form_submissions"("workspaceId", "fieldNum0");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_fieldNum1_idx" ON "form_submissions"("workspaceId", "fieldNum1");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_fieldNum2_idx" ON "form_submissions"("workspaceId", "fieldNum2");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_fieldNum3_idx" ON "form_submissions"("workspaceId", "fieldNum3");

-- CreateIndex
CREATE INDEX "form_submissions_workspaceId_fieldNum4_idx" ON "form_submissions"("workspaceId", "fieldNum4");

-- CreateIndex
CREATE INDEX "page_views_workspaceId_idx" ON "page_views"("workspaceId");

-- CreateIndex
CREATE INDEX "page_views_formId_idx" ON "page_views"("formId");

-- CreateIndex
CREATE INDEX "page_views_createdAt_idx" ON "page_views"("createdAt");

-- CreateIndex
CREATE INDEX "page_views_workspaceId_formId_idx" ON "page_views"("workspaceId", "formId");

-- CreateIndex
CREATE INDEX "page_views_workspaceId_createdAt_idx" ON "page_views"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "SendingDomain_workspaceId_idx" ON "SendingDomain"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SendingDomain_workspaceId_name_key" ON "SendingDomain"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "SenderIdentity_workspaceId_idx" ON "SenderIdentity"("workspaceId");

-- CreateIndex
CREATE INDEX "Broadcast_workspaceId_idx" ON "Broadcast"("workspaceId");

-- CreateIndex
CREATE INDEX "AbTestVariant_broadcastId_idx" ON "AbTestVariant"("broadcastId");

-- CreateIndex
CREATE INDEX "events_sendingId_idx" ON "events"("sendingId");

-- CreateIndex
CREATE INDEX "events_workspaceId_idx" ON "events"("workspaceId");

-- CreateIndex
CREATE INDEX "events_broadcastId_idx" ON "events"("broadcastId");

-- CreateIndex
CREATE INDEX "events_contactId_idx" ON "events"("contactId");

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");

-- CreateIndex
CREATE INDEX "events_createdAt_idx" ON "events"("createdAt");

-- AddForeignKey
ALTER TABLE "contact_topics" ADD CONSTRAINT "contact_topics_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_topics" ADD CONSTRAINT "contact_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_segments" ADD CONSTRAINT "contact_segments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_segments" ADD CONSTRAINT "contact_segments_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppression_list" ADD CONSTRAINT "suppression_list_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppression_list" ADD CONSTRAINT "suppression_list_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SenderIdentity" ADD CONSTRAINT "SenderIdentity_sendingDomainId_fkey" FOREIGN KEY ("sendingDomainId") REFERENCES "SendingDomain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_emailContentId_fkey" FOREIGN KEY ("emailContentId") REFERENCES "EmailContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_senderIdentityId_fkey" FOREIGN KEY ("senderIdentityId") REFERENCES "SenderIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_replyToIdentityId_fkey" FOREIGN KEY ("replyToIdentityId") REFERENCES "SenderIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_sendingDomainId_fkey" FOREIGN KEY ("sendingDomainId") REFERENCES "SendingDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbTestVariant" ADD CONSTRAINT "AbTestVariant_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbTestVariant" ADD CONSTRAINT "AbTestVariant_emailContentId_fkey" FOREIGN KEY ("emailContentId") REFERENCES "EmailContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_sendingDomainId_fkey" FOREIGN KEY ("sendingDomainId") REFERENCES "SendingDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_senderIdentityId_fkey" FOREIGN KEY ("senderIdentityId") REFERENCES "SenderIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
