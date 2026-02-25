"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"
import * as React from "react"

import { cn } from "@/lib/utils"

type TabsProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
  className?: string
}
type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  className?: string
}
type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  className?: string
}
type TabsContentProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
  className?: string
}

const Tabs = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Root>,
  TabsProps
 
>(({ className, ...props }, ref) => {
  const Root = TabsPrimitive.Root as any
  return (
    <Root
      ref={ref}
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  TabsListProps
 
>(({ className, ...props }, ref) => {
  const List = TabsPrimitive.List as any
  return (
    <List
      ref={ref}
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
 
>(({ className, ...props }, ref) => {
  const Trigger = TabsPrimitive.Trigger as any
  return (
    <Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  TabsContentProps
 
>(({ className, ...props }, ref) => {
  const Content = TabsPrimitive.Content as any
  return (
    <Content
      ref={ref}
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsContent, TabsList, TabsTrigger }

