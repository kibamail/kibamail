import {
  responsiveBreakpoints,
  type ResponsiveBreakpoint,
} from "./breakpoints.js";
import cn from "classnames";

export type ResponsivePropDefinition<T> = Partial<
  Record<ResponsiveBreakpoint, T>
>;
export type ResponsiveProp<T> = T | ResponsivePropDefinition<T>;

export interface SlottableComponentProp {
  asChild?: boolean;
}

export function isResponsiveObjectPropDefinition<T>(prop: ResponsiveProp<T>) {
  if (!prop) {
    return false;
  }

  if (typeof prop !== "object") {
    return false;
  }

  return Object.keys(prop).some((responsiveKey) =>
    (responsiveBreakpoints as readonly string[]).includes(responsiveKey),
  );
}

export function getVariableClassNamesForProp<T>(
  propName: string,
  value?: T,
  defaultValue?: T,
) {
  let className: string | undefined;

  className = `kb-${propName}-${value || defaultValue}`;

  return { className };
}

export function getResponsiveClassNamesForProp<T>(
  propName: string,
  responsiveDefinition: ResponsiveProp<T>,
  defaultValue?: T,
) {
  let className: string | undefined;

  if (isResponsiveObjectPropDefinition(responsiveDefinition)) {
    const responsivePropDefinition =
      responsiveDefinition as ResponsivePropDefinition<T>;

    if (!responsivePropDefinition.base) {
      responsivePropDefinition.base = defaultValue;
    }

    for (const [breakpointKey, value] of Object.entries(
      responsiveDefinition as ResponsivePropDefinition<T>,
    )) {
      const isBasePropDefinition = breakpointKey === "base";

      const responsivePrefix = isBasePropDefinition ? "" : `${breakpointKey}:`;

      if (value) {
        className = cn(
          className,
          `${responsivePrefix}kb-r-${propName}-${value}`,
        );
      }
    }
  } else {
    className = `kb-r-${propName}-${responsiveDefinition || defaultValue}`;
  }

  return { className };
}
