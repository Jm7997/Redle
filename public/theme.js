// Aplica el tema guardado antes de pintar para evitar parpadeos (fichero aparte para no necesitar
// 'unsafe-inline' en la política de seguridad de scripts).
try { const t = localStorage.getItem('redle:theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch {}
