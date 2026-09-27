import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { useDocumentJob } from '@/lib/document-job-context';
import {
  JiraTaskSelector,
  jiraTasksToDocumentItems,
  type JiraTask,
} from '@/components/JiraTaskSelector';

interface DocumentHeader {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  totalItems: number;
}

export default function AddDocumentTasksPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trackJob } = useDocumentJob(id);
  const [doc, setDoc] = useState<DocumentHeader | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<DocumentHeader>(`/documents/${id}`, { params: { page: 1, pageSize: 1 } })
      .then(({ data }) => setDoc(data));
  }, [id]);

  async function handleSubmit(tasks: JiraTask[]) {
    if (!id) return;
    setSubmitting(true);
    try {
      await api.post(`/documents/${id}/items`, { items: jiraTasksToDocumentItems(tasks) });
      trackJob();
      navigate(`/documents/${id}/review`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="flex flex-col gap-2">
          <div className="star-pulse h-3 w-32 rounded bg-muted" />
          <div className="star-pulse h-8 w-64 rounded-lg bg-muted" />
          <div className="star-pulse h-4 w-96 rounded bg-muted" />
        </div>
        <div className="star-pulse mt-7 h-80 rounded-xl border border-border bg-card" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="flex flex-col gap-1.5">
        <Link
          to={`/documents/${doc.id}`}
          className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-[13px] w-[13px]" strokeWidth={1.75} />
          {doc.title}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Adicionar tarefas</h1>
        <p className="text-sm text-muted-foreground">
          As tarefas selecionadas serão adicionadas a “{doc.title}” ({formatDateShort(doc.periodStart)} –{' '}
          {formatDateShort(doc.periodEnd)} · {doc.totalItems} itens atuais).
        </p>
      </header>

      <div className="mt-7">
        <JiraTaskSelector
          initialPeriodStart={doc.periodStart}
          initialPeriodEnd={doc.periodEnd}
          finalStepLabel="Adicionar"
          submitLabel="Adicionar ao documento"
          submittingLabel="Adicionando…"
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
