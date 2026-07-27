"""
AutoRelleno - Especializado para Term Bill Pierce College-Puyallup
Versión adaptada a estructura plana (todos los archivos en la raíz del repo).
"""

import io
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel, Field

# ──────────────────────────────────────────────
# Config (estructura plana - todo en la raíz)
# ──────────────────────────────────────────────
BASE_DIR = Path(__file__).parent

# Archivos están en la raíz del proyecto
DEFAULT_FORM = BASE_DIR / "term_bill_blank.jpg"
FONT_LIGHT = str(BASE_DIR / "AlegreyaSans-Light.ttf")
FONT_REGULAR = str(BASE_DIR / "DejaVuSans.ttf")
FONT_BOLD = str(BASE_DIR / "DejaVuSans-Bold.ttf")
INDEX_HTML = BASE_DIR / "index.html"
APP_JS = BASE_DIR / "app.js"

app = FastAPI(
    title="AutoRelleno - Term Bill",
    description="Rellena automáticamente el Term Bill de Pierce College-Puyallup desde el celular.",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Posiciones de los campos (documento 960x1280)
# ──────────────────────────────────────────────
FIELDS = {
    "student":              {"x": 370, "y": 293, "font_size": 16, "color": "#222222", "bold": False},
    "student_id":           {"x": 370, "y": 318, "font_size": 15, "color": "#222222", "bold": False},
    "term":                 {"x": 370, "y": 365, "font_size": 15, "color": "#222222", "bold": False},
    "statement_date":       {"x": 370, "y": 432, "font_size": 15, "color": "#222222", "bold": False},
    "payment_due":          {"x": 370, "y": 456, "font_size": 15, "color": "#222222", "bold": False},
    "expected_graduation":  {"x": 370, "y": 480, "font_size": 15, "color": "#222222", "bold": False},
    "processed_date":       {"x": 710, "y": 1125, "font_size": 18, "color": "#c41e3a", "bold": False},
}


class TermBillData(BaseModel):
    student: str = Field(..., min_length=2, max_length=80)
    student_id: str = Field(..., min_length=4, max_length=20)
    term: str = Field("SPRING 2026", max_length=40)
    statement_date: str = Field(..., max_length=30)
    payment_due: str = Field(..., max_length=30)
    expected_graduation: str = Field(..., max_length=30)
    processed_date: str = Field(..., max_length=30)


def hex_to_rgb(hex_color: str) -> tuple:
    h = hex_color.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def render_term_bill(data: TermBillData, base_image: Optional[Image.Image] = None) -> Image.Image:
    if base_image is None:
        if not DEFAULT_FORM.exists():
            raise HTTPException(500, "Imagen del formulario (term_bill_blank.jpg) no encontrada")
        img = Image.open(DEFAULT_FORM).convert("RGBA")
    else:
        img = base_image.convert("RGBA")

    # Escalar a tamaño esperado si es diferente
    target_w, target_h = 960, 1280
    if img.size != (target_w, target_h):
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    draw = ImageDraw.Draw(img)

    values = {
        "student": data.student,
        "student_id": data.student_id,
        "term": data.term,
        "statement_date": data.statement_date,
        "payment_due": data.payment_due,
        "expected_graduation": data.expected_graduation,
        "processed_date": data.processed_date,
    }

    for key, conf in FIELDS.items():
        text = values.get(key, "").strip()
        if not text:
            continue
        try:
            if key == "processed_date":
                font_path = FONT_REGULAR   # más sólida para el sello
            else:
                font_path = FONT_LIGHT     # suave para el resto
            font = ImageFont.truetype(font_path, conf["font_size"])
        except Exception:
            font = ImageFont.load_default()

        color = hex_to_rgb(conf["color"])
        draw.text((conf["x"], conf["y"]), text, font=font, fill=color)

    return img.convert("RGB")


# ──────────────────────────────────────────────
# Rutas
# ──────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "AutoRelleno Term Bill", "version": "2.1"}


@app.get("/term_bill_blank.jpg")
def get_default_form():
    if not DEFAULT_FORM.exists():
        raise HTTPException(404, "Formulario no encontrado")
    return FileResponse(DEFAULT_FORM, media_type="image/jpeg")


@app.get("/app.js")
def get_app_js():
    if not APP_JS.exists():
        raise HTTPException(404, "app.js no encontrado")
    return FileResponse(APP_JS, media_type="application/javascript")


@app.post("/api/fill")
async def fill_term_bill(payload: TermBillData):
    try:
        img = render_term_bill(payload)
    except Exception as e:
        raise HTTPException(500, f"Error generando imagen: {e}")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=93)
    buf.seek(0)

    filename = f"TermBill_{payload.student_id}_{payload.statement_date.replace('/', '-')}.jpg"
    return StreamingResponse(
        buf,
        media_type="image/jpeg",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/fill-preview")
async def fill_preview(payload: TermBillData):
    import base64
    img = render_term_bill(payload)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {"image_base64": f"data:image/jpeg;base64,{b64}"}


@app.post("/api/fill-custom")
async def fill_custom(
    student: str = Form(...),
    student_id: str = Form(...),
    term: str = Form("SPRING 2026"),
    statement_date: str = Form(...),
    payment_due: str = Form(...),
    expected_graduation: str = Form(...),
    processed_date: str = Form(...),
    image: UploadFile = File(None),
):
    base_img = None
    if image and image.filename:
        content = await image.read()
        try:
            base_img = Image.open(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(400, f"Imagen inválida: {e}")

    data = TermBillData(
        student=student,
        student_id=student_id,
        term=term,
        statement_date=statement_date,
        payment_due=payment_due,
        expected_graduation=expected_graduation,
        processed_date=processed_date,
    )
    img = render_term_bill(data, base_image=base_img)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=93)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/jpeg")


@app.get("/", response_class=HTMLResponse)
def index():
    if INDEX_HTML.exists():
        return HTMLResponse(INDEX_HTML.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>AutoRelleno Term Bill</h1><p>Falta index.html</p>")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
