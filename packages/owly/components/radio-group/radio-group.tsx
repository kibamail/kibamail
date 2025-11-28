"use client"

import React from "react";
import cn from "classnames";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import {
  type RadioGroupProps,
  type RadioGroupItemProps,
} from "./radio-group.props.js";
import { getResponsiveClassNamesForProp } from "../utils/props.js";
import { CircleIcon } from "./radio-group-icons.js";

type RadioGroupRootElement = React.ElementRef<typeof RadioGroupPrimitive.Root>;

const RadioGroup = React.forwardRef<RadioGroupRootElement, RadioGroupProps>(
  (props, forwardedRef) => {
    const { size, className } = props;

    const { className: sizeClassName } = getResponsiveClassNamesForProp<
      RadioGroupProps["size"]
    >("size", size, "md");

    return (
      <RadioGroupPrimitive.Root
        className={cn("kb-radio-group", sizeClassName, className)}
        {...props}
        ref={forwardedRef}
      />
    );
  },
);

type RadioGroupItemElement = React.ElementRef<typeof RadioGroupPrimitive.Item>;

const RadioGroupItem = React.forwardRef<
  RadioGroupItemElement,
  RadioGroupItemProps
>((props, forwardedRef) => {
  const { className, ...radioItemProps } = props;

  return (
    <RadioGroupPrimitive.Item
      className={cn("kb-radio-group-item", className)}
      {...radioItemProps}
      ref={forwardedRef}
    >
      <RadioGroupPrimitive.Indicator
        className="kb-radio-group-indicator"
        asChild
      >
        <CircleIcon />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});

export {
  RadioGroup,
  RadioGroupItem,
  //
  RadioGroup as Group,
  RadioGroupItem as Item,
};
