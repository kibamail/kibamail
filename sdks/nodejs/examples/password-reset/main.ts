import { render } from "@react-email/render";
import { Kibamail } from "kibamail";
import { PasswordResetEmail } from "./password-reset";

const API_KEY = "kb_98f5ea1f8c9a59d71bc8d215e74e1cd2d9188751cec9415f";
// const API_URL = "http://localhost:18092/api";
const FROM_EMAIL = "frantz@notifications.kibamail.com";
const TO_EMAIL = "test-v8gkxqrld@srv1.mail-tester.com";
const USERNAME = "bahdcoder";

async function main() {
  console.log("\n📧 Rendering email template...");

  const html = await render(
    PasswordResetEmail({
      username: USERNAME,
      resetLink: "https://google.com",
      expiresIn: "1 hour",
    })
  );

  console.log("✅ Email template rendered");
  console.log("\n📤 Sending email...\n");

  const kibamail = new Kibamail(API_KEY);

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
