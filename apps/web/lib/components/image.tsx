"use client";

import NextImage, { type ImageProps } from "next/image";

/**
 * Wrapper around Next.js Image component that automatically applies
 * the `unoptimized` prop in development environment.
 *
 * This is necessary for development with localhost URLs that Next.js
 * image optimization service cannot fetch on the server side.
 *
 * In production, images will be properly optimized for better performance.
 *
 * @example
 * ```tsx
 * import { Image } from "@/lib/components/image";
 *
 * <Image
 *   src="http://localhost:3902/logo.jpg"
 *   alt="Logo"
 *   width={100}
 *   height={100}
 * />
 * ```
 */
export function Image(props: ImageProps) {
  const isDev = process.env.NODE_ENV === "development";

  return <NextImage {...props} unoptimized={isDev || props.unoptimized} />;
}
