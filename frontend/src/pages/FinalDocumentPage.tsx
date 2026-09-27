import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Download, ListPlus, Pencil, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { useDocumentJob } from '@/lib/document-job-context';

interface DocumentDetail {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  executiveSummary: string | null;
  items: DocumentItem[];
  jobStatus: 'idle' | 'processing' | 'failed';
  totalItems: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function DeliveryCard({ item, position, documentId }: { item: DocumentItem; position: number; documentId: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <ItemPosition position={position} />
        <div className="flex min-w-0 flex-col gap-2 pt-0.5">
          <h3 className="text-[15px] font-semibold leading-snug text-card-foreground">{item.sourceTitle}</h3>
          <SourceBadges item={item} />
        </div>
      </div>

      {hasStarContent(item) ? (
        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-border pt-5 md:grid-cols-2">
          {STAR_SECTIONS.map(({ key, letter, label, tone }) => (
            <div key={key} className="flex gap-3">
              <StarLetter letter={letter} tone={tone} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {label}
                </span>
                {item[key]?.trim() ? (
                  <p className="text-[14px] leading-[1.7] text-card-foreground">{item[key]}</p>
                ) : (
                  <p className="text-[14px] text-muted-foreground">—</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            Conteúdo STAR ainda não gerado
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/documents/${documentId}/review`}>Gerar na revisão</Link>
          </Button>
        </div>
      )}
    </article>
  );
}

export default function FinalDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const { job } = useDocumentJob(id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<DocumentDetail>(`/documents/${id}`, { params: { page, pageSize } })
      .then((res) => {
        if (!cancelled) setDoc(res.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, page, pageSize]);

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    window.scrollTo({ top: 0 });
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  async function handleExportPdf() {
    const res = await api.get(`/documents/${id}/export/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc?.title ?? 'documento'}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="flex flex-col gap-3 border-b border-border pb-7">
          <div className="star-pulse h-8 w-72 rounded-lg bg-muted" />
          <div className="star-pulse h-6 w-52 rounded-full bg-muted" />
        </div>
        <div className="mt-9">
          <ItemsSkeleton count={pageSize} />
        </div>
      </div>
    );
  }

  const jobActive = job ? job.status === 'processing' : doc.jobStatus === 'processing';

  const pagination = (
    <ListPagination
      total={doc.totalItems}
      totalLabel="entregas"
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
            <Button variant="outline" asChild>
              <Link to={`/documents/${doc.id}/review`}>
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
                Editar
              </Link>
            </Button>
            <Button onClick={handleExportPdf}>
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Exportar PDF
            </Button>
            <span className="mx-1 h-6 w-px bg-border" aria-hidden />
            <DeleteDocumentButton
              variant="icon"
              documentId={doc.id}
              documentTitle={doc.title}
              onDeleted={() => navigate('/documents')}
            />
            <Button variant="ghost" size="icon-sm" asChild aria-label="Fechar">
              <Link to="/documents">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
        </div>
        <span className="flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
          {formatDateShort(doc.periodStart)} – {formatDateShort(doc.periodEnd)}
        </span>
      </header>

      {doc.executiveSummary && (
        <section className="mt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Resumo executivo
          </h2>
          <p className="mt-3 text-[15px] leading-[1.75] text-foreground">{doc.executiveSummary}</p>
        </section>
      )}

      <section className="mt-9">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Entregas do período
        </h2>

        {doc.totalItems > 0 && <div className="mt-4">{pagination}</div>}

        <div className="mt-5">
          {loading ? (
            <ItemsSkeleton count={Math.min(pageSize, doc.items.length || pageSize)} />
          ) : doc.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-8 py-12 text-center text-sm text-muted-foreground">
              Nenhuma entrega neste documento ainda.
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {doc.items.map((item, i) => (
                <li key={item.id}>
                  <DeliveryCard item={item} position={(doc.page - 1) * doc.pageSize + i + 1} documentId={doc.id} />
                </li>
              ))}
            </ol>
          )}
        </div>

        {doc.totalItems > 0 && <div className="mt-6 border-t border-border pt-5">{pagination}</div>}
      </section>
    </div>
  );
}
