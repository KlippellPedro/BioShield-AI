# .github — Integração contínua (CI)

> **Siglas desta pasta.** **CI** — *Continuous Integration*, Integração Contínua: a cada envio de código, um servidor roda automaticamente a análise estática, os testes e a validação do banco, para que um erro não chegue à branch principal sem ser notado. **workflow** — o arquivo YAML que descreve esses passos. **job** — um bloco de passos que roda numa máquina limpa. **lint** — análise estática que aponta erros e desvios de estilo sem executar o código. **pull request** — proposta de mesclar um conjunto de mudanças. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

Automação executada pelo GitHub Actions a cada envio de código (*push*) e a cada *pull request*. O objetivo é modesto e proposital: garantir que o que entra na `main` **compila e passa nos testes**, sem transformar a CI num projeto paralelo.

## Conteúdo atual

| Workflow | Papel |
|---|---|
| `workflows/database-ci.yml` | Sobe um PostgreSQL de serviço, aplica baseline, migrações e seed, e **exige que as cinco proteções de negócio barrem o que devem barrar**. Verifica ainda que as migrações são idempotentes e que o seed não duplica dado ao ser reexecutado. |
| `workflows/backend-ci.yml` | Análise estática (ruff) e testes (pytest) do backend. |
| `workflows/frontend-ci.yml` | Verificação de tipos e build do frontend. |
| `workflows/edge-ci.yml` | Análise estática e testes do `ai_edge`. |

### Por que o workflow de banco é o mais importante

O banco é a única frente implementada, e é nele que moram as garantias de LGPD e RNF-19 — os três triggers de MFA, a imutabilidade da auditoria, o teto de retenção e a coerência da origem da identificação. O `seed.sql` funciona como suíte de aceitação: tenta cinco operações que **devem** ser rejeitadas e imprime `FALHA DO TESTE` se alguma passar. O workflow quebra o build nesse caso e também se o número de bloqueios confirmados cair abaixo de cinco — o que pegaria uma guarda removida do schema por acidente.

### Comportamento durante a fase de esqueleto

Backend, frontend e edge ainda não têm código. Em vez de fingir sucesso, os workflows detectam esse estado e emitem um **aviso** explícito (pytest sem testes coletados, `package.json` sem dependências). Assim que houver código real, eles passam a exigir de verdade, sem precisar de alteração.

## O que ainda entra aqui

- Um job que rode o expurgo de retenção contra dados vencidos, quando `jobs/purge_evidence.py` sair do esqueleto. É a verificação que falta para fechar o ciclo de vida do dado pessoal na CI.
- Cobertura de teste como métrica, quando houver testes suficientes para o número significar algo.

## Cuidados

- A CI **não** deve baixar pesos de modelo (`.pt`/`.onnx`) nem tocar em evidência: os testes precisam rodar com dublês, não com dado real. O `edge-ci.yml` deliberadamente não instala `ultralytics`/`opencv` por isso — testar a máquina de estados do `T_remocao` não exige modelo nem câmera.
- Nenhum secret do projeto está configurado neste repositório. Se algum workflow passar a precisar de credencial, ela vai em *repository secrets*, nunca no YAML.
- A senha do PostgreSQL no `database-ci.yml` é de um container efêmero de CI, descartado ao fim do job. Não reaproveite esse padrão fora daqui.
