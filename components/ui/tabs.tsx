"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const TabsThemeContext = React.createContext(false)

interface TabsProps extends React.ComponentProps<typeof TabsPrimitive.Root> {
  darkMode?: boolean
}

function Tabs({ className, darkMode = false, ...props }: TabsProps) {
  return (
    <TabsThemeContext.Provider value={darkMode}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsThemeContext.Provider>
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const darkMode = React.useContext(TabsThemeContext)

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-9 shadow-2xl backdrop-blur-xl w-fit items-center justify-center rounded-xl p-[3px] border transition-colors",
        darkMode
          ? "bg-gray-900/50 text-gray-300 border-gray-800/70"
          : "bg-white text-gray-600 border-gray-200 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const darkMode = React.useContext(TabsThemeContext)

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-[calc(100%-1px)] shadow-2xl backdrop-blur-xl flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow,background-color] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm data-[state=active]:text-red-500 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        darkMode
          ? "text-gray-300 data-[state=active]:bg-gray-800/70"
          : "text-gray-600 data-[state=active]:bg-white",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
