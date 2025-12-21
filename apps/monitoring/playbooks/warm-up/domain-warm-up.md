# Kibamail Domain Warmup Control Plane

## Comprehensive System Design Architecture

---

## Executive Summary

This document defines the architecture for an automated domain warmup system within Kibamail's control plane. The system manages per-customer sending volume based on domain reputation maturity, engagement metrics, and compliance thresholds. When a customer submits a broadcast of 10,000 emails, the control plane determines how many can be injected into the MTA today versus queued for future days based on their warmup tier.

**Core Principle**: The control plane acts as a gatekeeper between customer intent (send 10K emails) and MTA injection (send 500 today, queue 9,500 for later). IPs are already warm; this system manages **domain-level reputation building**.

---

## 1. Foundational Concepts

### 1.1 Why Domain Warmup Matters (Even with Warm IPs)

From Mailgun's research: _"Well, my IP is already warm and has a good reputation, so I can just start sending at volume day one." While this is technically true, you could run the risk of your domain getting assigned a poor domain reputation due to its newness and endanger your overall deliverability._

Domain reputation is **independent** from IP reputation:

- Gmail, Yahoo, Microsoft all track domain reputation separately
- A new customer domain on your warm IPs still looks "new" to mailbox providers
- Sudden high volume from new domains triggers spam filters regardless of IP reputation

### 1.2 Industry Benchmarks

| Metric              | Target | Warning | Suspension |
| ------------------- | ------ | ------- | ---------- |
| Hard Bounce Rate    | < 2%   | 5%      | 8-10%      |
| Spam Complaint Rate | < 0.1% | 0.3%    | 0.5%       |
| Soft Bounce Rate    | < 5%   | 10%     | 15%        |
| Unsubscribe Rate    | < 1%   | 2%      | N/A        |

**Source**: AWS SES, HubSpot, Dynamics 365, SendGrid documentation

### 1.3 Warmup Timeline Expectations

| Volume Target      | Warmup Duration | Notes                    |
| ------------------ | --------------- | ------------------------ |
| < 10,000/day       | 2-3 weeks       | Small senders            |
| 10,000-50,000/day  | 4-6 weeks       | Medium senders           |
| 50,000-200,000/day | 6-8 weeks       | Large senders            |
| 200,000+/day       | 8-12 weeks      | Enterprise (custom plan) |

---

## 2. Tier System Architecture

### 2.1 Warmup Tier Definitions

The system uses a **12-tier progression model** with daily volume limits:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WARMUP TIER PROGRESSION                              │
├──────┬──────────────┬──────────────┬─────────────────┬─────────────────────┤
│ Tier │ Daily Limit  │ Hourly Limit │ Min Days at Tier│ Promotion Criteria  │
├──────┼──────────────┼──────────────┼─────────────────┼─────────────────────┤
│  1   │     50       │      10      │       2         │ Baseline entry      │
│  2   │    100       │      20      │       2         │ Volume + metrics    │
│  3   │    250       │      40      │       2         │ Volume + metrics    │
│  4   │    500       │      80      │       3         │ Volume + metrics    │
│  5   │  1,000       │     150      │       3         │ Volume + metrics    │
│  6   │  2,500       │     350      │       3         │ Volume + metrics    │
│  7   │  5,000       │     700      │       4         │ Volume + metrics    │
│  8   │ 10,000       │   1,400      │       5         │ Volume + metrics    │
│  9   │ 25,000       │   3,500      │       5         │ Volume + metrics    │
│ 10   │ 50,000       │   7,000      │       7         │ Volume + metrics    │
│ 11   │ 100,000      │  14,000      │       7         │ Volume + metrics    │
│ 12   │ UNLIMITED*   │  Plan-based  │       N/A       │ Graduated           │
└──────┴──────────────┴──────────────┴─────────────────┴─────────────────────┘

* Tier 12 = "Graduated" - subject only to plan limits, not warmup limits
```

### 2.2 Tier State Machine

```
                                    ┌─────────────────┐
                                    │   NEW DOMAIN    │
                                    │  (Unverified)   │
                                    └────────┬────────┘
                                             │
                                    DNS Verified + Auth Setup
                                             │
                                             ▼
                    ┌────────────────────────────────────────────┐
                    │               TIER 1 (Entry)               │
                    │         50 emails/day, 10/hour             │
                    └────────────────────┬───────────────────────┘
                                         │
                     ┌───────────────────┼───────────────────┐
                     │                   │                   │
                     ▼                   ▼                   ▼
              ┌──────────┐        ┌──────────┐        ┌──────────┐
              │ PROMOTE  │        │   HOLD   │        │  DEMOTE  │
              │ to Tier 2│        │ at Tier 1│        │   N/A    │
              └──────────┘        └──────────┘        └──────────┘
                     │
                     │  (Pattern continues through Tier 12)
                     │
                     ▼
              ┌──────────────────────────────────────────────────┐
              │               TIER 12 (Graduated)                │
              │         Plan limits only, no warmup caps         │
              └──────────────────────┬───────────────────────────┘
                                     │
                      ┌──────────────┼──────────────┐
                      │              │              │
                      ▼              ▼              ▼
               ┌───────────┐  ┌───────────┐  ┌───────────┐
               │  HEALTHY  │  │  WARNING  │  │ SUSPENDED │
               └───────────┘  └───────────┘  └───────────┘
```

### 2.3 Tier Transition Rules

#### Promotion Criteria (ALL must be met)

```yaml
promotion_criteria:
  # Minimum days at current tier
  min_days_at_tier: [varies by tier, see table]

  # Volume utilization - must actually USE the tier capacity
  volume_utilization:
    minimum_percent: 70 # Must send at least 70% of tier limit
    measurement_window: "rolling_7_days"

  # Health metrics thresholds
  health_thresholds:
    hard_bounce_rate:
      max: 2.0 # Must be below 2%
    soft_bounce_rate:
      max: 5.0 # Must be below 5%
    spam_complaint_rate:
      max: 0.1 # Must be below 0.1%
    unsubscribe_rate:
      max: 1.5 # Must be below 1.5%

  # Delivery success rate (positive signal)
  delivery_thresholds:
    delivery_rate:
      min: 95.0 # At least 95% successful delivery

  # Note: Open/click rates are NOT used for promotion criteria
  # because not all customers enable email tracking

  # Consistency requirement
  consistency:
    sending_days_required: 5 # Must send on 5+ of last 7 days
    no_suspension_history: true # No suspensions in last 30 days
```

#### Demotion Triggers (ANY triggers demotion)

```yaml
demotion_triggers:
  # Hard thresholds - immediate demotion
  immediate_demotion:
    hard_bounce_rate: 5.0 # > 5% = drop 1 tier
    spam_complaint_rate: 0.3 # > 0.3% = drop 1 tier

  # Severe thresholds - multi-tier demotion
  severe_demotion:
    hard_bounce_rate: 8.0 # > 8% = drop 2 tiers
    spam_complaint_rate: 0.5 # > 0.5% = drop 2 tiers

  # Critical thresholds - suspension
  suspension:
    hard_bounce_rate: 10.0 # > 10% = suspend sending
    spam_complaint_rate: 1.0 # > 1% = suspend sending

  # Inactivity decay
  inactivity:
    days_without_sending: 14 # 14 days = drop 1 tier
    days_for_full_reset: 30 # 30 days = reset to Tier 1
```

#### Hold Conditions

```yaml
hold_conditions:
  # Metrics in warning zone but not demotion
  warning_zone:
    hard_bounce_rate: [2.0, 5.0] # Between 2-5%
    spam_complaint_rate: [0.1, 0.3] # Between 0.1-0.3%

  # Insufficient volume to evaluate
  insufficient_data:
    min_emails_for_evaluation: 100

  # Recent tier change cooldown
  cooldown:
    days_since_last_promotion: 2
    days_since_last_demotion: 7
```

---

## 3. Data Model

### 3.1 Prisma Schema (MySQL)

```prisma
// Domain warmup state and configuration
model DomainWarmupState {
  id              String   @id @default(cuid())
  teamId          String   @map("team_id")
  sendingDomain   String   @map("sending_domain") @db.VarChar(255)

  // Current state
  currentTier     Int      @default(1) @map("current_tier") @db.TinyInt
  tierStatus      TierStatus @default(ACTIVE) @map("tier_status")

  // Tier timestamps
  tierEnteredAt   DateTime @default(now()) @map("tier_entered_at")
  tierPromotedAt  DateTime? @map("tier_promoted_at")
  tierDemotedAt   DateTime? @map("tier_demoted_at")

  // Daily tracking (reset at midnight UTC)
  dailySentCount  Int      @default(0) @map("daily_sent_count")
  dailyLimit      Int      @default(50) @map("daily_limit")
  dailyResetAt    DateTime @default(now()) @map("daily_reset_at") @db.Date

  // Hourly tracking (sliding window managed in Redis)
  hourlyLimit     Int      @default(10) @map("hourly_limit")

  // Suspension info
  suspendedAt         DateTime? @map("suspended_at")
  suspensionReason    String?   @map("suspension_reason") @db.Text
  suspensionExpiresAt DateTime? @map("suspension_expires_at")

  // Metadata
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  team            Team     @relation(fields: [teamId], references: [id])
  metrics         DomainWarmupMetrics[]
  history         DomainWarmupHistory[]
  providerMetrics DomainProviderMetrics[]

  @@unique([teamId, sendingDomain])
  @@map("domain_warmup_states")
}

enum TierStatus {
  ACTIVE
  HOLD
  WARNING
  SUSPENDED
}

// Rolling metrics aggregation (computed from events table)
model DomainWarmupMetrics {
  id                    String   @id @default(cuid())
  domainWarmupStateId   String   @map("domain_warmup_state_id")

  // Time window
  windowDate            DateTime @map("window_date") @db.Date

  // Volume metrics
  emailsSent            Int      @default(0) @map("emails_sent")
  emailsDelivered       Int      @default(0) @map("emails_delivered")
  emailsBouncedHard     Int      @default(0) @map("emails_bounced_hard")
  emailsBouncedSoft     Int      @default(0) @map("emails_bounced_soft")
  emailsDeferred        Int      @default(0) @map("emails_deferred")

  // Engagement metrics (optional - only when tracking enabled)
  emailsOpened          Int      @default(0) @map("emails_opened")
  emailsClicked         Int      @default(0) @map("emails_clicked")
  emailsUnsubscribed    Int      @default(0) @map("emails_unsubscribed")

  // Complaint metrics
  spamComplaints        Int      @default(0) @map("spam_complaints")

  // Computed rates (stored for query efficiency)
  hardBounceRate        Decimal? @map("hard_bounce_rate") @db.Decimal(5, 2)
  softBounceRate        Decimal? @map("soft_bounce_rate") @db.Decimal(5, 2)
  spamComplaintRate     Decimal? @map("spam_complaint_rate") @db.Decimal(5, 4)
  deliveryRate          Decimal? @map("delivery_rate") @db.Decimal(5, 2)
  unsubscribeRate       Decimal? @map("unsubscribe_rate") @db.Decimal(5, 2)

  createdAt             DateTime @default(now()) @map("created_at")

  // Relations
  domainWarmupState     DomainWarmupState @relation(fields: [domainWarmupStateId], references: [id])

  @@unique([domainWarmupStateId, windowDate])
  @@map("domain_warmup_metrics")
}

// Tier change audit log
model DomainWarmupHistory {
  id                    String    @id @default(cuid())
  domainWarmupStateId   String    @map("domain_warmup_state_id")

  // Change details
  eventType             WarmupEventType @map("event_type")
  previousTier          Int?      @map("previous_tier") @db.TinyInt
  newTier               Int?      @map("new_tier") @db.TinyInt
  previousStatus        TierStatus? @map("previous_status")
  newStatus             TierStatus? @map("new_status")

  // Reason and metrics snapshot
  reason                String    @db.Text
  metricsSnapshot       Json      @map("metrics_snapshot")

  createdAt             DateTime  @default(now()) @map("created_at")

  // Relations
  domainWarmupState     DomainWarmupState @relation(fields: [domainWarmupStateId], references: [id])

  @@map("domain_warmup_history")
}

enum WarmupEventType {
  PROMOTION
  DEMOTION
  HOLD
  SUSPENSION
  REACTIVATION
  RESET
}

// Per-provider tracking (Gmail, Outlook, Yahoo have different thresholds)
model DomainProviderMetrics {
  id                    String   @id @default(cuid())
  domainWarmupStateId   String   @map("domain_warmup_state_id")
  provider              String   @db.VarChar(50) // 'gmail', 'outlook', 'yahoo', 'other'
  windowDate            DateTime @map("window_date") @db.Date

  emailsSent            Int      @default(0) @map("emails_sent")
  emailsDelivered       Int      @default(0) @map("emails_delivered")
  emailsBounced         Int      @default(0) @map("emails_bounced")
  spamComplaints        Int      @default(0) @map("spam_complaints")

  // Relations
  domainWarmupState     DomainWarmupState @relation(fields: [domainWarmupStateId], references: [id])

  @@unique([domainWarmupStateId, provider, windowDate])
  @@map("domain_provider_metrics")
}

// Broadcast scheduling metadata (tracks warmup distribution for a broadcast)
model BroadcastWarmupSchedule {
  id                    String   @id @default(cuid())
  broadcastId           String   @unique @map("broadcast_id")
  teamId                String   @map("team_id")
  sendingDomain         String   @map("sending_domain") @db.VarChar(255)

  // Schedule info
  totalRecipients       Int      @map("total_recipients")
  scheduledBatches      Json     @map("scheduled_batches") // Array of {date, count, tierAtSchedule}
  estimatedCompletion   DateTime @map("estimated_completion")

  // Status
  status                BroadcastWarmupStatus @default(SCHEDULED)
  pausedAt              DateTime? @map("paused_at")
  pausedReason          String?   @map("paused_reason") @db.Text
  cancelledAt           DateTime? @map("cancelled_at")

  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  // Relations
  team                  Team     @relation(fields: [teamId], references: [id])
  broadcast             Broadcast @relation(fields: [broadcastId], references: [id])

  @@map("broadcast_warmup_schedules")
}

enum BroadcastWarmupStatus {
  SCHEDULED
  IN_PROGRESS
  PAUSED
  COMPLETED
  CANCELLED
}
```

**Note**: Email queue is NOT stored in MySQL. All queued jobs are managed by BullMQ in Redis, which efficiently handles millions of jobs with built-in delayed job support, retries, and job lifecycle management.

### 3.2 Redis Structures (Real-time State & BullMQ)

```
# ═══════════════════════════════════════════════════════════════════════════════
# WARMUP STATE (Redis Keys)
# ═══════════════════════════════════════════════════════════════════════════════

# Current sending counters (atomic operations via Lua scripts)
warmup:counter:{domain}:daily         -> INTEGER (reset at midnight UTC)
warmup:counter:{domain}:hourly:{hour} -> INTEGER (fixed hourly buckets, e.g., :14 for 2pm)

# Quick lookups (cached from MySQL, refreshed on tier change)
warmup:tier:{domain}                  -> INTEGER (current tier 1-12)
warmup:limit:{domain}:daily           -> INTEGER (daily limit for current tier)
warmup:limit:{domain}:hourly          -> INTEGER (hourly limit for current tier)
warmup:status:{domain}                -> STRING ('active'|'hold'|'warning'|'suspended')

# Suspension cache
warmup:suspended:{domain}             -> STRING (reason) with TTL

# ═══════════════════════════════════════════════════════════════════════════════
# BULLMQ QUEUES (Managed by BullMQ library)
# ═══════════════════════════════════════════════════════════════════════════════

# Queue: warmup-injection
# Purpose: Holds all email injection jobs with delayed execution
# Capacity: Easily handles 1M+ jobs
#
# Job Structure:
# {
#   "broadcastId": "bc_abc123",
#   "batchId": "batch_day1_hour14",
#   "recipientIds": ["r1", "r2", ...],  // Batch of recipients (hourly chunk)
#   "sendingDomain": "customer.com",
#   "teamId": "team_xyz",
#   "scheduledDay": 1,                   // Day number in warmup schedule
#   "scheduledHour": 14,                 // Hour of day (0-23)
#   "tierAtSchedule": 4,                 // Tier when job was scheduled
#   "expectedCount": 80                  // Expected emails in this batch
# }
#
# BullMQ handles: delayed execution, retries, job state, and lifecycle

# Queue: warmup-tier-evaluation
# Purpose: Periodic tier evaluation jobs (runs hourly)
#
# Job Structure:
# {
#   "domainWarmupStateId": "dws_123",
#   "sendingDomain": "customer.com"
# }

# Queue: warmup-metrics-aggregation
# Purpose: Aggregate metrics from events table (runs every 15 minutes)
#
# Job Structure:
# {
#   "domainWarmupStateId": "dws_123",
#   "windowStart": "2024-12-20T00:00:00Z",
#   "windowEnd": "2024-12-20T23:59:59Z"
# }

# Queue: warmup-daily-reset
# Purpose: Reset daily counters at midnight UTC
#
# Job Structure:
# {
#   "resetDate": "2024-12-21"
# }
```

---

## 4. System Components Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              KIBAMAIL CONTROL PLANE                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  Broadcast API   │───▶│  Warmup Gateway  │───▶│   BullMQ Scheduler Service   │  │
│  │                  │    │                  │    │                              │  │
│  │ POST /broadcasts │    │ • Tier Lookup    │    │ • Optimistic Scheduling     │  │
│  │ (8,500 emails)   │    │ • Calculate      │    │ • Daily Batch Creation      │  │
│  │                  │    │   Schedule       │    │ • Hourly Job Distribution   │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────────────────┘  │
│           │                       │                           │                     │
│           │                       │                           │                     │
│           │                       ▼                           ▼                     │
│           │              ┌────────────────────────────────────────────────────┐    │
│           │              │                     REDIS                           │    │
│           │              │  ┌─────────────────┐    ┌─────────────────────────┐ │    │
│           │              │  │ Warmup Counters │    │      BullMQ Queues      │ │    │
│           │              │  │ & State Cache   │    │                         │ │    │
│           │              │  │                 │    │ • warmup-injection      │ │    │
│           │              │  │ • Daily counts  │    │ • warmup-tier-eval      │ │    │
│           │              │  │ • Hourly counts │    │ • warmup-metrics        │ │    │
│           │              │  │ • Tier cache    │    │ • warmup-daily-reset    │ │    │
│           │              │  └─────────────────┘    └─────────────────────────┘ │    │
│           │              └────────────────────────────────────────────────────┘    │
│           │                       │                           │                     │
│           │                       │                           │                     │
│           ▼                       ▼                           ▼                     │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                         BULLMQ WORKERS (Node.js)                               │ │
│  │                                                                                │ │
│  │  ┌───────────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │ │
│  │  │    Injection      │   │  Tier Eval  │   │   Metrics   │   │   Daily     │  │ │
│  │  │     Worker        │   │   Worker    │   │ Aggregator  │   │   Reset     │  │ │
│  │  │                   │   │             │   │             │   │             │  │ │
│  │  │ • Process batch   │   │ • Promote/  │   │ • Compute   │   │ • Reset     │  │ │
│  │  │ • Check hourly    │   │   Demote    │   │   rates     │   │   counters  │  │ │
│  │  │   limits          │   │ • Suspend   │   │ • Store     │   │ • Refresh   │  │ │
│  │  │ • Inject to MTA   │   │ • Notify    │   │   daily     │   │   limits    │  │ │
│  │  │ • Update counters │   │             │   │             │   │             │  │ │
│  │  └───────────────────┘   └─────────────┘   └─────────────┘   └─────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                          │                                          │
│           ┌──────────────────────────────┘                                          │
│           ▼                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                MySQL (via Prisma)                              │ │
│  │                                                                                │ │
│  │  • domain_warmup_states     (warmup tier & status)                             │ │
│  │  • domain_warmup_metrics    (aggregated daily metrics)                         │ │
│  │  • domain_warmup_history    (audit log)                                        │ │
│  │  • broadcast_warmup_schedules (schedule metadata)                              │ │
│  │                                                                                │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                          │                                          │
│                                          ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                  KUMOMTA                                       │ │
│  │                                                                                │ │
│  │   HTTP API (:8000)  ◀────────── Email Injection (HTTP)                        │ │
│  │                                                                                │ │
│  │   Webhook Events ──────────────▶ Events Consumer                              │ │
│  │   (bounce, complaint,                    │                                     │ │
│  │    delivery, open, click)                ▼                                     │ │
│  │                              ┌────────────────────┐                           │ │
│  │                              │   Events Table     │                           │ │
│  │                              │     (MySQL)        │                           │ │
│  │                              └────────────────────┘                           │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Details

#### 4.2.1 Warmup Gateway (Optimistic Scheduling)

The gateway intercepts broadcast requests and schedules them optimistically across future days, assuming positive results and tier promotions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  WARMUP GATEWAY FLOW (Optimistic Scheduling)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Request: Send 8,500 emails from customer@example.com                       │
│                                                                              │
│   Step 1: Domain Resolution                                                  │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  Extract sending domain: example.com                                  │  │
│   │  Lookup warmup state from Redis/MySQL                                 │  │
│   │  Current tier: 1 (50/day, 10/hour)                                    │  │
│   │  Status: active                                                       │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   Step 2: Optimistic Schedule Calculation                                    │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  OPTIMISTIC ASSUMPTION: Tier promotions will occur on schedule        │  │
│   │                                                                       │  │
│   │  Day 1:  Tier 1 →    50 emails (capacity: 50)                         │  │
│   │  Day 2:  Tier 1 →    50 emails (capacity: 50)  [min 2 days at tier]   │  │
│   │  Day 3:  Tier 2 →   100 emails (capacity: 100) [promoted!]            │  │
│   │  Day 4:  Tier 2 →   100 emails (capacity: 100)                        │  │
│   │  Day 5:  Tier 3 →   250 emails (capacity: 250) [promoted!]            │  │
│   │  Day 6:  Tier 3 →   250 emails (capacity: 250)                        │  │
│   │  Day 7:  Tier 4 →   500 emails (capacity: 500) [promoted!]            │  │
│   │  Day 8:  Tier 4 →   500 emails (capacity: 500)                        │  │
│   │  Day 9:  Tier 4 →   500 emails (capacity: 500)                        │  │
│   │  Day 10: Tier 5 → 1,000 emails (capacity: 1000)[promoted!]            │  │
│   │  Day 11: Tier 5 → 1,000 emails (capacity: 1000)                       │  │
│   │  Day 12: Tier 5 → 1,000 emails (capacity: 1000)                       │  │
│   │  Day 13: Tier 6 → 2,200 emails (remaining)     [promoted!]            │  │
│   │  ─────────────────────────────────────────────                        │  │
│   │  Total:  8,500 emails across 13 days                                  │  │
│   │                                                                       │  │
│   │  Note: If promotions don't happen, admin can pause & reschedule       │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   Step 3: Create BullMQ Jobs (Per Day → Per Hour)                            │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  FOR EACH day IN schedule:                                            │  │
│   │    daily_batch = recipients for this day                              │  │
│   │    hourly_limit = TIER_HOURLY_LIMITS[expected_tier]                   │  │
│   │    hours_in_day = 24 (or business hours: 8am-8pm = 12 hours)          │  │
│   │                                                                       │  │
│   │    # Split daily batch into hourly chunks                             │  │
│   │    FOR hour IN 0..23:                                                 │  │
│   │      hourly_chunk = daily_batch[hour * hourly_limit : (hour+1) * ...]│  │
│   │      IF hourly_chunk is empty: CONTINUE                               │  │
│   │                                                                       │  │
│   │      # Create delayed BullMQ job                                      │  │
│   │      Queue.add('warmup-injection', {                                  │  │
│   │        broadcastId: "bc_abc123",                                      │  │
│   │        batchId: "batch_day1_hour14",                                  │  │
│   │        recipientIds: [...],  // Chunk of recipient IDs                │  │
│   │        sendingDomain: "example.com",                                  │  │
│   │        teamId: "team_xyz",                                            │  │
│   │        scheduledDay: 1,                                               │  │
│   │        scheduledHour: 14,                                             │  │
│   │        tierAtSchedule: 1,                                             │  │
│   │        expectedCount: 10                                              │  │
│   │      }, {                                                             │  │
│   │        delay: calculateDelayMs(day, hour),  // BullMQ delayed job     │  │
│   │        attempts: 3,                                                   │  │
│   │        backoff: { type: 'exponential', delay: 5000 },                 │  │
│   │        removeOnComplete: true,                                        │  │
│   │        removeOnFail: false  // Keep for debugging                     │  │
│   │      });                                                              │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   Step 4: Store Schedule Metadata (Prisma)                                   │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  await prisma.broadcastWarmupSchedule.create({                        │  │
│   │    data: {                                                            │  │
│   │      broadcastId,                                                     │  │
│   │      teamId,                                                          │  │
│   │      sendingDomain,                                                   │  │
│   │      totalRecipients: recipients.length,                              │  │
│   │      scheduledBatches: [                                              │  │
│   │        { date: "2024-12-21", count: 50, tier: 1 },                    │  │
│   │        { date: "2024-12-22", count: 50, tier: 1 },                    │  │
│   │        { date: "2024-12-23", count: 100, tier: 2 },                   │  │
│   │        ...                                                            │  │
│   │      ],                                                               │  │
│   │      estimatedCompletion: new Date("2025-01-02"),                     │  │
│   │      status: 'SCHEDULED'                                              │  │
│   │    }                                                                  │  │
│   │  });                                                                  │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   Step 5: Response to Customer                                               │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  {                                                                    │  │
│   │    "broadcast_id": "bc_abc123",                                       │  │
│   │    "total_recipients": 8500,                                          │  │
│   │    "warmup_schedule": {                                               │  │
│   │      "current_tier": 1,                                               │  │
│   │      "current_daily_limit": 50,                                       │  │
│   │      "scheduled_days": 13,                                            │  │
│   │      "estimated_completion": "2025-01-02T23:59:59Z",                  │  │
│   │      "schedule_type": "optimistic",                                   │  │
│   │      "daily_breakdown": [                                             │  │
│   │        { "date": "2024-12-21", "count": 50, "expected_tier": 1 },     │  │
│   │        { "date": "2024-12-22", "count": 50, "expected_tier": 1 },     │  │
│   │        { "date": "2024-12-23", "count": 100, "expected_tier": 2 },    │  │
│   │        ...                                                            │  │
│   │      ]                                                                │  │
│   │    },                                                                 │  │
│   │    "note": "Schedule assumes successful tier progression. Admins can  │  │
│   │             pause and reschedule if issues arise."                    │  │
│   │  }                                                                    │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 BullMQ Injection Worker

Workers process delayed jobs when their scheduled time arrives:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BULLMQ INJECTION WORKER ALGORITHM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   WORKER: warmup-injection (concurrency: 10)                                 │
│                                                                              │
│   ON JOB RECEIVED (job automatically dequeued by BullMQ at scheduled time): │
│                                                                              │
│   1. Pre-Flight Checks                                                       │
│      ┌────────────────────────────────────────────────────────────────────┐ │
│      │  const { broadcastId, recipientIds, sendingDomain, teamId } = job; │ │
│      │                                                                    │ │
│      │  // Check if broadcast is paused/cancelled                         │ │
│      │  const schedule = await prisma.broadcastWarmupSchedule.findUnique({│ │
│      │    where: { broadcastId }                                          │ │
│      │  });                                                               │ │
│      │                                                                    │ │
│      │  if (schedule.status === 'PAUSED' || schedule.status === 'CANCELLED'):│
│      │    return { skipped: true, reason: schedule.status };              │ │
│      │                                                                    │ │
│      │  // Check domain suspension                                        │ │
│      │  const status = await redis.get(`warmup:status:${sendingDomain}`); │ │
│      │  if (status === 'suspended'):                                      │ │
│      │    throw new Error('Domain suspended');  // Will retry later       │ │
│      └────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   2. Atomic Rate Limit Check (Lua Script for atomicity)                      │
│      ┌────────────────────────────────────────────────────────────────────┐ │
│      │  // Lua script ensures atomic check-and-increment                  │ │
│      │  const canSend = await redis.evalsha(RATE_LIMIT_SCRIPT, {          │ │
│      │    keys: [                                                         │ │
│      │      `warmup:counter:${domain}:daily`,                             │ │
│      │      `warmup:counter:${domain}:hourly:${currentHour}`,             │ │
│      │      `warmup:limit:${domain}:daily`,                               │ │
│      │      `warmup:limit:${domain}:hourly`                               │ │
│      │    ],                                                              │ │
│      │    args: [recipientIds.length]                                     │ │
│      │  });                                                               │ │
│      │                                                                    │ │
│      │  // Lua script:                                                    │ │
│      │  // local daily = tonumber(redis.call('GET', KEYS[1])) or 0        │ │
│      │  // local hourly = tonumber(redis.call('GET', KEYS[2])) or 0       │ │
│      │  // local daily_limit = tonumber(redis.call('GET', KEYS[3]))       │ │
│      │  // local hourly_limit = tonumber(redis.call('GET', KEYS[4]))      │ │
│      │  // local count = tonumber(ARGV[1])                                │ │
│      │  //                                                                │ │
│      │  // if daily + count <= daily_limit and hourly + count <= hourly:  │ │
│      │  //   redis.call('INCRBY', KEYS[1], count)                         │ │
│      │  //   redis.call('INCRBY', KEYS[2], count)                         │ │
│      │  //   redis.call('EXPIRE', KEYS[2], 3600) -- 1 hour TTL            │ │
│      │  //   return 1  -- Success                                         │ │
│      │  // else                                                           │ │
│      │  //   return 0  -- Rate limited                                    │ │
│      │  // end                                                            │ │
│      │                                                                    │ │
│      │  if (!canSend):                                                    │ │
│      │    // Re-queue with 5-minute delay (BullMQ handles this)           │ │
│      │    throw new RateLimitError('Hourly/daily limit reached');         │ │
│      └────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   3. Inject to KumoMTA                                                       │
│      ┌────────────────────────────────────────────────────────────────────┐ │
│      │  const recipients = await prisma.contact.findMany({                │ │
│      │    where: { id: { in: recipientIds } }                             │ │
│      │  });                                                               │ │
│      │                                                                    │ │
│      │  for (const recipient of recipients) {                             │ │
│      │    await kumoMTA.inject({                                          │ │
│      │      to: recipient.email,                                          │ │
│      │      from: `sender@${sendingDomain}`,                              │ │
│      │      // ... message content from broadcast                         │ │
│      │      headers: {                                                    │ │
│      │        'X-Kibamail-Broadcast-Id': broadcastId,                     │ │
│      │        'X-Kibamail-Batch-Id': job.data.batchId                     │ │
│      │      }                                                             │ │
│      │    });                                                             │ │
│      │  }                                                                 │ │
│      └────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   4. Update Progress                                                         │
│      ┌────────────────────────────────────────────────────────────────────┐ │
│      │  // Update broadcast progress (for customer visibility)            │ │
│      │  await redis.incrby(`broadcast:${broadcastId}:sent`, count);       │ │
│      │                                                                    │ │
│      │  return {                                                          │ │
│      │    success: true,                                                  │ │
│      │    injected: recipientIds.length,                                  │ │
│      │    broadcastId,                                                    │ │
│      │    batchId: job.data.batchId                                       │ │
│      │  };                                                                │ │
│      └────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   ERROR HANDLING:                                                            │
│   ┌────────────────────────────────────────────────────────────────────────┐│
│   │  RateLimitError → Retry in 5 minutes (backoff)                        ││
│   │  KumoMTA timeout → Retry up to 3 times with exponential backoff       ││
│   │  Domain suspended → Move to failed queue, alert admin                 ││
│   │  Broadcast cancelled → Skip silently, mark job complete               ││
│   └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.2.3 Tier Evaluation Worker (BullMQ Scheduled Job)

Runs every hour via BullMQ repeatable job to evaluate tier transitions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TIER EVALUATION ALGORITHM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   BULLMQ REPEATABLE JOB: warmup-tier-evaluation (every hour)                 │
│                                                                              │
│   // Fetch all active domains                                                │
│   const domains = await prisma.domainWarmupState.findMany({                  │
│     where: { tierStatus: 'ACTIVE' }                                          │
│   });                                                                        │
│                                                                              │
│   FOR EACH domain IN domains:                                                │
│                                                                              │
│   1. Aggregate Recent Metrics (Rolling 7-day window)                         │
│      ┌────────────────────────────────────────────────────────────────────┐ │
│      │  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);│ │
│      │                                                                    │ │
│      │  const metrics = await prisma.domainWarmupMetrics.aggregate({      │ │
│      │    where: {                                                        │ │
│      │      domainWarmupStateId: domain.id,                               │ │
│      │      windowDate: { gte: sevenDaysAgo }                             │ │
│      │    },                                                              │ │
│      │    _sum: {                                                         │ │
│      │      emailsSent: true,                                             │ │
│      │      emailsDelivered: true,                                        │ │
│      │      emailsBouncedHard: true,                                      │ │
│      │      spamComplaints: true                                          │ │
│      │    }                                                               │ │
│      │  });                                                               │ │
│      │                                                                    │ │
│      │  // Count distinct sending days                                    │ │
│      │  const sendingDays = await prisma.domainWarmupMetrics.groupBy({    │ │
│      │    by: ['windowDate'],                                             │ │
│      │    where: {                                                        │ │
│      │      domainWarmupStateId: domain.id,                               │ │
│      │      windowDate: { gte: sevenDaysAgo },                            │ │
│      │      emailsSent: { gt: 0 }                                         │ │
│      │    }                                                               │ │
│      │  });                                                               │ │
│      └────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   2. Calculate Rates                                                         │
│      ┌────────────────────────────────────────────────────────────────────┐ │
│      │  const totalSent = metrics._sum.emailsSent || 0;                   │ │
│      │  const totalDelivered = metrics._sum.emailsDelivered || 0;         │ │
│      │  const totalHardBounces = metrics._sum.emailsBouncedHard || 0;     │ │
│      │  const totalComplaints = metrics._sum.spamComplaints || 0;         │ │
│      │                                                                    │ │
│      │  if (totalSent < 100) continue; // Insufficient data               │ │
│      │                                                                    │ │
│      │  const hardBounceRate = (totalHardBounces / totalSent) * 100;      │ │
│      │  const spamRate = (totalComplaints / totalSent) * 100;             │ │
│      │  const deliveryRate = (totalDelivered / totalSent) * 100;          │ │
│      │  const utilization = totalSent / (domain.dailyLimit * 7) * 100;    │ │
│      │                                                                    │ │
│      │  // Note: Open/click rates NOT used - not all emails have tracking │ │
│      └────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   3. Evaluate Suspension Triggers                                            │
│      ┌────────────────────────────────────────────────────────────────────┐ │
│      │  if (hardBounceRate > 10.0 || spamRate > 1.0) {                    │ │
│      │    await suspendDomain(domain);                                    │ │
│      │    await notifyCustomer(domain.teamId, 'SUSPENDED');               │ │
│      │    await logHistory(domain, 'SUSPENDED', { hardBounceRate, spam });│ │
│      │    continue;                                                       │ │
│      │  }                                                                 │ │
│      └────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   4. Evaluate Demotion Triggers                                              │
│      ┌────────────────────────────────────────────────────────────────────┐ │
│      │  if (hardBounceRate > 8.0 || spamRate > 0.5) {                     │ │
│      │    await demoteTier(domain, 2);  // Demote by 2 tiers              │ │
│      │  } else if (hardBounceRate > 5.0 || spamRate > 0.3) {              │ │
│      │    await demoteTier(domain, 1);  // Demote by 1 tier               │ │
│      │  } else if (daysSinceLastSend(domain) > 14) {                      │ │
│      │    await demoteTier(domain, 1);  // Inactivity demotion            │ │
│      │  } else if (daysSinceLastSend(domain) > 30) {                      │ │
│      │    await resetToTier1(domain);   // Dormancy reset                 │ │
│      │  }                                                                 │ │
│      └────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   5. Evaluate Promotion Eligibility                                          │
│      ┌────────────────────────────────────────────────────────────────────┐ │
│      │  if (domain.currentTier === 12) continue; // Already graduated     │ │
│      │                                                                    │ │
│      │  const daysAtTier = daysSince(domain.tierEnteredAt);               │ │
│      │  const minDays = MIN_DAYS_FOR_TIER[domain.currentTier];            │ │
│      │                                                                    │ │
│      │  // Promotion criteria (no open/click rate - tracking not always on)│ │
│      │  const eligible =                                                  │ │
│      │    daysAtTier >= minDays &&                                        │ │
│      │    utilization >= 70 &&                                            │ │
│      │    sendingDays.length >= 5 &&                                      │ │
│      │    hardBounceRate <= 2.0 &&                                        │ │
│      │    spamRate <= 0.1 &&                                              │ │
│      │    deliveryRate >= 95.0;  // Positive signal: high delivery rate   │ │
│      │                                                                    │ │
│      │  if (eligible) {                                                   │ │
│      │    await promoteTier(domain);                                      │ │
│      │    await updateRedisLimits(domain);                                │ │
│      │    await logHistory(domain, 'PROMOTED', metricsSnapshot);          │ │
│      │    await notifyCustomer(domain.teamId, 'TIER_PROMOTED');           │ │
│      │  }                                                                 │ │
│      └────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.2.4 Metrics Aggregator (BullMQ Scheduled Job)

Runs every 15 minutes via BullMQ repeatable job to aggregate event data:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       METRICS AGGREGATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   BULLMQ REPEATABLE JOB: warmup-metrics-aggregation (every 15 minutes)       │
│                                                                              │
│   SOURCE: events table (populated by KumoMTA webhooks)                       │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  // Events model in Prisma (already exists in your schema)          │   │
│   │  model Event {                                                      │   │
│   │    id              String   @id @default(cuid())                    │   │
│   │    eventType       String   @map("event_type")                      │   │
│   │    bounceClass     String?  @map("bounce_class")                    │   │
│   │    recipientDomain String   @map("recipient_domain")                │   │
│   │    sendingDomain   String   @map("sending_domain")                  │   │
│   │    teamId          String   @map("team_id")                         │   │
│   │    messageId       String   @map("message_id")                      │   │
│   │    timestamp       DateTime                                         │   │
│   │  }                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   AGGREGATION LOGIC (Prisma + Raw SQL for performance):                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);          │   │
│   │                                                                     │   │
│   │  // Get all domains with warmup state                               │   │
│   │  const domains = await prisma.domainWarmupState.findMany({          │   │
│   │    where: { tierStatus: 'ACTIVE' }                                  │   │
│   │  });                                                                │   │
│   │                                                                     │   │
│   │  for (const domain of domains) {                                    │   │
│   │    const today = new Date().toISOString().split('T')[0];            │   │
│   │                                                                     │   │
│   │    // Aggregate events for this domain                              │   │
│   │    const [sent, delivered, hardBounces, softBounces, complaints] =  │   │
│   │      await Promise.all([                                            │   │
│   │        prisma.event.count({                                         │   │
│   │          where: {                                                   │   │
│   │            sendingDomain: domain.sendingDomain,                     │   │
│   │            eventType: 'injection',                                  │   │
│   │            timestamp: { gte: oneHourAgo }                           │   │
│   │          }                                                          │   │
│   │        }),                                                          │   │
│   │        prisma.event.count({                                         │   │
│   │          where: {                                                   │   │
│   │            sendingDomain: domain.sendingDomain,                     │   │
│   │            eventType: 'delivery',                                   │   │
│   │            timestamp: { gte: oneHourAgo }                           │   │
│   │          }                                                          │   │
│   │        }),                                                          │   │
│   │        prisma.event.count({                                         │   │
│   │          where: {                                                   │   │
│   │            sendingDomain: domain.sendingDomain,                     │   │
│   │            eventType: 'bounce',                                     │   │
│   │            bounceClass: 'hard',                                     │   │
│   │            timestamp: { gte: oneHourAgo }                           │   │
│   │          }                                                          │   │
│   │        }),                                                          │   │
│   │        // ... similar for soft bounces, complaints                  │   │
│   │      ]);                                                            │   │
│   │                                                                     │   │
│   │    // Upsert metrics for today                                      │   │
│   │    await prisma.domainWarmupMetrics.upsert({                        │   │
│   │      where: {                                                       │   │
│   │        domainWarmupStateId_windowDate: {                            │   │
│   │          domainWarmupStateId: domain.id,                            │   │
│   │          windowDate: new Date(today)                                │   │
│   │        }                                                            │   │
│   │      },                                                             │   │
│   │      create: {                                                      │   │
│   │        domainWarmupStateId: domain.id,                              │   │
│   │        windowDate: new Date(today),                                 │   │
│   │        emailsSent: sent,                                            │   │
│   │        emailsDelivered: delivered,                                  │   │
│   │        emailsBouncedHard: hardBounces,                              │   │
│   │        emailsBouncedSoft: softBounces,                              │   │
│   │        spamComplaints: complaints                                   │   │
│   │      },                                                             │   │
│   │      update: {                                                      │   │
│   │        emailsSent: { increment: sent },                             │   │
│   │        emailsDelivered: { increment: delivered },                   │   │
│   │        emailsBouncedHard: { increment: hardBounces },               │   │
│   │        emailsBouncedSoft: { increment: softBounces },               │   │
│   │        spamComplaints: { increment: complaints }                    │   │
│   │      }                                                              │   │
│   │    });                                                              │   │
│   │  }                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ALSO: Aggregate per-provider metrics for Gmail, Outlook, Yahoo             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. BullMQ Optimistic Scheduling Strategy

### 5.1 Optimistic Broadcast Scheduling Algorithm

When a customer submits a broadcast, we optimistically schedule across future days assuming tier promotions will occur:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              OPTIMISTIC BROADCAST SCHEDULING ALGORITHM                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   INPUT:                                                                     │
│     - recipients: List of 8,500 email addresses                              │
│     - sending_domain: "customer.com"                                         │
│     - current_tier: 1 (50/day, 10/hour)                                      │
│                                                                              │
│   TIER PROGRESSION TABLE (for optimistic scheduling):                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  const TIER_CONFIG = {                                              │   │
│   │    1:  { daily: 50,     hourly: 10,   minDays: 2 },                 │   │
│   │    2:  { daily: 100,    hourly: 20,   minDays: 2 },                 │   │
│   │    3:  { daily: 250,    hourly: 50,   minDays: 2 },                 │   │
│   │    4:  { daily: 500,    hourly: 100,  minDays: 3 },                 │   │
│   │    5:  { daily: 1000,   hourly: 200,  minDays: 3 },                 │   │
│   │    6:  { daily: 2500,   hourly: 500,  minDays: 3 },                 │   │
│   │    7:  { daily: 5000,   hourly: 1000, minDays: 4 },                 │   │
│   │    8:  { daily: 10000,  hourly: 2000, minDays: 4 },                 │   │
│   │    9:  { daily: 25000,  hourly: 5000, minDays: 5 },                 │   │
│   │    10: { daily: 50000,  hourly: 10000, minDays: 5 },                │   │
│   │    11: { daily: 100000, hourly: 20000, minDays: 7 },                │   │
│   │    12: { daily: Infinity, hourly: Infinity, minDays: 0 }            │   │
│   │  };                                                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   STEP 1: Generate Optimistic Schedule                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  function generateOptimisticSchedule(                               │   │
│   │    totalRecipients: number,                                         │   │
│   │    currentTier: number,                                             │   │
│   │    daysAtCurrentTier: number                                        │   │
│   │  ): DaySchedule[] {                                                 │   │
│   │                                                                     │   │
│   │    const schedule: DaySchedule[] = [];                              │   │
│   │    let remaining = totalRecipients;                                 │   │
│   │    let tier = currentTier;                                          │   │
│   │    let daysInTier = daysAtCurrentTier;                              │   │
│   │    let dayNumber = 0;                                               │   │
│   │                                                                     │   │
│   │    while (remaining > 0) {                                          │   │
│   │      const config = TIER_CONFIG[tier];                              │   │
│   │      const dailyLimit = config.daily;                               │   │
│   │      const toSendToday = Math.min(remaining, dailyLimit);           │   │
│   │                                                                     │   │
│   │      schedule.push({                                                │   │
│   │        dayNumber,                                                   │   │
│   │        date: addDays(new Date(), dayNumber),                        │   │
│   │        count: toSendToday,                                          │   │
│   │        expectedTier: tier,                                          │   │
│   │        hourlyLimit: config.hourly                                   │   │
│   │      });                                                            │   │
│   │                                                                     │   │
│   │      remaining -= toSendToday;                                      │   │
│   │      daysInTier++;                                                  │   │
│   │      dayNumber++;                                                   │   │
│   │                                                                     │   │
│   │      // Optimistically assume promotion after minDays               │   │
│   │      if (daysInTier >= config.minDays && tier < 12) {               │   │
│   │        tier++;                                                      │   │
│   │        daysInTier = 0;                                              │   │
│   │      }                                                              │   │
│   │    }                                                                │   │
│   │                                                                     │   │
│   │    return schedule;                                                 │   │
│   │  }                                                                  │   │
│   │                                                                     │   │
│   │  // Example output for 8,500 recipients starting at Tier 1:         │   │
│   │  // Day 1:  50 emails  (Tier 1)                                     │   │
│   │  // Day 2:  50 emails  (Tier 1) → promoted to Tier 2                │   │
│   │  // Day 3:  100 emails (Tier 2)                                     │   │
│   │  // Day 4:  100 emails (Tier 2) → promoted to Tier 3                │   │
│   │  // Day 5:  250 emails (Tier 3)                                     │   │
│   │  // Day 6:  250 emails (Tier 3) → promoted to Tier 4                │   │
│   │  // Day 7:  500 emails (Tier 4)                                     │   │
│   │  // Day 8:  500 emails (Tier 4)                                     │   │
│   │  // Day 9:  500 emails (Tier 4) → promoted to Tier 5                │   │
│   │  // Day 10: 1000 emails (Tier 5)                                    │   │
│   │  // Day 11: 1000 emails (Tier 5)                                    │   │
│   │  // Day 12: 1000 emails (Tier 5) → promoted to Tier 6               │   │
│   │  // Day 13: 2200 emails (Tier 6) [remaining]                        │   │
│   │  // Total: 8,500 emails across 13 days                              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   STEP 2: Create BullMQ Jobs with Hourly Distribution                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  async function createBullMQJobs(                                   │   │
│   │    broadcastId: string,                                             │   │
│   │    recipients: string[],                                            │   │
│   │    schedule: DaySchedule[],                                         │   │
│   │    sendingDomain: string,                                           │   │
│   │    teamId: string                                                   │   │
│   │  ) {                                                                │   │
│   │    const queue = new Queue('warmup-injection', { connection });     │   │
│   │    let recipientIndex = 0;                                          │   │
│   │                                                                     │   │
│   │    for (const day of schedule) {                                    │   │
│   │      const dailyRecipients = recipients.slice(                      │   │
│   │        recipientIndex,                                              │   │
│   │        recipientIndex + day.count                                   │   │
│   │      );                                                             │   │
│   │      recipientIndex += day.count;                                   │   │
│   │                                                                     │   │
│   │      // Split daily batch into hourly chunks                        │   │
│   │      const hourlyChunks = chunkArray(dailyRecipients, day.hourlyLimit);│   │
│   │      const hoursNeeded = Math.min(hourlyChunks.length, 24);         │   │
│   │                                                                     │   │
│   │      for (let hour = 0; hour < hoursNeeded; hour++) {               │   │
│   │        const chunk = hourlyChunks[hour];                            │   │
│   │        if (!chunk || chunk.length === 0) continue;                  │   │
│   │                                                                     │   │
│   │        // Calculate delay: days + hours from now                    │   │
│   │        const scheduledTime = new Date(day.date);                    │   │
│   │        scheduledTime.setHours(8 + hour); // Start at 8am            │   │
│   │        const delayMs = scheduledTime.getTime() - Date.now();        │   │
│   │                                                                     │   │
│   │        await queue.add(                                             │   │
│   │          'inject-batch',                                            │   │
│   │          {                                                          │   │
│   │            broadcastId,                                             │   │
│   │            batchId: `batch_day${day.dayNumber}_hour${hour}`,        │   │
│   │            recipientIds: chunk,                                     │   │
│   │            sendingDomain,                                           │   │
│   │            teamId,                                                  │   │
│   │            scheduledDay: day.dayNumber,                             │   │
│   │            scheduledHour: 8 + hour,                                 │   │
│   │            tierAtSchedule: day.expectedTier,                        │   │
│   │            expectedCount: chunk.length                              │   │
│   │          },                                                         │   │
│   │          {                                                          │   │
│   │            delay: Math.max(0, delayMs),                             │   │
│   │            attempts: 3,                                             │   │
│   │            backoff: { type: 'exponential', delay: 5000 },           │   │
│   │            removeOnComplete: { count: 1000 },                       │   │
│   │            removeOnFail: false                                      │   │
│   │          }                                                          │   │
│   │        );                                                           │   │
│   │      }                                                              │   │
│   │    }                                                                │   │
│   │  }                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   STEP 3: Store Schedule Metadata in MySQL                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  await prisma.broadcastWarmupSchedule.create({                      │   │
│   │    data: {                                                          │   │
│   │      broadcastId,                                                   │   │
│   │      teamId,                                                        │   │
│   │      sendingDomain,                                                 │   │
│   │      totalRecipients: recipients.length,                            │   │
│   │      scheduledBatches: schedule.map(day => ({                       │   │
│   │        date: day.date.toISOString(),                                │   │
│   │        count: day.count,                                            │   │
│   │        tierAtSchedule: day.expectedTier                             │   │
│   │      })),                                                           │   │
│   │      estimatedCompletion: schedule[schedule.length - 1].date,       │   │
│   │      status: 'SCHEDULED'                                            │   │
│   │    }                                                                │   │
│   │  });                                                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Admin Controls: Pause and Reschedule

When things go wrong, admins can pause broadcasts and reschedule:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ADMIN PAUSE & RESCHEDULE CONTROLS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   PAUSE BROADCAST:                                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  async function pauseBroadcast(broadcastId: string) {               │   │
│   │    // 1. Update schedule status                                     │   │
│   │    await prisma.broadcastWarmupSchedule.update({                    │   │
│   │      where: { broadcastId },                                        │   │
│   │      data: { status: 'PAUSED', pausedAt: new Date() }               │   │
│   │    });                                                              │   │
│   │                                                                     │   │
│   │    // 2. Jobs in BullMQ will check status before processing         │   │
│   │    //    (see Injection Worker pre-flight checks)                   │   │
│   │    //    Paused jobs will be skipped, not removed                   │   │
│   │                                                                     │   │
│   │    // 3. Optionally: Remove pending jobs from queue                 │   │
│   │    const queue = new Queue('warmup-injection', { connection });     │   │
│   │    const jobs = await queue.getJobs(['delayed', 'waiting']);        │   │
│   │    for (const job of jobs) {                                        │   │
│   │      if (job.data.broadcastId === broadcastId) {                    │   │
│   │        await job.remove();                                          │   │
│   │      }                                                              │   │
│   │    }                                                                │   │
│   │  }                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   RESCHEDULE BROADCAST (after pause or tier change):                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  async function rescheduleBroadcast(broadcastId: string) {          │   │
│   │    const schedule = await prisma.broadcastWarmupSchedule.findUnique({│   │
│   │      where: { broadcastId }                                         │   │
│   │    });                                                              │   │
│   │                                                                     │   │
│   │    // 1. Get remaining recipients (not yet sent)                    │   │
│   │    const sentCount = await redis.get(`broadcast:${broadcastId}:sent`);│   │
│   │    const remainingRecipients = await getRemainingRecipients(        │   │
│   │      broadcastId,                                                   │   │
│   │      parseInt(sentCount || '0')                                     │   │
│   │    );                                                               │   │
│   │                                                                     │   │
│   │    // 2. Get current tier (may have changed)                        │   │
│   │    const domain = await prisma.domainWarmupState.findFirst({        │   │
│   │      where: { sendingDomain: schedule.sendingDomain }               │   │
│   │    });                                                              │   │
│   │                                                                     │   │
│   │    // 3. Generate new optimistic schedule                           │   │
│   │    const newSchedule = generateOptimisticSchedule(                  │   │
│   │      remainingRecipients.length,                                    │   │
│   │      domain.currentTier,                                            │   │
│   │      domain.daysAtCurrentTier                                       │   │
│   │    );                                                               │   │
│   │                                                                     │   │
│   │    // 4. Create new BullMQ jobs                                     │   │
│   │    await createBullMQJobs(                                          │   │
│   │      broadcastId,                                                   │   │
│   │      remainingRecipients,                                           │   │
│   │      newSchedule,                                                   │   │
│   │      schedule.sendingDomain,                                        │   │
│   │      schedule.teamId                                                │   │
│   │    );                                                               │   │
│   │                                                                     │   │
│   │    // 5. Update schedule metadata                                   │   │
│   │    await prisma.broadcastWarmupSchedule.update({                    │   │
│   │      where: { broadcastId },                                        │   │
│   │      data: {                                                        │   │
│   │        status: 'SCHEDULED',                                         │   │
│   │        scheduledBatches: newSchedule,                               │   │
│   │        estimatedCompletion: newSchedule[newSchedule.length - 1].date,│   │
│   │        rescheduledAt: new Date(),                                   │   │
│   │        rescheduledCount: { increment: 1 }                           │   │
│   │      }                                                              │   │
│   │    });                                                              │   │
│   │  }                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Provider Distribution (Optional Enhancement)

For better warmup, distribute across mailbox providers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROVIDER-AWARE DISTRIBUTION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Goal: Don't send all Gmail recipients on day 1, Outlook on day 2, etc.     │
│         Instead, mix providers each day for balanced reputation building.    │
│                                                                              │
│   Provider Detection:                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  gmail.com, googlemail.com → Gmail                                   │   │
│   │  outlook.com, hotmail.com, live.com → Microsoft                      │   │
│   │  yahoo.com, aol.com, verizon.net → Yahoo                             │   │
│   │  icloud.com, me.com, mac.com → Apple                                 │   │
│   │  *.edu, *.gov → Institutional                                        │   │
│   │  everything else → Other                                             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Distribution Strategy:                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Total recipients: 10,000                                            │   │
│   │  Gmail: 5,000 (50%)                                                  │   │
│   │  Microsoft: 2,500 (25%)                                              │   │
│   │  Yahoo: 1,500 (15%)                                                  │   │
│   │  Other: 1,000 (10%)                                                  │   │
│   │                                                                      │   │
│   │  Daily batch of 500:                                                 │   │
│   │  - Gmail: 250 (50%)                                                  │   │
│   │  - Microsoft: 125 (25%)                                              │   │
│   │  - Yahoo: 75 (15%)                                                   │   │
│   │  - Other: 50 (10%)                                                   │   │
│   │                                                                      │   │
│   │  This ensures proportional exposure to each provider each day        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Adaptive Warmup (Dynamic Tier Progression)

### 6.1 Performance-Based Acceleration

Based on Infobip's smart warmup model (adapted for delivery-rate-only metrics):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ADAPTIVE WARMUP SPEEDS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Note: Open/click rates are NOT used for track qualification because       │
│   not all customers enable email tracking. We rely on delivery metrics only.│
│                                                                              │
│   FAST TRACK (50% daily increase)                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Qualification:                                                      │   │
│   │  - Delivery rate > 98%                                               │   │
│   │  - Hard bounce rate < 1%                                             │   │
│   │  - Spam complaint rate < 0.05%                                       │   │
│   │                                                                      │   │
│   │  Progression: 50 → 75 → 112 → 168 → 252 → 378 → 567 → 850 ...        │   │
│   │  Time to 10K: ~10 days                                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   NORMAL TRACK (40% daily increase)                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Qualification:                                                      │   │
│   │  - Delivery rate > 96%                                               │   │
│   │  - Hard bounce rate < 2%                                             │   │
│   │  - Spam complaint rate < 0.1%                                        │   │
│   │                                                                      │   │
│   │  Progression: 50 → 70 → 98 → 137 → 192 → 269 → 376 → 527 ...         │   │
│   │  Time to 10K: ~14 days                                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   SLOW TRACK (30% daily increase)                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Qualification:                                                      │   │
│   │  - Delivery rate < 96% OR                                            │   │
│   │  - Hard bounce rate 2-5% OR                                          │   │
│   │  - Spam complaint rate 0.1-0.3%                                      │   │
│   │                                                                      │   │
│   │  Progression: 50 → 65 → 85 → 110 → 143 → 186 → 242 → 314 ...         │   │
│   │  Time to 10K: ~20 days                                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   PAUSE TRACK (0% increase, hold current tier)                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Trigger:                                                            │   │
│   │  - Hard bounce rate 5-8%                                             │   │
│   │  - Spam complaint rate 0.3-0.5%                                      │   │
│   │                                                                      │   │
│   │  Action: Hold at current tier, send warning notification             │   │
│   │  Resume: When metrics return to Normal track thresholds              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   REGRESSION TRACK (decrease volume)                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Trigger:                                                            │   │
│   │  - Hard bounce rate > 8%                                             │   │
│   │  - Spam complaint rate > 0.5%                                        │   │
│   │                                                                      │   │
│   │  Action: Demote 1-2 tiers, reduce daily limit by 30-50%              │   │
│   │  Severe: Suspend sending entirely until manual review                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Continuous Warmup Mode

For domains that have graduated but need ongoing reputation maintenance:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    POST-GRADUATION MONITORING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Even graduated domains (Tier 12) are continuously monitored:               │
│                                                                              │
│   Healthy State:                                                             │
│   - Bounce rate < 2%, Spam rate < 0.1%                                       │
│   - No action needed, full sending capacity                                  │
│                                                                              │
│   Warning State:                                                             │
│   - Bounce rate 2-5% OR Spam rate 0.1-0.3%                                   │
│   - Send warning notification                                                │
│   - No volume reduction yet                                                  │
│                                                                              │
│   Throttled State:                                                           │
│   - Bounce rate 5-8% OR Spam rate 0.3-0.5%                                   │
│   - Reduce sending capacity by 50%                                           │
│   - Demote to Tier 10 temporarily                                            │
│                                                                              │
│   Suspended State:                                                           │
│   - Bounce rate > 8% OR Spam rate > 0.5%                                     │
│   - Suspend all sending                                                      │
│   - Require manual intervention to resume                                    │
│   - On resume, start at Tier 5 (not Tier 1, since has history)               │
│                                                                              │
│   Dormancy Detection:                                                        │
│   - No sends for 14 days: Demote 2 tiers                                     │
│   - No sends for 30 days: Reset to Tier 4 (accelerated re-warmup)            │
│   - No sends for 60 days: Reset to Tier 1 (full re-warmup)                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Customer-Facing Features

### 7.1 Warmup Dashboard Data Points

```yaml
warmup_dashboard:
  current_status:
    tier: 4
    tier_name: "Warming Up"
    daily_limit: 500
    daily_sent: 342
    daily_remaining: 158
    hourly_limit: 80
    status: "active" # active, warning, suspended

  progression:
    days_at_current_tier: 5
    days_until_promotion: 2 # estimated
    next_tier_limit: 1000
    estimated_graduation_date: "2025-01-15"
    warmup_track: "normal" # fast, normal, slow

  health_metrics:
    # Note: Open/click rates not shown because not all emails have tracking enabled
    hard_bounce_rate: 1.2
    soft_bounce_rate: 3.4
    spam_complaint_rate: 0.05
    delivery_rate: 98.7
    health_score: 85 # 0-100 (based on bounce/spam/delivery rates only)

  recent_history:
    - date: "2024-12-19"
      sent: 478
      delivered: 472
      bounced: 6
      complaints: 0
    - date: "2024-12-18"
      sent: 445
      delivered: 441
      bounced: 4
      complaints: 0

  # Queued emails are stored in BullMQ (Redis), not MySQL
  # This data is fetched from BullMQ queue inspection
  scheduled_batches:
    total_pending: 9700
    source: "BullMQ warmup-injection queue"
    by_date:
      - date: "2024-12-21"
        count: 500
        jobs_in_queue: 5 # 5 hourly batches of ~100 each
      - date: "2024-12-22"
        count: 500
        jobs_in_queue: 5
    estimated_completion: "2025-01-08"
```

### 7.2 Broadcast Response Schema

```yaml
broadcast_response:
  broadcast_id: "bc_abc123def456"
  status: "accepted"

  sending_summary:
    total_recipients: 10000
    sending_immediately: 300
    queued_for_warmup: 9700

  warmup_info:
    current_tier: 4
    daily_limit: 500
    reason: "Domain warmup in progress"

  schedule:
    estimated_completion: "2025-01-08T00:00:00Z"
    days_to_complete: 20
    next_batch_date: "2024-12-21"
    next_batch_size: 500

  actions:
    view_progress_url: "/broadcasts/bc_abc123def456/progress"
    warmup_dashboard_url: "/settings/warmup"

  tips:
    - "Send to your most engaged subscribers first for faster warmup"
    - "Maintain consistent daily sending to build reputation faster"
    - "Monitor your bounce rate - keep it under 2% for optimal progression"
```

### 7.3 Webhook Events

```yaml
warmup_webhooks:
  - event: "warmup.tier_promoted"
    payload:
      domain: "customer.com"
      previous_tier: 4
      new_tier: 5
      new_daily_limit: 1000
      reason: "Met all promotion criteria"

  - event: "warmup.tier_demoted"
    payload:
      domain: "customer.com"
      previous_tier: 5
      new_tier: 4
      new_daily_limit: 500
      reason: "Hard bounce rate exceeded 5%"
      metrics:
        hard_bounce_rate: 5.2

  - event: "warmup.suspended"
    payload:
      domain: "customer.com"
      reason: "Spam complaint rate exceeded 1%"
      action_required: "Contact support to reactivate"
      suspended_until: null # indefinite until reviewed

  - event: "warmup.warning"
    payload:
      domain: "customer.com"
      warning_type: "high_bounce_rate"
      current_value: 4.5
      threshold: 5.0
      recommendation: "Review your email list for invalid addresses"

  - event: "warmup.graduated"
    payload:
      domain: "customer.com"
      graduation_date: "2025-01-15T00:00:00Z"
      total_warmup_days: 28
      message: "Domain has graduated warmup. No more daily limits apply."
```

---

## 8. Edge Cases and Special Handling

### 8.1 Transactional vs Marketing Email Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 STREAM-BASED WARMUP MANAGEMENT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Option A: Separate Warmup Tracks (Recommended)                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  mail.customer.com (transactional) → Own warmup state               │   │
│   │  marketing.customer.com (marketing) → Own warmup state              │   │
│   │                                                                      │   │
│   │  Benefits:                                                           │   │
│   │  - Marketing issues don't affect transactional delivery             │   │
│   │  - Each stream warms independently                                   │   │
│   │  - Clearer metrics per stream                                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Option B: Shared Domain, Separate Limits                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  customer.com:                                                       │   │
│   │    - marketing_tier: 4 (500/day)                                     │   │
│   │    - transactional_tier: 8 (10,000/day) ← faster progression         │   │
│   │                                                                      │   │
│   │  Transactional emails get higher priority and faster warmup         │   │
│   │  because they're typically more wanted and have lower complaints    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Transactional Fast-Track Rules:                                            │
│   - Skip Tiers 1-3, start at Tier 4                                          │
│   - 2x faster promotion criteria (1 day vs 2 days minimum)                   │
│   - Higher complaint tolerance (0.5% vs 0.1% threshold)                      │
│   - But still subject to bounce limits                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Multi-Domain Customer Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-DOMAIN MANAGEMENT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Scenario: Customer has 5 verified domains                                  │
│                                                                              │
│   Each domain gets independent warmup state:                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  brand-a.com     → Tier 6 (2,500/day)                                │   │
│   │  brand-b.com     → Tier 3 (250/day)                                  │   │
│   │  promo.brand.com → Tier 1 (50/day) - new subdomain                   │   │
│   │  news.brand.com  → Tier 9 (25,000/day) - established                 │   │
│   │  brand-c.com     → Suspended (high complaints)                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Team-Level Aggregate Limits (optional):                                    │
│   - Even with individual domain limits, apply team-wide caps                 │
│   - Prevents gaming by creating many domains                                 │
│   - Team limit = MAX(plan_limit, SUM(domain_limits))                         │
│                                                                              │
│   Cross-Domain Reputation:                                                   │
│   - If one domain is suspended for spam, flag team for review               │
│   - Don't automatically suspend other domains, but increase scrutiny        │
│   - Pattern detection: similar abuse across domains = team suspension       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 List Import and Verification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LIST IMPORT PROTECTION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Problem: Customer imports 100K emails on day 1, wants to send immediately │
│                                                                              │
│   Solution: Gate large list imports behind warmup readiness                  │
│                                                                              │
│   Import Rules:                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Tier 1-3:   Max import = 1,000 contacts                             │   │
│   │  Tier 4-6:   Max import = 10,000 contacts                            │   │
│   │  Tier 7-9:   Max import = 50,000 contacts                            │   │
│   │  Tier 10-11: Max import = 250,000 contacts                           │   │
│   │  Tier 12:    Plan-based limits                                       │   │
│   │                                                                      │   │
│   │  Imports exceeding limit require:                                    │   │
│   │  - Staggered import (import 1K now, rest queued)                     │   │
│   │  - Email verification pass (optional, recommended)                   │   │
│   │  - Manual approval for very large lists                              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   New Contact Verification Incentive:                                        │
│   - If customer uses built-in email verification:                            │
│     - Skip Tiers 1-2, start at Tier 3                                        │
│     - 25% higher daily limit bonus                                           │
│   - Reduces bounce rates significantly                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.4 Broadcast Expiration and Cancellation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 QUEUED EMAIL LIFECYCLE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Expiration Policy:                                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Default: Scheduled jobs expire after 7 days                         │   │
│   │  Configurable per broadcast: 1-30 days                               │   │
│   │                                                                      │   │
│   │  On expiration:                                                      │   │
│   │  - BullMQ jobs past expiration are skipped by worker                 │   │
│   │  - Update BroadcastWarmupSchedule status to 'EXPIRED'                │   │
│   │  - Notify customer (webhook + email)                                 │   │
│   │  - Don't count against warmup metrics (no bounce/complaint)          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Cancellation:                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Customer can cancel:                                                │   │
│   │  - Entire broadcast (all queued emails cancelled)                    │   │
│   │  - Remaining unsent portion only                                     │   │
│   │                                                                      │   │
│   │  POST /broadcasts/{id}/cancel                                        │   │
│   │  { "scope": "remaining" | "all" }                                    │   │
│   │                                                                      │   │
│   │  Already-injected emails cannot be cancelled (MTA has them)          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Priority Override:                                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Customer can reprioritize queued broadcasts:                        │   │
│   │  - Move Broadcast B ahead of Broadcast A                             │   │
│   │  - Cancel Broadcast A, let B take capacity                           │   │
│   │                                                                      │   │
│   │  PATCH /broadcasts/{id}                                              │   │
│   │  { "priority": 1 }  // Lower number = higher priority                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Phases

**Tech Stack**: Prisma ORM + MySQL, BullMQ + Redis, KumoMTA

### Phase 1: Core Warmup Engine (Week 1-2)

- [ ] Prisma schema creation (DomainWarmupState, DomainWarmupMetrics, etc.)
- [ ] Redis connection setup for BullMQ and rate limiting
- [ ] Basic tier system (12 tiers with fixed limits)
- [ ] Warmup gateway (intercept sends, check limits)
- [ ] Redis daily/hourly counter management with Lua scripts
- [ ] BullMQ queue setup (warmup-injection, warmup-tier-evaluation, etc.)

### Phase 2: Metrics & Evaluation (Week 3-4)

- [ ] Metrics aggregator BullMQ worker (read from events table via Prisma)
- [ ] Tier evaluation BullMQ worker (hourly repeatable job)
- [ ] Promotion logic (volume, bounce, spam, delivery rate - NO open/click)
- [ ] Demotion logic implementation
- [ ] Suspension handling
- [ ] Warmup history audit log (DomainWarmupHistory model)

### Phase 3: BullMQ Optimistic Scheduling (Week 5)

- [ ] Optimistic schedule generator (assume tier progressions)
- [ ] BullMQ delayed job creation with hourly chunking
- [ ] BroadcastWarmupSchedule model for schedule metadata
- [ ] BullMQ injection worker with atomic rate limiting
- [ ] Admin pause/reschedule functionality
- [ ] Priority-based recipient ordering

### Phase 4: Customer Experience (Week 6)

- [ ] Warmup dashboard API endpoints (Prisma queries + BullMQ inspection)
- [ ] Broadcast response enrichment with schedule info
- [ ] Webhook events for tier changes
- [ ] Email notifications

### Phase 5: Advanced Features (Week 7-8)

- [ ] Adaptive warmup speeds (fast/normal/slow tracks - delivery metrics only)
- [ ] Provider-aware distribution
- [ ] Multi-domain management
- [ ] Transactional stream fast-track
- [ ] List import gating

### Phase 6: Monitoring & Operations (Ongoing)

- [ ] Prometheus metrics export (including BullMQ queue metrics)
- [ ] Grafana dashboards
- [ ] Alerting for anomalies
- [ ] Admin override capabilities
- [ ] Manual tier adjustment tools

---

## 10. Monitoring & Observability

### 10.1 Key Metrics to Track

```yaml
prometheus_metrics:
  # Volume metrics
  - kibamail_warmup_emails_sent_total{domain, tier}
  - kibamail_warmup_emails_scheduled_total{domain}
  - kibamail_warmup_emails_injected_total{domain}
  - kibamail_warmup_emails_expired_total{domain}

  # Tier metrics
  - kibamail_warmup_current_tier{domain}
  - kibamail_warmup_tier_promotions_total{domain}
  - kibamail_warmup_tier_demotions_total{domain}
  - kibamail_warmup_suspensions_total{domain}

  # Health metrics (no open/click rates - not all emails have tracking)
  - kibamail_warmup_bounce_rate{domain, type} # hard, soft
  - kibamail_warmup_complaint_rate{domain}
  - kibamail_warmup_delivery_rate{domain}

  # BullMQ Queue metrics
  - kibamail_bullmq_warmup_injection_waiting{domain}
  - kibamail_bullmq_warmup_injection_delayed{domain}
  - kibamail_bullmq_warmup_injection_active{domain}
  - kibamail_bullmq_warmup_injection_failed{domain}

  # System metrics
  - kibamail_warmup_evaluation_duration_seconds
  - kibamail_warmup_injection_duration_seconds
  - kibamail_warmup_aggregation_duration_seconds
```

### 10.2 Alerting Rules

```yaml
alerts:
  - name: WarmupHighBounceRate
    expr: kibamail_warmup_bounce_rate > 0.05
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Domain {{ $labels.domain }} has high bounce rate"

  - name: WarmupSuspension
    expr: increase(kibamail_warmup_suspensions_total[1h]) > 0
    labels:
      severity: critical
    annotations:
      summary: "Domain {{ $labels.domain }} was suspended"

  - name: WarmupQueueBacklog
    expr: kibamail_warmup_queue_depth > 100000
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Large warmup queue backlog for {{ $labels.domain }}"
```

---

## 11. Security Considerations

### 11.1 Rate Limiting Bypass Prevention

```yaml
bypass_prevention:
  # Prevent customers from creating many domains to bypass limits
  new_domain_limits:
    max_domains_per_team: 10 # configurable per plan
    new_domain_cooldown: 24h # wait before new domain can send

  # Prevent rapid domain switching
  domain_rotation_detection:
    if: same_recipient_different_domains_within_1h
    then: flag_for_review

  # API rate limiting on warmup operations
  api_limits:
    check_capacity: 100/min
    queue_emails: 1000/min
    cancel_broadcast: 10/min
```

### 11.2 Admin Overrides

```yaml
admin_capabilities:
  # For legitimate use cases (enterprise onboarding, migrations)

  override_tier:
    action: SET domain TO tier N
    requires: admin_approval
    audit: logged_with_reason

  bypass_warmup:
    action: GRADUATE domain IMMEDIATELY
    requires: senior_admin_approval
    audit: logged_with_justification

  manual_suspension:
    action: SUSPEND domain
    requires: admin
    reason: required

  reset_warmup:
    action: RESET domain TO tier 1
    requires: admin
    use_case: customer_request_fresh_start
```

---

## 12. Summary

This architecture provides a comprehensive domain warmup system that:

1. **Protects deliverability** by gradually building domain reputation
2. **Automates tier progression** based on delivery metrics (bounce, spam, delivery rate - NOT open/click)
3. **Handles large broadcasts** via BullMQ optimistic scheduling with hourly job chunking
4. **Adapts to performance** with fast/normal/slow warmup tracks
5. **Provides transparency** through dashboards and webhooks
6. **Maintains control** with admin pause/reschedule capabilities

**Tech Stack**:

- **Database**: MySQL with Prisma ORM
- **Queue**: BullMQ (Redis-backed, handles 1M+ jobs efficiently)
- **Rate Limiting**: Redis with Lua scripts for atomic operations
- **MTA**: KumoMTA via HTTP API

**Key Design Decisions**:

- **Optimistic Scheduling**: Schedule batches upfront assuming tier progressions will occur. Admins can pause/reschedule if issues arise.
- **No Open/Click Metrics**: Promotion criteria uses only delivery metrics because not all customers enable email tracking.
- **BullMQ over Database Queue**: Jobs stored in Redis, not MySQL. BullMQ handles delayed jobs natively and scales to millions of jobs.
- **Hourly Chunking**: Daily limits are distributed across hours to prevent burst sending.

The key insight is that the control plane acts as an intelligent buffer between customer sending intent and actual MTA injection, ensuring that even if a customer wants to send 100K emails on day one, they can only do so at a rate that protects both their domain reputation and Kibamail's shared infrastructure.
