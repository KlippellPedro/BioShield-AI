# 🎥 ai_edge — Filtro de EPI no Edge (1ª IA)

Script **headless** em Python, roda no **edge** (junto às câmeras). É o **estágio 1** do pipeline em cascata: faz a triagem rápida de EPI e, ao **suspeitar** de uma infração, captura o **snapshot identificável** e o envia ao backend para confirmação (2ª IA) e identificação (face match). Ver [ADR-009](../docs/architecture.md).

> **Minimização preservada:** o **feed normal** é tratado com desfoque e Track IDs efêmeros; a imagem **identificável** só é materializada e enviada **no instante da suspeita de infração** — não há captura contínua de imagem identificável.

## 🎯 Missão — Vinicius (Engenharia de IA / Edge)

- **1ª IA (filtro de EPI):** detector YOLO que faz a triagem barata em tempo real, quadro a quadro.
- **Lógica do `T_remocao`:** máquina de estados temporal que distingue oclusão de remoção real (Tipo A/B) e decide quando há **suspeita** de infração.
- **Captura e envio:** no instante da suspeita, captura o **snapshot nítido (identificável)** e envia ao backend o pacote `{imagem, track_id, tipo de EPI, zona, timestamp}` via REST/TLS.
- **Triagem, não decisão:** o edge **não** confirma nem identifica sozinho — a 2ª IA (confirmação) e o face match (identificação) ficam no backend, onde o dado biométrico é tratado de forma centralizada e auditável.

## Pipeline (cascata — estágio 1 de 4)

```
Captura → Detecção (YOLO) → Tracking (MOT) → Regras temporais → [suspeita? → captura snapshot identificável + envia ao backend]
```

## Estrutura de `src/`

| Pasta/arquivo | Responsabilidade |
|---|---|
| `main.py` | Orquestra o loop quadro a quadro de ponta a ponta. |
| `config.py` | Carrega parâmetros (FPS, thresholds, `T_remocao`) do `.env`. |
| `capture/camera_stream.py` | Captura webcam/RTSP/ONVIF; reconexão em falha (RNF-11). |
| `capture/frame_buffer.py` | Buffer volátil; **desfoca o feed normal**; libera o quadro nítido só no instante da infração. |
| `detection/yolo_detector.py` | 1ª IA — inferência YOLO (bounding boxes de EPI/pessoa). |
| `detection/epi_classes.py` | Mapeia as classes do modelo. |
| `tracking/tracker.py` | MOT (ByteTrack/DeepSORT) — atribui o Track ID efêmero. |
| `tracking/reid.py` | Re-ID por **silhueta** para continuidade do tracking (não-facial; o face match é no backend). |
| `rules/association.py` | Associa cada EPI à pessoa (IoU/anatomia). |
| `rules/state_machine.py` | Máquina de estados por Track; aplica `T_remocao` e levanta a **suspeita** (Tipo A/B). |
| `evidence/snapshot_generator.py` | Captura o snapshot **nítido (identificável)** da infração para envio ao backend. |
| `api_client/backend_client.py` | Envia `{imagem identificável + metadados}` ao backend (REST/TLS). |
| `models/` | Pesos `.pt` da 1ª IA (YOLO) — **Git LFS/DVC**, não no git puro. |

## Como rodar (dev)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python src/main.py
```

Configure `CAMERA_SOURCE`, `PROCESSING_FPS`, `CNN_CONF_THRESHOLD`, `T_REMOCAO_SECONDS` e `BACKEND_API_URL` no `.env` da raiz.
