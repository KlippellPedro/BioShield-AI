# BioShield AI

> **A proteção que dura o procedimento inteiro.**
> Monitoramento de conformidade de **EPI** (Equipamento de Proteção Individual) por **visão computacional temporal** em áreas hospitalares de risco — detectando, em tempo real, tanto a **entrada não conforme** quanto a **remoção indevida** do equipamento dentro da área.

**Base normativa:** SRS BioShield AI **v1.3** (em revisão para **v1.4**, ver [ADR-010](docs/architecture.md)) · ISO/IEC 25010 · IEEE 830 · **LGPD** (Lei 13.709/2018)
**Status:** estrutura inicial do projeto (monorepo) — em desenvolvimento.
**Arquitetura:** Web desacoplado (frontend + backend separados) com **IA em cascata** (filtro no edge → confirmação + identificação no backend). Ver [ADR-009](docs/architecture.md).

---

## O que é

O BioShield AI processa fluxos de câmeras (RTSP/ONVIF ou webcam) em unidades de risco (UTI, centro cirúrgico, isolamento) para:

- **Detectar** EPI por classe (máscara, luvas, avental, touca, protetor facial) e vinculá-lo à pessoa (1ª IA, no edge).
- **Rastrear** cada profissional por um **Track ID efêmero** no edge (rastreamento interno em memória).
- **Confirmar** a infração com uma **2ª IA** mais robusta no backend e **identificar** o profissional por **reconhecimento facial** contra o cadastro do hospital.
- **Disparar alertas** de dois tipos de infração:
  - **Tipo A** — entrada na área de risco **sem** o EPI obrigatório.
  - **Tipo B** — **remoção** de um EPI já confirmado, detectada por análise temporal (`T_remocao`).
- **Gerar e despachar** o **dossiê PDF nominal** consolidado para a diretoria.

### Tratamento de dados e LGPD

O BioShield AI processa **dado pessoal e biométrico sensível**: no instante de uma **infração confirmada**, captura uma imagem **identificável** e realiza **identificação automatizada** (reconhecimento facial) contra o cadastro do hospital para gerar o dossiê nominal. A **operação normal é minimizada** (feed com desfoque, Track IDs efêmeros) — a imagem identificável só existe na infração. Por envolver **biometria** e **decisão automatizada**, o tratamento exige base legal específica e **Relatório de Impacto (DPIA/RIPD)**, e mantém ao titular o **direito de revisão e contestação** (LGPD art. 20). Detalhes e obrigações em [ADR-010](docs/architecture.md).

---

## Arquitetura (engenharia em cascata)

Sistema **Web desacoplado** — não uma aplicação Desktop. Pipeline de IA em **quatro estágios**:

1. **`ai_edge/` — Filtro (1ª IA):** script **headless** no edge; ao **suspeitar** de falta de EPI, captura o snapshot **identificável** e envia ao backend.
2. **`backend/` — Confirmação (2ª IA):** modelo mais robusto reconfirma com precisão se há a infração.
3. **`backend/` — Identificação (Face Match):** reconhecimento facial da evidência contra o **banco do hospital** → resolve nome/matrícula.
4. **`backend/` — Dossiê:** gera o **PDF nominal consolidado** e despacha à diretoria. O **`frontend/`** dá ao gestor a **revisão/contestação** (controle humano da decisão automatizada, art. 20).

**Por quê:** deploy fácil no hospital, divisão clara de trabalho, WebSockets nativos para alertas ≤ 3 s, e o dado biométrico tratado num único ponto auditável. Ver [ADR-009](docs/architecture.md) e [ADR-010](docs/architecture.md).

---

## Stack tecnológica

| Frente                   | Tecnologias                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------- |
| **ai_edge** (1ª IA)      | Python · Ultralytics **YOLOv8** · OpenCV · ByteTrack/DeepSORT                          |
| **backend** (API + IA)   | Python · **Flask** · SQLAlchemy · Alembic · Flask-SocketIO · PyJWT · pyotp · ReportLab · reconhecimento facial |
| **frontend** (dashboard) | **React** · Vite · TypeScript · Tailwind CSS                                           |
| **database**             | **PostgreSQL 14+** (schema `vigilis`)                                                  |
| **infra**                | Docker · docker-compose · GitHub Actions                                               |

---

## Estrutura do monorepo

```
bioshield-ai/
│
├── ai_edge/                      # FILTRO DE EPI / 1ª IA no edge — headless (Vinicius)
│   ├── src/
│   │   ├── main.py               # Loop principal: captura → detecção → tracking → regras → [suspeita: snapshot + envio]
│   │   ├── config.py             # Lê parâmetros (FPS, thresholds, T_remocao) do .env
│   │   ├── capture/
│   │   │   ├── camera_stream.py  # Captura webcam/RTSP/ONVIF; reconexão em falha (RNF-11)
│   │   │   └── frame_buffer.py   # Desfoca o feed normal; libera o quadro nítido só na infração
│   │   ├── detection/
│   │   │   ├── yolo_detector.py  # 1ª IA — YOLO (bounding boxes de EPI/pessoa)
│   │   │   └── epi_classes.py    # Mapa de classes do modelo
│   │   ├── tracking/
│   │   │   ├── tracker.py        # ByteTrack/DeepSORT; Track ID efêmero
│   │   │   └── reid.py           # Re-ID por silhueta (não-facial; face match é no backend)
│   │   ├── rules/
│   │   │   ├── association.py    # Associa EPI ↔ pessoa por IoU/anatomia
│   │   │   └── state_machine.py  # Máquina de estados; T_remocao; levanta a suspeita (Tipo A/B)
│   │   ├── evidence/
│   │   │   └── snapshot_generator.py  # Captura o snapshot identificável da infração
│   │   └── api_client/
│   │       └── backend_client.py # Envia {imagem identificável + metadados} ao backend (REST/TLS)
│   ├── models/                   # Pesos da 1ª IA (YOLO) — Git LFS/DVC, não no git puro
│   ├── tests/ · Dockerfile · requirements.txt · README.md
│
├── backend/                      # API / 2ª IA / FACE MATCH / SEGURANÇA / DB (Pedro)
│   ├── app/
│   │   ├── __init__.py · extensions.py · config.py
│   │   ├── models/               # SQLAlchemy do schema vigilis (user, zone, event, evidence,
│   │   │                         #   identification, dossier, audit_log)
│   │   ├── api/                  # Blueprints REST (event = ingestão da imagem do edge, etc.)
│   │   ├── services/
│   │   │   ├── epi_validation_service.py    # 2ª IA: reconfirma a infração de EPI
│   │   │   ├── face_match_service.py        # Reconhecimento facial (biométrico) — ADR-010
│   │   │   ├── hospital_registry_service.py # Integração com o cadastro do hospital (nome/matrícula)
│   │   │   ├── pdf_service.py               # Dossiê nominal consolidado + despacho à diretoria
│   │   │   └── ...                          # audit, rules, evidence, identification, retention, auth
│   │   ├── schemas/ · sockets/ (tempo real, RNF-05) · utils/ (crypto/KMS, decorators)
│   ├── models/                   # Pesos da 2ª IA + modelo de face match (Git LFS/DVC)
│   ├── jobs/purge_evidence.py    # Expurgo por retenção (90/180 dias)
│   ├── tests/ · wsgi.py · Dockerfile · requirements.txt · README.md
│
├── frontend/                     # DASHBOARD DO GESTOR — revisão/contestação (Murilo)
│   ├── src/  (pages: Login, Dashboard, Zones, EventDetail[revisão], EvidenceViewer, Dossiers)
│   ├── index.html · package.json · vite.config.ts · tsconfig.json · Dockerfile · README.md
│
├── database/                     # BANCO DE DADOS (PostgreSQL · schema vigilis)
│   ├── schema.sql                # DDL canônico (v1.3) + dicionário de dados completo
│   ├── seed.sql                  # Seed de demonstração que valida as regras de negócio
│   └── migrations/               # Esqueleto Alembic (para quando o backend adotar models)
│
├── migrations/                   # Migrações SQL manuais de evolução do banco (+ README) (Pedro)
│   └── 2026-06-18_fix-mfa-bypass.sql   # Correção de segurança: bloqueio do bypass de MFA (RNF-19)
│
├── config/                       # Configurações de serviço (logging, gunicorn, conexão)
├── docs/                         # SRS, pitch e ADRs (decisões de arquitetura)
├── scripts/                      # Utilitários de dev/ops (apply_schema, run_dev, reset_db)
├── .github/workflows/            # CI (lint + testes do backend e do frontend)
│
├── docker-compose.yml · .env.example · .gitignore · .dockerignore · Makefile · README.md
```

---

## Banco de dados (resumo)

Schema técnico **`vigilis`** (PostgreSQL 14+). Tabelas principais:

| Tabela                           | Papel                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `zones`                          | Áreas de risco, EPIs obrigatórios e `T_remocao` por área.                    |
| `events`                         | Alertas de infração (Tipo A/B); recebe nome/matrícula resolvidos pela IA.    |
| `visual_evidence`                | Referência ao snapshot nítido cifrado — **1 evidência : N eventos** (RF-16). |
| `identifications`                | Identificação resolvida — **contestável/revisável** (RF-17, art. 20).        |
| `incident_dossiers`              | Dossiê PDF do incidente — ciclo **PENDENTE → CONSOLIDADO**.                  |
| `users` / `roles` / `user_roles` | RBAC + MFA (RNF-19).                                                         |
| `audit_logs`                     | Trilha **imutável** append-only (RNF-14).                                    |

> **Follow-up (ADR-010):** com a identificação agora **automática**, `identifications.identified_by` e o trigger de consolidação do dossiê (hoje desenhados para origem **humana**) precisam aceitar origem **SISTEMA/IA**. Sinalizado, ainda **não aplicado** no schema.

DDL e dicionário em [`database/schema.sql`](database/schema.sql); evolução do banco em [`migrations/`](migrations/README.md); decisões em [`docs/architecture.md`](docs/architecture.md).

---

## Como rodar (desenvolvimento)

````bash
# 1. Variáveis de ambiente
cp .env.example .env        # ajuste as variáveis (Windows: copy .env.example .env)

# 2. Banco de dados (Docker)
docker compose up -d db

# 3. Aplicar o schema (o schema.sql traz o DDL dentro de um bloco markdown ```sql)
#    Veja scripts/apply_schema.sh para extrair o SQL puro e carregar schema + seed.
````

Cada frente tem seu próprio guia: [`ai_edge/README.md`](ai_edge/README.md) · [`backend/README.md`](backend/README.md) · [`frontend/README.md`](frontend/README.md).

---

## Equipe

Projeto desenvolvido na **Campanha Senac & Sesc Saúde** — Curso Técnico em Desenvolvimento de Sistemas (Senac-RS).

| Membro                     | Frente                    | Missão                                                                                              |
| -------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| **Pedro Nadalon Klippel**  | Backend / Segurança / DB  | API Flask, 2ª IA + face match + integração hospitalar, JWT (pyjwt), persistência, cifra e expurgo LGPD. |
| **Vinicius Ferrari Niffa** | Engenharia de IA / Edge   | 1ª IA (filtro YOLO), lógica do `T_remocao` e captura/envio do snapshot da infração.                 |
| **Murilo Dieter Nunes Mick** | Frontend Web / UI       | Dashboard em tempo real, revisão/contestação da identificação automática e visualizador de dossiês. |

**Orientação:** Prof. Miguel Matiolla

---

> **Documento e código de caráter acadêmico/confidencial.** Trata **dado pessoal e biométrico sensível** sob a LGPD — não exponha evidências, *templates* faciais, segredos de MFA ou chaves de criptografia no repositório (apenas **referências** ao cofre/KMS).
