/* PDF'ten düz metin çıkar */
(function () {
  "use strict";
  var S = window.Sandik;

  var drop = S.$("#drop"), step2 = S.$("#step2"), output = S.$("#output"),
      meta = S.$("#meta"), copyBtn = S.$("#copy"), saveBtn = S.$("#save"),
      prog = S.$("#prog");

  if (!drop) return;
  var baseName = "belge", text = "", busy = false;
  var setProgress = S.progress(prog);

  S.setupDropzone(drop, function (files) { load(files[0]); });

  async function load(file) {
    if (!file || busy) return;
    busy = true;
    prog.classList.remove("hidden");
    setProgress(0.05, "PDF açılıyor…");
    step2.classList.add("hidden");
    var doc = null;
    try {
      var ab = await S.readArrayBuffer(file);
      baseName = S.baseName(file.name) || "belge";
      doc = await S.openPdf(ab);
      var parts = [];
      for (var i = 1; i <= doc.numPages; i++) {
        var page = await doc.getPage(i);
        var tc = await page.getTextContent();
        var line = "";
        var pageText = "";
        tc.items.forEach(function (it) {
          if (typeof it.str !== "string") return;
          pageText += it.str;
          if (it.hasEOL) pageText += "\n";
          else pageText += " ";
        });
        pageText = pageText.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
        parts.push("— Sayfa " + i + " —\n" + pageText);
        page.cleanup();
        setProgress(i / doc.numPages * 0.95, i + " / " + doc.numPages + " sayfa");
        await S.nextFrame();
      }
      text = parts.join("\n\n");
      output.value = text;
      meta.textContent = doc.numPages + " sayfa · " + text.length.toLocaleString("tr-TR") + " karakter";
      step2.classList.remove("hidden");
      if (!text.replace(/— Sayfa \d+ —/g, "").trim()) {
        S.toast("Metin katmanı bulunamadı. PDF taranmış bir görüntü olabilir.", "err", 6000);
      } else {
        S.toast("Metin çıkarıldı.", "ok");
      }
      setProgress(1, "Bitti");
    } catch (err) {
      console.error(err);
      S.toast(err.message || "PDF açılamadı.", "err", 6000);
    } finally {
      if (doc) doc.destroy();
      busy = false;
      setTimeout(function () { prog.classList.add("hidden"); }, 600);
    }
  }

  copyBtn.addEventListener("click", function () {
    if (!text) return;
    S.copy(text).then(function () { S.toast("Metin kopyalandı.", "ok"); })
      .catch(function () { S.toast("Kopyalanamadı.", "err"); });
  });

  saveBtn.addEventListener("click", function () {
    if (!text) return;
    S.download(new Blob([text], { type: "text/plain;charset=utf-8" }), S.safeName(baseName) + ".txt");
  });
})();
