# ai_edge — Detecção de EPI junto às câmeras (1ª IA)

**Em uma frase:** é o programa que assiste às câmeras da área de risco, reconhece se cada pessoa está usando o Equipamento de Proteção Individual (EPI) obrigatório e, quando algo parece errado, envia uma única imagem da situação para o servidor conferir.

Ele roda num computador instalado perto das câmeras — o *edge*, ou borda da rede — e não tem tela: funciona em segundo plano, por linha de comando. Para a visão geral do sistema, veja o [README principal](../README.md).

> **Siglas desta pasta.** **EPI** — Equipamento de Proteção Individual. **IA** — Inteligência Artificial. **edge** — o computador junto às câmeras, onde o vídeo é processado sem trafegar pela rede. **YOLO** — *You Only Look Once*, família de modelos que detectam objetos em imagens em tempo real. **MOT** — *Multiple Object Tracking*, rastreamento de várias pessoas ao mesmo tempo entre um quadro e outro. **REST / TLS** — o formato das requisições ao servidor e a criptografia que as protege. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

---

## O que esta parte faz

1. **Recebe o vídeo** de uma webcam ou de câmeras de rede.
2. **Desfoca os rostos** na operação normal. Ninguém é identificado aqui.
3. **Reconhece cada EPI** — máscara, luvas, avental, touca e protetor facial — e associa cada item à pessoa que o está usando.
4. **Acompanha cada pessoa** por um número temporário (Track ID), que existe só na memória e não diz quem ela é.
5. **Aplica a regra de tempo.** Ajustar a máscara ou passar a mão na frente do rosto não é infração. Só se o equipamento continuar ausente além do tempo de tolerância da área, o `T_remocao`, a situação vira suspeita.
6. **Na suspeita, e só nela,** guarda uma imagem nítida e a envia ao backend com os dados do ocorrido.

O edge faz **triagem, não decisão**. Ele não confirma a infração nem descobre quem é a pessoa: isso acontece no [backend](../backend/README.md), onde o dado biométrico é tratado num único lugar, auditável.

**Por que existe essa separação.** Analisar vídeo contínuo com o modelo mais preciso exigiria hardware caro em cada câmera, ou mandar todo o vídeo pela rede. Com um filtro rápido aqui, só as suspeitas saem do edge. Ver [ADR-009](../docs/architecture.md).

---

## Estado atual

**Estruturado, ainda sem implementação.** Todos os arquivos abaixo existem e declaram, num comentário, a responsabilidade que terão. Nenhum contém lógica ainda. O `Dockerfile` também é um modelo comentado, e `models/` está vazio: o modelo de detecção ainda não foi escolhido nem treinado.

Por isso os comandos de [Como executar](#como-executar) instalam as dependências, mas não produzem nenhum resultado por enquanto.

---

## Responsável

**Vinicius Ferrari Niffa** — Engenharia de IA e edge.

---

## Como o código está organizado

```
Captura -> Detecção (YOLO) -> Rastreamento (MOT) -> Regra temporal -> [suspeita? -> imagem nítida + envio ao backend]
```

| Arquivo | Responsabilidade |
|---|---|
| `src/main.py` | Laço principal: executa o fluxo acima quadro a quadro. |
| `src/config.py` | Lê do `.env` da raiz a origem da câmera, a taxa de quadros por segundo (FPS), o limiar de confiança do detector e o `T_remocao`. |
| `src/capture/camera_stream.py` | Captura de webcam ou de câmeras de rede pelos protocolos RTSP e ONVIF, com reconexão automática em caso de falha (RNF-11). |
| `src/capture/frame_buffer.py` | Mantém os quadros só em memória, aplica o desfoque facial por padrão e libera o quadro nítido apenas no instante da suspeita. |
| `src/detection/yolo_detector.py` | A 1ª IA: localiza pessoas e cada EPI na imagem. |
| `src/detection/epi_classes.py` | Traduz as classes do modelo para os tipos de EPI do sistema. |
| `src/tracking/tracker.py` | Rastreamento (ByteTrack ou DeepSORT) que atribui o Track ID temporário. |
| `src/tracking/reid.py` | Reidentificação por silhueta, para não perder a pessoa após uma oclusão. Não usa o rosto. |
| `src/rules/association.py` | Decide a qual pessoa pertence cada EPI detectado, pela sobreposição entre as caixas (IoU) e pela posição no corpo. |
| `src/rules/state_machine.py` | Máquina de estados por pessoa (entrou, conforme, em remoção). Aplica o `T_remocao` e levanta a suspeita de infração do tipo A (entrada sem EPI) ou B (remoção dentro da área). |
| `src/evidence/snapshot_generator.py` | Gera a imagem nítida da suspeita. |
| `src/api_client/backend_client.py` | Envia a suspeita ao backend por REST sobre TLS, de forma assíncrona (RNF-18), sem travar o laço de vídeo. |
| `models/` | Pesos do modelo de detecção. Arquivos `.pt` e `.onnx` são bloqueados pelo `.gitignore` e devem ser versionados com Git LFS ou DVC. |
| `tests/test_state_machine.py` | Testes da regra temporal. |

### Os tipos de EPI reconhecidos

Os mesmos definidos no banco de dados: `MASCARA`, `LUVAS`, `AVENTAL`, `TOUCA` e `PROTETOR_FACIAL`. Cada zona de risco define quais deles são obrigatórios.

### O que ainda precisa ser definido

- **O contrato de envio ao backend** — rota, formato do pacote e resposta esperada. O backend tem o arquivo `event_routes.py` reservado para recebê-lo, mas nenhum dos dois lados especificou o formato ainda. É a primeira coisa a combinar entre as duas frentes.
- **O modelo de detecção** e o conjunto de imagens usado para treiná-lo ou validá-lo.
- **Versões fixas das dependências.** O `requirements.txt` lista as bibliotecas sem versão.

---

## Como executar

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python src/main.py
```

Hoje o `main.py` contém só o comentário de responsabilidade, então o último comando termina sem fazer nada. A instalação baixa bibliotecas pesadas (o Ultralytics traz o PyTorch junto).

A configuração vem do `.env` da raiz do repositório — `CAMERA_SOURCE`, `PROCESSING_FPS`, `CNN_CONF_THRESHOLD`, `T_REMOCAO_SECONDS` e `BACKEND_API_URL`. A descrição de cada variável está em [`config/README.md`](../config/README.md#variáveis-de-ambiente). Nada da pasta `config/` é lido pelo edge.

---

## Pontos de atenção

- **A regra temporal é o ponto mais delicado do sistema.** Uma remoção falsa detectada aqui — confundir oclusão com retirada do EPI — atravessa o pipeline inteiro e pode terminar num dossiê com o nome de alguém. Os testes de `state_machine.py` são prioridade, e devem rodar com dados simulados, sem câmera e sem modelo.
- **A imagem da suspeita é dado pessoal.** Assim que é gerada, deixa de ser anônima: só pode sair do edge por TLS e não deve ficar gravada em disco além do tempo necessário para o envio.
- **O limiar de confiança é uma decisão de privacidade, não só de precisão.** Cada suspeita enviada provoca, no servidor, uma nova análise e um reconhecimento facial. Um limiar baixo demais expõe mais pessoas sem necessidade.
