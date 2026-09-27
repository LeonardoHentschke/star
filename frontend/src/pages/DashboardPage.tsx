import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  BookOpen,
  Bug,
  CheckCircle2,
  ChartPie,
  CheckSquare,
  Clock,
  FileText,
  GitPullRequest,
  LayoutDashboard,
  LineChart,
  ListTree,
  Plus,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDateShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PeriodRangePicker } from '@/components/PeriodRangePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface DocumentSummary {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  favorite: boolean;
}

interface DashboardTopItem {
  itemId: string;
  title: string;
  url: string | null;
  sourceType: 'jira' | 'github_pr';
  additions: number;
  deletions: number;
  linesChanged: number;
}

interface DashboardSummary {
  document: { id: string; title: string; periodStart: string; periodEnd: string };
  filter: { periodStart: string | null; periodEnd: string | null };
  totals: {
    itemsCount: number;
    doneItemsCount: number;
    completionRate: number;
    totalAdditions: number;
    totalDeletions: number;
    totalLinesChanged: number;
  };
  topItemByLinesChanged: DashboardTopItem | null;
  byStatus: { status: string; itemsCount: number }[];
  byIssueType: { issueType: string; itemsCount: number }[];
  topItemsByLinesChanged: DashboardTopItem[];
  completedOverTime: { month: string; doneCount: number }[];
  prCycleTime: { averageDays: number | null; sampleSize: number };
}

const KPI_STATUSES: { status: string; color: string }[] = [
  { status: 'Concluído', color: 'var(--color-chart-3)' },
  { status: 'Rejeitada', color: 'var(--color-chart-6)' },
  { status: 'Code review', color: 'var(--color-chart-2)' },
  { status: 'Ready for testing in dev', color: 'var(--color-chart-4)' },
  { status: 'Ready for deployment', color: 'var(--color-chart-1)' },
  { status: 'Testing in dev', color: 'var(--color-chart-7)' },
];

const OTHER_STATUS = { status: 'Outros', color: 'var(--color-chart-5)' };

const KPI_ISSUE_TYPES: { issueType: string; icon: ReactNode }[] = [
  { issueType: 'Bug', icon: <Bug className="h-4 w-4" strokeWidth={1.75} /> },
  { issueType: 'Subtarefa', icon: <ListTree className="h-4 w-4" strokeWidth={1.75} /> },
  { issueType: 'Technical Debt', icon: <Wrench className="h-4 w-4" strokeWidth={1.75} /> },
  { issueType: 'Melhoria', icon: <TrendingUp className="h-4 w-4" strokeWidth={1.75} /> },
  { issueType: 'História', icon: <BookOpen className="h-4 w-4" strokeWidth={1.75} /> },
  { issueType: 'Nova função', icon: <Sparkles className="h-4 w-4" strokeWidth={1.75} /> },
  { issueType: 'Tarefa', icon: <CheckSquare className="h-4 w-4" strokeWidth={1.75} /> },
  { issueType: 'Epic', icon: <Zap className="h-4 w-4" strokeWidth={1.75} /> },
];

const linesChartConfig: ChartConfig = {
  linesChanged: { label: 'Linhas alteradas', color: 'var(--color-chart-1)' },
};

const trendChartConfig: ChartConfig = {
  doneCount: { label: 'Tarefas concluídas', color: 'var(--color-chart-3)' },
};

function fillMonths(points: { month: string; doneCount: number }[]): { month: string; doneCount: number }[] {
  if (points.length === 0) return [];
  const counts = new Map(points.map((point) => [point.month, point.doneCount]));
  const sorted = [...counts.keys()].sort();
  let [year, month] = sorted[0].split('-').map(Number);
  const [lastYear, lastMonth] = sorted[sorted.length - 1].split('-').map(Number);
  const filled: { month: string; doneCount: number }[] = [];
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    filled.push({ month: key, doneCount: counts.get(key) ?? 0 });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return filled;
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${MONTHS[Number(m) - 1] ?? m}/${year.slice(2)}`;
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlDocumentId = searchParams.get('doc');
  const periodStart = searchParams.get('inicio') ?? '';
  const periodEnd = searchParams.get('fim') ?? '';
  const statusFilter = searchParams.get('status');
  const issueTypeFilter = searchParams.get('tipo');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    api
      .get<DocumentSummary[]>('/documents')
      .then((res) => {
        setDocuments(res.data);
      })
      .finally(() => setDocumentsLoading(false));
  }, []);

  const selectedDocumentId = useMemo(() => {
    if (urlDocumentId && documents.some((doc) => doc.id === urlDocumentId)) return urlDocumentId;
    return documents.find((doc) => doc.favorite)?.id ?? documents[0]?.id ?? null;
  }, [documents, urlDocumentId]);

  function updateFilters(patch: Record<string, string | null>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
        return next;
      },
      { replace: true },
    );
  }

  function selectDocument(documentId: string) {
    updateFilters({ doc: documentId, inicio: null, fim: null, status: null, tipo: null });
  }

  function toggleStatusFilter(status: string) {
    updateFilters({ status: statusFilter === status ? null : status });
  }

  function toggleIssueTypeFilter(issueType: string) {
    updateFilters({ tipo: issueTypeFilter === issueType ? null : issueType });
  }

  function clearFilters() {
    updateFilters({ inicio: null, fim: null, status: null, tipo: null });
  }

  useEffect(() => {
    if (!selectedDocumentId) return;
    setSummaryLoading(true);
    api
      .get<DashboardSummary>('/dashboard/summary', {
        params: {
          documentId: selectedDocumentId,
          periodStart: periodStart || undefined,
          periodEnd: periodEnd || undefined,
          status: statusFilter ?? undefined,
          issueType: issueTypeFilter ?? undefined,
        },
      })
      .then((res) => setSummary(res.data))
      .finally(() => setSummaryLoading(false));
  }, [selectedDocumentId, periodStart, periodEnd, statusFilter, issueTypeFilter]);

  async function toggleFavorite() {
    if (!selectedDocumentId) return;
    const current = documents.find((doc) => doc.id === selectedDocumentId);
    const next = !current?.favorite;
    setFavoriteLoading(true);
    try {
      await api.patch(`/documents/${selectedDocumentId}/favorite`, { favorite: next });
      setDocuments((prev) => prev.map((doc) => ({ ...doc, favorite: doc.id === selectedDocumentId && next })));
    } finally {
      setFavoriteLoading(false);
    }
  }

  const statusBreakdown = useMemo(() => {
    const byStatus = summary?.byStatus ?? [];
    const known = new Set(KPI_STATUSES.map((entry) => entry.status));
    const rows = KPI_STATUSES.map((entry) => ({
      ...entry,
      itemsCount: byStatus.find((item) => item.status === entry.status)?.itemsCount ?? 0,
    }));
    const others = byStatus.filter((item) => !known.has(item.status));
    rows.push({ ...OTHER_STATUS, itemsCount: others.reduce((sum, item) => sum + item.itemsCount, 0) });
    return { rows, othersNames: others.map((item) => `${item.status} (${item.itemsCount})`).join(', ') };
  }, [summary]);

  const statusChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    statusBreakdown.rows.forEach((row) => {
      config[row.status] = { label: row.status, color: row.color };
    });
    return config;
  }, [statusBreakdown]);

  const issueTypeRows = useMemo(
    () =>
      KPI_ISSUE_TYPES.map((entry) => ({
        ...entry,
        itemsCount: summary?.byIssueType.find((item) => item.issueType === entry.issueType)?.itemsCount ?? 0,
      })),
    [summary],
  );

  const trendData = useMemo(() => fillMonths(summary?.completedOverTime ?? []), [summary]);

  const selectedDocument = documents.find((doc) => doc.id === selectedDocumentId) ?? null;
  const hasDateFilter = Boolean(periodStart && periodEnd);
  const hasFilters = hasDateFilter || Boolean(statusFilter || issueTypeFilter);
  const loading = documentsLoading || summaryLoading;
  const empty = !loading && summary && summary.totals.itemsCount === 0;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard de desempenho</h1>
          <p className="text-sm text-muted-foreground">
            {selectedDocument
              ? `${selectedDocument.title} · ${formatDateShort(selectedDocument.periodStart)} – ${formatDateShort(selectedDocument.periodEnd)}`
              : 'Métricas de um documento por vez.'}
          </p>
        </div>

      </header>

      {documents.length > 0 && selectedDocument && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
            <div className="flex items-center gap-1">
              <Select value={selectedDocumentId ?? undefined} onValueChange={selectDocument}>
                <SelectTrigger className="w-64 border-transparent bg-transparent shadow-none">
                  <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  <SelectValue placeholder="Selecione um documento">
                    <span className="truncate">{selectedDocument.title}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      <span className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5">
                          {doc.title}
                          {doc.favorite && (
                            <Star className="h-3 w-3 text-amber-500" strokeWidth={1.75} fill="currentColor" />
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateShort(doc.periodStart)} – {formatDateShort(doc.periodEnd)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={favoriteLoading}
                onClick={toggleFavorite}
                aria-label={selectedDocument.favorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                aria-pressed={selectedDocument.favorite}
                title={selectedDocument.favorite ? 'Documento favorito do dashboard' : 'Marcar como favorito'}
                className={selectedDocument.favorite ? 'text-amber-500 hover:text-amber-500' : 'text-muted-foreground'}
              >
                <Star className="h-4 w-4" strokeWidth={1.75} fill={selectedDocument.favorite ? 'currentColor' : 'none'} />
              </Button>
            </div>
            <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
            <PeriodRangePicker
              value={hasDateFilter ? { start: periodStart, end: periodEnd } : null}
              onChange={(range) => updateFilters({ inicio: range?.start ?? null, fim: range?.end ?? null })}
              bounds={{ start: selectedDocument.periodStart.slice(0, 10), end: selectedDocument.periodEnd.slice(0, 10) }}
              presetIds={['month', 'last-month', 'quarter', 'last-quarter', 'year']}
              className="border-transparent bg-transparent shadow-none"
            />
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            )}
          </div>

          {hasFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-muted-foreground">Filtrando por</span>
              {hasDateFilter && (
                <FilterChip label="Período" value={`${formatDateShort(periodStart)} – ${formatDateShort(periodEnd)}`} onRemove={() => updateFilters({ inicio: null, fim: null })} />
              )}
              {statusFilter && <FilterChip label="Status" value={statusFilter} onRemove={() => updateFilters({ status: null })} />}
              {issueTypeFilter && (
                <FilterChip label="Tipo" value={issueTypeFilter} onRemove={() => updateFilters({ tipo: null })} />
              )}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="star-pulse h-24 rounded-xl border border-border bg-card" />
          ))}
        </div>
      )}

      {!documentsLoading && documents.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card px-8 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="flex max-w-sm flex-col gap-1.5">
            <h2 className="text-base font-medium">Nenhum documento por aqui ainda</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Crie um documento com tarefas do Jira ou GitHub para ver as métricas aqui.
            </p>
          </div>
          <Button asChild className="mt-1">
            <Link to="/documents/new">
              <Plus className="h-4 w-4" />
              Criar meu primeiro documento
            </Link>
          </Button>
        </div>
      )}

      {empty && (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card px-8 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <BarChart3 className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="flex max-w-sm flex-col gap-1.5">
            <h2 className="text-base font-medium">Nenhum dado para exibir</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {hasFilters
                ? 'Nenhum item corresponde aos filtros selecionados.'
                : 'Este documento ainda não tem tarefas selecionadas.'}
            </p>
          </div>
        </div>
      )}

      {!loading && summary && !empty && (
        <>
          <SectionTitle icon={LayoutDashboard}>Visão geral</SectionTitle>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
              label="Tarefas feitas"
              value={`${summary.totals.doneItemsCount.toLocaleString('pt-BR')} / ${summary.totals.itemsCount.toLocaleString('pt-BR')}`}
              hint={`${(summary.totals.completionRate * 100).toFixed(0)}% de conclusão`}
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-chart-3"
                  style={{ width: `${Math.round(summary.totals.completionRate * 100)}%` }}
                />
              </div>
            </KpiCard>
            <KpiCard
              icon={<GitPullRequest className="h-4 w-4" strokeWidth={1.75} />}
              label="Linhas alteradas"
              value={summary.totals.totalLinesChanged.toLocaleString('pt-BR')}
              hint={
                <>
                  <span className="text-chart-3">+{summary.totals.totalAdditions.toLocaleString('pt-BR')}</span>
                  {' / '}
                  <span className="text-chart-6">-{summary.totals.totalDeletions.toLocaleString('pt-BR')}</span>
                </>
              }
            />
            <KpiCard
              icon={<Trophy className="h-4 w-4" strokeWidth={1.75} />}
              label="Maior tarefa"
              value={
                summary.topItemByLinesChanged
                  ? summary.topItemByLinesChanged.linesChanged.toLocaleString('pt-BR')
                  : '—'
              }
              hint={
                summary.topItemByLinesChanged ? (
                  summary.topItemByLinesChanged.url ? (
                    <a
                      href={summary.topItemByLinesChanged.url}
                      target="_blank"
                      rel="noreferrer"
                      title={summary.topItemByLinesChanged.title}
                      className="truncate underline-offset-2 hover:underline"
                    >
                      {summary.topItemByLinesChanged.title}
                    </a>
                  ) : (
                    summary.topItemByLinesChanged.title
                  )
                ) : (
                  'Nenhuma tarefa com linhas alteradas'
                )
              }
            />
            <KpiCard
              icon={<Clock className="h-4 w-4" strokeWidth={1.75} />}
              label="Ciclo médio de PR"
              value={
                summary.prCycleTime.averageDays !== null
                  ? `${summary.prCycleTime.averageDays.toFixed(1).replace('.', ',')} dias`
                  : '—'
              }
              hint={
                summary.prCycleTime.sampleSize > 0
                  ? `${summary.prCycleTime.sampleSize} PRs mergeadas`
                  : 'Sem PRs mergeadas no período'
              }
            />
          </div>

          <SectionTitle icon={ChartPie}>Distribuição</SectionTitle>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartCard title="Tarefas por status" subtitle="Clique para filtrar">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <div className="relative h-40 w-40 shrink-0">
                  <ChartContainer config={statusChartConfig} className="h-40 w-40">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                      <Pie
                        data={statusBreakdown.rows.filter((row) => row.itemsCount > 0)}
                        dataKey="itemsCount"
                        nameKey="status"
                        innerRadius={52}
                        outerRadius={76}
                        stroke="var(--color-card)"
                        strokeWidth={2}
                        isAnimationActive={false}
                        className="cursor-pointer"
                        onClick={(entry: { status?: string }) => {
                          if (entry.status && entry.status !== OTHER_STATUS.status) toggleStatusFilter(entry.status);
                        }}
                      >
                        {statusBreakdown.rows
                          .filter((row) => row.itemsCount > 0)
                          .map((row) => (
                            <Cell
                              key={row.status}
                              fill={row.color}
                              opacity={statusFilter && statusFilter !== row.status ? 0.35 : 1}
                            />
                          ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-semibold tracking-tight tabular-nums">
                      {summary.totals.itemsCount.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[11px] text-muted-foreground">tarefas</span>
                  </div>
                </div>
                <div className="flex w-full min-w-0 flex-col gap-2.5">
                  {statusBreakdown.rows.map((row) => (
                    <BreakdownRow
                      key={row.status}
                      marker={<span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: row.color }} />}
                      label={row.status}
                      title={row.status === OTHER_STATUS.status ? statusBreakdown.othersNames : `Filtrar por ${row.status}`}
                      value={row.itemsCount}
                      total={summary.totals.itemsCount}
                      color={row.color}
                      active={statusFilter === row.status}
                      dimmed={Boolean(statusFilter) && statusFilter !== row.status}
                      onClick={
                        row.status !== OTHER_STATUS.status && (row.itemsCount > 0 || Boolean(statusFilter))
                          ? () => toggleStatusFilter(row.status)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Tipos de tarefa" subtitle="Clique para filtrar">
              <div className="flex flex-col gap-2.5">
                {issueTypeRows.map((row) => (
                  <BreakdownRow
                    key={row.issueType}
                    marker={<span className="shrink-0 text-muted-foreground">{row.icon}</span>}
                    label={row.issueType}
                    title={`Filtrar por ${row.issueType}`}
                    value={row.itemsCount}
                    total={summary.totals.itemsCount}
                    color="var(--color-chart-1)"
                    active={issueTypeFilter === row.issueType}
                    dimmed={Boolean(issueTypeFilter) && issueTypeFilter !== row.issueType}
                    onClick={
                      row.itemsCount > 0 || Boolean(issueTypeFilter)
                        ? () => toggleIssueTypeFilter(row.issueType)
                        : undefined
                    }
                  />
                ))}
              </div>
            </ChartCard>
          </div>

          <SectionTitle icon={LineChart}>Evolução</SectionTitle>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartCard title="Tarefas concluídas por mês">
              {trendData.length > 0 ? (
                <ChartContainer config={trendChartConfig} className="h-64 w-full">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-doneCount)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-doneCount)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={16}
                    />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                    <ChartTooltip
                      cursor={{ stroke: 'var(--color-border)' }}
                      content={<ChartTooltipContent labelFormatter={(v) => formatMonth(String(v))} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="doneCount"
                      stroke="var(--color-doneCount)"
                      strokeWidth={2}
                      fill="url(#trendFill)"
                      dot={false}
                      isAnimationActive={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-card)' }}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard title="Top tarefas por linhas alteradas">
              {summary.topItemsByLinesChanged.length > 0 ? (
                <ChartContainer config={linesChartConfig} className="h-64 w-full">
                  <BarChart
                    data={summary.topItemsByLinesChanged}
                    layout="vertical"
                    margin={{ left: 0, right: 8 }}
                    barCategoryGap={4}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="title"
                      tickLine={false}
                      axisLine={false}
                      width={150}
                      tickFormatter={(value: string) => (value.length > 22 ? `${value.slice(0, 22)}…` : value)}
                    />
                    <ChartTooltip cursor={{ fill: 'var(--color-muted)' }} content={<ChartTooltipContent />} />
                    <Bar dataKey="linesChanged" fill="var(--color-linesChanged)" radius={4} isAnimationActive={false} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-border bg-muted/50 py-0.5 pr-1 pl-2.5 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {children}
    </h2>
  );
}

function BreakdownRow({
  marker,
  label,
  title,
  value,
  total,
  color,
  active = false,
  dimmed = false,
  onClick,
}: {
  marker: ReactNode;
  label: string;
  title?: string;
  value: number;
  total: number;
  color: string;
  active?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}) {
  const share = total > 0 ? value / total : 0;
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        '-mx-2 flex flex-col gap-1 rounded-lg px-2 py-1 text-left transition-[background-color,opacity]',
        onClick && 'cursor-pointer hover:bg-accent',
        active && 'bg-accent',
        dimmed && 'opacity-45',
      )}
      title={title ?? label}
    >
      <div className="flex items-center gap-2 text-sm">
        {marker}
        <span className="min-w-0 flex-1 truncate text-card-foreground">{label}</span>
        <span className="font-medium tabular-nums text-card-foreground">{value.toLocaleString('pt-BR')}</span>
        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
          {share > 0 && share < 0.01 ? '<1' : Math.round(share * 100)}%
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${value > 0 ? Math.max(share * 100, 1) : 0}%`, backgroundColor: color }}
        />
      </div>
    </Wrapper>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-5">
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="truncate" title={label}>
          {label}
        </span>
      </span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums text-card-foreground">{value}</span>
      {children}
      {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`min-w-0 rounded-xl border border-border bg-card p-5 ${className ?? ''}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
      Sem dados suficientes
    </div>
  );
}
