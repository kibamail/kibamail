"use client";

import { Button, Heading } from "@kibamail/owly";
import { Xmark } from "iconoir-react";
import Link from "next/link";
import { useState } from "react";
import { ConversationList } from "./conversation-list";
import { ConversationThread } from "./conversation-thread";
import { SAMPLE_CONVERSATIONS, type Conversation } from "./sample-data";

export function InboxClient() {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(SAMPLE_CONVERSATIONS[0]?.id ?? null);

  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = SAMPLE_CONVERSATIONS.filter((conversation) => {
    const matchesSource =
      filterSource === "all" || conversation.source === filterSource;

    const matchesSearch =
      searchQuery === "" ||
      conversation.contact.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      conversation.contact.email
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      conversation.messages.some((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesSource && matchesSearch;
  });

  const selectedConversation = SAMPLE_CONVERSATIONS.find(
    (c) => c.id === selectedConversationId
  );

  return (
    <div className="w-full h-screen flex box-border flex-col px-2 pb-2 bg-kb-bg-layout">
      {/* Header */}
      <div className="h-[60px] w-full flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <Link href="/w/">
              <Xmark className="w-6! h-6!" />
            </Link>
          </Button>

          <Heading size="xs" className="mb-0 text-kb-content-primary">
            Inbox
          </Heading>
        </div>
      </div>

      {/* Main Content */}
      <div className="grow border border-kb-border-tertiary rounded-lg flex max-w-full overflow-hidden">
        {/* Conversation List Sidebar */}
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          filterSource={filterSource}
          onFilterSourceChange={setFilterSource}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />

        {/* Conversation Thread */}
        <ConversationThread conversation={selectedConversation} />
      </div>
    </div>
  );
}
