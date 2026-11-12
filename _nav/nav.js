// Навігатор: будує бокове дерево з window.NAV_TREE (_nav/tree.js).
// Сторінка вказує корінь репо через <html data-root="../"> (для кореня — "./").
// Вузли з children згортаються; стан пам'ятається в localStorage.
(function () {
  var root = document.documentElement.getAttribute("data-root") || "./";
  var tree = window.NAV_TREE || [];
  var KEY = "repo-nav-open";

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
    if (normalize(root + node.href) === herePage) return true;
    return (node.children || []).some(containsHere);
  }

  function renderList(nodes, depth) {
    var ul = document.createElement("ul");
    ul.className = "nav-list";
    nodes.forEach(function (node) {
      var li = document.createElement("li");
      var row = document.createElement("div");
      row.className = "nav-row";
      row.style.setProperty("--depth", depth);

      var hasKids = node.children && node.children.length;
      var a = document.createElement("a");
      a.className = "nav-link";
      a.href = root + node.href;
      a.textContent = node.title;
      var isPage = node.href.indexOf("#") === -1;
      if (isPage && normalize(a.href) === herePage) a.setAttribute("aria-current", "page");
      links.push(a);

      if (hasKids) {
        var id = "nav-sub-" + (++uid);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "nav-toggle";
        btn.setAttribute("aria-controls", id);
        btn.setAttribute("aria-label", "Розгорнути або згорнути: " + node.title);
        var open = node.href in saved ? saved[node.href] : containsHere(node);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        row.appendChild(btn);
        row.appendChild(a);
        li.appendChild(row);
        var sub = renderList(node.children, depth + 1);
        sub.id = id;
        sub.hidden = !open;
        li.appendChild(sub);
        btn.addEventListener("click", function () {
          var now = btn.getAttribute("aria-expanded") !== "true";
          btn.setAttribute("aria-expanded", now ? "true" : "false");
          sub.hidden = !now;
          saved[node.href] = now;
          save();
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
    head.textContent = "Показ · репо";
    nav.appendChild(head);
    nav.appendChild(renderList(tree, 0));
    document.body.insertBefore(nav, document.body.firstChild);
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
