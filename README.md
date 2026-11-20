# AI Voice Studio — English to IPA & ElevenLabs

Aplicación minimalista con interfaz **glassmorphism** y **modo oscuro/claro** construida con **React (Vite)** y **FastAPI**, que transcribe texto en inglés a fonética **IPA** (`eng-to-ipa`) y genera voz expresiva mediante **ElevenLabs** (`eleven_v4`).

## Requisitos

- Una API key de ElevenLabs (`ELEVENLABS_API_KEY`). Puedes copiar `.env.example` a `.env` o ingresarla directamente desde el botón de **Configuración** en la interfaz.

## Levantar con Docker

```bash
docker build -t english-to-ipa .
docker run -d -p 8000:8000 --env-file .env --name voice-studio english-to-ipa
```

Luego abre `http://localhost:8000` en tu navegador.

## Desarrollo local

### Backend (FastAPI)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
