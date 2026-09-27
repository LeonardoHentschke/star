import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export type DocumentJobStatus = 'idle' | 'processing' | 'failed';
export type DocumentJobType = 'add_items' | 'generate';

export interface DocumentJobState {
  status: DocumentJobStatus;
  type: DocumentJobType | null;
  error: string | null;
  progress: { done: number; total: number } | null;
}

interface DocumentJobResponse {
  jobStatus: DocumentJobStatus;
  jobType: DocumentJobType | null;
  jobError: string | null;
  jobProgress: { done: number; total: number } | null;
}

const JOB_TYPE_LABEL: Record<DocumentJobType, string> = {
  add_items: 'Tarefas adicionadas com sucesso',
  generate: 'Conteúdos gerados com IA',
};

const POLL_INTERVAL_MS = 2000;

interface DocumentJobContextValue {
  jobs: Record<string, DocumentJobState>;
  trackJob: (documentId: string) => void;
}

const DocumentJobContext = createContext<DocumentJobContextValue | null>(null);

export function DocumentJobProvider({ children }: { children: ReactNode }) {
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<Record<string, DocumentJobState>>({});
  const trackedIdsRef = useRef(trackedIds);
  trackedIdsRef.current = trackedIds;

  const trackJob = useCallback((documentId: string) => {
    setTrackedIds((prev) => (prev.includes(documentId) ? prev : [...prev, documentId]));
  }, []);

  useEffect(() => {
    if (trackedIds.length === 0) return;

    const interval = setInterval(async () => {
      for (const documentId of trackedIdsRef.current) {
        const { data } = await api.get<DocumentJobResponse>(`/documents/${documentId}`, {
          params: { page: 1, pageSize: 1 },
        });
        const state: DocumentJobState = {
          status: data.jobStatus,
          type: data.jobType,
          error: data.jobError,
          progress: data.jobProgress,
        };
        setJobs((prev) => ({ ...prev, [documentId]: state }));

        if (state.status !== 'processing') {
          setTrackedIds((prev) => prev.filter((id) => id !== documentId));
          const label = state.type ? JOB_TYPE_LABEL[state.type] : 'Processamento';
          if (state.status === 'idle') toast.success(`${label}.`);
          if (state.status === 'failed') toast.error(`${label} falhou: ${state.error ?? 'erro desconhecido.'}`);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [trackedIds.length > 0]);

  return <DocumentJobContext.Provider value={{ jobs, trackJob }}>{children}</DocumentJobContext.Provider>;
}

export function useTrackDocumentJob() {
  const ctx = useContext(DocumentJobContext);
  if (!ctx) throw new Error('useTrackDocumentJob precisa estar dentro de <DocumentJobProvider>');
  return ctx.trackJob;
}

export function useDocumentJobs() {
  const ctx = useContext(DocumentJobContext);
  if (!ctx) throw new Error('useDocumentJobs precisa estar dentro de <DocumentJobProvider>');
  return ctx;
}

export function useDocumentJob(documentId: string | undefined) {
  const ctx = useContext(DocumentJobContext);
  if (!ctx) throw new Error('useDocumentJob precisa estar dentro de <DocumentJobProvider>');

  const job = documentId ? (ctx.jobs[documentId] ?? null) : null;
  const trackDocumentJob = ctx.trackJob;
  const trackJob = useCallback(() => {
    if (documentId) trackDocumentJob(documentId);
  }, [trackDocumentJob, documentId]);

  return { job, trackJob };
}
