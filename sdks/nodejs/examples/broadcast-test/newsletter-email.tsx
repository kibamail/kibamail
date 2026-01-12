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
  Row,
  Column,
} from "@react-email/components";

/**
 * Newsletter Email Template
 *
 * This template uses {{variableName}} placeholders that will be replaced
 * by the Kibamail personalization engine during broadcast delivery.
 *
 * Variables used:
 * - {{firstName}} - Contact's first name
 * - {{loyaltyPoints}} - Customer loyalty points balance
 * - {{membershipTier}} - Gold, Silver, Bronze tier
 * - {{lastPurchaseDate}} - Date of last purchase
 * - {{recommendedProduct}} - Personalized product recommendation
 * - {{discountCode}} - Unique discount code per customer
 */
export function NewsletterEmail() {
  return (
    <Html>
      <Head />
      <Preview>Your personalized weekly deals are here!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>KIBASTORE</Heading>
          </Section>

          {/* Personalized Greeting */}
          <Section style={content}>
            <Heading style={heading}>
              {"Hey {{firstName}}, Your Weekly Deals Are Here!"}
            </Heading>

            <Text style={paragraph}>
              {"As a valued "}
              <strong>{"{{membershipTier}}"}</strong>
              {" member with "}
              <strong>{"{{loyaltyPoints}} points"}</strong>
              {", you've unlocked exclusive deals just for you."}
            </Text>

            {/* Membership Stats */}
            <Section style={statsContainer}>
              <Row>
                <Column style={statBox}>
                  <Text style={statLabel}>Your Points</Text>
                  <Text style={statValue}>{"{{loyaltyPoints}}"}</Text>
                </Column>
                <Column style={statBox}>
                  <Text style={statLabel}>Member Tier</Text>
                  <Text style={statValue}>{"{{membershipTier}}"}</Text>
                </Column>
                <Column style={statBox}>
                  <Text style={statLabel}>Last Purchase</Text>
                  <Text style={statValue}>{"{{lastPurchaseDate}}"}</Text>
                </Column>
              </Row>
            </Section>

            {/* Personalized Recommendation */}
            <Section style={recommendationBox}>
              <Text style={recommendationTitle}>
                Recommended for You
              </Text>
              <Text style={recommendationProduct}>
                {"{{recommendedProduct}}"}
              </Text>
              <Text style={paragraph}>
                Based on your purchase history, we think you'll love this!
              </Text>
              <Button style={button} href="https://example.com/shop">
                Shop Now
              </Button>
            </Section>

            <Hr style={hr} />

            {/* Exclusive Discount */}
            <Section style={discountSection}>
              <Text style={discountTitle}>Your Exclusive Discount Code</Text>
              <Text style={discountCode}>{"{{discountCode}}"}</Text>
              <Text style={discountNote}>
                Use this code at checkout for 15% off your next purchase!
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Footer */}
            <Text style={footer}>
              {"This email was sent to {{email}}. You're receiving this because you're a {{membershipTier}} member of Kibastore."}
            </Text>
            <Text style={footer}>
              <Link href="{{unsubscribe_url}}" style={link}>
                Unsubscribe
              </Link>
              {" | "}
              <Link href="https://example.com/preferences" style={link}>
                Email Preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  marginTop: "40px",
  marginBottom: "40px",
  borderRadius: "12px",
  maxWidth: "600px",
  overflow: "hidden",
};

const header = {
  backgroundColor: "#18181b",
  padding: "24px",
  textAlign: "center" as const,
};

const logo = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700",
  letterSpacing: "2px",
  margin: "0",
};

const content = {
  padding: "32px 24px",
};

const heading = {
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: "600",
  color: "#18181b",
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#52525b",
  margin: "0 0 16px",
};

const statsContainer = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
};

const statBox = {
  textAlign: "center" as const,
  padding: "8px",
};

const statLabel = {
  fontSize: "12px",
  color: "#71717a",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const statValue = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#18181b",
  margin: "0",
};

const recommendationBox = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const recommendationTitle = {
  fontSize: "14px",
  color: "#92400e",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const recommendationProduct = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#78350f",
  margin: "0 0 12px",
};

const button = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  marginTop: "8px",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "24px 0",
};

const discountSection = {
  textAlign: "center" as const,
  padding: "16px 0",
};

const discountTitle = {
  fontSize: "14px",
  color: "#71717a",
  margin: "0 0 12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const discountCode = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#059669",
  margin: "0 0 8px",
  letterSpacing: "2px",
};

const discountNote = {
  fontSize: "13px",
  color: "#71717a",
  margin: "0",
};

const footer = {
  fontSize: "12px",
  color: "#a1a1aa",
  margin: "0 0 8px",
  textAlign: "center" as const,
};

const link = {
  color: "#71717a",
  textDecoration: "underline",
};

export default NewsletterEmail;
