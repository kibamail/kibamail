/**
 * Domain Warmup Configuration
 *
 * Defines the 12-tier warmup progression system for domain reputation building.
 * New domains start at Tier 1 and progress through tiers based on sending
 * behavior and engagement metrics.
 *
 * Admins manually adjust domain tiers based on observed sending patterns.
 * Code can also programmatically bump domains to higher tiers using this config.
 */

/**
 * Warmup Tier Definition
 */
export interface WarmupTier {
  /**
   * Tier number (1-12)
   */
  tier: number;

  /**
   * Human-readable tier name
   */
  name: string;

  /**
   * Maximum emails allowed per day
   */
  dailyLimit: number;

  /**
   * Maximum emails allowed per hour
   */
  hourlyLimit: number;

  /**
   * Minimum days required at this tier before promotion (for reference)
   */
  minDaysAtTier: number;

  /**
   * Description of this tier level
   */
  description: string;
}

/**
 * Warmup Tier Configuration
 *
 * 8-tier progression model with daily and hourly volume limits.
 * New tenants start at Tier 1 (1,000/day) to balance user experience with deliverability.
 * Tier 8 represents "graduated" status with unlimited sending (plan-based limits only).
 *
 * Progression is based on:
 * - Time at tier (minDaysAtTier)
 * - Engagement metrics (bounce rate < 2%, complaint rate < 0.1%)
 * - Consistent sending patterns
 */
const WARMUP_TIERS: WarmupTier[] = [
  {
    tier: 1,
    name: "New",
    dailyLimit: 1_000,
    hourlyLimit: 200,
    minDaysAtTier: 3,
    description: "New domain, can send up to 1,000 emails/day",
  },
  {
    tier: 2,
    name: "Starter",
    dailyLimit: 2_500,
    hourlyLimit: 500,
    minDaysAtTier: 5,
    description: "Early warmup, building initial reputation",
  },
  {
    tier: 3,
    name: "Basic",
    dailyLimit: 5_000,
    hourlyLimit: 1_000,
    minDaysAtTier: 7,
    description: "Basic sending capacity established",
  },
  {
    tier: 4,
    name: "Growing",
    dailyLimit: 10_000,
    hourlyLimit: 2_000,
    minDaysAtTier: 7,
    description: "Growing reputation with consistent sends",
  },
  {
    tier: 5,
    name: "Established",
    dailyLimit: 25_000,
    hourlyLimit: 5_000,
    minDaysAtTier: 14,
    description: "Established sender with good reputation",
  },
  {
    tier: 6,
    name: "Trusted",
    dailyLimit: 50_000,
    hourlyLimit: 10_000,
    minDaysAtTier: 14,
    description: "Trusted sender with strong engagement",
  },
  {
    tier: 7,
    name: "Professional",
    dailyLimit: 100_000,
    hourlyLimit: 20_000,
    minDaysAtTier: 30,
    description: "Professional sender with excellent metrics",
  },
  {
    tier: 8,
    name: "Unlimited",
    dailyLimit: -1,
    hourlyLimit: -1,
    minDaysAtTier: 0,
    description: "Graduated sender, limits based on plan only",
  },
];

/**
 * Get tier configuration by tier number
 */
function getTierByNumber(tierNumber: number): WarmupTier | undefined {
  return WARMUP_TIERS.find((t) => t.tier === tierNumber);
}

/**
 * Get tier configuration by daily limit
 * Useful for determining current tier from domain's maxSendPerDay
 */
function _getTierByDailyLimit(dailyLimit: number): WarmupTier | undefined {
  return WARMUP_TIERS.find((t) => t.dailyLimit === dailyLimit);
}

/**
 * Get the next tier (for promotion)
 * Returns undefined if already at max tier
 */
function _getNextTier(currentTier: number): WarmupTier | undefined {
  if (currentTier >= 12) return undefined;
  return getTierByNumber(currentTier + 1);
}

/**
 * Get the previous tier (for demotion)
 * Returns undefined if already at minimum tier
 */
function _getPreviousTier(currentTier: number): WarmupTier | undefined {
  if (currentTier <= 1) return undefined;
  return getTierByNumber(currentTier - 1);
}

/**
 * Default tier for new domains
 */
export const DEFAULT_WARMUP_TIER = WARMUP_TIERS[0];

/**
 * Check if a daily limit indicates unlimited sending
 */
function _isUnlimitedTier(dailyLimit: number): boolean {
  return dailyLimit === -1;
}

/**
 * Warmup tiers indexed by tier number for easy access
 *
 * @example
 * const tier5 = WARMUP_TIERS_BY_NUMBER[5];
 * console.log(tier5.dailyLimit); // 1000
 */
export const WARMUP_TIERS_BY_NUMBER = WARMUP_TIERS.reduce(
  (acc, tier) => {
    acc[tier.tier] = tier;
    return acc;
  },
  {} as Record<number, WarmupTier>,
);
