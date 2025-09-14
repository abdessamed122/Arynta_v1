#!/usr/bin/env python3
"""
API لمساعد صوتي لتعلم اللغات (STT -> LLM -> TTS)
- يستقبل ملف صوت (من الهاتف) عبر HTTP
- يحول الصوت إلى نص (STT via Groq Whisper)
- يولّد رد نصي (LLM via Groq LLaMA)
- يحول الرد إلى صوت (TTS via Replicate kokoro) في الخلفية
- يرجع JSON يحوي: النص الأصلي، الرد نصيًا، ورابط للصوت (قد يتوفر لاحقًا)
"""

import os
import tempfile
import logging
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional, Any
import re
import uuid

import requests
import replicate
from fastapi import FastAPI, UploadFile, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from groq import Groq

# ----------------------------- إعداد البيئة -----------------------------
load_dotenv(dotenv_path=Path(__file__).with_name(".env"))
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not set in environment")
if not REPLICATE_API_TOKEN:
    raise RuntimeError("REPLICATE_API_TOKEN not set in environment")

groq_client = Groq(api_key=GROQ_API_KEY)
rep_client = replicate.Client(api_token=REPLICATE_API_TOKEN)

# ----------------------------- إعداد FastAPI -----------------------------
app = FastAPI(title="Language Learning Voice Assistant API")

# السماح للهاتف بالاتصال (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # في الإنتاج ضع دومين التطبيق فقط
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# مجلد لتخزين ملفات TTS الناتجة وتقديمها
STATIC_DIR = Path("static")
OUTPUT_DIR = STATIC_DIR / "tts_outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# إعداد logging بسيط
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------- STT -----------------------------
def transcribe_audio_file(filepath: str, lang: Optional[str] = "en") -> str:
    language_param = None if (lang is None or lang == "auto") else lang
    with open(filepath, "rb") as f:
        try:
            resp = groq_client.audio.transcriptions.create(
                file=(Path(filepath).name, f, "audio/wav"),
                model="whisper-large-v3-turbo",
                response_format="text",
                language=language_param,
                temperature=0.0
            )
            if isinstance(resp, str):
                return resp
            if hasattr(resp, "text"):
                return getattr(resp, "text")
            if isinstance(resp, dict) and "text" in resp:
                return resp["text"]
            return str(resp)
        except Exception as e:
            logger.exception("STT failed")
            raise RuntimeError(f"STT failed: {e}")

# ----------------------------- LLM -----------------------------
def chat_with_llm(prompt: str, target_lang: str = "en") -> str:
    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are a friendly language learning assistant. "
                        f"Always reply in {target_lang}. "
                        f"Keep your responses concise (1–3 sentences maximum)."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=150  # يمكن تعديل الرقم حسب رغبتك
        )
        if hasattr(resp, "choices") and resp.choices:
            choice = resp.choices[0]
            if hasattr(choice, "message") and hasattr(choice.message, "content"):
                return choice.message.content.strip()
            if isinstance(choice, dict) and "message" in choice and "content" in choice["message"]:
                return choice["message"]["content"].strip()
        return str(resp)
    except Exception as e:
        logger.exception("LLM failed")
        raise RuntimeError(f"LLM failed: {e}")


# ----------------------------- TTS (مخرجات Replicate) -----------------------------
def extract_audio_url_from_replicate_output(output: Any) -> str:
    url_re = re.compile(r"https?://\S+")
    def find_url_in_obj(obj) -> Optional[str]:
        if obj is None:
            return None
        if isinstance(obj, str):
            m = url_re.search(obj)
            if m:
                return m.group(0)
            if obj.endswith((".wav", ".mp3", ".m4a", ".ogg")):
                return obj
            return None
        if isinstance(obj, (list, tuple, set)):
            for item in obj:
                res = find_url_in_obj(item)
                if res:
                    return res
            return None
        if isinstance(obj, dict):
            for v in obj.values():
                res = find_url_in_obj(v)
                if res:
                    return res
            for k in obj.keys():
                if isinstance(k, str):
                    m = url_re.search(k)
                    if m:
                        return m.group(0)
            return None
        for attr in ("output", "result", "url", "audio", "audio_url"):
            if hasattr(obj, attr):
                try:
                    val = getattr(obj, attr)
                    res = find_url_in_obj(val)
                    if res:
                        return res
                except Exception:
                    pass
        try:
            if hasattr(obj, "to_dict"):
                return find_url_in_obj(obj.to_dict())
            if hasattr(obj, "dict"):
                return find_url_in_obj(obj.dict())
        except Exception:
            pass
        s = str(obj)
        m = url_re.search(s)
        if m:
            return m.group(0)
        return None

    url = find_url_in_obj(output)
    if not url:
        logger.error("Unexpected TTS output format; full output: %r", output)
        raise RuntimeError("Unexpected TTS output format")
    return url

def text_to_speech_replicate(text: str) -> str:
    try:
        model = "jaaari/kokoro-82m:f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13"
        output = rep_client.run(model, input={"text": text})
        logger.debug("Replicate TTS raw output: %r", output)
        audio_url = extract_audio_url_from_replicate_output(output)
        if not audio_url:
            raise RuntimeError("Empty audio URL from TTS")
        return audio_url
    except Exception as e:
        logger.exception("TTS failed")
        raise RuntimeError(f"TTS failed: {e}")

# ----------------------------- Background TTS worker -----------------------------
def generate_tts_background(reply_text: str, out_path: str):
    """تشغيل TTS في الخلفية، تنزيل وحفظ الملف المحليًا."""
    try:
        audio_url = text_to_speech_replicate(reply_text)
        logger.info("Background TTS produced URL: %s", audio_url)
        resp = requests.get(audio_url, stream=True, timeout=60)
        resp.raise_for_status()
        # حفظ المحتوى
        with open(out_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        logger.info("TTS file saved: %s", out_path)
    except Exception as e:
        logger.exception("Background TTS failed: %s", e)

# ----------------------------- Endpoint -----------------------------
# @app.post("/conversation")
# async def conversation(
#     background_tasks: BackgroundTasks,
#     file: UploadFile,
#     lang: str = Form("en"),       # لغة الإدخال (من المتعلم) - أو "auto"
#     target_lang: str = Form("en") # لغة الرد (لغة يتعلمها)
# ):
#     tmp_path = None
#     try:
#         # حفظ الصوت مؤقتًا
#         with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
#             tmp_path = tmp.name
#             tmp.write(await file.read())
#         logger.info("Saved uploaded file to %s", tmp_path)

#         # STT
#         try:
#             transcript = transcribe_audio_file(tmp_path, lang=lang)
#         except Exception as e:
#             return JSONResponse({"success": False, "stage": "stt", "message": str(e)}, status_code=500)

#         # LLM
#         try:
#             reply = chat_with_llm(transcript, target_lang=target_lang)
#         except Exception as e:
#             return JSONResponse({"success": False, "stage": "llm", "message": str(e)}, status_code=500)

#         # حضّر اسم ملف فريد للـ TTS (الملف قد يُكتب لاحقًا في الخلفية)
#         file_id = str(uuid.uuid4())
#         filename = f"{file_id}.wav"
#         out_path = str(OUTPUT_DIR / filename)
#         reply_audio_url = f"/static/tts_outputs/{filename}"

#         # أضف مهمة الخلفية (توليد TTS وتنزيل الملف)
#         background_tasks.add_task(generate_tts_background, reply, out_path)

#         # رجّع النتيجة فورًا بدون انتظار TTS
#         return JSONResponse(
#             {
#                 "success": True,
#                 "transcript": transcript,
#                 "reply_text": reply,
#                 "reply_audio_url": reply_audio_url
#             },
#             status_code=200
#         )
#     finally:
#         if tmp_path and os.path.exists(tmp_path):
#             try:
#                 os.unlink(tmp_path)
#                 logger.info("Deleted temp file %s", tmp_path)
#             except Exception:
#                 logger.warning("Failed to delete temp file %s", tmp_path)
# /////////////////
@app.post("/")
async def conversation(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    lang: str = Form("en"),
    target_lang: str = Form("en")
):
    tmp_path = None
    try:
        # 1) حفظ الصوت مؤقتًا
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp_path = tmp.name
            tmp.write(await file.read())

        # 2) STT
        transcript = transcribe_audio_file(tmp_path, lang=lang)

        # 3) LLM
        reply = chat_with_llm(transcript, target_lang=target_lang)

        # 4) تجهيز رابط الصوت فقط (بدون توليد فعلي الآن)
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.mp3"
        out_path = str(OUTPUT_DIR / filename)
        reply_audio_url = f"/static/tts_outputs/{filename}"

        # 5) إضافة TTS كخلفية بعد الرد
        background_tasks.add_task(generate_tts_background, reply, out_path)

        # 6) إرسال الرد فورًا
        return {
            "success": True,
            "transcript": transcript,
            "reply_text": reply,
            "reply_audio_url": reply_audio_url
        }

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
