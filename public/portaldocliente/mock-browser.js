/*
 * mock-browser.js - in-browser port of mock_server.py (Portal do Cliente mock backend).
 *
 * Load it BEFORE app.js:
 *     <script src="mock-browser.js"></script>
 *     <script src="app.js"></script>
 *
 * It overrides window.fetch for same-origin URLs whose path contains an "/api/" segment
 * (absolute "/api/x" or relative "api/x", so the page also works under a sub-path) and answers
 * them from an in-memory database, exactly like the Python mock. Everything else goes to the
 * original fetch. Anchors, iframes and window.open pointing to /api/ URLs are served as Blob /
 * data URLs.
 *
 * Demo mode replaces the cookie session: the profile lives in localStorage "ce-demo-perfil"
 * ("cliente" by default, or "escritorio"); /api/me is always authenticated.
 *     window.CE_DEMO.setPerfil("escritorio")   // saves and reloads
 *     window.CE_DEMO.perfil()                  // "cliente" | "escritorio"
 *
 * Random sample data uses a faithful port of CPython's random.Random (MT19937 + SHA-512 string
 * seeding), so the generated numbers are identical to the ones served by mock_server.py.
 * Plain ES2017, no dependencies.
 */
(function () {
  "use strict";

  var W = typeof window !== "undefined" ? window : globalThis;

  // ================================================================ python compatibility
  // ---- SHA-512 (needed for random.Random(str) seeding)
  var SHA_K = [0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc, 0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118, 0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2, 0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694, 0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65, 0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5, 0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4, 0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70, 0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df, 0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b, 0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30, 0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8, 0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8, 0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3, 0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec, 0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b, 0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178, 0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b, 0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c, 0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817];
  var SHA_H = [0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1, 0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179];
  var TWO32 = 4294967296;

  function rotrH(h, l, n) { return n < 32 ? (h >>> n) | (l << (32 - n)) : (l >>> (n - 32)) | (h << (64 - n)); }
  function rotrL(h, l, n) { return n < 32 ? (l >>> n) | (h << (32 - n)) : (h >>> (n - 32)) | (l << (64 - n)); }

  function sha512(bytes) {
    var len = bytes.length;
    var total = Math.ceil((len + 17) / 128) * 128;
    var m = new Uint8Array(total);
    m.set(bytes);
    m[len] = 0x80;
    var bits = len * 8;
    var hiBits = Math.floor(bits / TWO32), loBits = bits >>> 0;
    m[total - 8] = hiBits >>> 24; m[total - 7] = (hiBits >>> 16) & 255; m[total - 6] = (hiBits >>> 8) & 255; m[total - 5] = hiBits & 255;
    m[total - 4] = loBits >>> 24; m[total - 3] = (loBits >>> 16) & 255; m[total - 2] = (loBits >>> 8) & 255; m[total - 1] = loBits & 255;
    var H = SHA_H.slice();
    var Wh = new Array(80), Wl = new Array(80);
    var be32 = function (o) { return (m[o] << 24) | (m[o + 1] << 16) | (m[o + 2] << 8) | m[o + 3]; };
    for (var off = 0; off < total; off += 128) {
      var t, xh, xl, lo;
      for (t = 0; t < 16; t++) { Wh[t] = be32(off + t * 8); Wl[t] = be32(off + t * 8 + 4); }
      for (t = 16; t < 80; t++) {
        xh = Wh[t - 15]; xl = Wl[t - 15];
        var s0h = rotrH(xh, xl, 1) ^ rotrH(xh, xl, 8) ^ (xh >>> 7);
        var s0l = rotrL(xh, xl, 1) ^ rotrL(xh, xl, 8) ^ ((xl >>> 7) | (xh << 25));
        xh = Wh[t - 2]; xl = Wl[t - 2];
        var s1h = rotrH(xh, xl, 19) ^ rotrH(xh, xl, 61) ^ (xh >>> 6);
        var s1l = rotrL(xh, xl, 19) ^ rotrL(xh, xl, 61) ^ ((xl >>> 6) | (xh << 26));
        lo = (s1l >>> 0) + (Wl[t - 7] >>> 0) + (s0l >>> 0) + (Wl[t - 16] >>> 0);
        Wh[t] = (s1h + Wh[t - 7] + s0h + Wh[t - 16] + Math.floor(lo / TWO32)) | 0;
        Wl[t] = lo | 0;
      }
      var ah = H[0], al = H[1], bh = H[2], bl = H[3], chh = H[4], cl = H[5], dh = H[6], dl = H[7];
      var eh = H[8], el = H[9], fh = H[10], fl = H[11], gh = H[12], gl = H[13], hh = H[14], hl = H[15];
      for (t = 0; t < 80; t++) {
        var S1h = rotrH(eh, el, 14) ^ rotrH(eh, el, 18) ^ rotrH(eh, el, 41);
        var S1l = rotrL(eh, el, 14) ^ rotrL(eh, el, 18) ^ rotrL(eh, el, 41);
        var chH = (eh & fh) ^ (~eh & gh), chL = (el & fl) ^ (~el & gl);
        var t1l = (hl >>> 0) + (S1l >>> 0) + (chL >>> 0) + (SHA_K[t * 2 + 1] >>> 0) + (Wl[t] >>> 0);
        var t1h = (hh + S1h + chH + SHA_K[t * 2] + Wh[t] + Math.floor(t1l / TWO32)) | 0;
        t1l = t1l | 0;
        var S0h = rotrH(ah, al, 28) ^ rotrH(ah, al, 34) ^ rotrH(ah, al, 39);
        var S0l = rotrL(ah, al, 28) ^ rotrL(ah, al, 34) ^ rotrL(ah, al, 39);
        var majH = (ah & bh) ^ (ah & chh) ^ (bh & chh), majL = (al & bl) ^ (al & cl) ^ (bl & cl);
        var t2l = (S0l >>> 0) + (majL >>> 0);
        var t2h = (S0h + majH + Math.floor(t2l / TWO32)) | 0;
        t2l = t2l | 0;
        hh = gh; hl = gl; gh = fh; gl = fl; fh = eh; fl = el;
        lo = (dl >>> 0) + (t1l >>> 0); eh = (dh + t1h + Math.floor(lo / TWO32)) | 0; el = lo | 0;
        dh = chh; dl = cl; chh = bh; cl = bl; bh = ah; bl = al;
        lo = (t1l >>> 0) + (t2l >>> 0); ah = (t1h + t2h + Math.floor(lo / TWO32)) | 0; al = lo | 0;
      }
      var regs = [ah, al, bh, bl, chh, cl, dh, dl, eh, el, fh, fl, gh, gl, hh, hl];
      for (var r = 0; r < 16; r += 2) {
        lo = (H[r + 1] >>> 0) + (regs[r + 1] >>> 0);
        H[r] = (H[r] + regs[r] + Math.floor(lo / TWO32)) | 0;
        H[r + 1] = lo | 0;
      }
    }
    var out = new Uint8Array(64);
    for (var i = 0; i < 16; i++) {
      out[i * 4] = H[i] >>> 24; out[i * 4 + 1] = (H[i] >>> 16) & 255; out[i * 4 + 2] = (H[i] >>> 8) & 255; out[i * 4 + 3] = H[i] & 255;
    }
    return out;
  }

  function utf8(s) { return new TextEncoder().encode(String(s)); }

  // ---- CPython random.Random (MT19937, seed version 2)
  function PyRandom(seed) {
    this.mt = new Uint32Array(624);
    this.mti = 625;
    var key;
    if (typeof seed === "number") {
      key = [];
      var n = Math.abs(seed);
      do { key.push(n % TWO32); n = Math.floor(n / TWO32); } while (n > 0);
    } else {
      var a = utf8(seed), h = sha512(a), all = new Uint8Array(a.length + 64);
      all.set(a); all.set(h, a.length);
      key = [];
      for (var end = all.length; end > 0; end -= 4) {
        var w = 0;
        for (var i = Math.max(0, end - 4); i < end; i++) w = w * 256 + all[i];
        key.push(w);
      }
      while (key.length > 1 && key[key.length - 1] === 0) key.pop();
    }
    this.initByArray(key);
  }
  PyRandom.prototype.initGenrand = function (s) {
    var mt = this.mt;
    mt[0] = s >>> 0;
    for (var i = 1; i < 624; i++) mt[i] = Math.imul(1812433253, mt[i - 1] ^ (mt[i - 1] >>> 30)) + i;
    this.mti = 624;
  };
  PyRandom.prototype.initByArray = function (key) {
    var mt = this.mt, i = 1, j = 0, k;
    this.initGenrand(19650218);
    for (k = Math.max(624, key.length); k; k--) {
      mt[i] = (mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1664525)) + key[j] + j;
      i++; j++;
      if (i >= 624) { mt[0] = mt[623]; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (k = 623; k; k--) {
      mt[i] = (mt[i] ^ Math.imul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1566083941)) - i;
      i++;
      if (i >= 624) { mt[0] = mt[623]; i = 1; }
    }
    mt[0] = 0x80000000;
  };
  PyRandom.prototype.genrand = function () {
    var mt = this.mt, y, kk;
    if (this.mti >= 624) {
      for (kk = 0; kk < 624; kk++) {
        y = (mt[kk] & 0x80000000) | (mt[(kk + 1) % 624] & 0x7fffffff);
        mt[kk] = mt[(kk + 397) % 624] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0);
      }
      this.mti = 0;
    }
    y = mt[this.mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  };
  PyRandom.prototype.random = function () {
    var a = this.genrand() >>> 5, b = this.genrand() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  };
  PyRandom.prototype.getrandbits = function (k) { return this.genrand() >>> (32 - k); };
  PyRandom.prototype.randbelow = function (n) {
    var k = 0, x = n;
    while (x > 0) { k++; x = Math.floor(x / 2); }
    var r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  };
  PyRandom.prototype.randint = function (a, b) { return a + this.randbelow(b - a + 1); };
  PyRandom.prototype.uniform = function (a, b) { return a + (b - a) * this.random(); };
  PyRandom.prototype.choice = function (seq) { return seq[this.randbelow(seq.length)]; };

  // ---- numbers / formatting (Python semantics)
  // format(x, f".{nd}f"): correctly rounded on the exact binary value, exact ties -> even
  function fixed(x, nd) {
    if (!isFinite(x)) return String(x);
    var neg = x < 0, a = Math.abs(x);
    var s = a.toFixed(nd);
    var long = a.toFixed(Math.min(100, nd + 40));
    var tail = long.slice(long.length - 40);
    if (/^50*$/.test(tail)) {               // exact tie
      var trunc = long.slice(0, long.length - 40).replace(/\.$/, "");
      var last = Number(trunc.charAt(trunc.length - 1));
      s = last % 2 === 0 ? trunc : (Number(trunc) + Math.pow(10, -nd)).toFixed(nd);
    }
    if (neg && Number(s) !== 0) s = "-" + s;
    return s;
  }
  function pyRound(x, nd) { return Number(fixed(x, nd || 0)); }
  function pyInt(x) { return Math.trunc(x); }
  // builtin sum() of floats (Python 3.12+: Neumaier compensated summation)
  function fsum(arr) {
    var f = 0, c = 0;
    for (var i = 0; i < arr.length; i++) {
      var x = arr[i], t = f + x;
      if (Math.abs(f) >= Math.abs(x)) c += (f - t) + x; else c += (x - t) + f;
      f = t;
    }
    if (c && isFinite(c)) f += c;
    return f;
  }
  function isum(arr) { return arr.reduce(function (s, x) { return s + x; }, 0); }
  function truthy(v) {
    if (v === null || v === undefined || v === false || v === 0 || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
  }
  function or(v, dflt) { return truthy(v) ? v : dflt; }
  function has(b, k) { return Object.prototype.hasOwnProperty.call(b, k); }
  function get(b, k) { return has(b, k) ? b[k] : null; }
  function pyStr(v) {
    if (v === null || v === undefined) return "None";
    if (v === true) return "True";
    if (v === false) return "False";
    return String(v);
  }
  function num(v, dflt) {
    if (dflt === undefined) dflt = 0.0;
    if (v === null || v === undefined || v === "") return dflt;
    if (typeof v === "boolean") return dflt;
    if (typeof v === "number") return v;
    var s = String(v).replace(/,/g, ".");
    if (!/^\s*[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?\s*$/i.test(s)) return dflt;
    return parseFloat(s);
  }
  function moneyStr(v) {
    var s = fixed(v, 2), neg = s.charAt(0) === "-";
    if (neg) s = s.slice(1);
    var parts = s.split(".");
    var ip = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (neg ? "-" : "") + ip + "," + parts[1];
  }
  function fmtG(x) {                         // f"{x:g}"
    if (x === 0) return "0";
    var p = Number(x.toPrecision(6)), a = Math.abs(p);
    if (a >= 1e6 || a < 1e-4) {
      var ex = p.toExponential(5).replace(/\.?0+e/, "e").split("e");
      var e = Number(ex[1]);
      return ex[0] + "e" + (e < 0 ? "-" : "+") + (Math.abs(e) < 10 ? "0" : "") + Math.abs(e);
    }
    return String(p);
  }
  function pad(n, w) { var s = String(Math.abs(n)); while (s.length < w) s = "0" + s; return (n < 0 ? "-" : "") + s; }
  function toInt(s) {
    if (!/^\s*[+-]?\d+\s*$/.test(String(s))) throw new Error("invalid literal for int(): " + s);
    return parseInt(s, 10);
  }

  // ---- dates: "naive" datetimes kept as UTC Date objects (same arithmetic as Python)
  var DAY = 86400000;
  function naiveNow() {
    var n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), n.getMinutes(), n.getSeconds(), n.getMilliseconds()));
  }
  function mkDate(y, m, d) {
    var dt = new Date(Date.UTC(2000, m - 1, d));
    dt.setUTCFullYear(y);
    if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) throw new Error("day is out of range for month");
    return dt;
  }
  var _now0 = naiveNow();
  var TODAY = mkDate(_now0.getUTCFullYear(), _now0.getUTCMonth() + 1, _now0.getUTCDate());
  var TY = TODAY.getUTCFullYear(), TM = TODAY.getUTCMonth() + 1, TD = TODAY.getUTCDate();
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  function addDays(dt, n) { return new Date(dt.getTime() + n * DAY); }
  function addMinutes(dt, n) { return new Date(dt.getTime() + n * 60000); }
  function Y(dt) { return dt.getUTCFullYear(); }
  function M(dt) { return dt.getUTCMonth() + 1; }
  function Dd(dt) { return dt.getUTCDate(); }
  function isoDate(dt) { return pad(Y(dt), 4) + "-" + pad(M(dt), 2) + "-" + pad(Dd(dt), 2); }
  function ym(dt) { return pad(Y(dt), 4) + "-" + pad(M(dt), 2); }
  function dmy(dt) { return pad(Dd(dt), 2) + "/" + pad(M(dt), 2) + "/" + pad(Y(dt), 4); }
  function hm(dt) { return pad(dt.getUTCHours(), 2) + ":" + pad(dt.getUTCMinutes(), 2); }
  function replaceDay(dt, d) { return mkDate(Y(dt), M(dt), d); }
  function parseIsoDate(s) {               // date.fromisoformat (None / invalid -> null)
    if (typeof s !== "string") return null;
    var m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(s);
    if (!m || (s.length !== 10 && s.length !== 8)) return null;
    try { return mkDate(+m[1], +m[2], +m[3]); } catch (e) { return null; }
  }
  function daysBetween(a, b) { return Math.round((a.getTime() - b.getTime()) / DAY); }

  // ================================================================ helpers (as in Python)
  // iso(datetime) / iso(date) -> a date is shown at 09:00
  function iso(dt) {
    return isoDate(dt) + "T" + pad(dt.getUTCHours(), 2) + ":" + pad(dt.getUTCMinutes(), 2) + ":" + pad(dt.getUTCSeconds(), 2) + "-03:00";
  }
  function isoDay(dt) { return isoDate(dt) + "T09:00:00-03:00"; }
  function nowIso(deltaMinutes) { return iso(addMinutes(naiveNow(), -(deltaMinutes || 0))); }
  function d(days) { return isoDate(addDays(TODAY, days)); }
  function addMonths(y, m, delta) { var idx = y * 12 + (m - 1) + delta; return [Math.floor(idx / 12), ((idx % 12) + 12) % 12 + 1]; }
  function period(y, m) { return y + pad(m, 2); }
  function label(p) { return MESES[parseInt(p.slice(4), 10) - 1] + "/" + p.slice(2, 4); }
  function lastPeriods(n, includeCurrent) {
    if (n === undefined) n = 12;
    var out = [];
    for (var k = n; k > 0; k--) {
      var ymv = addMonths(TY, TM, -k + (includeCurrent ? 1 : 0));
      out.push(period(ymv[0], ymv[1]));
    }
    return out;
  }
  function cnpj(base12) {
    var nums = base12.split("").map(Number);
    var w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    var r = nums.reduce(function (s, a, i) { return s + a * w1[i]; }, 0) % 11;
    nums.push(r < 2 ? 0 : 11 - r);
    var w2 = [6].concat(w1);
    r = nums.reduce(function (s, a, i) { return s + a * w2[i]; }, 0) % 11;
    nums.push(r < 2 ? 0 : 11 - r);
    var s = nums.join("");
    return s.slice(0, 2) + "." + s.slice(2, 5) + "." + s.slice(5, 8) + "/" + s.slice(8, 12) + "-" + s.slice(12);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ================================================================ base data
  var EMPRESAS = [
    { id: 1, nome: "Padaria e Confeitaria Pão Dourado Ltda", cnpj: cnpj("112223330001"),
      regime: "Simples Nacional", base: 86000.0, rate: 6.84, mix: [0.12, 0.88, 0.0], usuarios: 2, grupo: null },
    { id: 2, nome: "Vértice Tecnologia e Sistemas Ltda", cnpj: cnpj("234567890001"),
      regime: "Simples Nacional", base: 148000.0, rate: 11.2, mix: [0.94, 0.0, 0.06], usuarios: 1, grupo: null },
    { id: 3, nome: "Construtora Horizonte Goiás Ltda", cnpj: cnpj("345678120001"),
      regime: "Lucro Real", base: 620000.0, rate: 9.65, mix: null, usuarios: 0, grupo: null },
  ];

  var DB;

  function emp(eid) {
    for (var i = 0; i < DB.empresas.length; i++) if (String(DB.empresas[i].id) === pyStr(eid)) return DB.empresas[i];
    return null;
  }
  function empPublic(e) { return { id: e.id, nome: e.nome, cnpj: e.cnpj, usuarios: e.usuarios, grupo: e.grupo === undefined ? null : e.grupo }; }
  function empByIdStatic(eid) { return EMPRESAS.filter(function (e) { return e.id === eid; })[0]; }
  function pick(map, key, dflt) { return has(map, key) ? map[key] : dflt; }

  function buildMonths(e) {
    // 12 closed months of revenue for a company (oldest first)
    var rng = new PyRandom("fat-" + e.id);
    var periods = lastPeriods();
    var pending = pick({ 1: [], 2: [4], 3: [11] }, e.id, []);
    var months = [];
    periods.forEach(function (p, i) {
      var confirmed = pending.indexOf(i) < 0;
      var value = pyRound(e.base * (1 + 0.14 * Math.sin(i / 1.7) + rng.uniform(-0.07, 0.07)), 2);
      var rate = pyRound(e.rate + rng.uniform(-0.6, 0.6), 2);
      var m = { period: p, label: label(p), confirmed: confirmed };
      if (confirmed) {
        var trib = pyRound(value * rate / 100, 2);
        var comp = null;
        if (e.mix && !(e.id === 1 && i === 2)) {
          var s = pyRound(value * e.mix[0], 2), c = pyRound(value * e.mix[1], 2);
          comp = { servicos: s, comercio: c, outros: pyRound(value - s - c, 2) };
        }
        Object.assign(m, { value: value, composition: comp, tributosApurados: trib, cargaTributaria: rate,
          aposTributos: pyRound(value - trib, 2), tributosPagos: i === 11 ? null : trib });
      } else {
        Object.assign(m, { value: 0, composition: null, tributosApurados: null, cargaTributaria: null, aposTributos: null, tributosPagos: null });
      }
      if (e.id === 3 && confirmed) {
        m.documento_id = 5000 + i;
        m.outrasReceitasSeparadas = pyRound(value * 0.018, 2);
        m.criterio = "Receita bruta da matriz e filial conforme Razão 3.1.01; receitas financeiras apresentadas separadamente.";
      }
      months.push(m);
    });
    // comparativo (compares each month to the previous one)
    function cmp(cur, old, rate) {
      if (cur === null || old === null) return { atual: cur, anterior: old, diferenca: null, percentual: null };
      var diff = pyRound(cur - old, 2);
      var pct = rate || old <= 0 ? null : pyRound((cur / old - 1) * 100, 2);
      return { atual: cur, anterior: old, diferenca: diff, percentual: pct };
    }
    function g(x, k) {
      if (!x || !x.confirmed) return null;
      if (k === "servicos" || k === "comercio") return x.composition ? x.composition[k] : null;
      return x[k];
    }
    months.forEach(function (m, i) {
      var prev = i ? months[i - 1] : null;
      if (!m.confirmed) { m.comparativo = null; return; }
      m.comparativo = {
        anterior: prev ? prev.label : null,
        faturamento: cmp(g(m, "value"), g(prev, "value")),
        servicos: cmp(g(m, "servicos"), g(prev, "servicos")),
        comercio: cmp(g(m, "comercio"), g(prev, "comercio")),
        tributos: cmp(g(m, "tributosApurados"), g(prev, "tributosApurados")),
        carga: cmp(g(m, "cargaTributaria"), g(prev, "cargaTributaria"), true),
        aposTributos: cmp(g(m, "aposTributos"), g(prev, "aposTributos")),
      };
    });
    return months;
  }

  function buildDocuments() {
    var docs = [], nid = 100;
    function add(eid, titulo, categoria, nomeArquivo, criado, origem, kw) {
      origem = origem || "escritorio";
      kw = kw || {};
      nid += 1;
      var doc = { id: nid, empresa_id: eid, empresa: empByIdStatic(eid).nome, titulo: titulo, categoria: categoria,
        nome_arquivo: nomeArquivo, competencia: has(kw, "competencia") ? kw.competencia : null, origem: origem,
        tamanho: new PyRandom(nid).randint(40000, 2400000), criado_em: criado, validade: null, consultado_em: null,
        conferido_em: null, conferido_por: null, vencimento: null };
      delete kw.competencia;
      Object.assign(doc, kw);
      docs.push(doc);
    }
    var cur = ym(TODAY);
    var pv = addMonths(TY, TM, -1);
    var prev = pv[0] + "-" + pad(pv[1], 2);
    var ago = function (n) { return isoDay(addDays(TODAY, -n)); };
    EMPRESAS.forEach(function (e) {
      var eid = e.id;
      add(eid, "Contrato social - constituição", "Contrato social", "01 - Contrato Social Constituição 2015.pdf", ago(400));
      add(eid, "1ª alteração contratual", "Contrato social", "02 - 1a Alteração Contratual 2019.pdf", ago(399));
      add(eid, "2ª alteração contratual - consolidação", "Contrato social", "03 - 2a Alteração e Consolidação 2024.pdf", ago(398));
      add(eid, "CND Federal (RFB/PGFN)", "Certidões", "CND-Federal.pdf", ago(30), null, { validade: d(150), competencia: prev });
      add(eid, "CRF - FGTS", "Certidões", "CRF-FGTS.pdf", ago(10), null, { validade: d(20), competencia: cur });
      add(eid, "CND Estadual - SEFAZ GO", "Certidões", "CND-Estadual-GO.pdf", ago(12), null, { validade: d(48), competencia: cur });
      if (eid !== 2) add(eid, "CND Municipal - Goiânia", "Certidões", "CND-Municipal-Goiania.pdf", ago(50), null, { validade: d(40), competencia: prev });
      add(eid, "Comprovante de Inscrição e Situação Cadastral", "CNPJ", "Cartao-CNPJ.pdf", ago(5), null,
        { consultado_em: iso(addMinutes(naiveNow(), -(5 * 24 * 60 + 120))), competencia: cur });
      add(eid, "Cadastro mobiliário - Prefeitura de Goiânia", "Inscrição municipal", "Inscricao-Municipal.pdf", ago(200));
      if (eid !== 2) add(eid, "Consulta cadastral CCE - SEFAZ GO", "Inscrição estadual", "Inscricao-Estadual-GO.pdf", ago(90));
      add(eid, "Declaração IRPF 2026 - sócio administrador", "IRPF 2026", "IRPF-2026-Declaracao.pdf", ago(180), null, { competencia: "2026" });
      add(eid, "Recibo IRPF 2026", "IRPF 2026", "IRPF-2026-Recibo.pdf", ago(180), null, { competencia: "2026" });
      add(eid, "Declaração IRPF 2025 - sócio administrador", "IRPF 2025", "IRPF-2025-Declaracao.pdf", ago(540), null, { competencia: "2025" });
      add(eid, "Guia DAS " + prev, "Guias", "DAS-" + prev + ".pdf", ago(6), null, { competencia: prev, vencimento: cur + "-20" });
      add(eid, "Guia FGTS Digital " + prev, "Guias", "FGTS-" + prev + ".pdf", ago(6), null, { competencia: prev, vencimento: cur + "-20" });
      add(eid, "Guia DARF IRRF (prazo passado)", "Guias", "DARF-IRRF.pdf", ago(40), null, { competencia: prev, vencimento: d(-6) });
      add(eid, "Holerites " + prev, "Folha", "Holerites-" + prev + ".pdf", ago(4), null, { competencia: prev });
      add(eid, "Balancete " + prev, "Balancetes", "Balancete-" + prev + ".pdf", ago(3), null, { competencia: prev });
      add(eid, "Extrato bancário " + prev, "Geral", "extrato-" + prev + ".ofx", ago(8), "cliente",
        { competencia: prev, conferido_em: ago(7), conferido_por: "Mariana Couto" });
      add(eid, "Notas fiscais de compra " + prev, "Notas fiscais", "notas-compra-" + prev + ".zip", ago(2), "cliente", { competencia: prev });
    });
    return docs;
  }

  function buildObrigacoes() {
    var out = [], nid = 200;
    var pv = addMonths(TY, TM, -1);
    var comp = pv[0] + "-" + pad(pv[1], 2);
    var rows = [
      ["Apuração e entrega do PGDAS-D", "concluida", d(-6), "Transmitido; recibo disponível em Documentos."],
      ["DCTFWeb", "em_andamento", d(2), "Aguardando fechamento da folha."],
      ["EFD-Reinf", "pendente", d(18), ""],
      ["DEFIS 2026", "atrasada", d(-25), "Aguardando informações dos sócios."],
      ["FGTS Digital", "concluida", d(-6), ""],
      ["SPED Fiscal (EFD ICMS/IPI)", "pendente", d(14), "Conferir notas de entrada."],
      ["DIRF / informe de rendimentos", "em_andamento", d(60), null],
    ];
    EMPRESAS.forEach(function (e) {
      rows.forEach(function (r) {
        nid += 1;
        out.push({ id: nid, empresa_id: e.id, empresa: e.nome, titulo: r[0], competencia: comp, vencimento: r[2], status: r[1], observacao: r[3] });
      });
    });
    return out;
  }

  function buildSolicitacoes() {
    var base = [
      [1, "Envio do extrato bancário de outubro", "respondida", "normal", "Mariana Couto", d(3), [
        ["Roberto Almeida", "cliente", "Segue em anexo o extrato do Itaú. O do Sicoob envio amanhã.", 50],
        ["Mariana Couto", "escritorio", "Recebido, Roberto. Aguardamos o extrato do Sicoob para fechar a conciliação.", 30]]],
      [1, "Dúvida sobre o valor do DAS", "aberta", "alta", null, null, [
        ["Roberto Almeida", "cliente", "O DAS deste mês veio bem maior que o anterior. Podem verificar?", 6]]],
      [2, "Admissão de novo desenvolvedor", "respondida", "normal", "Carlos Henrique Prado", d(5), [
        ["Juliana Martins", "cliente", "Vamos admitir um desenvolvedor no dia 01. Quais documentos precisam?", 72],
        ["Carlos Henrique Prado", "escritorio", "Olá, Juliana! Precisamos de RG, CPF, CTPS digital, comprovante de residência e exame admissional.", 60]]],
      [2, "Alteração de endereço da empresa", "fechada", "baixa", "Mariana Couto", d(-20), [
        ["Juliana Martins", "cliente", "Mudamos de sala no mesmo prédio. Precisa alterar o contrato?", 900],
        ["Mariana Couto", "escritorio", "Sim, a alteração já foi registrada na JUCEG. Documento publicado em Contrato social.", 600]]],
      [3, "Atualização do certificado digital", "aberta", "normal", "Fernanda Lopes", d(4), [
        ["Paulo Sérgio Ramos", "cliente", "Solicito orientação para renovação do certificado A1 da empresa.", 20]]],
      [3, "Parcelamento de ISS em atraso", "respondida", "alta", "Fernanda Lopes", d(1), [
        ["Paulo Sérgio Ramos", "cliente", "Recebemos notificação da prefeitura. É possível parcelar?", 200],
        ["Fernanda Lopes", "escritorio", "É possível sim, em até 60 parcelas. Vamos simular e enviar as opções.", 150]]],
    ];
    return base.map(function (row, idx) {
      var i = idx + 1, e = empByIdStatic(row[0]);
      var mens = row[6].map(function (x) {
        return { autor_nome: x[0], autor_perfil: x[1], corpo: x[2], criada_em: iso(addMinutes(naiveNow(), -x[3] * 60)) };
      });
      return { id: i, empresa_id: row[0], empresa: e.nome, protocolo: "SOL-" + TY + "-" + pad(i, 4), assunto: row[1], status: row[2],
        prioridade: row[3], responsavel: row[4], prazo: row[5], mensagens: mens, criada_em: mens[0].criada_em,
        atualizada_em: mens[mens.length - 1].criada_em };
    });
  }

  function buildTitulos() {
    var out = [], nid = 1;
    var cur = replaceDay(TODAY, 1);
    var rows = [
      ["receber", "Venda corporativa - coffee break", "Hospital Santa Clara", 480000, 5, 1, 1, "Vendas", "Comercial", "Itaú C/C", "Boleto"],
      ["receber", "Encomenda de bolos - evento", "Buffet Primavera", 125000, 12, 1, 1, "Vendas", "Comercial", "Sicoob C/C", "Pix"],
      ["receber", "Contrato de fornecimento mensal", "Colégio Atheneu", 320000, 15, 3, 6, "Contratos", "Comercial", "Itaú C/C", "Boleto"],
      ["receber", "Venda a prazo - cartão", "Cielo", 890000, -8, 1, 1, "Vendas", "Loja", "Itaú C/C", "Cartão"],
      ["pagar", "Farinha de trigo - 50 sacos", "Moinho Goiás Ltda", 410000, 10, 2, 3, "Insumos", "Produção", "Itaú C/C", "Boleto"],
      ["pagar", "Aluguel do imóvel", "Imobiliária Central", 650000, 5, 11, 12, "Ocupação", "Administrativo", "Itaú C/C", "Pix"],
      ["pagar", "Energia elétrica", "Equatorial Goiás", 238000, -3, 1, 1, "Utilidades", "Produção", "Sicoob C/C", "Débito automático"],
      ["pagar", "Manutenção do forno", "Refrigeração Cerrado", 95000, 20, 1, 1, "Manutenção", "Produção", "Itaú C/C", "Pix"],
      ["pagar", "Honorários contábeis", "Contábil Empresarial", 150000, 10, 1, 1, "Serviços", "Administrativo", "Itaú C/C", "Boleto"],
    ];
    [1, 2, 3].forEach(function (eid) {
      var mult = { 1: 1, 2: 2, 3: 7 }[eid];
      rows.forEach(function (r, k) {
        var tipo = r[0], valor = r[3], dayOff = r[4], conta = r[9];
        [-1, 0, 1].forEach(function (monthOff) {
          var venc = addDays(replaceDay(addDays(cur, 32 * monthOff), 1), Math.max(0, Math.min(27, 9 + dayOff)));
          var v = valor * mult;
          var baixas = [];
          if (venc.getTime() < TODAY.getTime() && k % 3 !== 0) {
            baixas.push({ data: isoDate(venc), principal: k % 2 ? v : Math.floor(v / 2), juros: 0, multa: 0, desconto: 0,
              tarifa: tipo === "receber" ? 350 : 0, conta: conta });
          }
          out.push({ id: nid, empresa_id: eid, tipo: tipo, descricao: r[1], contato: r[2], parcela: r[5], total_parcelas: r[6],
            competencia: isoDate(replaceDay(venc, 1)), vencimento: isoDate(venc), valor: v, categoria: r[7], centro_custo: r[8],
            conta: conta, forma: r[10], observacao: "", cancelado: false, baixas: baixas });
          nid += 1;
        });
      });
    });
    return out;
  }

  function buildProdutos() {
    var out = [], nid = 1;
    var rows = [["PAO-FR", "Pão francês", "KG", 152500, 30000, 1890], ["BOL-CEN", "Bolo de cenoura", "UN", 8000, 10000, 4500],
      ["FAR-T1", "Farinha de trigo tipo 1", "KG", 420000, 200000, 520], ["LEI-INT", "Leite integral", "UN", 36000, 48000, 579]];
    [1, 2, 3].forEach(function (eid) {
      rows.forEach(function (r) {
        out.push({ id: nid, empresa_id: eid, codigo: r[0], nome: r[1], unidade: r[2], saldo: r[3], minimo: r[4], preco: r[5], movimentos: [
          { tipo: "entrada", quantidade: r[3] + 20000, data: d(-20), motivo: "Saldo inicial / NF 4521" },
          { tipo: "saida", quantidade: 20000, data: d(-3), motivo: "Consumo da produção" }] });
        nid += 1;
      });
    });
    return out;
  }

  function buildUsuarios() {
    return [
      { id: 1, nome: "Mariana Couto", usuario: "mariana.couto", email: "mariana@contabilempresarial.com.br", perfil: "escritorio", funcao: "administrador", ativo: true, trocar_senha: false, empresa_id: null, grupo_id: null },
      { id: 2, nome: "Carlos Henrique Prado", usuario: "carlos.prado", email: "carlos@contabilempresarial.com.br", perfil: "escritorio", funcao: "operador", ativo: true, trocar_senha: false, empresa_id: null, grupo_id: null },
      { id: 3, nome: "Fernanda Lopes", usuario: "fernanda.lopes", email: "fernanda@contabilempresarial.com.br", perfil: "escritorio", funcao: "operador", ativo: true, trocar_senha: false, empresa_id: null, grupo_id: null },
      { id: 4, nome: "Estagiário Atendimento", usuario: "atendimento", email: "", perfil: "escritorio", funcao: "consulta", ativo: false, trocar_senha: true, empresa_id: null, grupo_id: null },
      { id: 10, nome: "Roberto Almeida", usuario: "cliente", email: "roberto@paodourado.com.br", perfil: "cliente", funcao: null, ativo: true, trocar_senha: false, empresa_id: 1, grupo_id: null },
      { id: 11, nome: "Luciana Almeida", usuario: "luciana.paodourado", email: "luciana@paodourado.com.br", perfil: "cliente", funcao: null, ativo: true, trocar_senha: true, empresa_id: 1, grupo_id: null },
      { id: 12, nome: "Juliana Martins", usuario: "23456789000191", email: "juliana@vertice.dev", perfil: "cliente", funcao: null, ativo: true, trocar_senha: false, empresa_id: null, grupo_id: 1 },
    ];
  }

  function buildDb() {
    var lastMonth = addDays(replaceDay(TODAY, 1), -1);
    return {
      empresas: EMPRESAS.map(function (e) { return Object.assign({}, e); }),
      documentos: buildDocuments(),
      obrigacoes: buildObrigacoes(),
      solicitacoes: buildSolicitacoes(),
      titulos: buildTitulos(),
      produtos: buildProdutos(),
      usuarios: buildUsuarios(),
      grupos: [{ id: 1, nome: "Grupo Martins - QSA", empresa_ids: [2, 3], origem: "QSA Receita Federal",
        ajustado_manual: false, socios: [{ nome: "Juliana Martins", cpf_mascarado: "***.456.789-**" }] },
      { id: 2, nome: "Família Almeida", empresa_ids: [1], origem: "Manual", ajustado_manual: true, socios: [] }],
      assinaturas: { 1: { liberado: true, situacao: "piloto", ate: d(25), valor_mensal: 15000 },
        2: { liberado: true, situacao: "ativo", ate: d(300), valor_mensal: 12000 },
        3: { liberado: false, situacao: "cancelado", ate: null, valor_mensal: null } },
      eventos: [
        { id: 1, empresa_id: 1, titulo: "Taxa do sindicato patronal", data: d(3), hora: "", tipo: "Taxa",
          valor: 180.0, descricao: "Contribuição assistencial anual.", autor_nome: "Mariana Couto", editavel: true },
        { id: 2, empresa_id: 1, titulo: "Horário especial - feriado", data: d(8), hora: "07:00", tipo: "Horário de funcionamento",
          valor: null, descricao: "Loja abre das 7h às 12h.", autor_nome: "Roberto Almeida", editavel: true },
        { id: 3, empresa_id: 2, titulo: "Reunião de planejamento tributário", data: d(6), hora: "14:30", tipo: "Compromisso",
          valor: null, descricao: "Reunião online com o escritório.", autor_nome: "Carlos Henrique Prado", editavel: true }],
      malotes: [
        { id: 1042, empresa_id: 1, competence: ym(lastMonth), status: "Recebido",
          delivery_mode: "Portal externo", created_at: nowIso(60 * 30),
          files: [{ original_name: "extrato-itau.pdf", category: "Extratos bancários", review_status: "Conferido" },
            { original_name: "conta-energia.pdf", category: "Energia", review_status: "Aguardando conferência" }] },
        { id: 1051, empresa_id: 1, competence: ym(TODAY), status: "Em conferência",
          delivery_mode: "Portal externo", created_at: nowIso(60 * 5),
          files: [{ original_name: "boletos-fornecedores.zip", category: "Boletos", review_status: "Em análise" }] },
        { id: 1060, empresa_id: 2, competence: ym(TODAY), status: "Recebido",
          delivery_mode: "Portal externo", created_at: nowIso(60 * 50),
          files: [{ original_name: "nfse-tomadas.xml", category: "Notas fiscais", review_status: "Conferido" }] },
      ],
      das_guides: {},       // eid -> list
      das_consultado: {},   // eid -> iso
      consultas_extra: {},  // eid -> {modulo/periodo: iso}
      sefaz_registros: [{ id: 1, empresa_id: 1, recurso: "cadastro", resultado: "Situação cadastral: ATIVO\nRegime: Simples Nacional\nSem pendências de EFD.",
        consultado: d(-4), referencia: "CCE-2026-778812" }],
      sefaz_buscas: {},
      lote_iniciado: nowIso(90),
      folha_conferidos: new Set(),
      jobs: {},
      buscas_notas: {},
    };
  }

  DB = buildDb();

  // ================================================================ per-endpoint data
  function faturamentoPayload(e) {
    var months = buildMonths(e);
    var valid = months.filter(function (m) { return m.confirmed; });
    return {
      habilitado: true, message: "", regime: e.regime, months: months,
      total: pyRound(fsum(valid.map(function (m) { return m.value; })), 2),
      source: e.regime.indexOf("Simples") === 0 ? "PGDAS-D (Receita Federal)" : "EFD-Contribuições conferida pelo escritório",
      sincronizado_em: nowIso(95),
    };
  }

  function certificado(e) {
    var eid = e.id;
    if (eid === 1) return { status: "valido", vencimento: d(212) + "T23:59:59", dias_restantes: 212, confirmacao_recente: true, sincronizado_em: nowIso(40) };
    if (eid === 2) return { status: "vence_em_breve", vencimento: d(18), dias_restantes: 18, confirmacao_recente: true, sincronizado_em: nowIso(40) };
    return { status: "vencido", vencimento: d(-9), dias_restantes: -9, confirmacao_recente: true, sincronizado_em: nowIso(40) };
  }

  function parcelasList(total, pagas, inicio, valor, overdue) {
    overdue = overdue || 0;
    var out = [], pagamentos = [];
    for (var n = 1; n <= total; n++) {
      var ymv = addMonths(Y(inicio), M(inicio), n - 1);
      var venc = mkDate(ymv[0], ymv[1], Math.min(28, Dd(inicio)));
      var sit;
      if (n <= pagas) {
        sit = "Paga";
        pagamentos.push({ numeroParcela: n, valorPago: pyRound(valor * (1 + 0.004 * n), 2), dataDeArrecadacao: isoDate(addDays(venc, -2)) });
      } else if (n <= pagas + overdue) sit = "Devedora";
      else sit = "A vencer";
      out.push({ numero: n, situacao: sit, vencimento: isoDate(venc), valorOriginal: valor,
        saldoAtualizado: sit !== "Paga" ? pyRound(valor * (1 + 0.006 * Math.max(0, n - pagas)), 2) : 0.0 });
    }
    return [out, pagamentos];
  }

  function centralFiscal(e) {
    var eid = e.id;
    var comps = lastPeriods();
    var extra = DB.consultas_extra[eid] || {};
    var ex = function (k, dflt) { return has(extra, k) ? extra[k] : dflt; };
    var consultas = [];
    comps.slice(-3).forEach(function (p) {
      consultas.push({ modulo: "dctfweb", periodo: p, consultado: ex("dctfweb" + p, nowIso(60 * 26)),
        dados: { mensagem: "DCTFWeb " + label(p) + " transmitida · categoria Geral · situação Ativa." } });
    });
    comps.slice(-2).forEach(function (p) {
      consultas.push({ modulo: "mit", periodo: p, consultado: ex("mit" + p, nowIso(60 * 26)),
        dados: { mensagem: "Apurações MIT encontradas para a competência.",
          apuracoes: [{ idApuracao: "MIT-" + p + "-0001", situacao: "Encerrada", valorTotalApurado: pyRound(e.base * 0.0365, 2) },
            { idApuracao: "MIT-" + p + "-0002", situacao: "Em edição", valorTotalApurado: null }] } });
    });
    var pags = [];
    comps.slice(-4).forEach(function (p) {
      [["DAS", 0.068], ["DARF", 0.012]].forEach(function (tf, k) {
        pags.push({ numeroDocumento: "0720" + p + pad(eid, 3) + "88" + k, tipo: { descricaoAbreviada: tf[0] },
          periodoApuracao: p.slice(4) + "/" + p.slice(0, 4), dataArrecadacao: "20/" + p.slice(4) + "/" + p.slice(0, 4),
          valorTotal: pyRound(e.base * tf[1], 2) });
      });
    });
    consultas.push({ modulo: "pagamentos", periodo: "", consultado: ex("pagamentos", nowIso(60 * 20)),
      dados: { mensagem: "Pagamentos localizados nos últimos 12 meses.", pagamentos: pags } });
    var res = { estado: "sem_parcelamentos", ativos: [], pendentes: [], proximas: [], limitacoes: [], dashboard: [] };
    var modalidades = [];
    if (eid === 1 || eid === 2) {
      var inicio = mkDate(eid === 1 ? TY - 2 : TY - 1, 3, 25);
      var tpo = eid === 1 ? [60, 32, 0] : [24, 9, 2];
      var total = tpo[0], pagas = tpo[1], overdue = tpo[2];
      var valor = eid === 1 ? 1450.37 : 3820.10;
      var pl = parcelasList(total, pagas, inicio, valor, overdue), parcelas = pl[0], pagamentos = pl[1];
      var nxt = parcelas.filter(function (x) { return x.situacao !== "Paga"; })[0] || null;
      var dash = { origem: "Receita Federal · Simples Nacional (PARCSN)", numero: eid + "0045" + eid + "7", situacao: "Em parcelamento",
        consultado: nowIso(300), percentual: pyRound(pagas / total * 100, 1), totalParcelas: total,
        parcelasPagas: pagas, parcelasRestantes: total - pagas,
        totalPago: eid === 1 ? pyRound(fsum(pagamentos.map(function (p) { return p.valorPago; })), 2) : null,
        pagamentosConferidos: pagamentos.length, principalQuitado: pyRound(valor * pagas, 2),
        principalRestante: pyRound(valor * (total - pagas), 2), proximaParcela: nxt,
        pagamentos: pagamentos, parcelas: parcelas };
      res.dashboard.push(dash);
      res.ativos.push({ tipo: "acordo" });
      if (eid === 1) {
        res.estado = "em_dia";
        res.proximas.push({ origem: "Receita Federal · PARCSN", pedido: dash.numero, competencia: period(TY, TM),
          vencimento: d(5), dias: -5, sistema: "PARCSN" });
      } else {
        res.estado = "pendente";
        res.ativos.push({ tipo: "inscricao" });
        parcelas.filter(function (p) { return p.situacao === "Devedora"; }).forEach(function (x) {
          res.pendentes.push({ origem: "Receita Federal · PARCSN", pedido: dash.numero, competencia: x.vencimento.slice(0, 7).replace("-", ""),
            vencimento: x.vencimento, dias: daysBetween(TODAY, parseIsoDate(x.vencimento)), sistema: "PARCSN" });
        });
        res.pendentes.push({ origem: "PGFN · Transação", pedido: "TR-998877", competencia: period(TY, TM),
          vencimento: d(-12), dias: 12, sistema: "PGFN" });
        res.limitacoes = ["Pagamentos da PGFN sem detalhamento por parcela.", "Valor total pago do PARCSN incompleto na consulta."];
      }
      modalidades.push({ modalidade: "Parcelamento ordinário do Simples Nacional", sistema: "PARCSN",
        mensagem: "Consulta concluída.",
        parcelamentos: [{ numero: dash.numero, situacao: "Em parcelamento", dataDoPedido: pad(Y(inicio), 4) + pad(M(inicio), 2) + pad(Dd(inicio), 2),
          detalhes: { parcelamento: { consolidacaoOriginal: { valorTotalConsolidado: pyRound(valor * total, 2), quantidadeParcelas: total },
            demonstrativoPagamentos: pagamentos.slice(-6) } },
          mensagemDetalhes: "Demonstrativo limitado aos últimos 6 pagamentos." }],
        parcelas: [{ parcela: period(TY, TM), valor: nxt ? nxt.saldoAtualizado : valor }] });
      modalidades.push({ modalidade: "RELP - Simples Nacional", sistema: "RELPSN", mensagem: "Nenhum pedido encontrado.", parcelamentos: [], parcelas: [] });
    } else {
      modalidades.push({ modalidade: "Parcelamento ordinário do Simples Nacional", sistema: "PARCSN", mensagem: "Nenhum pedido encontrado.", parcelamentos: [], parcelas: [] });
    }
    consultas.push({ modulo: "parcelamentos", periodo: "", consultado: ex("parcelamentos", nowIso(300)), dados: { modalidades: modalidades } });
    if (eid === 1) {
      var parc = parcelasList(12, 4, mkDate(TY, 1, 30), 980.0)[0];
      consultas.push({ modulo: "parcelamentos-gerais", periodo: "", consultado: nowIso(60 * 48), dados: { modalidades: [
        { modalidade: "Parcelamento simplificado (e-CAC)", sistema: "SIPADE", mensagem: "Consulta piloto via e-CAC.", parcelas: [],
          parcelamentos: [{ numero: "10120.554433/2026-11", situacao: "Ativo", dataDoPedido: TY + "-01-15",
            detalhes: { consolidacaoOriginal: { valorTotalConsolidado: 11760.0, quantidadeParcelas: 12 }, parcelas: parc } }] }] } });
    }
    if (eid === 2) {
      consultas.push({ modulo: "pgfn", periodo: "", consultado: ex("pgfn", nowIso(60 * 10)), dados: { inscricoes: [
        { numeroInscricao: "11 6 25 001234-56", situacaoDescricao: "Ativa em cobrança - negociada (transação)", valorTotalConsolidadoMoeda: "38.412,77" },
        { numeroInscricao: "11 2 25 009876-01", situacaoDescricao: "Ativa em cobrança", valorTotalConsolidadoMoeda: "4.210,05" }] } });
    } else if (has(extra, "pgfn")) {
      consultas.push({ modulo: "pgfn", periodo: "", consultado: extra.pgfn, dados: { inscricoes: [] } });
    }
    var docs = [{ id: 900 + eid, tipo: "dctfweb", referencia: comps[comps.length - 1], criado: nowIso(60 * 26) }];
    if (eid === 1 || eid === 2) docs.push({ id: 910 + eid, tipo: "parcela-parcsn", referencia: period(TY, TM), criado: nowIso(60 * 3) });
    return { competencias: comps, consultas: consultas, documentos: docs, resumoParcelamentos: res };
  }

  function dasPayload(e) {
    var eid = e.id;
    var months = buildMonths(e);
    if (!DB.das_guides[eid]) DB.das_guides[eid] = [];
    var guides = DB.das_guides[eid];
    if (!guides.length) {
      var conf = months.filter(function (m) { return m.confirmed; });
      var last = conf[conf.length - 1];
      guides.push({ id: 700 + eid, period: last.period, number: "07202" + last.period + pad(eid, 4) + "5531",
        values: { total: last.tributosApurados }, limite: d(5) });
    }
    var out = [], pays = [];
    months.forEach(function (m, i) {
      if (!m.confirmed) { out.push({ period: m.period, confirmed: false, declaredTax: null, status: "Pendente" }); return; }
      var paid = i < months.length - 1 && !(eid === 2 && i === 9);
      out.push({ period: m.period, confirmed: true, declaredTax: m.tributosApurados,
        status: paid ? "Pago" : (i < months.length - 1 ? "Pagamento não localizado" : "Em aberto") });
      if (paid) {
        var y = parseInt(m.period.slice(0, 4), 10), mo = parseInt(m.period.slice(4), 10);
        var nx = addMonths(y, mo, 1);
        pays.push({ number: "07202" + m.period + pad(eid, 4) + pad(i, 4), period: y + "-" + pad(mo, 2),
          paidAt: "20/" + pad(nx[1], 2) + "/" + nx[0], amount: m.tributosApurados });
      }
    });
    return { consultado_em: has(DB.das_consultado, eid) ? DB.das_consultado[eid] : nowIso(120), complete: eid !== 2,
      months: out, guides: guides, payments: pays };
  }

  function ymOf(mes) { return [toInt(mes.slice(0, 4)), toInt(mes.slice(5, 7))]; }
  function after(y, m, y2, m2) { return y * 12 + m > y2 * 12 + m2; }

  function notasServico(e, mes) {
    var rng = new PyRandom("nfse-" + e.id + "-" + mes);
    var ymv = ymOf(mes), y = ymv[0], m = ymv[1];
    var notas = [];
    if (after(y, m, TY, TM)) return notas;
    var last = y === TY && m === TM ? TD : 28;
    var n = rng.randint(10, 22);
    for (var k = 0; k < n; k++) {
      var day = rng.randint(1, last);
      var tipo = rng.random() < 0.65 ? "Emitida" : "Tomada";
      var ev = rng.random() < 0.08;
      var nota = { nsu: "" + e.id + y + pad(m, 2) + pad(k, 4), numero: String(1200 + k + m * 40), chave: "52" + y + pad(m, 2) + pad(k, 10),
        data: y + "-" + pad(m, 2) + "-" + pad(day, 2), tipo: tipo };
      nota.valor = rng.randint(35000, 2900000);
      nota.contraparte = rng.choice(["Hospital Santa Clara", "Colégio Atheneu", "Agro Cerrado S.A.", "Prefeitura de Aparecida",
        "Google Cloud Brasil", "Contábil Empresarial", "Unimed Goiânia"]);
      nota.situacao = ev ? "Cancelamento a conferir" : "Normal";
      nota.incluida = !ev;
      notas.push(nota);
    }
    return notas;
  }

  function notasProdutos(e, mes) {
    var rng = new PyRandom("nfe-" + e.id + "-" + mes);
    var ymv = ymOf(mes), y = ymv[0], m = ymv[1];
    var notas = [];
    if (after(y, m, TY, TM)) return notas;
    var last = y === TY && m === TM ? TD : 28;
    var forn = [["Moinho Goiás Ltda", cnpj("445566770001")], ["Laticínios Bela Vista", cnpj("556677880001")],
      ["Atacadão Distribuidora", cnpj("667788990001")], ["Embalagens Centro-Oeste", cnpj("778899000001")]];
    var n = rng.randint(6, 14);
    for (var k = 0; k < n; k++) {
      var day = rng.randint(1, last);
      var f = rng.choice(forn);
      var completo = rng.random() > 0.2;
      var ev = completo && rng.random() < 0.1;
      var itens = [];
      if (completo) {
        itens = [["Farinha de trigo tipo 1 - 50kg", rng.randint(5, 40), "SC", 128.9],
          ["Açúcar refinado - 25kg", rng.randint(2, 10), "FD", 94.5]].map(function (r) {
          return { descricao: r[0], quantidade: String(r[1]), unidade: r[2], valor: "R$ " + moneyStr(r[1] * r[3]), cfop: "1102" };
        });
      }
      notas.push({ nsu: "" + e.id + y + pad(m, 2) + pad(k, 5), numero: String(45000 + k + m * 30), data: y + "-" + pad(m, 2) + "-" + pad(day, 2),
        valor: rng.randint(80000, 1800000), fornecedor: f[0], cnpjFornecedor: f[1],
        situacao: ev ? "Evento: ciência da operação a conferir" : (completo ? "Autorizada" : "Resumo - aguardando XML completo"),
        natureza: completo ? "Compra para comercialização" : "", chave: ("5226" + pad(((y % 100) + 100) % 100, 2) + pad(m, 2) + pad(k, 34)).slice(0, 44),
        completo: completo, incluida: completo && !ev, itens: itens });
    }
    return notas;
  }

  function sefazPayload(e, mes) {
    var rng = new PyRandom("sefaz-" + e.id + "-" + mes);
    var ymv = ymOf(mes), y = ymv[0], m = ymv[1];
    var notas = [];
    if (!after(y, m, TY, TM)) {
      var last = y === TY && m === TM ? TD : 28;
      var n = rng.randint(12, 30);
      for (var k = 0; k < n; k++) {
        var modelo = rng.random() < 0.4 ? "65" : "55";
        var nota = { id: "sg-" + e.id + "-" + mes + "-" + k };
        nota.direcao = (modelo === "65" || rng.random() < 0.5) ? "Saída" : "Entrada";
        nota.modelo = modelo;
        nota.data = y + "-" + pad(m, 2) + "-" + pad(rng.randint(1, last), 2);
        nota.numero = String(8800 + k);
        nota.contraparte = modelo === "65" ? "Consumidor final" : rng.choice(["Moinho Goiás Ltda", "Buffet Primavera", "Atacadão Distribuidora"]);
        nota.situacao = rng.random() < 0.05 ? "Cancelada" : "Autorizada";
        notas.push(nota);
      }
    }
    if (!DB.sefaz_buscas[e.id]) {
      DB.sefaz_buscas[e.id] = [
        { id: 1, dia: d(0), inicio: d(-7), fim: d(-1), status: "Em processamento na SEFAZ", evidencia: "" },
        { id: 2, dia: d(-1), inicio: d(-8), fim: d(-2), status: "Concluída", evidencia: "Protocolo SEFAZ-GO 2026/0091827" },
        { id: 3, dia: d(-2), inicio: d(-9), fim: d(-3), status: "Bloqueada: acesso necessário", evidencia: "Procuração eletrônica vencida" },
      ];
    }
    return { rotina: "Rotina diária às 06h: busca de XMLs de entrada e saída (modelos 55 e 65) dos últimos 7 dias.",
      url: "https://www.sefaz.go.gov.br/", notas: notas, buscas: DB.sefaz_buscas[e.id],
      recursos: [{ id: "cadastro", nome: "Consulta cadastral (CCE)", descricao: "Situação da inscrição estadual e regime de apuração." },
        { id: "pendencias", nome: "Pendências de EFD e GIA", descricao: "Omissões de entrega de escrituração." },
        { id: "debitos", nome: "Débitos e certidão estadual", descricao: "Débitos inscritos e situação para CND." }],
      registros: DB.sefaz_registros.filter(function (r) { return r.empresa_id === e.id; }) };
  }

  function folhaPayload(e) {
    var rng = new PyRandom("folha-" + e.id);
    var base = pick({ 1: 38000, 2: 92000, 3: 310000 }, e.id, 38000);
    var fat = {};
    buildMonths(e).forEach(function (m) { fat[m.period] = m; });
    var months = [];
    lastPeriods().forEach(function (p, i) {
      if (i === 3) {
        months.push({ period: p, label: label(p), folha: null, custo: 0, parcial: false, campos_ausentes: [],
          fonte: "Sem extrato publicado", base_comparacao: null, percentual: null });
        return;
      }
      var bruto = pyRound(base * (1 + rng.uniform(-0.05, 0.09) + (p.slice(-2) === "12" ? 0.45 : 0)), 2);
      var enc = i === 7 ? null : pyRound(bruto * 0.278, 2);
      var fgts = pyRound(bruto * 0.08, 2);
      var ben = e.id !== 1 ? pyRound(bruto * 0.07, 2) : null;
      var custo = pyRound(bruto + (enc || 0) + fgts + (ben || 0), 2);
      var parcial = enc === null;
      var fm = fat[p];
      var trabalhadores = pick({ 1: 14, 2: 21, 3: 64 }, e.id, 1) + rng.randint(-1, 2);
      months.push({ period: p, label: label(p),
        folha: { bruto: bruto, encargos: enc, fgts: fgts, beneficios: ben, beneficios_incluidos: e.id === 1, trabalhadores: trabalhadores },
        custo: custo, parcial: parcial, campos_ausentes: parcial ? ["encargos patronais"] : [],
        fonte: i % 2 ? "eSocial conferido" : "Extrato mensal publicado",
        base_comparacao: parcial ? "parcial" : "completa",
        percentual: fm.confirmed && fm.value ? pyRound(custo / fm.value * 100, 1) : null });
    });
    return { months: months };
  }

  function folhaArquivo(e) {
    var rng = new PyRandom("farq-" + e.id);
    var base = pick({ 1: 3800000, 2: 9200000, 3: 31000000 }, e.id, 3800000);
    var periods = lastPeriods();
    var meses = [];
    periods.forEach(function (p, i) {
      if (i === 3) return;
      var prov = pyInt(base * (1 + rng.uniform(-0.05, 0.08)));
      var desc = pyInt(prov * 0.17);
      meses.push({ period: p, proventos: prov, descontos: desc, liquido: prov - desc, fgts_mensal: pyInt(prov * 0.08),
        encargos_patronais: i === 6 ? null : pyInt(prov * 0.21), empregados: pick({ 1: 13, 2: 19, 3: 60 }, e.id, 1),
        estagiarios: e.id === 2 ? 1 : 0, contribuintes: 2, arquivo: "EXTRATO_FOLHA_" + p + ".pdf",
        publicado_em: iso(addDays(mkDate(parseInt(p.slice(0, 4), 10), parseInt(p.slice(4), 10), 1), 37)),
        conferido: i % 3 === 0, atualizacao_pendente: i === periods.length - 1 });
    });
    var lastM = meses[meses.length - 1], lastP = periods[periods.length - 1];
    var pend = DB.folha_conferidos.has(1) || e.id !== 1 ? [] : [
      { id: 1, period: lastP, arquivo: "EXTRATO_FOLHA_" + lastP + "_RETIFICADO.pdf", erro: "Nova versão difere da publicada em R$ 1.284,50.",
        totais: { proventos: lastM.proventos + 128450, descontos: lastM.descontos, liquido: lastM.liquido + 128450 } }];
    return { habilitado: true, meses: meses, competencias_aguardando: [periods[3]],
      monitor: { resumo: { fontes_offline: 0, erro: 0 }, ultima_verificacao: nowIso(4), executando: false,
        progresso: { concluidas: 3, total: 3 } },
      pendencias: pend };
  }

  function tituloView(t) {
    var baixado = isum(t.baixas.map(function (b) { return b.principal; }));
    var saldo = Math.max(0, t.valor - baixado);
    var sit;
    if (t.cancelado) sit = "Cancelado";
    else if (saldo === 0) sit = "Liquidado";
    else if (baixado > 0) sit = "Parcial";
    else if (t.vencimento < isoDate(TODAY)) sit = "Vencido";
    else sit = "Em aberto";
    var mov = isum(t.baixas.map(function (b) { return b.principal + b.juros + b.multa - b.desconto + b.tarifa * (t.tipo === "pagar" ? 1 : -1); }));
    return Object.assign({}, t, { baixado: baixado, saldo: t.cancelado ? 0 : saldo, situacao: sit, movimentado: mov });
  }

  function lotePayload() {
    var labelsStatus = ["concluido", "parcial", "erro", "aguardando_acesso", "nao_coberto", "concluido", "concluido", "cadastro_invalido"];
    var msgs = { concluido: "Consulta concluída sem erros.", parcial: "Detalhamento de pagamentos indisponível nesta fonte.",
      erro: "Tempo limite excedido na API oficial (HTTP 504).", aguardando_acesso: "Acesso pelo certificado suspenso pelo e-CAC.",
      nao_coberto: "Fonte não cobre a modalidade desta empresa.", cadastro_invalido: "CNPJ sem procuração eletrônica ativa." };
    var empresas = [], cont = {}, k = 0;
    DB.empresas.forEach(function (e) {
      var consultas = [];
      ["pgfn", "parcelamentos", "ecac"].forEach(function (fonte) {
        var st = labelsStatus[k % labelsStatus.length];
        k += 1;
        cont[st] = (cont[st] || 0) + 1;
        consultas.push({ fonte: fonte, status: st, mensagem: msgs[st], tentativas: 1 + k % 3, atualizado: nowIso(10 + k * 7) });
      });
      empresas.push({ id: e.id, nome: e.nome, cnpj: e.cnpj, consultas: consultas,
        fontesDisponiveis: e.id !== 3 ? ["pgfn", "parcelamentos"] : ["parcelamentos"],
        acordos: pick({ 1: 1, 2: 1 }, e.id, 0), inscricoesNegociadas: e.id === 2 ? 1 : 0,
        situacao: pick({ 1: "em_dia", 2: "pendente" }, e.id, "a_confirmar"), parcelasVencidas: e.id === 2 ? 3 : 0 });
    });
    var total = isum(Object.keys(cont).map(function (x) { return cont[x]; }));
    var proc = total - (cont.aguardando_acesso || 0);
    return { lote: { id: 14, criado: DB.lote_iniciado, finalizado: null }, contagens: cont,
      percentual: pyRound(proc / total * 100), processadas: proc, total: total, empresas: empresas,
      historico: [{ id: 14, criado: DB.lote_iniciado, finalizado: null },
        { id: 13, criado: nowIso(60 * 24 * 7), finalizado: nowIso(60 * 24 * 7 - 45) },
        { id: 12, criado: nowIso(60 * 24 * 14), finalizado: nowIso(60 * 24 * 14 - 52) }] };
  }

  function auditoriaPayload() {
    var rng = new PyRandom("auditoria");
    var sts = ["atualizado", "atualizado", "atualizado", "atualizado", "atualizado", "atualizado",
      "sem_documento", "conferencia", "divergencia", "erro", "sem_pasta", "nao_consultado"];
    var motivos = { atualizado: "Balancete e EFD conciliados.", sem_documento: "Razão do mês não localizado na pasta.",
      conferencia: "Fonte exige conferência manual.", divergencia: "EFD difere do balancete em R$ 12.430,00.",
      erro: "Falha na leitura do PDF.", sem_pasta: "Pasta do mês não criada no servidor.", nao_consultado: "Aguardando rotina." };
    var empresas = [], cont = {};
    var rows = [[empByIdStatic(3).nome, empByIdStatic(3).cnpj, "Lucro Real", 12],
      ["Agropecuária Vale do Meia Ponte S.A.", cnpj("889900110001"), "Lucro Real", 9],
      ["Distribuidora Anhanguera de Alimentos Ltda", cnpj("990011220001"), "Lucro Real", 5]];
    rows.forEach(function (r) {
      var ok = r[3], meses = [];
      lastPeriods().forEach(function (p, i) {
        var st = i < ok ? "atualizado" : rng.choice(sts.slice(6));
        cont[st] = (cont[st] || 0) + 1;
        meses.push({ period: p, status: st, motivo: motivos[st], verificado_em: st !== "nao_consultado" ? d(-rng.randint(0, 6)) : null,
          documento_id: st === "atualizado" ? 5000 + i : null });
      });
      empresas.push({ nome: r[0], cnpj: r[1], regime: r[2], atualizados: ok, meses: meses });
    });
    return { completas: empresas.filter(function (e) { return e.atualizados === 12; }).length, totalEmpresas: empresas.length,
      contagens: cont, empresas: empresas };
  }

  function agendaAcessorias(e, mes) {
    var ymv = ymOf(mes), y = ymv[0], m = ymv[1];
    var pv = addMonths(y, m, -1);
    var comp = pad(pv[1], 2) + "/" + pv[0];
    var items = [
      { tax: "DAS", titulo: "DAS - Simples Nacional", dia: 20, status: "Guia enviada" },
      { tax: "FGTS", titulo: "FGTS Digital", dia: 20, status: "Guia enviada" },
      { tax: "INSS", titulo: "DCTFWeb - INSS/IRRF", dia: 20, status: "Previsto" },
      { tax: "ISS", titulo: "ISS próprio - Goiânia", dia: 10, status: "Previsto" },
      { tax: "EFD", titulo: "EFD-Reinf", dia: 15, status: "Previsto" },
    ];
    if (e.regime !== "Simples Nacional") items[0] = { tax: "DAS", titulo: "DARF IRPJ/CSLL estimativa", dia: 28, status: "Previsto" };
    var out = items.map(function (it) {
      var dt = mkDate(y, m, it.dia);
      var future = after(y, m, TY, TM);
      return { data: isoDate(dt), tax: it.tax, titulo: it.titulo,
        status: future ? "Previsão recorrente" : (dt.getTime() < TODAY.getTime() ? "Enviada ao cliente" : it.status),
        competencia: comp, officeDue: isoDate(addDays(dt, -5)),
        delivery: "Envio por e-mail e portal", source: "https://www8.receita.fazenda.gov.br/simplesnacional/" };
    });
    return { internalSync: { syncedAt: nowIso(35) }, warning: "", items: out };
  }

  function agendaHonorarios(e, mes) {
    var ymv = ymOf(mes), y = ymv[0], m = ymv[1];
    var dt = mkDate(y, m, 10);
    var paid = dt.getTime() < TODAY.getTime();
    return { updated: nowIso(15), note: "Cobranças de honorários do escritório.",
      items: [{ id: "hon-" + e.id + "-" + mes, titulo: "Honorários contábeis", data: isoDate(dt), category: "honorarios",
        status: paid ? "Pago em " + dmy(addDays(dt, -2)) : "Em aberto",
        valor: pick({ 1: 1500.0, 2: 2200.0, 3: 6800.0 }, e.id, 1500.0), origem: "Conta Azul" }] };
  }

  function dpSimular(b) {
    var S = num(get(b, "salario"));
    var versao = "Simulador DP v2.3 (mock)";
    var fontes = [{ titulo: "CLT - Decreto-Lei 5.452/1943", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm" },
      { titulo: "Lei 8.036/1990 - FGTS", url: "https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm" }];
    var c = function (v) { return pyRound(v * 100); };
    var sumV = function (arr) { return isum(arr.map(function (x) { return x.valor; })); };
    if (get(b, "tipo") === "rescisao") {
      var med = num(get(b, "medias"));
      var base = S + med;
      var dias = num(get(b, "dias_saldo"));
      var avos13 = num(get(b, "avos13"));
      var avosf = num(get(b, "avos_ferias"));
      var venc = num(get(b, "ferias_vencidas"));
      var motivo = or(get(b, "motivo"), "sem_justa");
      var anos = 0;
      var ds = parseIsoDate(get(b, "saida")), da = parseIsoDate(get(b, "admissao"));
      if (ds && da) anos = Math.max(0, Math.floor(daysBetween(ds, da) / 365));
      var diasAviso = Math.min(90, 30 + 3 * anos);
      var creditos = [{ descricao: "Saldo de salário", valor: c(base / 30 * dias) },
        { descricao: "13º proporcional (" + pyInt(avos13) + "/12)", valor: c(base / 12 * avos13) },
        { descricao: "Férias proporcionais + 1/3 (" + pyInt(avosf) + "/12)", valor: c(base / 12 * avosf * 4 / 3) }];
      if (venc) creditos.push({ descricao: "Férias vencidas + 1/3", valor: c(base * venc * 4 / 3) });
      if (get(b, "aviso") === "indenizado") {
        var f = motivo === "acordo" ? 0.5 : 1;
        creditos.push({ descricao: "Aviso-prévio indenizado (" + diasAviso + " dias)", valor: c(base / 30 * diasAviso * f) });
      }
      var outras = num(get(b, "outras_verbas"));
      if (outras) creditos.push({ descricao: "Outras verbas informadas", valor: c(outras) });
      var descontos = [];
      if (get(b, "aviso") === "descontado") descontos.push({ descricao: "Aviso-prévio não cumprido", valor: c(base) });
      if (num(get(b, "descontos"))) descontos.push({ descricao: "Descontos e retenções informados", valor: c(num(get(b, "descontos"))) });
      var bruto = sumV(creditos);
      var desc = sumV(descontos);
      var fgtsPct = num(get(b, "fgts"), 8);
      var baseFgts = num(get(b, "base_fgts"));
      var deposito = baseFgts ? c(baseFgts * fgtsPct / 100) : pyInt(bruto * fgtsPct / 100);
      var aliq = pick({ sem_justa: 40, acordo: 20 }, motivo, 0);
      var multa = aliq === 0 ? 0 : null;
      var enc = c(num(get(b, "encargos")));
      return { creditos: creditos, descontos: descontos, bruto: bruto, subtotal_informado: bruto - desc,
        custo_incompleto: multa === null, custo_empresa: bruto + deposito + enc + (multa || 0),
        deposito_fgts: deposito, aliquota_multa: aliq, multa_fgts: multa, encargos: enc,
        dias_aviso_referencia: diasAviso,
        premissas: ["Contrato por prazo indeterminado.", "Aviso-prévio de referência: " + diasAviso + " dias (Lei 12.506/2011)."],
        alertas: ["INSS e IRRF não calculados.", multa === null ? "Multa do FGTS depende do saldo da conta vinculada." : "Sem multa rescisória do FGTS neste motivo."],
        fontes: fontes, versao: versao, calculado_em: nowIso() };
    }
    var base2 = S + num(get(b, "adicionais"));
    var pat = num(get(b, "patronal"));
    var fg = num(get(b, "fgts"), 8);
    var ben = num(get(b, "beneficios")) - num(get(b, "coparticipacao"));
    var outros = num(get(b, "outros"));
    var prov = base2 / 12 + base2 / 12 * 4 / 3;
    var comps = [["Salário e adicionais", base2], ["Encargos patronais (" + fmtG(pat) + "%)", base2 * pat / 100], ["FGTS (" + fmtG(fg) + "%)", base2 * fg / 100],
      ["Provisão 13º e férias + 1/3", prov], ["Encargos sobre provisões", prov * (pat + fg) / 100],
      ["Benefícios líquidos", ben], ["Outros custos", outros]];
    var componentes = comps.map(function (x) { return { descricao: x[0], valor: c(x[1]) }; });
    var mensal = sumV(componentes);
    return { mensal: mensal, anual: mensal * 12, componentes: componentes,
      premissas: ["Provisões mensais de 13º salário e férias + 1/3 incluídas.", "Regime: " + (get(b, "regime") === "cpp_das" ? "CPP no DAS" : "CPP sobre a folha")],
      alertas: ["RAT/FAP e terceiros dependem do enquadramento.", "Convenção coletiva pode prever pisos e benefícios adicionais."],
      fontes: fontes, versao: versao, calculado_em: nowIso() };
  }

  // ================================================================ placeholder files
  function latin1Bytes(s) {
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function tinyPdf(text) {
    if (text === undefined) text = "Documento de exemplo - Portal do Cliente (mock)";
    text = Array.from(String(text)).map(function (ch) { return ch.charCodeAt(0) < 256 && ch.length === 1 ? ch : "?"; }).join("")
      .replace(/\(/g, "[").replace(/\)/g, "]");
    var stream = "BT /F1 16 Tf 72 760 Td (" + text + ") Tj ET";
    var objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    var out = "%PDF-1.4\n";
    var offsets = [];
    objs.forEach(function (o, i) {
      offsets.push(out.length);
      out += (i + 1) + " 0 obj\n" + o + "\nendobj\n";
    });
    var xref = out.length;
    out += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n";
    offsets.forEach(function (off) { out += pad(off, 10) + " 00000 n \n"; });
    out += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
    return latin1Bytes(out);           // one char == one byte (latin-1)
  }

  function previewHtml(title) {
    var n = naiveNow();
    return '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>' + title + '</title>\n' +
      '<body style="font:15px/1.5 Arial,sans-serif;color:#173541;background:#fff;padding:32px;max-width:720px;margin:auto">\n' +
      '<h2 style="margin-top:0">' + title + '</h2><p>Pré-visualização de exemplo gerada pelo servidor mock.</p>\n' +
      '<table style="border-collapse:collapse;width:100%">\n' +
      '<tr><td style="border-bottom:1px solid #ccd;padding:8px">Emitente</td><td style="border-bottom:1px solid #ccd;padding:8px">Receita Federal do Brasil</td></tr>\n' +
      '<tr><td style="border-bottom:1px solid #ccd;padding:8px">Situação</td><td style="border-bottom:1px solid #ccd;padding:8px">Documento válido (exemplo)</td></tr>\n' +
      '<tr><td style="padding:8px">Gerado em</td><td style="padding:8px">' + dmy(n) + " " + hm(n) + "</td></tr></table></body></html>";
  }

  var SAMPLE_XML = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe52261100000000000000550010000000011000000010">\n' +
    "<ide><cUF>52</cUF><natOp>Venda de mercadoria</natOp><mod>55</mod><nNF>1</nNF></ide>\n" +
    "<emit><xNome>Empresa de Exemplo Ltda</xNome></emit><total><ICMSTot><vNF>100.00</vNF></ICMSTot></total>\n" +
    "</infNFe></NFe></nfeProc>\n";

  var FILE_ENDPOINTS = ["/api/download", "/api/preview", "/api/visao/pdf", "/api/das/pdf", "/api/central-fiscal/pdf",
    "/api/central-fiscal/consulta-pdf", "/api/sefaz-go/consulta-pdf", "/api/notas/previa/pdf",
    "/api/sefaz-go/xml", "/api/notas/nfce/xml", "/api/notas-produtos/xml", "/api/notas-servico/xml",
    "/api/financeiro/exportar"];

  // ================================================================ demo session (replaces the cookie)
  var PERFIL_KEY = "ce-demo-perfil";
  var memPerfil = null;
  function loadPerfil() {
    var p = null;
    try { p = W.localStorage.getItem(PERFIL_KEY); } catch (e) { p = memPerfil; }
    if (p === null || p === undefined) p = memPerfil;
    return p === "escritorio" ? "escritorio" : "cliente";
  }
  function savePerfil(p) {
    p = p === "escritorio" ? "escritorio" : "cliente";
    memPerfil = p;
    try { W.localStorage.setItem(PERFIL_KEY, p); } catch (e) { /* in-memory fallback */ }
    return p;
  }

  var OFFICE_USER = { id: 1, nome: "Mariana Couto", usuario: "mariana.couto", perfil: "escritorio", funcao: "administrador",
    empresa_id: null, empresa_nome: null, trocar_senha: false };

  function makeUser(perfil, usuario) {
    if (perfil === "cliente") {
      var ue = DB.empresas[0];
      return { id: 10, nome: "Roberto Almeida", usuario: usuario || "cliente", perfil: "cliente", funcao: null,
        empresa_id: ue.id, empresa_nome: ue.nome, trocar_senha: false };
    }
    return Object.assign({}, OFFICE_USER, usuario ? { usuario: usuario } : {});
  }
  var SESSION = makeUser(loadPerfil());
  function sessionUser() {
    if (SESSION.perfil !== loadPerfil()) SESSION = makeUser(loadPerfil());
    return SESSION;
  }

  // ================================================================ router
  function jsonRes(obj, status) {
    return { status: status || 200, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(obj) };
  }
  function bytesRes(data, ctype, filename) {
    var h = { "Content-Type": ctype };
    if (filename) h["Content-Disposition"] = 'attachment; filename="' + filename + '"';
    return { status: 200, headers: h, body: typeof data === "string" ? utf8(data) : data };
  }
  function qGetter(q) {
    // parse_qs drops blank values; first value wins
    return function (k, dflt) {
      if (dflt === undefined) dflt = "";
      var v = q.get(k);
      return v === null || v === "" ? dflt : v;
    };
  }
  function empresaCtx(qv, user) {
    // Company selected by ?empresa_id, or the client's company. null = all (office)
    var eid = qv("empresa_id");
    if (!eid && user.perfil === "cliente") eid = pyStr(user.empresa_id);
    return eid ? emp(eid) : null;
  }
  function maxId(list, extra) {
    var ids = list.map(function (x) { return x.id; }).concat(extra || []);
    if (!ids.length) throw new Error("max() arg is an empty sequence");
    return Math.max.apply(null, ids);
  }

  function route(method, path, q, b) {
    var qv = qGetter(q);
    var user = sessionUser();
    var e, target, nid, ts, found;

    if (FILE_ENDPOINTS.indexOf(path) >= 0) return serveFile(path, q, user);

    if (method === "GET") {
      e = empresaCtx(qv, user);
      var e0 = function () { return e || DB.empresas[0]; };
      switch (path) {
        case "/api/lancamento":
          return jsonRes({ ativo: false, views: [] });
        case "/api/me":
          return jsonRes({ autenticado: true, usuario: user });
        case "/api/empresas": {
          var lst = user.perfil === "escritorio" ? DB.empresas : DB.empresas.filter(function (x) { return x.id === user.empresa_id; });
          return jsonRes({ empresas: lst.map(empPublic) });
        }
        case "/api/painel": {
          if (!e) {
            return jsonRes({ escopo: "geral", cards: {
              empresas: DB.empresas.length,
              solicitacoes_abertas: DB.solicitacoes.filter(function (s) { return s.status === "aberta"; }).length,
              documentos_recebidos: DB.documentos.filter(function (x) { return x.origem === "cliente"; }).length,
              obrigacoes_atrasadas: DB.obrigacoes.filter(function (o) { return o.status === "atrasada"; }).length } });
          }
          var pv = addMonths(TY, TM, -1);
          return jsonRes({ escopo: "empresa", empresa: empPublic(e), competencia: pad(pv[1], 2) + "/" + pv[0] });
        }
        case "/api/visao": {
          e = e0();
          var fat = faturamentoPayload(e);
          var conf = fat.months.filter(function (m) { return m.confirmed; });
          var last = conf[conf.length - 1];
          var job = has(DB.jobs, e.id) ? DB.jobs[e.id] : null;
          return jsonRes({ latest: { label: last.label, value: last.value, cargaTributaria: last.cargaTributaria, period: last.period },
            alerts: [{ tipo: "DAS", texto: "DAS de " + last.label + " vence em " + dmy(mkDate(TY, TM, 20)) + ".", view: "guias" },
              { tipo: "Pendência", texto: "DEFIS 2026 aguardando informações dos sócios.", view: "obrigacoes" },
              { tipo: "Guia", texto: "FGTS Digital disponível para pagamento.", view: "guias" }],
            source: fat.source, updated: fat.sincronizado_em, job: job, regime: e.regime, months: fat.months });
        }
        case "/api/receita-mensal": {
          e = e0();
          var fat2 = faturamentoPayload(e);
          var months = fat2.months.map(function (m) { return { period: m.period, label: m.label, confirmed: m.confirmed, value: m.value }; });
          return jsonRes({ months: months, total: fat2.total, confirmedMonths: months.filter(function (m) { return m.confirmed; }).length,
            fonte: fat2.source, consultado_em: nowIso(180), sincronizado_em: fat2.sincronizado_em });
        }
        case "/api/faturamento":
          if (!e) return jsonRes({ habilitado: false, message: "Selecione uma empresa." });
          return jsonRes(faturamentoPayload(e));
        case "/api/faturamento/auditoria":
          return jsonRes(auditoriaPayload());
        case "/api/folha":
          return jsonRes(folhaPayload(e0()));
        case "/api/folha/arquivo":
          return jsonRes(folhaArquivo(e0()));
        case "/api/documentos":
          return jsonRes({ documentos: DB.documentos.filter(function (x) { return !e || x.empresa_id === e.id; }) });
        case "/api/certificado-digital":
          return jsonRes({ certificado: e ? certificado(e) : null });
        case "/api/equipe-empresa":
          return jsonRes({ responsaveis: [
            { departamento: "FEDERAL", nome: "Fernanda Lopes", sincronizado: nowIso(70) },
            { departamento: "FISCAL", nome: "Carlos Henrique Prado", sincronizado: nowIso(70) },
            { departamento: "FISCAL", nome: "Débora Nunes", sincronizado: nowIso(70) },
            { departamento: "CONTÁBIL", nome: "Mariana Couto", sincronizado: nowIso(70) },
            { departamento: "PESSOAL", nome: "Rafael Teixeira", sincronizado: nowIso(70) }] });
        case "/api/central-fiscal":
          return jsonRes(centralFiscal(e0()));
        case "/api/relatorios-fiscais": {
          e = e0();
          var rel = [{ tipo: "oficial", atual: true, titulo: "Relatório de Situação Fiscal (SITFIS)", data_origem: d(-3),
            sincronizado: nowIso(90), matriz: e.cnpj, documento_id: 6000 + e.id, nome_arquivo: "SITFIS.pdf" },
          { tipo: "gerencial", atual: true, titulo: "Análise gerencial de pendências", data_origem: d(-2),
            sincronizado: nowIso(90), matriz: e.cnpj, documento_id: 6010 + e.id, nome_arquivo: "analise-pendencias.pdf" },
          { tipo: "oficial", atual: false, titulo: "Relatório de Situação Fiscal (SITFIS)", data_origem: d(-35),
            sincronizado: nowIso(60 * 24 * 35), matriz: e.cnpj, documento_id: 6020 + e.id, nome_arquivo: "SITFIS-anterior.pdf" }];
          return jsonRes({ nota: "Relatórios oficiais e gerenciais anexados no portal interno. Confira a data de emissão de cada PDF.", relatorios: rel });
        }
        case "/api/obrigacoes":
          return jsonRes({ obrigacoes: DB.obrigacoes.filter(function (o) { return !e || o.empresa_id === e.id; }) });
        case "/api/solicitacoes": {
          var sl = DB.solicitacoes.filter(function (s) { return !e || s.empresa_id === e.id; });
          sl = sl.slice().sort(function (a, c) { return a.atualizada_em < c.atualizada_em ? 1 : a.atualizada_em > c.atualizada_em ? -1 : 0; });
          return jsonRes({ solicitacoes: sl });
        }
        case "/api/parcelamentos/lote":
          return jsonRes(lotePayload());
        case "/api/grupos":
          return jsonRes({ grupos: DB.grupos });
        case "/api/usuarios/gestao":
          return jsonRes({ usuarios: DB.usuarios });
        case "/api/financeiro/painel":
          e = e0();
          return jsonRes({ assinatura: DB.assinaturas[e.id], titulos: DB.titulos.filter(function (t) { return t.empresa_id === e.id; }).map(tituloView) });
        case "/api/financeiro/estoque":
          e = e0();
          return jsonRes({ produtos: DB.produtos.filter(function (p) { return p.empresa_id === e.id; }) });
        case "/api/das":
          return jsonRes(dasPayload(e0()));
        case "/api/notas/buscar-agora": {
          var st = DB.buscas_notas[qv("empresa_id") + "-" + qv("tipo")];
          var n = naiveNow();
          return jsonRes(st || { status: "concluido", mensagem: "Última consulta prioritária concluída " + dmy(n).slice(0, 5) + " " + hm(n), novos_documentos: 3 });
        }
        case "/api/sefaz-go":
          return jsonRes(sefazPayload(e0(), qv("mes", ym(TODAY))));
        case "/api/notas/nfce": {
          e = e0();
          var mes = qv("mes", ym(TODAY));
          var nf = sefazPayload(e, mes).notas.filter(function (x) { return x.modelo === "65"; }).slice(0, 6);
          var digits = e.cnpj.replace(/[./-]/g, "");
          return jsonRes({ notas: nf.map(function (x) {
            return { id: x.id, data: x.data, chave: "5226" + mes.replace("-", "").slice(2) + digits + "650010000" + x.numero + "1" + x.numero };
          }) });
        }
        case "/api/notas-produtos":
          e = e0();
          return jsonRes({ limite: "Coleta automática de NF-e destinadas via Ambiente Nacional (DF-e), limitada aos últimos 90 dias.",
            sync: { atualizado: nowIso(25), status: "Consulta automática concluída" }, pendentes: 2,
            notas: notasProdutos(e, qv("mes", ym(TODAY))) });
        case "/api/notas-servico":
          e = e0();
          return jsonRes({ limite: "NFS-e do Ambiente Nacional e da Prefeitura de Goiânia; notas anteriores a 2023 podem não estar disponíveis.",
            sync: { atualizado: nowIso(25), status: "Consulta automática concluída" }, pendentes: 1,
            notas: notasServico(e, qv("mes", ym(TODAY))) });
        case "/api/agenda/acessorias":
          return jsonRes(agendaAcessorias(e0(), qv("mes", ym(TODAY))));
        case "/api/agenda/eventos":
          return jsonRes({ eventos: DB.eventos.filter(function (x) { return !e || x.empresa_id === e.id; }) });
        case "/api/agenda/honorarios":
          return jsonRes(agendaHonorarios(e0(), qv("mes", ym(TODAY))));
        case "/api/agenda/honorarios/cobranca":
          return jsonRes({ url: null, note: "Link de cobrança indisponível no ambiente de demonstração." });
        case "/api/malotes":
          return jsonRes({ malotes: DB.malotes.filter(function (m) { return !e || m.empresa_id === e.id; }) });
      }
      if (W.console) W.console.warn("[mock-browser] unhandled GET " + path);
      return jsonRes({});
    }

    // ------------------------------------------------------------ POST
    if (!b || typeof b !== "object" || Array.isArray(b)) b = {};
    var eid = get(b, "empresa_id");
    e = eid !== null && eid !== "" ? emp(eid) : (user.perfil === "cliente" ? emp(user.empresa_id) : null);
    var t0 = function () { return e || DB.empresas[0]; };
    var byId = function (list, key) { return list.filter(function (x) { return x.id === get(b, key || "id"); }); };

    switch (path) {
      case "/api/login": {
        var usuario = pyStr(or(get(b, "usuario"), "")).trim() || "admin";
        var perfil = savePerfil(usuario === "cliente" ? "cliente" : "escritorio");
        SESSION = makeUser(perfil, usuario);
        return jsonRes({ ok: true, usuario: SESSION });
      }
      case "/api/logout":
        setTimeout(function () { try { W.location.reload(); } catch (err) { /* ignore */ } }, 50);
        return jsonRes({ ok: true });
      case "/api/senha":
        user.trocar_senha = false;
        return jsonRes({ ok: true, usuario: user });
      case "/api/visao/atualizar":
        if (e) {
          var n1 = naiveNow();
          DB.jobs[e.id] = { status: "concluido", message: "Consulta oficial concluída " + dmy(n1).slice(0, 5) + " " + hm(n1) };
        }
        return jsonRes({ ok: true });
      case "/api/documentos": {
        target = t0();
        var arq = get(b, "arquivo");
        var f = arq && typeof arq === "object" && !Array.isArray(arq) ? arq : { filename: "arquivo.pdf", size: 0 };
        var fname = has(f, "filename") ? f.filename : (f.nome || f.name || null);
        var fsize = has(f, "size") ? f.size : (typeof f.base64 === "string" ? Math.floor(f.base64.length * 3 / 4) : 0);
        nid = maxId(DB.documentos) + 1;
        DB.documentos.push({ id: nid, empresa_id: target.id, empresa: target.nome, titulo: or(get(b, "titulo"), fname),
          categoria: or(get(b, "categoria"), "Geral"), nome_arquivo: or(fname, "arquivo"),
          competencia: or(get(b, "competencia"), null), origem: user.perfil === "cliente" ? user.perfil : "escritorio",
          tamanho: fsize, criado_em: nowIso(), validade: null, consultado_em: or(get(b, "consultado_em"), null),
          conferido_em: null, conferido_por: null, vencimento: or(get(b, "vencimento"), null) });
        return jsonRes({ ok: true, id: nid });
      }
      case "/api/documentos/conferir":
        byId(DB.documentos).forEach(function (x) { x.conferido_em = nowIso(); x.conferido_por = user.nome; });
        return jsonRes({ ok: true });
      case "/api/obrigacoes": {
        target = t0();
        var fields = {};
        ["titulo", "competencia", "vencimento", "status", "observacao"].forEach(function (k) { fields[k] = get(b, k); });
        if (truthy(get(b, "id"))) {
          byId(DB.obrigacoes).forEach(function (o) { Object.assign(o, fields); });
        } else {
          nid = maxId(DB.obrigacoes) + 1;
          DB.obrigacoes.push(Object.assign({}, fields, { id: nid, empresa_id: target.id, empresa: target.nome }));
        }
        return jsonRes({ ok: true });
      }
      case "/api/solicitacoes":
        target = t0();
        nid = maxId(DB.solicitacoes) + 1;
        ts = nowIso();
        DB.solicitacoes.push({ id: nid, empresa_id: target.id, empresa: target.nome, protocolo: "SOL-" + TY + "-" + pad(nid, 4),
          assunto: or(get(b, "assunto"), "Sem assunto"), status: "aberta", prioridade: or(get(b, "prioridade"), "normal"),
          responsavel: null, prazo: null, criada_em: ts, atualizada_em: ts,
          mensagens: [{ autor_nome: user.nome, autor_perfil: user.perfil, corpo: or(get(b, "corpo"), ""), criada_em: ts }] });
        return jsonRes({ ok: true, id: nid });
      case "/api/mensagens":
        byId(DB.solicitacoes, "solicitacao_id").forEach(function (s) {
          var ts2 = nowIso();
          s.mensagens.push({ autor_nome: user.nome, autor_perfil: user.perfil, corpo: or(get(b, "corpo"), ""), criada_em: ts2 });
          s.atualizada_em = ts2;
          s.status = user.perfil === "escritorio" ? "respondida" : "aberta";
        });
        return jsonRes({ ok: true });
      case "/api/solicitacoes/status":
        byId(DB.solicitacoes).forEach(function (s) { s.status = or(get(b, "status"), "fechada"); s.atualizada_em = nowIso(); });
        return jsonRes({ ok: true });
      case "/api/solicitacoes/atribuicao":
        byId(DB.solicitacoes).forEach(function (s) { s.responsavel = or(get(b, "responsavel"), null); s.prazo = or(get(b, "prazo"), null); });
        return jsonRes({ ok: true });
      case "/api/empresas": {
        nid = maxId(DB.empresas) + 1;
        DB.empresas.push({ id: nid, nome: or(get(b, "nome"), "Nova empresa"), cnpj: or(get(b, "cnpj"), ""), regime: "Simples Nacional",
          base: 50000.0, rate: 6.0, mix: [1.0, 0.0, 0.0], usuarios: 0, grupo: null });
        DB.assinaturas[nid] = { liberado: false, situacao: "cancelado", ate: null, valor_mensal: null };
        return jsonRes({ ok: true, id: nid });
      }
      case "/api/usuarios": {
        nid = maxId(DB.usuarios) + 1;
        DB.usuarios.push({ id: nid, nome: or(get(b, "nome"), ""), usuario: or(get(b, "usuario"), "user" + nid), email: or(get(b, "email"), ""),
          perfil: or(get(b, "perfil"), "cliente"), funcao: get(b, "funcao"), ativo: true, trocar_senha: true,
          empresa_id: get(b, "empresa_id"), grupo_id: get(b, "grupo_id") });
        var ue = truthy(get(b, "empresa_id")) ? emp(get(b, "empresa_id")) : null;
        if (ue) ue.usuarios += 1;
        return jsonRes({ ok: true, id: nid });
      }
      case "/api/usuarios/gestao":
        byId(DB.usuarios).forEach(function (x) {
          if (get(b, "acao") === "senha") x.trocar_senha = true;
          else ["nome", "email", "funcao", "ativo"].forEach(function (k) { if (has(b, k)) x[k] = b[k]; });
        });
        return jsonRes({ ok: true });
      case "/api/acessos":
        byId(DB.usuarios).forEach(function (x) { x.empresa_id = get(b, "empresa_id"); x.grupo_id = get(b, "grupo_id"); });
        return jsonRes({ ok: true });
      case "/api/grupos":
        if (truthy(get(b, "id"))) {
          byId(DB.grupos).forEach(function (g) {
            g.nome = or(get(b, "nome"), g.nome); g.empresa_ids = or(get(b, "empresa_ids"), []); g.ajustado_manual = true;
          });
        } else {
          nid = maxId(DB.grupos, [0]) + 1;
          DB.grupos.push({ id: nid, nome: or(get(b, "nome"), "Novo grupo"), empresa_ids: or(get(b, "empresa_ids"), []),
            origem: "Manual", ajustado_manual: false, socios: [] });
        }
        return jsonRes({ ok: true });
      case "/api/dp/simular":
        return jsonRes(dpSimular(b));
      case "/api/financeiro/titulos": {
        target = t0();
        if (get(b, "acao") === "cancelar") {
          byId(DB.titulos).forEach(function (t) { t.cancelado = true; });
          return jsonRes({ ok: true });
        }
        var tf = {};
        ["tipo", "descricao", "contato", "competencia", "vencimento", "categoria", "centro_custo", "conta", "forma", "observacao"]
          .forEach(function (k) { tf[k] = or(get(b, k), ""); });
        var valor = pyRound(num(get(b, "valor")) * 100);
        if (truthy(get(b, "id"))) {
          byId(DB.titulos).forEach(function (t) { Object.assign(t, tf, { valor: valor }); });
          return jsonRes({ ok: true });
        }
        var np = Math.max(1, pyInt(num(get(b, "parcelas"), 1)));
        var modo = or(get(b, "modo"), "unico");
        var v0 = parseIsoDate(tf.vencimento) || TODAY;
        for (var k = 0; k < (modo !== "unico" ? np : 1); k++) {
          var ymk = addMonths(Y(v0), M(v0), k);
          var venc = isoDate(mkDate(ymk[0], ymk[1], Math.min(Dd(v0), 28)));
          nid = maxId(DB.titulos) + 1;
          DB.titulos.push(Object.assign({}, tf, { id: nid, empresa_id: target.id, vencimento: venc, cancelado: false, baixas: [],
            parcela: k + 1, total_parcelas: modo !== "unico" ? np : 1, valor: modo === "parcelado" ? Math.floor(valor / np) : valor }));
        }
        return jsonRes({ ok: true });
      }
      case "/api/financeiro/baixas":
        byId(DB.titulos).forEach(function (t) {
          var c = function (k) { return pyRound(num(get(b, k)) * 100); };
          t.baixas.push({ data: or(get(b, "data"), isoDate(TODAY)), principal: c("principal"), juros: c("juros"),
            multa: c("multa"), desconto: c("desconto"), tarifa: c("tarifa"), conta: or(get(b, "conta"), t.conta) });
        });
        return jsonRes({ ok: true });
      case "/api/financeiro/produtos":
        target = t0();
        nid = maxId(DB.produtos) + 1;
        DB.produtos.push({ id: nid, empresa_id: target.id, codigo: or(get(b, "codigo"), ""), nome: or(get(b, "nome"), ""),
          unidade: or(get(b, "unidade"), "UN"), saldo: 0, minimo: pyInt(num(get(b, "minimo")) * 1000),
          preco: pyRound(num(get(b, "preco")) * 100), movimentos: [] });
        return jsonRes({ ok: true, id: nid });
      case "/api/financeiro/movimentos": {
        var prods = DB.produtos.filter(function (p) { return p.id === get(b, "produto_id"); });
        for (var i = 0; i < prods.length; i++) {
          var p = prods[i];
          var qn = pyRound(num(get(b, "quantidade")) * 1000);
          if (get(b, "tipo") === "saida" && qn > p.saldo) return jsonRes({ erro: "Saída deixaria o estoque negativo." }, 400);
          p.saldo += get(b, "tipo") === "entrada" ? qn : -qn;
          p.movimentos.push({ tipo: get(b, "tipo"), quantidade: qn, data: or(get(b, "data"), isoDate(TODAY)), motivo: or(get(b, "motivo"), "") });
        }
        return jsonRes({ ok: true });
      }
      case "/api/financeiro/assinatura":
        if (e) {
          var s = DB.assinaturas[e.id];
          if (!s) throw new Error("KeyError: " + e.id);
          s.situacao = or(get(b, "situacao"), s.situacao);
          s.ate = or(get(b, "ate"), null);
          s.valor_mensal = truthy(get(b, "valor_mensal")) ? pyRound(num(get(b, "valor_mensal")) * 100) : null;
          s.liberado = s.situacao === "piloto" || s.situacao === "ativo";
        }
        return jsonRes({ ok: true });
      case "/api/malotes":
        target = t0();
        nid = maxId(DB.malotes) + 1;
        DB.malotes.unshift({ id: nid, empresa_id: target.id, competence: or(get(b, "competencia"), ""), status: "Recebido",
          delivery_mode: "Portal externo", created_at: nowIso(),
          files: (or(get(b, "files"), [])).map(function (f) {
            return { original_name: get(f, "filename"), category: get(f, "category"), review_status: "Aguardando conferência" };
          }) });
        return jsonRes({ ok: true, id: nid });
      case "/api/das/consultar":
        if (e) DB.das_consultado[e.id] = nowIso();
        return jsonRes({ ok: true });
      case "/api/das/gerar": {
        target = t0();
        var per = pyStr(or(get(b, "period"), ""));
        if (!DB.das_guides[target.id]) DB.das_guides[target.id] = [];
        var guides = DB.das_guides[target.id];
        var kept = guides.filter(function (g) { return g.period !== per; });
        guides.length = 0;
        kept.forEach(function (g) { guides.push(g); });
        var fm = buildMonths(target).filter(function (m) { return m.period === per; })[0] || null;
        var totalG = fm && fm.confirmed ? pyRound((fm.tributosApurados || 0) * 1.0233, 2) : 0;
        var dt = parseIsoDate(get(b, "date"));
        var lim = dmy(dt || TODAY);
        guides.push({ id: 700 + guides.length + target.id * 50, period: per,
          number: "07202" + per + pad(target.id, 4) + pad(Math.floor(Math.random() * 9999), 4),
          values: { total: totalG }, limite: lim });
        return jsonRes({ ok: true });
      }
      case "/api/central-fiscal/consultar":
      case "/api/central-fiscal/parcela":
        if (e) {
          var modulo = get(b, "modulo");
          var key = or(modulo, "parcela") + (modulo === "dctfweb" || modulo === "mit" ? or(get(b, "periodo"), "") : "");
          if (!DB.consultas_extra[e.id]) DB.consultas_extra[e.id] = {};
          DB.consultas_extra[e.id][key] = nowIso();
        }
        return jsonRes({ ok: true });
      case "/api/parcelamentos/lote":
        DB.lote_iniciado = nowIso();
        return jsonRes({ ok: true });
      case "/api/notas/buscar-agora": {
        var n2 = naiveNow();
        DB.buscas_notas[pyStr(get(b, "empresa_id")) + "-" + pyStr(get(b, "tipo"))] = {
          status: "concluido", mensagem: "Consulta prioritária concluída " + dmy(n2).slice(0, 5) + " " + hm(n2), novos_documentos: 0 };
        return jsonRes({ ok: true });
      }
      case "/api/sefaz-go/importar":
        return jsonRes({ ok: true, importados: 18, repetidos: 3 });
      case "/api/sefaz-go/busca":
        (DB.sefaz_buscas[e ? e.id : 0] || []).forEach(function (x) {
          if (x.id === get(b, "id")) { x.status = or(get(b, "status"), x.status); x.evidencia = or(get(b, "evidencia"), ""); }
        });
        return jsonRes({ ok: true });
      case "/api/sefaz-go/registro":
        target = t0();
        DB.sefaz_registros = DB.sefaz_registros.filter(function (r) { return !(r.empresa_id === target.id && r.recurso === get(b, "recurso")); });
        DB.sefaz_registros.push({ id: DB.sefaz_registros.length + 10, empresa_id: target.id, recurso: get(b, "recurso"),
          resultado: or(get(b, "resultado"), ""), consultado: or(get(b, "consultado"), isoDate(TODAY)),
          referencia: or(get(b, "referencia"), "") });
        return jsonRes({ ok: true });
      case "/api/folha/arquivo/conferir":
        if (e) DB.folha_conferidos.add(e.id);
        return jsonRes({ ok: true });
      case "/api/faturamento/efd/analisar": {
        target = t0();
        var lp = lastPeriods();
        var p2 = lp[lp.length - 1];
        return jsonRes({ nome: "EFD-Contribuicoes_" + p2 + ".txt", cnpj: target.cnpj, period: p2,
          aviso: "Receita bruta identificada no bloco M; confira com o balancete antes de publicar.",
          candidato: pyRound(target.base * 1.02, 2) });
      }
      case "/api/faturamento/efd/publicar":
      case "/api/faturamento/tributos":
      case "/api/folha":
      case "/api/folha/arquivo/sincronizar":
      case "/api/notas/nfce":
        return jsonRes({ ok: true });
      case "/api/agenda/eventos": {
        target = t0();
        var data = {};
        ["titulo", "data", "hora", "tipo", "descricao"].forEach(function (k) { data[k] = get(b, k); });
        data.valor = get(b, "valor") !== null && get(b, "valor") !== "" ? num(get(b, "valor")) : null;
        if (truthy(get(b, "id"))) {
          byId(DB.eventos).forEach(function (ev) { Object.assign(ev, data); });
        } else {
          nid = maxId(DB.eventos, [0]) + 1;
          DB.eventos.push(Object.assign({}, data, { id: nid, empresa_id: target.id, autor_nome: user.nome, editavel: true }));
        }
        return jsonRes({ ok: true });
      }
    }
    if (W.console) W.console.warn("[mock-browser] unhandled POST " + path);
    return jsonRes({});
  }

  function serveFile(path, q, user) {
    var qv = qGetter(q);
    var download = qv("download") === "1";
    if (path === "/api/financeiro/exportar") {
      var e = empresaCtx(qv, user) || DB.empresas[0];
      var rows = ["Tipo;Descrição;Contato;Vencimento;Valor;Saldo;Situação"];
      DB.titulos.forEach(function (t) {
        if (t.empresa_id === e.id) {
          var v = tituloView(t);
          rows.push([v.tipo, v.descricao, v.contato, v.vencimento, moneyStr(v.valor / 100), moneyStr(v.saldo / 100), v.situacao].join(";"));
        }
      });
      return bytesRes("﻿" + rows.join("\r\n"), "text/csv; charset=utf-8", "financeiro.csv");
    }
    if (/\/xml$/.test(path)) return bytesRes(SAMPLE_XML, "application/xml; charset=utf-8", "nota.xml");
    var titulo = "Documento";
    if ((path === "/api/download" || path === "/api/preview") && qv("id")) {
      var doc = DB.documentos.filter(function (x) { return String(x.id) === qv("id"); })[0];
      if (doc) titulo = doc.titulo;
    }
    if (path === "/api/visao/pdf") titulo = "Relatório de faturamento e carga tributária";
    if (path === "/api/download" || path === "/api/visao/pdf" || download) return bytesRes(tinyPdf(titulo), "application/pdf", "documento.pdf");
    // previews: HTML -> app.js shows it in a sandboxed iframe (no pdf.js needed)
    return bytesRes(previewHtml(titulo), "text/html; charset=utf-8");
  }

  function dispatch(method, path, q, body) {
    try {
      return route(method, path, q, body);
    } catch (err) {
      if (W.console) W.console.error("[mock-browser] " + method + " " + path, err);
      return jsonRes({ erro: "Erro interno do mock: " + (err && err.message) }, 500);
    }
  }

  // ================================================================ URL matching
  function apiTarget(raw) {
    var u;
    try { u = new URL(String(raw), W.location.href); } catch (e) { return null; }
    var loc = W.location;
    var same = u.origin === loc.origin || (u.protocol === loc.protocol && u.host === loc.host);
    if (!same) return null;
    var i = u.pathname.indexOf("/api/");
    if (i < 0) return null;
    return { path: u.pathname.slice(i).replace(/\/+$/, ""), query: u.searchParams, url: u };
  }
  function routeUrl(raw, method, body) {
    var t = apiTarget(raw);
    return t ? dispatch(method || "GET", t.path, t.query, body || {}) : null;
  }

  // ================================================================ fetch override
  var origFetch = typeof W.fetch === "function" ? W.fetch.bind(W) : null;

  function headerOf(h, name) {
    if (!h) return "";
    name = name.toLowerCase();
    if (typeof Headers !== "undefined" && h instanceof Headers) return h.get(name) || "";
    if (Array.isArray(h)) { for (var i = 0; i < h.length; i++) if (String(h[i][0]).toLowerCase() === name) return String(h[i][1]); return ""; }
    for (var k in h) if (has(h, k) && k.toLowerCase() === name) return String(h[k]);
    return "";
  }
  function formDataToDict(fd) {
    var out = {};
    fd.forEach(function (v, k) {
      var isFile = typeof Blob !== "undefined" && v instanceof Blob;
      if (isFile) out[k] = v.name ? { filename: v.name, size: v.size } : "";
      else out[k] = String(v);
    });
    return out;
  }
  function parseBodyText(text, ctype) {
    if (ctype.indexOf("application/json") >= 0 || (!ctype && /^\s*[{[]/.test(text))) {
      try { return JSON.parse(text || "{}"); } catch (e) { return {}; }
    }
    return {};
  }
  function toResponse(r) {
    return new Response(r.body, { status: r.status, headers: r.headers });
  }
  function abortError() {
    try { return new DOMException("The operation was aborted.", "AbortError"); } catch (e) { var er = new Error("Aborted"); er.name = "AbortError"; return er; }
  }

  async function mockFetch(input, init, target) {
    init = init || {};
    var isReq = typeof Request !== "undefined" && input instanceof Request;
    var method = String(init.method || (isReq ? input.method : "GET")).toUpperCase();
    var headers = init.headers || (isReq ? input.headers : null);
    var ctype = headerOf(headers, "content-type");
    var signal = init.signal || (isReq ? input.signal : null);
    if (signal && signal.aborted) throw abortError();
    var body = {};
    if (method !== "GET" && method !== "HEAD") {
      var raw = init.body;
      if (raw === undefined && isReq) {
        if (ctype.indexOf("multipart/form-data") >= 0) body = formDataToDict(await input.clone().formData());
        else body = parseBodyText(await input.clone().text(), ctype);
      } else if (typeof FormData !== "undefined" && raw instanceof FormData) {
        body = formDataToDict(raw);
      } else if (typeof raw === "string") {
        body = parseBodyText(raw, ctype);
      } else if (raw && typeof Blob !== "undefined" && raw instanceof Blob) {
        body = parseBodyText(await raw.text(), ctype || raw.type || "");
      }
    }
    await Promise.resolve();
    if (signal && signal.aborted) throw abortError();
    return toResponse(dispatch(method === "HEAD" ? "GET" : method, target.path, target.query, body));
  }

  W.fetch = function (input, init) {
    var raw = typeof Request !== "undefined" && input instanceof Request ? input.url : (input && input.href) || String(input);
    var target = apiTarget(raw);
    if (!target) {
      if (!origFetch) return Promise.reject(new TypeError("fetch unavailable"));
      return origFetch(input, init);
    }
    return mockFetch(input, init, target);
  };

  // ================================================================ downloads, previews, iframes
  function blobOf(r) { return new Blob([r.body], { type: r.headers["Content-Type"] }); }
  function filenameOf(r) {
    var m = /filename="([^"]*)"/.exec(r.headers["Content-Disposition"] || "");
    return m ? m[1] : null;
  }
  function textOf(r) { return typeof r.body === "string" ? r.body : new TextDecoder().decode(r.body); }

  var origOpen = typeof W.open === "function" ? W.open.bind(W) : null;

  // Serves an /api/ URL to the user: attachments are downloaded, the rest opens in a new tab.
  function openApiResponse(r, downloadName, forceTab) {
    var url = URL.createObjectURL(blobOf(r));
    var fname = downloadName || filenameOf(r);
    if ((downloadName !== null && downloadName !== undefined) || (fname && !forceTab)) {
      var a = document.createElement("a");
      a.href = url;
      a.download = fname || "download";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if (origOpen) {
      origOpen(url, "_blank");
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  // URL usable as an <iframe>/<embed> src: HTML -> data: URL (works in sandboxed frames), others -> blob:
  function frameUrlFor(r) {
    var ct = r.headers["Content-Type"] || "";
    if (ct.indexOf("text/html") === 0) return "data:text/html;charset=utf-8," + encodeURIComponent(textOf(r));
    return URL.createObjectURL(blobOf(r));
  }
  function rewriteFrameSrc(v) {
    var r = routeUrl(v, "GET");
    return r ? frameUrlFor(r) : v;
  }

  if (typeof document !== "undefined" && document && typeof document.addEventListener === "function") {
    // anchors: <a href="/api/download?id=..">, <a href="...&download=1">, xml links...
    document.addEventListener("click", function (ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href*="api/"]') : null;
      if (!a) return;
      var r = routeUrl(a.href, "GET");
      if (!r) return;
      ev.preventDefault();
      var dl = a.hasAttribute("download") ? (a.getAttribute("download") || filenameOf(r) || "download") : null;
      openApiResponse(r, dl, false);
    }, true);

    // window.open("/api/...")
    if (origOpen) {
      W.open = function (url) {
        var r = url !== undefined && url !== null ? routeUrl(url, "GET") : null;
        if (!r) return origOpen.apply(W, arguments);
        var blobUrl = r.headers["Content-Disposition"] ? null : URL.createObjectURL(blobOf(r));
        if (!blobUrl) { openApiResponse(r, null, false); return null; }
        setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 60000);
        var args = Array.prototype.slice.call(arguments);
        args[0] = blobUrl;
        return origOpen.apply(W, args);
      };
    }

    // iframe.src = "/api/preview?id=.." (previewCertidao) and <embed src>: rewrite synchronously
    ["HTMLIFrameElement", "HTMLEmbedElement"].forEach(function (cls) {
      var C = W[cls];
      if (!C || !C.prototype) return;
      var desc = Object.getOwnPropertyDescriptor(C.prototype, "src");
      if (!desc || !desc.set) return;
      Object.defineProperty(C.prototype, "src", {
        configurable: true, enumerable: desc.enumerable,
        get: desc.get,
        set: function (v) { desc.set.call(this, rewriteFrameSrc(v)); },
      });
      var origSetAttr = C.prototype.setAttribute;
      C.prototype.setAttribute = function (name, value) {
        if (String(name).toLowerCase() === "src") value = rewriteFrameSrc(value);
        return origSetAttr.call(this, name, value);
      };
    });

    // setAttribute("src") / innerHTML-inserted frames
    if (typeof MutationObserver !== "undefined") {
      var fixFrame = function (node) {
        if (!node || node.nodeType !== 1) return;
        var tag = node.tagName;
        if (tag === "IFRAME" || tag === "EMBED") {
          var src = node.getAttribute("src");
          if (src && src.indexOf("api/") >= 0) {
            var nu = rewriteFrameSrc(src);
            if (nu !== src) node.setAttribute("src", nu);
          }
        }
        if (node.querySelectorAll) Array.prototype.forEach.call(node.querySelectorAll('iframe[src*="api/"],embed[src*="api/"]'), fixFrame);
      };
      var mo = new MutationObserver(function (records) {
        records.forEach(function (rec) {
          if (rec.type === "attributes") fixFrame(rec.target);
          else Array.prototype.forEach.call(rec.addedNodes, fixFrame);
        });
      });
      var startObserver = function () {
        mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
      };
      if (document.documentElement) startObserver();
      else document.addEventListener("DOMContentLoaded", startObserver);
    }
  }

  // ================================================================ public demo API
  W.CE_DEMO = {
    setPerfil: function (p) { savePerfil(p); SESSION = makeUser(loadPerfil()); W.location.reload(); },
    perfil: function () { return loadPerfil(); },
  };
})();
