import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  GitPullRequest,
  Plus,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

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
  topItemsByLinesChanged: DashboardTopItem[];
  completedOverTime: { month: string; doneCount: number }[];
  prCycleTime: { averageDays: number | null; sampleSize: number };
}

const STATUS_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

const linesChartConfig: ChartConfig = {
  linesChanged: { label: 'Linhas alteradas', color: 'var(--color-chart-1)' },
};

const trendChartConfig: ChartConfig = {
  doneCount: { label: 'Tarefas concluídas', color: 'var(--color-chart-3)' },
};

function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${MONTHS[Number(m) - 1] ?? m}/${year.slice(2)}`;
}

// Tela de dashboard: métricas de um documento por vez, escolhido pelo usuário
// (com opção de deixar um documento como favorito para abrir direto nele).
export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    api
      .get<DocumentSummary[]>('/documents')
      .then((res) => {
        setDocuments(res.data);
        const favorite = res.data.find((doc) => doc.favorite);
        setSelectedDocumentId(favorite?.id ?? res.data[0]?.id ?? null);
      })
      .finally(() => setDocumentsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) return;
    setSummaryLoading(true);
    api
      .get<DashboardSummary>('/dashboard/summary', {
        params: {
          documentId: selectedDocumentId,
          periodStart: periodStart || undefined,
          periodEnd: periodEnd || undefined,
        },
      })
      .then((res) => setSummary(res.data))
      .finally(() => setSummaryLoading(false));
  }, [selectedDocumentId, periodStart, periodEnd]);

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

  // Sem `color` aqui de propósito: o nome do status é texto livre (ex: "To
  // Do", vindo do workflow do Jira), e ChartStyle geraria uma custom property
  // CSS inválida com esse valor como parte do nome (`--color-To Do`). A cor
  // de cada fatia vem do `fill` no Cell abaixo; o tooltip/legenda já usa o
  // fill como fallback quando o config não tem `color`.
  const statusChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    (summary?.byStatus ?? []).forEach((entry) => {
      config[entry.status] = { label: entry.status };
    });
    return config;
  }, [summary]);

  const selectedDocument = documents.find((doc) => doc.id === selectedDocumentId) ?? null;
  const hasDateFilter = Boolean(periodStart || periodEnd);
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

        {documents.length > 0 && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Documento</Label>
              <div className="flex items-center gap-1.5">
                <Select value={selectedDocumentId ?? undefined} onValueChange={setSelectedDocumentId}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Selecione um documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!selectedDocumentId || favoriteLoading}
                  onClick={toggleFavorite}
                  aria-label={selectedDocument?.favorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                  aria-pressed={selectedDocument?.favorite ?? false}
                  className={selectedDocument?.favorite ? 'text-amber-500 hover:text-amber-500' : 'text-muted-foreground'}
                >
                  <Star className="h-4 w-4" strokeWidth={1.75} fill={selectedDocument?.favorite ? 'currentColor' : 'none'} />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Início</Label>
              <DatePicker value={periodStart} onChange={setPeriodStart} className="w-40" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Fim</Label>
              <DatePicker value={periodEnd} onChange={setPeriodEnd} className="w-40" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!hasDateFilter}
              className={`text-muted-foreground hover:text-foreground ${hasDateFilter ? '' : 'invisible'}`}
              onClick={() => {
                setPeriodStart('');
                setPeriodEnd('');
              }}
              aria-label="Limpar filtro de período"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>

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
              {hasDateFilter
                ? 'Nenhum item corresponde ao filtro de período selecionado.'
                : 'Este documento ainda não tem tarefas selecionadas.'}
            </p>
          </div>
        </div>
      )}

      {!loading && summary && !empty && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
              label="Tarefas feitas"
              value={`${summary.totals.doneItemsCount} / ${summary.totals.itemsCount}`}
              hint={`${(summary.totals.completionRate * 100).toFixed(0)}% de conclusão`}
            />
            <KpiCard
              icon={<GitPullRequest className="h-4 w-4" strokeWidth={1.75} />}
              label="Linhas alteradas"
              value={summary.totals.totalLinesChanged.toLocaleString('pt-BR')}
              hint={`+${summary.totals.totalAdditions.toLocaleString('pt-BR')} / -${summary.totals.totalDeletions.toLocaleString('pt-BR')}`}
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
                  ? `${summary.prCycleTime.averageDays.toFixed(1)}d`
                  : '—'
              }
              hint={
                summary.prCycleTime.sampleSize > 0
                  ? `${summary.prCycleTime.sampleSize} PRs mergeadas`
                  : 'Sem PRs mergeadas no período'
              }
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartCard title="Tarefas por status">
              {summary.byStatus.length > 0 ? (
                <ChartContainer config={statusChartConfig} className="w-full max-h-80">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                    <Pie
                      data={summary.byStatus}
                      dataKey="itemsCount"
                      nameKey="status"
                      innerRadius={50}
                      outerRadius={75}
                      strokeWidth={2}
                    >
                      {summary.byStatus.map((entry, i) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard title="Tendência de tarefas concluídas">
              {summary.completedOverTime.length > 0 ? (
                <ChartContainer config={trendChartConfig} className="max-h-64 w-full">
                  <LineChart data={summary.completedOverTime}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickFormatter={formatMonth} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatMonth(String(v))} />} />
                    <Line
                      type="monotone"
                      dataKey="doneCount"
                      stroke="var(--color-doneCount)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-doneCount)' }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard title="Top tarefas por linhas alteradas" className="lg:col-span-2">
              {summary.topItemsByLinesChanged.length > 0 ? (
                <ChartContainer config={linesChartConfig} className="max-h-80 w-full">
                  <BarChart
                    data={summary.topItemsByLinesChanged}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="title"
                      tickLine={false}
                      axisLine={false}
                      width={160}
                      tickFormatter={(value: string) => (value.length > 24 ? `${value.slice(0, 24)}…` : value)}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="linesChanged" fill="var(--color-linesChanged)" radius={4} />
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

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-xl font-semibold tracking-tight text-card-foreground">{value}</span>
      {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function ChartCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className ?? ''}`}>
      <h2 className="text-sm font-semibold text-card-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
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
