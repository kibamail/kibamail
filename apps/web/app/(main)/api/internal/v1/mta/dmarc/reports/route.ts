import type { NextRequest } from "next/server";
import { receiveDmarcReport } from "./handler";
import { withErrorHandling } from "@/lib/api/requests";
import { withServiceAuth } from "@/lib/api/service-auth";

export async function POST(request: NextRequest) {
  return withErrorHandling(request, () =>
    withServiceAuth(request, async () => {
      return receiveDmarcReport(request);
    }),
  );
}
