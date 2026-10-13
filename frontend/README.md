# frontend — Painel do gestor

**Em uma frase:** é o site interno onde a equipe do hospital recebe os alertas de infração em tempo real, configura as áreas de risco, revisa quem foi identificado pelo sistema e consulta os dossiês dos incidentes.

É também a parte que garante, na prática, um direito do profissional: como a identificação é feita automaticamente pela inteligência artificial, é neste painel que uma pessoa revisa essa decisão e registra uma contestação quando for o caso. Para a visão geral do sistema, veja o [README principal](../README.md).

> **Siglas desta pasta.** **SPA** — *Single Page Application*: o site carrega uma vez e atualiza as informações sem recarregar a página. **API** — as rotas do backend que o painel consome. **SSE** — *Server-Sent Events*, canal pelo qual o servidor envia atualizações ao navegador. **MFA** — autenticação multifator. **RBAC** — controle de acesso baseado em perfis. **LGPD** — Lei Geral de Proteção de Dados. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

---

## Quem usa o painel

Os perfis abaixo já estão cadastrados no banco de dados. O painel deve mostrar a cada um apenas o que o perfil permite.

| Perfil | Quem é | O que faz | Vê as imagens das infrações |
|---|---|---|---|
| Operador de Segurança | Equipe de monitoramento | Recebe e trata os alertas em tempo real | Sim |
| Enfermagem-chefe | Liderança de enfermagem | Trata alertas e conduz a revisão visual da evidência | Sim |
| Gestor de Qualidade / CCIH | Comissão de Controle de Infecção Hospitalar | Analisa relatórios agregados de conformidade | Não |
| Administrador de TI | Equipe técnica | Configura câmeras, zonas e parâmetros | Não |
| Encarregado de Dados (DPO) | Responsável pela LGPD na instituição | Audita a conformidade e o ciclo de vida das evidências | Sim — revisável pela instituição |

Todo perfil que vê imagens exige autenticação em dois fatores. No caso do Encarregado de Dados, o acesso às imagens é uma decisão de política institucional: se a instituição entender que ele deve ver apenas registros e metadados, basta retirar a permissão.

---

## Telas

Cada tela só aparece para quem tem a permissão correspondente (o backend devolve a lista em `/auth/me`).

| Tela | Permissão | Para que serve |
|---|---|---|
| **Login** | — | Usuário e senha; quem tem MFA digita em seguida o código de 6 dígitos. |
| **Painel de alertas** | `events:read` | Infrações chegando em tempo real (meta de até 3 s), filtros por setor, status e EPI, e indicadores que o banco consegue calcular. |
| **Zonas de risco** | `zones:read` / `zones:write` | Áreas monitoradas, EPIs obrigatórios e tempo de tolerância `T_remocao`. Só quem tem `zones:write` cadastra e edita. |
| **Detalhe do evento** | `events:read` | Reconhecer ou descartar o alerta; ver quem foi identificado e se foi a IA ou uma pessoa; identificar, contestar e revogar. |
| **Visualizador de evidência** | `evidence:view` | Exibe a imagem da infração. O backend exige MFA e grava cada abertura na trilha de auditoria. |
| **Dossiês** | `dossiers:read` | Lista e abertura do PDF de cada incidente, pendente ou consolidado. |
| **Auditoria** | `audit:read` | Trilha de auditoria, somente leitura. |

---

## Estado atual

**A interface está pronta para o backend e fala só com a API real.** Não há dados, usuários nem simulação de exemplo no código: tudo vem de [`docs/openapi.yaml`](../docs/openapi.yaml), o contrato entre o painel, o backend e o edge. **O backend ainda não existe**, então hoje o painel abre na tela de login e não entra: é preciso implementar a API do contrato (ver [`backend/README.md`](../backend/README.md)).

O que foi verificado: `npm run build` (inclui `tsc`) e o fluxo completo no navegador contra um servidor de teste que implementa o contrato — login em duas etapas, alertas em tempo real, reconhecer, identificar, abrir evidência, dossiê, zonas e perfis com permissões diferentes. Não foi verificado contra o backend real, nem a exibição de um PDF real, nem o contêiner Docker.

Decisões desta interface:

- **Um hospital por instalação.** Não existe `hospital_id`; o nome exibido vem de `VITE_HOSPITAL_NAME` (opcional).
- **Sessão em cookie `httpOnly`.** O JavaScript nunca vê o token; nada é guardado em `localStorage`. Requisições que alteram estado levam `X-CSRF-Token`, mantido só em memória.
- **O cliente não decide nada de segurança.** Auditoria, usuário que reconhece, consolidação do dossiê e acesso à evidência são do servidor. Esconder um botão só deixa a tela coerente.
- **Sem indicador inventado.** O painel mostra só o que o banco calcula. Não há "taxa de conformidade", porque o sistema guarda infrações, não passagens conformes.
- **Imagem e PDF** vêm por requisição autenticada, ficam só na memória do navegador (blob revogado ao sair da tela) e o servidor responde com `Cache-Control: no-store`.

---

## Responsável

**Carlos Eduardo Cavalcante da Rocha** — Frontend web e interface.

---

## Como o código está organizado

Tecnologias: React, Vite, TypeScript, Tailwind CSS e Socket.IO (cliente).

| Arquivo | Responsabilidade |
|---|---|
| `index.html`, `src/main.tsx`, `src/App.tsx` | Montagem do React, escolha entre login e painel, navegação entre telas. |
| `src/api/http.ts` | Camada HTTP: cookie de sessão, `X-CSRF-Token`, erros do contrato e tratamento de sessão expirada. |
| `src/api/endpoints.ts` | Uma função tipada por rota de `docs/openapi.yaml`. |
| `src/store/authStore.ts` | Sessão e permissões do usuário (`useAuth`). |
| `src/hooks/useRealtimeAlerts.tsx` | Carga inicial e canal Socket.IO `/alerts`; mantém eventos, zonas e indicadores. |
| `src/hooks/` (demais) | `useAsync`, `usePagedList` ("carregar mais"), `useNow` e `useEscape`. |
| `src/pages/` | `Login`, `Dashboard`, `Zones`, `EventDetail`, `EvidenceViewer`, `Dossiers` e `AuditLogs`. |
| `src/components/` | `Navbar`, `AlertCard`, `DataTable`, `PdfModal`, `StateMessage` (carregando/erro) e `icons`. |
| `src/types/index.ts` | Tipos que espelham o contrato e o banco. |
| `src/config/app.ts` | Configuração da instalação (nome do hospital). |
| `nginx.conf` | No contêiner, serve o painel e faz proxy de `/api` e `/socket.io` para o backend, na mesma origem. |
| `.env.example` | Variáveis de ambiente do painel. |

### Estados que as telas precisam representar

Valores definidos no banco de dados, que o painel vai exibir e alterar:

| Conceito | Valores |
|---|---|
| Alerta | `PENDENTE` → `RECONHECIDO` ou `DESCARTADO` |
| Identificação | `CONFIRMADA`, `CONTESTADA`, `REVOGADA` |
| Origem da identificação | `HUMAN` (feita por uma pessoa) ou `AI` (feita pelo reconhecimento facial) |
| Dossiê | `PENDENTE` → `CONSOLIDADO` |

---

## Pontos de atenção

- **Mostrar a origem da identificação não é detalhe visual.** O art. 20 da LGPD garante revisão de decisões automatizadas, e ninguém revisa de verdade uma decisão sem saber que ela foi automatizada. A tela de detalhe precisa deixar claro quando o nome veio da IA.
- **Revisar antes ou depois do envio à diretoria ainda é uma decisão em aberto.** Um dossiê enviado e depois revogado não desfaz o dano a quem foi identificado por engano. A tela deve ser pensada para suportar uma janela de revisão prévia, se o projeto adotá-la.
- **Esconder um botão não é controle de acesso.** As permissões no navegador servem para a interface ficar coerente; quem de fato bloqueia o acesso é o backend e o banco.
- **A imagem da infração é dado pessoal.** Não deve ficar em cache do navegador nem aparecer em endereços de página: URLs vazam por histórico, registros de servidor e compartilhamento.

---

## Como executar

Com o Node.js instalado, a partir da pasta `frontend/`:

```bash
npm ci
npm run dev      # Vite em http://localhost:3000, com proxy de /api e /socket.io para http://localhost:5000
npm run build    # tsc --noEmit e build de produção
```

O painel espera o backend em `http://localhost:5000`. Sem ele, a tela de login mostra "Não foi possível contatar o servidor". No Docker (`docker compose up frontend`), o Nginx publica o painel na porta 5173 e encaminha `/api` e `/socket.io` ao serviço `backend`.
