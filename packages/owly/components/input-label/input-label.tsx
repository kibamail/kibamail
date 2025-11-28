import React from "react"
import cn from "classnames"
import * as Tooltip from "../tooltip/tooltip.js"
import { HelpIcon } from "./help-icon.js"

export type InputLabelElement = React.ElementRef<"label">

export interface InputLabelProps
  extends React.ComponentPropsWithoutRef<"label"> {
  help?: React.ReactNode
}

const InputLabel = React.forwardRef<InputLabelElement, InputLabelProps>(
  (props, forwardedRef) => {
    const { className, children, help, ...labelProps } = props

    if (help) {
      return (
        <Tooltip.Provider>
          <div className={cn("kb-input-label-wrapper", className)}>
            <label
              {...labelProps}
              className="kb-input-label"
              ref={forwardedRef}
            >
              {children}
            </label>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className="kb-input-label-help-trigger"
                  aria-label="Help"
                >
                  <HelpIcon />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="top" className="kb-input-label-help-tooltip">
                  {help}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        </Tooltip.Provider>
      )
    }

    return (
      <label
        {...labelProps}
        className={cn("kb-input-label", className)}
        ref={forwardedRef}
      >
        {children}
      </label>
    )
  }
)

export { InputLabel }
