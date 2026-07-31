import * as RadixTabs from '@radix-ui/react-tabs'
import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

interface TabItem {
  value: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
}

export function Tabs({ items, value, onValueChange, children }: TabsProps) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List
        className="inline-flex gap-1 rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900"
        aria-label="Insight views"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium text-neutral-600 transition-colors duration-150',
              'hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',
              'data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm',
              'dark:data-[state=active]:bg-neutral-700 dark:data-[state=active]:text-white',
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  )
}

export const TabPanel = RadixTabs.Content
