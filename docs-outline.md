# Kibamail Documentation Outline

> Complete documentation structure based on actual platform features.
> This outline defines all pages and their exact content.

---

## Documentation Architecture

The documentation is organized into **4 main pillars**:

1. **Documentation** (`/docs`) - Getting started, concepts, and feature guides
2. **API Reference** (`/docs/api`) - Complete API endpoint documentation
3. **SDKs** (`/docs/sdks`) - Language-specific SDK guides
4. **Guides** (`/docs/guides`) - Best practices, deliverability, and tutorials

---

## 1. Documentation Section (`/docs`)

### 1.1 Getting Started

#### `/docs` - Introduction
**Purpose**: Welcome page and navigation hub

**Content**:
- What is Kibamail (1-2 sentences)
- Quick navigation cards:
  - "Send your first email" → Quick Start
  - "Manage contacts" → Contacts docs
  - "Create broadcasts" → Broadcasts docs
  - "Set up automations" → Automations docs
- Feature overview grid (Broadcasts, Contacts, Forms, Automations, Domains, Analytics)
- Link to API Reference
- Support/help resources

---

#### `/docs/quick-start` - Quick Start
**Purpose**: Get users sending their first email in under 5 minutes

**Content**:
1. **Prerequisites**
   - Create a Kibamail account
   - Get your API key (link to API keys page)

2. **Install the SDK** (tabbed: Node.js, Python, PHP, Go, Ruby, cURL)
   ```bash
   npm install @kibamail/sdk
   ```

3. **Send your first email**
   - Complete working code example
   - Test email address for sandbox mode

4. **Next steps**
   - Add a sending domain
   - Import contacts
   - Create your first broadcast

---

#### `/docs/installation` - Installation & Setup
**Purpose**: Complete setup guide for new workspaces

**Content**:
1. **Creating a workspace**
   - Workspace vs account explanation
   - Team member invitations

2. **Adding a sending domain**
   - Why you need a domain
   - Link to domain setup guide

3. **Creating API keys**
   - Dashboard walkthrough
   - Scope selection guide
   - Security best practices

4. **Environment setup**
   - SDK installation per language
   - Environment variables
   - Test vs production modes

---

### 1.2 Core Concepts

#### `/docs/contacts` - Contacts
**Purpose**: Complete guide to contact management

**Content**:
1. **What is a contact?**
   - Contact data model (email, name, phone, country, timezone, city)
   - Contact statuses explained:
     - SUBSCRIBED - Active, receiving emails
     - UNSUBSCRIBED - Opted out
     - BOUNCED - Email bounced
     - COMPLAINED - Marked as spam
     - UNCONFIRMED - Pending double opt-in
     - ARCHIVED - Soft deleted

2. **Contact sources**
   - MANUAL - Created via dashboard
   - API - Created via API
   - FORM - Created via form submission
   - IMPORT - Created via CSV import

3. **Creating contacts**
   - Via dashboard
   - Via API (code example)
   - Via forms

4. **Searching and filtering contacts**
   - Search by email
   - Filter by status
   - Filter by custom properties

5. **Updating contacts**
   - Update via dashboard
   - Update via API
   - Bulk updates

6. **Deleting contacts**
   - Soft delete vs hard delete
   - GDPR considerations

---

#### `/docs/contact-properties` - Custom Properties
**Purpose**: Guide to extending contact data with custom fields

**Content**:
1. **What are custom properties?**
   - Extend contact profiles
   - Use in segmentation and personalization

2. **Property types**
   - STRING - Text values (up to 255 characters)
   - NUMBER - Numeric values (decimals supported)
   - DATE - Timestamps (Unix milliseconds)

3. **Creating properties**
   - Via dashboard
   - Via API
   - Property limits (35 numeric + 50 string slots)

4. **Using properties**
   - In email personalization: `{{contact.company_name}}`
   - In segment conditions
   - In automation triggers

5. **Best practices**
   - Naming conventions
   - When to use each type
   - Default values

---

#### `/docs/topics` - Topics (Interest Lists)
**Purpose**: Explain topic-based subscription management

**Content**:
1. **What are topics?**
   - Interest-based subscription categories
   - Allow contacts to choose what they receive
   - Examples: Newsletter, Product Updates, Promotions

2. **Topic visibility**
   - PUBLIC - Visible on preference pages
   - PRIVATE - Internal use only

3. **Default opt-in behavior**
   - Auto-subscribe new contacts
   - Manual subscription

4. **Creating topics**
   - Via dashboard
   - Via API

5. **Managing subscriptions**
   - Subscribe contacts to topics
   - Unsubscribe from specific topics
   - View topic subscribers

6. **Using topics in broadcasts**
   - Send to specific topic subscribers
   - Topic-based personalization

---

#### `/docs/segments` - Segments
**Purpose**: Guide to audience segmentation

**Content**:
1. **What are segments?**
   - Group contacts by shared criteria
   - Dynamic vs static segments

2. **Dynamic segments**
   - Condition-based membership
   - Auto-updated when contacts change
   - Condition types:
     - Field equals/not equals
     - Field contains
     - Field greater than/less than
     - AND/OR logic

3. **Static segments**
   - Manual membership
   - Bulk add/remove contacts
   - Use cases (VIP lists, event attendees)

4. **Building segment conditions**
   - Available fields (email, status, custom properties)
   - Operators explained
   - Combining conditions

5. **Using segments**
   - As broadcast audience
   - As automation triggers (segment entry/exit)
   - In reporting

---

#### `/docs/broadcasts` - Broadcasts (Email Campaigns)
**Purpose**: Complete guide to creating and sending email campaigns

**Content**:
1. **What is a broadcast?**
   - One-time email to a group of contacts
   - Also known as campaigns or newsletters

2. **Creating a broadcast**
   - Name and description
   - Email content (subject, preview, body)
   - Editor overview

3. **Selecting your audience**
   - Send to all contacts
   - Send to topic subscribers
   - Send to segment members

4. **Sender configuration**
   - Selecting sender identity
   - Reply-to address
   - Sending domain

5. **Scheduling**
   - Send immediately
   - Schedule for later
   - Timezone considerations

6. **Tracking options**
   - Open tracking
   - Click tracking
   - How tracking works

7. **A/B testing**
   - Creating variants
   - Variant weights
   - Winning criteria (opens, clicks)
   - Waiting time before winner selection

8. **Broadcast statuses**
   - DRAFT - Being edited
   - QUEUED_FOR_SENDING - Scheduled
   - SENDING - In progress
   - SENT - Completed
   - SENDING_FAILED - Error occurred

9. **Readiness checklist**
   - Verified sender domain
   - Subject line set
   - Unsubscribe link present
   - Valid links in content
   - Recipients available

---

#### `/docs/email-editor` - Email Editor
**Purpose**: Guide to using the email content editor

**Content**:
1. **Editor overview**
   - Visual editor interface
   - Available components

2. **Adding content**
   - Text blocks
   - Images (upload or URL)
   - Buttons
   - Dividers
   - Spacers

3. **Personalization variables**
   - Contact fields: `{{contact.first_name}}`
   - Custom properties: `{{contact.company}}`
   - Special variables:
     - `{{unsubscribe_url}}` - Required
     - `{{preferences_url}}`
     - `{{view_in_browser_url}}`

4. **Styling**
   - Canvas styles (background, width)
   - Component styles
   - Mobile responsiveness

5. **Preview and testing**
   - Desktop/mobile preview
   - Send test email

---

#### `/docs/forms` - Forms
**Purpose**: Guide to form creation and management

**Content**:
1. **What are forms?**
   - Collect subscriber information
   - Embed on websites

2. **Form types**
   - SIGN_UP - Collect new subscribers
   - SURVEY - Collect information from existing contacts

3. **Display modes**
   - INLINE_EMBED - Embed in page content
   - POPUP - Modal overlay

4. **Building forms**
   - Adding fields
   - Field types (email, text, select, checkbox, etc.)
   - Required vs optional fields
   - Field validation

5. **Form settings**
   - Success message
   - Redirect URL
   - Double opt-in
   - Topic subscriptions

6. **Form versioning**
   - Draft and publish workflow
   - Version history
   - Rollback

7. **Embedding forms**
   - JavaScript embed code
   - HTML embed code
   - React component

8. **Form submissions**
   - Viewing submissions
   - Submission status (pending, processed, spam, failed)
   - Contact creation behavior

9. **Analytics**
   - Page views
   - Conversion rates
   - Submission sources

---

#### `/docs/automations` - Automations
**Purpose**: Complete guide to email automation workflows

**Content**:
1. **What are automations?**
   - Automated email sequences
   - Triggered by events
   - Visual workflow builder

2. **Automation triggers**
   - **CONTACT_SUBSCRIBED** - When contact subscribes
   - **PROPERTY_UPDATED** - When contact property changes
   - **FORM_SUBMITTED** - When form is submitted
   - **SEGMENT_ENTRY** - When contact enters segment
   - **SEGMENT_EXIT** - When contact exits segment
   - **EMAIL_ENGAGEMENT** - When email is opened/clicked
   - **API** - Triggered via API call
   - **EVENT** - Custom event occurs

3. **Automation actions**
   - **Send Email** - Send an email to the contact
   - **Send Webhook** - Call external webhook
   - **Update Contact** - Modify contact properties
   - **Unsubscribe Contact** - Remove from list
   - **Add to Topic** - Subscribe to topic
   - **Remove from Topic** - Unsubscribe from topic

4. **Automation rules**
   - **If/Else** - Conditional branching
   - **Percentage Split** - A/B testing (e.g., 50/50)
   - **Time Delay** - Wait before next action

5. **Building automations**
   - Visual workflow editor
   - Adding nodes
   - Connecting nodes
   - Testing workflows

6. **Automation states**
   - DRAFT - Being edited
   - PUBLISHED - Active and running
   - ARCHIVED - Disabled

7. **Version management**
   - Creating new versions
   - Publishing versions
   - Rolling back

8. **Automation runs**
   - Active runs
   - Completed runs
   - Failed runs
   - Canceling runs

---

#### `/docs/contact-imports` - Importing Contacts
**Purpose**: Guide to bulk contact imports

**Content**:
1. **Supported formats**
   - CSV files
   - File size limits

2. **Preparing your file**
   - Required columns (email)
   - Optional columns
   - Encoding (UTF-8)

3. **Column mapping**
   - Map CSV columns to contact fields
   - Map to custom properties
   - Skip columns

4. **Import options**
   - Update existing contacts
   - Auto-subscribe to topics
   - Skip duplicates

5. **Import process**
   - Upload file
   - Configure mapping
   - Start import
   - Monitor progress

6. **Import statuses**
   - PENDING - Waiting to start
   - QUEUED - In queue
   - PROCESSING - Running
   - COMPLETED - Finished
   - FAILED - Error occurred
   - CANCELLED - Stopped by user

7. **Handling errors**
   - Invalid emails
   - Missing required fields
   - Error reports

---

### 1.3 Sending Infrastructure

#### `/docs/sending-domains` - Sending Domains
**Purpose**: Complete guide to domain setup and authentication

**Content**:
1. **Why you need a sending domain**
   - Email authentication
   - Deliverability improvement
   - Brand recognition

2. **Adding a domain**
   - Enter domain name
   - Generated DNS records

3. **DNS records explained**
   - **DKIM** - Email signing
     - Record type: TXT
     - Subdomain: `kiba._domainkey.yourdomain.com`
     - Purpose: Proves email authenticity
   - **Return Path (SPF)** - Bounce handling
     - Record type: CNAME
     - Subdomain: `bounce.yourdomain.com`
     - Purpose: Receive bounces
   - **Tracking Domain** - Click/open tracking
     - Record type: CNAME
     - Subdomain: `e.yourdomain.com`
     - Purpose: Custom tracking URLs

4. **DMARC setup**
   - What is DMARC
   - DMARC record format
   - Reporting configuration
   - Recommended policies

5. **Verification**
   - Verify DNS records
   - Verification status
   - Troubleshooting failed verification

6. **Domain warmup**
   - Why warmup matters
   - Warmup tiers explained:
     - Tier 1: 100/day, 10/hour (Entry)
     - Tier 2: 200/day, 20/hour (Starter)
     - Tier 3: 250/day, 50/hour (Basic)
     - Tier 4: 500/day, 100/hour (Growing)
     - Tier 5: 1,000/day, 200/hour (Developing)
     - Tier 6: 2,500/day, 500/hour (Established)
     - Tier 7: 5,000/day, 1,000/hour (Trusted)
     - Tier 8: 10,000/day, 2,000/hour (Professional)
   - Progression criteria

7. **Managing multiple domains**
   - When to use multiple domains
   - Domain selection per broadcast

---

#### `/docs/sender-identities` - Sender Identities
**Purpose**: Guide to managing sender addresses

**Content**:
1. **What is a sender identity?**
   - From name and email
   - Reusable across broadcasts

2. **Creating identities**
   - Name (appears as sender name)
   - Email local part (before @)
   - Associated domain

3. **Email verification**
   - Verification process
   - Verification codes
   - Re-verification

4. **Reply-to configuration**
   - Different reply-to address
   - Use cases

5. **Using sender identities**
   - Select in broadcasts
   - Select in automations

---

#### `/docs/tracking` - Email Tracking
**Purpose**: Explain how email tracking works

**Content**:
1. **Open tracking**
   - How it works (tracking pixel)
   - Enabling/disabling
   - Accuracy considerations
   - Privacy modes impact

2. **Click tracking**
   - How it works (URL rewriting)
   - Enabling/disabling
   - Links tracked
   - Disabling for specific links (`disable-tracking="true"`)

3. **Image proxying**
   - How it works
   - Benefits (analytics, privacy)

4. **Tracking domain**
   - Why use a custom tracking domain
   - SSL/TLS considerations

5. **Tracking data collected**
   - Geographic location (country, state, city)
   - Device information (type, browser, OS)
   - Timestamps

---

### 1.4 Analytics & Events

#### `/docs/events` - Events & Analytics
**Purpose**: Guide to email event tracking and analytics

**Content**:
1. **Event types**
   - **Queued** - Email queued for sending
   - **Delivery** - Successfully delivered
   - **Bounce** - Failed to deliver
     - Hard bounce
     - Soft bounce
   - **Open** - Email opened
   - **Click** - Link clicked
   - **Complaint** - Marked as spam
   - **Rejection** - Rejected by server

2. **Event data**
   - Recipient information
   - Timestamps
   - Geographic data
   - Device data
   - SMTP response codes

3. **Viewing events**
   - Per-broadcast analytics
   - Contact activity
   - Export options

4. **Bounce handling**
   - Bounce classifications
   - Automatic suppression
   - Managing bounced contacts

5. **Complaint handling**
   - Feedback loops
   - Automatic suppression
   - Best practices

---

#### `/docs/suppression-list` - Suppression List
**Purpose**: Guide to managing suppressed contacts

**Content**:
1. **What is a suppression list?**
   - Contacts who should not receive email
   - Compliance requirement

2. **Suppression scopes**
   - GLOBAL - No emails at all
   - TOPIC - Suppressed from specific topic only

3. **Suppression reasons**
   - MANUAL - Manually added
   - BOUNCED - Email bounced
   - COMPLAINED - Marked as spam
   - UNSUBSCRIBED - Opted out
   - LEGAL_REQUEST - Legal/GDPR request
   - INVALID_EMAIL - Invalid address

4. **Automatic suppressions**
   - Hard bounces → Automatic suppression
   - Complaints → Automatic suppression
   - Unsubscribes → Automatic suppression

5. **Managing suppressions**
   - View suppressed contacts
   - Add to suppression list
   - Remove from suppression list (with caution)

6. **Compliance considerations**
   - CAN-SPAM requirements
   - GDPR requirements
   - Best practices

---

### 1.5 Integrations

#### `/docs/webhooks` - Webhooks
**Purpose**: Guide to webhook integrations

**Content**:
1. **What are webhooks?**
   - Real-time event notifications
   - HTTP POST to your URL

2. **Available events**
   - email.delivered
   - email.bounced
   - email.opened
   - email.clicked
   - email.complained
   - contact.created
   - contact.updated
   - contact.unsubscribed
   - form.submitted

3. **Creating webhooks**
   - Destination URL
   - Event selection
   - Authentication headers

4. **Webhook payload**
   - Payload structure
   - Event-specific data
   - Timestamps

5. **Security**
   - Signature verification
   - HTTPS requirement

6. **Retry behavior**
   - Automatic retries
   - Exponential backoff
   - Failure notifications

7. **Testing webhooks**
   - Test deliveries
   - Viewing delivery logs

8. **Managing webhooks**
   - Enable/disable
   - View event history
   - Troubleshooting

---

#### `/docs/api-keys` - API Keys
**Purpose**: Guide to API key management

**Content**:
1. **What are API keys?**
   - Authentication for API access
   - Scope-based permissions

2. **Creating API keys**
   - Name your key
   - Select scopes
   - Key format: `kb_xxxxx...`

3. **Available scopes**

   **API Keys**
   - `read:api-keys` - View API keys
   - `write:api-keys` - Create API keys
   - `delete:api-keys` - Delete API keys

   **Contacts**
   - `read:contacts` - View contacts
   - `write:contacts` - Create contacts
   - `update:contacts` - Update contacts
   - `delete:contacts` - Delete contacts

   **Topics**
   - `read:topics` - View topics
   - `write:topics` - Create topics
   - `update:topics` - Update topics
   - `delete:topics` - Delete topics

   **Segments**
   - `read:segments` - View segments
   - `write:segments` - Create segments
   - `update:segments` - Update segments
   - `delete:segments` - Delete segments

   **Suppression List**
   - `read:suppression-list` - View suppressions
   - `write:suppression-list` - Add suppressions
   - `update:suppression-list` - Update suppressions
   - `delete:suppression-list` - Remove suppressions

4. **Security best practices**
   - Never expose keys in client-side code
   - Use environment variables
   - Rotate keys regularly
   - Use minimum required scopes

5. **Revoking keys**
   - When to revoke
   - Immediate effect

---

### 1.6 Settings & Management

#### `/docs/workspaces` - Workspaces
**Purpose**: Guide to workspace management

**Content**:
1. **What is a workspace?**
   - Isolated environment for your organization
   - Separate contacts, domains, broadcasts

2. **Creating workspaces**
   - Workspace name
   - Logo upload

3. **Team management**
   - Inviting team members
   - Member roles
   - Removing members

4. **Workspace settings**
   - General settings
   - Logo customization
   - Activation/deactivation

---

---

## 2. API Reference Section (`/docs/api`)

### 2.1 Overview

#### `/docs/api` - API Introduction
**Purpose**: API overview and getting started

**Content**:
- Base URL: `https://api.kibamail.com/v1`
- API versioning
- Content type: `application/json`
- Link to authentication
- Link to error handling

---

#### `/docs/api/authentication` - Authentication
**Purpose**: How to authenticate API requests

**Content**:
1. **API Key authentication**
   - Header: `Authorization: Bearer kb_xxxxx...`
   - All requests require authentication

2. **Getting your API key**
   - Dashboard location
   - Link to API keys guide

3. **Example request**
   ```bash
   curl https://api.kibamail.com/v1/contacts \
     -H "Authorization: Bearer kb_your_api_key"
   ```

---

#### `/docs/api/pagination` - Pagination
**Purpose**: Explain cursor-based pagination

**Content**:
1. **Cursor-based pagination**
   - More efficient than offset
   - Stable with changing data

2. **Parameters**
   - `limit` - Results per page (default: 25, max: 100)
   - `after` - Cursor for next page
   - `before` - Cursor for previous page

3. **Response structure**
   ```json
   {
     "object": "list",
     "data": [...],
     "has_more": true,
     "first_id": "cont_xxx",
     "last_id": "cont_yyy"
   }
   ```

4. **Pagination example**
   - Getting next page
   - Getting previous page

---

#### `/docs/api/errors` - Error Handling
**Purpose**: API error codes and handling

**Content**:
1. **Error response format**
   ```json
   {
     "error": {
       "code": "validation_error",
       "message": "Email is required",
       "details": {...}
     }
   }
   ```

2. **HTTP status codes**
   - 200 - Success
   - 201 - Created
   - 204 - No content
   - 400 - Bad request
   - 401 - Unauthorized
   - 403 - Forbidden
   - 404 - Not found
   - 409 - Conflict
   - 422 - Validation error
   - 429 - Rate limited
   - 500 - Server error

3. **Error codes**
   - `validation_error`
   - `not_found`
   - `unauthorized`
   - `rate_limit_exceeded`
   - `internal_error`

4. **Handling errors**
   - Retry strategies
   - Error logging

---

#### `/docs/api/rate-limits` - Rate Limits
**Purpose**: API rate limiting information

**Content**:
1. **Rate limits**
   - Requests per minute
   - Burst limits

2. **Rate limit headers**
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset`

3. **Handling rate limits**
   - Check headers
   - Implement backoff
   - Queue requests

---

### 2.2 API Endpoints

#### `/docs/api/contacts` - Contacts API
**Purpose**: Complete contacts API reference

**Content**:

**POST /api/v1/contacts** - Create contact
- Parameters: email (required), firstName, lastName, phone, country, timezone, city, status, properties
- Scopes: `write:contacts`
- Request/response examples

**GET /api/v1/contacts** - List contacts
- Parameters: limit, after, before, status
- Scopes: `read:contacts`
- Response: Paginated list

**GET /api/v1/contacts/{id}** - Get contact
- Scopes: `read:contacts`

**PUT /api/v1/contacts/{id}** - Update contact
- Scopes: `update:contacts`

**DELETE /api/v1/contacts/{id}** - Delete contact
- Scopes: `delete:contacts`

**GET /api/v1/contacts/search** - Search contacts
- Parameters: query, status, properties
- Scopes: `read:contacts`

---

#### `/docs/api/contact-properties` - Contact Properties API
**Purpose**: Custom properties API reference

**Content**:

**POST /api/v1/contact-properties** - Create property
**GET /api/v1/contact-properties** - List properties
**GET /api/v1/contact-properties/{id}** - Get property
**PUT /api/v1/contact-properties/{id}** - Update property
**DELETE /api/v1/contact-properties/{id}** - Delete property

---

#### `/docs/api/topics` - Topics API
**Purpose**: Topics API reference

**Content**:

**POST /api/v1/topics** - Create topic
**GET /api/v1/topics** - List topics
**GET /api/v1/topics/{id}** - Get topic
**PUT /api/v1/topics/{id}** - Update topic
**DELETE /api/v1/topics/{id}** - Delete topic
**GET /api/v1/topics/{id}/contacts** - Get topic contacts

---

#### `/docs/api/segments` - Segments API
**Purpose**: Segments API reference

**Content**:

**POST /api/v1/segments** - Create segment
**GET /api/v1/segments** - List segments
**GET /api/v1/segments/{id}** - Get segment
**PUT /api/v1/segments/{id}** - Update segment
**DELETE /api/v1/segments/{id}** - Delete segment
**GET /api/v1/segments/{id}/contacts** - Get segment contacts

---

#### `/docs/api/forms` - Forms API
**Purpose**: Forms API reference

**Content**:

**POST /api/v1/forms** - Create form
**GET /api/v1/forms** - List forms
**GET /api/v1/forms/{id}** - Get form
**PUT /api/v1/forms/{id}** - Update form
**DELETE /api/v1/forms/{id}** - Delete form
**POST /api/v1/forms/{id}/publish** - Publish form
**GET /api/v1/forms/{id}/versions** - List versions
**GET /api/v1/forms/{id}/submissions** - Get submissions

---

#### `/docs/api/automations` - Automations API
**Purpose**: Automations API reference

**Content**:

**POST /api/v1/automations** - Create automation
**GET /api/v1/automations** - List automations
**GET /api/v1/automations/{id}** - Get automation
**PUT /api/v1/automations/{id}** - Update automation
**DELETE /api/v1/automations/{id}** - Delete automation
**POST /api/v1/automations/{id}/publish** - Publish
**POST /api/v1/automations/{id}/archive** - Archive
**GET /api/v1/automations/{id}/versions** - List versions
**POST /api/v1/automations/{id}/versions** - Create version
**POST /api/v1/automations/{id}/rollback** - Rollback

---

#### `/docs/api/domains` - Domains API
**Purpose**: Sending domains API reference

**Content**:

**POST /api/v1/domains** - Add domain
**GET /api/v1/domains** - List domains
**GET /api/v1/domains/{id}** - Get domain
**PUT /api/v1/domains/{id}** - Update domain
**DELETE /api/v1/domains/{id}** - Delete domain
**POST /api/v1/domains/{id}/verify** - Verify DNS

---

#### `/docs/api/api-keys` - API Keys API
**Purpose**: API keys management API reference

**Content**:

**POST /api/v1/api-keys** - Create API key
**GET /api/v1/api-keys** - List API keys
**GET /api/v1/api-keys/{id}** - Get API key
**DELETE /api/v1/api-keys/{id}** - Revoke API key

---

---

## 3. SDKs Section (`/docs/sdks`)

### 3.1 Overview

#### `/docs/sdks` - SDKs Overview
**Purpose**: Overview of available SDKs

**Content**:
- Available SDKs list with icons
- Installation quick reference
- Links to language-specific docs
- Community SDKs (if any)

---

### 3.2 Node.js SDK

#### `/docs/sdks/nodejs` - Node.js SDK
**Purpose**: Node.js SDK complete guide

**Content**:
1. **Installation**
   ```bash
   npm install @kibamail/node
   # or
   yarn add @kibamail/node
   # or
   pnpm add @kibamail/node
   ```

2. **Quick start**
   ```typescript
   import { Kibamail } from '@kibamail/node';

   const kibamail = new Kibamail('kb_your_api_key');

   await kibamail.contacts.create({
     email: 'user@example.com',
     firstName: 'John'
   });
   ```

3. **Configuration**
   - API key
   - Base URL (for self-hosted)
   - Timeout

4. **Available methods**
   - contacts.create()
   - contacts.list()
   - contacts.get()
   - contacts.update()
   - contacts.delete()
   - topics.create()
   - topics.list()
   - segments.create()
   - segments.list()
   - forms.create()
   - forms.publish()
   - automations.create()
   - automations.publish()
   - domains.create()
   - domains.verify()

5. **Error handling**
   ```typescript
   try {
     await kibamail.contacts.create({...});
   } catch (error) {
     if (error instanceof KibamailError) {
       console.log(error.code);
     }
   }
   ```

6. **TypeScript support**
   - Full type definitions
   - Type exports

---

### 3.3 Python SDK

#### `/docs/sdks/python` - Python SDK
**Purpose**: Python SDK complete guide

**Content**:
1. **Installation**
   ```bash
   pip install kibamail
   ```

2. **Quick start**
   ```python
   from kibamail import Kibamail

   client = Kibamail(api_key='kb_your_api_key')

   client.contacts.create(
       email='user@example.com',
       first_name='John'
   )
   ```

3. **Async support**
   ```python
   from kibamail import AsyncKibamail

   async with AsyncKibamail('kb_your_api_key') as client:
       await client.contacts.create(...)
   ```

4. **Available methods**
5. **Error handling**
6. **Type hints**

---

### 3.4 PHP SDK

#### `/docs/sdks/php` - PHP SDK
**Purpose**: PHP SDK complete guide

**Content**:
1. **Installation**
   ```bash
   composer require kibamail/kibamail-php
   ```

2. **Quick start**
   ```php
   use Kibamail\Kibamail;

   $kibamail = new Kibamail('kb_your_api_key');

   $kibamail->contacts->create([
       'email' => 'user@example.com',
       'firstName' => 'John'
   ]);
   ```

3. **Laravel integration**
   - Service provider
   - Facade usage
   - Config publishing

4. **Available methods**
5. **Error handling**

---

### 3.5 Go SDK

#### `/docs/sdks/go` - Go SDK
**Purpose**: Go SDK complete guide

**Content**:
1. **Installation**
   ```bash
   go get github.com/kibamail/kibamail-go
   ```

2. **Quick start**
   ```go
   import "github.com/kibamail/kibamail-go"

   client := kibamail.NewClient("kb_your_api_key")

   contact, err := client.Contacts.Create(&kibamail.ContactParams{
       Email:     "user@example.com",
       FirstName: "John",
   })
   ```

3. **Available methods**
4. **Error handling**

---

### 3.6 Ruby SDK

#### `/docs/sdks/ruby` - Ruby SDK
**Purpose**: Ruby SDK complete guide

**Content**:
1. **Installation**
   ```bash
   gem install kibamail
   ```

2. **Quick start**
   ```ruby
   require 'kibamail'

   Kibamail.api_key = 'kb_your_api_key'

   Kibamail::Contact.create(
     email: 'user@example.com',
     first_name: 'John'
   )
   ```

3. **Rails integration**
4. **Available methods**
5. **Error handling**

---

---

## 4. Guides Section (`/docs/guides`)

### 4.1 Deliverability

#### `/docs/guides` - Guides Overview
**Purpose**: Guides landing page

**Content**:
- Guide categories overview
- Featured guides
- Popular guides

---

#### `/docs/guides/deliverability` - Email Deliverability Guide
**Purpose**: Comprehensive deliverability guide

**Content**:
1. **What is deliverability?**
   - Inbox placement vs delivery
   - Why it matters

2. **Factors affecting deliverability**
   - Sender reputation
   - Content quality
   - List hygiene
   - Authentication

3. **Measuring deliverability**
   - Bounce rates
   - Complaint rates
   - Open rates as proxy

4. **Improving deliverability**
   - Authentication (DKIM, SPF, DMARC)
   - List cleaning
   - Engagement optimization
   - Content best practices

---

#### `/docs/guides/dkim-spf` - DKIM & SPF Setup
**Purpose**: Email authentication setup guide

**Content**:
1. **What is DKIM?**
   - How it works
   - Why it matters

2. **Setting up DKIM**
   - Add domain in Kibamail
   - Add DNS record
   - Verify setup

3. **What is SPF?**
   - How it works
   - Why it matters

4. **Setting up SPF**
   - Understanding SPF records
   - Adding Kibamail to SPF
   - Verifying setup

5. **Troubleshooting**
   - Common issues
   - Testing tools

---

#### `/docs/guides/dmarc` - DMARC Configuration
**Purpose**: DMARC setup and policy guide

**Content**:
1. **What is DMARC?**
   - Alignment with DKIM and SPF
   - Policy options

2. **DMARC policies**
   - p=none (monitoring)
   - p=quarantine (soft enforcement)
   - p=reject (strict enforcement)

3. **Setting up DMARC**
   - Create DMARC record
   - Configure reporting
   - Add to DNS

4. **DMARC reporting**
   - Understanding reports
   - Kibamail DMARC reporting code
   - Aggregate reports

5. **Progressive enforcement**
   - Start with p=none
   - Monitor reports
   - Move to quarantine/reject

---

#### `/docs/guides/domain-warmup` - Domain Warmup
**Purpose**: IP/domain warming guide

**Content**:
1. **What is domain warmup?**
   - Building sender reputation
   - Why new domains need warmup

2. **Kibamail warmup tiers**
   - Tier progression explained
   - Daily and hourly limits
   - Automatic enforcement

3. **Warmup best practices**
   - Start with engaged subscribers
   - Gradual volume increase
   - Monitor bounce/complaint rates

4. **Warmup timeline**
   - Expected progression
   - What can slow you down

5. **Monitoring warmup**
   - Key metrics to watch
   - When to pause

---

### 4.2 Best Practices

#### `/docs/guides/list-hygiene` - List Hygiene
**Purpose**: Guide to maintaining clean email lists

**Content**:
1. **Why list hygiene matters**
   - Impact on deliverability
   - Cost savings

2. **Identifying problematic contacts**
   - Hard bounces
   - Soft bounces
   - Inactive subscribers
   - Spam complainers

3. **Cleaning strategies**
   - Remove bounced contacts
   - Re-engagement campaigns
   - Sunset policies

4. **Prevention**
   - Double opt-in
   - Email verification at signup
   - Regular cleaning schedule

---

#### `/docs/guides/email-content` - Email Content Best Practices
**Purpose**: Guide to writing effective emails

**Content**:
1. **Subject lines**
   - Length recommendations
   - Avoiding spam triggers
   - Personalization

2. **Preview text**
   - How it appears
   - Writing effective previews

3. **Email body**
   - Content structure
   - Image to text ratio
   - Mobile optimization

4. **Call to action**
   - Button best practices
   - Link placement

5. **Unsubscribe handling**
   - Required unsubscribe link
   - One-click unsubscribe
   - Preference center

---

### 4.3 Use Cases

#### `/docs/guides/transactional-emails` - Transactional Emails
**Purpose**: Guide to sending transactional emails

**Content**:
1. **What are transactional emails?**
   - Definition
   - Examples (receipts, confirmations, password resets)

2. **Transactional vs marketing**
   - Legal differences
   - Best practices differences

3. **Sending transactional emails**
   - Using the API
   - Triggers and automations

4. **Best practices**
   - Delivery speed
   - Content focus
   - Minimal marketing content

---

#### `/docs/guides/newsletters` - Newsletters
**Purpose**: Guide to sending newsletters

**Content**:
1. **Newsletter strategy**
   - Frequency
   - Content planning
   - Audience building

2. **Creating newsletters**
   - Using broadcasts
   - Template design
   - Personalization

3. **Growing subscribers**
   - Forms and opt-in
   - Lead magnets
   - Social promotion

4. **Measuring success**
   - Key metrics
   - A/B testing
   - Iteration

---

#### `/docs/guides/welcome-series` - Welcome Email Series
**Purpose**: Guide to onboarding automations

**Content**:
1. **Why welcome emails matter**
   - First impressions
   - Engagement baseline

2. **Designing a welcome series**
   - Email 1: Welcome
   - Email 2: Value proposition
   - Email 3: Getting started
   - Email 4: Engagement prompt

3. **Building the automation**
   - Trigger: Contact subscribed
   - Time delays between emails
   - Conditional paths

4. **Optimization**
   - Testing subject lines
   - Testing timing
   - Monitoring completion rates

---

#### `/docs/guides/ab-testing` - A/B Testing
**Purpose**: Guide to A/B testing emails

**Content**:
1. **What to test**
   - Subject lines
   - Preview text
   - Send times
   - Content variations

2. **Setting up A/B tests**
   - Creating variants
   - Setting weights
   - Choosing winning criteria

3. **Statistical significance**
   - Sample size requirements
   - Test duration

4. **Analyzing results**
   - Interpreting metrics
   - Implementing winners

---

---

## 5. Additional Pages

### DNS Provider Guides (Under `/docs/guides/dns/`)

#### `/docs/guides/dns/cloudflare` - Cloudflare DNS Setup
#### `/docs/guides/dns/godaddy` - GoDaddy DNS Setup
#### `/docs/guides/dns/namecheap` - Namecheap DNS Setup
#### `/docs/guides/dns/route53` - AWS Route 53 DNS Setup
#### `/docs/guides/dns/google-domains` - Google Domains DNS Setup

Each DNS guide includes:
- Step-by-step screenshots
- Where to find DNS settings
- Adding TXT records (DKIM)
- Adding CNAME records (Return path, Tracking)
- Verification timing
- Troubleshooting

---

### Troubleshooting Pages (Under `/docs/guides/troubleshooting/`)

#### `/docs/guides/troubleshooting/spam-folder` - Emails Going to Spam
**Content**:
- Common causes
- Checking authentication
- Content improvements
- Reputation recovery

#### `/docs/guides/troubleshooting/bounces` - Handling Bounces
**Content**:
- Bounce types
- Common bounce codes
- Resolution steps
- Prevention

#### `/docs/guides/troubleshooting/verification-failed` - Domain Verification Failed
**Content**:
- DNS propagation timing
- Common DNS issues
- Checking records
- Contact support

---

---

## Implementation Notes

### Page Template Standards

Each documentation page should include:
1. **Title** - Clear page title
2. **Description** - One-sentence description for SEO
3. **Table of contents** - Auto-generated from headings
4. **Content** - Main documentation content
5. **Related pages** - Links to related documentation
6. **Feedback** - "Was this helpful?" widget
7. **Last updated** - Timestamp

### Code Example Standards

- **Always include complete, working examples**
- **Support multiple languages** (Node.js, Python, PHP, Go, Ruby, cURL)
- **Use syntax highlighting**
- **Include copy button**
- **Show both request and response**

### Navigation Priorities

**Primary navigation** (top-level):
1. Documentation
2. API Reference
3. SDKs
4. Guides

**Secondary navigation** (sidebar sections):
- Organized by user workflow
- Maximum 3 levels deep
- Clear section labels

---

## File Structure

```
docs/
├── page.tsx                          # /docs (Introduction)
├── quick-start/
│   └── page.tsx                      # /docs/quick-start
├── installation/
│   └── page.tsx                      # /docs/installation
├── contacts/
│   └── page.tsx                      # /docs/contacts
├── contact-properties/
│   └── page.tsx                      # /docs/contact-properties
├── topics/
│   └── page.tsx                      # /docs/topics
├── segments/
│   └── page.tsx                      # /docs/segments
├── broadcasts/
│   └── page.tsx                      # /docs/broadcasts
├── email-editor/
│   └── page.tsx                      # /docs/email-editor
├── forms/
│   └── page.tsx                      # /docs/forms
├── automations/
│   └── page.tsx                      # /docs/automations
├── contact-imports/
│   └── page.tsx                      # /docs/contact-imports
├── sending-domains/
│   └── page.tsx                      # /docs/sending-domains
├── sender-identities/
│   └── page.tsx                      # /docs/sender-identities
├── tracking/
│   └── page.tsx                      # /docs/tracking
├── events/
│   └── page.tsx                      # /docs/events
├── suppression-list/
│   └── page.tsx                      # /docs/suppression-list
├── webhooks/
│   └── page.tsx                      # /docs/webhooks
├── api-keys/
│   └── page.tsx                      # /docs/api-keys
├── workspaces/
│   └── page.tsx                      # /docs/workspaces
├── api/
│   ├── page.tsx                      # /docs/api (Introduction)
│   ├── authentication/
│   │   └── page.tsx                  # /docs/api/authentication
│   ├── pagination/
│   │   └── page.tsx                  # /docs/api/pagination
│   ├── errors/
│   │   └── page.tsx                  # /docs/api/errors
│   ├── rate-limits/
│   │   └── page.tsx                  # /docs/api/rate-limits
│   ├── contacts/
│   │   └── page.tsx                  # /docs/api/contacts
│   ├── contact-properties/
│   │   └── page.tsx                  # /docs/api/contact-properties
│   ├── topics/
│   │   └── page.tsx                  # /docs/api/topics
│   ├── segments/
│   │   └── page.tsx                  # /docs/api/segments
│   ├── forms/
│   │   └── page.tsx                  # /docs/api/forms
│   ├── automations/
│   │   └── page.tsx                  # /docs/api/automations
│   ├── domains/
│   │   └── page.tsx                  # /docs/api/domains
│   └── api-keys/
│       └── page.tsx                  # /docs/api/api-keys
├── sdks/
│   ├── page.tsx                      # /docs/sdks (Overview)
│   ├── nodejs/
│   │   └── page.tsx                  # /docs/sdks/nodejs
│   ├── python/
│   │   └── page.tsx                  # /docs/sdks/python
│   ├── php/
│   │   └── page.tsx                  # /docs/sdks/php
│   ├── go/
│   │   └── page.tsx                  # /docs/sdks/go
│   └── ruby/
│       └── page.tsx                  # /docs/sdks/ruby
└── guides/
    ├── page.tsx                      # /docs/guides (Overview)
    ├── deliverability/
    │   └── page.tsx                  # /docs/guides/deliverability
    ├── dkim-spf/
    │   └── page.tsx                  # /docs/guides/dkim-spf
    ├── dmarc/
    │   └── page.tsx                  # /docs/guides/dmarc
    ├── domain-warmup/
    │   └── page.tsx                  # /docs/guides/domain-warmup
    ├── list-hygiene/
    │   └── page.tsx                  # /docs/guides/list-hygiene
    ├── email-content/
    │   └── page.tsx                  # /docs/guides/email-content
    ├── transactional-emails/
    │   └── page.tsx                  # /docs/guides/transactional-emails
    ├── newsletters/
    │   └── page.tsx                  # /docs/guides/newsletters
    ├── welcome-series/
    │   └── page.tsx                  # /docs/guides/welcome-series
    ├── ab-testing/
    │   └── page.tsx                  # /docs/guides/ab-testing
    ├── dns/
    │   ├── cloudflare/
    │   │   └── page.tsx              # /docs/guides/dns/cloudflare
    │   ├── godaddy/
    │   │   └── page.tsx              # /docs/guides/dns/godaddy
    │   ├── namecheap/
    │   │   └── page.tsx              # /docs/guides/dns/namecheap
    │   ├── route53/
    │   │   └── page.tsx              # /docs/guides/dns/route53
    │   └── google-domains/
    │       └── page.tsx              # /docs/guides/dns/google-domains
    └── troubleshooting/
        ├── spam-folder/
        │   └── page.tsx              # /docs/guides/troubleshooting/spam-folder
        ├── bounces/
        │   └── page.tsx              # /docs/guides/troubleshooting/bounces
        └── verification-failed/
            └── page.tsx              # /docs/guides/troubleshooting/verification-failed
```

---

## Summary Statistics

- **Total pages**: ~60 documentation pages
- **Documentation section**: 20 pages
- **API Reference section**: 13 pages
- **SDKs section**: 6 pages
- **Guides section**: 15+ pages
- **DNS guides**: 5 pages
- **Troubleshooting**: 3 pages

All pages based on **actual Kibamail features** - no features invented or assumed.
