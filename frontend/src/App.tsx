import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Moon, Star, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConnectionsPage from './pages/ConnectionsPage';
import DocumentsListPage from './pages/DocumentsListPage';
import NewDocumentPage from './pages/NewDocumentPage';
import ReviewDocumentPage from './pages/ReviewDocumentPage';
import FinalDocumentPage from './pages/FinalDocumentPage';

// Estrutura de rotas alinhada às 5 telas do PRD (seção 11):
// 1. Conexões  2. Lista de Documentos  3. Novo Documento
// 4. Revisão do Documento  5. Documento Final

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
      <div className="min-h-screen bg-background font-sans text-foreground">
        <nav className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <Star className="h-4 w-4" strokeWidth={2.25} />
              Star
            </span>
            <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Documentos
            </Link>
            <Link
              to="/connections"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Conexões
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
            <Route path="/" element={<DocumentsListPage />} />
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route path="/documents/new" element={<NewDocumentPage />} />
            <Route path="/documents/:id/review" element={<ReviewDocumentPage />} />
            <Route path="/documents/:id" element={<FinalDocumentPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
