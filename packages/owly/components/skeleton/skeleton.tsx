"use client";

import * as React from "react";
import cn from "classnames";
import { getVariableClassNamesForProp } from "../utils/props.js";
import type { SkeletonProps, SkeletonElement } from "./skeleton.props.js";

const Skeleton = React.forwardRef<SkeletonElement, SkeletonProps>(
  (props, forwardedRef) => {
    const {
      children,
      className,
      loading = true,
      width,
      height,
      variant,
      speed,
      style,
      ...skeletonProps
    } = props;

    // If not loading, just return the children
    if (!loading) {
      return <>{children}</>;
    }

    const { className: variantClassName } = getVariableClassNamesForProp<
      SkeletonProps["variant"]
    >("variant", variant, "default");

    const { className: speedClassName } = getVariableClassNamesForProp<
      SkeletonProps["speed"]
    >("speed", speed, "normal");

    const isInline = React.isValidElement(children);

    const inlineStyles: React.CSSProperties = {
      ...style,
      ...(width && { width: typeof width === "number" ? `${width}px` : width }),
      ...(height && { height: typeof height === "number" ? `${height}px` : height }),
    };

    return (
      <span
        ref={forwardedRef}
        aria-hidden
        className={cn(
          "kb-skeleton",
          "kb-reset",
          variantClassName,
          speedClassName,
          className,
        )}
        data-inline-skeleton={isInline || undefined}
        tabIndex={-1}
        style={inlineStyles}
        {...skeletonProps}
      >
        {children}
      </span>
    );
  },
);

Skeleton.displayName = "Skeleton";

export { Skeleton };
