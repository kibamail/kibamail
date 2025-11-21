import "@tanstack/react-query";
import type { ZodError } from "zod";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ZodError;
  }
}
