(() => {
    const canvas = document.getElementById('bg');
    const cur = document.getElementById('cur');
    const ctx = canvas.getContext('2d', { alpha: false });

    const TAU = Math.PI * 2;
    const LINK = 88, LINK2 = LINK * LINK;
    const M_RADIUS = 180, M2 = M_RADIUS * M_RADIUS;
    const BUCKETS = 7, MAX_AL = .55;
    const PAR = 22;
    const FRAME_MIN = 13;                       // ~60 FPS üst sınırı (120/144Hz ekranlarda gereksiz yükü keser)

    const coarse = matchMedia('(pointer: coarse)').matches;
    const MAX_NODES = coarse ? 100 : 240;       // mobilde daha az düğüm
    const DENSITY = coarse ? 11000 : 7500;      // piksel başına düğüm yoğunluğu
    const MAX_PULSES = coarse ? 25 : 40;

    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false };
    const par = { x: 0, y: 0 };
    let nodes = [], pulses = [], waves = [];
    let W = 0, H = 0, cols = 0, rows = 0;
    let head = new Int32Array(1), next = new Int32Array(MAX_NODES);
    let quality = 1;                            // performans düşerse otomatik azalır
    const buckets = Array.from({ length: BUCKETS }, () => []);

    function makeNode() {
        const z = .5 + Math.random() * .5;
        return {
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - .5) * .26 * z, vy: (Math.random() - .5) * .26 * z,
            z, r: (.55 + Math.random() * .55) * (.6 + z * .4),
            e: 0, cool: 0, nb: [], px: 0, py: 0, cx: 0, cy: 0
        };
    }

    function targetCount() {
        return Math.max(30, Math.min(Math.floor((W * H) / DENSITY * quality), MAX_NODES));
    }

    function resize() {
        const oldW = W, oldH = H;
        const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);
        W = window.innerWidth; H = window.innerHeight;
        const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
        if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);     // CSS boyutu %100, sadece iç çözünürlük ayarlanır

        // Düğümleri sıfırlamak yerine yeni boyuta ölçekle (yeniden boyutlandırmada sıçrama olmaz)
        if (oldW && oldH) {
            const sx = W / oldW, sy = H / oldH;
            for (const p of nodes) { p.x *= sx; p.y *= sy; }
        }
        const target = targetCount();
        if (nodes.length > target) nodes.length = target;
        while (nodes.length < target) nodes.push(makeNode());

        cols = Math.ceil(W / LINK) + 1; rows = Math.ceil(H / LINK) + 1;
        if (head.length < cols * rows) head = new Int32Array(cols * rows);
    }

    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); }, { passive: true });

    function setMouse(x, y) {
        if (mouse.sx === -9999) { mouse.sx = x; mouse.sy = y; }
        mouse.x = x; mouse.y = y; mouse.active = true;
        cur.style.transform = `translate3d(${x - 20}px,${y - 20}px,0)`;
        cur.style.opacity = 1;
    }
    addEventListener('mousemove', e => setMouse(e.clientX, e.clientY), { passive: true });
    addEventListener('touchmove', e => setMouse(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    addEventListener('touchend', () => { mouse.active = false; }, { passive: true });
    document.addEventListener('mouseleave', () => { mouse.active = false; cur.style.opacity = 0; });
    addEventListener('mousedown', e => { if (waves.length < 6) waves.push({ x: e.clientX, y: e.clientY, r: 0, a: 1 }); });

    function fire(n) {
        n.e = 0; n.cool = 50;
        const k = Math.min(n.nb.length, 2);
        for (let i = 0; i < k && pulses.length < MAX_PULSES; i++) {
            pulses.push({ a: n, b: n.nb[(Math.random() * n.nb.length) | 0], t: 0, sp: .02 + Math.random() * .016 });
        }
    }

    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        mouse.sx += (mouse.x - mouse.sx) * .2;
        mouse.sy += (mouse.y - mouse.sy) * .2;
        const msx = mouse.sx, msy = mouse.sy, act = mouse.active;
        par.x += ((act ? msx / W - .5 : 0) - par.x) * .05;
        par.y += ((act ? msy / H - .5 : 0) - par.y) * .05;
        const n = nodes.length, wn = waves.length;

        // --- düğümleri güncelle ---
        for (let i = 0; i < n; i++) {
            const p = nodes[i];
            p.nb.length = 0;
            p.x += p.vx; p.y += p.vy;
            if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
            if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
            p.px = p.x - par.x * PAR * p.z;
            p.py = p.y - par.y * PAR * p.z;

            if (act) {
                const dx = msx - p.px, dy = msy - p.py, d2 = dx * dx + dy * dy;
                if (d2 < M2 && d2 > 1) {
                    const d = Math.sqrt(d2), f = 1 - d / M_RADIUS, dir = d < 50 ? -1 : 1;
                    p.x += dx / d * f * 1.1 * dir;
                    p.y += dy / d * f * 1.1 * dir;
                    p.e += f * f * .02;
                }
            }
            // dalga kontrolü: karekök yerine kare mesafe karşılaştırması
            for (let k = 0; k < wn; k++) {
                const w = waves[k], dx = p.px - w.x, dy = p.py - w.y, d2 = dx * dx + dy * dy;
                const lo = w.r - 24, hi = w.r + 24;
                if (d2 < hi * hi && (lo <= 0 || d2 > lo * lo)) p.e += .35 * w.a;
            }
            if (Math.random() < .00012) p.e += 1.1;
            if (p.cool > 0) p.cool--;
            p.e *= .955;
        }
        for (let i = wn - 1; i >= 0; i--) {
            waves[i].r += 8; waves[i].a -= .02;
            if (waves[i].a <= 0) waves.splice(i, 1);
        }

        // --- ızgara ---
        head.fill(-1, 0, cols * rows);
        for (let i = 0; i < n; i++) {
            const p = nodes[i];
            p.cx = Math.min(cols - 1, Math.max(0, p.px / LINK | 0));
            p.cy = Math.min(rows - 1, Math.max(0, p.py / LINK | 0));
            const cell = p.cy * cols + p.cx;
            next[i] = head[cell]; head[cell] = i;
        }

        // --- bağlantılar (alfa gruplarına ayrılıp toplu çizilir) ---
        for (let b = 0; b < BUCKETS; b++) buckets[b].length = 0;
        for (let i = 0; i < n; i++) {
            const a = nodes[i];
            for (let oy = -1; oy <= 1; oy++) {
                const y = a.cy + oy; if (y < 0 || y >= rows) continue;
                for (let ox = -1; ox <= 1; ox++) {
                    const x = a.cx + ox; if (x < 0 || x >= cols) continue;
                    for (let j = head[y * cols + x]; j !== -1; j = next[j]) {
                        if (j <= i) continue;
                        const b = nodes[j];
                        const dx = a.px - b.px, dy = a.py - b.py, d2 = dx * dx + dy * dy;
                        if (d2 >= LINK2) continue;
                        if (a.nb.length < 8) a.nb.push(b);
                        if (b.nb.length < 8) b.nb.push(a);
                        // karekök yok: kare mesafe oranı kullanılıyor
                        let al = (1 - d2 / LINK2) * .2 * Math.min(a.z, b.z) + (a.e + b.e) * .14;
                        if (act) {
                            const mx = (a.px + b.px) * .5 - msx, my = (a.py + b.py) * .5 - msy, m2 = mx * mx + my * my;
                            if (m2 < M2) al += (1 - m2 / M2) * .26;
                        }
                        const idx = Math.min(BUCKETS - 1, (al / MAX_AL * BUCKETS) | 0);
                        buckets[idx].push(a.px, a.py, b.px, b.py);
                    }
                }
            }
        }
        ctx.lineWidth = .6;
        for (let b = 0; b < BUCKETS; b++) {
            const arr = buckets[b]; if (!arr.length) continue;
            ctx.strokeStyle = `rgba(255,32,52,${((b + .5) / BUCKETS * MAX_AL).toFixed(3)})`;
            ctx.beginPath();
            for (let k = 0; k < arr.length; k += 4) { ctx.moveTo(arr[k], arr[k + 1]); ctx.lineTo(arr[k + 2], arr[k + 3]); }
            ctx.stroke();
        }

        // --- ateşleme ---
        for (let i = 0; i < n; i++) {
            const p = nodes[i];
            if (p.e >= 1 && p.cool === 0) { if (p.nb.length) fire(p); else p.e = 0; }
        }

        // --- sinyaller ---
        ctx.lineWidth = 1;
        for (let i = pulses.length - 1; i >= 0; i--) {
            const p = pulses[i];
            p.t += p.sp;
            if (p.t >= 1) {
                if (p.b.cool === 0) p.b.e += .7;
                pulses.splice(i, 1); continue;
            }
            const ax = p.a.px, ay = p.a.py, bx = p.b.px, by = p.b.py;
            const hx = ax + (bx - ax) * p.t, hy = ay + (by - ay) * p.t;
            const t0 = Math.max(0, p.t - .2);
            ctx.strokeStyle = 'rgba(255,60,78,.6)';
            ctx.beginPath(); ctx.moveTo(ax + (bx - ax) * t0, ay + (by - ay) * t0); ctx.lineTo(hx, hy); ctx.stroke();
            ctx.fillStyle = 'rgba(255,110,120,.9)';
            ctx.beginPath(); ctx.arc(hx, hy, 1.4, 0, TAU); ctx.fill();
        }

        // --- düğümler: iki toplu çizim ---
        ctx.fillStyle = 'rgba(255,50,66,.65)';
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const p = nodes[i];
            if (p.e > .12) continue;
            const r = p.r * (p.nb.length >= 5 ? 1.3 : 1);
            ctx.moveTo(p.px + r, p.py); ctx.arc(p.px, p.py, r, 0, TAU);
        }
        ctx.fill();
        ctx.fillStyle = 'rgba(255,110,122,.95)';
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const p = nodes[i];
            if (p.e <= .12) continue;
            const r = p.r * (1.3 + Math.min(p.e, 1.2) * .5);
            ctx.moveTo(p.px + r, p.py); ctx.arc(p.px, p.py, r, 0, TAU);
        }
        ctx.fill();
    }

    // --- döngü: FPS sınırı + otomatik kalite ayarı + sekme gizliyken durma ---
    let last = 0, raf = 0, workSum = 0, workFrames = 0;
    function loop(t) {
        raf = requestAnimationFrame(loop);
        if (t - last < FRAME_MIN) return;
        last = t;
        const t0 = performance.now();
        draw();
        workSum += performance.now() - t0;
        if (++workFrames === 60) {
            const avg = workSum / workFrames;
            workSum = 0; workFrames = 0;
            // Kare başına çizim maliyeti yüksekse düğüm sayısını kademeli azalt
            if (avg > 8 && quality > .4) {
                quality *= .85;
                const target = targetCount();
                if (nodes.length > target) nodes.length = target;
            }
        }
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { cancelAnimationFrame(raf); raf = 0; }
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

    resize();
    start();
})();