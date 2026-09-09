# Emenda ao SRS — da v1.3 para a v1.4

**Assunto:** incorporação da identificação automatizada por reconhecimento facial (ADR-010)
**Data:** 2026-09-09
**Status:** proposta de alteração, pendente de aplicação no documento SRS
**Origem:** diretriz de negócio de 2026-06-18 (automação total do fluxo infração → identificação → dossiê)

> **Siglas deste documento.** **SRS** — *Software Requirements Specification*, a Especificação de Requisitos de Software: o documento que define formalmente o que o sistema deve fazer. **RF** — Requisito Funcional (o que o sistema faz). **RNF** — Requisito Não Funcional (qualidades e restrições, como desempenho e segurança). **ADR** — *Architecture Decision Record*, registro de decisão de arquitetura. **DPIA / RIPD** — Relatório de Impacto à Proteção de Dados. **LGPD** — Lei Geral de Proteção de Dados. **§** — símbolo de parágrafo, usado para citar seções do SRS. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

---

## Por que esta emenda existe

A [ADR-010](architecture.md) mudou o escopo do produto: o sistema passou a **identificar automaticamente** o profissional infrator por reconhecimento facial, sem o gestor no meio. A decisão foi tomada e já está implementada no banco de dados.

O problema é que o SRS vigente é a **v1.3**, e ela diz o contrário. Vários requisitos vedavam explicitamente exatamente aquilo que hoje é o comportamento central do produto. Enquanto os dois documentos coexistirem sem reconciliação, o projeto tem uma especificação que a sua própria implementação viola — e é o tipo de contradição que uma banca encontra em cinco minutos.

Este arquivo é o **delta formal** entre as duas versões. Ele não substitui o SRS: serve para que quem for editar o documento oficial saiba exatamente o que mudar, e para que, até lá, a contradição esteja registrada e assumida em vez de silenciosa.

---

## 1. Requisitos alterados

### RF-15 — Não identificação pela IA

| | |
|---|---|
| **v1.3** | O sistema **não** realiza reconhecimento facial nem qualquer identificação biométrica. O rastreamento é anônimo, por Track ID efêmero, e a IA nunca associa uma pessoa a um nome. |
| **v1.4** | O sistema realiza reconhecimento facial **restrito ao instante da infração confirmada**, contra o cadastro de profissionais do hospital, para resolver nome e matrícula. A operação normal permanece anônima: feed com desfoque e Track IDs efêmeros. |
| **Justificativa** | ADR-010. Automação total do dossiê nominal. |
| **Impacto** | Alto. Introduz tratamento de dado biométrico, que é dado pessoal sensível (LGPD art. 5, II e art. 11). |

### RF-17 — Identificação do profissional

| | |
|---|---|
| **v1.3** | A identificação nominal é **ato exclusivamente humano**, praticado pelo gestor sobre a evidência visual, com justificativa registrada. |
| **v1.4** | A identificação pode ter **duas origens**: `HUMAN` (gestor, como na v1.3) ou `AI` (face match automático). Ambas são registradas em `identifications` com a mesma força de auditoria, e **ambas permanecem contestáveis**. |
| **Justificativa** | ADR-010. A via humana não foi removida — foi complementada. |
| **Estado** | **Já implementado** no banco: coluna `identifications.source`, constraint `chk_identification_source`, migração `2026-06-18_identification-source.sql`. |

### §1.2 — Escopo do produto

| | |
|---|---|
| **v1.3** | Escopo declarava monitoramento de conformidade **sem identificação de indivíduos**. |
| **v1.4** | O escopo passa a incluir a identificação nominal automatizada e a emissão do dossiê nominal à diretoria. |

### §6.1 — Princípios de privacidade

| | |
|---|---|
| **v1.3** | Vedava o cruzamento das imagens com qualquer cadastro nominal. |
| **v1.4** | O cruzamento passa a ser **a função central do estágio 3** do pipeline, restrito ao instante da infração confirmada e sujeito aos controles do §6.4 (novo). |

---

## 2. Seções novas propostas para a v1.4

### §6.4 — Tratamento de dado biométrico

Seção nova, sem equivalente na v1.3. Deve fixar:

- **Base legal específica** para o tratamento de dado sensível (art. 11) — a definir com o jurídico da instituição; não basta o legítimo interesse que sustentava a v1.3.
- **Relatório de Impacto (DPIA/RIPD)** como pré-condição de operação. Ver [`DPIA_RIPD.md`](DPIA_RIPD.md).
- **Minimização do template facial:** o vetor biométrico usado na comparação é dado sensível por si só. Deve ser cifrado, ter ciclo de vida próprio e ser descartado junto com a evidência.
- **Segregação:** o cadastro facial do hospital é sistema de terceiro. O BioShield consulta, não replica.

### §6.5 — Decisão automatizada e direito de revisão

Seção nova. Deve fixar:

- O titular tem direito à revisão da decisão automatizada (LGPD art. 20).
- O dashboard oferece revisão humana e contestação; `identifications.status` sustenta os estados CONTESTADA e REVOGADA.
- A interface precisa **deixar visível que a identificação foi automatizada** — revisar sem saber que houve automação não cumpre o art. 20.
- Um resultado contestado não pode seguir para despacho à diretoria sem tratamento.

### §7 — Requisito não funcional novo (RNF-20 proposto)

**Precisão mínima do face match e conduta em caso de baixa confiança.** A v1.3 não precisava disso porque não havia match automático. Sem um limiar declarado e um caminho definido para o caso "confiança insuficiente", o sistema decide sozinho o que fazer com uma identificação duvidosa — e a decisão default de qualquer implementação apressada é aceitar. Precisa ser especificado: limiar, e o que acontece abaixo dele (sugestão: cai para identificação humana, `source = 'HUMAN'`, em vez de gerar dossiê nominal automático).

---

## 3. Requisitos que **não** mudam

Vale registrar, porque a mudança de escopo poderia sugerir o contrário:

- **RF-16** (evidência 1:N) — inalterado.
- **RNF-05** (alerta em até 3 s) — inalterado, mas fica sob pressão: o face match é caro e não pode entrar no caminho crítico do alerta.
- **RNF-14** (trilha imutável) — inalterado e **mais importante**, porque agora precisa registrar também cada match facial.
- **RNF-19** (MFA para acesso à evidência) — inalterado e reforçado; o banco fechou os três flancos.
- **§6.3** (retenção 90/180 dias) — inalterado quanto a prazos, mas o expurgo passa a ter de alcançar o template facial.

---

## 4. Como aplicar esta emenda

1. Editar o SRS oficial nos pontos acima e republicar como **v1.4**.
2. Colocar o PDF em `docs/SRS_BioShield_AI_v1.4.pdf`.
3. Atualizar a linha **Base normativa** do [README](../README.md) de v1.3 para v1.4.
4. Atualizar o cabeçalho de `database/schema.sql` — já ajustado para v1.4 em antecipação a esta emenda.
5. Remover este arquivo, ou mantê-lo como registro histórico da transição.

Enquanto o passo 1 não acontecer, **a v1.3 continua sendo o documento oficial**, e esta emenda é a declaração explícita de que a implementação diverge dele de forma consciente.
