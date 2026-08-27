import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, SquareChevronRight, GitPullRequest, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ConnectionStatus {
  ok: boolean;
  message: string;
}

// Tela 1 do PRD: status de conexão com Jira e GitHub (RF02)
export default function ConnectionsPage() {
  const [jira, setJira] = useState<ConnectionStatus | null>(null);
  const [github, setGithub] = useState<ConnectionStatus | null>(null);
  const [ai, setAi] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [, forceTick] = useState(0);

  const runCheck = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<ConnectionStatus>('/jira/test-connection'),
      api.get<ConnectionStatus>('/github/test-connection'),
      api.get<ConnectionStatus>('/ai/test-connection'),
    ])
      .then(([jiraRes, githubRes, aiRes]) => {
        setJira(jiraRes.data);
        setGithub(githubRes.data);
        setAi(aiRes.data);
        setLastChecked(new Date());
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Conexões</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Testando as credenciais do .env…' : 'Os tokens de acesso são lidos do arquivo .env do projeto.'}
        </p>
      </header>

      <div className="mt-7 flex flex-col gap-2">
        <ConnectionRow
          name="Jira Cloud"
          envKeys="JIRA_API_TOKEN · JIRA_BASE_URL"
          icon={<SquareChevronRight className="h-4 w-4" strokeWidth={1.75} />}
          iconColor="border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-400"
          status={jira}
          testing={loading}
        />
        <ConnectionRow
          name="GitHub"
          envKeys="GITHUB_TOKEN"
          icon={<GitPullRequest className="h-4 w-4" strokeWidth={1.75} />}
          iconColor="border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-400"
          status={github}
          testing={loading}
        />
        <ConnectionRow
          name="Gemini (IA)"
          envKeys="GEMINI_API_KEY · GEMINI_MODEL"
          icon={<Sparkles className="h-4 w-4" strokeWidth={1.75} />}
          iconColor="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          status={ai}
          testing={loading}
        />
      </div>

      {!loading && lastChecked && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="text-xs text-muted-foreground">
            Última verificação {formatRelativeTime(lastChecked)}
          </span>
          <Button variant="outline" onClick={runCheck}>
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            Testar novamente
          </Button>
        </div>
      )}
    </div>
  );
}

function ConnectionRow({
  name,
  envKeys,
  icon,
  iconColor,
  status,
  testing,
}: {
  name: string;
  envKeys: string;
  icon: React.ReactNode;
  iconColor: string;
  status: ConnectionStatus | null;
  testing: boolean;
}) {
  const failed = !testing && status !== null && !status.ok;

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border px-4 py-4 ${failed ? 'border-red-500/30 bg-card' : 'border-border bg-card'}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-md border ${iconColor}`}>{icon}</span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-card-foreground">{name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{envKeys}</span>
          </div>
        </div>

        {testing && (
          <span className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <RefreshCw className="star-spin h-[13px] w-[13px]" strokeWidth={1.75} />
            Testando…
          </span>
        )}
        {!testing && status?.ok && (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" strokeWidth={2.25} />
            Conectado
          </Badge>
        )}
        {failed && (
          <Badge variant="danger">
            <AlertTriangle className="h-3 w-3" strokeWidth={2} />
            Falha na conexão
          </Badge>
        )}
      </div>

      {failed && (
        <p className="border-t border-border pt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {status?.message ?? 'Sem resposta'}
        </p>
      )}
    </div>
  );
}
