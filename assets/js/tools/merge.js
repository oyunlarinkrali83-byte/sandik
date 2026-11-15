/* PDF birleştir */
(function () {
  "use strict";
  var S = window.Sandik;
  var PDFLib = window.PDFLib;

  var items = [];
  var seq = 0;

  var drop = S.$("#drop"), listEl = S.$("#list"), step2 = S.$("#step2"),
      summary = S.$("#summary"), goBtn = S.$("#go"), clearBtn = S.$("#clear"),
      outName = S.$("#outname"), prog = S.$("#prog"), result = S.$("#result");

  if (!drop) return;
  var setProgress = S.progress(prog);

  S.setupDropzone(drop, function (files) {
    addFiles(files);
  });

  async function addFiles(files) {
    var pdfs = files.filter(function (f) {
      return /\.pdf$/i.test(f.name) || f.type === "application/pdf";
    });
    if (pdfs.length !== files.length) S.toast("Yalnızca PDF dosyaları eklenir.", "err");

    for (var i = 0; i < pdfs.length; i++) {
      var f = pdfs[i];
      try {
        var buf = await S.readArrayBuffer(f);
        var doc = await PDFLib.PDFDocument.load(buf, { updateMetadata: false });
        items.push({ id: ++seq, file: f, bytes: buf, pages: doc.getPageCount() });
      } catch (err) {
        S.toast('"' + f.name + '" açılamadı. Şifreli ya da bozuk olabilir.', "err", 5000);
      }
    }
    render();
  }

  function render() {
    listEl.innerHTML = "";
    items.forEach(function (it, i) {
      var row = S.el("li", { class: "file-row" });
      row.innerHTML =
        '<span class="fr-thumb" style="display:grid;place-items:center;color:var(--accent-ink);background:var(--accent-soft);font-weight:800;font-size:.72rem">PDF</span>' +
        '<div class="fr-main"><div class="fr-name"></div>' +
        '<div class="fr-meta">' + it.pages + " sayfa · " + S.bytes(it.file.size) + "</div></div>" +
        '<div class="fr-actions">' +
        '<button type="button" data-act="up" aria-label="Yukarı taşı">' + S.icon("up") + "</button>" +
        '<button type="button" data-act="down" aria-label="Aşağı taşı">' + S.icon("down") + "</button>" +
        '<button type="button" data-act="remove" aria-label="Kaldır">' + S.icon("x") + "</button>" +
        "</div>";
      row.querySelector(".fr-name").textContent = it.file.name;
      row.querySelector('[data-act="up"]').disabled = i === 0;
      row.querySelector('[data-act="down"]').disabled = i === items.length - 1;
      row.querySelector('[data-act="up"]').addEventListener("click", function () { move(i, -1); });
      row.querySelector('[data-act="down"]').addEventListener("click", function () { move(i, 1); });
      row.querySelector('[data-act="remove"]').addEventListener("click", function () {
        items.splice(i, 1);
        render();
      });
      listEl.appendChild(row);
    });

    step2.classList.toggle("hidden", items.length === 0);
    var total = items.reduce(function (a, b) { return a + b.pages; }, 0);
    var size = items.reduce(function (a, b) { return a + b.file.size; }, 0);
    summary.textContent = items.length + " dosya · " + total + " sayfa · " + S.bytes(size);
    goBtn.disabled = items.length < 2;
    if (items.length === 1) summary.textContent += " · en az 2 PDF gerekir";
    if (items.length === 0) result.classList.add("hidden");
  }

  function move(index, dir) {
    var to = index + dir;
    if (to < 0 || to >= items.length) return;
    var tmp = items[index];
    items[index] = items[to];
    items[to] = tmp;
    render();
  }

  clearBtn.addEventListener("click", function () {
    items = [];
    render();
    result.classList.add("hidden");
  });

  goBtn.addEventListener("click", async function () {
    if (items.length < 2) return;
    result.classList.add("hidden");
    result.style.borderColor = "";
    result.style.background = "";
    prog.classList.remove("hidden");
    setProgress(0, "Hazırlanıyor…");
    S.setBusy(goBtn, true, "Birleştiriliyor…");

    try {
      var out = await PDFLib.PDFDocument.create();
      for (var i = 0; i < items.length; i++) {
        var src = await PDFLib.PDFDocument.load(items[i].bytes, { updateMetadata: false });
        var pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach(function (p) { out.addPage(p); });
        setProgress((i + 1) / items.length, (i + 1) + " / " + items.length + " dosya");
        await S.nextFrame();
      }
      out.setProducer("Sandık");
      out.setCreator("Sandık — sandik.app");
      var bytes = await out.save();
      var blob = new Blob([bytes], { type: "application/pdf" });
      var name = S.safeName(outName.value, "birlesik") + ".pdf";

      var totalPages = out.getPageCount();
      result.innerHTML =
        '<div class="res-title">' + S.icon("check") + " Birleştirme hazır</div>" +
        '<div class="stat-grid">' +
        '<div class="stat"><div class="k">Dosya</div><div class="v">' + items.length + "</div></div>" +
        '<div class="stat"><div class="k">Sayfa</div><div class="v">' + totalPages + "</div></div>" +
        '<div class="stat"><div class="k">Boyut</div><div class="v">' + S.bytes(blob.size) + "</div></div>" +
        "</div>" +
        '<div class="row"><button class="btn btn-primary" type="button" id="dl">' +
        S.icon("download") + " " + S.esc(name) + "</button></div>";
      result.classList.remove("hidden");
      S.download(blob, name);
      result.querySelector("#dl").addEventListener("click", function () { S.download(blob, name); });
      setProgress(1, "Bitti");
    } catch (err) {
      console.error(err);
      S.toast("Birleştirme başarısız: " + (err.message || "bilinmeyen hata"), "err", 6000);
      result.innerHTML = '<div class="res-title" style="color:var(--err)">' + S.icon("warn") +
        " Birleştirilemedi</div><p class='small'>" + S.esc(err.message || "Bilinmeyen hata") +
        ". Dosyalardan biri şifreli veya bozuk olabilir.</p>";
      result.classList.remove("hidden");
      result.style.borderColor = "color-mix(in srgb, var(--err) 35%, var(--line))";
      result.style.background = "var(--err-soft)";
    } finally {
      S.setBusy(goBtn, false);
      setTimeout(function () { prog.classList.add("hidden"); }, 600);
    }
  });

  render();
})();
