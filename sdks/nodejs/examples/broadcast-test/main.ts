import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Kibamail } from "kibamail";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_KEY = "kb_b03bc97020bb2ab64924b79c482700c45dbd13ae0b5b4de1";
const FROM_EMAIL = "newsletter@manual-test-61208477.example.com";
const CONTACT_COUNT = 250;
const POLL_INTERVAL_MS = 10_000; // 10 seconds
const INITIAL_WAIT_MS = 5_000; // 5 seconds before first poll

/**
 * Email domains distribution
 * - 80% real domains (gmail, yahoo, hotmail, icloud)
 * - 20% fake/invalid domains that will bounce
 */
const REAL_DOMAINS = [
  { domain: "gmail.com", weight: 40 },
  { domain: "yahoo.com", weight: 20 },
  { domain: "hotmail.com", weight: 15 },
  { domain: "icloud.com", weight: 5 },
];

const FAKE_DOMAINS = [
  "notarealdomain123.com",
  "fakemailserver99.net",
  "bouncethismail.org",
  "invalidmx-test.com",
  "doesnotexist-email.net",
  "no-such-domain-abc.com",
  "testbounce-xyz.org",
  "nonexistent-mail.io",
];

const FAKE_DOMAIN_PERCENTAGE = 0.20; // 20% will use fake domains

// Random data generators
const firstNames = [
  "James",
  "Mary",
  "John",
  "Patricia",
  "Robert",
  "Jennifer",
  "Michael",
  "Linda",
  "William",
  "Elizabeth",
  "David",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Charles",
  "Karen",
  "Christopher",
  "Lisa",
  "Daniel",
  "Nancy",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
  "Donald",
  "Ashley",
  "Steven",
  "Kimberly",
  "Paul",
  "Emily",
  "Andrew",
  "Donna",
  "Joshua",
  "Michelle",
  "Kenneth",
  "Dorothy",
  "Kevin",
  "Carol",
  "Brian",
  "Amanda",
  "George",
  "Melissa",
  "Timothy",
  "Deborah",
  "Ronald",
  "Stephanie",
  "Edward",
  "Rebecca",
  "Jason",
  "Sharon",
  "Jeffrey",
  "Laura",
  "Ryan",
  "Cynthia",
  "Jacob",
  "Kathleen",
  "Gary",
  "Amy",
];

const membershipTiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

const products = [
  "Wireless Noise-Canceling Headphones",
  "Smart Fitness Watch Pro",
  "Premium Leather Wallet",
  "Portable Bluetooth Speaker",
  "Organic Coffee Sampler Pack",
  "Ergonomic Office Chair",
  "Stainless Steel Water Bottle",
  "Bamboo Desk Organizer",
  "LED Desk Lamp with USB",
  "Memory Foam Travel Pillow",
  "Ceramic Pour-Over Coffee Set",
  "Minimalist Backpack",
  "Wireless Charging Pad",
  "Japanese Chef Knife Set",
  "Aromatherapy Diffuser",
  "Yoga Mat Premium Edition",
  "Mechanical Keyboard RGB",
  "Instant Film Camera",
  "Cast Iron Skillet Set",
  "Smart Home Hub",
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDiscountCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateLastPurchaseDate(): string {
  const daysAgo = randomInt(1, 90);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function generateUsername(): string {
  const adjectives = [
    "happy",
    "clever",
    "swift",
    "bright",
    "cool",
    "epic",
    "mega",
    "super",
  ];
  const nouns = [
    "tiger",
    "eagle",
    "wolf",
    "bear",
    "fox",
    "hawk",
    "lion",
    "shark",
  ];
  return `${randomElement(adjectives)}${randomElement(nouns)}${randomInt(1, 9999)}`;
}

/**
 * Pick a random real domain based on weights
 */
function pickRealDomain(): string {
  const totalWeight = REAL_DOMAINS.reduce((sum, d) => sum + d.weight, 0);
  let random = Math.random() * totalWeight;

  for (const domainEntry of REAL_DOMAINS) {
    random -= domainEntry.weight;
    if (random <= 0) {
      return domainEntry.domain;
    }
  }
  return "gmail.com"; // fallback
}

/**
 * Pick a domain - either real (80%) or fake (20%)
 */
function pickDomain(): { domain: string; isFake: boolean } {
  if (Math.random() < FAKE_DOMAIN_PERCENTAGE) {
    return {
      domain: randomElement(FAKE_DOMAINS),
      isFake: true,
    };
  }
  return {
    domain: pickRealDomain(),
    isFake: false,
  };
}

interface ContactWithVariables {
  email: string;
  variables: {
    firstName: string;
    loyaltyPoints: number;
    membershipTier: string;
    lastPurchaseDate: string;
    recommendedProduct: string;
    discountCode: string;
  };
}

interface DomainStats {
  gmail: number;
  yahoo: number;
  hotmail: number;
  icloud: number;
  fake: number;
}

function generateContacts(count: number): {
  contacts: ContactWithVariables[];
  domainStats: DomainStats;
} {
  const contacts: ContactWithVariables[] = [];
  const usedEmails = new Set<string>();
  const domainStats: DomainStats = {
    gmail: 0,
    yahoo: 0,
    hotmail: 0,
    icloud: 0,
    fake: 0,
  };

  for (let i = 0; i < count; i++) {
    // Pick domain (80% real, 20% fake)
    const { domain, isFake } = pickDomain();

    // Track domain stats
    if (isFake) {
      domainStats.fake++;
    } else if (domain === "gmail.com") {
      domainStats.gmail++;
    } else if (domain === "yahoo.com") {
      domainStats.yahoo++;
    } else if (domain === "hotmail.com") {
      domainStats.hotmail++;
    } else if (domain === "icloud.com") {
      domainStats.icloud++;
    }

    // Generate unique email
    let email: string;
    do {
      email = `${generateUsername()}@${domain}`;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    const variables = {
      firstName: randomElement(firstNames),
      loyaltyPoints: randomInt(100, 50000),
      membershipTier: randomElement(membershipTiers),
      lastPurchaseDate: generateLastPurchaseDate(),
      recommendedProduct: randomElement(products),
      discountCode: generateDiscountCode(),
    };

    contacts.push({ email, variables });
  }

  return { contacts, domainStats };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

function colorStatus(status: string): string {
  switch (status) {
    case "DELIVERED":
      return `${colors.green}${status}${colors.reset}`;
    case "SENT":
      return `${colors.blue}${status}${colors.reset}`;
    case "QUEUED":
      return `${colors.yellow}${status}${colors.reset}`;
    case "SENDING":
      return `${colors.cyan}${status}${colors.reset}`;
    case "BOUNCED":
      return `${colors.red}${status}${colors.reset}`;
    case "COMPLAINED":
      return `${colors.bgRed}${colors.white}${status}${colors.reset}`;
    case "FAILED":
      return `${colors.red}${status}${colors.reset}`;
    default:
      return status;
  }
}

function printStats(stats: any) {
  console.log("\n" + "=".repeat(70));
  console.log(
    `${colors.bright}${colors.cyan}  BROADCAST STATISTICS${colors.reset}`
  );
  console.log("=".repeat(70));

  // Recipients section
  console.log(`\n${colors.bright}  Recipients:${colors.reset}`);
  console.log(
    `    Total:        ${colors.bright}${formatNumber(stats.recipients.total)}${colors.reset}`
  );
  console.log(
    `    Queued:       ${colors.yellow}${formatNumber(stats.recipients.queued)}${colors.reset}`
  );
  console.log(
    `    Sent:         ${colors.blue}${formatNumber(stats.recipients.sent)}${colors.reset}`
  );
  console.log(
    `    Delivered:    ${colors.green}${formatNumber(stats.recipients.delivered)}${colors.reset}`
  );
  console.log(
    `    Bounced:      ${colors.red}${formatNumber(stats.recipients.bounced)}${colors.reset}`
  );
  console.log(
    `    Complained:   ${colors.magenta}${formatNumber(stats.recipients.complained)}${colors.reset}`
  );
  console.log(
    `    Failed:       ${colors.red}${formatNumber(stats.recipients.failed)}${colors.reset}`
  );
  console.log(
    `    Unsubscribed: ${formatNumber(stats.recipients.unsubscribed)}`
  );

  // Engagement section
  console.log(`\n${colors.bright}  Engagement:${colors.reset}`);
  console.log(
    `    Opened:           ${colors.green}${formatNumber(stats.engagement.opened)}${colors.reset}`
  );
  console.log(
    `    Clicked:          ${colors.cyan}${formatNumber(stats.engagement.clicked)}${colors.reset}`
  );
  console.log(
    `    Open Rate:        ${colors.bright}${formatPercent(stats.engagement.openRate)}${colors.reset}`
  );
  console.log(
    `    Click Rate:       ${colors.bright}${formatPercent(stats.engagement.clickRate)}${colors.reset}`
  );
  console.log(
    `    Click-to-Open:    ${colors.bright}${formatPercent(stats.engagement.clickToOpenRate)}${colors.reset}`
  );

  // Deliverability section
  console.log(`\n${colors.bright}  Deliverability:${colors.reset}`);
  console.log(
    `    Delivery Rate:    ${stats.deliverability.deliveryRate >= 0.95 ? colors.green : colors.yellow}${formatPercent(stats.deliverability.deliveryRate)}${colors.reset}`
  );
  console.log(
    `    Bounce Rate:      ${stats.deliverability.bounceRate > 0.05 ? colors.red : colors.green}${formatPercent(stats.deliverability.bounceRate)}${colors.reset}`
  );
  console.log(
    `    Complaint Rate:   ${stats.deliverability.complaintRate > 0.001 ? colors.red : colors.green}${formatPercent(stats.deliverability.complaintRate)}${colors.reset}`
  );

  console.log(
    `\n  Details Pruned: ${stats.detailsPruned ? colors.yellow + "Yes" : colors.green + "No"}${colors.reset}`
  );
  console.log("=".repeat(70));
}

function printSendsTable(sends: any[]) {
  console.log("\n" + "=".repeat(130));
  console.log(
    `${colors.bright}${colors.cyan}  BROADCAST SENDS (${sends.length} records)${colors.reset}`
  );
  console.log("=".repeat(130));

  // Table header
  const header = [
    "Email".padEnd(45),
    "Status".padEnd(12),
    "Opens".padEnd(7),
    "Clicks".padEnd(8),
    "Queued At".padEnd(22),
    "Delivered At".padEnd(22),
  ].join(" | ");

  console.log(`\n  ${colors.dim}${header}${colors.reset}`);
  console.log("  " + "-".repeat(126));

  // Table rows
  for (const send of sends) {
    const email =
      send.email.length > 43 ? send.email.substring(0, 40) + "..." : send.email;
    const queuedAt = send.queuedAt
      ? new Date(send.queuedAt).toLocaleString()
      : "-";
    const deliveredAt = send.deliveredAt
      ? new Date(send.deliveredAt).toLocaleString()
      : "-";

    const row = [
      email.padEnd(45),
      colorStatus(send.status).padEnd(12 + 9), // Add padding for color codes
      String(send.openCount).padEnd(7),
      String(send.clickCount).padEnd(8),
      queuedAt.padEnd(22),
      deliveredAt.padEnd(22),
    ].join(" | ");

    console.log(`  ${row}`);
  }

  console.log("  " + "-".repeat(126));

  // Status summary
  const statusCounts: Record<string, number> = {};
  for (const send of sends) {
    statusCounts[send.status] = (statusCounts[send.status] || 0) + 1;
  }

  console.log(`\n  ${colors.bright}Status Summary:${colors.reset}`);
  for (const [status, count] of Object.entries(statusCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`    ${colorStatus(status)}: ${count}`);
  }

  console.log("=".repeat(130));
}

async function pollBroadcastStatus(kibamail: Kibamail, broadcastId: string) {
  let iteration = 0;
  let lastSentCount = 0;
  let stableCount = 0;

  console.log(
    `\n${colors.bright}Starting polling every ${POLL_INTERVAL_MS / 1000} seconds...${colors.reset}`
  );
  console.log(`${colors.dim}(Press Ctrl+C to stop)${colors.reset}\n`);

  while (true) {
    iteration++;
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `\n${colors.dim}[${timestamp}] Poll #${iteration}${colors.reset}`
    );

    try {
      // Fetch stats
      const { data: stats, error: statsError } =
        await kibamail.broadcasts.stats.get(broadcastId);

      if (statsError) {
        console.error(
          `${colors.red}Error fetching stats:${colors.reset}`,
          statsError
        );
        continue;
      }

      printStats(stats);

      // Fetch sends (get first 100)
      const { data: sendsData, error: sendsError } =
        await kibamail.broadcasts.sends.list(broadcastId, {
          limit: 100,
        });

      if (sendsError) {
        console.error(
          `${colors.red}Error fetching sends:${colors.reset}`,
          sendsError
        );
      } else if (sendsData) {
        printSendsTable(sendsData.data);

        if (sendsData.hasMore) {
          console.log(
            `${colors.yellow}  (More sends available, showing first 100)${colors.reset}`
          );
        }
      }

      // Check if broadcast is complete
      const totalProcessed =
        stats.recipients.delivered +
        stats.recipients.bounced +
        stats.recipients.complained +
        stats.recipients.failed;

      if (totalProcessed === lastSentCount && totalProcessed > 0) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      lastSentCount = totalProcessed;

      // Progress bar
      const progress =
        stats.recipients.total > 0
          ? totalProcessed / stats.recipients.total
          : 0;
      const barWidth = 40;
      const filled = Math.round(progress * barWidth);
      const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
      console.log(
        `\n  ${colors.bright}Progress:${colors.reset} [${colors.green}${bar}${colors.reset}] ${formatPercent(progress)}`
      );

      // Stop if all emails are processed and stable for 3 iterations
      if (totalProcessed >= stats.recipients.total && stableCount >= 3) {
        console.log(
          `\n${colors.green}${colors.bright}✓ Broadcast complete! All ${stats.recipients.total} emails processed.${colors.reset}`
        );
        break;
      }
    } catch (err) {
      console.error(`${colors.red}Polling error:${colors.reset}`, err);
    }

    // Wait before next poll
    await sleep(POLL_INTERVAL_MS);
  }
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log(
    `${colors.bright}${colors.cyan}   BROADCAST TEST - ${CONTACT_COUNT} Contacts (Mixed Domains)${colors.reset}`
  );
  console.log("=".repeat(70) + "\n");

  // Step 1: Load the email template
  console.log(
    `${colors.bright}Step 1:${colors.reset} Loading email template...`
  );
  const html = readFileSync(join(__dirname, "newsletter-email.html"), "utf-8");
  console.log(`   HTML size: ${(html.length / 1024).toFixed(2)} KB`);

  // Step 2: Generate contacts with random variables and mixed domains
  console.log(
    `\n${colors.bright}Step 2:${colors.reset} Generating ${CONTACT_COUNT} contacts with mixed domains...`
  );
  const { contacts, domainStats } = generateContacts(CONTACT_COUNT);

  // Show domain distribution
  console.log(
    `\n   ${colors.bright}Domain Distribution:${colors.reset}`
  );
  console.log(
    `   ├─ gmail.com:   ${colors.green}${domainStats.gmail}${colors.reset} (${formatPercent(domainStats.gmail / CONTACT_COUNT)})`
  );
  console.log(
    `   ├─ yahoo.com:   ${colors.blue}${domainStats.yahoo}${colors.reset} (${formatPercent(domainStats.yahoo / CONTACT_COUNT)})`
  );
  console.log(
    `   ├─ hotmail.com: ${colors.cyan}${domainStats.hotmail}${colors.reset} (${formatPercent(domainStats.hotmail / CONTACT_COUNT)})`
  );
  console.log(
    `   ├─ icloud.com:  ${colors.magenta}${domainStats.icloud}${colors.reset} (${formatPercent(domainStats.icloud / CONTACT_COUNT)})`
  );
  console.log(
    `   └─ fake (bounce): ${colors.red}${domainStats.fake}${colors.reset} (${formatPercent(domainStats.fake / CONTACT_COUNT)})`
  );

  // Show sample contacts
  const sampleCount = Math.min(10, contacts.length);
  console.log(
    `\n   ${colors.bright}Sample contacts (first ${sampleCount}):${colors.reset}`
  );
  for (let i = 0; i < sampleCount; i++) {
    const c = contacts[i];
    const domain = c.email.split("@")[1];
    const isFake = FAKE_DOMAINS.includes(domain);
    const domainColor = isFake ? colors.red : colors.green;
    console.log(
      `   ${i + 1}. ${c.email.split("@")[0]}@${domainColor}${domain}${colors.reset} → ${c.variables.firstName} (${c.variables.membershipTier})`
    );
  }

  // Step 3: Calculate send time (1 minute from now for faster testing)
  const sendAt = new Date();
  sendAt.setMinutes(sendAt.getMinutes() + 1);
  const sendAtISO = sendAt.toISOString();

  console.log(
    `\n${colors.bright}Step 3:${colors.reset} Scheduling broadcast for: ${sendAt.toLocaleString()}`
  );
  console.log(`   ISO timestamp: ${sendAtISO}`);

  // Step 4: Initialize Kibamail SDK
  console.log(
    `\n${colors.bright}Step 4:${colors.reset} Initializing Kibamail SDK...`
  );
  const kibamail = new Kibamail(API_KEY, {
    baseURL: "http://localhost:18092/api",
  });

  // Step 5: Create and send broadcast
  console.log(
    `\n${colors.bright}Step 5:${colors.reset} Creating and scheduling broadcast...`
  );
  console.log(`   From: ${FROM_EMAIL}`);
  console.log(
    `   Recipients: ${CONTACT_COUNT} contacts with per-email variables`
  );

  const startTime = Date.now();

  const { data, error } = await kibamail.broadcasts.createAndSend({
    name: `Mixed Domains Test - ${new Date().toISOString()}`,
    from: FROM_EMAIL,
    emailContent: {
      subject: "Your Weekly Deals Are Here, {{firstName}}!",
      html,
      previewText: "Exclusive deals just for {{membershipTier}} members",
    },
    recipients: {
      emails: contacts,
    },
    sendAt: sendAtISO,
  });

  const elapsed = Date.now() - startTime;

  if (error) {
    console.error(`\n${colors.red}   ERROR creating broadcast:${colors.reset}`);
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log("\n" + "=".repeat(70));
  console.log(
    `${colors.green}${colors.bright}   BROADCAST CREATED SUCCESSFULLY!${colors.reset}`
  );
  console.log("=".repeat(70));
  console.log(`   Broadcast ID: ${colors.cyan}${data?.id}${colors.reset}`);
  console.log(`   API call took: ${elapsed}ms`);
  console.log(`   Scheduled for: ${sendAt.toLocaleString()}`);
  console.log(
    `   (${Math.round((sendAt.getTime() - Date.now()) / 1000)} seconds from now)`
  );

  // Step 6: Wait initial period then start polling
  const waitSeconds = Math.ceil(INITIAL_WAIT_MS / 1000);
  console.log(
    `\n${colors.bright}Step 6:${colors.reset} Waiting ${waitSeconds} seconds before starting to poll...`
  );

  // Countdown
  for (let i = waitSeconds; i > 0; i--) {
    process.stdout.write(`\r   Starting in ${i} seconds...`);
    await sleep(1000);
  }
  console.log("\r   Starting now!          ");

  // Step 7: Poll for stats and sends
  await pollBroadcastStatus(kibamail, data!.id);

  console.log(
    `\n${colors.green}${colors.bright}Test completed successfully!${colors.reset}\n`
  );
}

main().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
