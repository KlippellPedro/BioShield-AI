# backend — Servidor: confirmação, identificação, dossiê e segurança

**Em uma frase:** é o servidor central que recebe as suspeitas enviadas pelas câmeras, confirma com uma segunda inteligência artificial se houve mesmo infração, identifica o profissional, gera o dossiê do incidente e controla quem pode ver cada informação.

Tudo o que envolve dado sensível passa por aqui: a imagem nítida, o reconhecimento facial, o nome e a matrícula. Concentrar isso num único serviço é uma decisão de projeto — é mais fácil proteger e auditar um lugar do que vários. Para a visão geral do sistema, veja o [README principal](../README.md).

> **Siglas desta pasta.** **API** — *Application Programming Interface*, o conjunto de rotas pelo qual o edge e o painel conversam com este servidor. **IA** — Inteligência Artificial. **MFA** — autenticação multifator. **RBAC** — controle de acesso baseado em perfis. **JWT** — *JSON Web Token*, o formato do token de sessão. **KMS** — *Key Management Service*, o cofre externo das chaves de criptografia. **ORM** — mapeamento entre tabelas do banco e objetos Python. **LGPD** — Lei Geral de Proteção de Dados. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

---

## O que esta parte faz

É onde acontecem os estágios 2 a 4 do pipeline:

```
[edge] imagem da suspeita + dados do ocorrido
   -> (2) 2ª IA: a infração se confirma?          não -> descarta
        -> (3) reconhecimento facial contra o cadastro do hospital -> nome e matrícula
             -> (4) dossiê PDF do incidente -> envio à diretoria
```

Além disso, o backend:

- **autentica** os usuários do painel, com segundo fator obrigatório para quem vê evidências;
- **empurra os alertas em tempo real** para o painel, com meta de até 3 segundos (RNF-05);
- **registra na trilha de auditoria** os acessos e as ações sobre evidências e identificações;
- **cifra** imagens e dossiês em repouso, com chaves guardadas fora do banco;
- **apaga** as evidências vencidas, conforme o prazo de retenção.

---

## Estado atual

**Estruturado, ainda sem implementação.** Todas as pastas e arquivos abaixo existem e declaram, num comentário, a responsabilidade que terão. Não há ainda aplicação Flask, modelos, rotas nem testes com código — os dois arquivos de `tests/` também são só comentários. O `Dockerfile` é um modelo comentado.

Duas escolhas técnicas continuam em aberto: **o modelo da 2ª IA** e **a biblioteca de reconhecimento facial**. Nenhuma das duas consta ainda do `requirements.txt`.

O que já existe de fato é o banco de dados, em [`database/`](../database/README.md). Os modelos em `app/models/` devem espelhar aquele schema, e não o contrário: o banco é a fonte da verdade, e várias regras de segurança já estão impostas lá.

---

## Responsável

**Pedro Nadalon Klippel** — Backend, segurança e banco de dados.

---

## Como o código está organizado

| Arquivo ou pasta | Responsabilidade |
|---|---|
| `wsgi.py` | Ponto de entrada usado pelo servidor Gunicorn. |
| `app/__init__.py` | Cria a aplicação Flask e registra rotas e extensões. |
| `app/extensions.py` | Instâncias compartilhadas: SQLAlchemy, Flask-Migrate, JWT, SocketIO e Marshmallow. |
| `app/config.py` | Configurações de desenvolvimento, produção e teste, lidas das variáveis de ambiente. |
| `app/models/` | Uma classe por tabela do schema `vigilis`: `user`, `zone`, `event`, `evidence`, `identification`, `dossier`, `audit_log`. |
| `app/api/` | Rotas REST agrupadas por assunto (*blueprints*, no vocabulário do Flask): `auth`, `event`, `evidence`, `identification`, `dossier`, `zone` e `report`. A rota de eventos também recebe as suspeitas enviadas pelo edge. |
| `app/services/epi_validation_service.py` | A 2ª IA: reconfirma a infração. |
| `app/services/face_match_service.py` | Reconhecimento facial contra o cadastro do hospital. |
| `app/services/hospital_registry_service.py` | Consulta ao cadastro oficial de profissionais do hospital. |
| `app/services/pdf_service.py` | Geração do dossiê em PDF e envio à diretoria. |
| `app/services/` (demais) | `audit`, `auth`, `evidence`, `identification`, `retention` e `rules`. |
| `app/schemas/` | Validação e serialização dos dados que entram e saem da API. |
| `app/sockets/events_socket.py` | Canal de alertas em tempo real para o painel. |
| `app/utils/crypto.py` | Cifra em repouso usando chaves do KMS. A chave nunca fica no código nem no banco. |
| `app/utils/decorators.py` | `@require_role`, `@require_mfa` e `@audit_action`, para proteger rotas e registrar ações. |
| `jobs/purge_evidence.py` | Tarefa agendada que apaga as evidências vencidas (90 dias por padrão, nunca mais de 180). |
| `models/` | Pesos da 2ª IA e do modelo facial. Devem ser versionados com Git LFS ou DVC. |
| `tests/` | `test_auth_mfa.py` e `test_dossier_rules.py`, previstos para verificar na aplicação as mesmas regras que o banco já impõe. A redundância é intencional: defesa em profundidade. |

### Tecnologias

Declaradas em `requirements.txt`, ainda sem versão fixada: Flask, Flask-SQLAlchemy, Flask-Migrate (Alembic), Flask-JWT-Extended (que usa PyJWT), Flask-SocketIO, Marshmallow, psycopg2, pyotp, ReportLab, python-dotenv e Gunicorn.

---

## Regras que o código precisa respeitar

Estas regras já estão garantidas no banco de dados. O backend deve tratá-las também, para devolver mensagens claras em vez de erros do PostgreSQL.

- **Origem da identificação.** Toda identificação grava se veio de uma pessoa (`HUMAN`) ou da IA (`AI`). Quando o reconhecimento facial registrar um resultado, deve usar `source = 'AI'` e deixar `identified_by` vazio; a restrição `chk_identification_source` recusa qualquer combinação diferente.
- **Contestação.** Uma identificação pode passar de `CONFIRMADA` para `CONTESTADA` ou `REVOGADA`. É isso que garante o direito de revisão da decisão automatizada (LGPD, art. 20).
- **Acesso à evidência.** Só perfis com `can_view_evidence` e usuários com MFA ativo. O banco impede, por três gatilhos, que essa regra seja contornada por alteração do usuário, do vínculo ou do perfil.
- **Dossiê consolidado.** Só pode ser marcado como consolidado depois que o evento tiver nome e matrícula do profissional.
- **Retenção.** Nenhuma evidência pode ser gravada com prazo acima de 180 dias.

---

## Pontos de atenção

- **Dado biométrico é dado sensível** (LGPD, arts. 5º, II, e 11). O *template* facial — o vetor numérico extraído do rosto para comparação — precisa ser cifrado, mantido pelo menor tempo possível e apagado junto com a evidência. O tratamento depende de base legal ainda não definida; ver o [Relatório de Impacto](../docs/DPIA_RIPD.md).
- **O reconhecimento facial ainda não tem onde ser auditado.** A [ADR-006](../docs/architecture.md) exige prova durável de cada comparação facial, mas o tipo `audit_action` do banco não tem uma ação para isso: as ações de identificação existentes foram pensadas para o fluxo humano. É preciso adicionar essa ação por migração antes de implementar o `face_match_service`.
- **O trabalho pesado não pode rodar na requisição.** A 2ª IA e o reconhecimento facial devem ser executados fora do processo que responde ao edge. Se a rota de recebimento esperar pela análise, o alerta em tempo real deixa de caber nos 3 segundos.
- **O contrato da API está proposto em [`docs/openapi.yaml`](../docs/openapi.yaml)**, incluindo `POST /api/edge/events` (o que o edge envia) e o mapeamento de permissões por papel. Ele ainda precisa ser revisado e aceito pelo Vinicius (edge) e pelo Carlos (painel); o painel já foi escrito em cima dele.

---

## Como executar

Não há aplicação para executar ainda. Quando houver, a partir desta pasta:

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
gunicorn -c ../config/gunicorn.conf.py wsgi:app     # ou, em desenvolvimento: flask --app wsgi run --debug
```

Para ter o banco de dados funcionando agora, siga [Como executar](../README.md#como-executar) no README principal — só exige Docker.
