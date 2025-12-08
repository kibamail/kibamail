export type Currency = "usd" | "ngn";

export type PricingType = "transactional" | "marketing" | "inbound" | "validation";

export interface PricingTier {
  /** Minimum emails for this tier (inclusive) */
  from: number;
  /** Maximum emails for this tier (inclusive), null means unlimited */
  to: number | null;
  /** Rate per email by currency */
  rates: Record<Currency, number>;
  /** Display label for this tier */
  label: string;
}

export interface PricingConfig {
  type: PricingType;
  tiers: PricingTier[];
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  usd: "$",
  ngn: "₦",
};

/** NGN multiplier relative to USD (e.g., $0.0002 USD = ₦0.30 NGN means multiplier is 1500) */
const NGN_MULTIPLIER = 1500;

export const PRICING_CONFIGS: Record<PricingType, PricingConfig> = {
  transactional: {
    type: "transactional",
    tiers: [
      {
        from: 0,
        to: 50_000,
        rates: { usd: 0.0002, ngn: 0.0002 * NGN_MULTIPLIER },
        label: "First 50,000 emails",
      },
      {
        from: 50_001,
        to: 200_000,
        rates: { usd: 0.00015, ngn: 0.00015 * NGN_MULTIPLIER },
        label: "50,000 - 200,000 emails",
      },
      {
        from: 200_001,
        to: null,
        rates: { usd: 0.0001, ngn: 0.0001 * NGN_MULTIPLIER },
        label: "200,000+ emails",
      },
    ],
  },
  marketing: {
    type: "marketing",
    tiers: [
      {
        from: 0,
        to: 50_000,
        rates: { usd: 0.00025, ngn: 0.00025 * NGN_MULTIPLIER },
        label: "First 50,000 emails",
      },
      {
        from: 50_001,
        to: 200_000,
        rates: { usd: 0.0002, ngn: 0.0002 * NGN_MULTIPLIER },
        label: "50,000 - 200,000 emails",
      },
      {
        from: 200_001,
        to: null,
        rates: { usd: 0.00015, ngn: 0.00015 * NGN_MULTIPLIER },
        label: "200,000+ emails",
      },
    ],
  },
  inbound: {
    type: "inbound",
    tiers: [
      {
        from: 0,
        to: 50_000,
        rates: { usd: 0.0002, ngn: 0.0002 * NGN_MULTIPLIER },
        label: "First 50,000 emails",
      },
      {
        from: 50_001,
        to: 200_000,
        rates: { usd: 0.00015, ngn: 0.00015 * NGN_MULTIPLIER },
        label: "50,000 - 200,000 emails",
      },
      {
        from: 200_001,
        to: null,
        rates: { usd: 0.0001, ngn: 0.0001 * NGN_MULTIPLIER },
        label: "200,000+ emails",
      },
    ],
  },
  validation: {
    type: "validation",
    tiers: [
      {
        from: 0,
        to: 50_000,
        rates: { usd: 0.0001, ngn: 0.0001 * NGN_MULTIPLIER },
        label: "First 50,000 emails",
      },
      {
        from: 50_001,
        to: 200_000,
        rates: { usd: 0.00008, ngn: 0.00008 * NGN_MULTIPLIER },
        label: "50,000 - 200,000 emails",
      },
      {
        from: 200_001,
        to: null,
        rates: { usd: 0.00006, ngn: 0.00006 * NGN_MULTIPLIER },
        label: "200,000+ emails",
      },
    ],
  },
};

/**
 * Calculate total price for a given email count using tiered pricing
 */
export function calculateTieredPrice(
  emailCount: number,
  currency: Currency,
  pricingType: PricingType
): number {
  const config = PRICING_CONFIGS[pricingType];
  let totalPrice = 0;
  let remainingEmails = emailCount;

  for (const tier of config.tiers) {
    if (remainingEmails <= 0) break;

    const tierMax = tier.to ?? Infinity;
    const tierSize = tierMax - tier.from + 1;
    const emailsInTier = Math.min(remainingEmails, tierSize);

    totalPrice += emailsInTier * tier.rates[currency];
    remainingEmails -= emailsInTier;
  }

  return totalPrice;
}

/**
 * Get the rate for a specific tier (per email)
 */
export function getTierRate(
  tier: PricingTier,
  currency: Currency
): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const rate = tier.rates[currency];
  return `${symbol}${rate.toFixed(5)} / email`;
}
