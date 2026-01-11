import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  username?: string;
  resetLink?: string;
  expiresIn?: string;
}

export function PasswordResetEmail({
  username = "User",
  resetLink = "https://example.com/reset",
  expiresIn = "1 hour",
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset Your Password</Heading>

          <Text style={paragraph}>Hi {username},</Text>

          <Text style={paragraph}>
            We received a request to reset your password. Click the button below
            to create a new password.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={resetLink}>
              Reset Password
            </Button>
          </Section>

          <Text style={paragraph}>
            This link will expire in {expiresIn}. If you didn't request a
            password reset, you can safely ignore this email.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            If the button doesn't work, copy and paste this link into your
            browser:
          </Text>
          <Link href={resetLink} style={link}>
            {resetLink}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "480px",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "600",
  color: "#1a1a1a",
  padding: "0",
  margin: "0 0 20px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#3c4149",
  margin: "0 0 16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#0066cc",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "24px 0",
};

const footer = {
  fontSize: "13px",
  color: "#8898aa",
  margin: "0 0 8px",
};

const link = {
  fontSize: "13px",
  color: "#0066cc",
  wordBreak: "break-all" as const,
};

export default PasswordResetEmail;
