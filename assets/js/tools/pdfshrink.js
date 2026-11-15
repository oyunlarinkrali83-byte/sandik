/* PDF küçült: sayfaları görüntüye çevirip yeniden paketle */
(function () {
  "use strict";
  var S = window.Sandik;
  var PDFLib = window.PDFLib;

  var drop = S.$("#drop"), options = S.$("#options"), dpi = S.$("#dpi"),
      quality = S.$("#quality"), qualityOut = S.$("#qualityOut"), gray = S.$("#gray"),
      goBtn = S.$("#go"), summary = S.$("#summary"), prog = S.$("#prog"), result = S.$("#result");

  if (!drop) return;

  var pdfBytes = null, baseName = "belge", fileSize = 0, totalPages = 0, busy = false;
  var setProgress = S.progress(prog);
  S.setupDropzone(drop, function (files) { load(files[0]); });

  quality.addEventListener("input", function () { qualityOut.textContent = quality.value; });

  async function load(file) {
    if (!file) return;
    prog.classList.remove("hidden");
    setProgress(0.05, "PDF açılıyor…");
    try {
      var ab = await S.readArrayBuffer(file);
      pdfBytes = ab.slice(0);
      baseName = S.baseName(file.name) || "belge";
      fileSize = file.size;
      var doc = await S.openPdf(ab);
      totalPages = doc.numPages;
      doc.destroy();
      summary.textContent = totalPages + " sayfa · " + S.bytes(fileSize);
      options.classList.remove("hidden");
      result.classList.add("hidden");
      prog.classList.add("hidden");
    } catch (err) {
      prog.classList.add("hidden");
      S.toast(err.message || "PDF açılamadı.", "err", 6000);
    }
  }

  function toGray(canvas) {
    var c = document.createElement("canvas");
    c.width = canvas.width;
    c.height = canvas.height;
    var ctx = c.getContext("2d");
    try { ctx.filter = "grayscale(1)"; } catch (e) {}
    ctx.drawImage(canvas, 0, 0);
    return c;
  }

  goBtn.addEventListener("click", async function () {
    if (busy || !pdfBytes) return;
    busy = true;
    S.setBusy(goBtn, true, "Küçültülüyor…");
    prog.classList.remove("hidden");
    setProgress(0, "Başlıyor…");
    result.classList.add("hidden");
    result.style.borderColor = "";
    result.style.background = "";

    var doc = null;
    try {
      doc = await S.openPdf(pdfBytes.slice(0));
      var out = await PDFLib.PDFDocument.create();
      var scale = parseInt(dpi.value, 10) / 72;
      var q = parseInt(quality.value, 10) / 100;
      var useGray = gray.value === "1";

      for (var i = 1; i <= doc.numPages; i++) {
        var page = await doc.getPage(i);
        var vp1 = page.getViewport({ scale: 1 });
        var canvas = await S.renderPage(page, scale);
        if (useGray) canvas = toGray(canvas);
        var blob = await S.canvasToBlob(canvas, "image/jpeg", q);
        var bytes = await blob.arrayBuffer();
        var emb = await out.embedJpg(bytes);
        var p = out.addPage([vp1.width, vp1.height]);
        p.drawImage(emb, { x: 0, y: 0, width: vp1.width, height: vp1.height });
        page.cleanup();
        canvas.width = canvas.height = 0;
        setProgress(i / doc.numPages * 0.97, i + " / " + doc.numPages + " sayfa");
        await S.nextFrame();
      }

      out.setProducer("Sandık");
      out.setCreator("Sandık — sandik.app");
      var saved = await out.save();
      var blobOut = new Blob([saved], { type: "application/pdf" });
      var name = S.safeName(baseName) + "-kucuk.pdf";
      var smaller = blobOut.size < fileSize;
      var diff = fileSize - blobOut.size;

      result.innerHTML =
        '<div class="res-title" style="color:' + (smaller ? "var(--ok)" : "var(--warn)") + '">' +
        S.icon(smaller ? "check" : "warn") + (smaller ? " PDF küçültüldü" : " Sonuç daha büyük çıktı") + "</div>" +
        '<div class="stat-grid">' +
        '<div class="stat"><div class="k">Önce</div><div class="v">' + S.bytes(fileSize) + "</div></div>" +
        '<div class="stat"><div class="k">Sonra</div><div class="v">' + S.bytes(blobOut.size) + "</div></div>" +
        '<div class="stat"><div class="k">Fark</div><div class="v ' + (smaller ? "delta-good" : "delta-bad") + '">' +
        (smaller ? "−" + S.bytes(diff) + " (" + S.pct(blobOut.size, fileSize) + ")" : "+" + S.bytes(-diff)) + "</div></div>" +
        "</div>" +
        (smaller ? "" : '<p class="small">Bu dosya metin ağırlıklı olduğu için yeniden paketleme kazandırmadı. DPI değerini 72 yapıp tekrar dene ya da dosyayı olduğu gibi kullan.</p>') +
        '<div class="row"><button class="btn btn-primary" type="button" id="dl">' +
        S.icon("download") + " " + S.esc(name) + "</button></div>";
      result.style.borderColor = smaller ? "" : "color-mix(in srgb, var(--warn) 35%, var(--line))";
      result.style.background = smaller ? "" : "var(--warn-soft)";
      result.classList.remove("hidden");
      if (smaller) S.download(blobOut, name);
      result.querySelector("#dl").addEventListener("click", function () { S.download(blobOut, name); });
      setProgress(1, "Bitti");
      S.toast(smaller ? "Küçültme tamam." : "Dosya küçülmedi, sonucu yine de indirebilirsin.", smaller ? "ok" : "err", 4500);
    } catch (err) {
      console.error(err);
      S.toast("Küçültme başarısız: " + (err.message || "bilinmeyen hata"), "err", 6000);
    } finally {
      if (doc) doc.destroy();
      busy = false;
      S.setBusy(goBtn, false);
      setTimeout(function () { prog.classList.add("hidden"); }, 700);
    }
  });
})();
