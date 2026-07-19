# 🍦 محاكي عربة الآيس كريم — Ice Cream Cart Simulator

لعبة ثلاثية الأبعاد كرتونية تعمل على الويب (وقابلة للتحويل إلى Android وiOS عبر Capacitor).
تلعب دور بائع آيس كريم داخل عربة على شاطئ كرتوني: يصل الزبائن عبر الممشى، يقفون في طابور،
يطلبون طلبات مخصصة، وعليك تحضيرها يدويًا (وعاء ← سكوبات ← صوص ← إضافات) وتسليمها قبل نفاد صبرهم.

- **8 مستويات متدرجة** تفتح مكونات وقواعد جديدة (ترتيب السكوبات، زبائن VIP، أهداف متنوعة).
- **8 نكهات، 3 صوصات، 7 إضافات، 5 أوعية** — كلها مجسمات ثلاثية الأبعاد تفاعلية داخل المشهد.
- نقاط وعملات وسلسلة Combo حتى ×5، وحفظ تقدم محلي مع Migration.
- تعمل بالماوس واللمس، وتتكيف مع الكمبيوتر والجوال (عرضي وطولي) مع Safe Areas.

## متطلبات التشغيل

- Node.js 18+ (تم الاختبار على Node 22)
- متصفح يدعم WebGL2 (يُستخدم WebGPU تلقائيًا إن توفر)

## التثبيت والتشغيل

```bash
npm install        # تثبيت الاعتماديات
npm run dev        # تشغيل بيئة التطوير (Vite)
npm run build      # بناء إنتاجي في dist/ (مع فحص الأنواع)
npm run preview    # معاينة نسخة الإنتاج
```

## الاختبارات

```bash
npm run test       # اختبارات منطق اللعبة (Vitest) — 47 اختبارًا
npm run test:e2e   # اختبارات واجهة اللعب (Playwright) — تتطلب متصفح Chromium
npm run lint       # ESLint
npm run format     # Prettier
```

ملاحظة: إذا كان Chromium مثبتًا في مسار مخصص، مرّر `PW_CHROMIUM_PATH=/path/to/chromium`
قبل أمر `test:e2e`. وإلا نفّذ `npx playwright install chromium` أولًا.

## بنية المشروع (مختصرة)

```text
src/
  app/         GameApp (المنسق العام) + GameBootstrap (إنشاء المحرك)
  core/        EventBus, GameClock, SaveManager, AudioManager, Rng
  gameplay/    منطق اللعبة الصافي (بدون رندر): الطلبات، الزبائن، التحضير،
               المستويات، النقاط، LevelSession (آلة الحالة)
  rendering/   بناء العربة والبيئة والزبائن والمنتج والمؤثرات (Babylon.js)
  scenes/      GameplayScene: ربط المشهد ثلاثي الأبعاد بالمنطق
  ui/          HUD وقوائم HTML/CSS (بطاقة الطلب، الإيقاف، النتائج، الخريطة، Tutorial)
  data/        بيانات المكونات والزبائن والمستويات (ملفات بيانات منفصلة)
  tests/       اختبارات Vitest + e2e (Playwright)
```

راجع `TECHNICAL_ARCHITECTURE.md` للتفاصيل و`GAME_DESIGN.md` لتصميم اللعبة.

## كيف أضيف نكهة جديدة؟

1. أضف المعرف إلى `FlavorType` في `src/gameplay/orders/OrderTypes.ts`.
2. أضف تعريفها (الاسم، اللون، الأيقونة) في `src/data/flavors.ts`.
3. أدرجها في `allowedFlavors` للمستويات المطلوبة في `src/gameplay/levels/levelConfigs.ts`.

لا حاجة لأي تعديل في الرندر: أحواض النكهات والسكوبات تُبنى تلقائيًا من ملف البيانات
(شبكة الأحواض في `CartBuilder` تتوسع تلقائيًا: كل 4 نكهات = صف).

## كيف أضيف إضافة (Topping) جديدة؟

1. أضف المعرف إلى `ToppingType` في `OrderTypes.ts`.
2. أضف تعريفها في `src/data/toppings.ts` مع تحديد `placement`:
   `surface` (تتوزع على سطح السكوبات) أو `top` (توضع على القمة مثل الكرز).
3. إن كان لها شكل خاص، أضف حالة في `IceCreamVisual.addTopping()` داخل
   `src/rendering/IceCreamRenderer.ts` (وإلا استخدم `scatterChunks` الجاهزة).
4. أدرجها في `allowedToppings` للمستويات.

## كيف أضيف مستوى جديدًا؟

أضف كائن `LevelConfig` جديدًا في `src/gameplay/levels/levelConfigs.ts` فقط —
الأهداف، المكونات المسموحة، الصبر، حجم الطابور، القواعد… كلها بيانات.
خريطة المراحل وشاشة الأهداف تلتقطه تلقائيًا.

## كيف أستبدل نموذج الزبائن؟

الزبائن حاليًا نماذج إجرائية (Procedural) داخل `src/rendering/CustomerRenderer.ts`.
لاستبدالها بنماذج GLB جاهزة:

1. ضع الملفات في `assets/models/` وسجّل ترخيصها في `ASSET_LICENSES.md`.
2. عدّل `CustomerVisual.build()` لتحميل النموذج (عبر `SceneLoader.ImportMeshAsync`)
   بدل بناء الأجزاء، مع إبقاء نفس الواجهة (`walkTo`, `setMood`, `update`).
3. منطق الطابور والحركة والمزاج لن يتغير — فهو منفصل عن الشكل تمامًا.

## التحويل إلى تطبيق Android / iOS (Capacitor)

ملف `capacitor.config.json` جاهز في الجذر (`webDir: dist`).

```bash
npm run build                          # 1) ابنِ نسخة الويب
npm install @capacitor/core            # 2) أضف Capacitor
npm install -D @capacitor/cli
npx cap init --web-dir dist            # (يقرأ الإعدادات الموجودة)

# Android (يتطلب Android Studio + SDK)
npm install @capacitor/android
npx cap add android
npx cap sync android
npx cap open android                   # ثم Build/Run من Android Studio

# iOS (يتطلب macOS + Xcode)
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios                       # ثم Build/Run من Xcode
```

بعد كل تعديل على اللعبة: `npm run build && npx cap sync`.

نقاط جاهزة مسبقًا للجوال: التحكم باللمس، Safe Area Insets، إيقاف اللعبة تلقائيًا
عند انتقال التطبيق للخلفية، أوضاع جودة (Low/Medium/High) تُختار تلقائيًا حسب الجهاز.

## ملفات التوثيق

| الملف | المحتوى |
|---|---|
| `GAME_DESIGN.md` | تصميم اللعبة: الحلقة الأساسية، المستويات، التقييم |
| `TECHNICAL_ARCHITECTURE.md` | المعمارية، آلة الحالة، قرارات الأداء |
| `ASSET_LICENSES.md` | مصادر وتراخيص جميع الأصول |
| `TEST_REPORT.md` | نتائج الاختبارات |
| `CHANGELOG.md` | سجل التغييرات |
