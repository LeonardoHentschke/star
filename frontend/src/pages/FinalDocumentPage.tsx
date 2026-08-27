import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download, GitPullRequest, Pencil, SquareChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDateShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { DeleteDocumentButton } from '@/components/DeleteDocumentButton';

interface LinkedPullRequest {
  number: number;
  repo: string;
  title: string;
  url: string;
}
interface DocumentItem {
  id: string;
  sourceType: 'jira' | 'github_pr';
  sourceRef: string;
  sourceTitle: string;
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
}

// Tela 5 do PRD: visualização consolidada + export PDF (RF11)
export default function FinalDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);

  useEffect(() => {
    api.get<DocumentDetail>(`/documents/${id}`).then((res) => setDoc(res.data));
  }, [id]);

  async function handleExportPdf() {
    const res = await api.get(`/documents/${id}/export/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc?.title ?? 'documento'}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!doc) return <p className="mx-auto max-w-3xl px-10 py-10 text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <header className="flex flex-col gap-3 border-b border-border pb-7">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{doc.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
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
            <DeleteDocumentButton
              variant="icon"
              documentId={doc.id}
              documentTitle={doc.title}
              onDeleted={() => navigate('/')}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Período avaliado: {formatDateShort(doc.periodStart)} – {formatDateShort(doc.periodEnd)}
        </p>
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
        <ol className="mt-5 flex flex-col gap-8">
          {doc.items.map((item, i) => (
            <li key={item.id} className="flex gap-4">
              <span className="mt-0.5 shrink-0 font-mono text-sm text-muted-foreground">{i + 1}.</span>
              <div className="flex flex-col gap-3">
                <h3 className="text-base font-semibold leading-snug">{item.sourceTitle}</h3>
                <p className="text-[14px] leading-[1.7] text-foreground">
                  <span className="font-semibold">Situação.</span> {item.situation}
                </p>
                <p className="text-[14px] leading-[1.7] text-foreground">
                  <span className="font-semibold">Tarefa.</span> {item.task}
                </p>
                <p className="text-[14px] leading-[1.7] text-foreground">
                  <span className="font-semibold">Ação.</span> {item.action}
                </p>
                <p className="text-[14px] leading-[1.7] text-foreground">
                  <span className="font-semibold">Resultado.</span> {item.result}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {item.sourceType === 'jira' ? (
                    <Badge variant="jira">
                      <SquareChevronRight className="h-3 w-3" strokeWidth={2} />
                      Jira · {item.sourceRef}
                    </Badge>
                  ) : (
                    <Badge variant="github">
                      <GitPullRequest className="h-3 w-3" strokeWidth={2} />
                      Pull Request · #{item.sourceRef}
                    </Badge>
                  )}
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
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
