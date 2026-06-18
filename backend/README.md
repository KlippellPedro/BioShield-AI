# ⚙️ backend — API e Microsserviços (Flask)

Camada de aplicação: recebe eventos do `ai_edge`, aplica as regras de negócio, controla o acesso à evidência (RBAC + MFA), gera os dossiês em PDF e mantém a trilha de auditoria imutável.

## Estrutura de `app/`

| Pasta/arquivo | Responsabilidade |
|---|---|
| `__init__.py` | **App factory** — cria o Flask, registra blueprints e extensões. |
| `extensions.py` | SQLAlchemy, Migrate, JWT, SocketIO, Marshmallow. |
| `config.py` | Configs Dev/Prod/Test a partir do ambiente. |
| `models/` | Mapeamento SQLAlchemy do schema `vigilis` (um arquivo por entidade). |
| `api/` | Blueprints REST: `auth`, `event`, `evidence`, `identification`, `dossier`, `zone`, `report`. |
| `services/` | Regras de negócio: `pdf`, `audit`, `rules`, `evidence`, `identification`, `retention`, `auth`. |
| `schemas/` | (De)serialização e validação de payloads. |
| `sockets/` | Push de alertas em tempo real (≤ 3 s, RNF-05). |
| `utils/` | `crypto` (referência ao KMS) e `decorators` (`@require_role`, `@require_mfa`). |
| `../jobs/purge_evidence.py` | Job de **expurgo** por retenção (90/180 dias). |

## Pontos de atenção (LGPD/SRS)

- Acesso à evidência: **RBAC + MFA**, e cada visualização gera `EVIDENCE_VIEW` em `audit_logs`.
- Identificação humana: grava em `events.audited_*` **e** em `identifications` na **mesma transação**.
- `audit_logs` é **imutável** — apenas `INSERT`/`SELECT`.

## Como rodar (dev)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
flask --app app db upgrade        # aplica as migrações (Alembic)
gunicorn -c ../config/gunicorn.conf.py wsgi:app     # ou: flask --app wsgi run --debug
```
