"use client";

import { Badge, LetterAvatar, Text } from "@kibamail/owly";
import * as SelectField from "@kibamail/owly/select-field";
import * as TextField from "@kibamail/owly/text-field";
import { Search } from "iconoir-react";
import type { Conversation } from "./sample-data";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterSource: string;
  onFilterSourceChange: (source: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

function getSourceBadgeVariant(
  source: Conversation["source"]
): "info" | "success" | "warning" {
  switch (source) {
    case "broadcast":
      return "info";
    case "form":
      return "success";
    case "automation":
      return "warning";
    default:
      return "info";
  }
}

function getLastMessagePreview(conversation: Conversation): string {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  if (!lastMessage) return "";

  const preview = lastMessage.content.substring(0, 40);
  return preview.length < lastMessage.content.length
    ? `${preview}...`
    : preview;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  filterSource,
  onFilterSourceChange,
  searchQuery,
  onSearchQueryChange,
}: ConversationListProps) {
  return (
    <div className="w-[320px] shrink-0 border-r border-kb-border-tertiary bg-kb-bg-primary flex flex-col h-full">
      {/* Search and Filter Header */}
      <div className="p-4 border-b border-kb-border-tertiary space-y-3">
        {/* Search Input */}
        <TextField.Root
          size="sm"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
        >
          <TextField.Slot side="left">
            <Search className="w-4 h-4 text-kb-content-tertiary" />
          </TextField.Slot>
        </TextField.Root>

        {/* Filter Dropdown */}
        <SelectField.Root
          value={filterSource}
          onValueChange={onFilterSourceChange}
          size="sm"
        >
          <SelectField.Trigger placeholder="Filter by source">
            {filterSource === "all"
              ? "All sources"
              : filterSource === "broadcast"
              ? "Broadcasts"
              : filterSource === "form"
              ? "Forms"
              : "Automations"}
          </SelectField.Trigger>
          <SelectField.Content>
            <SelectField.Item value="all">All sources</SelectField.Item>
            <SelectField.Item value="broadcast">Broadcasts</SelectField.Item>
            <SelectField.Item value="form">Forms</SelectField.Item>
            <SelectField.Item value="automation">Automations</SelectField.Item>
          </SelectField.Content>
        </SelectField.Root>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-8 text-center">
            <Text className="text-kb-content-tertiary">
              No conversations found
            </Text>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isSelected={conversation.id === selectedId}
              onSelect={() => onSelect(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}

function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
}: ConversationListItemProps) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full p-4 text-left border-b border-kb-border-tertiary transition-colors hover:bg-kb-bg-hover ${
        isSelected ? "bg-kb-bg-selected" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <LetterAvatar size="xs">{conversation.contact.name}</LetterAvatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Name + Time */}
          <div className="flex items-center justify-between gap-2">
            <Text
              className={`truncate ${
                conversation.unread
                  ? "font-semibold! text-kb-content-primary"
                  : "text-kb-content-primary"
              }`}
            >
              {conversation.contact.name}
            </Text>
            <Text className="text-kb-content-tertiary shrink-0 text-xs">
              {formatRelativeTime(conversation.lastMessageAt)}
            </Text>
          </div>

          {/* Email */}
          <Text
            size="sm"
            className="text-kb-content-secondary text-sm truncate mb-1"
          >
            {conversation.contact.email}
          </Text>

          {/* Source Badge + Preview */}
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant={getSourceBadgeVariant(conversation.source)}
              size="sm"
            >
              {conversation.source}
            </Badge>
            {conversation.unread && (
              <span className="w-2 h-2 rounded-full bg-kb-blue-500" />
            )}
          </div>

          {/* Message Preview */}
          <Text
            className="text-kb-content-tertiary text-sm line-clamp-2"
            size="sm"
          >
            {lastMessage?.direction === "inbound" ? "" : "You: "}
            {getLastMessagePreview(conversation)}
          </Text>
        </div>
      </div>
    </button>
  );
}
