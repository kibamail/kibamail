"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";
import type { WebhookDestinationType } from "@/webhooks/client/types";

interface WebhooksContextValue {
  destinationTypes: WebhookDestinationType[];
  topics: string[];
}

const WebhooksContext = createContext<WebhooksContextValue | null>(null);

export function useWebhooksContext() {
  const context = useContext(WebhooksContext);
  return context;
}

interface WebhooksLayoutClientProps extends PropsWithChildren {
  destinationTypes: WebhookDestinationType[];
  topics: string[];
}

export function WebhooksLayoutClient({
  children,
  destinationTypes,
  topics,
}: WebhooksLayoutClientProps) {
  return (
    <WebhooksContext.Provider value={{ destinationTypes, topics }}>
      {children}
    </WebhooksContext.Provider>
  );
}
