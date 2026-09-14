# docs — Documentação do projeto

**Em uma frase:** aqui estão os documentos que explicam por que o BioShield AI foi construído do jeito que foi, quais riscos à privacidade ele traz e como a especificação do sistema precisa mudar.

Não é preciso saber programar para ler estes documentos. Para a visão geral do sistema, comece pelo [README principal](../README.md).

> **Siglas desta pasta.** **ADR** — *Architecture Decision Record*: um documento curto que registra uma decisão de arquitetura, o contexto em que foi tomada e suas consequências. **SRS** — *Software Requirements Specification*, a especificação formal do que o sistema deve fazer. **RIPD / DPIA** — Relatório de Impacto à Proteção de Dados Pessoais, pelos nomes da LGPD e internacional. **RF / RNF** — requisito funcional (o que o sistema faz) e requisito não funcional (qualidades como desempenho e segurança). Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

---

## Os documentos

| Documento | O que responde | Para quem |
|---|---|---|
| [Decisões de arquitetura](architecture.md) | Por que o sistema é web e não um programa instalado, por que usa duas IAs, por que as regras de segurança ficam no banco, entre outras escolhas | Desenvolvimento e avaliação técnica |
| [Relatório de Impacto à Proteção de Dados](DPIA_RIPD.md) | Quais dados pessoais o sistema trata, quais riscos isso traz aos profissionais e aos pacientes, e o que precisa ser resolvido antes de uso real | Saúde, jurídico, gestão e avaliação |
| [Emenda ao SRS para a v1.4](SRS_v1.4_emenda.md) | O que muda na especificação de requisitos agora que a identificação é automática | Avaliação e gestão do projeto |

---

## As decisões de arquitetura

| ADR | Decisão, em resumo |
|---|---|
| 001 | Um único repositório com três partes separadas: edge, backend e frontend. |
| 002 | Uma imagem de infração pode servir a vários eventos do mesmo instante, para não capturar a mesma pessoa várias vezes. |
| 003 | A identificação seria sempre feita por uma pessoa. **Superada pela ADR-010** e mantida como histórico. |
| 004 | Evidências têm prazo de guarda limitado — 90 dias por padrão, nunca mais de 180 — e são apagadas ao vencer. |
| 005 | Quem vê imagens de infração precisa de autenticação em dois fatores, com a regra imposta pelo banco. |
| 006 | A trilha de auditoria não pode ser alterada nem apagada. |
| 007 | O dossiê nasce pendente e só é consolidado depois que o profissional é identificado. |
| 008 | Identificadores aleatórios (UUID) nas tabelas, para impedir adivinhar registros pela sequência. |
| 009 | Sistema web com IA em cascata: um filtro rápido junto às câmeras e a análise pesada no servidor. |
| 010 | A identificação passa a ser automática, por reconhecimento facial — com as consequências legais que isso traz. |

---

## Por que existe uma emenda ao SRS

A especificação oficial vigente é a **v1.3**, e ela proibia reconhecimento facial e identificação automática. A ADR-010 mudou exatamente isso. Enquanto a versão oficial não for republicada como v1.4, a emenda registra por escrito, requisito por requisito, onde a implementação diverge da especificação — para que a divergência seja uma decisão assumida e não uma inconsistência escondida.

O documento SRS v1.3 original não está neste repositório.

---

## O que ainda entra aqui

| Documento previsto | Conteúdo |
|---|---|
| `SRS_BioShield_AI_v1.4.pdf` | A especificação oficial republicada com as mudanças da emenda. Até lá, a v1.3 continua sendo a versão válida. |
| `pitch_BioShield_AI.pptx` | Apresentação do projeto. |

**Sobre arquivos PDF e PPTX:** o `.gitignore` não bloqueia esses formatos, então eles entram no histórico do Git se forem adicionados. Para apresentações pesadas ou que mudam com frequência, vale considerar o Git LFS, que evita inchar o repositório.

---

## Uma regra para manter esta pasta útil

Quando o código e um documento discordarem, um dos dois está errado e precisa ser corrigido na mesma mudança. Documentação que descreve um sistema que não existe mais é pior do que nenhuma documentação — foi o caso da ADR-010, que registrava como pendente uma alteração do banco já aplicada, até ser corrigida.
