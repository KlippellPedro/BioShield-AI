# BioShield AI

> **A proteção que dura o procedimento inteiro.**
> Monitoramento de conformidade de **EPI** (Equipamento de Proteção Individual) por **visão computacional temporal** em áreas hospitalares de risco — detectando, em tempo real, tanto a **entrada não conforme** quanto a **remoção indevida** do equipamento dentro da área.

**Base normativa:** SRS BioShield AI **v1.3** · ISO/IEC 25010 · IEEE 830 · **LGPD** (Lei 13.709/2018)
**Status:** estrutura inicial do projeto (monorepo) — em desenvolvimento.

---

## O que é

O BioShield AI processa fluxos de câmeras (RTSP/ONVIF ou webcam) em unidades de risco (UTI, centro cirúrgico, isolamento) para:

- **Detectar** EPI por classe (máscara, luvas, avental, touca, protetor facial) e vinculá-lo à pessoa.
- **Rastrear** cada profissional por um **Track ID anônimo e efêmero** (ex.: `track_00427`), processado em memória — **sem reconhecimento facial** e **sem cadastro nominal**.
- **Disparar alertas** de dois tipos de infração:
  - **Tipo A** — entrada na área de risco **sem** o EPI obrigatório.
  - **Tipo B** — **remoção** de um EPI já confirmado, detectada por análise temporal (`T_remocao`).
- **Gerar evidência** (snapshot nítido, cifrado) **apenas no instante de uma infração confirmada**, com acesso restrito ao gestor.

### Privacidade por padrão (LGPD)

O sistema é **anônimo por padrão**: durante toda a operação normal, trabalha sobre Track IDs anônimos. A **única exceção** é o snapshot de evidência, capturado só na infração e roteado ao gestor autorizado (RBAC + MFA). **A IA nunca identifica ninguém** — quem dá nome ao rosto é um **humano**, de forma registrada e **contestável** (RF-17, LGPD art. 20). A evidência tem **retenção limitada** (padrão **90 dias**, teto **180**) com expurgo automático.

---

## Stack tecnológica

| Frente                   | Tecnologias                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------- |
| **ai_edge** (visão)      | Python · Ultralytics **YOLOv8** · OpenCV · ByteTrack/DeepSORT                          |
| **backend** (API)        | Python · **Flask** · SQLAlchemy · Alembic · Flask-SocketIO · PyJWT · pyotp · ReportLab |
| **frontend** (dashboard) | **React** · Vite · TypeScript · Tailwind CSS                                           |
| **database**             | **PostgreSQL 14+** (schema `vigilis`)                                                  |
| **infra**                | Docker · docker-compose · GitHub Actions                                               |

---

## Estrutura do monorepo

Um único repositório com as três frentes separadas por responsabilidade. Abaixo, o que cada pasta/arquivo representa:

```
bioshield-ai/
│
├── ai_edge/                      # MÓDULO DE VISÃO COMPUTACIONAL (roda no edge)
│   ├── src/
│   │   ├── main.py               # Loop principal: captura → detecção → tracking → regras → evidência → envio
│   │   ├── config.py             # Lê parâmetros (FPS, thresholds, T_remocao) do .env
│   │   ├── capture/              # Ingestão de vídeo
│   │   │   ├── camera_stream.py  # Captura webcam/RTSP/ONVIF; reconexão em falha de câmera (RNF-11)
│   │   │   └── frame_buffer.py   # Buffer volátil; aplica desfoque facial por padrão (regime anônimo)
│   │   ├── detection/            # Detecção por CNN
│   │   │   ├── yolo_detector.py  # Wrapper do YOLOv8; bounding boxes de EPI/pessoa por quadro
│   │   │   └── epi_classes.py    # Mapa de classes do modelo
│   │   ├── tracking/             # Rastreamento multiobjeto (MOT)
│   │   │   ├── tracker.py        # ByteTrack/DeepSORT; atribui o Track ID anônimo
│   │   │   └── reid.py           # Re-ID anônima (silhueta), sem biometria facial
│   │   ├── rules/                # Lógica temporal
│   │   │   ├── association.py    # Associa EPI ↔ pessoa por IoU/anatomia
│   │   │   └── state_machine.py  # Máquina de estados por Track (ENTROU/CONFORME/REMOÇÃO); T_remocao
│   │   ├── evidence/
│   │   │   └── snapshot_generator.py  # Captura o snapshot nítido na infração e cifra (AES-256)
│   │   └── api_client/
│   │       └── backend_client.py # Envia eventos + evidência ao backend via REST (assíncrono, RNF-18)
│   ├── models/                   # Pesos do YOLOv8 (.pt) — versionar via Git LFS/DVC, não no git puro
│   ├── tests/                    # Testes das regras de visão
│   ├── Dockerfile · requirements.txt · README.md
│
├── backend/                      # MICROSSERVIÇOS / API (Flask)
│   ├── app/
│   │   ├── __init__.py           # App factory: cria o Flask, registra blueprints e extensões
│   │   ├── extensions.py         # Instâncias: SQLAlchemy, Migrate, JWT, SocketIO
│   │   ├── config.py             # Configs Dev/Prod/Test via variáveis de ambiente
│   │   ├── models/               # Mapeamento SQLAlchemy do schema vigilis (1 arquivo por entidade)
│   │   │   ├── user.py · zone.py · event.py · evidence.py
│   │   │   ├── identification.py # Identificação humana contestável (RF-17)
│   │   │   ├── dossier.py        # Dossiê de incidente (ciclo PENDENTE/CONSOLIDADO)
│   │   │   └── audit_log.py      # Trilha imutável (append-only)
│   │   ├── api/                  # Blueprints REST (auth, eventos, evidência, identificação, dossiê, zonas, relatórios)
│   │   ├── services/             # Regras de negócio (PDF, auditoria, regras, evidência, identificação, expurgo, auth)
│   │   ├── schemas/              # (De)serialização e validação de payloads
│   │   ├── sockets/              # Tempo real (WebSocket/SSE) — alertas ≤ 3 s (RNF-05)
│   │   └── utils/                # crypto (referência ao KMS) e decorators (@require_role/@require_mfa)
│   ├── jobs/
│   │   └── purge_evidence.py     # Job de expurgo por retenção (90/180 dias)
│   ├── tests/                    # Testes de rotas/serviços/regras
│   ├── wsgi.py · Dockerfile · requirements.txt · README.md
│
├── frontend/                     # DASHBOARD DO GESTOR (React + Vite)
│   ├── src/
│   │   ├── main.tsx · App.tsx     # Bootstrap e rotas
│   │   ├── api/client.ts          # Cliente HTTP (axios) com token/MFA
│   │   ├── hooks/                 # ex.: useRealtimeAlerts (assina o canal de alertas)
│   │   ├── store/                 # Estado global (sessão/permissões — RBAC no cliente)
│   │   ├── pages/                 # Login, Dashboard, Zones, EventDetail, EvidenceViewer, Dossiers
│   │   ├── components/            # Componentes reutilizáveis (AlertCard, DataTable)
│   │   └── styles/                # Tailwind + estilos base
│   ├── index.html · package.json · vite.config.ts · tsconfig.json
│   ├── Dockerfile · README.md
│
├── database/                     # BANCO DE DADOS (PostgreSQL · schema vigilis)
│   ├── schema.sql                # DDL canônico (v1.3) + dicionário de dados completo
│   ├── seed.sql                  # Seed de demonstração que valida as regras de negócio
│   └── migrations/               # Migrações versionadas (Alembic)
│
├── config/                       # Configurações de serviço (logging, gunicorn, conexão)
├── docs/                         # SRS, pitch e ADRs (decisões de arquitetura)
├── scripts/                      # Utilitários de dev/ops (apply_schema, run_dev, reset_db)
├── .github/workflows/            # CI (lint + testes do backend e do frontend)
│
├── docker-compose.yml            # Orquestra db + backend + frontend (ai_edge opcional)
├── .env.example                  # Template de variáveis (copiar para .env — nunca comitar segredos)
├── .gitignore · .dockerignore    # Ignora venv, .env, node_modules, *.pt, evidências
├── Makefile                      # Atalhos: setup, migrate, seed, run, test, lint
└── README.md                     # Este arquivo
```

---

## Banco de dados (resumo)

Schema técnico **`vigilis`** (PostgreSQL 14+). Tabelas principais:

| Tabela                           | Papel                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `zones`                          | Áreas de risco, EPIs obrigatórios e `T_remocao` por área.                    |
| `events`                         | Alertas de infração (Tipo A/B) sobre Track ID anônimo.                       |
| `visual_evidence`                | Referência ao snapshot nítido cifrado — **1 evidência : N eventos** (RF-16). |
| `identifications`                | Identificação **humana** contestável da evidência (RF-17).                   |
| `incident_dossiers`              | Dossiê PDF do incidente — ciclo **PENDENTE → CONSOLIDADO**.                  |
| `users` / `roles` / `user_roles` | RBAC + MFA (RNF-19).                                                         |
| `audit_logs`                     | Trilha **imutável** append-only (RNF-14).                                    |

Detalhes completos e dicionário de dados em [`database/schema.sql`](database/schema.sql). Decisões em [`docs/architecture.md`](docs/architecture.md).

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

- Pedro Nadalon Klippel
- Vinicius Ferrari Niffa
- Murilo Dieter Nunes Mick

**Orientação:** Prof. Miguel Matiolla

---

> **Documento e código de caráter acadêmico/confidencial.** Trata dados pessoais sob a LGPD — não exponha evidências, segredos de MFA ou chaves de criptografia no repositório (apenas **referências** ao cofre/KMS).
