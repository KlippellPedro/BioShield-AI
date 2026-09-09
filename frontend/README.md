# frontend — Dashboard do gestor

> **Siglas desta pasta.** **SPA** — *Single Page Application*, aplicação de página única: carrega uma vez e atualiza o conteúdo sem recarregar a página. **UI** — *User Interface*, a interface de usuário. **API** — a interface do backend que esta aplicação consome. **SSE** — *Server-Sent Events*, canal em que o servidor empurra atualizações ao navegador. **MFA** — Autenticação Multifator. **RBAC** — Controle de Acesso Baseado em Papéis. **LGPD** — Lei Geral de Proteção de Dados. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

SPA web onde a gerência hospitalar acompanha alertas em tempo real, gerencia zonas de risco, **revisa a identificação automática** dos profissionais e acessa os dossiês. Tecnologias: React, Vite (servidor de desenvolvimento e empacotador), TypeScript e Tailwind CSS. Consome a API REST e o canal de tempo real do [`backend/`](../backend/README.md).

Esta é a frente que dá corpo à salvaguarda do art. 20 da LGPD: como a identificação passou a ser automática (ADR-010), é aqui que o ser humano entra para revisar e, se for o caso, contestar o que a IA decidiu.

## Estado atual

Esqueleto. `package.json`, `vite.config.ts` e `tsconfig.json` existem, mas as dependências ainda não foram declaradas (`dependencies` e `devDependencies` estão vazias) e todos os componentes e páginas são placeholders de uma linha. O primeiro passo concreto é instalar React, Vite, TypeScript, Tailwind e axios e fazer o `npm run dev` subir de fato.

## Missão — Carlos (Frontend Web / UI)

- **Dashboard em tempo real:** consumo de WebSocket ou SSE para exibir os alertas em até 3 s (RNF-05, Requisito Não Funcional 05).
- **Revisão e oversight:** com a identificação feita automaticamente pela IA, o gestor revisa e confirma o resultado antes ou depois do despacho, atuando como controle humano da decisão automatizada (LGPD art. 20).
- **Contestação:** tela para registrar a contestação de uma identificação (`identifications` passando a CONTESTADA ou REVOGADA).
- **Auditoria e relatórios:** visualizador restrito da evidência e tela dos dossiês (PDF, ciclo PENDENTE/CONSOLIDADO).

## Estrutura de `src/`

| Pasta/arquivo | Responsabilidade |
|---|---|
| `main.tsx` / `App.tsx` | Bootstrap do React e definição de rotas. |
| `api/client.ts` | Cliente HTTP (axios) com *interceptor* — a camada que anexa o token de sessão a cada requisição e trata o desafio de MFA. |
| `hooks/useRealtimeAlerts.ts` | Assina o canal WebSocket/SSE de alertas. |
| `store/authStore.ts` | Estado global de sessão e permissões (RBAC no lado do cliente). |
| `pages/Login.tsx` | Login e desafio de MFA. |
| `pages/Dashboard.tsx` | Alertas em tempo real e indicadores de conformidade. |
| `pages/Zones.tsx` | Gestão de zonas de risco e parâmetros (EPIs obrigatórios, `T_remocao`). |
| `pages/EventDetail.tsx` | Revisão da identificação automática e acknowledge; aciona a contestação (art. 20). |
| `pages/EvidenceViewer.tsx` | Visualização restrita do *snapshot*; cada abertura gera um registro `EVIDENCE_VIEW` na trilha de auditoria. |
| `pages/Dossiers.tsx` | Fila e download dos dossiês PDF (PENDENTE/CONSOLIDADO). |
| `components/` | Componentes reutilizáveis (`AlertCard`, `DataTable`). |
| `styles/index.css` | Tailwind e estilos base. |
| `public/favicon.svg` | Ícone da aplicação. |

## O que ainda entra aqui

- Declaração das dependências no `package.json` e configuração do Tailwind.
- Uma tela ou seção que deixe visível **quando a identificação veio da IA e quando veio de um humano** — o banco já distingue os dois casos em `identifications.source`, e essa distinção precisa aparecer para o gestor. Revisar uma decisão automatizada sem saber que ela foi automatizada não cumpre o art. 20.
- Testes das telas de revisão e contestação, que são o caminho crítico da conformidade.

## Como rodar (dev)

```bash
npm install
npm run dev      # sobe o Vite; o proxy para a API é configurado em vite.config.ts
```

## Pontos de atenção

- O RBAC no cliente é **conveniência de interface, não controle de acesso**. Esconder um botão não protege nada: o acesso à evidência e à revisão exige usuário autenticado com MFA e papel autorizado, e quem recusa o resto é o backend.
- A evidência é dado pessoal identificável. Não a mantenha em cache no navegador nem a exponha em URL (*Uniform Resource Locator*, o endereço da página) — endereços vazam por histórico, log de servidor e barra de compartilhamento.
