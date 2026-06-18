# 🖥️ frontend — Dashboard do Gestor

Interface web onde a gerência hospitalar acompanha alertas em tempo real, gerencia zonas de risco, faz o **reconhecimento humano** dos profissionais e acessa os dossiês. Stack: **React + Vite + TypeScript + Tailwind CSS**.

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
| `pages/EventDetail.tsx` | Acknowledge + **identificação humana** (nome/matrícula). |
| `pages/EvidenceViewer.tsx` | Visualização restrita do snapshot (gera `EVIDENCE_VIEW`). |
| `pages/Dossiers.tsx` | Fila e download dos dossiês PDF (PENDENTE/CONSOLIDADO). |
| `components/` | Componentes reutilizáveis (`AlertCard`, `DataTable`). |
| `styles/` | Tailwind + estilos base. |

## Como rodar (dev)

```bash
npm install
npm run dev      # sobe o Vite (proxy para a API do backend configurado em vite.config.ts)
```

> O acesso à evidência e à identificação exige usuário autenticado com MFA e papel autorizado — o backend recusa o restante.
