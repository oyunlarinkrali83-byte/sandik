/* PDF sayfa düzenle: sil, sırala, döndür, ayır */
(function () {
  "use strict";
  var S = window.Sandik;
  var PDFLib = window.PDFLib;

  var drop = S.$("#drop"), editor = S.$("#editor"), grid = S.$("#grid"),
      info = S.$("#info"), prog = S.$("#prog");

  if (!drop) return;

  var pdfBytes = null, fileName = "belge", totalOrig = 0;
  var items = [];
  var base = {};      // orig -> dataURL
  var rotCache = {};
  var busy = false;
  var loading = false;
  var seq = 0;

  var setProgress = S.progress(prog);
  S.setupDropzone(drop, function (files) { load(files[0]); });

  async function load(file) {
    if (!file) return;
    if (loading) { S.toast("Önce mevcut dosya hazırlansın.", "err"); return; }
    loading = true;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      loading = false;
      S.toast("Lütfen bir PDF seç.", "err");
      return;
    }
    prog.classList.remove("hidden");
    setProgress(0, "PDF açılıyor…");
    try {
      var ab = await S.readArrayBuffer(file);
      pdfBytes = ab.slice(0);
      fileName = S.baseName(file.name) || "belge";
      var doc = await S.openPdf(ab);
      totalOrig = doc.numPages;
      if (totalOrig > 300) {
        S.toast("300 sayfadan fazla dosyalarda işlem yavaş olabilir.", "err", 4500);
      }
      items = [];
      base = {};
      rotCache = {};
      seq = 0;
      for (var n = 1; n <= totalOrig; n++) {
        items.push({ uid: ++seq, orig: n - 1, rot: 0, sel: false });
      }
      editor.classList.remove("hidden");
      grid.innerHTML = "";
      await renderThumbs(doc);
      drawGrid();
      setProgress(0, "");
      prog.classList.add("hidden");
    } catch (err) {
      console.error(err);
      prog.classList.add("hidden");
      S.toast(err.message || "PDF açılamadı.", "err", 6000);
      editor.classList.add("hidden");
    } finally {
      loading = false;
    }
  }

  async function renderThumbs(doc) {
    for (var i = 1; i <= doc.numPages; i++) {
      var page = await doc.getPage(i);
      var vp = page.getViewport({ scale: 1 });
      var scale = Math.min(1.2, Math.max(0.12, 260 / vp.width));
      var canvas = await S.renderPage(page, scale);
      base[i - 1] = canvas.toDataURL("image/jpeg", 0.72);
      page.cleanup();
      if (i % 3 === 0 || i === doc.numPages) {
        setProgress(i / doc.numPages, i + " / " + doc.numPages + " sayfa hazırlanıyor");
        await S.nextFrame();
      }
    }
  }

  function rotatedThumb(orig, rot) {
    rot = ((rot % 360) + 360) % 360;
    if (!rot) return Promise.resolve(base[orig]);
    var key = orig + "_" + rot;
    if (rotCache[key]) return Promise.resolve(rotCache[key]);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        if (rot === 180) { c.width = img.width; c.height = img.height; }
        else { c.width = img.height; c.height = img.width; }
        var ctx = c.getContext("2d");
        ctx.translate(c.width / 2, c.height / 2);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        rotCache[key] = c.toDataURL("image/jpeg", 0.75);
        resolve(rotCache[key]);
      };
      img.onerror = reject;
      img.src = base[orig];
    });
  }

  function drawGrid() {
    grid.innerHTML = "";
    items.forEach(function (it, i) {
      var t = S.el("div", { class: "thumb" + (it.sel ? " is-selected" : ""), "data-uid": it.uid });
      t.innerHTML =
        '<div class="thumb-canvas-wrap">' +
        '<img alt="Sayfa ' + (it.orig + 1) + '" loading="lazy">' +
        '<span class="thumb-no">' + (i + 1) + "</span>" +
        '<input type="checkbox" class="thumb-check" aria-label="Sayfa ' + (i + 1) + ' seç"' + (it.sel ? " checked" : "") + ">" +
        "</div>" +
        '<div class="thumb-tools">' +
        '<button type="button" data-act="left" aria-label="Sola taşı">' + S.icon("up") + "</button>" +
        '<button type="button" data-act="right" aria-label="Sağa taşı">' + S.icon("down") + "</button>" +
        '<button type="button" data-act="rot" aria-label="Döndür">' + S.icon("rotate") + "</button>" +
        '<button type="button" data-act="del" class="del" aria-label="Sil">' + S.icon("x") + "</button>" +
        "</div>";

      var img = t.querySelector("img");
      if (it.rot) {
        rotatedThumb(it.orig, it.rot).then(function (u) { img.src = u; }).catch(function () {});
      } else {
        img.src = base[it.orig];
      }

      t.querySelector(".thumb-check").addEventListener("change", function (e) {
        it.sel = e.target.checked;
        t.classList.toggle("is-selected", it.sel);
        updateInfo();
      });
      t.querySelector('[data-act="left"]').addEventListener("click", function () {
        swap(i, i - 1);
      });
      t.querySelector('[data-act="right"]').addEventListener("click", function () {
        swap(i, i + 1);
      });
      t.querySelector('[data-act="rot"]').addEventListener("click", function () {
        it.rot = (it.rot + 90) % 360;
        rotatedThumb(it.orig, it.rot).then(function (u) { img.src = u; });
      });
      t.querySelector('[data-act="del"]').addEventListener("click", function () {
        items.splice(i, 1);
        drawGrid();
      });
      grid.appendChild(t);
    });
    updateInfo();
  }

  function swap(a, b) {
    if (b < 0 || b >= items.length) return;
    var tmp = items[a]; items[a] = items[b]; items[b] = tmp;
    drawGrid();
  }

  function updateInfo() {
    var sel = items.filter(function (x) { return x.sel; }).length;
    var removed = totalOrig - items.length;
    info.textContent = totalOrig + " sayfa · " + sel + " seçili" + (removed > 0 ? " · " + removed + " silindi" : "") +
      (items.length === 0 ? " · tüm sayfalar silindi" : "");
    S.$("#out").disabled = items.length === 0;
    S.$("#outSel").disabled = sel === 0;
    S.$("#zip").disabled = items.length === 0;
    S.$("#del").disabled = sel === 0;
    S.$("#rot").disabled = sel === 0;
  }

  S.$("#selAll").addEventListener("click", function () {
    items.forEach(function (it) { it.sel = true; });
    drawGrid();
  });
  S.$("#selNone").addEventListener("click", function () {
    items.forEach(function (it) { it.sel = false; });
    drawGrid();
  });
  S.$("#rot").addEventListener("click", function () {
    var sel = items.filter(function (x) { return x.sel; });
    if (!sel.length) return S.toast("Önce sayfa seç.", "err");
    sel.forEach(function (it) { it.rot = (it.rot + 90) % 360; });
    drawGrid();
  });
  S.$("#del").addEventListener("click", function () {
    var count = items.filter(function (x) { return x.sel; }).length;
    if (!count) return S.toast("Önce sayfa seç.", "err");
    items = items.filter(function (x) { return !x.sel; });
    drawGrid();
    S.toast(count + " sayfa çıkarıldı. İndirince kalıcı olur.", "ok");
  });
  S.$("#reset").addEventListener("click", function () {
    items = [];
    for (var i = 0; i < totalOrig; i++) items.push({ uid: ++seq, orig: i, rot: 0, sel: false });
    drawGrid();
    S.toast("Başlangıç hâline döndü.");
  });

  function lockUi(on) {
    busy = on;
    ["out", "outSel", "zip", "selAll", "selNone", "rot", "del", "reset"].forEach(function (id) {
      var el = S.$("#" + id);
      if (el) el.disabled = on;
    });
    if (!on) updateInfo();
  }

  async function buildBytes(subset) {
    var src = await PDFLib.PDFDocument.load(pdfBytes, { updateMetadata: false });
    var out = await PDFLib.PDFDocument.create();
    var copied = await out.copyPages(src, subset.map(function (x) { return x.orig; }));
    copied.forEach(function (p, k) {
      var a = p.getRotation().angle || 0;
      p.setRotation(PDFLib.degrees((a + subset[k].rot) % 360));
      out.addPage(p);
    });
    out.setProducer("Sandık");
    out.setCreator("Sandık — sandik.app");
    return out.save();
  }

  async function runDownload(which) {
    if (busy) return;
    lockUi(true);
    prog.classList.remove("hidden");
    setProgress(0.05, "Hazırlanıyor…");
    try {
      if (which === "zip") {
        var files = {};
        for (var i = 0; i < items.length; i++) {
          var b = await buildBytes([items[i]]);
          files["sayfa-" + String(i + 1).padStart(3, "0") + ".pdf"] = new Uint8Array(b);
          setProgress((i + 1) / items.length * 0.9, i + 1 + " / " + items.length);
          await S.nextFrame();
        }
        setProgress(0.95, "ZIP paketleniyor…");
        var zb = await S.zip(files);
        S.download(zb, S.safeName(fileName) + "-sayfalar.zip");
      } else {
        var subset = which === "sel" ? items.filter(function (x) { return x.sel; }) : items;
        if (!subset.length) throw new Error("İndirilecek sayfa yok.");
        var bytes = await buildBytes(subset);
        var name = S.safeName(fileName) + (which === "sel" ? "-secili" : "-duzenlendi") + ".pdf";
        S.download(new Blob([bytes], { type: "application/pdf" }), name);
      }
      setProgress(1, "Bitti");
      S.toast("Dosya indiriliyor.", "ok");
    } catch (err) {
      console.error(err);
      S.toast("İşlem başarısız: " + (err.message || "bilinmeyen hata"), "err", 6000);
    } finally {
      setTimeout(function () { prog.classList.add("hidden"); }, 700);
      lockUi(false);
    }
  }

  S.$("#out").addEventListener("click", function () { runDownload("all"); });
  S.$("#outSel").addEventListener("click", function () { runDownload("sel"); });
  S.$("#zip").addEventListener("click", function () { runDownload("zip"); });

  updateInfo();
})();
