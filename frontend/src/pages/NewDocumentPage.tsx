import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useTrackDocumentJob } from '@/lib/document-job-context';
import {
  JiraTaskSelector,
  jiraTasksToDocumentItems,
  type JiraTask,
  type SelectedPeriod,
} from '@/components/JiraTaskSelector';

export default function NewDocumentPage() {
  const navigate = useNavigate();
  const trackJob = useTrackDocumentJob();
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreateDocument(tasks: JiraTask[], period: SelectedPeriod) {
    setCreating(true);
    try {
      const { data: doc } = await api.post('/documents', { title, ...period });
      await api.post(`/documents/${doc.id}/items`, { items: jiraTasksToDocumentItems(tasks) });
      trackJob(doc.id);
      navigate(`/documents/${doc.id}/review`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="flex flex-col gap-1.5">
        <Link to="/documents" className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-[13px] w-[13px]" strokeWidth={1.75} />
          Documentos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Novo documento</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o período, selecione as tarefas do Jira e gere o documento STAR com IA.
        </p>
      </header>

      <div className="mt-7">
        <JiraTaskSelector
          title={{ value: title, onChange: setTitle }}
          finalStepLabel="Gerar"
          submitLabel="Gerar documento STAR"
          submittingLabel="Criando documento…"
          submitting={creating}
          onSubmit={handleCreateDocument}
        />
      </div>
    </div>
  );
}
