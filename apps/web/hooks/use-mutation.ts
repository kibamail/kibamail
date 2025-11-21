"use client";

import { useToast } from "@kibamail/owly/toast";
import { ZodError } from "zod";
import type { UseFormSetError } from "react-hook-form";
import {
  useMutation as useReactQueryMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

/**
 * Extended mutation options with react-hook-form integration
 */
export interface ExtendedUseMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> extends UseMutationOptions<TData, TError, TVariables, TContext> {
  /**
   * React Hook Form's setError function for automatic validation error handling
   *
   * When provided, ZodError validation errors will be automatically mapped
   * to form fields using setError.
   *
   * @example
   * ```tsx
   * const { setError } = useForm<FormData>();
   *
   * const mutation = useMutation({
   *   mutationFn: api.createUser,
   *   setError, // Automatically handle validation errors
   * });
   * ```
   */
  setError?: UseFormSetError<any>;
}

/**
 * Custom useMutation hook with automatic error handling
 *
 * Wraps React Query's useMutation and adds default error handling:
 * - Automatically maps ZodError validation errors to form fields (if setError provided)
 * - Shows toast notification for generic errors with messages
 *
 * @example
 * ```tsx
 * // Basic usage
 * const mutation = useMutation({
 *   mutationFn: async (data) => {
 *     return api.createUser(data);
 *   },
 *   onSuccess: (data) => {
 *     console.log('User created:', data);
 *   },
 * });
 *
 * // With automatic validation error handling
 * const { setError } = useForm<FormData>();
 * const mutation = useMutation({
 *   mutationFn: api.createUser,
 *   setError, // ZodErrors will be mapped to form fields automatically
 *   onSuccess: () => {
 *     toast('User created!');
 *   },
 * });
 * ```
 */
export function useMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: ExtendedUseMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { error: toast } = useToast();
  const { setError: formSetError, ...reactQueryOptions } = options;

  return useReactQueryMutation({
    ...reactQueryOptions,
    onError(error, ...rest) {
      if (error instanceof ZodError && formSetError) {
        error.issues.forEach((issue) => {
          const path = issue.path.join(".");
          formSetError(path, {
            type: "manual",
            message: issue.message,
          });
        });
      } else {
        const unknownError = error as unknown as Error & { error: string };

        if (unknownError.message || unknownError.error) {
          toast(unknownError.message || unknownError.error);
        }
      }

      if (options.onError) {
        options.onError(error, ...rest);
      }
    },
  });
}
