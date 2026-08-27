import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DeleteDocumentButtonProps {
  documentId: string;
  documentTitle: string;
  variant: 'icon' | 'button';
  onDeleted: () => void;
}

export function DeleteDocumentButton({
  documentId,
  documentTitle,
  variant,
  onDeleted,
}: DeleteDocumentButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/documents/${documentId}`);
      setOpen(false);
      onDeleted();
    } catch (err) {
      setDeleting(false);
      throw err;
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
      <AlertDialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:bg-muted hover:text-destructive active:bg-muted active:text-destructive"
            aria-label="Excluir documento"
          >
            <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </Button>
        ) : (
          <Button type="button" variant="destructive" className="active:bg-destructive/20 dark:active:bg-destructive/30">
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            Excluir documento
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir "{documentTitle}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação é permanente e remove o documento e todos os itens (tarefas e Pull Requests
            vinculados) junto com ele. Não é possível desfazer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deleting} onClick={handleDelete}>
            <Trash2 className={deleting ? 'star-spin h-4 w-4' : 'h-4 w-4'} strokeWidth={1.75} />
            {deleting ? 'Excluindo…' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
