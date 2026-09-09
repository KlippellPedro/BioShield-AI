# BioShield AI

> **A proteção que dura o procedimento inteiro.**
> Monitoramento de conformidade de **EPI** (Equipamento de Proteção Individual) por **visão computacional temporal** em áreas hospitalares de risco — detectando, em tempo real, tanto a **entrada não conforme** quanto a **remoção indevida** do equipamento dentro da área.

**Base normativa:** SRS (*Software Requirements Specification*, a Especificação de Requisitos de Software) do BioShield AI, **v1.3** (em revisão para **v1.4**, ver [ADR-010](docs/architecture.md)) · ISO/IEC 25010 · IEEE 830 · **LGPD** (Lei 13.709/2018)
**Status:** monorepo estruturado, em desenvolvimento. O **banco de dados está implementado** (DDL, triggers, seed e duas migrações aplicadas); o código das três frentes ainda é **esqueleto** — os arquivos existem e documentam sua responsabilidade em uma linha de comentário, mas não têm implementação.
**Arquitetura:** Web desacoplado (frontend + backend separados) com **IA em cascata** (filtro no edge → confirmação + identificação no backend). Ver [ADR-009](docs/architecture.md) — as ADRs (*Architecture Decision Records*) são os registros de decisão de arquitetura do projeto.

> Este README usa siglas de quatro áreas diferentes. Todas estão expandidas no [glossário](#glossário-de-siglas), ao final.

---

## O que é

O BioShield AI processa fluxos de câmeras (RTSP/ONVIF ou webcam) em unidades de risco (UTI, centro cirúrgico, isolamento) para:

- **Detectar** EPI por classe (máscara, luvas, avental, touca, protetor facial) e vinculá-lo à pessoa (1ª IA, no edge).
- **Rastrear** cada profissional por um **Track ID efêmero** — um identificador temporário, interno e em memória — no *edge* (o computador instalado junto às câmeras).
- **Confirmar** a infração com uma **2ª IA** (Inteligência Artificial) mais robusta no backend e **identificar** o profissional por **reconhecimento facial** contra o cadastro do hospital.
- **Disparar alertas** de dois tipos de infração:
  - **Tipo A** — entrada na área de risco **sem** o EPI obrigatório.
  - **Tipo B** — **remoção** de um EPI já confirmado, detectada por análise temporal (`T_remocao`).
- **Gerar e despachar** o **dossiê PDF nominal** consolidado para a diretoria.

### Tratamento de dados e LGPD

O BioShield AI processa **dado pessoal e biométrico sensível**: no instante de uma **infração confirmada**, captura uma imagem **identificável** e realiza **identificação automatizada** (reconhecimento facial) contra o cadastro do hospital para gerar o dossiê nominal. A **operação normal é minimizada** (feed com desfoque, Track IDs efêmeros) — a imagem identificável só existe na infração. Por envolver **biometria** e **decisão automatizada**, o tratamento exige base legal específica e **Relatório de Impacto** — DPIA (*Data Protection Impact Assessment*) ou, no vocabulário da LGPD, RIPD (Relatório de Impacto à Proteção de Dados Pessoais), e mantém ao titular o **direito de revisão e contestação** (LGPD art. 20). Detalhes e obrigações em [ADR-010](docs/architecture.md).

---

## Arquitetura (engenharia em cascata)

Sistema **Web desacoplado** — não uma aplicação Desktop. Pipeline de IA em **quatro estágios**:

1. **`ai_edge/` — Filtro (1ª IA):** script **headless** (sem interface gráfica, roda só por linha de comando) no *edge*; ao **suspeitar** de falta de EPI, captura o snapshot **identificável** e envia ao backend.
2. **`backend/` — Confirmação (2ª IA):** modelo mais robusto reconfirma com precisão se há a infração.
3. **`backend/` — Identificação (Face Match):** reconhecimento facial da evidência contra o **banco do hospital** → resolve nome/matrícula.
4. **`backend/` — Dossiê:** gera o **PDF nominal consolidado** e despacha à diretoria. O **`frontend/`** dá ao gestor a **revisão/contestação** (controle humano da decisão automatizada, art. 20).

**Por quê:** implantação simples no hospital, divisão clara de trabalho, WebSockets nativos para alertas em até 3 s, e o dado biométrico tratado num único ponto auditável. Ver [ADR-009](docs/architecture.md) e [ADR-010](docs/architecture.md).

---

## Stack tecnológica

| Frente                   | Tecnologias                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------- |
| **ai_edge** (1ª IA)      | Python · Ultralytics **YOLOv8** (*You Only Look Once*, detector de objetos) · OpenCV · ByteTrack/DeepSORT (rastreadores MOT, *Multiple Object Tracking*) |
| **backend** (API + IA)   | Python · **Flask** · SQLAlchemy (ORM) · Alembic (migrações) · Flask-SocketIO · PyJWT (*JSON Web Token*) · pyotp (TOTP, segundo fator) · ReportLab (PDF) · reconhecimento facial |
| **frontend** (dashboard) | **React** · Vite · TypeScript · Tailwind CSS                                           |
| **database**             | **PostgreSQL 14+** (SGBD relacional; schema técnico `vigilis`)                          |
| **infra**                | Docker · docker-compose · GitHub Actions (CI, Integração Contínua)                      |

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
│   ├── tests/test_state_machine.py    # Regra temporal do T_remocao — o teste mais crítico da pasta
│   └── Dockerfile · requirements.txt · README.md
│
├── backend/                      # API / 2ª IA / FACE MATCH / SEGURANÇA / DB (Pedro)
│   ├── app/
│   │   ├── __init__.py · extensions.py · config.py
│   │   ├── models/               # SQLAlchemy do schema vigilis (user, zone, event, evidence,
│   │   │                         #   identification, dossier, audit_log)
│   │   ├── api/                  # Blueprints REST (auth, event = ingestão da imagem do edge,
│   │   │                         #   evidence, identification, dossier, zone, report)
│   │   ├── services/
│   │   │   ├── epi_validation_service.py    # 2ª IA: reconfirma a infração de EPI
│   │   │   ├── face_match_service.py        # Reconhecimento facial (biométrico) — ADR-010
│   │   │   ├── hospital_registry_service.py # Integração com o cadastro do hospital (nome/matrícula)
│   │   │   ├── pdf_service.py               # Dossiê nominal consolidado + despacho à diretoria
│   │   │   └── ...                          # audit, rules, evidence, identification, retention, auth
│   │   ├── schemas/ · sockets/ (tempo real, RNF-05) · utils/ (crypto/KMS, decorators)
│   ├── models/                   # Pesos da 2ª IA + modelo de face match (Git LFS/DVC)
│   ├── jobs/purge_evidence.py    # Expurgo por retenção (90/180 dias)
│   ├── tests/                    # test_auth_mfa.py · test_dossier_rules.py
│   └── wsgi.py · Dockerfile · requirements.txt · README.md
│
├── frontend/                     # DASHBOARD DO GESTOR — revisão/contestação (Carlos)
│   ├── src/
│   │   ├── main.tsx · App.tsx · api/client.ts · store/authStore.ts
│   │   ├── hooks/useRealtimeAlerts.ts   # Canal WebSocket/SSE de alertas
│   │   ├── pages/                # Login, Dashboard, Zones, EventDetail (revisão),
│   │   │                         #   EvidenceViewer, Dossiers
│   │   ├── components/           # AlertCard · DataTable
│   │   └── styles/index.css      # Tailwind + base
│   ├── public/favicon.svg
│   └── index.html · package.json · vite.config.ts · tsconfig.json · Dockerfile · README.md
│
├── database/                     # BANCO DE DADOS (PostgreSQL · schema vigilis) — implementado
│   ├── schema.sql                # DDL canônico (v1.3) + dicionário de dados completo
│   ├── seed.sql                  # Seed de demonstração que valida as regras de negócio
│   ├── migrations/               # Esqueleto Alembic (env.py, script.py.mako, versions/)
│   └── README.md
│
├── migrations/                   # Migrações SQL manuais — trilha ativa do banco (Pedro)
│   ├── 2026-06-18_fix-mfa-bypass.sql          # Trigger anti-bypass de MFA (RNF-19)
│   ├── 2026-06-18_identification-source.sql   # Origem da identificação: HUMAN | AI (ADR-010)
│   └── README.md
│
├── config/                       # Configuração de serviço (gunicorn, logging, conexão) + README
├── docs/                         # ADRs e documentação de entrega (SRS e DPIA ainda a incluir)
├── scripts/                      # Utilitários de dev/ops (apply_schema, run_dev, reset_db) + README
├── .github/workflows/            # CI (lint + testes do backend e do frontend) + README
│
├── docker-compose.yml · .env.example · .gitignore · .dockerignore · Makefile · README.md
```

---

## Banco de dados (resumo)

Schema técnico **`vigilis`** (PostgreSQL 14+). Tabelas principais:

| Tabela                           | Papel                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `zones`                          | Áreas de risco, EPIs obrigatórios e `T_remocao` (tempo tolerado de remoção) por área. |
| `events`                         | Alertas de infração (Tipo A/B); recebe nome/matrícula resolvidos pela IA.    |
| `visual_evidence`                | Referência ao *snapshot* (imagem capturada) nítido e cifrado — **1 evidência : N eventos** (RF-16, Requisito Funcional 16). |
| `identifications`                | Identificação resolvida — **contestável/revisável** (RF-17, art. 20).        |
| `incident_dossiers`              | Dossiê PDF do incidente — ciclo **PENDENTE → CONSOLIDADO**.                  |
| `users` / `roles` / `user_roles` | RBAC (Controle de Acesso Baseado em Papéis) e MFA (Autenticação Multifator), conforme RNF-19 (Requisito Não Funcional 19). |
| `audit_logs`                     | Trilha **imutável**, *append-only* — só aceita inserção, nunca alteração ou remoção (RNF-14). |

> **Origem da identificação (ADR-010) — já aplicada.** Como a identificação passou a ser automática, `identifications` ganhou a coluna `source` (`HUMAN` ou `AI`), `identified_by` virou opcional e a constraint `chk_identification_source` garante a coerência entre os dois: origem humana exige autor, origem IA exige autor nulo. Feito na migração [`2026-06-18_identification-source.sql`](migrations/2026-06-18_identification-source.sql). O trigger de consolidação do dossiê **não precisou mudar** — ele valida apenas que `events.audited_professional_*` estão preenchidos, independentemente de quem preencheu.

DDL e dicionário em [`database/schema.sql`](database/schema.sql); evolução do banco em [`migrations/`](migrations/README.md); decisões em [`docs/architecture.md`](docs/architecture.md).

---

## Como rodar (desenvolvimento)

O banco é a única parte que já roda de ponta a ponta. Backend, frontend e edge sobem, mas ainda não fazem nada — o código é esqueleto.

```bash
# 1. Variáveis de ambiente
cp .env.example .env        # Windows: copy .env.example .env

# 2. Banco de dados via Docker
docker compose up -d db

# 3. Schema + migrações + seed
#    Atenção: o schema.sql é um documento Markdown com o DDL dentro de um bloco ```sql.
#    Não passe direto ao psql — extraia o bloco (é o que o script faz).
bash scripts/apply_schema.sh
psql -U postgres -d bioshield -f migrations/2026-06-18_fix-mfa-bypass.sql
psql -U postgres -d bioshield -f migrations/2026-06-18_identification-source.sql
psql -U postgres -d bioshield -f database/seed.sql        # opcional, só em dev
```

O `seed.sql` serve como teste de aceitação do banco: ele exercita o fluxo 1:N de evidência, o ciclo do dossiê e três bloqueios que **devem** falhar (consolidar dossiê sem identificação, dar acesso à evidência a usuário sem MFA, retenção acima de 180 dias). Se algum deles passar, a proteção correspondente não está no lugar.

### Guias por pasta

| Pasta | Guia |
|---|---|
| `ai_edge/` | [Filtro de EPI no edge (1ª IA)](ai_edge/README.md) |
| `backend/` | [API, 2ª IA, face match e segurança](backend/README.md) |
| `frontend/` | [Dashboard do gestor](frontend/README.md) |
| `database/` | [Schema, seed e Alembic](database/README.md) |
| `migrations/` | [Migrações SQL manuais](migrations/README.md) |
| `config/` | [Configuração de serviço](config/README.md) |
| `scripts/` | [Utilitários de dev/ops](scripts/README.md) |
| `docs/` | [ADRs e documentação de entrega](docs/README.md) |
| `.github/` | [Integração contínua](.github/README.md) |

---

## Conformidade e qualidade — estado

As cinco dívidas levantadas na revisão de 2026-09-09 foram tratadas:

| Item | Situação | Onde |
|---|---|---|
| Divergência entre o SRS v1.3 e a ADR-010 | **Documentada.** Delta formal escrito, requisito a requisito; falta republicar o PDF oficial | [`docs/SRS_v1.4_emenda.md`](docs/SRS_v1.4_emenda.md) |
| Relatório de Impacto (DPIA/RIPD) | **Escrito.** Rascunho de engenharia com 9 riscos mapeados; depende de revisão jurídica | [`docs/DPIA_RIPD.md`](docs/DPIA_RIPD.md) |
| Cabeçalho do `schema.sql` desatualizado | **Corrigido.** Declara v1.4, lista migrações incorporadas, sem referência pendurada | [`database/schema.sql`](database/schema.sql) |
| Brecha-irmã do MFA (ADR-005) | **Fechada e testada.** Terceiro trigger; a invariante do RNF-19 agora é completa | [`migrations/2026-09-09_...sql`](migrations/2026-09-09_fix-role-privilege-escalation.sql) |
| CI inexistente, `ai_edge/` sem cobertura | **Quatro workflows escritos**, incluindo o de banco que valida as proteções | [`.github/README.md`](.github/README.md) |

### O que ficou aberto, e por quê

Nem tudo se resolve escrevendo código — três itens dependem de decisão que não é técnica:

- **Base legal do tratamento biométrico.** Precisa de parecer jurídico. O legítimo interesse não serve para dado sensível, e o consentimento é frágil na relação de emprego. Sem isso definido, o sistema só deve operar com dado sintético. Ver [DPIA §4.3](docs/DPIA_RIPD.md).
- **Terceiros no enquadramento (risco R7).** O snapshot de uma infração em UTI provavelmente contém o paciente, cuja imagem em leito é dado de saúde — e ele nem é destinatário do sistema. A recomendação da equipe é recortar a região do track sob suspeita em vez de guardar o quadro inteiro. Decisão de produto pendente.
- **Janela de revisão antes do despacho.** Um dossiê já enviado à diretoria e depois revogado não desfaz o dano reputacional. Reter o despacho automático por um intervalo de revisão tornaria o art. 20 efetivo em vez de formal. Decisão de produto pendente.

A dívida de **implementação** continua sendo a maior: backend, frontend e edge são esqueleto. A prioridade de conformidade dentro dela é a tela de revisão e contestação, porque é ela que dá efetividade à salvaguarda do art. 20.

---

## Glossário de siglas

O projeto cruza quatro vocabulários — engenharia de software, proteção de dados, visão computacional e ambiente hospitalar. Esta é a referência única; cada README de pasta também expande, no seu texto, as siglas que usa.

### Documentação e requisitos

| Sigla | Significado | No projeto |
|---|---|---|
| **ADR** | *Architecture Decision Record* — Registro de Decisão de Arquitetura | Cada decisão estrutural, no formato Contexto, Decisão e Consequência. Ficam em [`docs/architecture.md`](docs/architecture.md), numeradas de ADR-001 a ADR-010. |
| **SRS** | *Software Requirements Specification* — Especificação de Requisitos de Software | O documento normativo do produto. Hoje na v1.3, com emenda proposta para a v1.4. |
| **RF** | Requisito Funcional | O que o sistema deve fazer. Ex.: RF-16 (evidência 1:N), RF-17 (identificação). |
| **RNF** | Requisito Não Funcional | Qualidades e restrições. Ex.: RNF-05 (alerta em até 3 s), RNF-19 (MFA obrigatório). |
| **IEEE 830** | Norma do *Institute of Electrical and Electronics Engineers* para especificação de requisitos | Formato seguido pelo SRS. |
| **ISO/IEC 25010** | Norma internacional de qualidade de produto de software | Modelo de qualidade adotado. |

### Proteção de dados

| Sigla | Significado | No projeto |
|---|---|---|
| **LGPD** | Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018) | Base legal que rege todo o tratamento de imagem e identidade aqui. |
| **DPIA** | *Data Protection Impact Assessment* — Avaliação de Impacto à Proteção de Dados | Nome internacional do relatório. |
| **RIPD** | Relatório de Impacto à Proteção de Dados Pessoais | Nome usado pela LGPD (art. 38) para o mesmo documento. Ver [`docs/DPIA_RIPD.md`](docs/DPIA_RIPD.md). |
| **DPO** | *Data Protection Officer* — Encarregado de Dados | Quem responde pelo tratamento perante a ANPD e os titulares. Existe como papel no controle de acesso do sistema. |
| **ANPD** | Autoridade Nacional de Proteção de Dados | Órgão fiscalizador da LGPD. |

### Segurança

| Sigla | Significado | No projeto |
|---|---|---|
| **MFA** | *Multi-Factor Authentication* — Autenticação Multifator | Obrigatória para qualquer papel que veja evidência (RNF-19). Três gatilhos no banco garantem a regra. |
| **RBAC** | *Role-Based Access Control* — Controle de Acesso Baseado em Papéis | Permissões concedidas a papéis (Operador, DPO, etc.), não a pessoas. |
| **JWT** | *JSON Web Token* — Token Web em formato JSON | Formato do token de sessão emitido pela API. |
| **KMS** | *Key Management Service* — Serviço de Gerenciamento de Chaves | Cofre externo das chaves de criptografia. O banco guarda só a referência, nunca o segredo. |
| **TLS** | *Transport Layer Security* — Segurança da Camada de Transporte | Criptografia em trânsito. Obrigatória no envio da imagem do edge ao backend. |
| **TOTP** | *Time-based One-Time Password* — Senha de Uso Único Baseada em Tempo | Mecanismo do segundo fator (biblioteca `pyotp`). |

### Inteligência artificial e visão computacional

| Sigla | Significado | No projeto |
|---|---|---|
| **IA** | Inteligência Artificial | O sistema usa duas em cascata: a 1ª filtra no edge, a 2ª confirma no backend. |
| **YOLO** | *You Only Look Once* — "você olha só uma vez" | Família de modelos de detecção de objetos em tempo real. É a 1ª IA. |
| **CNN** | *Convolutional Neural Network* — Rede Neural Convolucional | Arquitetura por trás dos detectores de imagem. |
| **MOT** | *Multiple Object Tracking* — Rastreamento de Múltiplos Objetos | Mantém a identidade de cada pessoa entre quadros, via Track ID efêmero. |
| **Re-ID** | *Re-identification* — Reidentificação | Reconhecer a mesma pessoa após uma oclusão. Aqui é por silhueta, **não** por rosto. |
| **IoU** | *Intersection over Union* — Interseção sobre União | Métrica de sobreposição entre caixas delimitadoras; usada para associar cada EPI à pessoa certa. |
| **FPS** | *Frames Per Second* — quadros por segundo | Taxa de processamento do vídeo. |
| **Face match** | Comparação facial | Confronto da imagem da infração com o cadastro do hospital para resolver nome e matrícula. |
| **Track ID** | Identificador de rastreamento | Número temporário dado a cada pessoa em cena. Vive só em memória e não identifica ninguém. |

### Arquitetura, rede e infraestrutura

| Sigla | Significado | No projeto |
|---|---|---|
| **CI** | *Continuous Integration* — Integração Contínua | Verificação automática a cada envio de código: análise estática, testes e validação do banco. Ver [`.github/README.md`](.github/README.md). |
| **API** | *Application Programming Interface* — Interface de Programação de Aplicações | O contrato pelo qual edge e frontend conversam com o backend. |
| **REST** | *Representational State Transfer* — Transferência de Estado Representacional | Estilo arquitetural das rotas HTTP da API. |
| **HTTP** | *HyperText Transfer Protocol* — Protocolo de Transferência de Hipertexto | Protocolo base da web. |
| **SPA** | *Single Page Application* — Aplicação de Página Única | O dashboard: carrega uma vez e atualiza sem recarregar a página. |
| **SSE** | *Server-Sent Events* — Eventos Enviados pelo Servidor | Alternativa ao WebSocket para o servidor empurrar alertas ao navegador. |
| **UI** | *User Interface* — Interface de Usuário | A camada visual do dashboard. |
| **URL** | *Uniform Resource Locator* — Localizador Uniforme de Recursos | Endereço de um recurso na web. |
| **RTSP** | *Real Time Streaming Protocol* — Protocolo de Transmissão em Tempo Real | Protocolo de transmissão de vídeo das câmeras de rede. |
| **ONVIF** | *Open Network Video Interface Forum* | Padrão de interoperabilidade entre câmeras de rede e software de vigilância. |
| **WSGI** | *Web Server Gateway Interface* — Interface de Comunicação com Servidor Web | Interface entre o servidor (Gunicorn) e a aplicação Flask. |
| **edge** | Borda | O computador instalado junto às câmeras, onde roda a 1ª IA. Processar ali evita trafegar vídeo contínuo pela rede. |
| **headless** | Sem interface gráfica | Programa que roda sem tela, só por linha de comando. É o caso do `ai_edge`. |

### Banco de dados

| Sigla | Significado | No projeto |
|---|---|---|
| **SGBD** | Sistema Gerenciador de Banco de Dados | Aqui, PostgreSQL 14 ou superior. |
| **SQL** | *Structured Query Language* — Linguagem de Consulta Estruturada | Linguagem do banco. |
| **DDL** | *Data Definition Language* — Linguagem de Definição de Dados | A parte do SQL que cria tabelas, tipos e restrições. É o conteúdo do bloco em `database/schema.sql`. |
| **PK** | *Primary Key* — Chave Primária | Identificador único de cada linha. |
| **FK** | *Foreign Key* — Chave Estrangeira | Referência de uma tabela a outra. |
| **UUID** | *Universally Unique Identifier* — Identificador Único Universal | Formato das chaves primárias; impede adivinhar registros por sequência numérica. |
| **1:N** | Um para muitos | Relação em que um registro se liga a vários. Uma evidência serve a N eventos (RF-16). |
| **ORM** | *Object-Relational Mapping* — Mapeamento Objeto-Relacional | Camada que traduz tabelas em objetos Python (SQLAlchemy). |
| **trigger** | Gatilho | Rotina que o banco dispara sozinho antes ou depois de uma operação. É como as regras de MFA e retenção são impostas. |

### Domínio hospitalar

| Sigla | Significado | No projeto |
|---|---|---|
| **EPI** | Equipamento de Proteção Individual | Máscara, luvas, avental, touca, protetor facial. O objeto do monitoramento. |
| **UTI** | Unidade de Terapia Intensiva | Uma das categorias de zona de risco. |
| **CCIH** | Comissão de Controle de Infecção Hospitalar | Setor responsável pela conformidade; corresponde a um papel de acesso no sistema. |
| **CRM** | Conselho Regional de Medicina | Registro profissional que aparece na identificação de médicos. |

### Ferramentas e ambiente

| Sigla | Significado | No projeto |
|---|---|---|
| **LFS** | *Large File Storage* — Armazenamento de Arquivos Grandes | Extensão do Git para versionar arquivos pesados, como os pesos dos modelos de IA. |
| **DVC** | *Data Version Control* — Controle de Versão de Dados | Alternativa ao Git LFS para versionar modelos e conjuntos de dados. |
| **WSL** | *Windows Subsystem for Linux* — Subsistema Windows para Linux | Permite rodar os scripts `.sh` no Windows, que é o ambiente do time. |

---

## Equipe

Projeto desenvolvido na **Campanha Senac & Sesc Saúde** — Curso Técnico em Desenvolvimento de Sistemas (Senac-RS).

| Membro                     | Frente                    | Missão                                                                                              |
| -------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| **Pedro Nadalon Klippel**  | Backend / Segurança / DB  | API Flask, 2ª IA + face match + integração hospitalar, JWT (pyjwt), persistência, cifra e expurgo LGPD. |
| **Vinicius Ferrari Niffa** | Engenharia de IA / Edge   | 1ª IA (filtro YOLO), lógica do `T_remocao` e captura/envio do snapshot da infração.                 |
| **Carlos Eduardo Cavalcante da Rocha** | Frontend Web / UI | Dashboard em tempo real, revisão/contestação da identificação automática e visualizador de dossiês. |

**Orientação:** Prof. Miguel Matiolla

---

> **Documento e código de caráter acadêmico/confidencial.** Trata **dado pessoal e biométrico sensível** sob a LGPD — não exponha evidências, *templates* faciais, segredos de MFA ou chaves de criptografia no repositório (apenas **referências** ao cofre/KMS).
