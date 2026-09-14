# config — Configuração dos serviços

**Em uma frase:** esta pasta reúne os ajustes de funcionamento do servidor — quantos processos atendem requisições, como os registros de operação são gravados e como a aplicação encontra o banco de dados — e documenta todas as variáveis de ambiente do projeto.

Nada aqui contém senha, chave ou token. Os valores secretos ficam no arquivo `.env`, que não vai para o repositório, ou no cofre de chaves; os arquivos desta pasta trazem, no máximo, uma referência a eles. Para a visão geral do sistema, veja o [README principal](../README.md).

> **Siglas desta pasta.** **WSGI** — *Web Server Gateway Interface*, o padrão que liga um servidor web Python (aqui, o Gunicorn) à aplicação (o Flask). **KMS** — *Key Management Service*, o cofre externo das chaves de criptografia. **FPS** — quadros por segundo. **LGPD** — Lei Geral de Proteção de Dados. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

---

## Estado atual

Os três arquivos existem, mas contêm **apenas um comentário** descrevendo o que vão configurar. Serão preenchidos quando o backend tiver código para servir.

| Arquivo | O que vai configurar |
|---|---|
| `gunicorn.conf.py` | O servidor web em produção: número de processos (*workers*), tipo de processo, tempo limite e endereço de escuta. |
| `logging.yaml` | Os registros de operação: nível de detalhe por módulo, formato e rotação dos arquivos. |
| `database.example.ini` | Modelo dos parâmetros de conexão ao banco (endereço, porta, schema `vigilis`). É só uma referência; a conexão real usa a variável `DATABASE_URL`. |

Quando estiver pronto, o Gunicorn será iniciado **a partir da pasta `backend/`**, onde fica o `wsgi.py`:

```bash
cd backend
gunicorn -c ../config/gunicorn.conf.py wsgi:app
```

---

## Variáveis de ambiente

Todas as variáveis do projeto estão no [`.env.example`](../.env.example), na raiz. Para usar, copie-o para `.env` e ajuste os valores. **O `.env` nunca deve ser enviado ao repositório** — o `.gitignore` já o bloqueia.

### Banco de dados

| Variável | Exemplo | Para que serve |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/bioshield` | Endereço completo de conexão usado pelo backend. |
| `DB_SCHEMA` | `vigilis` | Schema do PostgreSQL onde estão as tabelas. |

### Backend

| Variável | Exemplo | Para que serve |
|---|---|---|
| `FLASK_ENV` | `development` | Ambiente da aplicação. Atenção: as versões atuais do Flask ignoram esta variável; o modo de depuração é ativado por `FLASK_DEBUG`. Ajustar quando o `app/config.py` for implementado. |
| `SECRET_KEY` | `troque-esta-chave` | Chave de assinatura de sessões do Flask. Precisa ser trocada por um valor aleatório e longo. |
| `JWT_SECRET_KEY` | `troque-este-jwt` | Chave de assinatura dos tokens de acesso. Mesma exigência. |

### Criptografia

| Variável | Exemplo | Para que serve |
|---|---|---|
| `KMS_PROVIDER` | `local` | Qual cofre de chaves é usado. |
| `KMS_KEY_REF` | `vault://kms/bioshield` | Referência à chave dentro do cofre. É o endereço da chave, nunca a chave em si. |

### Edge (câmeras e detecção)

| Variável | Exemplo | Para que serve |
|---|---|---|
| `CAMERA_SOURCE` | `0` | Origem do vídeo: `0` é a primeira webcam; para câmera de rede, o endereço RTSP. |
| `PROCESSING_FPS` | `15` | Quantos quadros por segundo são analisados. |
| `CNN_CONF_THRESHOLD` | `0.60` | Confiança mínima para o detector considerar um EPI presente ou ausente. |
| `T_REMOCAO_SECONDS` | `5` | Tempo de tolerância, em segundos, antes de uma ausência de EPI virar suspeita. O banco também guarda um valor por zona. |
| `BACKEND_API_URL` | `http://localhost:5000/api` | Endereço do backend para onde as suspeitas são enviadas. |

### Retenção de evidências (LGPD)

| Variável | Exemplo | Para que serve |
|---|---|---|
| `EVIDENCE_RETENTION_DAYS` | `90` | Prazo padrão de guarda das imagens. |
| `EVIDENCE_RETENTION_MAX_DAYS` | `180` | Prazo máximo. O banco recusa qualquer valor acima de 180 dias independentemente desta variável, que não pode ser usada para ampliar o limite. |

---

## Cuidados ao preencher esta pasta

- **Auditoria não é log.** A trilha de auditoria vive no banco, na tabela `audit_logs`, e seus registros não podem ser editados. O `logging.yaml` trata de registros de operação, que servem para diagnosticar problemas e não substituem a trilha.
- **Nada de dado pessoal nos logs.** Nome, matrícula, referência de evidência e resultado de reconhecimento facial não devem ser gravados em texto claro nos registros de operação.
- **Workers leves.** A 2ª IA e o reconhecimento facial são tarefas pesadas e não devem rodar dentro dos processos que atendem requisições; o número de workers deve considerar isso.
- **O edge não lê esta pasta.** O `ai_edge` se configura apenas pelas variáveis de ambiente listadas acima.
