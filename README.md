# Star

Aplicação pessoal para gerar documentos de avaliação de desempenho no formato
**STAR** (Situação, Tarefa, Ação, Resultado), a partir das suas tarefas do
**Jira Cloud** e **Pull Requests** no **GitHub**.

Uso pessoal, single-user, sem login, roda 100% local via Docker.

## Stack

- **Backend**: NestJS + TypeORM + Zod, em arquitetura **DDD** (domain / application / infrastructure / presentation)
- **Frontend**: React + Vite + Tailwind (base para shadcn/ui)
- **Banco**: MariaDB (container Docker)
- **IA**: API do Gemini (geração dos textos STAR e resumo executivo)

Veja o PRD completo em `PRD-Star.md` (na pasta de outputs da conversa) para
o detalhamento de requisitos, modelo de dados e decisões de arquitetura.

## Pré-requisitos

- Docker e Docker Compose instalados
- Uma API key do Gemini: https://aistudio.google.com/app/apikey
- Um API token do Jira Cloud: https://id.atlassian.com/manage-profile/security/api-tokens
- Um Personal Access Token do GitHub (permissão de leitura em `repo`): https://github.com/settings/tokens

## Como rodar

1. Copie o arquivo de exemplo de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

2. Preencha o `.env` com seus tokens reais (Jira, GitHub, Gemini).

3. Suba os containers:

   ```bash
   docker compose up --build
   ```

4. Acesse:
   - Frontend: http://localhost:5173
   - Backend (API): http://localhost:3000

O banco de dados MariaDB é criado automaticamente (schema sincronizado via
TypeORM `synchronize: true` — adequado para uso pessoal/local, sem
necessidade de migrations manuais no MVP).

## Estrutura do projeto

```
star/
├── docker-compose.yml
├── .env.example
├── backend/              # NestJS — arquitetura DDD
│   └── src/
│       ├── documents/    # bounded context principal
│       │   ├── domain/           # entidades, value objects, regras de negócio
│       │   ├── application/      # use cases, portas (interfaces), DTOs (Zod)
│       │   ├── infrastructure/   # TypeORM, pdfkit
│       │   └── presentation/     # controllers HTTP
│       ├── jira/         # integração Jira Cloud (mesmo padrão de camadas)
│       ├── github/       # integração GitHub (mesmo padrão de camadas)
│       ├── ai/            # implementação da geração de texto via Gemini
│       └── database/      # configuração do TypeORM/MariaDB
└── frontend/             # React + Vite
    └── src/
        └── pages/         # as 5 telas do MVP
```

## Status atual

MVP em construção. Próximos passos: aplicar o visual definido no Claude
Design sobre os componentes shadcn/ui, e testar o fluxo fim a fim
(conexões → seleção → geração via IA → export PDF).
