import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';

interface JiraTask {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  url: string;
}
interface JiraLinkedPullRequest {
  url: string;
  status: string;
}
interface GithubPullRequest {
  number: number;
  repo: string;
  title: string;
  body: string | null;
  url: string;
}

// Tela 3 do PRD: definir título/período e selecionar tarefas Jira — os PRs
// vinculados a cada tarefa (app "GitHub for Jira") entram automaticamente.
export default function NewDocumentPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const [tasks, setTasks] = useState<JiraTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const [step, setStep] = useState<'period' | 'select' | 'creating'>('period');
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    setSearching(true);
    try {
      const { data } = await api.get<JiraTask[]>('/jira/tasks', { params: { periodStart, periodEnd } });
      setTasks(data);
      setStep('select');
    } finally {
      setSearching(false);
    }
  }

  async function handleCreateDocument() {
    setStep('creating');

    try {
      await createDocument();
    } catch (err) {
      setStep('select');
      throw err;
    }
  }

  async function createDocument() {
    const { data: doc } = await api.post('/documents', { title, periodStart, periodEnd });

    const selected = tasks.filter((t) => selectedTasks.includes(t.key));

    const items = await Promise.all(
      selected.map(async (task) => {
        const { data: linked } = await api.get<JiraLinkedPullRequest[]>(
          `/jira/tasks/${task.id}/pull-requests`,
        );

        const pullRequests = await Promise.all(
          linked.map((pr) =>
            api.get<GithubPullRequest>('/github/pull-requests/lookup', { params: { url: pr.url } }),
          ),
        ).then((results) => results.map((r) => r.data));

        const description = [
          task.description,
          pullRequests.length > 0 &&
            'Pull Requests relacionados:\n' +
              pullRequests
                .map((pr) => `- ${pr.repo} #${pr.number} — ${pr.title}\n${pr.body ?? ''}`)
                .join('\n\n'),
        ]
          .filter(Boolean)
          .join('\n\n');

        return {
          sourceType: 'jira' as const,
          sourceRef: task.key,
          sourceTitle: task.summary,
          sourceUrl: task.url,
          rawSnapshot: {
            description,
            pullRequests: pullRequests.map((pr) => ({
              number: pr.number,
              repo: pr.repo,
              title: pr.title,
              url: pr.url,
            })),
          },
        };
      }),
    );

    await api.post(`/documents/${doc.id}/items`, { items });

    navigate(`/documents/${doc.id}/review`);
  }

  function toggleTask(key: string, checked: boolean) {
    setSelectedTasks((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  }

  const allTasksSelected = tasks.length > 0 && selectedTasks.length === tasks.length;

  const canSearch = Boolean(title && periodStart && periodEnd);

  return (
    <div className={`mx-auto px-8 py-10 ${step === 'period' ? 'max-w-2xl' : 'max-w-4xl'}`}>
      <header className="flex flex-col gap-1.5">
        <Link to="/" className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-[13px] w-[13px]" strokeWidth={1.75} />
          Documentos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Novo documento</h1>
        {step === 'period' && (
          <p className="text-sm text-muted-foreground">Defina o título e o período da avaliação.</p>
        )}
      </header>

      {step === 'period' && (
        <>
          <div className="mt-7 flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-1.5">
              <Label>Título</Label>
              <Input
                placeholder="Avaliação Q3 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Início do período</Label>
                <DatePicker value={periodStart} onChange={setPeriodStart} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fim do período</Label>
                <DatePicker value={periodEnd} onChange={setPeriodEnd} />
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="text-xs text-muted-foreground">Preencha os três campos para continuar.</span>
            <Button onClick={handleSearch} disabled={!canSearch || searching}>
              <Search className={searching ? 'star-spin h-4 w-4' : 'h-4 w-4'} strokeWidth={1.75} />
              {searching ? 'Buscando tarefas…' : 'Buscar tarefas do Jira'}
            </Button>
          </div>
        </>
      )}

      {(step === 'select' || step === 'creating') && (
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep('period')}
            className="mt-6 h-auto w-full flex-wrap justify-start gap-3 rounded-lg border border-border bg-muted/60 px-4 py-3 text-left font-normal"
          >
            <span className="text-sm font-medium">{title}</span>
            <span className="text-xs text-muted-foreground">
              {formatDateShort(periodStart)} – {formatDateShort(periodEnd)}
            </span>
            <span className="ml-auto text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
              Editar
            </span>
          </Button>

          <section className="mt-7">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Tarefas do Jira</h2>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setSelectedTasks(allTasksSelected ? [] : tasks.map((t) => t.key))}
              >
                {allTasksSelected ? 'Limpar seleção' : 'Selecionar todas'}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Os Pull Requests já vinculados a cada tarefa no Jira entram automaticamente no documento.
            </p>
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {tasks.map((task) => (
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
                  <span className="text-[13px] text-card-foreground">{task.summary}</span>
                </Label>
              ))}
            </div>
          </section>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-5">
            <span className="text-xs text-muted-foreground">{selectedTasks.length} tarefas selecionadas</span>
            <Button onClick={handleCreateDocument} disabled={step === 'creating' || selectedTasks.length === 0}>
              <Sparkles className={step === 'creating' ? 'star-spin h-4 w-4' : 'h-4 w-4'} strokeWidth={1.75} />
              {step === 'creating' ? 'Buscando PRs vinculados…' : 'Gerar documento STAR'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
