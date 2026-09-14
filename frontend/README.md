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

## Telas previstas

| Tela | Para que serve |
|---|---|
| **Login** | Entrada com usuário, senha e segundo fator. |
| **Painel de alertas** | Infrações chegando em tempo real — meta de até 3 segundos após a detecção — e indicadores de conformidade por área. |
| **Zonas de risco** | Cadastro das áreas monitoradas, dos EPIs obrigatórios de cada uma e do tempo de tolerância `T_remocao`. |
| **Detalhe do evento** | Marca o alerta como tratado, mostra quem foi identificado e se a identificação foi feita pela IA ou por uma pessoa, e permite contestá-la. |
| **Visualizador de evidência** | Exibe a imagem da infração a quem tem permissão. Cada abertura fica registrada na trilha de auditoria. |
| **Dossiês** | Lista e download dos PDFs dos incidentes, pendentes ou consolidados. |

---

## Estado atual

**Estruturado, ainda sem implementação.** Os arquivos de página e componente existem e declaram, num comentário, o que farão. O `index.html` e o `tsconfig.json` estão prontos, mas o `package.json` ainda não declara nenhuma dependência e o `vite.config.ts` é só um comentário. O `Dockerfile` também é um modelo comentado.

Na prática, **o painel ainda não abre**: `npm run dev` falha porque o Vite não está instalado. O primeiro passo concreto é declarar React, Vite, TypeScript, Tailwind CSS e axios no `package.json` e configurar o Vite.

---

## Responsável

**Carlos Eduardo Cavalcante da Rocha** — Frontend web e interface.

---

## Como o código está organizado

Tecnologias previstas: React, Vite, TypeScript e Tailwind CSS.

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Página base onde o React é montado. |
| `src/main.tsx`, `src/App.tsx` | Inicialização do React e definição das rotas entre telas. |
| `src/api/client.ts` | Cliente HTTP (axios) que anexa o token de sessão a cada requisição e trata o desafio do segundo fator. |
| `src/hooks/useRealtimeAlerts.ts` | Assina o canal de alertas em tempo real (WebSocket ou SSE). |
| `src/store/authStore.ts` | Estado da sessão e das permissões do usuário logado. |
| `src/pages/Login.tsx` | Tela de login. |
| `src/pages/Dashboard.tsx` | Painel de alertas. |
| `src/pages/Zones.tsx` | Zonas de risco. |
| `src/pages/EventDetail.tsx` | Detalhe do evento, revisão e contestação. |
| `src/pages/EvidenceViewer.tsx` | Visualizador de evidência. |
| `src/pages/Dossiers.tsx` | Dossiês. |
| `src/components/` | Componentes reutilizáveis: `AlertCard` e `DataTable`. |
| `src/styles/index.css` | Tailwind e estilos base. |
| `public/favicon.svg` | Ícone da aplicação. |

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

Quando as dependências forem declaradas:

```bash
npm install
npm run dev      # sobe o servidor de desenvolvimento do Vite
```

Hoje o `npm run dev` ainda falha, pelos motivos descritos em [Estado atual](#estado-atual).
