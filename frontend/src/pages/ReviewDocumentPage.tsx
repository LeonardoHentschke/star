import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, FileText, GitPullRequest, Sparkles, SquareChevronRight, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDateShort } from '@/lib/utils';
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
}

const STAR_FIELDS = [
  { key: 'situation', label: 'Situação' },
  { key: 'task', label: 'Tarefa' },
  { key: 'action', label: 'Ação' },
  { key: 'result', label: 'Resultado' },
] as const;

// Tela 4 do PRD: revisar/editar o STAR gerado por item (RF08, RF09, RF12)
export default function ReviewDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    const { data } = await api.get<DocumentDetail>(`/documents/${id}`);
    setDoc(data);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleGenerate() {
    setGenerating(true);
    await api.post(`/documents/${id}/generate`, { regenerateSummary: true });
    await load();
    setGenerating(false);
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

  const hasGeneratedContent = doc.items.some((it) => it.situation);

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
          <Button variant="outline" onClick={handleGenerate} disabled={generating}>
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
    </div>
  );
}
