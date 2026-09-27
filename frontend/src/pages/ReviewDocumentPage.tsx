import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  FileText,
  ListPlus,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { useDocumentJob } from '@/lib/document-job-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DeleteDocumentButton } from '@/components/DeleteDocumentButton';
import { ListPagination } from '@/components/ListPagination';
import {
  ItemPosition,
  ItemsSkeleton,
  STAR_SECTIONS,
  SourceBadges,
  StarLetter,
  hasStarContent,
  type DocumentItem,
} from '@/components/DocumentItemParts';

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
  totalItems: number;
  page: number;
  pageSize: number;
}

type StarField = (typeof STAR_SECTIONS)[number]['key'];

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const JOB_TYPE_LABEL = {
  add_items: 'Adicionando tarefas selecionadas…',
  generate: 'Gerando com IA…',
};

function errorMessage(err: unknown, fallback: string) {
  const message = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : null;
  return message ?? fallback;
}

interface ReviewItemCardProps {
  item: DocumentItem;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  generating: boolean;
  disabled: boolean;
  onGenerate: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onChange: (field: StarField, value: string) => void;
}

function ReviewItemCard({
  item,
  position,
  isFirst,
  isLast,
  generating,
  disabled,
  onGenerate,
  onMove,
  onChange,
}: ReviewItemCardProps) {
  const generated = hasStarContent(item);

  return (
    <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <ItemPosition position={position} />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
          <h3 className="text-[15px] font-semibold leading-snug text-card-foreground">{item.sourceTitle}</h3>
          <SourceBadges item={item} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" onClick={onGenerate} disabled={disabled || generating}>
            {generating ? (
              <Loader2 className="star-spin h-3.5 w-3.5" strokeWidth={1.75} />
            ) : (
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            {generating ? 'Gerando…' : generated ? 'Regerar' : 'Gerar'}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mover para cima"
            disabled={disabled || isFirst}
            onClick={() => onMove('up')}
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mover para baixo"
            disabled={disabled || isLast}
            onClick={() => onMove('down')}
          >
            <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 border-t border-border pt-5 md:grid-cols-2">
        {STAR_SECTIONS.map(({ key, letter, label, tone }) => (
          <div key={key} className="flex flex-col gap-2">
            <Label className="flex items-center gap-2">
              <StarLetter letter={letter} tone={tone} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {label}
              </span>
            </Label>
            <Textarea
              rows={5}
              className="text-[13px]"
              placeholder={generating ? 'Gerando…' : 'Ainda não gerado'}
              disabled={generating}
              value={item[key] ?? ''}
              onChange={(e) => onChange(key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </article>
  );
}

export default function ReviewDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [generatingItemIds, setGeneratingItemIds] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);
  const { job, trackJob } = useDocumentJob(id);
  const wasProcessingRef = useRef(false);
  const requestRef = useRef(0);

  const load = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const requestId = ++requestRef.current;
      if (!options.silent) setLoading(true);
      try {
        const { data } = await api.get<DocumentDetail>(`/documents/${id}`, { params: { page, pageSize } });
        if (requestId !== requestRef.current) return;
        setDoc(data);
        if (data.jobStatus === 'processing') trackJob();
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [id, page, pageSize, trackJob],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (job?.status === 'processing') wasProcessingRef.current = true;
    else if (wasProcessingRef.current) {
      wasProcessingRef.current = false;
      load({ silent: true });
    }
  }, [job?.status]);

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    window.scrollTo({ top: 0 });
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  async function handleGenerate() {
    await api.post(`/documents/${id}/generate`, { regenerateSummary: true });
    trackJob();
  }

  async function handleResume() {
    const path = jobType === 'generate' ? `/documents/${id}/generate/resume` : `/documents/${id}/items/resume`;
    try {
      await api.post(path);
      trackJob();
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível retomar o processamento.'));
    }
  }

  async function handleGenerateItem(itemId: string) {
    setGeneratingItemIds((prev) => new Set(prev).add(itemId));
    try {
      const { data } = await api.post<DocumentItem>(`/documents/${id}/items/${itemId}/generate`);
      setDoc((prev) =>
        prev ? { ...prev, items: prev.items.map((it) => (it.id === itemId ? data : it)) } : prev,
      );
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível gerar este item.'));
    } finally {
      setGeneratingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  async function handleMove(itemId: string, direction: 'up' | 'down') {
    if (!doc) return;
    const index = doc.items.findIndex((it) => it.id === itemId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < doc.items.length) {
      const reordered = [...doc.items];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      setDoc((prev) => (prev ? { ...prev, items: reordered } : prev));
    }

    setMoving(true);
    try {
      await api.patch(`/documents/${id}/items/${itemId}/move`, { direction });
      await load({ silent: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível mover o item.'));
      await load({ silent: true });
    } finally {
      setMoving(false);
    }
  }

  async function handleItemChange(itemId: string, field: StarField, value: string) {
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

  if (!doc) {
    return (
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="flex flex-col gap-3 border-b border-border pb-7">
          <div className="star-pulse h-8 w-72 rounded-lg bg-muted" />
          <div className="star-pulse h-6 w-52 rounded-full bg-muted" />
        </div>
        <div className="mt-9">
          <ItemsSkeleton count={pageSize} className="h-80" />
        </div>
      </div>
    );
  }

  const jobActive = job ? job.status === 'processing' : doc.jobStatus === 'processing';
  const jobFailed = job ? job.status === 'failed' : doc.jobStatus === 'failed';
  const jobType = job?.type ?? doc.jobType;
  const jobProgress = job?.progress ?? doc.jobProgress;
  const jobErrorMessage = job?.error ?? doc.jobError;

  const generating = jobActive && jobType === 'generate';
  const addingItems = jobActive && jobType === 'add_items';
  const hasGeneratedContent = Boolean(doc.executiveSummary) || doc.items.some(hasStarContent);
  const hideItemsSection = addingItems && doc.totalItems === 0;
  const pageOffset = (doc.page - 1) * doc.pageSize;

  const pagination = (
    <ListPagination
      total={doc.totalItems}
      totalLabel="itens"
      page={page}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="flex flex-col gap-3 border-b border-border pb-7">
        <div className="flex items-start justify-between gap-6">
          <h1 className="min-w-0 text-2xl font-semibold tracking-tight">{doc.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(`/documents/${doc.id}/add-tasks`)} disabled={jobActive}>
              <ListPlus className="h-4 w-4" strokeWidth={1.75} />
              Adicionar tarefas
            </Button>
            <Button variant="outline" onClick={handleGenerate} disabled={jobActive || doc.totalItems === 0}>
              <Sparkles className={generating ? 'star-spin h-4 w-4' : 'h-4 w-4'} strokeWidth={1.75} />
              {generating ? 'Gerando…' : hasGeneratedContent ? 'Regerar tudo' : 'Gerar tudo com IA'}
            </Button>
            <Button onClick={() => navigate(`/documents/${doc.id}`)}>
              <FileText className="h-4 w-4" strokeWidth={1.75} />
              Ver documento final
            </Button>
            <span className="mx-1 h-6 w-px bg-border" aria-hidden />
            <DeleteDocumentButton
              variant="icon"
              documentId={doc.id}
              documentTitle={doc.title}
              onDeleted={() => navigate('/documents')}
            />
            <Button variant="ghost" size="icon-sm" asChild aria-label="Fechar">
              <Link to={`/documents/${doc.id}`}>
                <X className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
        </div>
        <span className="flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
          {formatDateShort(doc.periodStart)} – {formatDateShort(doc.periodEnd)} · {doc.totalItems} itens
        </span>
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
        <section className="mt-9">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Itens do período
          </h2>

          {doc.totalItems > 0 && <div className="mt-4">{pagination}</div>}

          <div className="mt-5">
            {loading ? (
              <ItemsSkeleton count={Math.min(pageSize, doc.items.length || pageSize)} className="h-80" />
            ) : doc.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card px-8 py-12 text-center text-sm text-muted-foreground">
                Nenhum item neste documento ainda.
              </div>
            ) : (
              <ol className="flex flex-col gap-3">
                {doc.items.map((item, index) => {
                  const position = pageOffset + index + 1;
                  return (
                    <li key={item.id}>
                      <ReviewItemCard
                        item={item}
                        position={position}
                        isFirst={position === 1}
                        isLast={position === doc.totalItems}
                        generating={generatingItemIds.has(item.id)}
                        disabled={jobActive || moving}
                        onGenerate={() => handleGenerateItem(item.id)}
                        onMove={(direction) => handleMove(item.id, direction)}
                        onChange={(field, value) => handleItemChange(item.id, field, value)}
                      />
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {doc.totalItems > 0 && <div className="mt-6 border-t border-border pt-5">{pagination}</div>}
        </section>
      )}
    </div>
  );
}
