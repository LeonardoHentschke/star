import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Calendar, ChevronRight, FileText, GitPullRequest, ListTree, Loader2, Plus, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDateShort, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDocumentJobs, type DocumentJobState } from '@/lib/document-job-context';
import { DeleteDocumentButton } from '@/components/DeleteDocumentButton';

interface DocumentSummary {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  favorite: boolean;
  itemCount: number;
  generatedCount: number;
  pullRequestCount: number;
  jobStatus: 'idle' | 'processing' | 'failed';
  jobType: 'add_items' | 'generate' | null;
  jobError: string | null;
  jobProgress: { done: number; total: number } | null;
}

const JOB_LABEL = {
  add_items: { processing: 'Adicionando tarefas', failed: 'Falha ao adicionar tarefas' },
  generate: { processing: 'Gerando com IA', failed: 'Falha ao gerar com IA' },
};

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

function DocumentProgressStatus({ doc }: { doc: DocumentSummary }) {
  if (doc.itemCount === 0) return <Badge variant="outline" className="text-muted-foreground">Sem tarefas</Badge>;
  if (doc.generatedCount === 0) return <Badge variant="outline" className="text-muted-foreground">Rascunho</Badge>;
  if (doc.generatedCount < doc.itemCount) return <Badge variant="jira">Em revisão</Badge>;
  return <Badge variant="success">Pronto</Badge>;
}

function DocumentJobStatus({ doc, job }: { doc: DocumentSummary; job: DocumentJobState }) {
  if (job.status === 'idle' || !job.type) return <DocumentProgressStatus doc={doc} />;

  if (job.status === 'failed') {
    return (
      <Badge variant="danger" title={job.error ?? undefined}>
        <AlertTriangle />
        {JOB_LABEL[job.type].failed}
      </Badge>
    );
  }

  return (
    <Badge variant="jira">
      <Loader2 className="star-spin" />
      {JOB_LABEL[job.type].processing}
      {job.progress && job.progress.total > 0 && (
        <span className="tabular-nums opacity-80">
          · {job.progress.done}/{job.progress.total}
        </span>
      )}
    </Badge>
  );
}

export default function DocumentsListPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { jobs, trackJob } = useDocumentJobs();

  useEffect(() => {
    api
      .get<DocumentSummary[]>('/documents')
      .then((res) => {
        setDocuments(res.data);
        res.data.filter((doc) => doc.jobStatus === 'processing').forEach((doc) => trackJob(doc.id));
      })
      .finally(() => setLoading(false));
  }, [trackJob]);

  function jobFor(doc: DocumentSummary): DocumentJobState {
    return (
      jobs[doc.id] ?? {
        status: doc.jobStatus,
        type: doc.jobType,
        error: doc.jobError,
        progress: doc.jobProgress,
      }
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Carregando seus documentos…'
              : documents.length === 0
                ? 'Avaliações de desempenho geradas a partir do Jira e do GitHub.'
                : `${documents.length} ${documents.length === 1 ? 'avaliação' : 'avaliações'} de desempenho geradas a partir do Jira e do GitHub.`}
          </p>
        </div>
        <Button asChild disabled={loading}>
          <Link to="/documents/new">
            <Plus className="h-4 w-4" />
            Novo documento
          </Link>
        </Button>
      </header>

      {loading && (
        <div className="mt-8 flex flex-col gap-2">
          {[64, 52, 44].map((w) => (
            <div
              key={w}
              className="star-pulse flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4"
            >
              <div className="flex flex-col gap-2">
                <div className="h-3.5 rounded bg-muted" style={{ width: `${w * 4}px` }} />
                <div className="h-3 w-40 rounded bg-muted" />
              </div>
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {!loading && documents.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card px-8 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="flex max-w-sm flex-col gap-1.5">
            <h2 className="text-base font-medium">Nenhum documento por aqui ainda</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Escolha um período e o Star reúne suas tarefas do Jira e seus Pull Requests do GitHub para
              escrever o primeiro rascunho no formato STAR.
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

      {!loading && documents.length > 0 && (
        <div className="mt-8 flex flex-col gap-2.5">
          {documents.map((doc) => {
            const job = jobFor(doc);
            const progress =
              job.status === 'processing' && job.progress && job.progress.total > 0
                ? Math.min(100, (job.progress.done / job.progress.total) * 100)
                : null;
            const generatedPercent = doc.itemCount > 0 ? (doc.generatedCount / doc.itemCount) * 100 : 0;
            return (
              <div
                key={doc.id}
                className="group/card relative flex items-center gap-2 overflow-hidden rounded-xl border border-border bg-card px-4 py-4 transition-colors has-[a:hover]:border-foreground/15 has-[a:hover]:bg-accent/60"
              >
                <Link
                  to={job.status === 'idle' ? `/documents/${doc.id}` : `/documents/${doc.id}/review`}
                  className="group flex min-w-0 flex-1 items-center gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                    <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-card-foreground">{doc.title}</span>
                      {doc.favorite && (
                        <Star
                          className="h-3.5 w-3.5 shrink-0 text-amber-500"
                          strokeWidth={1.75}
                          fill="currentColor"
                          aria-label="Favorito do dashboard"
                        />
                      )}
                      <DocumentJobStatus doc={doc} job={job} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-[13px] w-[13px]" strokeWidth={1.75} />
                        {formatDateShort(doc.periodStart)} – {formatDateShort(doc.periodEnd)}
                      </span>
                      <span className="flex items-center gap-1.5 tabular-nums">
                        <ListTree className="h-[13px] w-[13px]" strokeWidth={1.75} />
                        {formatCount(doc.itemCount)} {doc.itemCount === 1 ? 'tarefa' : 'tarefas'}
                      </span>
                      <span className="flex items-center gap-1.5 tabular-nums">
                        <GitPullRequest className="h-[13px] w-[13px]" strokeWidth={1.75} />
                        {formatCount(doc.pullRequestCount)} {doc.pullRequestCount === 1 ? 'PR' : 'PRs'}
                      </span>
                    </div>
                  </div>
                  <div className="hidden w-32 shrink-0 flex-col gap-1.5 md:flex">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Geradas</span>
                      <span className="tabular-nums text-card-foreground">
                        {formatCount(doc.generatedCount)}/{formatCount(doc.itemCount)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          generatedPercent === 100 ? 'bg-emerald-500' : 'bg-primary',
                        )}
                        style={{ width: `${generatedPercent}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className="hidden w-36 shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground sm:block"
                    title={`Criado em ${formatDateShort(doc.createdAt)}`}
                  >
                    Criado {formatRelativeTime(new Date(doc.createdAt))}
                  </span>
                  <ChevronRight
                    className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    size={16}
                    strokeWidth={1.75}
                  />
                </Link>
                <div className="opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100">
                  <DeleteDocumentButton
                    variant="icon"
                    documentId={doc.id}
                    documentTitle={doc.title}
                    onDeleted={() => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
                  />
                </div>
                {progress !== null && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
