import type { ActionExecutor } from "./types";

export const executeSendWebhook: ActionExecutor = async (ctx, nodeData) => {
  const url = nodeData.url as string;
  const method = (nodeData.method as string) || "POST";
  const headers = (nodeData.headers as Record<string, string>) || {};
  const bodyTemplate = nodeData.body as string | undefined;

  const requestBody =
    method !== "GET"
      ? JSON.stringify({
          contact: {
            id: ctx.contact.id,
            email: ctx.contact.email,
            firstName: ctx.contact.firstName,
            lastName: ctx.contact.lastName,
          },
          automation: {
            id: ctx.automation.id,
            name: ctx.automation.name,
          },
          run: {
            id: ctx.run.id,
          },
          ...(bodyTemplate ? JSON.parse(bodyTemplate) : {}),
        })
      : undefined;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: requestBody,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `Webhook failed: ${response.status} ${response.statusText}`,
    );
  }
};
