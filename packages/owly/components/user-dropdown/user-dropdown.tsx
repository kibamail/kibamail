"use client"

import cn from "classnames"
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { createContext } from "@radix-ui/react-context"

const USER_DROPDOWN_NAME = "UserDropdown"
const [UserDropdownProvider, useUserDropdownContext] = createContext<{
  open: boolean
}>(USER_DROPDOWN_NAME)

type UserDropdownRootElement = React.ComponentRef<typeof PopoverPrimitive.Root>
type UserDropdownTriggerElement = React.ElementRef<
  typeof PopoverPrimitive.Trigger
>
type UserDropdownContentElement = React.ElementRef<
  typeof PopoverPrimitive.Content
>
type UserDropdownItemElement = React.ElementRef<"button">
type UserDropdownDividerElement = React.ElementRef<"div">

interface UserDropdownRootProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root> {}

interface UserDropdownTriggerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {}

interface UserDropdownContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {}

interface UserDropdownItemProps
  extends React.ComponentPropsWithoutRef<"button"> {
  selected?: boolean
}

interface UserDropdownDividerProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const UserDropdownRoot = React.forwardRef<
  UserDropdownRootElement,
  UserDropdownRootProps
>((props, forwardedRef) => {
  const { open: openProp, onOpenChange, ...rootProps } = props
  const [open, setOpen] = React.useState(false)

  const isControlled = openProp !== undefined
  const isOpen = isControlled ? openProp : open

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  return (
    <UserDropdownProvider open={isOpen}>
      <PopoverPrimitive.Root
        {...rootProps}
        open={isOpen}
        onOpenChange={handleOpenChange}
      />
    </UserDropdownProvider>
  )
})

UserDropdownRoot.displayName = "UserDropdown.Root"

const UserDropdownTrigger = React.forwardRef<
  UserDropdownTriggerElement,
  UserDropdownTriggerProps
>((props, forwardedRef) => {
  const { className, children, ...triggerProps } = props
  const { open } = useUserDropdownContext("UserDropdown.Trigger")

  return (
    <PopoverPrimitive.Trigger
      {...triggerProps}
      ref={forwardedRef}
      className={cn("kb-user-dropdown-trigger", className)}
      asChild
    >
      <button type="button">
        {children}
        <span
          className={cn("kb-user-dropdown-trigger-chevron", {
            "kb-user-dropdown-trigger-chevron-open": open,
          })}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
          >
            <path
              d="M0.75 0.75L4.75 4.75L8.75 0.75"
              stroke="#B6B2AF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    </PopoverPrimitive.Trigger>
  )
})

UserDropdownTrigger.displayName = "UserDropdown.Trigger"

const UserDropdownContent = React.forwardRef<
  UserDropdownContentElement,
  UserDropdownContentProps
>((props, forwardedRef) => {
  const { className, children, ...contentProps } = props

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        {...contentProps}
        ref={forwardedRef}
        className={cn("kb-user-dropdown-content", className)}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
})

UserDropdownContent.displayName = "UserDropdown.Content"

const UserDropdownItem = React.forwardRef<
  UserDropdownItemElement,
  UserDropdownItemProps
>((props, forwardedRef) => {
  const { className, children, selected, onClick, ...itemProps } = props

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
  }

  return (
    <PopoverPrimitive.Close asChild>
      <button
        {...itemProps}
        onClick={handleClick}
        ref={forwardedRef}
        className={cn(
          "kb-user-dropdown-item",
          { "kb-user-dropdown-item-selected": selected },
          className
        )}
      >
        {children}
        {selected && (
          <span className="kb-user-dropdown-item-indicator">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="10"
              viewBox="0 0 13 10"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.183061 5.18306C0.427139 4.93898 0.822867 4.93898 1.06694 5.18306L3.95834 8.07445L11.8497 0.183057C12.0938 -0.0610201 12.4895 -0.0610204 12.7336 0.183057C12.9777 0.427135 12.9777 0.822863 12.7336 1.06694L4.40028 9.40028C4.1562 9.64435 3.76047 9.64435 3.51639 9.40028L0.183061 6.06694C-0.0610166 5.82286 -0.0610166 5.42714 0.183061 5.18306Z"
                fill="#716D6A"
              />
            </svg>
          </span>
        )}
      </button>
    </PopoverPrimitive.Close>
  )
})

UserDropdownItem.displayName = "UserDropdown.Item"

const UserDropdownDivider = React.forwardRef<
  UserDropdownDividerElement,
  UserDropdownDividerProps
>((props, forwardedRef) => {
  const { className, ...dividerProps } = props

  return (
    <div
      {...dividerProps}
      ref={forwardedRef}
      className={cn("kb-user-dropdown-divider", className)}
    />
  )
})

UserDropdownDivider.displayName = "UserDropdown.Divider"

export {
  UserDropdownRoot,
  UserDropdownTrigger,
  UserDropdownContent,
  UserDropdownItem,
  UserDropdownDivider,
  UserDropdownRoot as Root,
  UserDropdownTrigger as Trigger,
  UserDropdownContent as Content,
  UserDropdownItem as Item,
  UserDropdownDivider as Divider,
}
