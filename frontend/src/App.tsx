import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Moon, Star, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentJobProvider } from '@/lib/document-job-context';
import ConnectionsPage from './pages/ConnectionsPage';
import DocumentsListPage from './pages/DocumentsListPage';
import NewDocumentPage from './pages/NewDocumentPage';
import AddDocumentTasksPage from './pages/AddDocumentTasksPage';
import ReviewDocumentPage from './pages/ReviewDocumentPage';
import FinalDocumentPage from './pages/FinalDocumentPage';
import DashboardPage from './pages/DashboardPage';
import HowItWorksPage from './pages/HowItWorksPage';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('star-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('star-theme', theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <BrowserRouter>
      <DocumentJobProvider>
        <div className="min-h-screen bg-background font-sans text-foreground">
          <Toaster theme={theme} position="bottom-right" richColors />
          <nav className="flex items-center justify-between border-b border-border px-6 py-3">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                <Star className="h-4 w-4" strokeWidth={2.25} />
                Star
              </span>
              <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Dashboard
              </Link>
              <Link
                to="/documents"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Documentos
              </Link>
              <Link
                to="/connections"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Conexões
              </Link>
              <Link
                to="/how-it-works"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Como funciona
              </Link>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Alternar tema"
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </nav>
          <main>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/documents" element={<DocumentsListPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/documents/new" element={<NewDocumentPage />} />
              <Route path="/documents/:id/add-tasks" element={<AddDocumentTasksPage />} />
              <Route path="/documents/:id/review" element={<ReviewDocumentPage />} />
              <Route path="/documents/:id" element={<FinalDocumentPage />} />
            </Routes>
          </main>
        </div>
      </DocumentJobProvider>
    </BrowserRouter>
  );
}
