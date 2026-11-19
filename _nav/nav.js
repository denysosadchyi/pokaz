// Навігатор: будує бокове дерево з window.NAV_TREE (_nav/tree.js).
// Сторінка вказує корінь репо через <html data-root="../"> (для кореня — "./").
// Вузли з children згортаються; стан пам'ятається в localStorage.
(function () {
  // Сторінка всередині iframe (попап вайрфрейму на ia.html) — без навігатора.
  if (window.self !== window.top) return;
  var root = document.documentElement.getAttribute("data-root") || "./";
  var tree = window.NAV_TREE || [];
  var KEY = "repo-nav-open";
  var KEY_COLLAPSED = "repo-nav-collapsed"; // "1" — навігатор згорнуто

  // Стан згортання ставимо на <html> одразу, до побудови дерева.
  var collapsed = false;
  try { collapsed = localStorage.getItem(KEY_COLLAPSED) === "1"; } catch (e) {}
  function normalize(href, keepHash) {
    var u = new URL(href, location.href);
    var path = u.pathname.replace(/\/index\.html$/, "/");
    return u.protocol + "//" + u.host + decodeURI(path) + (keepHash ? u.hash : "");
  }
  var herePage = normalize(location.href);

  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }

  var uid = 0;
  var links = [];

  function containsHere(node) {
    if (node.href && normalize(root + node.href) === herePage) return true;
    return (node.children || []).some(containsHere);
  }

  // Іконки вузлів верхнього рівня (Lucide 24×24, stroke). Ключ = node.icon у tree.js.
  var ICONS = {
    house: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    network: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'
  };

  function renderList(nodes, depth) {
    var ul = document.createElement("ul");
    ul.className = "nav-list";
    nodes.forEach(function (node) {
      var li = document.createElement("li");
      var row = document.createElement("div");
      row.className = "nav-row";
      row.style.setProperty("--depth", depth);

      var hasKids = node.children && node.children.length;
      var a;
      if (node.href) {
        a = document.createElement("a");
        a.className = "nav-link";
        a.href = root + node.href;
        var isPage = node.href.indexOf("#") === -1;
        if (isPage && normalize(a.href) === herePage) a.setAttribute("aria-current", "page");
        links.push(a);
      } else {
        // Гілка без своєї сторінки: підпис, клік по ньому згортає гілку.
        a = document.createElement("span");
        a.className = "nav-link nav-branch";
      }
      a.textContent = node.title;
      if (depth === 0 && node.icon && ICONS[node.icon]) {
        a.title = node.title;
        if (containsHere(node)) a.classList.add("is-here");
        a.insertAdjacentHTML("afterbegin", '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[node.icon] + '</svg>');
      } else if (depth === 0 && window.console) console.warn("nav: вузол верхнього рівня без icon:", node.title);
      var key = node.href || "branch:" + node.title;

      if (hasKids) {
        var id = "nav-sub-" + (++uid);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "nav-toggle";
        btn.setAttribute("aria-controls", id);
        btn.setAttribute("aria-label", "Розгорнути або згорнути: " + node.title);
        var open = key in saved ? saved[key] : containsHere(node);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        row.appendChild(btn);
        row.appendChild(a);
        li.appendChild(row);
        var sub = renderList(node.children, depth + 1);
        sub.id = id;
        sub.hidden = !open;
        li.appendChild(sub);
        function toggle() {
          var now = btn.getAttribute("aria-expanded") !== "true";
          btn.setAttribute("aria-expanded", now ? "true" : "false");
          sub.hidden = !now;
          saved[key] = now;
          save();
        }
        btn.addEventListener("click", toggle);
        if (!node.href) a.addEventListener("click", function () {
          // Згорнутий навігатор: клік по іконці гілки розгортає навігатор і цю гілку.
          if (depth === 0 && document.body.classList.contains("repo-nav-collapsed")) {
            if (window.__repoNavExpand) window.__repoNavExpand();
            if (btn.getAttribute("aria-expanded") === "true") return;
          }
          toggle();
        });
      } else {
        row.classList.add("is-leaf");
        row.appendChild(a);
        li.appendChild(row);
      }
      ul.appendChild(li);
    });
    return ul;
  }

  // Підсвітка розділу, в якому зараз читач (за хешем).
  function markSection() {
    var full = normalize(location.href, true);
    links.forEach(function (a) {
      if (a.getAttribute("aria-current") === "page") return;
      if (location.hash && normalize(a.href, true) === full) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  }

  function mount() {
    var nav = document.createElement("nav");
    nav.className = "repo-nav";
    nav.setAttribute("aria-label", "Сторінки репо");
    var head = document.createElement("div");
    head.className = "repo-nav-head";
    var label = document.createElement("span");
    label.className = "repo-nav-label";
    label.textContent = "Показ · репо";
    head.appendChild(label);

    // Кнопка згортає весь навігатор
    var list = renderList(tree, 0);
    list.id = "repo-nav-tree";
    var collapseBtn = document.createElement("button");
    collapseBtn.type = "button";
    collapseBtn.className = "repo-nav-collapse";
    collapseBtn.setAttribute("aria-controls", list.id);
    collapseBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
      '<path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function applyCollapsed() {
      nav.classList.toggle("is-collapsed", collapsed);
      document.body.classList.toggle("repo-nav-collapsed", collapsed);
      collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      collapseBtn.setAttribute("aria-label", collapsed ? "Розгорнути навігатор" : "Згорнути навігатор");
      collapseBtn.title = collapseBtn.getAttribute("aria-label");
      label.hidden = collapsed;
    }
    window.__repoNavExpand = function () {
      collapsed = false;
      try { localStorage.setItem(KEY_COLLAPSED, "0"); } catch (e) {}
      applyCollapsed();
    };
    collapseBtn.addEventListener("click", function () {
      collapsed = !collapsed;
      try { localStorage.setItem(KEY_COLLAPSED, collapsed ? "1" : "0"); } catch (e) {}
      applyCollapsed();
    });
    applyCollapsed();
    head.appendChild(collapseBtn);

    nav.appendChild(head);
    nav.appendChild(list);
    // Окремий елемент: хост + Shadow DOM, стилі сторінки всередину не протікають.
    var host = document.createElement("div");
    host.id = "repo-nav-host";
    var shadow = host.attachShadow({ mode: "open" });
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = root + "_nav/nav.css";
    shadow.appendChild(css);
    shadow.appendChild(nav);
    document.body.insertBefore(host, document.body.firstChild);
    document.body.classList.add("has-repo-nav");
    markSection();
    window.addEventListener("hashchange", markSection);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
