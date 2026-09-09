# backend — API, confirmação (2ª IA), identificação e segurança

> **Siglas desta pasta.** **API** — *Application Programming Interface*, o contrato pelo qual edge e frontend conversam com este serviço. **IA** — Inteligência Artificial. **MFA** — Autenticação Multifator. **RBAC** — Controle de Acesso Baseado em Papéis. **JWT** — *JSON Web Token*, o formato do token de sessão. **KMS** — *Key Management Service*, o cofre das chaves de criptografia. **LGPD** — Lei Geral de Proteção de Dados. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

Núcleo dos estágios 2 a 4 do pipeline em cascata: recebe o snapshot do edge, **reconfirma a infração** com uma 2ª IA, **identifica o profissional** por reconhecimento facial contra o cadastro do hospital, gera o **dossiê PDF nominal** e o despacha para a diretoria. Concentra também autenticação, persistência, segurança e expurgo. Ver [ADR-009](../docs/architecture.md) e [ADR-010](../docs/architecture.md).

Tecnologias: Python, Flask, SQLAlchemy (ORM, o mapeamento entre tabelas e objetos Python), Alembic (migrações), Flask-SocketIO (tempo real), PyJWT, pyotp (TOTP, o segundo fator) e ReportLab (geração de PDF).

## Estado atual

Esqueleto. A árvore de pastas está montada e cada arquivo carrega uma linha de comentário com sua responsabilidade, mas não há implementação — nem app factory, nem models, nem rotas. A tabela abaixo descreve o destino de cada arquivo, e é ela que orienta a ordem de implementação.

O banco, ao contrário do código, **já existe de fato** em [`database/`](../database/README.md). Os models de `app/models/` devem espelhar o DDL do `schema.sql` mais as migrações aplicadas em [`/migrations`](../migrations/README.md) — o schema é a fonte da verdade, não o código Python.

## Missão — Pedro (Backend / Segurança / DB)

- **2ª IA (validação de EPI):** modelo mais robusto que reconfirma, com precisão, a infração recebida do edge, cortando o falso positivo da triagem.
- **Identificação automatizada (face match):** reconhecimento facial da evidência contra o banco do hospital para resolver nome e matrícula. É **dado biométrico sensível** (ADR-010).
- **Integração hospitalar:** serviço de acesso ao cadastro oficial de profissionais.
- **Dossiê e despacho:** geração do PDF nominal consolidado e envio à diretoria.
- **Segurança e LGPD:** JWT, RBAC e MFA, criptografia em repouso por referência ao KMS, expurgo por retenção e tratamento reforçado do dado biométrico — sujeito a Relatório de Impacto (DPIA/RIPD) e ao art. 20, que garante revisão e contestação.

## Estrutura de `app/`

| Pasta/arquivo | Responsabilidade |
|---|---|
| `__init__.py` | App factory: cria o Flask, registra blueprints e extensões. |
| `extensions.py` | SQLAlchemy, Migrate, JWT, SocketIO, Marshmallow. |
| `config.py` | Configurações de Dev, Prod e Test a partir do ambiente. |
| `models/` | Mapeamento SQLAlchemy do schema `vigilis`, um arquivo por entidade (`user`, `zone`, `event`, `evidence`, `identification`, `dossier`, `audit_log`). |
| `api/` (blueprints) | *Blueprint* é a forma do Flask de agrupar rotas relacionadas em um módulo. |
| `api/` | Blueprints REST: `auth`, `event` (ingestão da imagem do edge), `evidence`, `identification`, `dossier`, `zone`, `report`. |
| `services/epi_validation_service.py` | 2ª IA — reconfirma a infração de EPI vinda do edge. |
| `services/face_match_service.py` | Reconhecimento facial contra o cadastro do hospital. |
| `services/hospital_registry_service.py` | Integração com o cadastro de profissionais (nome, matrícula). |
| `services/pdf_service.py` | Gera o dossiê PDF nominal consolidado e despacha à diretoria. |
| `services/` (demais) | `audit`, `rules`, `evidence`, `identification`, `retention`, `auth`. |
| `schemas/` | Serialização e validação de payloads. Hoje só tem o `__init__.py`. |
| `sockets/events_socket.py` | Envio de alertas em tempo real ao dashboard, por WebSocket (limite de 3 s, RNF-05). |
| `utils/crypto.py` | Cifra em repouso por referência ao KMS. A chave em si nunca fica aqui nem no banco. |
| `utils/decorators.py` | `@require_role`, `@require_mfa`. |
| `../models/` | Pesos da 2ª IA e do modelo de comparação facial. Versionar por Git LFS ou DVC, ferramentas para arquivos pesados. |
| `../jobs/purge_evidence.py` | Job de expurgo por retenção (90 dias por padrão, teto de 180). |
| `../tests/` | `test_auth_mfa.py` e `test_dossier_rules.py` — cobrem as duas regras que o banco também protege por trigger. A duplicação é intencional: defesa em profundidade. |

## Fluxo em cascata (estágios 2 a 4)

```
[edge] imagem + metadados
   -> (2) epi_validation_service: confirma a infração?
        -> (3) face_match_service + hospital_registry_service: resolve nome/matrícula
             -> (4) pdf_service: dossiê nominal consolidado -> despacho à diretoria
```

## Pontos de atenção (LGPD e SRS)

- **Dado biométrico é dado sensível** (LGPD art. 5, II e art. 11): exige Relatório de Impacto (DPIA/RIPD), base legal específica, cifra e minimização do *template* facial — o vetor numérico extraído do rosto para comparação (ADR-010).
- **Decisão automatizada (art. 20):** a identificação por IA permanece contestável (`identifications.status` em CONTESTADA/REVOGADA) e revisável por humano. A automação produz o dossiê, mas ele não é irrevogável.
- **Origem da identificação:** `identifications.source` aceita `HUMAN` ou `AI`, e a constraint `chk_identification_source` exige `identified_by` preenchido no primeiro caso e nulo no segundo. Quando o face match gravar a identificação, ele precisa escrever `source = 'AI'` e deixar `identified_by` nulo.
- **Acesso à evidência exige RBAC e MFA.** Cada visualização e cada match gera registro em `audit_logs`, que é imutável.
- **Peso do processamento:** a 2ª IA e o face match não devem rodar no processo web que responde ao edge. A ingestão precisa responder rápido e delegar o trabalho pesado, ou o limite de 3 s do alerta em tempo real cai junto.
- Evolução do banco: ver [`/migrations`](../migrations/README.md).

## Como rodar (dev)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
flask --app app db upgrade                          # quando o Alembic estiver ativo
gunicorn -c ../config/gunicorn.conf.py wsgi:app     # ou: flask --app wsgi run --debug
```

> Enquanto os models forem placeholders, o `db upgrade` não tem o que aplicar. Carregue o banco pelo caminho de [`database/README.md`](../database/README.md).
