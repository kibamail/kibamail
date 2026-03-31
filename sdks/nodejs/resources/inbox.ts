import type { createHttpClient } from "../client";
import type { paths } from "../schema";

type HttpClient = ReturnType<typeof createHttpClient>;

type ListConversationsQuery = paths["/v1/inbox/conversations"]["get"]["parameters"]["query"];
type UpdateConversationBody =
  paths["/v1/inbox/conversations/{conversationId}"]["put"]["requestBody"]["content"]["application/json"];
type ReplyBody =
  paths["/v1/inbox/conversations/{conversationId}/replies"]["post"]["requestBody"]["content"]["application/json"];

export class Inbox {
  constructor(protected client: HttpClient) {}

  /** Retrieve a paginated list of inbox conversations. */
  listConversations(params?: ListConversationsQuery) {
    return this.client.GET("/v1/inbox/conversations", {
      params: { query: params },
    });
  }

  /** Retrieve a specific conversation with its messages. */
  getConversation(conversationId: string) {
    return this.client.GET("/v1/inbox/conversations/{conversationId}", {
      params: { path: { conversationId } },
    });
  }

  /** Update a conversation's status. */
  updateConversation(conversationId: string, params: UpdateConversationBody) {
    return this.client.PUT("/v1/inbox/conversations/{conversationId}", {
      params: { path: { conversationId } },
      body: params,
    });
  }

  /** Send a reply to an existing conversation. */
  reply(conversationId: string, params: ReplyBody) {
    return this.client.POST("/v1/inbox/conversations/{conversationId}/replies", {
      params: { path: { conversationId } },
      body: params,
    });
  }

  /** Retrieve aggregate inbox statistics for your workspace. */
  stats() {
    return this.client.GET("/v1/inbox/stats", {});
  }
}
