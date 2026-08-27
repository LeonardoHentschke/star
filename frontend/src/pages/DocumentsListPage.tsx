import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, FileText, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DeleteDocumentButton } from '@/components/DeleteDocumentButton';

interface DocumentSummary {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  jobStatus: 'idle' | 'processing' | 'failed';
}

// Tela 2 do PRD: lista de documentos criados (RF10)
export default function DocumentsListPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DocumentSummary[]>('/documents')
      .then((res) => setDocuments(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Carregando seus documentos…'
              : 'Avaliações de desempenho geradas a partir do Jira e do GitHub.'}
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
              className="star-pulse flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5"
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
        <div className="mt-8 flex flex-col gap-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3.5 transition-colors has-[a:hover]:bg-accent"
            >
              <Link
                to={doc.jobStatus === 'idle' ? `/documents/${doc.id}` : `/documents/${doc.id}/review`}
                className="group flex min-w-0 flex-1 items-center justify-between gap-4"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-card-foreground">{doc.title}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-[13px] w-[13px]" strokeWidth={1.75} />
                    {formatDateShort(doc.periodStart)} – {formatDateShort(doc.periodEnd)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">Criado em {formatDateShort(doc.createdAt)}</span>
                  <ChevronRight
                    className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    size={16}
                    strokeWidth={1.75}
                  />
                </div>
              </Link>
              <DeleteDocumentButton
                variant="icon"
                documentId={doc.id}
                documentTitle={doc.title}
                onDeleted={() => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
