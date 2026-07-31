import * as RadixCollapsible from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CollapsibleProps {
  trigger: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Collapsible({ trigger, children, defaultOpen = false, className }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <RadixCollapsible.Root open={open} onOpenChange={setOpen} className={className}>
      <RadixCollapsible.Trigger className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm font-medium text-accent-700 hover:text-accent-800 dark:text-accent-300 dark:hover:text-accent-200">
        <span>{trigger}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </RadixCollapsible.Trigger>
      <RadixCollapsible.Content className="overflow-hidden data-[state=open]:animate-fade-in">
        {children}
      </RadixCollapsible.Content>
    </RadixCollapsible.Root>
  )
}
