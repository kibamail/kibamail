import Link from "next/link";
import { DocsContent } from "../_components/docs-content";
import type { TOCEntry } from "../_components/table-of-contents";

const tableOfContents: TOCEntry[] = [
  {
    level: 2,
    text: "Contact fields",
    slug: "contact-fields",
    children: [
      { level: 3, text: "Built-in fields", slug: "built-in-fields" },
      { level: 3, text: "Custom properties", slug: "custom-properties" },
    ],
  },
  {
    level: 2,
    text: "Contact status",
    slug: "contact-status",
  },
  {
    level: 2,
    text: "Managing contacts",
    slug: "managing-contacts",
    children: [
      { level: 3, text: "Adding contacts", slug: "adding-contacts" },
      { level: 3, text: "Importing contacts", slug: "importing-contacts" },
      { level: 3, text: "Updating contacts", slug: "updating-contacts" },
      { level: 3, text: "Deleting contacts", slug: "deleting-contacts" },
    ],
  },
  {
    level: 2,
    text: "Topics and subscriptions",
    slug: "topics-and-subscriptions",
  },
  {
    level: 2,
    text: "Segments",
    slug: "segments",
  },
  {
    level: 2,
    text: "Related",
    slug: "related",
  },
];

export default function ContactsPage() {
  return (
    <DocsContent
      title="Contacts"
      description="Contacts are the people you send emails to. Each contact has an email address, optional profile information, and subscription preferences that determine which emails they receive."
      category="Core Concepts"
      tableOfContents={tableOfContents}
      slug="contacts"
    >
      <section>
        <h2 id="contact-fields">Contact fields</h2>
        <p>
          Every contact has built-in fields for common data and supports custom
          properties for any additional information you need to store.
        </p>

        <h3 id="built-in-fields">Built-in fields</h3>
        <p>These fields are available on every contact:</p>

        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>email</code>
              </td>
              <td>string</td>
              <td>Yes</td>
              <td>
                The contact's email address. Must be unique within a workspace.
              </td>
            </tr>
            <tr>
              <td>
                <code>firstName</code>
              </td>
              <td>string</td>
              <td>No</td>
              <td>The contact's first name. Max 100 characters.</td>
            </tr>
            <tr>
              <td>
                <code>lastName</code>
              </td>
              <td>string</td>
              <td>No</td>
              <td>The contact's last name. Max 100 characters.</td>
            </tr>
            <tr>
              <td>
                <code>phone</code>
              </td>
              <td>string</td>
              <td>No</td>
              <td>Phone number in any format. Max 50 characters.</td>
            </tr>
            <tr>
              <td>
                <code>country</code>
              </td>
              <td>string</td>
              <td>No</td>
              <td>
                Two-letter country code (e.g., <code>US</code>, <code>GB</code>
                ).
              </td>
            </tr>
            <tr>
              <td>
                <code>city</code>
              </td>
              <td>string</td>
              <td>No</td>
              <td>The contact's city. Max 100 characters.</td>
            </tr>
            <tr>
              <td>
                <code>timezone</code>
              </td>
              <td>string</td>
              <td>No</td>
              <td>
                IANA timezone (e.g., <code>America/New_York</code>).
              </td>
            </tr>
            <tr>
              <td>
                <code>status</code>
              </td>
              <td>enum</td>
              <td>Auto</td>
              <td>
                Subscription status. Defaults to <code>SUBSCRIBED</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>subscribedAt</code>
              </td>
              <td>datetime</td>
              <td>Auto</td>
              <td>When the contact subscribed.</td>
            </tr>
            <tr>
              <td>
                <code>unsubscribedAt</code>
              </td>
              <td>datetime</td>
              <td>Auto</td>
              <td>When the contact unsubscribed (if applicable).</td>
            </tr>
          </tbody>
        </table>

        <h3 id="custom-properties">Custom properties</h3>
        <p>
          Store additional data using custom properties. You define properties
          at the workspace level, and they become available on all contacts.
          Properties have three types:
        </p>
        <ul>
          <li>
            <strong>String</strong> – Text up to 255 characters
          </li>
          <li>
            <strong>Number</strong> – Decimal numbers
          </li>
          <li>
            <strong>Date</strong> – Stored as Unix timestamps in milliseconds
          </li>
        </ul>
        <p>
          See{" "}
          <Link href="/docs/contact-properties">Custom Properties</Link>{" "}
          for setup instructions.
        </p>
      </section>

      <section>
        <h2 id="contact-status">Contact status</h2>
        <p>
          A contact's status determines whether they receive your emails.
          Kibamail tracks six statuses:
        </p>

        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Receives emails</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>SUBSCRIBED</code>
              </td>
              <td>Yes</td>
              <td>
                Active subscriber. Receives all emails for their subscribed
                topics.
              </td>
            </tr>
            <tr>
              <td>
                <code>UNCONFIRMED</code>
              </td>
              <td>No</td>
              <td>
                Awaiting double opt-in confirmation. Created via a form with
                double opt-in enabled.
              </td>
            </tr>
            <tr>
              <td>
                <code>UNSUBSCRIBED</code>
              </td>
              <td>No</td>
              <td>
                Opted out of emails. Can resubscribe if they change their mind.
              </td>
            </tr>
            <tr>
              <td>
                <code>BOUNCED</code>
              </td>
              <td>No</td>
              <td>
                Email address bounced. The mailbox doesn't exist or is full.
              </td>
            </tr>
            <tr>
              <td>
                <code>COMPLAINED</code>
              </td>
              <td>No</td>
              <td>
                Marked your email as spam. Sending to this contact risks your
                deliverability.
              </td>
            </tr>
            <tr>
              <td>
                <code>ARCHIVED</code>
              </td>
              <td>No</td>
              <td>Manually archived. Hidden from lists but data preserved.</td>
            </tr>
          </tbody>
        </table>

        <p>
          Statuses change automatically based on email events. A hard bounce
          sets the status to <code>BOUNCED</code>. A spam complaint sets it to{" "}
          <code>COMPLAINED</code>. You can manually change status for{" "}
          <code>SUBSCRIBED</code>, <code>UNSUBSCRIBED</code>, and{" "}
          <code>ARCHIVED</code>.
        </p>
      </section>

      <section>
        <h2 id="managing-contacts">Managing contacts</h2>

        <h3 id="adding-contacts">Adding contacts</h3>
        <p>Create contacts in three ways:</p>
        <ul>
          <li>
            <strong>Dashboard</strong> – Go to Contacts → Add Contact and enter
            their email address.
          </li>
          <li>
            <strong>API</strong> – Send a <code>POST</code> request to{" "}
            <code>/v1/contacts</code> with the contact data.
          </li>
          <li>
            <strong>Forms</strong> – Embed a sign-up form on your website. See{" "}
            <Link href="/docs/forms">Forms</Link>.
          </li>
        </ul>

        <p>Here's an API example:</p>

        <pre>
          <code className="language-bash">{`curl -X POST https://api.kibamail.com/v1/contacts \\
  -H "Authorization: Bearer kb_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "sarah@acme.com",
    "firstName": "Sarah",
    "lastName": "Chen",
    "topics": ["topic_newsletter", "topic_product_updates"],
    "properties": {
      "Company": "Acme Inc",
      "Plan": "Enterprise"
    }
  }'`}</code>
        </pre>

        <p>
          See the{" "}
          <Link href="/docs/api/contacts">Contacts API Reference</Link>{" "}
          for all options.
        </p>

        <h3 id="importing-contacts">Importing contacts</h3>
        <p>
          Import contacts from a CSV file to migrate from another platform or
          add contacts in bulk.
        </p>
        <ol>
          <li>Go to Contacts → Import</li>
          <li>Upload your CSV file</li>
          <li>Map CSV columns to contact fields</li>
          <li>Choose which topics to subscribe imported contacts to</li>
          <li>Start the import</li>
        </ol>
        <p>
          During import, you can choose to update existing contacts if the
          email already exists, or skip duplicates. See{" "}
          <Link href="/docs/contact-imports">Contact Imports</Link>{" "}
          for details.
        </p>

        <h3 id="updating-contacts">Updating contacts</h3>
        <p>
          Update a contact's information through the dashboard or API. All
          fields except <code>email</code> are optional when updating.
        </p>
        <pre>
          <code className="language-bash">{`curl -X PUT https://api.kibamail.com/v1/contacts/contact_abc123 \\
  -H "Authorization: Bearer kb_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "Sarah",
    "properties": {
      "Plan": "Pro"
    }
  }'`}</code>
        </pre>

        <h3 id="deleting-contacts">Deleting contacts</h3>
        <p>
          Deleting a contact permanently removes their record and all associated
          data:
        </p>
        <ul>
          <li>Topic subscriptions</li>
          <li>Segment memberships</li>
          <li>Form submissions</li>
          <li>Automation run history</li>
        </ul>
        <p>
          This action cannot be undone. If you need to keep the data but stop
          sending emails, change the contact's status to <code>ARCHIVED</code>{" "}
          instead.
        </p>
      </section>

      <section>
        <h2 id="topics-and-subscriptions">Topics and subscriptions</h2>
        <p>
          Topics let contacts choose which types of emails they want to receive.
          A contact can subscribe to multiple topics. When you send a broadcast,
          you target a topic, and only contacts subscribed to that topic receive
          the email.
        </p>
        <p>
          Each contact-topic relationship has its own subscription status (
          <code>SUBSCRIBED</code> or <code>UNSUBSCRIBED</code>). This is
          separate from the contact's overall status.
        </p>
        <p>Example: A contact might be:</p>
        <ul>
          <li>
            Subscribed to "Product Updates" (receives product announcement
            emails)
          </li>
          <li>
            Unsubscribed from "Newsletter" (doesn't receive weekly newsletter)
          </li>
        </ul>
        <p>
          See <Link href="/docs/topics">Topics</Link>{" "}
          to learn how to set up topics.
        </p>
      </section>

      <section>
        <h2 id="segments">Segments</h2>
        <p>
          Segments group contacts based on their data. Use segments to target
          specific audiences with your broadcasts.
        </p>
        <p>Kibamail supports two segment types:</p>
        <ul>
          <li>
            <strong>Dynamic segments</strong> – Automatically include contacts
            matching your conditions. As contact data changes, segment
            membership updates automatically.
          </li>
          <li>
            <strong>Static segments</strong> – Manually add contacts. Membership
            only changes when you explicitly add or remove contacts.
          </li>
        </ul>
        <p>
          Filter contacts by any built-in field or custom property. Combine
          conditions with AND/OR logic.
        </p>
        <p>
          See <Link href="/docs/segments">Segments</Link>{" "}
          to create your first segment.
        </p>
      </section>

      <section>
        <h2 id="related">Related</h2>
        <ul>
          <li>
            <Link href="/docs/contact-properties">Custom Properties</Link>{" "}
            – Define additional fields for your contacts
          </li>
          <li>
            <Link href="/docs/topics">Topics</Link>{" "}
            – Let contacts choose their email preferences
          </li>
          <li>
            <Link href="/docs/segments">Segments</Link>{" "}
            – Group contacts for targeted sending
          </li>
          <li>
            <Link href="/docs/contact-imports">Contact Imports</Link>{" "}
            – Import contacts from CSV files
          </li>
          <li>
            <Link href="/docs/api/contacts">Contacts API Reference</Link>{" "}
            – Full API documentation
          </li>
        </ul>
      </section>
    </DocsContent>
  );
}
