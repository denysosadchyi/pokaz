// Дерево сторінок репо — єдине джерело для навігатора.
// Нова HTML-сторінка стає вузлом тут у тому самому кроці, коли її створено.
//
// Правило дерева: верхній рівень — лише назви сторінок (без розділів-заголовків).
// Розділи сторінки — її children: кожен <h2 id> стає дочірнім вузлом,
// <h3 id> — вкладеним під свій <h2>. Назви — ті самі, що в заголовках.
// Вузол з children можна згортати; поточна сторінка розгорнута.
//
// Вузол: { title: "Назва", href: "шлях/від/кореня.html#якір", children: [...] }
// href — завжди від кореня репо, без "/" на початку.

window.NAV_TREE = [
  { title: "Старт", href: "index.html" },
  { title: "Ресерч", href: "research/research.html", children: [
    { title: "Звідки дані", href: "research/research.html#sources" },
    { title: "Конкуренти", href: "research/research.html#competitors" },
    { title: "Бенчмарк", href: "research/research.html#benchmark" },
    { title: "Патерни", href: "research/research.html#patterns" },
    { title: "Висновки", href: "research/research.html#conclusions", children: [
      { title: "Доресерч після персон", href: "research/research.html#doresearch" },
    ] },
    { title: "Джерела", href: "research/research.html#refs" },
  ] },
  { title: "Персони і jobs", href: "personas.html", children: [
    { title: "Як читати", href: "personas.html#legend" },
    { title: "Персони", href: "personas.html#personas" },
    { title: "Сценарій Наталі", href: "personas.html#scenarios" },
    { title: "Ієрархія jobs", href: "personas.html#hierarchy" },
    { title: "JTBD-матриця", href: "personas.html#matrix" },
    { title: "Висновок", href: "personas.html#conclusion" },
  ] },
  { title: "Структура (IA)", href: "ia.html", children: [
    { title: "Sitemap", href: "ia.html#map" },
    { title: "Flows", href: "ia.html#flows", children: [
      { title: "M · Закрити місяць", href: "ia.html#flow-m" },
      { title: "R6 · Звідки цифри", href: "ia.html#flow-r6" },
      { title: "R2 · Виправити помилку", href: "ia.html#flow-r2" },
      { title: "R7 · Чужий рахунок", href: "ia.html#flow-r7" },
    ] },
    { title: "Трасування", href: "ia.html#trace" },
  ] },
];
