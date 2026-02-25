"use client"

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

// Type definitions for Radix UI 2.x + React 19 compatibility
type DropdownMenuProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>
type DropdownMenuTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}
type DropdownMenuContentProps = React.HTMLAttributes<HTMLDivElement> & {
  sideOffset?: number
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}
type DropdownMenuItemProps = React.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean
  variant?: "default" | "destructive"
  disabled?: boolean
}
type DropdownMenuLabelProps = React.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean
}
type DropdownMenuSeparatorProps = React.HTMLAttributes<HTMLDivElement>
type DropdownMenuSubTriggerProps = React.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean
}

const DropdownMenu = (props: DropdownMenuProps) => (
  <DropdownMenuPrimitive.Root {...props} />
)

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.Trigger
      ref={ref}
      className={className}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Trigger>
  )
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, sideOffset = 4, children, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
          className
        )}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
)
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, variant = "default", children, ...props }, ref) => (
    // @ts-ignore Radix UI event type incompatibility with React's SyntheticEvent
    <DropdownMenuPrimitive.Item
      ref={ref}
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  )
)
DropdownMenuItem.displayName = "DropdownMenuItem"

interface DropdownMenuCheckboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean | "indeterminate"
  onCheckedChange?: (checked: boolean) => void
}

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ className, children, checked, ...props }, ref) => (
    // @ts-ignore Radix UI event type incompatibility with React's SyntheticEvent
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
)
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

interface DropdownMenuRadioItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ className, children, value, ...props }, ref) => (
    // @ts-ignore Radix UI event type incompatibility with React's SyntheticEvent
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      value={value}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
)
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RadixLabel = DropdownMenuPrimitive.Label as React.ForwardRefExoticComponent<any>

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, inset, ...props }, ref) => (
    <RadixLabel
      ref={ref}
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
)
DropdownMenuLabel.displayName = "DropdownMenuLabel"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RadixSeparator = DropdownMenuPrimitive.Separator as React.ForwardRefExoticComponent<any>

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => (
    <RadixSeparator
      ref={ref}
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
)
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "text-muted-foreground ml-auto text-xs tracking-widest",
      className
    )}
    {...props}
  />
)
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  ({ className, inset, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
)
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RadixSubContent = DropdownMenuPrimitive.SubContent as React.ForwardRefExoticComponent<any>

const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <RadixSubContent
    ref={ref}
    className={cn(
      "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName = "DropdownMenuSubContent"

export
{
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger
}

