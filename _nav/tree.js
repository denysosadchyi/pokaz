// Дерево сторінок репо — єдине джерело для навігатора.
// Нова HTML-сторінка стає вузлом тут у тому самому кроці, коли її створено.
//
// Правило дерева: верхній рівень — лише назви сторінок (без розділів-заголовків).
// Розділи сторінки — її children: кожен <h2 id> стає дочірнім вузлом,
// <h3 id> — вкладеним під свій <h2>. Назви — ті самі, що в заголовках.
// Вузол з children можна згортати; поточна сторінка розгорнута.
//
// Вузол: { title: "Назва", href: "шлях/від/кореня.html#якір", children: [...] }
// Вузол без href — гілка без своєї сторінки (лише «Екрани» і розділи груп у ній).
// href — завжди від кореня репо, без "/" на початку.
// icon — ОБОВ'ЯЗКОВИЙ для кожного вузла верхнього рівня: ім'я іконки з ICONS у nav.js (Lucide).
// Нова сторінка верхнього рівня → додай icon тут і, якщо іконки ще нема, її SVG-розмітку в ICONS (nav.js).

window.NAV_TREE = [
  { title: "Старт", icon: "house", href: "index.html" },
  { title: "Ресерч", icon: "search", href: "research/research.html", children: [
    { title: "Звідки дані", href: "research/research.html#sources" },
    { title: "Конкуренти", href: "research/research.html#competitors" },
    { title: "Бенчмарк", href: "research/research.html#benchmark" },
    { title: "Патерни", href: "research/research.html#patterns" },
    { title: "Висновки", href: "research/research.html#conclusions", children: [
      { title: "Доресерч після персон", href: "research/research.html#doresearch" },
    ] },
    { title: "Джерела", href: "research/research.html#refs" },
  ] },
  { title: "Персони і jobs", icon: "users", href: "personas.html", children: [
    { title: "Як читати", href: "personas.html#legend" },
    { title: "Персони", href: "personas.html#personas" },
    { title: "Сценарій Наталі", href: "personas.html#scenarios" },
    { title: "Ієрархія jobs", href: "personas.html#hierarchy" },
    { title: "JTBD-матриця", href: "personas.html#matrix" },
    { title: "Висновок", href: "personas.html#conclusion" },
  ] },
  { title: "Структура (IA)", icon: "network", href: "ia.html", children: [
    { title: "Sitemap", href: "ia.html#map" },
    { title: "Flows", href: "ia.html#flows", children: [
      { title: "M · Закрити місяць", href: "ia.html#flow-m" },
      { title: "R6 · Звідки цифри", href: "ia.html#flow-r6" },
      { title: "R2 · Виправити помилку", href: "ia.html#flow-r2" },
      { title: "R7 · Чужий рахунок", href: "ia.html#flow-r7" },
    ] },
    { title: "Трасування", href: "ia.html#trace" },
  ] },
  { title: "Напрями стилю", icon: "swatches", href: "concept/directions.html", children: [
    { title: "1 · Квитанція", href: "concept/directions.html#d1" },
    { title: "2 · Вечірнє вікно", href: "concept/directions.html#d2" },
    { title: "3 · Табло", href: "concept/directions.html#d3" },
    { title: "4 · Зошит", href: "concept/directions.html#d4" },
    { title: "5 · Графіт", href: "concept/directions.html#d5" },
    { title: "6 · Пастельний дім", href: "concept/directions.html#d6" },
    { title: "Порівняння", href: "concept/directions.html#compare" },
  ] },
  { title: "Концепт", icon: "palette", href: "concept.html", children: [
    { title: "Стиль у дії", href: "concept.html#live" },
    { title: "Колір", href: "concept.html#color" },
    { title: "Шрифти і розміри", href: "concept.html#type" },
    { title: "Форма", href: "concept.html#form" },
    { title: "Фото", href: "concept.html#photo" },
    { title: "Іконки", href: "concept.html#icons" },
    { title: "Компоненти", href: "concept.html#components" },
    { title: "Екрани в стилі", href: "concept.html#screens" },
    { title: "Контраст", href: "concept.html#contrast" },
    { title: "Дефекти", href: "concept.html#defects" },
  ] },
  // Гілка «Екрани»: вайрфрейми продукту. Розділи — групи з sitemap.md, «Екрани».
  // Розділ групи з'являється разом із першою сторінкою цієї групи. Гілка й розділи не мають своєї сторінки (без href).
  // Вузол екрана не має children-блоків: зони екрана в дереві не показуємо. Children екрана — лише сторінки його станів.
  { title: "Екрани", icon: "monitor", children: [
    { title: "Місяць", children: [
      { title: "Подати показники", href: "wireframes/month.html", children: [
        { title: "Порожній", href: "wireframes/month-empty.html" },
        { title: "Помилка", href: "wireframes/month-error.html" },
        { title: "Завантаження", href: "wireframes/month-loading.html" },
      ] },
      { title: "Історія показників і платежів", href: "wireframes/history.html", children: [
        { title: "Порожній", href: "wireframes/history-empty.html" },
        { title: "Помилка", href: "wireframes/history-error.html" },
        { title: "Завантаження", href: "wireframes/history-loading.html" },
      ] },
    ] },
    { title: "Показники", children: [
      { title: "Подати показники", href: "wireframes/reading.html", children: [
        { title: "Порожній", href: "wireframes/reading-empty.html" },
        { title: "Помилка", href: "wireframes/reading-error.html" },
        { title: "Завантаження", href: "wireframes/reading-loading.html" },
        { title: "Успіх", href: "wireframes/reading-success.html" },
      ] },
    ] },
    { title: "Сума", children: [
      { title: "Сплатити", href: "wireframes/bill.html", children: [
        { title: "Порожній", href: "wireframes/bill-empty.html" },
        { title: "Помилка", href: "wireframes/bill-error.html" },
        { title: "Завантаження", href: "wireframes/bill-loading.html" },
        { title: "Поп-ап: картки", href: "wireframes/bill-cards.html" },
        { title: "Поп-ап: видалити картку", href: "wireframes/bill-cards-delete.html" },
        { title: "Поп-ап: нова картка", href: "wireframes/bill-card.html" },
        { title: "Проводимо платіж", href: "wireframes/bill-paying.html" },
        { title: "В обробці", href: "wireframes/bill-processing.html" },
        { title: "Не пройшов", href: "wireframes/bill-declined.html" },
        { title: "Успіх", href: "wireframes/bill-success.html" },
      ] },
    ] },
    { title: "Рахунки", children: [
      { title: "Додати рахунок", href: "wireframes/add-account.html", children: [
        { title: "Помилка", href: "wireframes/add-account-error.html" },
        { title: "Завантаження", href: "wireframes/add-account-loading.html" },
        { title: "Успіх", href: "wireframes/add-account-success.html" },
      ] },
      { title: "Меню перемикача", href: "wireframes/account-menu.html" },
    ] },
    { title: "Відключення", children: [
      { title: "Графік відключень", href: "wireframes/outages.html", children: [
        { title: "Порожній", href: "wireframes/outages-empty.html" },
        { title: "Помилка", href: "wireframes/outages-error.html" },
        { title: "Завантаження", href: "wireframes/outages-loading.html" },
      ] },
    ] },
  ] },
];
