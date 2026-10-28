/* תמרה – איורי נוף (מוצגים כשאין עדיין תמונות למתחם) */
(function () {
  "use strict";
  const T = window.Tamara;
  /* ---------------------------------------------------------- איורי נוף */
  const hashStr = (s) => {
    let h = 2166136261;
    for (const c of String(s)) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => {
    const A = hex(a), B = hex(b);
    return toHex(A.map((v, i) => v + (B[i] - v) * t));
  };

  const SKIES = {
    dawn: { top: "#B7C6CF", bot: "#F1C7A6", sun: "#FDE7C7", haze: "#D9C3B6", glow: "#F7D3B0", win: "#FFD79A", dark: 0 },
    day: { top: "#93B8CD", bot: "#E1EAE4", sun: "#FFF7E2", haze: "#B8CBC6", glow: "#F4F1DE", win: "#F6E7C4", dark: 0 },
    dusk: { top: "#3F4466", bot: "#E59C6C", sun: "#FFD39A", haze: "#B6857D", glow: "#F2B07E", win: "#FFC970", dark: 0.25 },
    night: { top: "#0F1527", bot: "#323858", sun: "#F1EAD0", haze: "#474B66", glow: "#555B7E", win: "#FFC45E", dark: 0.6 }
  };
  const LANDS = {
    mountain: { ground: "#26331D", layers: [["peaks", 0.5, 0.2], ["peaks", 0.57, 0.15], ["rolling", 0.68, 0.08]], fg: ["rolling", 0.82, 0.05], trees: ["cypress", "round"] },
    hills: { ground: "#33421F", layers: [["rolling", 0.54, 0.1], ["rolling", 0.62, 0.09], ["rolling", 0.72, 0.07]], fg: ["rolling", 0.83, 0.05], trees: ["round", "cypress", "round"] },
    lake: { ground: "#2C3B22", water: 0.63, waterCol: "#5E8C96", layers: [["rolling", 0.5, 0.1], ["rolling", 0.57, 0.06]], fg: ["shore", 0.86, 0.03], trees: ["palm", "round"] },
    desert: { ground: "#6E4426", sand: true, layers: [["mesa", 0.56, 0.12], ["dunes", 0.66, 0.06], ["dunes", 0.75, 0.05]], fg: ["dunes", 0.85, 0.04], trees: ["acacia", "palm"] },
    deadsea: { ground: "#7A5638", sand: true, water: 0.6, waterCol: "#8FC2C2", layers: [["mesa", 0.47, 0.13], ["mesa", 0.53, 0.07]], fg: ["dunes", 0.84, 0.035], trees: ["palm"] },
    redsea: { ground: "#5E3424", sand: true, water: 0.66, waterCol: "#2F9AA0", layers: [["peaks", 0.5, 0.17], ["peaks", 0.57, 0.11]], fg: ["dunes", 0.86, 0.03], trees: ["palm"] },
    oasis: { ground: "#4A3A22", sand: true, layers: [["mesa", 0.52, 0.12], ["dunes", 0.62, 0.07], ["dunes", 0.72, 0.05]], fg: ["dunes", 0.84, 0.035], trees: ["palm"] }
  };

  function ridgeFn(style, base, amp, r, W, H) {
    const p = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];
    const f = [1.2 + r() * 1.2, 2.6 + r() * 2, 5 + r() * 4, 9 + r() * 6];
    const B = base * H, A = amp * H;
    const mesaEdge = 0.25 + r() * 0.5, mesaW = 0.18 + r() * 0.25;
    return (x) => {
      const u = x / W;
      let v;
      if (style === "peaks") {
        v = 0.55 * (1 - Math.abs(Math.sin(u * f[0] * 1.6 + p[0]))) + 0.3 * (1 - Math.abs(Math.sin(u * f[1] * 1.3 + p[1]))) + 0.15 * Math.sin(u * f[3] * 2 + p[3]);
      } else if (style === "mesa") {
        const d = Math.abs(u - mesaEdge);
        const plateau = d < mesaW ? 1 : Math.max(0, 1 - (d - mesaW) * 9);
        v = 0.75 * plateau + 0.12 * Math.sin(u * f[1] + p[1]) + 0.05 * Math.sin(u * f[3] * 2 + p[2]);
      } else if (style === "dunes") {
        v = 0.6 * Math.sin(u * f[0] * 2 + p[0]) * 0.5 + 0.5 * 0.6 + 0.3 * Math.sin(u * f[1] + p[1]) * 0.5 + 0.1 * Math.sin(u * f[2] + p[2]);
      } else if (style === "shore") {
        v = 0.4 + 0.3 * Math.sin(u * f[0] + p[0]) + 0.1 * Math.sin(u * f[2] + p[2]);
      } else {
        v = 0.5 + 0.35 * Math.sin(u * f[0] + p[0]) + 0.15 * Math.sin(u * f[1] + p[1]) + 0.06 * Math.sin(u * f[2] + p[2]);
      }
      return B - A * v;
    };
  }
  function ridgePath(fn, W, H, step) {
    let d = `M0 ${H} L0 ${fn(0).toFixed(1)}`;
    for (let x = step; x <= W + step; x += step) d += ` L${Math.min(x, W)} ${fn(Math.min(x, W)).toFixed(1)}`;
    return d + ` L${W} ${H} Z`;
  }
  function palm(x, y, h, col, r) {
    const lean = (r() - 0.5) * h * 0.35;
    const tx = x + lean, ty = y - h;
    const w = Math.max(2, h * 0.055);
    let s = `<path d="M${x - w / 2} ${y} Q${x + lean * 0.2} ${y - h * 0.5} ${tx - w * 0.35} ${ty} L${tx + w * 0.35} ${ty} Q${x + lean * 0.2 + w} ${y - h * 0.5} ${x + w / 2} ${y} Z" fill="${col}"/>`;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.06 + (0.88 * i) / (n - 1)) + (r() - 0.5) * 0.2;
      const len = h * (0.42 + r() * 0.16);
      const dx = Math.cos(a) * len;
      const ex = tx + dx;
      const ey = ty + len * (0.4 - Math.sin(a) * 0.58);
      const cx = tx + dx * 0.5, cy = ty - len * (0.16 + Math.sin(a) * 0.22);
      const lw = len * 0.12;
      s += `<path d="M${tx} ${ty} Q${cx} ${cy - lw} ${ex} ${ey} Q${cx} ${cy + lw} ${tx} ${ty + 1} Z" fill="${col}"/>`;
    }
    return s;
  }
  function cypress(x, y, h, col) {
    const w = h * 0.16;
    return `<path d="M${x} ${y} Q${x - w * 1.3} ${y - h * 0.45} ${x} ${y - h} Q${x + w * 1.3} ${y - h * 0.45} ${x} ${y} Z" fill="${col}"/>`;
  }
  function roundTree(x, y, h, col, r) {
    const R = h * 0.32;
    let s = `<rect x="${x - h * 0.03}" y="${y - h * 0.45}" width="${h * 0.06}" height="${h * 0.45}" fill="${col}"/>`;
    s += `<circle cx="${x}" cy="${y - h * 0.62}" r="${R}" fill="${col}"/>`;
    s += `<circle cx="${x - R * 0.7}" cy="${y - h * 0.5}" r="${R * 0.72}" fill="${col}"/>`;
    s += `<circle cx="${x + R * 0.75}" cy="${y - h * 0.52}" r="${R * (0.6 + r() * 0.2)}" fill="${col}"/>`;
    return s;
  }
  function acacia(x, y, h, col) {
    return `<path d="M${x - 1.5} ${y} L${x - 1} ${y - h * 0.6} L${x - h * 0.25} ${y - h * 0.82} M${x + 1} ${y - h * 0.6} L${x + h * 0.2} ${y - h * 0.8}" stroke="${col}" stroke-width="${Math.max(1.5, h * 0.05)}" fill="none" stroke-linecap="round"/><ellipse cx="${x}" cy="${y - h * 0.86}" rx="${h * 0.62}" ry="${h * 0.13}" fill="${col}"/>`;
  }
  function building(kind, x, y, s, col, win, pool, r) {
    let g = "";
    const W = (n) => (n * s).toFixed(1);
    if (kind === "villa" || kind === "suite") {
      const bw = kind === "villa" ? 130 : 84, bh = kind === "villa" ? 40 : 34;
      const x0 = x - (bw * s) / 2;
      g += `<rect x="${x0}" y="${y - bh * s}" width="${W(bw)}" height="${W(bh + 6)}" fill="${col}"/>`;
      g += `<rect x="${x0 - 6 * s}" y="${y - bh * s - 3 * s}" width="${W(bw + 12)}" height="${W(4)}" fill="${col}"/>`;
      for (let i = 0; i < (kind === "villa" ? 4 : 2); i++) g += `<rect x="${x0 + (10 + i * 29) * s}" y="${y - (bh - 9) * s}" width="${W(22)}" height="${W(bh - 14)}" fill="${win}"/>`;
      if (kind === "villa") {
        const ux = x0 + 18 * s;
        g += `<rect x="${ux}" y="${y - (bh + 32) * s}" width="${W(78)}" height="${W(30)}" fill="${col}"/>`;
        g += `<rect x="${ux - 5 * s}" y="${y - (bh + 35) * s}" width="${W(88)}" height="${W(4)}" fill="${col}"/>`;
        g += `<rect x="${ux + 9 * s}" y="${y - (bh + 25) * s}" width="${W(40)}" height="${W(17)}" fill="${win}"/>`;
      }
      if (pool) g += `<rect x="${x0 - 10 * s}" y="${y + 3 * s}" width="${W(bw * 0.8)}" height="${W(7)}" rx="${W(2)}" fill="#7CC6CC"/>`;
    } else if (kind === "cabin") {
      g += `<path d="M${x - 34 * s} ${y + 4 * s} L${x} ${y - 58 * s} L${x + 34 * s} ${y + 4 * s} Z" fill="${col}"/>`;
      g += `<path d="M${x - 14 * s} ${y + 2 * s} L${x} ${y - 25 * s} L${x + 14 * s} ${y + 2 * s} Z" fill="${win}"/>`;
    } else if (kind === "compound") {
      for (let i = -1; i <= 1; i++) {
        const cx = x + i * 46 * s, sc = i === 0 ? 1 : 0.8;
        g += `<path d="M${cx - 22 * s * sc} ${y + 3 * s} L${cx} ${y - 38 * s * sc} L${cx + 22 * s * sc} ${y + 3 * s} Z" fill="${col}"/>`;
        g += `<rect x="${cx - 5 * s * sc}" y="${y - 12 * s * sc}" width="${W(10 * sc)}" height="${W(13 * sc)}" fill="${win}"/>`;
      }
    } else {
      const bw = 70, bh = 30;
      const x0 = x - (bw * s) / 2;
      g += `<rect x="${x0}" y="${y - bh * s}" width="${W(bw)}" height="${W(bh + 6)}" fill="${col}"/>`;
      g += `<path d="M${x0 - 7 * s} ${y - bh * s + 1} L${x} ${y - (bh + 26) * s} L${x0 + (bw + 7) * s} ${y - bh * s + 1} Z" fill="${col}"/>`;
      g += `<rect x="${x0 + 50 * s}" y="${y - (bh + 22) * s}" width="${W(7)}" height="${W(14)}" fill="${col}"/>`;
      g += `<rect x="${x0 + 10 * s}" y="${y - (bh - 8) * s}" width="${W(16)}" height="${W(14)}" fill="${win}"/>`;
      g += `<rect x="${x0 + 40 * s}" y="${y - (bh - 8) * s}" width="${W(16)}" height="${W(14)}" fill="${win}"/>`;
    }
    return g;
  }

  const sceneCache = new Map();
  /* opts: {land, time, building, pool, seed, w, h, empty} */
  T.scene = (opts) => {
    const key = JSON.stringify(opts);
    if (sceneCache.has(key)) return sceneCache.get(key);
    const W = opts.w || 800, H = opts.h || 600;
    const r = rng(hashStr(opts.seed || key));
    const land = LANDS[opts.land] || LANDS.hills;
    const sky = SKIES[opts.time] || SKIES.day;
    const uid = "s" + hashStr(key).toString(36);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`;
    s += `<defs><linearGradient id="${uid}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.top}"/><stop offset="0.75" stop-color="${sky.bot}"/></linearGradient>`;
    s += `<radialGradient id="${uid}g"><stop offset="0" stop-color="${sky.glow}" stop-opacity="0.85"/><stop offset="1" stop-color="${sky.glow}" stop-opacity="0"/></radialGradient>`;
    if (land.water) s += `<linearGradient id="${uid}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(land.waterCol, sky.bot, 0.35)}"/><stop offset="1" stop-color="${mix(land.waterCol, "#0b1a22", 0.35 + sky.dark * 0.5)}"/></linearGradient>`;
    s += `</defs><rect width="${W}" height="${H}" fill="url(#${uid}k)"/>`;
    if (opts.time === "night") {
      for (let i = 0; i < 70; i++) s += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H * 0.5).toFixed(0)}" r="${(0.5 + r() * 1.1).toFixed(1)}" fill="#fff" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
    }
    const sunX = W * (0.18 + r() * 0.64);
    const sunY = H * ({ dawn: 0.44, day: 0.2, dusk: 0.42, night: 0.2 }[opts.time] || 0.3);
    const sunR = H * (opts.time === "day" ? 0.05 : 0.065);
    s += `<circle cx="${sunX}" cy="${sunY}" r="${sunR * 4}" fill="url(#${uid}g)"/><circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="${sky.sun}"/>`;
    const n = land.layers.length + 1;
    const groundNight = mix(land.ground, "#0d1018", sky.dark * 0.55);
    land.layers.forEach((L, i) => {
      const fn = ridgeFn(L[0], L[1], L[2], r, W, H);
      const t = 0.18 + (0.62 * i) / (n - 1);
      const col = land.sand ? mix(mix(sky.haze, "#C79A6B", 0.45), groundNight, t) : mix(sky.haze, groundNight, t);
      s += `<path d="${ridgePath(fn, W, H, 10)}" fill="${col}"/>`;
    });
    if (land.water) {
      const wy = land.water * H;
      s += `<rect x="0" y="${wy}" width="${W}" height="${H - wy}" fill="url(#${uid}w)"/>`;
      for (let i = 0; i < 9; i++) {
        const ly = wy + 6 + i * (H - wy) * 0.06;
        const lw = W * (0.04 + r() * 0.12) * (1 - i * 0.06);
        s += `<rect x="${sunX - lw / 2 + (r() - 0.5) * 20}" y="${ly}" width="${lw}" height="1.6" rx="0.8" fill="${sky.sun}" opacity="${(0.5 - i * 0.04).toFixed(2)}"/>`;
      }
    }
    const fgFn = ridgeFn(land.fg[0], land.fg[1], land.fg[2], r, W, H);
    const fgCol = groundNight;
    const treeCol = mix(fgCol, "#05080a", 0.25);
    /* trees behind building */
    const bx = opts.bx != null ? W * opts.bx : W * (0.3 + r() * 0.4);
    const placeTree = (x, scale) => {
      const y = fgFn(x) + 4;
      const kind = land.trees[Math.floor(r() * land.trees.length)];
      const h = H * (0.12 + r() * 0.1) * scale;
      if (kind === "palm") return palm(x, y, h * 1.5, treeCol, r);
      if (kind === "cypress") return cypress(x, y, h * 1.3, treeCol);
      if (kind === "acacia") return acacia(x, y, h * 0.9, treeCol);
      return roundTree(x, y, h, treeCol, r);
    };
    s += `<path d="${ridgePath(fgFn, W, H, 10)}" fill="${fgCol}"/>`;
    if (!opts.empty) {
      const bkind = opts.building || "zimmer";
      const by = fgFn(bx) + 6;
      const bscale = (W / 800) * (opts.bscale || 1.7);
      s += building(bkind, bx, by, bscale, mix(fgCol, "#000", 0.18), sky.win, opts.pool, r);
    }
    const treeCount = opts.trees != null ? opts.trees : 3 + Math.floor(r() * 4);
    for (let i = 0; i < treeCount; i++) {
      let x = r() * W;
      if (!opts.empty && Math.abs(x - bx) < W * 0.12) x = (x + W * 0.3) % W;
      s += placeTree(x, 0.8 + r() * 0.5);
    }
    if (opts.palmsCluster) {
      [[0.08, 1.25], [0.15, 1], [0.86, 1.15], [0.93, 0.9]].forEach(([u, k]) => {
        const x = W * u;
        s += palm(x, fgFn(x) + 4, H * 0.3 * k, treeCol, r);
      });
    }
    s += `</svg>`;
    const uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
    sceneCache.set(key, uri);
    return uri;
  };

  const TIMES = ["dusk", "dawn", "day", "dusk", "night", "day"];
  T.listingScene = (l, i) => {
    const reg = T.regionOf(l.region);
    const hasPool = (l.amenities || []).some((a) => a === "private_pool" || a === "heated_pool");
    const seed = (l.id || l.name || "x") + ":" + (i || 0);
    const time = i ? TIMES[(hashStr(seed) + i) % TIMES.length] : TIMES[hashStr(l.id || l.name || "") % TIMES.length];
    return T.scene({ land: reg.land, time, building: l.type, pool: hasPool, seed, bscale: i % 2 ? 2.3 : 1.75 });
  };
  T.regionScene = (key) => {
    const reg = T.regionOf(key);
    return T.scene({ land: reg.land, time: reg.time, seed: "region-" + key, building: "zimmer", bscale: 1.2, trees: 5 });
  };

})();
