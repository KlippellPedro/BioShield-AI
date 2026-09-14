# .github — Integração contínua

**Em uma frase:** a cada alteração enviada ao GitHub, um servidor cria um ambiente limpo e verifica automaticamente se o projeto continua funcionando — para que um erro seja percebido na hora, e não semanas depois.

Essa prática se chama **integração contínua** (CI, de *Continuous Integration*). Os passos ficam descritos em arquivos chamados *workflows*, executados pelo GitHub Actions. Para a visão geral do sistema, veja o [README principal](../README.md).

> **Termos desta pasta.** **CI** — Integração Contínua. **workflow** — arquivo que descreve os passos da verificação. **job** — um conjunto de passos executado numa máquina limpa. **análise estática** (*lint*) — leitura automática do código em busca de erros, sem executá-lo. **push** — envio de alterações ao GitHub. **pull request** — pedido para incorporar um conjunto de alterações. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

---

## Os quatro workflows

| Workflow | Situação | O que verifica |
|---|---|---|
| [`database-ci.yml`](workflows/database-ci.yml) | [![database-ci](https://github.com/KlippellPedro/BioShield-AI/actions/workflows/database-ci.yml/badge.svg)](https://github.com/KlippellPedro/BioShield-AI/actions/workflows/database-ci.yml) | Cria o banco, aplica as migrações, roda a demonstração e exige que as sete proteções recusem o que devem recusar. |
| [`backend-ci.yml`](workflows/backend-ci.yml) | [![backend-ci](https://github.com/KlippellPedro/BioShield-AI/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/KlippellPedro/BioShield-AI/actions/workflows/backend-ci.yml) | Análise estática com ruff e testes com pytest. |
| [`frontend-ci.yml`](workflows/frontend-ci.yml) | [![frontend-ci](https://github.com/KlippellPedro/BioShield-AI/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/KlippellPedro/BioShield-AI/actions/workflows/frontend-ci.yml) | Verificação de tipos do TypeScript e build do Vite. |
| [`edge-ci.yml`](workflows/edge-ci.yml) | [![edge-ci](https://github.com/KlippellPedro/BioShield-AI/actions/workflows/edge-ci.yml/badge.svg)](https://github.com/KlippellPedro/BioShield-AI/actions/workflows/edge-ci.yml) | Análise estática com ruff e testes com pytest. |

### Como ler esses selos hoje

**Só o `database-ci` testa algo real.** O banco é a única parte implementada, e o workflow executa de fato as regras de segurança.

Os outros três aprovam porque ainda **não há código para verificar**. Em vez de fingir que testaram algo, eles detectam essa situação e deixam um aviso na execução: "nenhum teste coletado" no backend e no edge, "package.json sem dependências" no frontend. Quando o código chegar, passam a exigir de verdade, sem precisar de alteração.

---

## Quando cada workflow roda

- **Num push**, apenas se a alteração tocar a parte correspondente. O `database-ci` roda quando mudam `database/`, `migrations/` ou o `scripts/apply_schema.sh`; os demais, quando muda a pasta da sua aplicação. Todos rodam também quando o próprio arquivo do workflow é alterado. Um push que altera só documentação da raiz não dispara nenhum deles.
- **Num pull request**, os quatro rodam sempre.
- **Manualmente**, pela aba *Actions* do GitHub, com o botão *Run workflow*.

---

## O `database-ci` em detalhe

É o mais importante, porque o banco concentra as garantias de segurança e de proteção de dados do projeto. Em ordem, ele:

1. sobe um PostgreSQL 16 temporário;
2. cria o banco, aplica as migrações e roda a demonstração do `seed.sql`;
3. **falha** se alguma das sete operações proibidas for aceita, ou se menos de sete bloqueios responderem — o que denunciaria uma proteção removida por engano;
4. reaplica as migrações duas vezes, para provar que podem ser executadas de novo sem erro;
5. reexecuta a demonstração e confere que nenhum dado foi duplicado.

---

## Cuidados

- **Nenhum dado real, nenhum modelo de IA.** Os testes devem usar dados simulados. Por isso o `edge-ci` não instala Ultralytics nem OpenCV: testar a regra de tempo da detecção não exige modelo nem câmera.
- **Nenhum segredo nos arquivos.** Nenhum workflow usa credenciais hoje. Se algum passar a precisar, ela deve ser cadastrada nos *secrets* do repositório no GitHub, nunca escrita no arquivo.
- **A senha do banco no `database-ci`** é de um container temporário, destruído ao fim da execução. Não reaproveite esse padrão em outro contexto.

---

## O que ainda entra aqui

- Um passo que teste o expurgo de evidências vencidas, quando `backend/jobs/purge_evidence.py` for implementado.
- Medição de cobertura de testes, quando houver testes suficientes para o número dizer alguma coisa.
