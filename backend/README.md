# ⚙️ backend — API, Confirmação (2ª IA), Identificação e Segurança (Flask)

Núcleo dos **estágios 2–4** do pipeline em cascata: recebe o snapshot do edge, **reconfirma a infração** com uma 2ª IA, **identifica o profissional** por reconhecimento facial contra o cadastro do hospital, gera o **dossiê PDF nominal** e o despacha para a diretoria — além de autenticação, persistência, segurança e expurgo. Ver [ADR-009](../docs/architecture.md) e [ADR-010](../docs/architecture.md).

## 🎯 Missão — Pedro (Backend / Segurança / DB)

- **2ª IA (validação de EPI):** modelo mais robusto que reconfirma, com precisão, a infração recebida do edge (corta falso-positivo).
- **Identificação automatizada (Face Match):** reconhecimento facial da evidência contra o **banco do hospital** para resolver **nome/matrícula** — dado biométrico **sensível** (ADR-010).
- **Integração hospitalar:** serviço de acesso ao cadastro de profissionais (registro oficial: nome, matrícula).
- **Dossiê + despacho:** geração do PDF nominal consolidado e envio à diretoria.
- **Segurança/LGPD:** JWT (**pyjwt**), RBAC/MFA, criptografia em repouso (referências ao KMS), expurgo (90 dias) e tratamento reforçado do dado biométrico (DPIA/RIPD; art. 20 — revisão/contestação).

## Estrutura de `app/`

| Pasta/arquivo | Responsabilidade |
|---|---|
| `__init__.py` | **App factory** — cria o Flask, registra blueprints e extensões. |
| `extensions.py` | SQLAlchemy, Migrate, JWT, SocketIO, Marshmallow. |
| `config.py` | Configs Dev/Prod/Test a partir do ambiente. |
| `models/` | Mapeamento SQLAlchemy do schema `vigilis` (um arquivo por entidade). |
| `api/` | Blueprints REST: `auth`, `event` (ingestão da imagem do edge), `evidence`, `identification`, `dossier`, `zone`, `report`. |
| `services/epi_validation_service.py` | **2ª IA** — reconfirma a infração de EPI vinda do edge. |
| `services/face_match_service.py` | **Reconhecimento facial** (biométrico) contra o cadastro do hospital. |
| `services/hospital_registry_service.py` | Integração com o banco de profissionais do hospital (nome/matrícula). |
| `services/pdf_service.py` | Gera o dossiê PDF nominal (consolidado) e despacha à diretoria. |
| `services/` (demais) | `audit`, `rules`, `evidence`, `identification`, `retention`, `auth`. |
| `schemas/` | (De)serialização e validação de payloads. |
| `sockets/` | Push de alertas em tempo real (≤ 3 s, RNF-05). |
| `utils/` | `crypto` (referência ao KMS) e `decorators` (`@require_role`, `@require_mfa`). |
| `../models/` | Pesos da 2ª IA (validação de EPI) e do modelo de face match — Git LFS/DVC. |
| `../jobs/purge_evidence.py` | Job de **expurgo** por retenção (90/180 dias). |

## Fluxo em cascata (estágios 2–4)

```
[edge] imagem + metadados
   → (2) epi_validation_service: confirma a infração?
        → (3) face_match_service + hospital_registry_service: resolve nome/matrícula
             → (4) pdf_service: dossiê nominal consolidado → despacho à diretoria
```

## Pontos de atenção (LGPD/SRS)

- ⚠️ **Dado biométrico = sensível** (LGPD art. 5, II / art. 11): tratar sob **DPIA/RIPD**, base legal específica, cifra e minimização do template facial (ADR-010).
- **Decisão automatizada (art. 20):** a identificação por IA permanece **contestável** (`identifications.status` CONTESTADA/REVOGADA) e **revisável por humano** — não é irrevogável.
- Acesso à evidência: **RBAC + MFA**; cada visualização e cada match gera registro em `audit_logs` (imutável).
- Evolução do banco: ver [`/migrations`](../migrations/README.md).

## Como rodar (dev)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
flask --app app db upgrade        # aplica as migrações (Alembic)
gunicorn -c ../config/gunicorn.conf.py wsgi:app     # ou: flask --app wsgi run --debug
```
