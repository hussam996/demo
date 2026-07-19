import { bootstrap } from './app/GameBootstrap';

function showFatalError(message: string): void {
  let el = document.getElementById('fatal-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fatal-error';
    el.style.cssText =
      'position:fixed;bottom:8px;left:8px;right:8px;z-index:9999;background:rgba(180,40,40,.95);' +
      'color:#fff;font-size:14px;padding:10px 14px;border-radius:10px;direction:rtl;text-align:center;' +
      'font-family:sans-serif;word-break:break-word;';
    document.body.appendChild(el);
  }
  el.textContent = `⚠️ حدث خطأ: ${message}`;
}

// surface unexpected failures instead of failing silently (helps on sandboxed hosts)
window.addEventListener('error', (e) => {
  if (e.message) showFatalError(e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  showFatalError(String(e.reason?.message ?? e.reason ?? 'رفض غير معالج'));
});

void bootstrap().catch((err) => {
  console.error('فشل تشغيل اللعبة:', err);
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#7ec8e3;color:#234;font-size:18px;text-align:center;padding:20px;';
  el.textContent = `تعذّر تشغيل اللعبة على هذا المتصفح (${String(err?.message ?? err)}). جرّب متصفحًا يدعم WebGL.`;
  document.body.appendChild(el);
});
