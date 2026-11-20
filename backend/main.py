import os
import re
from pathlib import Path
from typing import Optional

import eng_to_ipa as ipa
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

load_dotenv()

DEFAULT_VOICE_ID = "P7fAh4p4xVfEzGgihOit"
DEFAULT_MODEL_ID = "eleven_v4"

app = FastAPI(title="AI Voice Studio — English to IPA & ElevenLabs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IPARequest(BaseModel):
    text: str = Field(..., min_length=1)


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice_id: str = Field(default=DEFAULT_VOICE_ID)
    model_id: str = Field(default=DEFAULT_MODEL_ID)
    api_key: Optional[str] = Field(default=None)


def strip_audio_tags(text: str) -> str:
    """Remove ElevenLabs expressive bracket tags like [whisper] before IPA conversion."""
    cleaned = re.sub(r"\[[^\]]+\]", " ", text)
    return re.sub(r"\s+", " ", cleaned).strip()


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "has_env_api_key": bool(os.getenv("ELEVENLABS_API_KEY")),
        "default_voice_id": DEFAULT_VOICE_ID,
        "default_model_id": DEFAULT_MODEL_ID,
    }


@app.post("/api/ipa")
def convert_ipa(req: IPARequest):
    clean_text = strip_audio_tags(req.text)
    if not clean_text:
        return {"ipa": "", "word_count": 0, "char_count": len(req.text)}

    try:
        phonetic = ipa.convert(clean_text)
        return {
            "ipa": phonetic,
            "word_count": len(clean_text.split()),
            "char_count": len(req.text),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al generar fonética IPA: {exc}")


@app.post("/api/tts")
def text_to_speech(req: TTSRequest):
    resolved_key = (req.api_key or "").strip() or os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not resolved_key:
        raise HTTPException(
            status_code=400,
            detail="Falta ELEVENLABS_API_KEY. Configúrala en .env o ingrésala en el panel de ajustes.",
        )

    voice_id = (req.voice_id or DEFAULT_VOICE_ID).strip()
    model_id = (req.model_id or DEFAULT_MODEL_ID).strip()

    try:
        client = ElevenLabs(api_key=resolved_key)
        response = client.text_to_speech.convert(
            voice_id=voice_id,
            text=req.text,
            model_id=model_id,
        )
        audio_bytes = b"".join(response)
        if not audio_bytes:
            raise HTTPException(status_code=502, detail="ElevenLabs no devolvió datos de audio.")

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": 'inline; filename="output.mp3"'},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error en ElevenLabs TTS: {exc}")


FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
