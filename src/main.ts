import { bootstrap } from './app/GameBootstrap';

void bootstrap().catch((err) => {
  console.error('فشل تشغيل اللعبة:', err);
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#7ec8e3;color:#234;font-size:18px;text-align:center;padding:20px;';
  el.textContent = 'تعذّر تشغيل اللعبة على هذا المتصفح. جرّب متصفحًا يدعم WebGL.';
  document.body.appendChild(el);
});
