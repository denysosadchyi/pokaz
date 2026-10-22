// Навігатор: будує бокове меню з window.NAV_TREE (_nav/tree.js).
// Сторінка вказує корінь репо через <html data-root="../"> (для кореня — "./").
(function () {
  var root = document.documentElement.getAttribute("data-root") || "./";
  var tree = window.NAV_TREE || [];

  // Нормалізуємо адресу: без query/hash, ".../" і ".../index.html" — одне й те саме.
  function normalize(href) {
    var u = new URL(href, location.href);
    var path = u.pathname.replace(/\/index\.html$/, "/");
    return u.protocol + "//" + u.host + decodeURI(path);
  }
  var here = normalize(location.href);

  function renderList(nodes, depth) {
    var ul = document.createElement("ul");
    ul.className = "nav-list";
    nodes.forEach(function (node) {
      var li = document.createElement("li");
      if (node.branch) {
        li.className = "nav-branch";
        var label = document.createElement("div");
        label.className = "nav-branch-label";
        label.textContent = node.branch;
        li.appendChild(label);
      } else {
        var a = document.createElement("a");
        a.className = "nav-link";
        a.href = root + node.href;
        a.textContent = node.title;
        a.style.setProperty("--depth", depth);
        if (normalize(a.href) === here) a.setAttribute("aria-current", "page");
        li.appendChild(a);
      }
      if (node.children && node.children.length) {
        li.appendChild(renderList(node.children, node.branch ? depth : depth + 1));
      }
      ul.appendChild(li);
    });
    return ul;
  }

  function mount() {
    var nav = document.createElement("nav");
    nav.className = "repo-nav";
    nav.setAttribute("aria-label", "Сторінки репо");
    var head = document.createElement("a");
    head.className = "repo-nav-head";
    head.href = root + "index.html";
    head.textContent = "Показ · репо";
    nav.appendChild(head);
    nav.appendChild(renderList(tree, 0));
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.classList.add("has-repo-nav");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
