export interface Message {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  timestamp: string;
  subject?: string;
  broadcastName?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  source: "broadcast" | "form" | "automation";
  sourceName: string;
  lastMessageAt: string;
  unread: boolean;
  messages: Message[];
}

export const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    contact: {
      id: "contact-1",
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
    },
    source: "broadcast",
    sourceName: "Weekly Newsletter #42",
    lastMessageAt: "2024-01-15T10:30:00Z",
    unread: true,
    messages: [
      {
        id: "msg-1",
        direction: "outbound",
        subject: "Weekly Newsletter #42: New Features Announcement",
        content:
          "Hi Sarah,\n\nWe're excited to announce our latest product updates! This week we've added:\n\n- Improved email editor\n- New automation triggers\n- Enhanced analytics dashboard\n\nClick below to learn more about these features.",
        timestamp: "2024-01-15T09:00:00Z",
        broadcastName: "Weekly Newsletter #42",
      },
      {
        id: "msg-2",
        direction: "inbound",
        content:
          "Thanks for the update! I'm particularly interested in the new automation triggers. Can you tell me more about how to set up a welcome sequence?",
        timestamp: "2024-01-15T10:30:00Z",
      },
    ],
  },
  {
    id: "conv-2",
    contact: {
      id: "contact-2",
      name: "Michael Chen",
      email: "m.chen@techcorp.io",
    },
    source: "form",
    sourceName: "Contact Form",
    lastMessageAt: "2024-01-15T09:15:00Z",
    unread: true,
    messages: [
      {
        id: "msg-3",
        direction: "inbound",
        content:
          "Hi there,\n\nI'm interested in learning more about your enterprise pricing plans. We're a team of about 50 people and need a solution that can handle high-volume sending.\n\nCould you schedule a call to discuss our requirements?\n\nBest regards,\nMichael",
        timestamp: "2024-01-15T09:15:00Z",
      },
    ],
  },
  {
    id: "conv-3",
    contact: {
      id: "contact-3",
      name: "Emily Rodriguez",
      email: "emily.r@startup.co",
    },
    source: "broadcast",
    sourceName: "Product Launch Announcement",
    lastMessageAt: "2024-01-14T16:45:00Z",
    unread: false,
    messages: [
      {
        id: "msg-4",
        direction: "outbound",
        subject: "Introducing Our New Email Builder",
        content:
          "Dear Emily,\n\nWe're thrilled to announce the launch of our completely redesigned email builder!\n\nNew features include:\n- Drag and drop components\n- Mobile-responsive templates\n- Real-time collaboration\n\nStart building beautiful emails today.",
        timestamp: "2024-01-14T14:00:00Z",
        broadcastName: "Product Launch Announcement",
      },
      {
        id: "msg-5",
        direction: "inbound",
        content:
          "This looks amazing! Quick question - does the new builder support custom HTML blocks? We have some complex layouts that we'd like to implement.",
        timestamp: "2024-01-14T15:30:00Z",
      },
      {
        id: "msg-6",
        direction: "outbound",
        content:
          "Hi Emily,\n\nGreat question! Yes, our new email builder fully supports custom HTML blocks. You can add them anywhere in your email and they'll work seamlessly with the drag-and-drop interface.\n\nLet me know if you need any help getting started!\n\nBest,\nThe Kibamail Team",
        timestamp: "2024-01-14T16:00:00Z",
      },
      {
        id: "msg-7",
        direction: "inbound",
        content: "Perfect, thank you! I'll give it a try this week.",
        timestamp: "2024-01-14T16:45:00Z",
      },
    ],
  },
  {
    id: "conv-4",
    contact: {
      id: "contact-4",
      name: "David Kim",
      email: "david.kim@agency.com",
    },
    source: "automation",
    sourceName: "Welcome Sequence",
    lastMessageAt: "2024-01-14T11:20:00Z",
    unread: false,
    messages: [
      {
        id: "msg-8",
        direction: "outbound",
        subject: "Welcome to Kibamail!",
        content:
          "Hi David,\n\nWelcome aboard! We're excited to have you join us.\n\nHere's what you can do next:\n1. Set up your first email campaign\n2. Import your contacts\n3. Explore our template library\n\nNeed help? Reply to this email anytime.",
        timestamp: "2024-01-14T10:00:00Z",
        broadcastName: "Welcome Sequence",
      },
      {
        id: "msg-9",
        direction: "inbound",
        content:
          "Thanks! I'm migrating from another platform. Is there a way to import my existing templates?",
        timestamp: "2024-01-14T11:20:00Z",
      },
    ],
  },
  {
    id: "conv-5",
    contact: {
      id: "contact-5",
      name: "Lisa Thompson",
      email: "lisa.t@retail.shop",
    },
    source: "form",
    sourceName: "Support Request",
    lastMessageAt: "2024-01-13T18:30:00Z",
    unread: false,
    messages: [
      {
        id: "msg-10",
        direction: "inbound",
        content:
          "Hello,\n\nI'm having trouble with my email deliverability. Some of my campaigns are going to spam folders. Can you help me troubleshoot this issue?\n\nMy domain is retail.shop and I've already set up SPF and DKIM.\n\nThanks,\nLisa",
        timestamp: "2024-01-13T14:00:00Z",
      },
      {
        id: "msg-11",
        direction: "outbound",
        content:
          "Hi Lisa,\n\nI'd be happy to help with your deliverability concerns!\n\nI've reviewed your domain configuration and noticed a few things:\n\n1. Your DMARC record is missing - this is crucial for deliverability\n2. Your sending reputation is good, but we can improve it\n\nHere's what I recommend:\n- Add a DMARC record: v=DMARC1; p=none; rua=mailto:dmarc@retail.shop\n- Gradually warm up your sending volume\n\nWould you like me to guide you through the setup?\n\nBest,\nSupport Team",
        timestamp: "2024-01-13T15:45:00Z",
      },
      {
        id: "msg-12",
        direction: "inbound",
        content:
          "That's very helpful! I've added the DMARC record. How long does it usually take to see improvements?",
        timestamp: "2024-01-13T17:00:00Z",
      },
      {
        id: "msg-13",
        direction: "outbound",
        content:
          "Great job on adding the DMARC record!\n\nTypically, you should start seeing improvements within 1-2 weeks as email providers recognize your authentication setup. During this time:\n\n- Monitor your open rates and spam complaints\n- Keep your list clean by removing inactive subscribers\n- Maintain consistent sending patterns\n\nI'll check back in a week to see how things are going.\n\nBest regards,\nSupport Team",
        timestamp: "2024-01-13T18:30:00Z",
      },
    ],
  },
  {
    id: "conv-6",
    contact: {
      id: "contact-6",
      name: "James Wilson",
      email: "jwilson@enterprise.net",
    },
    source: "broadcast",
    sourceName: "Feature Update: API v2",
    lastMessageAt: "2024-01-12T14:00:00Z",
    unread: false,
    messages: [
      {
        id: "msg-14",
        direction: "outbound",
        subject: "Introducing API v2 - Now Available",
        content:
          "Hi James,\n\nWe're pleased to announce the release of API v2!\n\nKey improvements:\n- Improved rate limits (10x increase)\n- New webhook events\n- Better error handling\n- GraphQL support\n\nMigration guide available in our docs.",
        timestamp: "2024-01-12T10:00:00Z",
        broadcastName: "Feature Update: API v2",
      },
      {
        id: "msg-15",
        direction: "inbound",
        content:
          "Excellent news! We've been waiting for the GraphQL support. Is there a beta period for testing before we migrate our production systems?",
        timestamp: "2024-01-12T14:00:00Z",
      },
    ],
  },
];
