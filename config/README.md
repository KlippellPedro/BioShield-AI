# config — Configuração de serviço

> **Siglas desta pasta.** **WSGI** — *Web Server Gateway Interface*, a interface padrão entre um servidor web Python (aqui, o Gunicorn) e a aplicação (o Flask). **KMS** — *Key Management Service*, o cofre externo das chaves de criptografia. **LGPD** — Lei Geral de Proteção de Dados. **RNF-14** — o Requisito Não Funcional da trilha de auditoria imutável. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

Parâmetros de infraestrutura que não pertencem a nenhuma das três frentes isoladamente: como o servidor WSGI sobe, como a aplicação loga e como ela se conecta ao banco. Tudo aqui é **configuração sem segredo** — chaves, senhas e tokens ficam no `.env` (não versionado) ou no cofre/KMS, e estes arquivos carregam no máximo a *referência* a eles.

## Conteúdo atual

| Arquivo | Papel |
|---|---|
| `gunicorn.conf.py` | Configuração do servidor WSGI em produção: número de *workers* (processos que atendem requisições em paralelo), classe de worker, tempo limite e endereço de escuta. Consumido por `gunicorn -c config/gunicorn.conf.py wsgi:app`. |
| `logging.yaml` | Política de logs: níveis por módulo, formato e rotação. |
| `database.example.ini` | Modelo dos parâmetros de conexão (host, porta, schema `vigilis`). Serve de referência; a conexão real vem da `DATABASE_URL` do `.env`. |

Os três são hoje **placeholders de uma linha**, com o comentário que descreve o que vai neles.

## O que ainda entra aqui

- Preenchimento efetivo do `gunicorn.conf.py` quando o backend tiver rotas para servir — o número de workers precisa levar em conta que a 2ª IA e o face match são tarefas pesadas e provavelmente não devem rodar no processo web.
- Configuração de log que trate a **trilha de auditoria como coisa distinta do log de aplicação**: `audit_logs` é imutável e vive no banco (RNF-14); o log de arquivo é operacional e não substitui a trilha.
- Cuidado específico de LGPD no formato de log: nome, matrícula, referência de evidência e resultado de face match **não** devem ir para log em texto claro.

## Convenção

Nada neste diretório deve ser lido diretamente pelo `ai_edge/` — o edge se configura pelo `.env` da raiz (`CAMERA_SOURCE`, `PROCESSING_FPS`, `T_REMOCAO_SECONDS`, `BACKEND_API_URL`). Este diretório é de responsabilidade do backend e da infra.
