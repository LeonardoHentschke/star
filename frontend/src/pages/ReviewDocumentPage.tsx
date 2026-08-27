import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  FileText,
  GitPullRequest,
  Loader2,
  Sparkles,
  SquareChevronRight,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDateShort } from '@/lib/utils';
import { useDocumentJob } from '@/lib/document-job-context';
import { Button } from '@/components/ui/button';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DeleteDocumentButton } from '@/components/DeleteDocumentButton';

interface LinkedPullRequest {
  number: number;
  repo: string;
  title: string;
  url: string;
}
interface DocumentItem {
  id: string;
  sourceTitle: string;
  sourceType: 'jira' | 'github_pr';
  pullRequests: LinkedPullRequest[];
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
}
interface DocumentDetail {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  executiveSummary: string | null;
  items: DocumentItem[];
  jobStatus: 'idle' | 'processing' | 'failed';
  jobType: 'add_items' | 'generate' | null;
  jobError: string | null;
  jobProgress: { done: number; total: number } | null;
}

const STAR_FIELDS = [
  { key: 'situation', label: 'Situação' },
  { key: 'task', label: 'Tarefa' },
  { key: 'action', label: 'Ação' },
  { key: 'result', label: 'Resultado' },
] as const;

const JOB_TYPE_LABEL = {
  add_items: 'Adicionando tarefas selecionadas…',
  generate: 'Gerando com IA…',
};

// Tela 4 do PRD: revisar/editar o STAR gerado por item (RF08, RF09, RF12)
export default function ReviewDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const { job, trackJob } = useDocumentJob(id);
  const wasProcessingRef = useRef(false);

  async function load() {
    const { data } = await api.get<DocumentDetail>(`/documents/${id}`);
    setDoc(data);
    if (data.jobStatus === 'processing') trackJob();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // O progresso "ao vivo" vem do contexto global (que já está fazendo polling);
  // recarrega o documento só quando o job sai de "processing" (pra pegar os
  // itens/STAR recém-gerados). Antes do primeiro tick do contexto, usa o que
  // já veio no load() inicial pra não piscar o banner.
  useEffect(() => {
    if (job?.status === 'processing') wasProcessingRef.current = true;
    else if (wasProcessingRef.current) {
      wasProcessingRef.current = false;
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  async function handleGenerate() {
    await api.post(`/documents/${id}/generate`, { regenerateSummary: true });
    trackJob();
  }

  // "Tentar novamente" depois de uma falha: continua de onde parou (nada do
  // que já foi processado é perdido nem reprocessado) — diferente do botão
  // "Regerar com IA", que força tudo de novo.
  async function handleResume() {
    const path = jobType === 'generate' ? `/documents/${id}/generate/resume` : `/documents/${id}/items/resume`;
    try {
      await api.post(path);
      trackJob();
    } catch (err) {
      const message = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : null;
      toast.error(message ?? 'Não foi possível retomar o processamento.');
    }
  }

  async function handleMove(itemId: string, direction: 'up' | 'down') {
    if (!doc) return;
    const index = doc.items.findIndex((it) => it.id === itemId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= doc.items.length) return;

    const reordered = [...doc.items];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setDoc((prev) => (prev ? { ...prev, items: reordered } : prev));
    await api.patch(`/documents/${id}/items/reorder`, { itemIds: reordered.map((it) => it.id) });
  }

  async function handleItemChange(itemId: string, field: keyof DocumentItem, value: string) {
    setDoc((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)),
          }
        : prev,
    );
    await api.patch(`/documents/${id}/items/${itemId}`, { [field]: value });
  }

  if (!doc) return <p className="mx-auto max-w-4xl px-8 py-10 text-sm text-muted-foreground">Carregando...</p>;

  const jobActive = job ? job.status === 'processing' : doc.jobStatus === 'processing';
  const jobFailed = job ? job.status === 'failed' : doc.jobStatus === 'failed';
  const jobType = job?.type ?? doc.jobType;
  const jobProgress = job?.progress ?? doc.jobProgress;
  const jobErrorMessage = job?.error ?? doc.jobError;

  const generating = jobActive && jobType === 'generate';
  const addingItems = jobActive && jobType === 'add_items';
  const hasGeneratedContent = doc.items.some((it) => it.situation);
  const hideItemsSection = addingItems && doc.items.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-border pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateShort(doc.periodStart)} – {formatDateShort(doc.periodEnd)} · {doc.items.length} itens
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={jobActive || doc.items.length === 0}>
            <Sparkles className={generating ? 'star-spin h-4 w-4' : 'h-4 w-4'} strokeWidth={1.75} />
            {generating ? 'Gerando…' : hasGeneratedContent ? 'Regerar com IA' : 'Gerar com IA'}
          </Button>
          {hasGeneratedContent && (
            <Button onClick={() => navigate(`/documents/${doc.id}`)}>
              <FileText className="h-4 w-4" strokeWidth={1.75} />
              Ver documento final
            </Button>
          )}
          <DeleteDocumentButton
            variant="icon"
            documentId={doc.id}
            documentTitle={doc.title}
            onDeleted={() => navigate('/')}
          />
          <Button variant="ghost" size="icon-sm" asChild aria-label="Fechar">
            <Link to="/">
              <X className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </Button>
        </div>
      </header>

      {jobActive && jobType && (
        <div className="mt-6 flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-card-foreground">
            <Loader2 className="star-spin h-4 w-4" strokeWidth={1.75} />
            {JOB_TYPE_LABEL[jobType]}
            {jobProgress && (
              <span className="ml-auto text-xs text-muted-foreground">
                {jobProgress.done} / {jobProgress.total}
              </span>
            )}
          </div>
          {jobProgress && jobProgress.total > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (jobProgress.done / jobProgress.total) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {jobFailed && (
        <div className="mt-6 flex flex-col gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            {jobType === 'generate' ? 'Falha ao gerar com IA' : 'Falha ao adicionar tarefas'}
          </div>
          <p className="text-destructive/90">{jobErrorMessage ?? 'Erro desconhecido.'}</p>
          {jobProgress && (
            <p className="text-xs text-destructive/75">
              {jobProgress.done} de {jobProgress.total} {jobType === 'generate' ? 'itens gerados' : 'itens adicionados'}{' '}
              antes da falha.
            </p>
          )}
          <Button size="sm" variant="outline" className="mt-1 w-fit" onClick={handleResume}>
            Tentar novamente
          </Button>
        </div>
      )}

      {doc.executiveSummary && (
        <section className="mt-7 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-card-foreground">Resumo executivo</h2>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3" strokeWidth={1.75} />
              Gerado por IA · editável
            </span>
          </div>
          <Textarea
            rows={6}
            className="mt-3"
            value={doc.executiveSummary}
            onChange={(e) => setDoc((prev) => (prev ? { ...prev, executiveSummary: e.target.value } : prev))}
          />
        </section>
      )}

      {!hideItemsSection && (
        <>
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Itens do período</h2>
            <span className="text-xs text-muted-foreground">{doc.items.length} itens</span>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {doc.items.map((item, index) => (
              <article key={item.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-sm font-medium text-card-foreground">{item.sourceTitle}</h3>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Mover para cima"
                      disabled={index === 0}
                      onClick={() => handleMove(item.id, 'up')}
                    >
                      <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Mover para baixo"
                      disabled={index === doc.items.length - 1}
                      onClick={() => handleMove(item.id, 'down')}
                    >
                      <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
                    </Button>
                    {item.sourceType === 'jira' ? (
                      <Badge variant="jira">
                        <SquareChevronRight className="h-3 w-3" strokeWidth={2} />
                        Jira
                      </Badge>
                    ) : (
                      <Badge variant="github">
                        <GitPullRequest className="h-3 w-3" strokeWidth={2} />
                        Pull Request
                      </Badge>
                    )}
                  </div>
                </div>
                {item.pullRequests.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.pullRequests.map((pr) => (
                      <a
                        key={pr.url}
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(badgeVariants({ variant: 'github' }), 'transition-opacity hover:opacity-75')}
                      >
                        <GitPullRequest className="h-3 w-3" strokeWidth={2} />
                        {pr.repo} · #{pr.number}
                      </a>
                    ))}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {STAR_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label>{label}</Label>
                      <Textarea
                        rows={5}
                        className="text-[13px]"
                        value={item[key] ?? ''}
                        onChange={(e) => handleItemChange(item.id, key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
