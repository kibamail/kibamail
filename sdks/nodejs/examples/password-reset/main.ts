import { render } from "@react-email/render";
import { Kibamail } from "kibamail";
import { PasswordResetEmail } from "./password-reset";

const API_KEY = "kb_976fcb964ce171453e7ed7f050de0519e3c957cd07493c65";
const API_URL = "http://localhost:18092/api";
const FROM_EMAIL = "hey@franko.kibamail.xyz";
const TO_EMAIL = "bounced+frantz@kibamail.dev";
const USERNAME = "bahdcoder";

async function main() {
  console.log("\n📧 Rendering email template...");

  const html = await render(
    PasswordResetEmail({
      username: USERNAME,
      resetLink: "https://example.com/reset?token=abc123xyz",
      expiresIn: "1 hour",
    })
  );

  console.log("✅ Email template rendered");
  console.log("\n📤 Sending email...\n");

  const kibamail = new Kibamail(API_KEY, {
    baseURL: API_URL,
  });

  const { data, error } = await kibamail.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: "Reset Your Password",
    html,
  });

  if (error) {
    console.error("❌ Error sending email:");
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log("✅ Email sent successfully!");
  console.log(`   Email ID: ${data?.id}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
