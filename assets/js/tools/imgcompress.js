/* Görsel sıkıştırma */
(function () {
  "use strict";
  var S = window.Sandik;

  var drop = S.$("#drop"), step2 = S.$("#step2"), listEl = S.$("#list"),
      maxw = S.$("#maxw"), fmt = S.$("#fmt"), target = S.$("#target"),
      quality = S.$("#quality"), qualityOut = S.$("#qualityOut"),
      goBtn = S.$("#go"), clearBtn = S.$("#clear"), summary = S.$("#summary"),
      prog = S.$("#prog"), result = S.$("#result"), resList = S.$("#resList"),
      resInfo = S.$("#resInfo"), zipAll = S.$("#zipAll");

  if (!drop) return;

  var items = [], outs = [], seq = 0, busy = false;
  var setProgress = S.progress(prog);
  S.setupDropzone(drop, function (files) { add(files); });

  quality.addEventListener("input", function () { qualityOut.textContent = quality.value; });

  async function add(files) {
    var imgs = files.filter(function (f) {
      return /\.(jpe?g|png|webp)$/i.test(f.name) || /^image\/(jpeg|png|webp)$/.test(f.type);
    });
    if (imgs.length !== files.length) S.toast("Desteklenmeyen dosyalar atlandı.", "err");
    for (var i = 0; i < imgs.length; i++) {
      var f = imgs[i];
      try {
        var url = URL.createObjectURL(f);
        var img = await S.loadImage(url);
        items.push({ id: ++seq, file: f, url: url, w: img.naturalWidth, h: img.naturalHeight });
        img.src = "";
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
        '<div class="fr-actions"><button type="button" data-act="remove" aria-label="Kaldır">' + S.icon("x") + "</button></div>";
      row.querySelector(".fr-name").textContent = it.file.name;
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

  clearBtn.addEventListener("click", function () {
    items.forEach(function (it) { URL.revokeObjectURL(it.url); });
    items = [];
    outs = [];
    render();
    result.classList.add("hidden");
  });

  function encode(canvas, type, q) { return S.canvasToBlob(canvas, type, q); }

  function drawScaled(img, maxWidth) {
    var scale = maxWidth ? Math.min(1, maxWidth / img.naturalWidth) : 1;
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    var ctx = c.getContext("2d");
    if (type === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  var type = "image/jpeg";

  async function compressOne(it) {
    var img = await S.loadImage(it.url);
    var canvas = drawScaled(img, parseInt(maxw.value, 10) || 0);
    var wantKB = parseInt(target.value, 10);
    var q0 = parseInt(quality.value, 10) / 100;

    if (wantKB > 0) {
      var tgt = wantKB * 1024;
      var best = null, bestCanvas = canvas;
      var lo = 0.35, hi = 0.96;
      for (var i = 0; i < 7; i++) {
        var mid = (lo + hi) / 2;
        var b = await encode(canvas, type, mid);
        if (b.size <= tgt) { best = b; bestCanvas = canvas; lo = mid; }
        else { hi = mid; }
        if (best && best.size >= tgt * 0.9) break;
      }
      if (!best) {
        var c = canvas;
        for (var s = 0; s < 5 && !best; s++) {
          c = drawScaledFromCanvas(c, 0.8);
          for (var q = 0.7; q >= 0.28; q -= 0.08) {
            var bb = await encode(c, type, q);
            if (bb.size <= tgt) { best = bb; bestCanvas = c; break; }
          }
        }
      }
      if (!best) {
        var smallest = await encode(bestCanvas, type, 0.3);
        return { blob: smallest, w: bestCanvas.width, h: bestCanvas.height, reached: false };
      }
      return { blob: best, w: bestCanvas.width, h: bestCanvas.height, reached: true };
    }

    var blob = await encode(canvas, type, q0);
    return { blob: blob, w: canvas.width, h: canvas.height, reached: true };
  }

  function drawScaledFromCanvas(src, factor) {
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(src.width * factor));
    c.height = Math.max(1, Math.round(src.height * factor));
    var ctx = c.getContext("2d");
    if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  function webpSupported() {
    try {
      var c = document.createElement("canvas");
      c.width = c.height = 1;
      return c.toDataURL("image/webp").indexOf("data:image/webp") === 0;
    } catch (e) { return false; }
  }

  goBtn.addEventListener("click", async function () {
    if (busy || !items.length) return;
    busy = true;
    type = fmt.value === "webp" ? "image/webp" : "image/jpeg";
    if (type === "image/webp" && !webpSupported()) {
      type = "image/jpeg";
      S.toast("Bu tarayıcı WebP üretemiyor, JPEG kullanıldı.", "err", 4500);
    }
    var ext = type === "image/webp" ? "webp" : "jpg";
    outs = [];
    resList.innerHTML = "";
    result.classList.add("hidden");
    S.setBusy(goBtn, true, "Sıkıştırılıyor…");
    prog.classList.remove("hidden");
    setProgress(0, "Başlıyor…");

    try {
      var totalBefore = 0, totalAfter = 0;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var r = await compressOne(it);
        var name = S.safeName(it.file.name) + "-kucuk." + ext;
        outs.push({
          name: name, blob: r.blob, before: it.file.size, after: r.blob.size,
          w: r.w, h: r.h, origW: it.w, origH: it.h, reached: r.reached, srcName: it.file.name
        });
        totalBefore += it.file.size;
        totalAfter += r.blob.size;
        setProgress((i + 1) / items.length, (i + 1) + " / " + items.length);
        await S.nextFrame();
      }
      drawResults();
      resInfo.textContent = S.bytes(totalBefore) + " → " + S.bytes(totalAfter) +
        (totalBefore ? " (" + S.pct(totalAfter, totalBefore) + ")" : "");
      result.classList.remove("hidden");
      S.toast("Sıkıştırma bitti.", "ok");
      setProgress(1, "Bitti");
    } catch (err) {
      console.error(err);
      S.toast("Sıkıştırma başarısız: " + (err.message || "bilinmeyen hata"), "err", 6000);
    } finally {
      busy = false;
      S.setBusy(goBtn, false);
      setTimeout(function () { prog.classList.add("hidden"); }, 700);
    }
  });

  function drawResults() {
    resList.innerHTML = "";
    outs.forEach(function (o) {
      var url = URL.createObjectURL(o.blob);
      var saved = o.before - o.after;
      var good = saved > 0;
      var row = S.el("li", { class: "file-row" });
      row.innerHTML =
        '<img class="fr-thumb" src="' + url + '" alt="">' +
        '<div class="fr-main"><div class="fr-name"></div>' +
        '<div class="fr-meta">' + S.bytes(o.before) + " → " + S.bytes(o.after) +
        ' · <span class="' + (good ? "delta-good" : "delta-bad") + '">' +
        (good ? S.pct(o.after, o.before) + " küçüldü" : "büyüdü") + "</span>" +
        " · " + o.w + "×" + o.h + (o.reached ? "" : " · hedefe ulaşılamadı") + "</div></div>" +
        '<div class="fr-actions"><button type="button" data-act="dl" aria-label="İndir">' + S.icon("download") + "</button></div>";
      row.querySelector(".fr-name").textContent = o.name;
      row.querySelector('[data-act="dl"]').addEventListener("click", function () { S.download(o.blob, o.name); });
      resList.appendChild(row);
    });
  }

  zipAll.addEventListener("click", async function () {
    if (!outs.length) return;
    S.setBusy(zipAll, true, "Paketleniyor…");
    try {
      var files = {};
      for (var i = 0; i < outs.length; i++) {
        var key = outs[i].name;
        if (files[key]) key = i + "-" + key;
        files[key] = new Uint8Array(await outs[i].blob.arrayBuffer());
      }
      var zb = await S.zip(files);
      S.download(zb, "sandik-gorseller.zip");
    } catch (e) {
      S.toast("ZIP oluşturulamadı.", "err");
    } finally {
      S.setBusy(zipAll, false);
    }
  });

  render();
})();
