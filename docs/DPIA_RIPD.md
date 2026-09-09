# Relatório de Impacto à Proteção de Dados Pessoais (RIPD/DPIA)

**Sistema:** BioShield AI — monitoramento de conformidade de EPI em áreas hospitalares de risco
**Versão:** 1.0 (rascunho de engenharia)
**Data:** 2026-09-09
**Base:** LGPD (Lei Geral de Proteção de Dados Pessoais, Lei 13.709/2018), arts. 5º, 6º, 11, 20, 37, 38 e 46

> **Siglas deste documento.** **DPIA** — *Data Protection Impact Assessment*, o nome internacional deste relatório. **RIPD** — Relatório de Impacto à Proteção de Dados Pessoais, como a LGPD o chama (art. 38). São o mesmo documento. **ANPD** — Autoridade Nacional de Proteção de Dados, o órgão fiscalizador. **DPO** — *Data Protection Officer*, o Encarregado de Dados. **Titular** — a pessoa a quem os dados se referem. **Controlador** — quem decide como e por que tratar os dados. **Operador** — quem trata em nome do controlador. **EPI** — Equipamento de Proteção Individual. **MFA** — Autenticação Multifator. **RBAC** — Controle de Acesso Baseado em Papéis. **KMS** — cofre de chaves de criptografia. **TLS** — criptografia em trânsito. **template facial** — o vetor numérico extraído de um rosto, usado para comparação; é dado biométrico por si só.

> **Natureza deste documento.** É um rascunho produzido pela equipe de desenvolvimento para levantar riscos, mapear o tratamento e registrar as decisões técnicas já tomadas. **Não substitui a análise jurídica.** Um RIPD válido precisa ser revisado e assinado pelo Encarregado (DPO) da instituição de saúde que operar o sistema, que é quem define a base legal aplicável e responde pelo tratamento. As lacunas que dependem dessa análise estão marcadas como **PENDENTE (jurídico)** ao longo do texto.

---

## 1. Por que este relatório é obrigatório

O art. 38 da LGPD faculta à ANPD exigir o relatório de impacto. Na prática, três características deste sistema tornam a elaboração indispensável, e não opcional:

1. **Trata dado pessoal sensível.** O reconhecimento facial produz e usa dado biométrico, expressamente classificado como sensível pelo art. 5º, II, com regime restritivo próprio no art. 11.
2. **Toma decisão automatizada sobre pessoas.** O sistema atribui a identidade de um infrator e gera um dossiê nominal endereçado à diretoria, sem intervenção humana prévia — hipótese do art. 20.
3. **Opera sobre relação assimétrica.** Os titulares são profissionais de saúde monitorados no próprio ambiente de trabalho, o que fragiliza o consentimento como base legal e agrava o risco de dano (disciplinar, reputacional, empregatício).

A combinação dos três é o cenário clássico de alto risco. A decisão de automatizar a identificação foi tomada com ciência desses impactos, conforme registrado na [ADR-010](architecture.md).

---

## 2. Agentes de tratamento

| Papel | Quem | Observação |
|---|---|---|
| **Controlador** | A instituição de saúde que opera o sistema | Define finalidade e meios; responde pelo tratamento. |
| **Operador** | O fornecedor do BioShield AI | Trata em nome do controlador; exige contrato com as cláusulas do art. 39. |
| **Encarregado (DPO)** | A designar pelo controlador | O papel `DPO` já existe no controle de acesso do sistema, com acesso à evidência e à trilha. |
| **Titulares** | Profissionais de saúde que atuam nas zonas monitoradas | Também podem ser alcançados terceiros — ver §5.1. |

**PENDENTE (jurídico):** formalizar o contrato de operador e a designação do Encarregado antes de qualquer operação com dado real.

---

## 3. Descrição do tratamento

### 3.1 Finalidade

Verificar a conformidade no uso de EPI em áreas hospitalares de risco (UTI, centro cirúrgico, isolamento), detectando dois tipos de infração — entrada sem o EPI obrigatório (Tipo A) e remoção indevida de EPI dentro da área (Tipo B) — e produzir um dossiê nominal do incidente para a diretoria.

A finalidade declarada é **prevenção de infecção e segurança do paciente**. Isso precisa ser levado a sério na implementação: um sistema desenhado para essa finalidade não pode ser usado para controle de produtividade, medição de tempo de permanência ou avaliação disciplinar genérica. Desvio de finalidade é violação do art. 6º, I.

### 3.2 Fluxo e dados tratados em cada estágio

| Estágio | Onde | Dado tratado | Natureza |
|---|---|---|---|
| 1. Filtro de EPI | `ai_edge` (edge) | Imagem com desfoque, Track ID efêmero em memória | Anonimizado na operação normal |
| 2. Captura da suspeita | `ai_edge` | **Snapshot nítido, identificável** | **Dado pessoal** |
| 3. Confirmação (2ª IA) | `backend` | O mesmo snapshot | **Dado pessoal** |
| 4. Comparação facial (*face match*) | `backend` | Template facial e comparação com o cadastro do hospital | **Dado pessoal sensível (biométrico)** |
| 5. Resolução de identidade | `backend` | Nome, matrícula | **Dado pessoal** |
| 6. Dossiê | `backend` | PDF nominal com imagem e identidade | **Dado pessoal sensível (composto)** |
| 7. Revisão e contestação | `frontend` | Acesso restrito à evidência e à identificação | **Dado pessoal sensível** |

O ponto de virada é o estágio 2. Antes dele, o sistema é anônimo por construção; a partir dele, tudo é dado pessoal. Essa fronteira é o principal controle de minimização do projeto e não deve ser diluída.

### 3.3 Categorias de dados

- **Biométricos:** imagem facial identificável e template facial derivado.
- **Identificação funcional:** nome completo, matrícula, papel institucional.
- **Comportamentais:** tipo de infração, zona, data e hora, duração até a remoção do EPI.
- **De acesso:** quem visualizou qual evidência, quando e de qual IP (trilha de auditoria).

### 3.4 Volume e frequência

Tratamento **contínuo** de imagem nas zonas monitoradas, com materialização de dado pessoal **apenas em evento de suspeita**. O volume de dado pessoal é, portanto, proporcional à taxa de infração e à taxa de falso positivo do estágio 1 — o que faz do limiar de detecção do edge uma decisão de privacidade, e não apenas de acurácia.

---

## 4. Necessidade e proporcionalidade

### 4.1 O que justifica cada escolha

| Escolha | Justificativa | Alternativa menos invasiva considerada |
|---|---|---|
| Câmera em zona de risco | Só a observação contínua detecta a remoção de EPI durante o procedimento | Auditoria manual por amostragem — inviável em escala e cega ao Tipo B |
| Desfoque no feed normal | Minimização: a operação corrente não precisa de rosto | — (já é a opção minimizante) |
| Snapshot identificável na infração | Sem imagem, a infração não é comprovável nem contestável | Registro apenas textual — inviabiliza a contestação pelo próprio titular |
| **Face match automático** | Diretriz de negócio de automação total (ADR-010) | **Identificação humana pelo gestor — era o desenho da v1.3 e funcionava** |

### 4.2 Observação sobre a proporcionalidade do face match

Vale registrar com franqueza: das quatro escolhas acima, três resistem bem ao teste de necessidade. A quarta é diferente.

A identificação humana pelo gestor, prevista no SRS v1.3, **atingia a mesma finalidade** — produzir um dossiê nominal de infração — **sem tratar dado biométrico**. A automação foi adotada por eficiência operacional, não por necessidade da finalidade. Isso não a torna ilícita, mas significa que ela carrega um ônus argumentativo maior: é preciso demonstrar que o ganho de eficiência justifica introduzir uma categoria de dado sensível que antes não era tratada.

Esta é a questão central que a análise jurídica precisa endereçar, e é também a pergunta mais provável de uma banca avaliadora. Registrá-la é melhor do que ser surpreendido por ela.

**PENDENTE (jurídico):** parecer sobre a proporcionalidade do face match frente à alternativa humana disponível.

### 4.3 Base legal

**PENDENTE (jurídico).** O tratamento de dado sensível exige enquadramento no art. 11, e as hipóteses plausíveis têm, cada uma, o seu problema:

- **Consentimento (art. 11, I):** frágil na relação de emprego, onde a assimetria compromete a livre manifestação.
- **Cumprimento de obrigação legal ou regulatória (art. 11, II, "a"):** exige apontar a norma sanitária concreta que imponha esse controle.
- **Tutela da saúde (art. 11, II, "f"):** a mais alinhada à finalidade declarada, mas seu alcance para vigilância de profissionais precisa de parecer.

O legítimo interesse **não** está disponível para dado sensível. Definir a base legal é pré-condição para operar com dado real.

---

## 5. Riscos e medidas

| # | Risco | Impacto | Medida | Situação |
|---|---|---|---|---|
| R1 | Falso positivo do face match gera dossiê nominal contra pessoa inocente | Alto — dano reputacional e disciplinar | Identificação contestável (`status` CONTESTADA/REVOGADA) e revisão humana no dashboard | Modelo de dados pronto; **tela de revisão pendente** |
| R2 | Acesso indevido à evidência identificável | Alto | RBAC e MFA obrigatório, com três triggers no banco fechando os caminhos de burla; cada visualização gera `EVIDENCE_VIEW` na trilha | **Implementado e testado** |
| R3 | Retenção indefinida de imagem e biometria | Alto | `retention_until` com default de 90 dias e teto rígido de 180 (`chk_retention_max`); job de expurgo | Banco pronto; **job é esqueleto** |
| R4 | Vazamento de template facial | Muito alto — biometria não se troca como senha | Cifra em repouso por referência ao KMS; o segredo nunca fica no banco nem no repositório | **Política definida, implementação pendente** |
| R5 | Adulteração da trilha para encobrir acesso | Alto | `audit_logs` append-only, com `UPDATE`/`DELETE` bloqueados por trigger e por `REVOKE` | **Implementado** |
| R6 | Desvio de finalidade (uso para controle de produtividade) | Alto | Nenhuma medida técnica; depende de governança e contrato | **Descoberto** |
| R7 | Captura de terceiros (pacientes, visitantes, acompanhantes) no snapshot | Alto — inclui dado de saúde de quem nem é destinatário do sistema | Nenhuma medida específica hoje | **Descoberto** |
| R8 | Falso negativo — infração não detectada gera falsa sensação de conformidade | Médio | Nenhuma. O sistema não deve se apresentar como exaustivo | **Aceito, requer documentação** |
| R9 | Reidentificação a partir da trilha após o expurgo da evidência | Médio | Alvos de auditoria são referências lógicas, sem FK; `events.audited_*` recebe `SET NULL` no expurgo | **Implementado** |

### 5.1 Os dois riscos descobertos que exigem decisão explícita

**R7 — terceiros no enquadramento.** O snapshot de uma infração em UTI provavelmente contém o paciente. Esse paciente não é destinatário do sistema, não tem relação funcional com o hospital nessa condição, e sua imagem em leito de UTI é dado de saúde. O projeto hoje não trata disso em nenhum ponto. Mitigações possíveis, em ordem de preferência: desfoque automático de todos os rostos exceto o do track sob suspeita; recorte da região da pessoa monitorada em vez do quadro inteiro; ou, no mínimo, política de acesso ainda mais restrita à evidência. **Recomendação da equipe:** o recorte por track é a medida mais eficaz e é tecnicamente viável no estágio 2, onde a bounding box já existe.

**R6 — desvio de finalidade.** Nenhum controle técnico impede que os dados de conformidade sejam agregados por profissional e usados para avaliação de desempenho. A medida cabível é contratual e de governança, apoiada pela trilha de auditoria para detectar consultas em massa fora do padrão de investigação de incidente.

---

## 6. Direitos dos titulares

| Direito | Como é atendido | Situação |
|---|---|---|
| Confirmação e acesso (art. 18, I e II) | Consulta às identificações do titular | **Não implementado** |
| Correção (art. 18, III) | Contestação da identificação | Modelo pronto; tela pendente |
| Anonimização ou eliminação (art. 18, IV) | Expurgo por retenção | Banco pronto; job pendente |
| Informação sobre uso compartilhado (art. 18, VII) | A integração com o cadastro do hospital deve constar do aviso de privacidade | **PENDENTE (jurídico)** |
| **Revisão de decisão automatizada (art. 20)** | Revisão humana e contestação no dashboard | **Modelo de dados pronto; a interface é a lacuna crítica** |

### 6.1 Sobre o art. 20

O direito de revisão é a salvaguarda que sustenta a licitude de todo o desenho automatizado. Três condições precisam valer para que ele seja real e não decorativo:

1. O titular precisa **saber** que houve decisão automatizada. A interface tem de exibir a origem da identificação — o banco já distingue `HUMAN` de `AI`, e essa informação não pode parar no banco.
2. A revisão precisa ser **possível antes do dano**. Um dossiê já despachado à diretoria e depois revogado não desfaz o efeito reputacional. Vale avaliar reter o despacho automático por uma janela de revisão.
3. O titular precisa poder **pedir explicação** sobre os critérios da decisão (art. 20, §1º), o que exige registrar o grau de confiança do match, e não apenas o resultado.

O ponto 2 é uma decisão de produto ainda não tomada e é, na avaliação da equipe, a mais consequente que resta.

---

## 7. Medidas de segurança

- **Controle de acesso:** RBAC com papéis definidos; `can_view_evidence` isolado como privilégio à parte.
- **MFA obrigatório** para todo papel com acesso à evidência (RNF-19), com a invariante garantida no banco por três triggers, cobrindo alteração pelo usuário, pelo vínculo e pelo papel.
- **Criptografia:** evidência e dossiê cifrados em repouso; chaves em KMS, apenas referenciadas.
- **Transporte:** TLS obrigatório entre edge e backend, onde trafega a imagem identificável.
- **Auditoria imutável:** *append-only* (só aceita inserção), com dupla proteção — um gatilho no banco e a revogação de privilégios (`REVOKE`).
- **Minimização por construção:** desfoque na operação normal; imagem identificável só na suspeita.
- **Segregação:** o cadastro facial pertence ao hospital; o sistema consulta, não replica.

---

## 8. Conclusão

O tratamento é de **alto risco** e, no desenho atual, tem **salvaguardas parcialmente implementadas**. A camada de dados está sólida — controle de acesso, imutabilidade da auditoria e limites de retenção estão implementados e verificados. As lacunas concentram-se na aplicação, que ainda é esqueleto, e em decisões que não são técnicas.

**Condições que a equipe considera indispensáveis antes de qualquer operação com dado real:**

1. Base legal definida por parecer jurídico (§4.3).
2. Interface de revisão e contestação implementada, exibindo a origem da identificação (§6.1).
3. Tratamento do risco R7 — terceiros no enquadramento.
4. Job de expurgo implementado e verificado, alcançando também o template facial.
5. Este relatório revisado e assinado pelo Encarregado da instituição.

Enquanto os cinco não estiverem cumpridos, o sistema deve operar apenas com dado sintético ou de demonstração.

---

## 9. Controle de revisões

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0 | 2026-09-09 | Equipe de desenvolvimento | Redação inicial após a ADR-010 |

**Próxima revisão obrigatória:** ao definir a base legal, ao implementar a tela de revisão, ou a qualquer mudança no escopo do tratamento biométrico.
