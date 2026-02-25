"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import * as React from "react"

import { cn } from "@/lib/utils"

type TooltipProviderProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider> & {
  children?: React.ReactNode
}
type TooltipProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> & {
  children?: React.ReactNode
}
type TooltipTriggerProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> & {
  children?: React.ReactNode
  asChild?: boolean
}
type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
  className?: string
  children?: React.ReactNode
  hidden?: boolean
}

 
const TooltipProvider = ({ delayDuration = 0, ...props }: TooltipProviderProps) => {
  const Provider = TooltipPrimitive.Provider as any
  return (
    <Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

 
const Tooltip = ({ children, ...props }: TooltipProps) => {
  const Root = TooltipPrimitive.Root as any
  return (
    <TooltipProvider>
      <Root data-slot="tooltip" {...props}>
        {children}
      </Root>
    </TooltipProvider>
  )
}

const TooltipTrigger = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Trigger>,
  TooltipTriggerProps
 
>(({ ...props }, ref) => {
  const Trigger = TooltipPrimitive.Trigger as any
  return <Trigger ref={ref} data-slot="tooltip-trigger" {...props} />
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
 
>(({ className, sideOffset = 0, children, ...props }, ref) => {
  const Content = TooltipPrimitive.Content as any
  const Arrow = TooltipPrimitive.Arrow as any
  return (
    <TooltipPrimitive.Portal>
      <Content
        ref={ref}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}
      >
        {children}
        <Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </Content>
    </TooltipPrimitive.Portal>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }

