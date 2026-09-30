// ===== Ambient background =====
// One full-screen canvas behind everything: slow falling petals in light
// mode, twinkling stars in dark mode. Pauses when the tab is hidden and
// draws nothing when the user prefers reduced motion.
(function () {
    const canvas = document.querySelector('.ambient-canvas');
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    let width = 0;
    let height = 0;
    let items = [];
    let rafId = null;
    let lastTime = 0;
    let offsetY = 0;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function makePetal(anywhere) {
        return {
            x: rand(0, width),
            y: anywhere ? rand(0, height) : rand(-40, -10),
            size: rand(5, 10),
            depth: rand(0.4, 1),
            fall: rand(14, 30),
            sway: rand(12, 30),
            phase: rand(0, Math.PI * 2),
            spin: rand(-0.8, 0.8),
            angle: rand(0, Math.PI * 2),
            flip: rand(0, Math.PI * 2),
            alpha: rand(0.25, 0.55)
        };
    }

    function makeStar() {
        return {
            x: rand(0, width),
            y: rand(0, height),
            size: rand(0.6, 1.8),
            depth: rand(0.2, 1),
            phase: rand(0, Math.PI * 2),
            speed: rand(0.6, 1.8),
            alpha: rand(0.35, 0.9)
        };
    }

    function seed() {
        const area = width * height;
        if (darkQuery.matches) {
            const count = Math.round(Math.min(90, Math.max(40, area / 14000)));
            items = Array.from({ length: count }, makeStar);
        } else {
            const count = Math.round(Math.min(28, Math.max(12, area / 40000)));
            items = Array.from({ length: count }, () => makePetal(true));
        }
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        seed();
    }

    function wrapY(y) {
        const span = height + 40;
        return ((((y + 20) % span) + span) % span) - 20;
    }

    function drawPetal(p) {
        const y = wrapY(p.y + offsetY * p.depth);
        ctx.save();
        ctx.translate(p.x + Math.sin(p.phase) * p.sway, y);
        ctx.rotate(p.angle);
        ctx.scale(1, 0.35 + Math.abs(Math.cos(p.flip)) * 0.65);
        ctx.globalAlpha = p.alpha * p.depth;
        ctx.fillStyle = '#ff8fb1';
        const r = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(r, -r * 0.2, 0, r);
        ctx.quadraticCurveTo(-r, -r * 0.2, 0, -r);
        ctx.fill();
        ctx.restore();
    }

    function drawStar(s, time) {
        const y = wrapY(s.y + offsetY * s.depth);
        const twinkle = 0.55 + 0.45 * Math.sin(s.phase + time * 0.001 * s.speed);
        ctx.globalAlpha = s.alpha * twinkle;
        ctx.fillStyle = '#fff4f8';
        ctx.beginPath();
        ctx.arc(s.x, y, s.size, 0, Math.PI * 2);
        ctx.fill();
    }

    function frame(time) {
        const dt = Math.min(0.05, (time - (lastTime || time)) / 1000);
        lastTime = time;
        ctx.clearRect(0, 0, width, height);

        if (darkQuery.matches) {
            items.forEach((s) => drawStar(s, time));
        } else {
            items.forEach((p) => {
                p.y += p.fall * p.depth * dt;
                p.phase += dt * 0.8;
                p.angle += p.spin * dt;
                p.flip += dt * 1.6;
                if (p.y > height + 20) Object.assign(p, makePetal(false));
                drawPetal(p);
            });
        }
        ctx.globalAlpha = 1;
        rafId = window.requestAnimationFrame(frame);
    }

    function start() {
        if (rafId || reducedQuery.matches || document.hidden) return;
        lastTime = 0;
        rafId = window.requestAnimationFrame(frame);
    }

    function stop() {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = null;
    }

    function refresh() {
        stop();
        resize();
        if (reducedQuery.matches) {
            ctx.clearRect(0, 0, width, height);
            return;
        }
        start();
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(refresh, 150);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
    });
    reducedQuery.addEventListener('change', refresh);
    darkQuery.addEventListener('change', refresh);

    // The firework camera shifts the sky; deeper items move more (parallax).
    window.Ambient = {
        setOffset(y) {
            offsetY = y;
        }
    };

    refresh();
})();
