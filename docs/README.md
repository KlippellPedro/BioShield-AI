# docs — Documentação do projeto

> **Siglas desta pasta.** **ADR** — *Architecture Decision Record*, registro de decisão de arquitetura: um documento curto que grava o contexto, a decisão tomada e suas consequências. **SRS** — *Software Requirements Specification*, a Especificação de Requisitos de Software. **DPIA / RIPD** — Relatório de Impacto à Proteção de Dados Pessoais, nos nomes internacional e da LGPD. **RF / RNF** — Requisito Funcional e Requisito Não Funcional. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

Documentos de engenharia e de entrega do BioShield AI. O que está aqui é a base normativa do projeto: quando o código e o documento discordarem, é o documento que precisa ser atualizado ou o código corrigido — não os dois seguindo caminhos separados.

## Conteúdo atual

| Arquivo | Conteúdo |
|---|---|
| `architecture.md` | As ADRs, no formato Contexto, Decisão e Consequência. Cobre monorepo, evidência 1:N, retenção, MFA, auditoria, dossiê, chaves UUID, a arquitetura web em cascata (ADR-009) e a identificação automatizada por face match (ADR-010). |
| `SRS_v1.4_emenda.md` | Delta formal entre o SRS v1.3 e a v1.4: quais requisitos a ADR-010 contraria (RF-15, RF-17, §1.2, §6.1), as seções novas propostas e como aplicar a emenda no documento oficial. Existe porque a implementação hoje diverge do SRS vigente, e essa divergência precisa estar assumida por escrito. |
| `DPIA_RIPD.md` | Relatório de Impacto à Proteção de Dados. Mapeia o tratamento estágio a estágio, avalia necessidade e proporcionalidade, lista nove riscos com suas medidas e fixa as cinco condições para operar com dado real. Rascunho de engenharia — depende de revisão jurídica. |

## O que ainda entra aqui

| Arquivo previsto | Conteúdo |
|---|---|
| `SRS_BioShield_AI_v1.4.pdf` | O documento oficial republicado, aplicando o que está em `SRS_v1.4_emenda.md`. Enquanto não existir, **a v1.3 segue sendo a versão oficial** e a emenda é o registro explícito da divergência. |
| `pitch_BioShield_AI.pptx` | Apresentação do projeto. |

## Observação sobre binários

PDF e PPTX não são versionados por padrão. Confira o `.gitignore` antes de adicioná-los, ou use Git LFS se quiser mantê-los no histórico sem inchar o repositório.

## Leitura recomendada, nesta ordem

1. [`architecture.md`](architecture.md) — ADR-009 e ADR-010 explicam por que o sistema tem a forma que tem hoje.
2. [`database/README.md`](../database/README.md) e o dicionário de dados em `database/schema.sql` — é a parte já implementada.
3. Os READMEs de cada frente: [`ai_edge/`](../ai_edge/README.md), [`backend/`](../backend/README.md), [`frontend/`](../frontend/README.md).
