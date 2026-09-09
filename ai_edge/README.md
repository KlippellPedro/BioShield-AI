# ai_edge — Filtro de EPI no edge (1ª IA)

> **Siglas desta pasta.** **EPI** — Equipamento de Proteção Individual. **IA** — Inteligência Artificial. **edge** — a borda da rede: o computador instalado junto às câmeras, onde o vídeo é processado sem precisar trafegar pela rede. **headless** — sem interface gráfica, roda só por linha de comando. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

Script *headless* em Python, executado no **edge**, junto às câmeras. É o estágio 1 do pipeline em cascata: faz a triagem rápida de EPI e, ao **suspeitar** de uma infração, captura o snapshot identificável e o envia ao backend para confirmação (2ª IA) e identificação (face match). Ver [ADR-009](../docs/architecture.md).

> **Minimização preservada:** o feed normal é tratado com desfoque e Track IDs efêmeros; a imagem identificável só é materializada e enviada **no instante da suspeita de infração**. Não há captura contínua de imagem identificável.

## Estado atual

Esqueleto. Todos os arquivos de `src/` existem e carregam, em uma linha de comentário, a responsabilidade que terão — nenhum tem implementação ainda. A tabela abaixo é, portanto, tanto um mapa do que existe quanto o contrato do que cada arquivo deve entregar.

## Missão — Vinicius (Engenharia de IA / Edge)

- **1ª IA (filtro de EPI):** detector YOLO (*You Only Look Once*, família de modelos de detecção de objetos em tempo real) que faz a triagem barata, quadro a quadro.
- **Lógica do `T_remocao`:** máquina de estados temporal que distingue oclusão de remoção real (Tipo A/B) e decide quando existe suspeita de infração.
- **Captura e envio:** no instante da suspeita, captura o *snapshot* nítido (identificável) e envia ao backend o pacote `{imagem, track_id, tipo de EPI, zona, timestamp}` por REST (*Representational State Transfer*, o estilo das rotas HTTP) sobre TLS (*Transport Layer Security*, a criptografia em trânsito).
- **Triagem, não decisão:** o edge não confirma nem identifica sozinho. A 2ª IA (confirmação) e o face match (identificação) ficam no backend, onde o dado biométrico é tratado de forma centralizada e auditável.

## Pipeline (cascata — estágio 1 de 4)

```
Captura -> Detecção (YOLO) -> Rastreamento (MOT) -> Regras temporais -> [suspeita? -> snapshot identificável + envio ao backend]
```

MOT é *Multiple Object Tracking*, o rastreamento de múltiplos objetos que mantém a identidade de cada pessoa entre um quadro e o seguinte.

## Estrutura de `src/`

| Pasta/arquivo | Responsabilidade |
|---|---|
| `main.py` | Orquestra o loop quadro a quadro de ponta a ponta. |
| `config.py` | Carrega parâmetros do `.env` da raiz: FPS (*frames per second*, quadros por segundo), limiares de confiança e `T_remocao`. |
| `capture/camera_stream.py` | Captura de webcam, RTSP (*Real Time Streaming Protocol*) ou ONVIF (*Open Network Video Interface Forum*) — os dois padrões de câmera de rede; reconexão em falha (RNF-11). |
| `capture/frame_buffer.py` | Buffer volátil; desfoca o feed normal e libera o quadro nítido só no instante da infração. |
| `detection/yolo_detector.py` | 1ª IA — inferência YOLO (bounding boxes de EPI e pessoa). |
| `detection/epi_classes.py` | Mapeia as classes do modelo. |
| `tracking/tracker.py` | Rastreamento MOT (ByteTrack/DeepSORT); atribui o Track ID efêmero — um número temporário, só em memória, que não identifica ninguém. |
| `tracking/reid.py` | Re-ID (reidentificação) por silhueta, para não perder a pessoa após uma oclusão. Não é facial — a comparação de rosto fica no backend. |
| `rules/association.py` | Associa cada EPI à pessoa certa, por IoU (*Intersection over Union*, medida de sobreposição entre caixas) e por anatomia. |
| `rules/state_machine.py` | Máquina de estados por Track; aplica `T_remocao` e levanta a suspeita (Tipo A/B). |
| `evidence/snapshot_generator.py` | Captura o snapshot nítido (identificável) da infração para envio. |
| `api_client/backend_client.py` | Envia `{imagem identificável + metadados}` ao backend (REST/TLS). |
| `models/` | Pesos `.pt` da 1ª IA. Versionar por Git LFS (*Large File Storage*) ou DVC (*Data Version Control*), ferramentas para arquivos pesados — o `.gitignore` já bloqueia `.pt` e `.onnx` no git puro. |
| `tests/test_state_machine.py` | Testes da máquina de estados. É o ponto mais crítico da pasta: `T_remocao` é uma regra temporal e erra fácil em oclusão, e nenhum outro estágio consegue corrigir um falso Tipo B gerado aqui. |

## Como rodar (dev)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python src/main.py
```

Configure `CAMERA_SOURCE`, `PROCESSING_FPS`, `CNN_CONF_THRESHOLD`, `T_REMOCAO_SECONDS` e `BACKEND_API_URL` no `.env` da raiz. O edge lê só o `.env`; nada em `config/` se aplica a ele.

## Pontos de atenção

- **O snapshot é dado pessoal.** A partir do momento em que `snapshot_generator.py` roda, a imagem deixa de ser anônima. Ela só pode sair daqui por TLS e não deve ser persistida em disco no edge além do necessário para o envio.
- **Falso positivo aqui custa caro.** Cada suspeita levantada aciona, no backend, uma inferência pesada e um reconhecimento facial contra o cadastro do hospital. O threshold é uma decisão de custo e de privacidade, não só de acurácia.
