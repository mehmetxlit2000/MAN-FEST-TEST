(function () {
    const cvs = document.getElementById('q-stars');
    if (!cvs) return;
    const box = cvs.parentElement;
    const ctx = cvs.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W, H, dpr, stars = [], shooters = [], mx = 0, my = 0, tx = 0, ty = 0;

    const DEPTH = [3, 7, 12], SPEED = [0.03, 0.06, 0.1];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const mix = (a, b, t) => Math.round(a + (b - a) * t);

    function resize() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        W = box.clientWidth;
        H = box.clientHeight;
        cvs.width = W * dpr;
        cvs.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const n = Math.round(80 * Math.max(0.6, W / 1280));
        stars = [];
        for (let i = 0; i < n; i++) {
            const b = Math.pow(Math.random(), 2.8); // Dağılımı biraz daha dengeli yaptık
            const layer = b < 0.2 ? 0 : b < 0.55 ? 1 : 2;

            // Kırmızı / Canlı Kızıl palet (Daha yüksek renk yoğunluğu)
            const rChannel = mix(180, 255, b);
            const gChannel = mix(15, 60, b);
            const bChannel = mix(30, 80, b);

            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                layer,
                b,
                r: 0.45 + b * 1.3, // Biraz daha büyük yarıçap
                // Opaklık tabanını yukarı çektik (Daha belirgin)
                base: 0.45 + 0.55 * Math.pow(b, 0.5),
                tw: rnd(0.3, 1.1),
                ph: Math.random() * 6.28,
                col: `${rChannel},${gChannel},${bChannel}`
            });
        }
    }

    function spawnShooter() {
        const fromLeft = Math.random() < 0.5;
        shooters.push({
            x: fromLeft ? rnd(-50, W * 0.3) : rnd(W * 0.7, W + 50),
            y: rnd(-20, H * 0.4),
            vx: (fromLeft ? 1 : -1) * rnd(9, 15),
            vy: rnd(2.2, 4.2),
            life: 1,
            length: rnd(70, 130)
        });
    }

    let last = 0, nextShot = 3500;
    function frame(t) {
        const dt = Math.min(t - last, 50);
        last = t;

        mx += (tx - mx) * 0.04;
        my += (ty - my) * 0.04;
        ctx.clearRect(0, 0, W, H);

        // Yıldızları çiz
        for (const s of stars) {
            if (!reduce) {
                s.x -= SPEED[s.layer] * dt * 0.06;
                if (s.x < -10) s.x = W + 10;
            }
            const x = s.x + mx * DEPTH[s.layer];
            const y = s.y + my * DEPTH[s.layer];
            const tw = reduce ? 1 : 0.75 + 0.25 * Math.sin(t / 900 * s.tw * 2 + s.ph);
            const a = Math.min(1, s.base * tw * 1.2); // Opaklık çarpanı artırıldı

            if (s.b > 0.45) { // Parlama eşiği aşağı çekildi, daha fazla yıldız ışık saçıyor
                const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 4.5);
                g.addColorStop(0, 'rgba(' + s.col + ',' + (0.45 * a) + ')');
                g.addColorStop(1, 'rgba(' + s.col + ',0)');
                ctx.globalAlpha = 1;
                ctx.fillStyle = g;
                ctx.fillRect(x - s.r * 4.5, y - s.r * 4.5, s.r * 9, s.r * 9);
            }

            ctx.globalAlpha = a;
            ctx.fillStyle = 'rgb(' + s.col + ')';
            ctx.beginPath();
            ctx.arc(x, y, s.r, 0, 6.283);
            ctx.fill();
        }

        // Kayar yıldızlar (Çok daha belirgin ve net)
        if (!reduce) {
            nextShot -= dt;
            if (nextShot <= 0) {
                spawnShooter();
                nextShot = rnd(4500, 10000);
            }

            for (let i = shooters.length - 1; i >= 0; i--) {
                const m = shooters[i];
                m.x += m.vx;
                m.y += m.vy;
                m.life -= 0.014;

                if (m.life <= 0 || m.x > W + 100 || m.x < -100) {
                    shooters.splice(i, 1);
                    continue;
                }

                const ex = m.x - m.vx * 7;
                const ey = m.y - m.vy * 7;
                const g = ctx.createLinearGradient(m.x, m.y, ex, ey);

                g.addColorStop(0, 'rgba(255,80,110,' + (1.0 * m.life) + ')');
                g.addColorStop(1, 'rgba(136,2,22,0)');

                ctx.globalAlpha = 1;
                ctx.strokeStyle = g;
                ctx.lineWidth = 1.6; // Çizgi kalınlığı artırıldı
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(m.x, m.y);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        requestAnimationFrame(frame);
    }

    box.addEventListener('pointermove', e => {
        const r = box.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
    });

    box.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    addEventListener('resize', resize);

    resize();
    requestAnimationFrame(frame);
})();