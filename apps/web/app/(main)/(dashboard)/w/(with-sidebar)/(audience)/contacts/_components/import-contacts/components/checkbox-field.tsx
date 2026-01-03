"use client";

import { Checkbox, type CheckboxProps } from "@kibamail/owly/checkbox";
import { Text } from "@kibamail/owly/text";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useId,
} from "react";

interface CheckboxFieldContextValue {
  baseId: string;
}

const CheckboxFieldContext = createContext<CheckboxFieldContextValue | null>(
  null,
);

function useCheckboxFieldContext(componentName: string) {
  const context = useContext(CheckboxFieldContext);
  if (!context) {
    throw new Error(`${componentName} must be used within CheckboxFieldRoot`);
  }
  return context;
}

function makeDescriptionId(baseId: string) {
  return `${baseId}-description`;
}

interface CheckboxFieldRootProps extends CheckboxProps {
  children: React.ReactNode;
}

function CheckboxFieldRoot({
  children,
  ...checkboxProps
}: CheckboxFieldRootProps) {
  const baseId = useId();

  return (
    <CheckboxFieldContext.Provider value={{ baseId }}>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Checkbox
          {...checkboxProps}
          aria-describedby={makeDescriptionId(baseId)}
        />
        <div className="flex flex-col gap-y-1">{children}</div>
      </div>
    </CheckboxFieldContext.Provider>
  );
}

interface CheckboxFieldLabelProps
  extends PropsWithChildren<React.ComponentPropsWithoutRef<"label">> {}

function CheckboxFieldLabel({
  children,
  ...labelProps
}: CheckboxFieldLabelProps) {
  return (
    <Text
      {...labelProps}
      as="label"
      className="text-kb-content-secondary font-medium"
    >
      {children}
    </Text>
  );
}

interface CheckboxFieldDescriptionProps extends PropsWithChildren {}

function CheckboxFieldDescription({ children }: CheckboxFieldDescriptionProps) {
  const { baseId } = useCheckboxFieldContext("CheckboxFieldDescription");

  return (
    <Text
      className="text-kb-content-tertiary"
      id={makeDescriptionId(baseId)}
      as="span"
    >
      {children}
    </Text>
  );
}

export {
  CheckboxFieldRoot as Root,
  CheckboxFieldLabel as Label,
  CheckboxFieldDescription as Description,
};
