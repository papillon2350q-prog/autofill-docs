/* AutoRelleno - Term Bill Pierce College-Puyallup */

let customImageFile = null;

// ──────────────────────────────────────────────
// Utilidades
// ──────────────────────────────────────────────
function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, ms);
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function formatUS(date) {
  // MM/DD/YYYY
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
}

function formatLong(date) {
  // Month DD, YYYY
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// ──────────────────────────────────────────────
// Student ID aleatorio
// ──────────────────────────────────────────────
function randomizeId() {
  // Formato típico de ID universitario: año + 8 dígitos aleatorios
  const year = new Date().getFullYear().toString().slice(-2);
  let num = '';
  for (let i = 0; i < 8; i++) num += Math.floor(Math.random() * 10);
  document.getElementById('student_id').value = year + num;
  toast('Student ID generado');
}

// ──────────────────────────────────────────────
// Cálculo automático de fechas (hasta ene 2027)
// ──────────────────────────────────────────────
function recalculateDates() {
  const baseInput = document.getElementById('base_date').value;
  if (!baseInput) return;

  const base = new Date(baseInput + 'T12:00:00'); // evitar timezone shift
  if (isNaN(base.getTime())) return;

  // Term: según el mes de la fecha base
  // Spring: ene-may, Summer: jun-ago, Fall: sep-dic
  const m = base.getMonth() + 1; // 1-12
  let term = 'SPRING 2026';
  const y = base.getFullYear();
  if (m >= 1 && m <= 5) term = `SPRING ${y}`;
  else if (m >= 6 && m <= 8) term = `SUMMER ${y}`;
  else term = `FALL ${y}`;

  // Statement Date = fecha base
  const statement = formatUS(base);

  // Payment Due = + 21 días (típico para term bills)
  const due = new Date(base);
  due.setDate(due.getDate() + 21);
  // no pasar de ene 2027
  const maxDate = new Date('2027-01-31T12:00:00');
  if (due > maxDate) due.setTime(maxDate.getTime());
  const paymentDue = formatUS(due);

  // Expected Graduation: como es Junior en Spring 2026 → June 2027
  let gradYear = y + 1;
  const grad = new Date(gradYear, 5, 15); // 15 de junio
  if (grad > maxDate) grad.setFullYear(2027);
  const expectedGrad = formatLong(grad);

  // Fecha debajo de PROCESSED = +1 día
  const processed = new Date(base);
  processed.setDate(processed.getDate() + 1);
  if (processed > maxDate) processed.setTime(base.getTime());
  const processedStr = formatUS(processed);

  // Rellenar los campos readonly
  document.getElementById('term').value = term;
  document.getElementById('statement_date').value = statement;
  document.getElementById('payment_due').value = paymentDue;
  document.getElementById('expected_graduation').value = expectedGrad;
  document.getElementById('processed_date').value = processedStr;
}

// ──────────────────────────────────────────────
// Imagen personalizada
// ──────────────────────────────────────────────
document.getElementById('custom-image').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  customImageFile = file;
  const url = URL.createObjectURL(file);
  document.getElementById('preview-blank').src = url;
  toast('Foto personalizada cargada');
});

// ──────────────────────────────────────────────
// Generar documento
// ──────────────────────────────────────────────
async function generate() {
  const student = document.getElementById('student').value.trim();
  const studentId = document.getElementById('student_id').value.trim();
  const term = document.getElementById('term').value.trim();
  const statement = document.getElementById('statement_date').value.trim();
  const payment = document.getElementById('payment_due').value.trim();
  const grad = document.getElementById('expected_graduation').value.trim();
  const processed = document.getElementById('processed_date').value.trim();

  if (!student) { toast('Escribe el nombre del estudiante'); return; }
  if (!studentId) { toast('Genera o escribe un Student ID'); return; }
  if (!statement) { toast('Elige la fecha principal'); return; }

  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  btn.textContent = 'Generando…';

  try {
    if (customImageFile) {
      // Con imagen personalizada (multipart)
      const form = new FormData();
      form.append('student', student);
      form.append('student_id', studentId);
      form.append('term', term);
      form.append('statement_date', statement);
      form.append('payment_due', payment);
      form.append('expected_graduation', grad);
      form.append('processed_date', processed);
      form.append('image', customImageFile);

      const res = await fetch('/api/fill-custom', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al generar');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      showResult(url, studentId, statement);
    } else {
      // Con imagen por defecto del servidor
      const payload = {
        student,
        student_id: studentId,
        term,
        statement_date: statement,
        payment_due: payment,
        expected_graduation: grad,
        processed_date: processed
      };

      // Preview
      const res = await fetch('/api/fill-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');

      document.getElementById('result-img').src = data.image_base64;

      // Descarga real
      const dlRes = await fetch('/api/fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const blob = await dlRes.blob();
      const url = URL.createObjectURL(blob);
      document.getElementById('download-btn').href = url;
      document.getElementById('download-btn').download = `TermBill_${studentId}_${statement.replace(/\//g, '-')}.jpg`;

      document.getElementById('result').classList.remove('hidden');
      document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('¡Documento listo!');
    }
  } catch (err) {
    console.error(err);
    toast(err.message || 'Error de red');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generar documento rellenado';
  }
}

function showResult(url, studentId, statement) {
  document.getElementById('result-img').src = url;
  document.getElementById('download-btn').href = url;
  document.getElementById('download-btn').download = `TermBill_${studentId}_${statement.replace(/\//g, '-')}.jpg`;
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('¡Documento listo!');
}

// ──────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────
(function init() {
  // Fecha por defecto: hoy (o 15 de marzo 2026 si estamos fuera de rango)
  const today = new Date();
  let defaultDate = today;
  if (today > new Date('2027-01-31')) defaultDate = new Date('2026-03-15');
  if (today < new Date('2025-01-01')) defaultDate = new Date('2026-03-15');

  const yyyy = defaultDate.getFullYear();
  const mm = pad(defaultDate.getMonth() + 1);
  const dd = pad(defaultDate.getDate());
  document.getElementById('base_date').value = `${yyyy}-${mm}-${dd}`;
  recalculateDates();

  // ID de ejemplo
  randomizeId();
})();
