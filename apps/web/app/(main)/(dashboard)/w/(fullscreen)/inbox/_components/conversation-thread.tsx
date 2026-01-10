"use client";

import { Badge, Button, Heading, LetterAvatar, Text } from "@kibamail/owly";
import * as TextareaField from "@kibamail/owly/textarea-field";
import { Mail, SendDiagonal } from "iconoir-react";
import type { Conversation, Message } from "./sample-data";

interface ConversationThreadProps {
  conversation: Conversation | undefined;
}

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getSourceLabel(source: Conversation["source"]): string {
  switch (source) {
    case "broadcast":
      return "Broadcast";
    case "form":
      return "Form";
    case "automation":
      return "Automation";
    default:
      return source;
  }
}

export function ConversationThread({ conversation }: ConversationThreadProps) {
  if (!conversation) {
    return (
      <div className="flex-1 bg-kb-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Mail className="w-12 h-12 text-kb-content-tertiary mx-auto mb-4" />
          <Heading size="sm" className="text-kb-content-secondary mb-2">
            Select a conversation
          </Heading>
          <Text className="text-kb-content-tertiary max-w-md">
            Choose a conversation from the list to view the message thread
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-kb-bg-secondary flex flex-col h-full">
      {/* Thread Header */}
      <div className="px-6 py-4 bg-kb-bg-primary border-b border-kb-border-tertiary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LetterAvatar size="sm">{conversation.contact.name}</LetterAvatar>
            <div>
              <Heading size="xs" className="mb-0 text-kb-content-primary">
                {conversation.contact.name}
              </Heading>
              <Text className="text-kb-content-secondary">
                {conversation.contact.email}
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <Text className="text-kb-content-tertiary text-sm">
                Source: {getSourceLabel(conversation.source)}
              </Text>
              <Text className="text-kb-content-secondary text-sm font-medium">
                {conversation.sourceName}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      {/* Reply Composer */}
      <div className="px-6 py-4 bg-kb-bg-primary border-t border-kb-border-tertiary">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextareaField.Root placeholder="Type your reply..." rows={3} />
          </div>
          <Button>
            <SendDiagonal className="w-4 h-4" />
            Send Reply
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] ${
          isOutbound ? "bg-kb-blue-50" : "bg-kb-bg-primary"
        } rounded-lg border border-kb-border-tertiary shadow-sm`}
      >
        {/* Message Header */}
        <div className="px-4 py-3 border-b border-kb-border-tertiary">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={isOutbound ? "info" : "success"} size="sm">
                {isOutbound ? "Sent" : "Received"}
              </Badge>
              {message.broadcastName && (
                <Text className="text-kb-content-tertiary text-sm">
                  via {message.broadcastName}
                </Text>
              )}
            </div>
            <Text className="text-kb-content-tertiary text-sm">
              {formatMessageTime(message.timestamp)}
            </Text>
          </div>
          {message.subject && (
            <Text className="font-medium text-kb-content-primary mt-2">
              {message.subject}
            </Text>
          )}
        </div>

        {/* Message Content */}
        <div className="px-4 py-3">
          <Text className="text-kb-content-primary whitespace-pre-wrap">
            {message.content}
          </Text>
        </div>
      </div>
    </div>
  );
}
