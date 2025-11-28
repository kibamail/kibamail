"use client"

import React from "react";
import { OTPInput, type SlotProps, type OTPInputProps } from "input-otp";
import { createContext } from "@radix-ui/react-context";
import { useId } from "@radix-ui/react-id";

import {
  type InputHintElement,
  type InputHintProps,
  InputHint,
  InputError,
  makeErrorId,
  makeHintId,
} from "../input-hint/input-hint.js";
import {
  InputLabel,
  type InputLabelElement,
  type InputLabelProps,
} from "../input-label/input-label.js";

type CodeInputElement = React.ElementRef<typeof OTPInput>;

export interface CodeInputProps extends Omit<OTPInputProps, "maxLength"> {
  maxLength?: number;
}

const CODE_INPUT_NAME = "CodeInput";

const [CodeInputProvider, useCodeInputContext] = createContext<{
  baseId: string;
}>(CODE_INPUT_NAME);

const CodeInput = React.forwardRef<CodeInputElement, CodeInputProps>(
  (props, forwardedRef) => {
    const { maxLength = 6, children, ...otpInputProps } = props;

    const baseId = useId();
    const hintId = makeHintId(baseId);
    const errorId = makeErrorId(baseId);

    const allChildren = React.Children.toArray(children);

    const label = allChildren.filter(
      (child) => React.isValidElement(child) && child.type === CodeInputLabel,
    );

    const hints = allChildren.filter(
      (child) => React.isValidElement(child) && child.type !== CodeInputLabel,
    );

    const isInvalid = allChildren.some(
      (child) => React.isValidElement(child) && child.type === CodeInputError,
    );

    return (
      <CodeInputProvider baseId={baseId}>
        <div className="kb-code-input-root" data-invalid={isInvalid}>
          {label}
          <OTPInput
            {...otpInputProps}
            maxLength={maxLength}
            ref={forwardedRef}
            aria-describedby={`${hintId} ${errorId}`}
            containerClassName={`kb-code-input kb-code-input-slots-${maxLength}`}
            render={({ slots }) => (
              <>
                {slots.map((slot, idx) => (
                  <CodeInputSlot key={idx} {...slot} />
                ))}
              </>
            )}
          />
          {hints}
        </div>
      </CodeInputProvider>
    );
  },
);

CodeInput.displayName = "CodeInput";

function CodeInputCaret() {
  return (
    <div className={"kb-code-input-caret"}>
      <div />
    </div>
  );
}

function CodeInputSlot(slot: SlotProps) {
  return (
    <div className={"kb-code-input-slot"} data-active={slot.isActive}>
      {slot.char?.toUpperCase()} {slot.hasFakeCaret ? <CodeInputCaret /> : null}
    </div>
  );
}

const CODE_INPUT_HINT_NAME = "CodeInput.Hint";

const CodeInputHint = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useCodeInputContext(CODE_INPUT_HINT_NAME);

  return <InputHint baseId={baseId} {...props} ref={forwardedRef} />;
});

const CODE_INPUT_ERROR_NAME = "CodeInput.Error";

const CodeInputError = React.forwardRef<
  InputHintElement,
  Omit<InputHintProps, "baseId">
>((props, forwardedRef) => {
  const { baseId } = useCodeInputContext(CODE_INPUT_ERROR_NAME);

  return <InputError baseId={baseId} {...props} ref={forwardedRef} />;
});

const CodeInputLabel = React.forwardRef<InputLabelElement, InputLabelProps>(
  (props, forwardedRef) => {
    return <InputLabel {...props} ref={forwardedRef} />;
  },
);

CodeInputLabel.displayName = "CodeInput.Label";

export {
  CodeInput,
  CodeInputHint,
  CodeInputError,
  CodeInputLabel,
  //
  CodeInput as Input,
  CodeInputHint as Hint,
  CodeInputError as Error,
  CodeInputLabel as Label,
};
