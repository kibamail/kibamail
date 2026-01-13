"use client";

import { EyeClosedIcon } from "./icons/eye-closed-icon";
import { EyeIcon } from "./icons/eye-icon";
import * as TextField from "@kibamail/owly/text-field";
import React from "react";

interface PasswordFieldProps
  extends React.ComponentPropsWithoutRef<typeof TextField.Root> {
  strengthIndicator?: boolean;
}

export const PasswordField = React.forwardRef<
  React.ElementRef<typeof TextField.Root>,
  PasswordFieldProps
>((props, forwardedRef) => {
  const { strengthIndicator, children, ...textFieldProps } = props;
  const passwordFieldRef = React.useRef<HTMLInputElement>(null);
  const [visible, setVisible] = React.useState(false);

  function onTogglePasswordVisibilityClick(
    _event: React.MouseEvent<HTMLButtonElement>
  ) {
    const field = passwordFieldRef.current;

    if (!field) {
      return;
    }

    requestAnimationFrame(() => {
      try {
        field.setSelectionRange(field.value.length, field.value.length);
      } catch (_error) {
        // Ignore selection range errors
      }
      field.focus();
    });

    setVisible((current) => !current);
  }

  const allChildren = React.Children.toArray(children);

  const Label = allChildren.find(
    (child) => React.isValidElement(child) && child.type === TextField.Label
  );

  const textFieldChildren = allChildren.filter(
    (child) => React.isValidElement(child) && child.type !== TextField.Label
  );

  return (
    <TextField.Root
      id="password"
      ref={forwardedRef}
      placeholder="Enter password"
      {...textFieldProps}
      type={visible ? "text" : "password"}
    >
      {Label ? Label : <TextField.Label htmlFor="password">Password</TextField.Label>}

      <TextField.Slot side="right">
        <button
          type="button"
          className="focus:outline-none focus-visible:outline-1 focus-visible:outline-ring rounded-sm"
          aria-label={`${visible ? "Hide" : "Show"} password`}
          onClick={onTogglePasswordVisibilityClick}
        >
          {visible ? <EyeClosedIcon aria-hidden /> : <EyeIcon aria-hidden />}
        </button>
      </TextField.Slot>

      {textFieldChildren}
    </TextField.Root>
  );
});

PasswordField.displayName = "PasswordField";
