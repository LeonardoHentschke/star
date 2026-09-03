import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
}

function MultiSelect({ options, value, onChange, placeholder }: MultiSelectProps) {
  function toggle(optionValue: string, checked: boolean) {
    onChange(checked ? [...value, optionValue] : value.filter((v) => v !== optionValue))
  }

  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label)
  const triggerLabel =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selecionados`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="select-trigger"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-input/90 px-3 text-sm text-foreground shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/30"
        >
          <span className={cn("truncate text-left", selectedLabels.length === 0 && "text-muted-foreground")}>
            {triggerLabel}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="scrollbar-thin w-(--radix-popover-trigger-width) max-h-[270px] gap-0.5 overflow-y-auto p-2"
      >
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma opção disponível.</p>
        ) : (
          options.map((option) => (
            <Label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal transition-colors hover:bg-accent"
            >
              <Checkbox
                checked={value.includes(option.value)}
                onCheckedChange={(checked) => toggle(option.value, checked === true)}
              />
              {option.label}
            </Label>
          ))
        )}
      </PopoverContent>
    </Popover>
  )
}

export { MultiSelect }
