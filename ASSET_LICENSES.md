# تراخيص الأصول — Asset Licenses

تستخدم اللعبة نوعين من الأصول:
1. **مجسمات ثلاثية الأبعاد جاهزة برخصة CC0** (ملكية عامة) من Kenney — مسموح
   استخدامها تجاريًا دون الحاجة إلى نسب.
2. **أصول مولّدة إجرائيًا داخل الكود** (العربة، البيئة، منتج الآيس كريم، الصوت، الخامات).

## مجسمات Kenney (CC0 1.0 — ملكية عامة)

الترخيص: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
نص Kenney: «يمكنك استخدام هذا المحتوى لأغراض شخصية وتعليمية وتجارية. دعمنا بذكر
"Kenney" أو "www.kenney.nl" (هذا ليس شرطًا).»

نسخة حرفية من `License.txt` مرفقة داخل مجلد كل حزمة.

| الحزمة | المصدر | الملفات المستخدمة |
|---|---|---|
| Mini Characters 1.0 | https://kenney.nl/assets/mini-characters | 6 شخصيات مُهيكلة (`character-female-a/b/f`, `character-male-a/b/f`) بـ32 حركة لكل شخصية |
| Nature Kit 2.1 | https://kenney.nl/assets/nature-kit | `pot_small`, `plant_bushDetailed`, `plant_bushSmall`, `flower_redA`, `flower_yellowA` |
| Survival Kit | https://kenney.nl/assets/survival-kit | `barrel`, `box-large` |
| Fantasy Town Kit 2.0 | https://kenney.nl/assets/fantasy-town-kit | `stall` (واجهة الكاونتر)، `stall-red`, `stall-green` (أكشاك مجاورة)، `stall-bench`, `stall-stool`, `lantern`, `banner-red` |
| Food Kit 2.0 | https://kenney.nl/assets/food-kit | `ice-cream`, `ice-cream-cup`, `sundae`, `cupcake`, `cookie`, `donut-sprinkles` |

ملاحظة تقنية: خامة `colormap.png` الخاصة بكل حزمة مدمجة داخل ملفات GLB عبر
`tools/embed-glb-textures.mjs` لتصبح كل مجسم مستقلًا بذاته (يسمح ببناء ملف واحد).

## الأصول المولّدة إجرائيًا

## الرسومات ثلاثية الأبعاد

| الأصل | المصدر | الترخيص |
|---|---|---|
| كشك الآيس كريم (كاونتر، أعمدة، مظلة، لافتة، أحواض…) | مبني إجرائيًا بـBabylon.js في `src/rendering/CartBuilder.ts` | جزء من كود المشروع |
| بيئة الشاطئ (بحر، رمال، نخيل، ممشى، غيوم، نوارس، سماء متدرجة) | إجرائية — `src/rendering/EnvironmentBuilder.ts` | جزء من كود المشروع |
| منتج الآيس كريم (سكوبات، صوص، إضافات) | إجرائية — `src/rendering/IceCreamRenderer.ts` | جزء من كود المشروع |
| الزبائن الاحتياطيون (عند تعذّر تحميل المجسمات) | إجرائية — `src/rendering/CustomerRenderer.ts` | جزء من كود المشروع |

## الخامات (Textures)

كل الخامات (خطوط المظلة، اللوحات، الملصقات، أيقونات المزاج، جسيمات) تُرسم في وقت
التشغيل عبر `DynamicTexture` / Canvas 2D. لا ملفات صور خارجية.
الرموز التعبيرية (Emoji) تُعرض بخط النظام لدى المستخدم.

## الصوت

كل المؤثرات والموسيقى والأمواج تُولَّد بـWeb Audio API في `src/core/AudioManager.ts`.
لا ملفات صوتية خارجية.

## الخطوط

خطوط النظام فقط (Segoe UI / Tahoma / Noto Naskh Arabic حسب الجهاز). لا خطوط مضمنة.

## مكتبات مفتوحة المصدر (Dependencies)

| المكتبة | الترخيص |
|---|---|
| Babylon.js (`@babylonjs/core`) | Apache-2.0 |
| Vite, Vitest | MIT |
| TypeScript | Apache-2.0 |
| ESLint, typescript-eslint, Prettier | MIT |
| Playwright | Apache-2.0 |

## استبدال الأصول مستقبلًا

نظام الأصول قابل للاستبدال دون تعديل منطق اللعبة (انظر README).
عند إضافة أي نموذج/خامة/صوت خارجي، **يجب** إضافة سطر في هذا الملف يوضح:
اسم الأصل، المصدر (رابط)، المؤلف، والترخيص (يجب أن يسمح بالاستخدام التجاري).
