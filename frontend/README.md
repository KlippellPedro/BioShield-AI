# 🖥️ frontend — Dashboard do Gestor

SPA web onde a gerência hospitalar acompanha alertas em tempo real, gerencia zonas de risco, **revisa a identificação automática** dos profissionais e acessa os dossiês. Stack: **React + Vite + TypeScript + Tailwind CSS**. Consome a API e o canal de tempo real do `backend/`.

## 🎯 Missão — Murilo (Frontend Web / UI)

- **Dashboard em tempo real:** consumo de **WebSockets/SSE** para exibir os alertas em ≤ 3 s (RNF-05).
- **Revisão/oversight:** com a identificação feita automaticamente pela IA (face match), o gestor **revisa e confirma** o resultado antes/depois do despacho — atua como controle humano da decisão automatizada (LGPD art. 20).
- **Contestação:** tela para registrar a **contestação** de uma identificação pelo titular (`identifications` → CONTESTADA/REVOGADA).
- **Auditoria e relatórios:** visualizador restrito da evidência e tela dos **dossiês** (PDF, ciclo PENDENTE/CONSOLIDADO).

## Estrutura de `src/`

| Pasta/arquivo | Responsabilidade |
|---|---|
| `main.tsx` / `App.tsx` | Bootstrap do React e definição de rotas. |
| `api/client.ts` | Cliente HTTP (axios) com interceptor de token/MFA. |
| `hooks/useRealtimeAlerts.ts` | Assina o canal WebSocket/SSE de alertas. |
| `store/authStore.ts` | Estado global de sessão e permissões (RBAC no cliente). |
| `pages/Login.tsx` | Login + desafio de MFA. |
| `pages/Dashboard.tsx` | Alertas em tempo real + indicadores de conformidade. |
| `pages/Zones.tsx` | Gestão de zonas de risco e parâmetros. |
| `pages/EventDetail.tsx` | **Revisão** da identificação automática + acknowledge; aciona **contestação** (art. 20). |
| `pages/EvidenceViewer.tsx` | Visualização restrita do snapshot (gera `EVIDENCE_VIEW`). |
| `pages/Dossiers.tsx` | Fila e download dos dossiês PDF (PENDENTE/CONSOLIDADO). |
| `components/` | Componentes reutilizáveis (`AlertCard`, `DataTable`). |
| `styles/` | Tailwind + estilos base. |

## Como rodar (dev)

```bash
npm install
npm run dev      # sobe o Vite (proxy para a API do backend configurado em vite.config.ts)
```

> O acesso à evidência e à revisão da identificação exige usuário autenticado com MFA e papel autorizado — o backend recusa o restante.
