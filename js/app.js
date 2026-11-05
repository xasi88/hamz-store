// Каталог HamzStore: разделы, поиск, лист товара, заявка списком в WhatsApp.
(() => {
  "use strict";
  const WA = "79289378222"; // номер «Оформление заказов» из Taplink магазина
  const { razdely, tovary } = window.HAMZ;
  const imyaRazdela = Object.fromEntries(razdely);
  const poId = Object.fromEntries(tovary.map((t) => [t.id, t]));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---------- заявка: хранится в браузере покупателя ----------
  const KLUCH = "hamz-zayavka";
  let zayavka = {};
  try { zayavka = JSON.parse(localStorage.getItem(KLUCH)) || {}; } catch (e) { zayavka = {}; }
  for (const id of Object.keys(zayavka)) if (!poId[id]) delete zayavka[id];
  const sohranit = () => { try { localStorage.setItem(KLUCH, JSON.stringify(zayavka)); } catch (e) { /* без памяти браузера тоже работает */ } };
  const vsegoVZayavke = () => Object.keys(zayavka).length;
  const mesto = Object.fromEntries(tovary.map((t, i) => [t.id, i]));
  const idsZayavki = () => Object.keys(zayavka).sort((a, b) => mesto[a] - mesto[b]);

  function postavit(id, n) {
    n = Math.max(0, Math.min(999, n | 0));
    if (n) zayavka[id] = n; else delete zayavka[id];
    sohranit();
    obnovitTovar(id);
    obnovitSchet();
    if ($("#list-zayavka").open) risovatZayavku();
    if ($("#list-tovar").open && Number($("#tovar-telo").dataset.id) === Number(id)) risovatPodrob(id);
  }

  // ---------- слова ----------
  const chislo = (n, a, b, c) => { const m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; };
  const tovarov = (n) => `${n} ${chislo(n, "товар", "товара", "товаров")}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- поиск ----------
  // Слово покупателя: какие фразы искать вместо него.
  const SINONIMY = {
    "заряд": ["блок", "автозарядка"], "адаптер": ["блок"], "кабел": ["шнур"], "провод": ["шнур"],
    "павер": ["power bank"], "повер": ["power bank"], "пауэр": ["power bank"], "аккумулятор": ["power bank"], "внешн": ["power bank"],
    "наушн": ["наушники", "гарнитура"], "гарнитур": ["гарнитура", "наушники"], "музык": ["колонка", "наушники"],
    "машинк": ["машинка", "триммер"], "бритв": ["триммер"], "утюжок": ["утюжок", "выпрямитель"], "брон": ["стекло"],
    "айфон": ["iphone"], "хоко": ["hoco"], "боро": ["borofone"], "ремакс": ["remax"], "магсейф": ["магнитн"],
  };
  const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
  const tekstTovara = Object.fromEntries(tovary.map((t) => [t.id, norm([t.n, t.b, imyaRazdela[t.r], ...t.p].join(" "))]));
  function podhodit(t, slova) {
    const h = tekstTovara[t.id];
    return slova.every((s) => {
      if (h.includes(s)) return true;
      for (const [k, v] of Object.entries(SINONIMY)) {
        if ((s.startsWith(k) || (k.startsWith(s) && s.length >= 4)) && v.some((x) => h.includes(x))) return true;
      }
      return false;
    });
  }

  // ---------- каталог ----------
  let razdel = "vse";
  let zapros = "";
  const spisok = $("#spisok");

  function kartochka(t, i) {
    const n = zayavka[t.id] || 0;
    return `<article class="tovar${n ? " est" : ""}" data-id="${t.id}" style="--i:${Math.min(i, 12)}">
      <button class="tovar-foto" data-otkr aria-label="Подробнее: ${esc(t.n)}">
        <img src="img/tovary/${t.id}-360.webp" srcset="img/tovary/${t.id}-360.webp 360w, img/tovary/${t.id}-720.webp 720w" sizes="(min-width:900px) 25vw, (min-width:640px) 33vw, 50vw" width="360" height="450" alt="${esc(t.n)}" loading="${i < 6 ? "eager" : "lazy"}" decoding="async">
        <span class="v-zayavke"><svg class="ico" style="width:16px;height:16px"><use href="#i-galka"/></svg>В заявке</span>
      </button>
      <p class="tovar-brend">${esc(t.b)}</p>
      <h3 class="tovar-imya" data-otkr>${esc(t.n)}</h3>
      <div class="tovar-dey">${deystvie(t.id, n)}</div>
    </article>`;
  }
  const deystvie = (id, n) => n
    ? `<div class="kolvo"><button data-minus aria-label="Меньше">−</button><output aria-label="Количество">${n}</output><button data-plus aria-label="Больше">+</button></div>`
    : `<button class="knopka knopka-kontur" data-dob>В заявку</button>`;

  function risovat(tiho) {
    spisok.classList.toggle("tiho", !!tiho);
    const slova = norm(zapros).split(/\s+/).filter(Boolean);
    const vidno = tovary.filter((t) => (razdel === "vse" || t.r === razdel) && (!slova.length || podhodit(t, slova)));
    let i = 0;
    let html = "";
    if (!vidno.length) {
      html = `<p class="pusto">Ничего не нашлось. Попробуйте другое слово или <a href="https://wa.me/${WA}?text=${encodeURIComponent("Здравствуйте. Ищу товар: " + zapros)}" target="_blank" rel="noopener">спросите в WhatsApp</a>.</p>`;
    } else if (slova.length) {
      html = `<section class="blok"><h2>Найдено <small>${tovarov(vidno.length)}</small></h2><div class="setka">${vidno.map((t) => kartochka(t, i++)).join("")}</div></section>`;
    } else {
      for (const [kod, imya] of razdely) {
        const v = vidno.filter((t) => t.r === kod);
        if (v.length) html += `<section class="blok" id="r-${kod}"><h2>${esc(imya)} <small>${tovarov(v.length)}</small></h2><div class="setka">${v.map((t) => kartochka(t, i++)).join("")}</div></section>`;
      }
    }
    spisok.innerHTML = html;
  }

  function obnovitTovar(id) {
    const el = spisok.querySelector(`.tovar[data-id="${id}"]`);
    if (!el) return;
    const n = zayavka[id] || 0;
    el.classList.toggle("est", !!n);
    el.querySelector(".tovar-dey").innerHTML = deystvie(id, n);
  }

  function obnovitSchet() {
    const n = vsegoVZayavke();
    $$("[data-schet]").forEach((s) => { s.textContent = n || ""; s.dataset.n = n; });
  }

  // ---------- разделы ----------
  const nav = $("#razdely");
  nav.innerHTML = [["vse", "Все"], ...razdely].map(([k, v]) => `<button class="chip" data-r="${k}" aria-pressed="${k === razdel}">${esc(v)}</button>`).join("");
  $("#spisok-razdelov").innerHTML = [["vse", "Все товары"], ...razdely].map(([k, v]) => {
    const n = k === "vse" ? tovary.length : tovary.filter((t) => t.r === k).length;
    return `<li><button data-r="${k}">${esc(v)}<small>${n}</small></button></li>`;
  }).join("");
  function vybratRazdel(k) {
    razdel = k;
    $$("#razdely .chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.r === k)));
    risovat();
    const kuda = $("#katalog").getBoundingClientRect().top + scrollY - 64;
    if (scrollY > kuda || k !== "vse") scrollTo({ top: kuda, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-r]");
    if (!r) return;
    if ($("#list-razdely").open) zakryt($("#list-razdely"));
    vybratRazdel(r.dataset.r);
    if (r.closest("#razdely")) r.scrollIntoView({ inline: "center", block: "nearest" });
  });

  // ---------- нажатия в каталоге ----------
  spisok.addEventListener("click", (e) => {
    const kart = e.target.closest(".tovar");
    if (!kart) return;
    const id = Number(kart.dataset.id);
    if (e.target.closest("[data-dob]")) { postavit(id, 1); tost("Добавлено в заявку"); }
    else if (e.target.closest("[data-plus]")) postavit(id, (zayavka[id] || 0) + 1);
    else if (e.target.closest("[data-minus]")) postavit(id, (zayavka[id] || 0) - 1);
    else if (e.target.closest("[data-otkr]")) otkrytTovar(id);
  });

  // ---------- поиск: два поля, одно значение ----------
  const polya = $$("[data-poisk]");
  polya.forEach((p) => p.addEventListener("input", () => {
    zapros = p.value.trim();
    polya.forEach((q) => { if (q !== p) q.value = p.value; });
    if (zapros && razdel !== "vse") { razdel = "vse"; $$("#razdely .chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.r === "vse"))); }
    risovat(true);
  }));

  // ---------- листы ----------
  // Кнопка «назад» на телефоне закрывает лист, а не уводит со страницы.
  history.scrollRestoration = "manual";
  let propusk = false;
  function otkryt(d) {
    if (d.open) return;
    const drugoj = $("dialog[open]");
    if (drugoj) { drugoj.close(); d.showModal(); history.replaceState({ list: d.id }, ""); return; }
    d.showModal();
    history.pushState({ list: d.id }, "");
  }
  function zakryt(d) {
    if (!d.open) return;
    d.close();
    if (history.state && history.state.list === d.id) { propusk = true; history.back(); }
  }
  addEventListener("popstate", () => {
    if (propusk) { propusk = false; return; }
    $$("dialog[open]").forEach((d) => d.close());
  });
  $$("dialog.list").forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-zakryt]")) zakryt(d);
    });
    d.addEventListener("cancel", (e) => { e.preventDefault(); zakryt(d); });
  });

  // лист товара
  function risovatPodrob(id) {
    const t = poId[id];
    const n = zayavka[id] || 0;
    const telo = $("#tovar-telo");
    telo.dataset.id = id;
    const vopros = encodeURIComponent(`Здравствуйте. Подскажите цену и наличие: ${t.n}`);
    telo.innerHTML = `<div class="podrob">
      <div class="tovar-foto"><img src="img/tovary/${t.id}-720.webp" width="360" height="450" alt="${esc(t.n)}"></div>
      <div><p class="tovar-brend">${esc(t.b || imyaRazdela[t.r])}</p><h3>${esc(t.n)}</h3></div>
      <ul>${t.p.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="deystviya">
        ${n ? `<div class="kolvo" data-id="${t.id}"><button data-minus aria-label="Меньше">−</button><output aria-label="Количество">${n}</output><button data-plus aria-label="Больше">+</button></div>
               <button class="knopka knopka-glav" data-otkryt-zayavku>Перейти к заявке</button>`
            : `<button class="knopka knopka-glav" data-dob-list="${t.id}">В заявку</button>`}
        <a class="knopka knopka-kontur" href="https://wa.me/${WA}?text=${vopros}" target="_blank" rel="noopener"><svg class="ico"><use href="#i-wa"/></svg>Спросить про этот товар</a>
      </div></div>`;
  }
  function otkrytTovar(id) {
    risovatPodrob(id);
    $("#tovar-zag").textContent = imyaRazdela[poId[id].r];
    otkryt($("#list-tovar"));
  }
  $("#tovar-telo").addEventListener("click", (e) => {
    const id = Number($("#tovar-telo").dataset.id);
    if (e.target.closest("[data-dob-list]")) { postavit(id, 1); tost("Добавлено в заявку"); }
    else if (e.target.closest("[data-plus]")) postavit(id, (zayavka[id] || 0) + 1);
    else if (e.target.closest("[data-minus]")) postavit(id, (zayavka[id] || 0) - 1);
  });

  // лист заявки
  const imyaPole = $("#imya");
  try { imyaPole.value = localStorage.getItem("hamz-imya") || ""; } catch (e) { /* нет памяти браузера */ }
  function tekstZayavki() {
    const tip = ($('input[name="tip"]:checked') || {}).value || "оптом";
    const stroki = idsZayavki().map((id, k) => `${k + 1}. ${poId[id].n}: ${zayavka[id]} шт.`);
    const imya = imyaPole.value.trim();
    const chasti = ["Здравствуйте. Заявка из каталога HamzStore.", `Покупаю ${tip}.`, "", ...stroki, "", "Подскажите цены и наличие."];
    if (imya) chasti.push(`Имя: ${imya}`);
    return chasti.join("\n");
  }
  function risovatZayavku() {
    const ids = idsZayavki();
    const telo = $("#zayavka-telo");
    $("#zayavka-niz").hidden = !ids.length;
    $("#zayavka-zag").textContent = ids.length ? `Заявка: ${tovarov(ids.length)}` : "Заявка";
    telo.innerHTML = ids.length
      ? `<ul class="zayavka-stroki">${ids.map((id) => `<li class="zstroka" data-id="${id}">
          <img src="img/tovary/${id}-360.webp" width="64" height="80" alt="">
          <div><p>${esc(poId[id].n)}</p><div class="kolvo"><button data-minus aria-label="Меньше">−</button><output aria-label="Количество">${zayavka[id]}</output><button data-plus aria-label="Больше">+</button></div></div>
        </li>`).join("")}</ul>`
      : `<div class="zayavka-pusto"><p>В заявке пока пусто.</p><ol><li>Нажмите «В заявку» у нужных товаров.</li><li>Укажите количество.</li><li>Отправьте заявку в WhatsApp одним сообщением.</li></ol></div>`;
    $("#otpravit").href = `https://wa.me/${WA}?text=${encodeURIComponent(tekstZayavki())}`;
  }
  $("#zayavka-telo").addEventListener("click", (e) => {
    const s = e.target.closest(".zstroka");
    if (!s) return;
    const id = s.dataset.id;
    if (e.target.closest("[data-plus]")) postavit(id, zayavka[id] + 1);
    else if (e.target.closest("[data-minus]")) postavit(id, zayavka[id] - 1);
  });
  $("#zayavka-niz").addEventListener("input", () => {
    try { localStorage.setItem("hamz-imya", imyaPole.value.trim()); } catch (e) { /* нет памяти браузера */ }
    $("#otpravit").href = `https://wa.me/${WA}?text=${encodeURIComponent(tekstZayavki())}`;
  });
  $("#ochistit").addEventListener("click", () => {
    const ids = Object.keys(zayavka);
    zayavka = {};
    sohranit();
    ids.forEach(obnovitTovar);
    obnovitSchet();
    risovatZayavku();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-otkryt-zayavku]")) return;
    risovatZayavku();
    otkryt($("#list-zayavka"));
  });

  // ---------- нижняя панель ----------
  $(".panel").addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (!b) return;
    if (b.dataset.k === "katalog") vybratRazdel("vse");
    if (b.dataset.k === "razdely") otkryt($("#list-razdely"));
    if (b.dataset.k === "poisk") {
      const p = $("#poisk");
      scrollTo({ top: p.getBoundingClientRect().top + scrollY - 80, behavior: "smooth" });
      p.focus({ preventScroll: true });
    }
  });

  // ---------- строка разделов на компьютере прячется при прокрутке вниз ----------
  let proshlo = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY;
    nav.classList.toggle("spryatan", y > proshlo && y > 600);
    proshlo = y;
  }, { passive: true });

  // ---------- подсказка ----------
  let tajmer;
  function tost(t) {
    const el = $("#tost");
    el.textContent = t;
    el.classList.add("vidno");
    clearTimeout(tajmer);
    tajmer = setTimeout(() => el.classList.remove("vidno"), 1600);
  }

  $("[data-vsego]").textContent = tovarov(tovary.length);
  risovat();
  obnovitSchet();
})();
