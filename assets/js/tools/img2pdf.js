/* Görsellerden PDF oluştur */
(function () {
  "use strict";
  var S = window.Sandik;
  var PDFLib = window.PDFLib;

  var drop = S.$("#drop"), step2 = S.$("#step2"), listEl = S.$("#list"),
      pageSize = S.$("#pageSize"), fit = S.$("#fit"), margin = S.$("#margin"),
      marginOut = S.$("#marginOut"), quality = S.$("#quality"), qualityOut = S.$("#qualityOut"),
      goBtn = S.$("#go"), clearBtn = S.$("#clear"), summary = S.$("#summary"),
      prog = S.$("#prog"), result = S.$("#result");

  if (!drop) return;

  var items = [], seq = 0, busy = false;
  var setProgress = S.progress(prog);
  S.setupDropzone(drop, function (files) { add(files); });

  margin.addEventListener("input", function () { marginOut.textContent = margin.value; });
  quality.addEventListener("input", function () { qualityOut.textContent = quality.value; });

  async function add(files) {
    var imgs = files.filter(function (f) {
      return /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name) || /^image\//.test(f.type);
    });
    if (imgs.length !== files.length) S.toast("Bazı dosyalar görsel değildi, atlandı.", "err");

    for (var i = 0; i < imgs.length; i++) {
      var f = imgs[i];
      try {
        var url = URL.createObjectURL(f);
        var img = await S.loadImage(url);
        items.push({ id: ++seq, file: f, url: url, w: img.naturalWidth, h: img.naturalHeight });
      } catch (e) {
        S.toast('"' + f.name + '" açılamadı.', "err");
      }
    }
    render();
  }

  function render() {
    listEl.innerHTML = "";
    items.forEach(function (it, i) {
      var row = S.el("li", { class: "file-row" });
      row.innerHTML =
        '<img class="fr-thumb" src="' + it.url + '" alt="">' +
        '<div class="fr-main"><div class="fr-name"></div><div class="fr-meta">' +
        it.w + "×" + it.h + " · " + S.bytes(it.file.size) + "</div></div>" +
        '<div class="fr-actions">' +
        '<button type="button" data-act="up" aria-label="Yukarı">' + S.icon("up") + "</button>" +
        '<button type="button" data-act="down" aria-label="Aşağı">' + S.icon("down") + "</button>" +
        '<button type="button" data-act="remove" aria-label="Kaldır">' + S.icon("x") + "</button>" +
        "</div>";
      row.querySelector(".fr-name").textContent = it.file.name;
      row.querySelector('[data-act="up"]').disabled = i === 0;
      row.querySelector('[data-act="down"]').disabled = i === items.length - 1;
      row.querySelector('[data-act="up"]').addEventListener("click", function () { move(i, -1); });
      row.querySelector('[data-act="down"]').addEventListener("click", function () { move(i, 1); });
      row.querySelector('[data-act="remove"]').addEventListener("click", function () {
        URL.revokeObjectURL(it.url);
        items.splice(i, 1);
        render();
      });
      listEl.appendChild(row);
    });
    step2.classList.toggle("hidden", items.length === 0);
    summary.textContent = items.length + " görsel · " + S.bytes(items.reduce(function (a, b) { return a + b.file.size; }, 0));
    goBtn.disabled = items.length === 0;
  }

  function move(i, dir) {
    var j = i + dir;
    if (j < 0 || j >= items.length) return;
    var t = items[i]; items[i] = items[j]; items[j] = t;
    render();
  }

  clearBtn.addEventListener("click", function () {
    items.forEach(function (it) { URL.revokeObjectURL(it.url); });
    items = [];
    render();
    result.classList.add("hidden");
  });

  function pageSizeFor(key, w, h) {
    var A4 = [595.28, 841.89], LETTER = [612, 792];
    if (key === "auto") return null;
    var base, landscape;
    if (key === "letter") { base = LETTER; landscape = w > h; }
    else if (key === "a4p") { base = A4; landscape = false; }
    else if (key === "a4l") { base = A4; landscape = true; }
    else { base = A4; landscape = w > h; }
    return landscape ? [Math.max(base[0], base[1]), Math.min(base[0], base[1])] : [Math.min(base[0], base[1]), Math.max(base[0], base[1])];
  }

  async function toJpegBytes(file, maxSide) {
    var url = URL.createObjectURL(file);
    try {
      var img = await S.loadImage(url);
      var scale = maxSide ? Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight)) : 1;
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return await S.canvasToBlob(c, "image/jpeg", Math.max(0.6, Math.min(0.98, parseInt(quality.value, 10) / 100)));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  goBtn.addEventListener("click", async function () {
    if (busy || !items.length) return;
    busy = true;
    S.setBusy(goBtn, true, "Oluşturuluyor…");
    prog.classList.remove("hidden");
    setProgress(0, "Başlıyor…");
    result.classList.add("hidden");

    try {
      var doc = await PDFLib.PDFDocument.create();
      var m = parseInt(margin.value, 10);
      var fitMode = fit.value;

      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var buf = await S.readArrayBuffer(it.file);
        var img = null;
        var ext = S.ext(it.file.name);

        if (ext === "jpg" || ext === "jpeg") {
          var orient = S.jpegOrientation(buf);
          if (orient === 1) {
            try { img = await doc.embedJpg(buf); } catch (e) { img = null; }
          }
        } else if (ext === "png") {
          try { img = await doc.embedPng(buf); } catch (e) { img = null; }
        }
        if (!img) {
          var jb = await toJpegBytes(it.file, 4200);
          img = await doc.embedJpg(await jb.arrayBuffer());
        }

        var iw = img.width, ih = img.height;
        var dims = pageSizeFor(pageSize.value, iw, ih);
        var pw, ph;
        if (!dims) {
          var ps = Math.min(0.75, 2000 / Math.max(iw, ih));
          pw = Math.round(iw * ps) + m * 2;
          ph = Math.round(ih * ps) + m * 2;
        } else {
          pw = dims[0];
          ph = dims[1];
        }

        var page = doc.addPage([pw, ph]);
        var availW = Math.max(1, pw - m * 2);
        var availH = Math.max(1, ph - m * 2);
        var ratio = fitMode === "cover"
          ? Math.max(availW / iw, availH / ih)
          : Math.min(availW / iw, availH / ih);
        var dw = iw * ratio, dh = ih * ratio;
        page.drawImage(img, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });

        setProgress((i + 1) / items.length * 0.95, (i + 1) + " / " + items.length + " görsel");
        await S.nextFrame();
      }

      doc.setProducer("Sandık");
      doc.setCreator("Sandık — sandik.app");
      var bytes = await doc.save();
      var blob = new Blob([bytes], { type: "application/pdf" });
      var name = S.safeName(items[0].file.name) + (items.length > 1 ? "-ve-digerleri" : "") + ".pdf";

      result.innerHTML =
        '<div class="res-title">' + S.icon("check") + " PDF hazır</div>" +
        '<div class="stat-grid">' +
        '<div class="stat"><div class="k">Görsel</div><div class="v">' + items.length + "</div></div>" +
        '<div class="stat"><div class="k">Sayfa</div><div class="v">' + doc.getPageCount() + "</div></div>" +
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
      S.toast("PDF oluşturulamadı: " + (err.message || "bilinmeyen hata"), "err", 6000);
    } finally {
      busy = false;
      S.setBusy(goBtn, false);
      setTimeout(function () { prog.classList.add("hidden"); }, 700);
    }
  });

  render();
})();
