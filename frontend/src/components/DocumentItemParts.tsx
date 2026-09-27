import { GitPullRequest, SquareChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { badgeVariants } from '@/components/ui/badge';

export interface LinkedPullRequest {
  number: number;
  repo: string;
  title: string;
  url: string;
}

export interface DocumentItem {
  id: string;
  sourceType: 'jira' | 'github_pr';
  sourceRef: string;
  sourceTitle: string;
  sourceUrl: string | null;
  pullRequests: LinkedPullRequest[];
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
}

export const STAR_SECTIONS = [
  { key: 'situation', letter: 'S', label: 'Situação', tone: 'bg-chart-1/15 text-chart-1' },
  { key: 'task', letter: 'T', label: 'Tarefa', tone: 'bg-chart-2/15 text-chart-2' },
  { key: 'action', letter: 'A', label: 'Ação', tone: 'bg-chart-3/15 text-chart-3' },
  { key: 'result', letter: 'R', label: 'Resultado', tone: 'bg-chart-4/15 text-chart-4' },
] as const;

export function hasStarContent(item: DocumentItem) {
  return STAR_SECTIONS.some(({ key }) => item[key]?.trim());
}

export function StarLetter({ letter, tone }: { letter: string; tone: string }) {
  return (
    <span
      className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold', tone)}
    >
      {letter}
    </span>
  );
}

export function ItemPosition({ position }: { position: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-medium tabular-nums text-muted-foreground">
      {position}
    </span>
  );
}

export function ItemsSkeleton({ count, className = 'h-56' }: { count: number; className?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('star-pulse rounded-xl border border-border bg-card', className)} />
      ))}
    </div>
  );
}

export function SourceBadges({ item }: { item: DocumentItem }) {
  const linkClass = 'transition-opacity hover:opacity-75';
  const sourceVariant = item.sourceType === 'jira' ? 'jira' : 'github';
  const sourceContent =
    item.sourceType === 'jira' ? (
      <>
        <SquareChevronRight className="h-3 w-3" strokeWidth={2} />
        Jira · {item.sourceRef}
      </>
    ) : (
      <>
        <GitPullRequest className="h-3 w-3" strokeWidth={2} />
        Pull Request · #{item.sourceRef}
      </>
    );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {item.sourceUrl ? (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(badgeVariants({ variant: sourceVariant }), linkClass)}
        >
          {sourceContent}
        </a>
      ) : (
        <span className={badgeVariants({ variant: sourceVariant })}>{sourceContent}</span>
      )}
      {item.pullRequests.map((pr) => (
        <a
          key={pr.url}
          href={pr.url}
          target="_blank"
          rel="noreferrer"
          className={cn(badgeVariants({ variant: 'github' }), linkClass)}
        >
          <GitPullRequest className="h-3 w-3" strokeWidth={2} />
          {pr.repo} · #{pr.number}
        </a>
      ))}
    </div>
  );
}
