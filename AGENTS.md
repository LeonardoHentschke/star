# AGENTS.md

Instruções para agentes de IA (Claude Code, Copilot, Cursor, etc.) trabalharem neste repositório.

## Visão geral

**Star** é uma aplicação pessoal, single-user, sem login, que roda 100% local via
Docker. Ela gera documentos de avaliação de desempenho no formato **STAR**
(Situação, Tarefa, Ação, Resultado) a partir de tarefas do **Jira Cloud** e
**Pull Requests** do **GitHub**, com os textos gerados via **Gemini**.

## Stack

- **Backend**: NestJS 10 + TypeORM 0.3 (MariaDB via `mysql2`) + Zod, em
  arquitetura **DDD** por bounded context.
- **Frontend**: React 18 + Vite 5 + Tailwind CSS 4 + shadcn/ui + react-router-dom
  + recharts.
- **Banco**: MariaDB 11 (container Docker). Schema sincronizado via TypeORM
  `synchronize: true` — não há migrations no MVP.
- **IA**: Gemini API — `backend/src/ai/infrastructure/gemini-ai-generator.ts`.
- **Integrações externas**: Jira Cloud (`backend/src/jira/`) e GitHub
  (`backend/src/github/`).

Sem monorepo tooling (sem workspaces, sem nx/turborepo) — `backend/` e
`frontend/` são dois projetos Node independentes, sem `package.json` na raiz.

## Estrutura de pastas

Ver árvore completa em [README.md](README.md#estrutura-do-projeto). Resumo:

- `backend/src/` — um diretório por bounded context (`documents`, `jira`,
  `github`, `ai`, `dashboard`, `database`, `common`), cada um seguindo o
  padrão de camadas `domain/ application/ infrastructure/ presentation/`
  quando aplicável.
- `frontend/src/pages/` — as telas do MVP (Connections, Dashboard,
  DocumentsList, FinalDocument, NewDocument, ReviewDocument).
- `frontend/src/components/ui/` — componentes shadcn/ui já configurados
  (`components.json`).

## Como rodar

```bash
cp .env.example .env   # preencher tokens: Gemini, Jira, GitHub
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend (API): http://localhost:3000

Os containers montam o código via volume e já fazem hot reload (`start:dev`
no backend, Vite dev server no frontend). **Não é necessário rebuildar as
imagens Docker após edições de código de rotina** — só reconstrua se mudar
`Dockerfile`, dependências (`package.json`) ou `docker-compose.yml`.

## Scripts disponíveis

- Backend (`backend/package.json`): `build`, `start`, `start:dev`, `start:prod`.
- Frontend (`frontend/package.json`): `dev`, `build` (`tsc && vite build`), `preview`.

Não há scripts de `test` nem `lint` configurados em nenhum dos dois projetos
atualmente — não presuma a existência desses comandos.

## Convenções de código

- Backend segue DDD estrito por bounded context: `domain` não deve depender
  de framework, `application` concentra use-cases e ports (interfaces),
  `infrastructure` implementa esses ports (TypeORM, pdfkit, Gemini, etc.),
  `presentation` expõe os controllers HTTP.
- Validação/DTOs no backend usam Zod.
- No frontend, prefira compor a partir dos componentes shadcn/ui já
  existentes em vez de criar componentes de UI do zero.

## Commits

Não adicionar o trailer `Co-Authored-By: Claude` nas mensagens de commit.

## Gaps conhecidos

- Sem testes automatizados no repositório.
- Sem linter/formatter configurado (nenhum `.eslintrc*` ou `.prettierrc*`).
