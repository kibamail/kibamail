import type { NextRequest } from "next/server";
import { handleSimulate } from "./handler";
import { withApiSession, withErrorHandling } from "@/lib/api/requests";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string }> },
) {
  return withErrorHandling(request, async () => {
    const { automationId } = await params;
    return withApiSession(
      request,
      (apiKey) => handleSimulate(apiKey.workspaceId, automationId, request),
      ["read:automations"],
    );
  });
}
