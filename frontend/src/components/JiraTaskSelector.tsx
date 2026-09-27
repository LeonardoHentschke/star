import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Bug,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  CircleAlert,
  Filter,
  ListTree,
  Loader2,
  Search,
  Sparkles,
  SquareChevronRight,
  TrendingUp,
  Type,
  Wrench,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDateShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { ListPagination } from '@/components/ListPagination';
import { buildPeriodPresets, type PeriodPreset } from '@/lib/period-presets';

export interface JiraTask {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  status: string;
  statusCategory: 'new' | 'indeterminate' | 'done';
  issueType: string | null;
  url: string;
}

export function jiraTasksToDocumentItems(tasks: JiraTask[]) {
  return tasks.map((task) => ({
    sourceType: 'jira' as const,
    sourceRef: task.key,
    sourceTitle: task.summary,
    sourceUrl: task.url,
    jiraIssueId: task.id,
    jiraStatus: task.status,
    jiraStatusCategory: task.statusCategory,
    jiraIssueType: task.issueType,
    description: task.description,
  }));
}

interface JiraFilterOption {
  id: string;
  name: string;
}

interface JiraTaskFilters {
  statuses: JiraFilterOption[];
  priorities: JiraFilterOption[];
  issueTypes: JiraFilterOption[];
}

export interface SelectedPeriod {
  periodStart: string;
  periodEnd: string;
}

const EMPTY_FILTERS: JiraTaskFilters = { statuses: [], priorities: [], issueTypes: [] };

const ISSUE_TYPE_ICONS: Record<string, ReactNode> = {
  Bug: <Bug className="h-3 w-3" strokeWidth={2} />,
  Subtarefa: <ListTree className="h-3 w-3" strokeWidth={2} />,
  'Technical Debt': <Wrench className="h-3 w-3" strokeWidth={2} />,
  Melhoria: <TrendingUp className="h-3 w-3" strokeWidth={2} />,
  História: <BookOpen className="h-3 w-3" strokeWidth={2} />,
  'Nova função': <Sparkles className="h-3 w-3" strokeWidth={2} />,
  Tarefa: <CheckSquare className="h-3 w-3" strokeWidth={2} />,
  Epic: <Zap className="h-3 w-3" strokeWidth={2} />,
};

const STATUS_BADGE_VARIANT = {
  done: 'success',
  indeterminate: 'jira',
  new: 'outline',
} as const;

function joinWithAnd(parts: string[]) {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-2">
            {index > 0 && <span className={cn('h-px w-8 bg-border', (done || active) && 'bg-foreground/40')} />}
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium tabular-nums',
                done && 'border-transparent bg-chart-3/15 text-chart-3',
                active && 'border-transparent bg-primary text-primary-foreground',
                !done && !active && 'border-border text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index + 1}
            </span>
            <span className={cn('text-sm', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function FormSection({
  icon,
  title,
  description,
  optional,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          {icon}
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            {title}
            {optional && (
              <span className="rounded-full border border-border px-2 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Opcional
              </span>
            )}
          </h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface JiraTaskSelectorProps {
  title?: { value: string; onChange: (value: string) => void };
  initialPeriodStart?: string;
  initialPeriodEnd?: string;
  finalStepLabel: string;
  submitLabel: string;
  submittingLabel: string;
  submitting?: boolean;
  onSubmit: (tasks: JiraTask[], period: SelectedPeriod) => void | Promise<void>;
}

export function JiraTaskSelector({
  title,
  initialPeriodStart = '',
  initialPeriodEnd = '',
  finalStepLabel,
  submitLabel,
  submittingLabel,
  submitting = false,
  onSubmit,
}: JiraTaskSelectorProps) {
  const [periodStart, setPeriodStart] = useState(initialPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd);
  const [status, setStatus] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>([]);
  const [issueType, setIssueType] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<JiraTaskFilters>(EMPTY_FILTERS);

  const [tasks, setTasks] = useState<JiraTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [step, setStep] = useState<'period' | 'select'>('period');
  const [searching, setSearching] = useState(false);
  const suggestedTitleRef = useRef<string | null>(null);

  const presets = useMemo(() => buildPeriodPresets(['quarter', 'last-quarter', 'semester', 'year', '30d']), []);

  useEffect(() => {
    api
      .get<JiraTaskFilters>('/jira/task-filters')
      .then(({ data }) => setFilterOptions(data))
      .catch(() => setFilterOptions(EMPTY_FILTERS));
  }, []);

  function applyPreset(preset: PeriodPreset) {
    setPeriodStart(preset.start);
    setPeriodEnd(preset.end);
    if (title && (!title.value.trim() || title.value === suggestedTitleRef.current)) {
      title.onChange(preset.title);
      suggestedTitleRef.current = preset.title;
    }
  }

  async function handleSearch() {
    setSearching(true);
    try {
      const { data } = await api.get<JiraTask[]>('/jira/tasks', {
        params: {
          periodStart,
          periodEnd,
          status: status.length ? status.join(',') : undefined,
          priority: priority.length ? priority.join(',') : undefined,
          issueType: issueType.length ? issueType.join(',') : undefined,
        },
      });
      setTasks(data);
      setSelectedTasks([]);
      setQuery('');
      setCurrentPage(1);
      setStep('select');
    } finally {
      setSearching(false);
    }
  }

  function toggleTask(key: string, checked: boolean) {
    setSelectedTasks((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setCurrentPage(1);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setCurrentPage(1);
  }

  async function handleSubmit() {
    const selected = tasks.filter((t) => selectedTasks.includes(t.key));
    await onSubmit(selected, { periodStart, periodEnd });
  }

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tasks;
    return tasks.filter(
      (t) => t.key.toLowerCase().includes(normalized) || t.summary.toLowerCase().includes(normalized),
    );
  }, [tasks, query]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  const allFilteredSelected =
    filteredTasks.length > 0 && filteredTasks.every((t) => selectedTasks.includes(t.key));

  function toggleAllFiltered() {
    const filteredKeys = new Set(filteredTasks.map((t) => t.key));
    setSelectedTasks((prev) =>
      allFilteredSelected
        ? prev.filter((k) => !filteredKeys.has(k))
        : [...prev, ...filteredTasks.map((t) => t.key).filter((k) => !prev.includes(k))],
    );
  }

  const missingFields = [
    ...(title && !title.value.trim() ? ['título'] : []),
    ...(!periodStart ? ['data de início'] : []),
    ...(!periodEnd ? ['data de fim'] : []),
  ];
  const invalidRange = Boolean(periodStart && periodEnd && periodStart > periodEnd);
  const canSearch = missingFields.length === 0 && !invalidRange;
  const activeFiltersCount = [status, priority, issueType].filter((f) => f.length > 0).length;
  const currentStep = submitting ? 2 : step === 'select' ? 1 : 0;

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={['Período', 'Tarefas', finalStepLabel]} current={currentStep} />

      {step === 'period' && (
        <div className="flex flex-col gap-4">
          {title && (
            <FormSection
              icon={<Type className="h-4 w-4" strokeWidth={1.75} />}
              title="Identificação"
              description="Como este documento vai aparecer na listagem."
            >
              <Input
                placeholder="Avaliação Q3 2026"
                value={title.value}
                onChange={(e) => title.onChange(e.target.value)}
              />
            </FormSection>
          )}

          <FormSection
            icon={<CalendarDays className="h-4 w-4" strokeWidth={1.75} />}
            title="Período"
            description="Tarefas concluídas ou movimentadas neste intervalo serão buscadas no Jira."
          >
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => {
                const active = preset.start === periodStart && preset.end === periodEnd;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      active
                        ? 'border-transparent bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Início</Label>
                <DatePicker value={periodStart} onChange={setPeriodStart} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fim</Label>
                <DatePicker value={periodEnd} onChange={setPeriodEnd} />
              </div>
            </div>
          </FormSection>

          <FormSection
            icon={<Filter className="h-4 w-4" strokeWidth={1.75} />}
            title="Filtros do Jira"
            description="Deixe em branco para trazer todas as tarefas do período."
            optional
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <MultiSelect
                  placeholder="Todos"
                  value={status}
                  onChange={setStatus}
                  options={filterOptions.statuses.map((s) => ({ value: s.id, label: s.name }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Prioridade</Label>
                <MultiSelect
                  placeholder="Todas"
                  value={priority}
                  onChange={setPriority}
                  options={filterOptions.priorities.map((p) => ({ value: p.id, label: p.name }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tipo de item</Label>
                <MultiSelect
                  placeholder="Todos"
                  value={issueType}
                  onChange={setIssueType}
                  options={filterOptions.issueTypes.map((t) => ({ value: t.id, label: t.name }))}
                />
              </div>
            </div>
          </FormSection>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-1">
            <span
              className={cn(
                'flex items-center gap-1.5 text-xs',
                canSearch ? 'text-chart-3' : 'text-muted-foreground',
              )}
            >
              {canSearch ? (
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <CircleAlert className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {missingFields.length > 0
                ? `Falta preencher: ${joinWithAnd(missingFields)}.`
                : invalidRange
                  ? 'A data de fim deve ser igual ou posterior à de início.'
                  : 'Tudo pronto para buscar as tarefas.'}
            </span>
            <Button onClick={handleSearch} disabled={!canSearch || searching}>
              {searching ? (
                <Loader2 className="star-spin h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Search className="h-4 w-4" strokeWidth={1.75} />
              )}
              {searching ? 'Buscando tarefas…' : 'Buscar tarefas do Jira'}
            </Button>
          </div>
        </div>
      )}

      {step === 'select' && (
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep('period')}
            disabled={submitting}
            className="h-auto w-full flex-wrap justify-start gap-3 rounded-lg border border-border bg-muted/60 px-4 py-3 text-left font-normal"
          >
            {title && <span className="text-sm font-medium">{title.value}</span>}
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
              {formatDateShort(periodStart)} – {formatDateShort(periodEnd)}
            </span>
            {activeFiltersCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" strokeWidth={1.75} />
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro' : 'filtros'}
              </span>
            )}
            <span className="ml-auto text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
              Editar
            </span>
          </Button>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold">Tarefas do Jira</h2>
                <p className="text-xs text-muted-foreground">
                  Os Pull Requests já vinculados a cada tarefa no Jira entram automaticamente.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <Input
                    placeholder="Buscar por chave ou título"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    className="h-8 w-64 pl-8 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  disabled={filteredTasks.length === 0}
                  onClick={toggleAllFiltered}
                >
                  {allFilteredSelected ? 'Limpar seleção' : `Selecionar todas (${filteredTasks.length})`}
                </Button>
              </div>
            </div>

            <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {paginatedTasks.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {tasks.length === 0 ? 'Nenhuma tarefa encontrada no período.' : 'Nenhuma tarefa corresponde à busca.'}
                </p>
              )}
              {paginatedTasks.map((task) => (
                <Label
                  key={task.key}
                  className="flex cursor-pointer items-start gap-3 px-4 py-3 font-normal text-inherit transition-colors hover:bg-accent"
                >
                  <Checkbox
                    className="-mt-0.5"
                    checked={selectedTasks.includes(task.key)}
                    onCheckedChange={(checked) => toggleTask(task.key, checked === true)}
                  />
                  <span className="w-20 shrink-0 whitespace-nowrap font-mono text-[12px] font-medium text-blue-700 dark:text-blue-400">
                    {task.key}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] text-card-foreground">{task.summary}</span>
                  <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                    {task.issueType && (
                      <Badge variant="outline" className="text-muted-foreground">
                        {ISSUE_TYPE_ICONS[task.issueType] ?? <SquareChevronRight className="h-3 w-3" strokeWidth={2} />}
                        {task.issueType}
                      </Badge>
                    )}
                    <Badge variant={STATUS_BADGE_VARIANT[task.statusCategory] ?? 'outline'}>{task.status}</Badge>
                  </span>
                </Label>
              ))}
            </div>

            <div className="mt-4">
              <ListPagination
                total={filteredTasks.length}
                totalLabel={query.trim() ? `de ${tasks.length} tarefas` : 'encontradas'}
                page={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </section>

          <div className="sticky bottom-0 z-10 -mx-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-background/90 px-8 py-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="text-sm">
                <span className="font-semibold tabular-nums">{selectedTasks.length}</span>{' '}
                <span className="text-muted-foreground">
                  {selectedTasks.length === 1 ? 'tarefa selecionada' : 'tarefas selecionadas'}
                </span>
              </span>
              {selectedTasks.length > 0 && !submitting && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground"
                  onClick={() => setSelectedTasks([])}
                >
                  Limpar
                </Button>
              )}
            </div>
            <Button onClick={handleSubmit} disabled={submitting || selectedTasks.length === 0}>
              {submitting ? (
                <Loader2 className="star-spin h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              )}
              {submitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
