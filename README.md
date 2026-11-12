# Показ

**Ресерч:** [research.md](research/research.md) · [research.html на сайті](https://denysosadchyi.github.io/pokaz/research/research.html) · деталі — у розділі [«Ресерч»](#ресерч).

**Персони і jobs:** [personas.md](personas.md) · [jtbd.md](jtbd.md) · [personas.html](personas.html) · [на сайті](https://denysosadchyi.github.io/pokaz/personas.html)

**Структура (IA):** [sitemap.md](sitemap.md) · [flows.md](flows.md) · [ia.html](ia.html) · [на сайті](https://denysosadchyi.github.io/pokaz/ia.html)

«Показ» — особистий кабінет побутового споживача електроенергії. У кабінеті користувач:

- вносить показ лічильника;
- бачить суму і платить;
- розуміє своє споживання;
- дізнається про відключення.

**Мета:** рутина зі світлом займає одну хвилину на місяць. Після неї немає питань
«чи прийняли показ», «скільки платити» і «чому стільки».

- **Для кого:** власники й орендарі квартир і будинків, 25–65 років, часто мають кілька об'єктів (батьки, дача).
- **Ключова задача:** внести показ вручну або за фото і знати суму.
- **Модель:** кабінет одного постачальника. Він має багато об'єктів і багато людей з ролями: власник, учасник, спостерігач.
- **Платформа:** десктопний веб, далі адаптив до телефона.
- **Стек прототипу:** React + Vite + TypeScript, дані на моках.

Повний бриф: [CLAUDE.md](CLAUDE.md).

Репо: https://github.com/denysosadchyi/pokaz · сайт (GitHub Pages): https://denysosadchyi.github.io/pokaz/

## Ресерч

- [research/research.md](research/research.md) — зведення: конкуренти, бенчмарк, патерни, гіпотези
- [research/research.html](research/research.html) · [на сайті](https://denysosadchyi.github.io/pokaz/research/research.html) — те саме зведення на одній HTML-сторінці зі скрінами
- Проміжні кроки: [03 · конкуренти](research/notes/03-competitors.md) · [04 · матриця, стори й відгуки](research/notes/04-matrix.md) · [05 · бенчмарк](research/notes/05-benchmark.md) · [06 · UX-патерни](research/notes/06-patterns.md)
- [research/screens/](research/screens/) — скріни; [індекс джерел](research/screens/README.md)

## Артефакти

| Артефакт | Що це |
|----------|-------|
| [CLAUDE.md](CLAUDE.md) | Продуктовий бриф і правила роботи в репо: навігатор, імена, STE-UA |
| [index.html](index.html) · [на сайті](https://denysosadchyi.github.io/pokaz/) | Стартова сторінка з навігатором |
| [_nav/tree.js](_nav/tree.js) | Дерево сторінок — реєстр для навігатора |
| [_nav/nav.js](_nav/nav.js) · [_nav/nav.css](_nav/nav.css) | Скрипт і стилі бокового меню |
| [research/](research/) | Дослідження. Деталі — у розділі «Ресерч» вище |
| [personas.md](personas.md) | Реєстр персон: primary Наталя, secondary Андрій, сценарій «з телефона» |
| [jtbd.md](jtbd.md) | Jobs to be done: main job, ієрархія, JTBD-матриця, гіпотези |
| [sitemap.md](sitemap.md) | Реєстр продукту: сутності зі статусами, реєстр екранів, навігаційна модель, матриця трасування |
| [flows.md](flows.md) | User flows у Mermaid: main job M і related jobs R6, R2, R7. Flows показують стани й тупики |
| [ia.html](ia.html) · [на сайті](https://denysosadchyi.github.io/pokaz/ia.html) | IA на одній HTML-сторінці: дерево sitemap, flows, матриця трасування |
| [research/notes/personas-review.md](research/notes/personas-review.md) | Критика персон і jobs: статус кожного твердження, ризики, 3 питання |
| [research/notes/personas-doresearch.md](research/notes/personas-doresearch.md) | Докази доресерчу: відгуки Google Play про показ за електрику |
| [personas.html](personas.html) · [на сайті](https://denysosadchyi.github.io/pokaz/personas.html) | Персони і jobs на одній HTML-сторінці |
