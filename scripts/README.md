# scripts — Utilitários de desenvolvimento

**Em uma frase:** são atalhos de linha de comando para montar e recarregar o ambiente de desenvolvimento — hoje, principalmente, para criar o banco de dados com todas as suas regras e a demonstração.

Nada desta pasta roda em produção. Para a visão geral do sistema, veja o [README principal](../README.md).

> **Siglas desta pasta.** **DDL** — a parte do SQL que cria a estrutura do banco. **psql** — o cliente de linha de comando do PostgreSQL. **libpq** — a biblioteca de conexão do PostgreSQL, que define as variáveis `PGHOST`, `PGUSER` e afins. **CI** — Integração Contínua. **WSL** — *Windows Subsystem for Linux*, que permite rodar scripts `.sh` no Windows. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

---

## Estado atual

| Script | Situação | O que faz |
|---|---|---|
| `apply_schema.sh` | **Implementado e testado** | Cria o banco a partir do `database/schema.sql`, aplica as migrações e, opcionalmente, carrega a demonstração. |
| `reset_db.sh` | Apenas comentário | Vai apagar e recriar o banco local do zero. |
| `run_dev.sh` | Apenas comentário | Vai subir banco, backend e frontend em modo de desenvolvimento. |

O `Makefile` da raiz foi pensado como porta de entrada para estes scripts (`make migrate`, `make seed`, `make run`), mas as receitas ainda estão vazias.

---

## `apply_schema.sh`

### Por que ele é necessário

O `database/schema.sql` não é SQL puro: é um documento Markdown com o código SQL dentro de um bloco. Passá-lo direto ao `psql` falharia. O script extrai o bloco, aplica a criação do banco e depois as migrações de [`/migrations`](../migrations/README.md), em ordem cronológica.

### Como usar

```bash
bash scripts/apply_schema.sh                    # banco novo: cria tudo e aplica as migrações
bash scripts/apply_schema.sh --with-seed        # o mesmo, carregando também a demonstração
bash scripts/apply_schema.sh --migrations-only  # banco já existente: só as migrações
bash scripts/apply_schema.sh --extract-only     # só mostra o SQL extraído, sem conectar ao banco
bash scripts/apply_schema.sh --help             # resumo das opções
```

Pode ser chamado de qualquer pasta: o script localiza sozinho a raiz do repositório.

### Conexão com o banco

Usa as variáveis padrão do PostgreSQL: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` e `PGDATABASE`. Sem elas, tenta `postgres@localhost:5432/bioshield`.

Precisa de `bash`, `awk` e `psql` instalados. **Se você só tem o Docker**, não é preciso instalar nada: o [README principal](../README.md#como-executar) mostra como rodar o script dentro de um container, o que também evita conflito com um PostgreSQL já instalado na máquina.

### Quando dá erro

- **`already exists`** ao criar o banco: o schema já existe. A criação roda uma vez só, num banco vazio; para atualizar um banco existente, use `--migrations-only`. O próprio script mostra essa orientação.
- **`psql não encontrado`**: instale o cliente do PostgreSQL ou use o caminho com Docker.
- **Falha de autenticação**: confira `PGPASSWORD` e se a porta 5432 não pertence a outro PostgreSQL instalado localmente.

É o mesmo script executado pela integração contínua ([`database-ci.yml`](../.github/workflows/database-ci.yml)), então qualquer mudança nele é testada automaticamente.

---

## O que ainda entra aqui

- A implementação de `reset_db.sh` e `run_dev.sh`.
- Um verificador de ambiente que confira as variáveis obrigatórias do `.env` antes de subir os serviços.
- Suporte mais direto ao Windows. Hoje os scripts exigem Git Bash ou WSL; no Git Bash, comandos Docker com caminhos de pasta precisam de `MSYS_NO_PATHCONV=1` para os caminhos não serem convertidos.

---

## Convenções

- Scripts que apagam dados, como o futuro `reset_db.sh`, devem pedir confirmação e se recusar a rodar quando o banco não estiver em `localhost`.
- Nenhum script contém senha, chave ou token; tudo vem de variáveis de ambiente.
- Mensagens de erro devem dizer o que fazer, não só o que falhou.
