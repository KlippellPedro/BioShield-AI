# 🎥 ai_edge — Módulo de Visão Computacional

Frente que roda no **edge** (junto às câmeras). Transforma vídeo em **eventos de conformidade**, sem persistir vídeo bruto identificável. Toda a operação normal é **anônima** (Track IDs em memória, desfoque facial por padrão).

## Pipeline (4 estágios)

```
Captura → Detecção (YOLOv8) → Tracking (MOT) → Regras temporais → [Evidência + envio ao backend]
```

## Estrutura de `src/`

| Pasta/arquivo | Responsabilidade |
|---|---|
| `main.py` | Orquestra o loop quadro a quadro de ponta a ponta. |
| `config.py` | Carrega parâmetros (FPS, thresholds, `T_remocao`) do `.env`. |
| `capture/camera_stream.py` | Captura webcam/RTSP/ONVIF; reconexão em falha (RNF-11). |
| `capture/frame_buffer.py` | Buffer volátil; **desfoque facial por padrão**. |
| `detection/yolo_detector.py` | Inferência YOLOv8 — bounding boxes de EPI/pessoa. |
| `detection/epi_classes.py` | Mapeia as classes do modelo. |
| `tracking/tracker.py` | MOT (ByteTrack/DeepSORT) — atribui o **Track ID anônimo**. |
| `tracking/reid.py` | Re-ID anônima (silhueta), sem biometria facial. |
| `rules/association.py` | Associa cada EPI à pessoa (IoU/anatomia). |
| `rules/state_machine.py` | Máquina de estados por Track; aplica `T_remocao` (Tipo A/B). |
| `evidence/snapshot_generator.py` | Captura o snapshot **nítido** na infração e cifra (AES-256). |
| `api_client/backend_client.py` | Envia eventos + evidência ao backend (assíncrono, RNF-18). |
| `models/` | Pesos `.pt` do YOLOv8 — **Git LFS/DVC**, não no git puro. |

## Como rodar (dev)

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python src/main.py
```

Configure `CAMERA_SOURCE`, `PROCESSING_FPS`, `CNN_CONF_THRESHOLD`, `T_REMOCAO_SECONDS` e `BACKEND_API_URL` no `.env` da raiz.
