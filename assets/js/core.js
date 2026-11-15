/* Sandık — ortak yardımcılar. Tüm araçlar bu dosyayı kullanır. */
(function () {
  "use strict";

  var W = window;
  var S = (W.Sandik = W.Sandik || {});

  S.config = W.SANDIK_CONFIG || {};

  /* ---------- seçiciler ---------- */
  S.$ = function (sel, root) { return (root || document).querySelector(sel); };
  S.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  S.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  S.el = function (tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (html != null) n.innerHTML = html;
    return n;
  };

  /* ---------- biçimlendirme ---------- */
  S.bytes = function (n) {
    if (n == null || isNaN(n)) return "—";
    if (n < 1024) return n + " B";
    var u = ["KB", "MB", "GB"], i = -1;
    do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
    return (n < 10 ? n.toFixed(1) : Math.round(n)) + " " + u[i];
  };

  S.pct = function (part, whole) {
    if (!whole) return "—";
    return "%" + Math.round((1 - part / whole) * 100);
  };

  S.ext = function (name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  };

  S.baseName = function (name) {
    return String(name || "dosya").replace(/\.[a-z0-9]+$/i, "");
  };

  S.safeName = function (name, fallback) {
    var base = S.baseName(name || fallback || "sandik");
    return (base || "sandik").replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "-").slice(0, 80);
  };

  S.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  S.nextFrame = function () {
    return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 0); }); });
  };

  /* ---------- indirme ---------- */
  S.download = function (blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "sandik-indirme";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  };

  S.copy = function (text) {
    if (navigator.clipboard && W.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        resolve();
      } catch (e) { reject(e); }
    });
  };

  /* ---------- bildirim ---------- */
  var host = null;
  S.toast = function (msg, kind, ms) {
    if (!host) {
      host = S.el("div", { class: "toast-host", role: "status", "aria-live": "polite" });
      document.body.appendChild(host);
    }
    var t = S.el("div", { class: "toast" + (kind ? " " + kind : "") });
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = "opacity .25s, transform .25s";
      t.style.opacity = "0";
      t.style.transform = "translateY(6px)";
      setTimeout(function () { t.remove(); }, 260);
    }, ms || 3200);
  };

  /* ---------- dosya okuma ---------- */
  S.readArrayBuffer = function (file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error("Dosya okunamadı")); };
      fr.readAsArrayBuffer(file);
    });
  };

  S.readDataURL = function (file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error("Dosya okunamadı")); };
      fr.readAsDataURL(file);
    });
  };

  S.loadImage = function (src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("Görsel açılamadı. Desteklenmeyen bir format olabilir.")); };
      img.src = src;
    });
  };

  S.sha = function (file) {
    var s = file.name + ":" + file.size + ":" + (file.lastModified || 0);
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return String(h);
  };

  /* ---------- sürükle bırak ---------- */
  S.setupDropzone = function (zone, onFiles) {
    var input = zone.querySelector('input[type="file"]');
    var depth = 0;

    function handle(files) {
      var arr = Array.prototype.slice.call(files || []);
      if (!arr.length) return;
      onFiles(arr);
    }

    if (input) {
      input.addEventListener("change", function () {
        handle(input.files);
        input.value = "";
      });
    }
    ["dragenter", "dragover"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        depth++;
        zone.classList.add("is-over");
      });
    });
    zone.addEventListener("dragleave", function (e) {
      e.preventDefault();
      depth = Math.max(0, depth - 1);
      if (!depth) zone.classList.remove("is-over");
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      depth = 0;
      zone.classList.remove("is-over");
      handle(e.dataTransfer && e.dataTransfer.files);
    });
    return { open: function () { input && input.click(); } };
  };

  /* ---------- pdf.js ---------- */
  S.pdfjs = function () {
    var lib = W.pdfjsLib;
    if (!lib) throw new Error("PDF motoru yüklenemedi.");
    if (!lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc = "libs/pdf.worker.min.js";
    }
    return lib;
  };

  S.openPdf = function (data) {
    var lib = S.pdfjs();
    function open(password) {
      var opts = { data: data.slice(0), isEvalSupported: false };
      if (password) opts.password = password;
      return lib.getDocument(opts).promise;
    }
    return open().catch(function (err) {
      if (err && err.name === "PasswordException") {
        var pw = W.prompt("Bu PDF şifreli. Lütfen şifreyi girin:");
        if (pw) return open(pw);
      }
      throw new Error("PDF açılamadı. Dosya bozuk veya şifreli olabilir.");
    });
  };

  S.renderPage = function (page, scale) {
    var vp = page.getViewport({ scale: scale });
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d", { alpha: false });
    canvas.width = Math.max(1, Math.floor(vp.width));
    canvas.height = Math.max(1, Math.floor(vp.height));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return page.render({ canvasContext: ctx, viewport: vp, background: "#ffffff" }).promise.then(function () {
      return canvas;
    });
  };

  S.canvasToBlob = function (canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) resolve(b); else reject(new Error("Görsel oluşturulamadı."));
      }, type, quality);
    });
  };

  /* ---------- zip ---------- */
  S.zip = function (files) {
    if (!W.fflate) throw new Error("ZIP motoru yüklenemedi.");
    return new Promise(function (resolve, reject) {
      W.fflate.zip(files, { level: 6 }, function (err, data) {
        if (err) reject(err);
        else resolve(new Blob([data], { type: "application/zip" }));
      });
    });
  };

  /* ---------- JPEG EXIF yönü ---------- */
  S.jpegOrientation = function (buffer) {
    try {
      var v = new DataView(buffer);
      if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return 1;
      var off = 2;
      while (off + 4 <= v.byteLength) {
        if (v.getUint8(off) !== 0xFF) { off++; continue; }
        var marker = v.getUint8(off + 1);
        if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { off += 2; continue; }
        if (marker === 0xDA) break;
        var size = v.getUint16(off + 2);
        if (size < 2) break;
        if (marker === 0xE1 && off + 10 <= v.byteLength &&
            v.getUint32(off + 4) === 0x45786966 && v.getUint16(off + 8) === 0) {
          var t = off + 10;
          if (t + 8 > v.byteLength) return 1;
          var little = v.getUint16(t) === 0x4949;
          var ifd = t + v.getUint32(t + 4, little);
          if (ifd + 2 > v.byteLength) return 1;
          var n = v.getUint16(ifd, little);
          for (var i = 0; i < n; i++) {
            var e = ifd + 2 + i * 12;
            if (e + 12 > v.byteLength) break;
            if (v.getUint16(e, little) === 0x0112) {
              var o = v.getUint16(e + 8, little);
              return o >= 1 && o <= 8 ? o : 1;
            }
          }
          return 1;
        }
        off += 2 + size;
      }
    } catch (err) {}
    return 1;
  };

  /* ---------- ilerleme ---------- */
  S.progress = function (wrap) {
    var bar = wrap.querySelector("i");
    var label = wrap.querySelector(".progress-label span:last-child");
    return function (ratio, text) {
      if (bar) bar.style.width = Math.max(0, Math.min(1, ratio)) * 100 + "%";
      if (label && text) label.textContent = text;
    };
  };

  S.setBusy = function (btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn.dataset.old = btn.innerHTML;
      btn.setAttribute("aria-disabled", "true");
      btn.disabled = true;
      btn.innerHTML = '<span class="spin"></span>' + (label || "İşleniyor…");
    } else {
      btn.innerHTML = btn.dataset.old || btn.innerHTML;
      btn.removeAttribute("aria-disabled");
      btn.disabled = false;
    }
  };

  /* ---------- ikonlar ---------- */
  var ICONS = {
    up: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
    download: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    warn: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.6 17.4A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3.1L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
  };
  S.icon = function (name, cls) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') +
      ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  };

  /* ---------- tema ---------- */
  S.initTheme = function () {
    var KEY = "sandik-theme";
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

    S.$$("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cur = root.getAttribute("data-theme");
        if (!cur) {
          cur = W.matchMedia && W.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        var next = cur === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        btn.setAttribute("aria-label", next === "dark" ? "Açık temaya geç" : "Koyu temaya geç");
      });
    });
  };

  /* ---------- yıl / menü ---------- */
  S.initMisc = function () {
    S.$$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
    S.$$("[data-config-email]").forEach(function (n) {
      var mail = S.config.contactEmail || "iletisim@example.com";
      n.textContent = mail;
      if (n.tagName === "A") n.href = "mailto:" + mail;
    });
    S.$$("[data-config-site]").forEach(function (n) { n.textContent = S.config.siteUrl || "sandik.app"; });
  };

  /* ---------- reklamlar ---------- */
  S.initAds = function () {
    var client = (S.config.adsenseClient || "").trim();
    var slots = S.$$(".ad-slot");
    var consentKey = "sandik-ad-consent";
    var consent = null;
    try { consent = localStorage.getItem(consentKey); } catch (e) {}

    function loadScript() {
      if (W.__sandikAdsLoaded) return;
      W.__sandikAdsLoaded = true;
      var sc = document.createElement("script");
      sc.async = true;
      sc.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(client);
      sc.crossOrigin = "anonymous";
      document.head.appendChild(sc);
    }

    function mount() {
      loadScript();
      slots.forEach(function (slot) {
        if (slot.dataset.mounted === "1") return;
        slot.dataset.mounted = "1";
        slot.hidden = false;
        var ins = document.createElement("ins");
        ins.className = "adsbygoogle";
        ins.style.display = "block";
        ins.setAttribute("data-ad-client", client);
        var id = slot.getAttribute("data-slot-id") || "";
        if (id) ins.setAttribute("data-ad-slot", id);
        ins.setAttribute("data-ad-format", slot.getAttribute("data-format") || "auto");
        ins.setAttribute("data-full-width-responsive", "true");
        slot.textContent = "";
        slot.appendChild(ins);
        try { (W.adsbygoogle = W.adsbygoogle || []).push({}); } catch (e) {}
      });
    }

    if (!client) {
      slots.forEach(function (s) { s.hidden = true; });
      return;
    }

    if (consent === "yes") { mount(); return; }

    var banner = S.el("div", { class: "consent", role: "dialog", "aria-label": "Reklam izni" });
    banner.innerHTML =
      '<p><strong>Reklam izni.</strong> Bu site ücretsiz kalabilmek için reklam gösterir. ' +
      'Kabul edersen Google, ilgi alanına göre reklam için çerez kullanabilir. ' +
      'Reddedersen yalnızca reklamsız (veya kişiselleştirilmemiş) devam eder.</p>' +
      '<div class="row"><a class="btn btn-ghost btn-sm" href="gizlilik.html">Gizlilik</a>' +
      '<button class="btn btn-sm" data-consent="no">Reddet</button>' +
      '<button class="btn btn-primary btn-sm" data-consent="yes">Kabul et</button></div>';
    document.body.appendChild(banner);
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-consent]");
      if (!b) return;
      var val = b.getAttribute("data-consent");
      try { localStorage.setItem(consentKey, val); } catch (err) {}
      banner.remove();
      if (val === "yes") mount();
      else slots.forEach(function (x) { x.hidden = true; });
    });
  };

  /* ---------- servis çalışanı ---------- */
  S.initSW = function () {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
    W.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  };

  /* ---------- ortak başlat ---------- */
  S.ready = function (fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  };

  S.ready(function () {
    S.initTheme();
    S.initMisc();
    S.initAds();
    S.initSW();

    /* Dosya dropzone dışına bırakılırsa tarayıcı dosyayı açmasın. */
    ["dragover", "drop"].forEach(function (ev) {
      W.addEventListener(ev, function (e) {
        if (e.target && e.target.closest && e.target.closest(".dropzone")) return;
        e.preventDefault();
      });
    });
  });
})();
