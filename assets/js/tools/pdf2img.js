/* PDF sayfalarını JPG / PNG olarak indir */
(function () {
  "use strict";
  var S = window.Sandik;

  var drop = S.$("#drop"), options = S.$("#options"), fmt = S.$("#fmt"), dpi = S.$("#dpi"),
      range = S.$("#range"), quality = S.$("#quality"), qualityOut = S.$("#qualityOut"),
      qualityWrap = S.$("#qualityWrap"), goBtn = S.$("#go"), prog = S.$("#prog"),
      result = S.$("#result"), resGrid = S.$("#resGrid"), resInfo = S.$("#resInfo"),
      summary = S.$("#summary"), zipAll = S.$("#zipAll");

  if (!drop) return;

  var pdfBytes = null, baseName = "belge", totalPages = 0, out = [], busy = false;
  var setProgress = S.progress(prog);
  S.setupDropzone(drop, function (files) { load(files[0]); });

  quality.addEventListener("input", function () { qualityOut.textContent = quality.value; });
  fmt.addEventListener("change", function () {
    qualityWrap.classList.toggle("hidden", fmt.value !== "jpg");
  });

  async function load(file) {
    if (!file) return;
    prog.classList.remove("hidden");
    setProgress(0.05, "PDF açılıyor…");
    try {
      var ab = await S.readArrayBuffer(file);
      pdfBytes = ab.slice(0);
      baseName = S.baseName(file.name) || "belge";
      var doc = await S.openPdf(ab);
      totalPages = doc.numPages;
      summary.textContent = totalPages + " sayfa · " + S.bytes(file.size);
      options.classList.remove("hidden");
      result.classList.add("hidden");
      setProgress(0, "");
      prog.classList.add("hidden");
    } catch (err) {
      prog.classList.add("hidden");
      S.toast(err.message || "PDF açılamadı.", "err", 6000);
    }
  }

  function parseRange(str, n) {
    str = (str || "").trim();
    if (!str) { var all = []; for (var i = 1; i <= n; i++) all.push(i); return all; }
    var set = {};
    str.split(",").forEach(function (part) {
      part = part.trim();
      var m = /^(\d+)\s*-\s*(\d+)$/.exec(part);
      if (m) {
        var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        for (var i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= n) set[i] = 1;
      } else if (/^\d+$/.test(part)) {
        var v = parseInt(part, 10);
        if (v >= 1 && v <= n) set[v] = 1;
      }
    });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }

  goBtn.addEventListener("click", async function () {
    if (busy || !pdfBytes) return;
    busy = true;
    out = [];
    resGrid.innerHTML = "";
    result.classList.add("hidden");
    var pages = parseRange(range.value, totalPages);
    if (!pages.length) {
      S.toast("Geçerli bir sayfa aralığı yaz. Örnek: 1-3,5", "err");
      busy = false;
      return;
    }
    S.setBusy(goBtn, true, "Çevriliyor…");
    prog.classList.remove("hidden");
    setProgress(0, "Başlıyor…");

    var type = fmt.value === "png" ? "image/png" : "image/jpeg";
    var ext = fmt.value === "png" ? "png" : "jpg";
    var q = parseInt(quality.value, 10) / 100;
    var scale = parseInt(dpi.value, 10) / 72;
    var doc = null;

    try {
      doc = await S.openPdf(pdfBytes.slice(0));
      for (var k = 0; k < pages.length; k++) {
        var no = pages[k];
        var page = await doc.getPage(no);
        var canvas = await S.renderPage(page, scale);
        var blob = await S.canvasToBlob(canvas, type, type === "image/jpeg" ? q : undefined);
        var name = S.safeName(baseName) + "-sayfa-" + String(no).padStart(3, "0") + "." + ext;
        out.push({ name: name, blob: blob, page: no, w: canvas.width, h: canvas.height });
        page.cleanup();
        canvas.width = canvas.height = 0;
        setProgress((k + 1) / pages.length, (k + 1) + " / " + pages.length + " sayfa");
        await S.nextFrame();
      }
      drawResults(ext);
      resInfo.textContent = out.length + " görsel · " + S.bytes(out.reduce(function (a, b) { return a + b.blob.size; }, 0));
      result.classList.remove("hidden");
      S.toast("Görseller hazır.", "ok");
      setProgress(1, "Bitti");
    } catch (err) {
      console.error(err);
      S.toast("Dönüştürme başarısız: " + (err.message || "bilinmeyen hata"), "err", 6000);
    } finally {
      if (doc) doc.destroy();
      busy = false;
      S.setBusy(goBtn, false);
      setTimeout(function () { prog.classList.add("hidden"); }, 700);
    }
  });

  function drawResults(ext) {
    resGrid.innerHTML = "";
    out.forEach(function (o) {
      var url = URL.createObjectURL(o.blob);
      var t = S.el("div", { class: "thumb" });
      t.innerHTML =
        '<div class="thumb-canvas-wrap"><img src="' + url + '" alt="Sayfa ' + o.page + '" loading="lazy">' +
        '<span class="thumb-no">' + o.page + "</span></div>" +
        '<div class="fr-meta" style="text-align:center">' + o.w + "×" + o.h + " · " + S.bytes(o.blob.size) + "</div>" +
        '<button class="btn btn-sm btn-block" type="button">' + S.icon("download") + " indir</button>";
      t.querySelector("button").addEventListener("click", function () {
        S.download(o.blob, o.name);
      });
      resGrid.appendChild(t);
    });
  }

  zipAll.addEventListener("click", async function () {
    if (!out.length) return;
    S.setBusy(zipAll, true, "Paketleniyor…");
    try {
      var files = {};
      for (var i = 0; i < out.length; i++) {
        var buf = await out[i].blob.arrayBuffer();
        files[out[i].name] = new Uint8Array(buf);
      }
      var zb = await S.zip(files);
      S.download(zb, S.safeName(baseName) + "-gorseller.zip");
    } catch (err) {
      S.toast("ZIP oluşturulamadı.", "err");
    } finally {
      S.setBusy(zipAll, false);
    }
  });
})();
