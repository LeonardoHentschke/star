import { useMemo, useState } from 'react';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn, formatDateShort } from '@/lib/utils';
import { buildPeriodPresets, parseDateOnly, toDateOnly, type PeriodPresetId } from '@/lib/period-presets';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface PeriodRange {
  start: string;
  end: string;
}

interface PeriodRangePickerProps {
  value: PeriodRange | null;
  onChange: (value: PeriodRange | null) => void;
  bounds: PeriodRange;
  presetIds: PeriodPresetId[];
  className?: string;
}

export function PeriodRangePicker({ value, onChange, bounds, presetIds, className }: PeriodRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  const presets = useMemo(
    () => buildPeriodPresets(presetIds).map((preset) => ({ ...preset, range: { start: preset.start, end: preset.end } })),
    [presetIds],
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDraft(value ? { from: parseDateOnly(value.start), to: parseDateOnly(value.end) } : undefined);
    }
  }

  function select(range: PeriodRange | null) {
    onChange(range);
    setOpen(false);
  }

  function applyDraft() {
    if (!draft?.from || !draft.to) return;
    select({ start: toDateOnly(draft.from), end: toDateOnly(draft.to) });
  }

  const activePreset = value
    ? presets.find((preset) => preset.range.start === value.start && preset.range.end === value.end)
    : null;
  const displayed = value ?? bounds;
  const today = new Date();

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className={cn('justify-start gap-2 font-normal', className)}>
          <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
          <span className="truncate">
            {activePreset ? `${activePreset.label} · ` : value ? '' : 'Período do documento · '}
            <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
              {formatDateShort(displayed.start)} – {formatDateShort(displayed.end)}
            </span>
          </span>
          <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col gap-0.5 border-b border-border p-2 sm:w-44 sm:border-r sm:border-b-0">
            <PresetButton active={!value} onClick={() => select(null)}>
              Período do documento
            </PresetButton>
            {presets.map((preset) => (
              <PresetButton key={preset.id} active={activePreset?.id === preset.id} onClick={() => select(preset.range)}>
                {preset.label}
              </PresetButton>
            ))}
          </div>
          <div className="flex flex-col">
            <Calendar
              mode="range"
              locale={ptBR}
              numberOfMonths={2}
              selected={draft}
              onSelect={setDraft}
              defaultMonth={draft?.from ?? parseDateOnly(displayed.start)}
              endMonth={today}
              disabled={{ after: today }}
            />
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
              <span className="text-xs text-muted-foreground">
                {draft?.from
                  ? `${formatDateShort(toDateOnly(draft.from))} – ${draft.to ? formatDateShort(toDateOnly(draft.to)) : '…'}`
                  : 'Selecione o início e o fim'}
              </span>
              <Button size="sm" onClick={applyDraft} disabled={!draft?.from || !draft.to}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PresetButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
        active ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
