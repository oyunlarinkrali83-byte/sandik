/* QR kod üretici */
(function () {
  "use strict";
  var S = window.Sandik;

  var tabs = S.$("#tabs"), preview = S.$("#preview"), info = S.$("#qrInfo");
  if (!tabs) return;

  var btnPng = S.$("#downloadPng"), btnSvg = S.$("#downloadSvg"), btnCopy = S.$("#copyData");
  var type = "text";
  var canvas = null;
  var current = "";
  var timer = null;

  var panes = {
    text: S.$("#pane-text"),
    wifi: S.$("#pane-wifi"),
    phone: S.$("#pane-phone"),
    email: S.$("#pane-email")
  };

  try {
    if (window.qrcode && window.qrcode.stringToBytesFuncs) {
      window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs["UTF-8"];
    }
  } catch (e) {}

  tabs.addEventListener("click", function (e) {
    var b = e.target.closest("[data-type]");
    if (!b) return;
    type = b.getAttribute("data-type");
    S.$$("[data-type]", tabs).forEach(function (x) {
      x.setAttribute("aria-selected", x === b ? "true" : "false");
    });
    Object.keys(panes).forEach(function (k) {
      panes[k].classList.toggle("hidden", k !== type);
    });
    schedule();
  });

  function escWifi(v) {
    return String(v).replace(/([\\;,:"])/g, "\\$1");
  }

  function content() {
    if (type === "text") return S.$("#text").value.trim();
    if (type === "wifi") {
      var ssid = S.$("#wifiSsid").value.trim();
      if (!ssid) return "";
      var sec = S.$("#wifiSec").value;
      var pass = S.$("#wifiPass").value;
      var hid = S.$("#wifiHidden").value;
      var s = "WIFI:T:" + sec + ";S:" + escWifi(ssid) + ";";
      if (sec !== "nopass") s += "P:" + escWifi(pass) + ";";
      if (hid === "true") s += "H:true;";
      return s + ";";
    }
    if (type === "phone") {
      var p = S.$("#phone").value.replace(/[^\d+]/g, "");
      return p ? "tel:" + p : "";
    }
    if (type === "email") {
      var em = S.$("#email").value.trim();
      if (!em) return "";
      var q = [];
      var subj = S.$("#subject").value.trim();
      var body = S.$("#body").value.trim();
      if (subj) q.push("subject=" + encodeURIComponent(subj));
      if (body) q.push("body=" + encodeURIComponent(body));
      return "mailto:" + em + (q.length ? "?" + q.join("&") : "");
    }
    return "";
  }

  function luminance(hex) {
    var h = hex.replace("#", "");
    var rgb = [0, 2, 4].map(function (i) {
      var c = parseInt(h.substr(i, 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function contrast(a, b) {
    try {
      var la = luminance(a), lb = luminance(b);
      var hi = Math.max(la, lb), lo = Math.min(la, lb);
      return (hi + 0.05) / (lo + 0.05);
    } catch (e) { return 21; }
  }

  function validHex(v) { return /^#[0-9a-fA-F]{6}$/.test(v); }

  function syncColors() {
    var fg = S.$("#fg"), fgHex = S.$("#fgHex"), bg = S.$("#bg"), bgHex = S.$("#bgHex");
    fg.addEventListener("input", function () { fgHex.value = fg.value; schedule(); });
    bg.addEventListener("input", function () { bgHex.value = bg.value; schedule(); });
    fgHex.addEventListener("input", function () {
      if (validHex(fgHex.value)) { fg.value = fgHex.value; schedule(); }
    });
    bgHex.addEventListener("input", function () {
      if (validHex(bgHex.value)) { bg.value = bgHex.value; schedule(); }
    });
  }
  syncColors();

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(draw, 180);
  }

  S.$$("#text,#wifiSsid,#wifiPass,#wifiSec,#wifiHidden,#phone,#email,#subject,#body,#size,#ecc,#margin,#fg,#bg").forEach(function (el) {
    el.addEventListener("input", schedule);
    el.addEventListener("change", schedule);
  });
  S.$("#margin").addEventListener("input", function () {
    S.$("#marginOut").textContent = S.$("#margin").value;
  });

  function setActions(on) {
    [btnPng, btnSvg, btnCopy].forEach(function (b) { b.disabled = !on; });
  }

  function draw() {
    var data = content();
    current = data;
    preview.innerHTML = "";
    canvas = null;
    setActions(false);
    info.textContent = "";

    if (!data) {
      preview.innerHTML = '<p class="qr-empty">İçerik yazınca QR kodun burada belirir.</p>';
      return;
    }

    var ecc = S.$("#ecc").value;
    var margin = parseInt(S.$("#margin").value, 10);
    var size = parseInt(S.$("#size").value, 10);
    var fg = validHex(S.$("#fgHex").value) ? S.$("#fgHex").value : "#000000";
    var bg = validHex(S.$("#bgHex").value) ? S.$("#bgHex").value : "#ffffff";

    try {
      var qr = window.qrcode(0, ecc);
      qr.addData(data);
      qr.make();
      var count = qr.getModuleCount();
      var mod = Math.max(1, Math.floor(size / (count + margin * 2)));
      var total = mod * (count + margin * 2);

      canvas = document.createElement("canvas");
      canvas.width = total;
      canvas.height = total;
      canvas.style.width = "100%";
      canvas.style.maxWidth = size + "px";
      canvas.style.height = "auto";
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, total, total);
      ctx.fillStyle = fg;
      var off = mod * margin;
      for (var r = 0; r < count; r++) {
        for (var c = 0; c < count; c++) {
          if (qr.isDark(r, c)) ctx.fillRect(off + c * mod, off + r * mod, mod, mod);
        }
      }
      canvas.dataset.count = count;
      canvas.dataset.mod = mod;
      canvas.dataset.fg = fg;
      canvas.dataset.bg = bg;
      preview.appendChild(canvas);

      var version = (count - 17) / 4;
      info.textContent = count + " × " + count + " modül · sürüm " + version + " · " + data.length + " karakter";
      var cr = contrast(fg, bg);
      if (cr < 3) {
        info.textContent += " · kontrast düşük, okuyucular zorlanabilir";
        info.style.color = "var(--warn)";
      } else if (luminance(fg) > luminance(bg)) {
        info.textContent += " · renkler ters; koyu kod + açık zemin önerilir";
        info.style.color = "var(--warn)";
      } else {
        info.style.color = "";
      }
      current = data;
      setActions(true);
    } catch (err) {
      preview.innerHTML = '<p class="qr-empty">Bu içerik bir QR koda sığmadı. Metni kısaltmayı dene.</p>';
      info.textContent = "";
      setActions(false);
    }
  }

  btnPng.addEventListener("click", function () {
    if (!canvas) return;
    canvas.toBlob(function (b) {
      if (b) S.download(b, "sandik-qr.png");
    }, "image/png");
  });

  btnSvg.addEventListener("click", function () {
    if (!canvas) return;
    var count = parseInt(canvas.dataset.count, 10);
    var mod = parseInt(canvas.dataset.mod, 10);
    var margin = parseInt(S.$("#margin").value, 10);
    var total = mod * (count + margin * 2);
    var fg = canvas.dataset.fg, bg = canvas.dataset.bg;
    var d = "";
    var qr = window.qrcode(0, S.$("#ecc").value);
    qr.addData(current);
    qr.make();
    var off = mod * margin;
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (qr.isDark(r, c)) d += "M" + (off + c * mod) + " " + (off + r * mod) + "h" + mod + "v" + mod + "h-" + mod + "z";
      }
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + total + '" height="' + total +
      '" viewBox="0 0 ' + total + " " + total + '" shape-rendering="crispEdges">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + bg + '"/>' +
      '<path d="' + d + '" fill="' + fg + '"/></svg>';
    S.download(new Blob([svg], { type: "image/svg+xml" }), "sandik-qr.svg");
  });

  btnCopy.addEventListener("click", function () {
    if (!current) return;
    S.copy(current).then(function () { S.toast("İçerik kopyalandı.", "ok"); })
      .catch(function () { S.toast("Kopyalanamadı.", "err"); });
  });

  draw();
})();
