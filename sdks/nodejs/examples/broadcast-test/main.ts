import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Kibamail } from "kibamail";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_KEY = "kb_98f5ea1f8c9a59d71bc8d215e74e1cd2d9188751cec9415f";
const FROM_EMAIL = "newsletter@franko.kibamail.xyz";
const CONTACT_COUNT = 50;

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

function generateContacts(count: number): ContactWithVariables[] {
  const contacts: ContactWithVariables[] = [];
  const usedEmails = new Set<string>();

  for (let i = 0; i < count; i++) {
    // Generate unique email
    let email: string;
    do {
      email = `delivered+${generateUsername()}@kibamail.dev`;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    // Generate 5+ random variables per contact
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

  return contacts;
}

async function main() {
  console.log("\n========================================");
  console.log("   BROADCAST TEST - 1000 Contacts");
  console.log("========================================\n");

  // Step 1: Load the email template
  console.log("Step 1: Loading email template...");
  const html = readFileSync(join(__dirname, "newsletter-email.html"), "utf-8");
  console.log(`   HTML size: ${(html.length / 1024).toFixed(2)} KB`);

  // Step 2: Generate contacts with random variables
  console.log(
    `\nStep 2: Generating ${CONTACT_COUNT} contacts with random variables...`
  );
  const contacts = generateContacts(CONTACT_COUNT);

  // Show sample of generated data
  const sampleCount = Math.min(3, contacts.length);
  console.log(`\n   Sample contacts (first ${sampleCount}):`);
  for (let i = 0; i < sampleCount; i++) {
    const c = contacts[i];
    console.log(`   ${i + 1}. ${c.email}`);
    console.log(`      - firstName: ${c.variables.firstName}`);
    console.log(`      - loyaltyPoints: ${c.variables.loyaltyPoints}`);
    console.log(`      - membershipTier: ${c.variables.membershipTier}`);
    console.log(`      - lastPurchaseDate: ${c.variables.lastPurchaseDate}`);
    console.log(
      `      - recommendedProduct: ${c.variables.recommendedProduct}`
    );
    console.log(`      - discountCode: ${c.variables.discountCode}`);
  }
  if (CONTACT_COUNT > 3) {
    console.log(`   ... and ${CONTACT_COUNT - 3} more contacts`);
  }

  // Step 3: Calculate send time (2 minutes from now)
  const sendAt = new Date();
  sendAt.setMinutes(sendAt.getMinutes() + 2);
  const sendAtISO = sendAt.toISOString();

  console.log(`\nStep 3: Scheduling broadcast for: ${sendAt.toLocaleString()}`);
  console.log(`   ISO timestamp: ${sendAtISO}`);

  // Step 4: Initialize Kibamail SDK
  console.log("\nStep 4: Initializing Kibamail SDK...");

  const kibamail = new Kibamail(API_KEY);

  // Step 5: Create and send broadcast
  console.log("\nStep 5: Creating and scheduling broadcast...");
  console.log(`   From: ${FROM_EMAIL}`);
  console.log(
    `   Recipients: ${CONTACT_COUNT} contacts with per-email variables`
  );

  const startTime = Date.now();

  const { data, error } = await kibamail.broadcasts.createAndSend({
    name: `Newsletter Test - ${new Date().toISOString()}`,
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
    console.error("\n   ERROR creating broadcast:");
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("   BROADCAST CREATED SUCCESSFULLY!");
  console.log("========================================");
  console.log(`   Broadcast ID: ${data?.id}`);
  console.log(`   API call took: ${elapsed}ms`);
  console.log(`   Scheduled for: ${sendAt.toLocaleString()}`);
  console.log(
    `   (${Math.round((sendAt.getTime() - Date.now()) / 1000)} seconds from now)`
  );
  console.log("\n   The broadcast will be sent in ~2 minutes.");
  console.log("   Check your server logs for delivery status.\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
