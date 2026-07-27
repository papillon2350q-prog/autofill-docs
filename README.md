# AutoRelleno – Term Bill Pierce College-Puyallup

Servicio especializado para rellenar automáticamente el **Term Bill** de Pierce College-Puyallup (Spring 2026) desde el celular.

## Características

- Interfaz 100 % mobile-first
- Campo **Nombre** (Student)
- **Student ID** con botón 🎲 Aleatorio
- **Una sola fecha** (Statement Date) → el resto se calcula automáticamente:
  - Term (Spring / Summer / Fall según el mes)
  - Payment Due (+21 días)
  - Expected Graduation (15 de junio del año siguiente)
  - Fecha debajo del sello PROCESSED (+1 día)
- Fechas limitadas hasta **enero 2027**
- Opción de **cargar tu propia foto** del formulario en blanco (botón "Cambiar foto")
- Vista previa + descarga inmediata de la imagen rellenada

## Cómo correr en local

```bash
cd autofill-docs
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Abre http://localhost:8000 en el celular o navegador.

## Deploy gratis en Render

1. Crea un repositorio vacío en GitHub llamado `autofill-docs`
2. Sube todo el contenido de esta carpeta
3. En Render.com → New → Web Service → conecta el repo
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Estructura

```
autofill-docs/
├── main.py
├── requirements.txt
├── README.md
├── fonts/
│   ├── DejaVuSans.ttf
│   └── DejaVuSans-Bold.ttf
└── static/
    ├── index.html
    ├── app.js
    └── images/
        └── term_bill_blank.jpg
```

Listo para usar desde el celular.
