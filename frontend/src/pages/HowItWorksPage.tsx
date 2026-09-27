import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarRange,
  FileDown,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  PencilLine,
  PlugZap,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STAR_SECTIONS, StarLetter } from '@/components/DocumentItemParts';

const STAR_DESCRIPTIONS: Record<(typeof STAR_SECTIONS)[number]['key'], string> = {
  situation: 'O contexto: qual era o cenário ou o problema que existia.',
  task: 'O que era esperado de você naquela situação.',
  action: 'O que você fez, na prática, para resolver.',
  result: 'O impacto alcançado — o que mudou depois do seu trabalho.',
};

const STEPS: { icon: ReactNode; title: string; description: ReactNode }[] = [
  {
    icon: <PlugZap className="h-4 w-4" strokeWidth={1.75} />,
    title: 'Confira as conexões',
    description: (
      <>
        Na aba{' '}
        <Link to="/connections" className="font-medium text-foreground underline-offset-4 hover:underline">
          Conexões
        </Link>
        , veja se Jira, GitHub e IA estão prontos. Se todos estiverem verdes, está tudo certo para começar.
      </>
    ),
  },
  {
    icon: <CalendarRange className="h-4 w-4" strokeWidth={1.75} />,
    title: 'Escolha o período',
    description:
      'Dê um nome ao documento e escolha as datas que a avaliação cobre — há atalhos prontos como trimestre e semestre. Se quiser, filtre por status, prioridade ou tipo de tarefa.',
  },
  {
    icon: <ListChecks className="h-4 w-4" strokeWidth={1.75} />,
    title: 'Selecione as tarefas',
    description:
      'Marque as tarefas do Jira que você quer destacar. Os Pull Requests ligados a cada uma entram automaticamente, sem precisar procurar.',
  },
  {
    icon: <Sparkles className="h-4 w-4" strokeWidth={1.75} />,
    title: 'A IA escreve por você',
    description:
      'Para cada tarefa é criado um texto no formato STAR, em primeira pessoa. Depois, as tarefas são ordenadas da mais para a menos impactante e é escrito um resumo executivo que abre o documento. Tudo acontece em segundo plano — você pode continuar usando o app enquanto isso.',
  },
  {
    icon: <PencilLine className="h-4 w-4" strokeWidth={1.75} />,
    title: 'Revise e ajuste',
    description:
      'Edite qualquer texto do seu jeito, peça para a IA reescrever um item ou o documento inteiro, mude a ordem das tarefas e adicione outras depois, se lembrar de algo.',
  },
  {
    icon: <FileDown className="h-4 w-4" strokeWidth={1.75} />,
    title: 'Exporte',
    description: 'Veja a versão final, pronta para ler, e baixe em PDF para levar para a sua reunião de avaliação.',
  },
];

const TIPS = [
  'Os textos ficam melhores quando a tarefa no Jira tem uma boa descrição — a IA só sabe o que está escrito lá.',
  'Sempre leia o documento antes de exportar. A IA ajuda muito, mas pode errar ou exagerar.',
  'Tudo o que você cria fica salvo apenas no seu computador.',
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Como funciona</h1>
        <p className="text-sm text-muted-foreground">Um guia rápido para montar seu documento de avaliação.</p>
      </header>

      <section className="mt-7 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-medium text-card-foreground">O que é o Star</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Na hora da avaliação de desempenho, é difícil lembrar de tudo o que você fez nos últimos meses. O Star
          olha para as suas tarefas do Jira e para os Pull Requests ligados a elas e transforma esse histórico em um
          documento organizado, escrito com a ajuda de IA, pronto para você revisar e apresentar.
        </p>
      </section>

      <SectionTitle>O método STAR</SectionTitle>
      <p className="-mt-1 mb-4 text-sm leading-relaxed text-muted-foreground">
        Cada tarefa do documento é contada em quatro partes. Esse formato deixa claro não só o que você fez, mas
        por que aquilo importou.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAR_SECTIONS.map(({ key, letter, label, tone }) => (
          <div key={key} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <StarLetter letter={letter} tone={tone} />
              <span className="text-sm font-medium text-card-foreground">{label}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{STAR_DESCRIPTIONS[key]}</p>
          </div>
        ))}
      </div>

      <SectionTitle>Passo a passo</SectionTitle>
      <ol className="flex flex-col gap-2">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4 rounded-xl border border-border bg-card p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                <span className="text-muted-foreground">{step.icon}</span>
                {step.title}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <SectionTitle>Dashboard</SectionTitle>
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
          <LayoutDashboard className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          Seus números em um só lugar
        </div>
        <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            O dashboard mostra os números de um documento por vez: quantas tarefas foram feitas, quantas linhas de
            código você alterou, qual foi a sua maior tarefa, quanto tempo seus Pull Requests levam para serem
            aprovados e gráficos por status, tipo de tarefa e mês.
          </p>
          <p>
            Marque um documento com a estrela de favorito para que ele seja o primeiro a aparecer quando você abrir o
            dashboard. Você também pode filtrar por período, status e tipo de tarefa.
          </p>
          <p>
            Uma tarefa só conta como <span className="font-medium text-foreground">feita</span> quando está concluída
            no Jira e todos os Pull Requests ligados a ela já foram aceitos.
          </p>
        </div>
      </section>

      <SectionTitle>Dicas</SectionTitle>
      <ul className="flex flex-col gap-2">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.75} />
            {tip}
          </li>
        ))}
      </ul>

      <div className="mt-10 flex justify-center">
        <Button asChild>
          <Link to="/documents/new">
            Criar um documento
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 mt-10 text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</h2>
  );
}
