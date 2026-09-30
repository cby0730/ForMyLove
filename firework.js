// ===== Firework easter egg =====
// A golden kamuro shell (錦冠菊). The camera follows the rising shell up
// into a night sky, both hold still at the apex, then the shell bursts into
// a full sphere whose sparks droop like willow branches while the camera
// pulls back to fit the whole ring. Finally the camera sinks back down to
// the heart. script.js drives it through window.Firework.
(function () {
    const canvas = document.querySelector('.firework-canvas');
    const sky = document.querySelector('.night-sky');
    const messageEl = document.querySelector('.firework-message');
    if (!canvas || !sky || !messageEl || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const trail = document.createElement('canvas');
    const trailCtx = trail.getContext('2d');

    // Seconds from the moment the long-press completes.
    const T = {
        rocket: 0.2,
        launch: 0.3,
        ascent: 1.8,
        hang: 0.4,
        droop: 3,
        back: 2.5
    };
    T.burst = T.launch + T.ascent + T.hang;
    T.end = T.burst + T.droop + T.back;

    const SPARK_DRAG = 2.5;
    const TRAIL_HALF_LIFE = 0.3;
    const SIM_STEP = 1 / 60;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let audio = null;
    let run = null;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function clamp01(v) {
        return Math.min(1, Math.max(0, v));
    }

    function sizeCanvases() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        [canvas, trail].forEach((c) => {
            c.width = Math.round(width * dpr);
            c.height = Math.round(height * dpr);
        });
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Evenly spread points on a sphere, projected flat: a crisp outer ring
    // that fills in toward the middle, like a real round shell seen head-on.
    function spherePoints(n) {
        const points = [];
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < n; i += 1) {
            const y = 1 - (i / (n - 1)) * 2;
            const r = Math.sqrt(1 - y * y);
            const theta = golden * i;
            points.push({ x: Math.cos(theta) * r, y });
        }
        return points;
    }

    function makeStars(count, top, bottom) {
        return Array.from({ length: count }, () => ({
            x: rand(0, width),
            y: rand(top, bottom),
            size: rand(0.5, 1.6),
            phase: rand(0, Math.PI * 2),
            speed: rand(0.8, 2)
        }));
    }

    // ===== Sound (synthesised, no files) =====
    function primeAudio() {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!audio) {
            try {
                audio = new AC();
            } catch (e) {
                audio = null;
                return;
            }
        }
        if (audio.state === 'suspended') audio.resume().catch(() => {});
    }

    function noiseBuffer(ac, seconds) {
        const length = Math.floor(ac.sampleRate * seconds);
        const buffer = ac.createBuffer(1, length, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        return buffer;
    }

    function playWhistle(out, t, dur) {
        const ac = out.context;
        const osc = ac.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, t);
        osc.frequency.exponentialRampToValueAtTime(1500, t + dur * 0.9);
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.05, t + 0.15);
        gain.gain.setValueAtTime(0.05, t + dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }

    function playBoom(out, t) {
        const ac = out.context;
        const noise = ac.createBufferSource();
        noise.buffer = noiseBuffer(ac, 2);
        const low = ac.createBiquadFilter();
        low.type = 'lowpass';
        low.frequency.setValueAtTime(900, t);
        low.frequency.exponentialRampToValueAtTime(180, t + 1.2);
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        noise.connect(low).connect(gain).connect(out);
        noise.start(t);
        noise.stop(t + 2);

        const thump = ac.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(70, t);
        thump.frequency.exponentialRampToValueAtTime(35, t + 0.6);
        const thumpGain = ac.createGain();
        thumpGain.gain.setValueAtTime(0.7, t);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        thump.connect(thumpGain).connect(out);
        thump.start(t);
        thump.stop(t + 0.75);
    }

    // The soft sizzle of kamuro sparks burning out.
    function playCrackle(out, t, dur) {
        const ac = out.context;
        const noise = ac.createBufferSource();
        noise.buffer = noiseBuffer(ac, dur);
        const high = ac.createBiquadFilter();
        high.type = 'highpass';
        high.frequency.value = 3500;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0, t);
        const times = Array.from({ length: 70 }, () => t + Math.random() * dur).sort((a, b) => a - b);
        times.forEach((tt, i) => {
            const fade = 1 - i / times.length;
            gain.gain.setValueAtTime(0.14 * fade * Math.random(), tt);
            gain.gain.setValueAtTime(0, tt + 0.012);
        });
        noise.connect(high).connect(gain).connect(out);
        noise.start(t);
        noise.stop(t + dur);
    }

    function scheduleSound(r) {
        if (!audio || audio.state !== 'running') return;
        const out = audio.createGain();
        out.gain.value = 0.35;
        out.connect(audio.destination);
        r.out = out;
        const now = audio.currentTime;
        playWhistle(out, now + T.launch, T.ascent);
        playBoom(out, now + T.burst + 0.08);
        playCrackle(out, now + T.burst + 0.7, 2.2);
    }

    // ===== Message =====
    // One element per line; each line glows in whole rather than per character.
    function buildMessage(lines) {
        messageEl.innerHTML = '';
        const rows = lines.map((line) => {
            const row = document.createElement('div');
            row.className = 'firework-line';
            if (line.lang) row.lang = line.lang;
            row.textContent = line.text;
            messageEl.appendChild(row);
            return row;
        });
        return rows;
    }

    // ===== Drawing =====
    function drawStars(r, time, alpha) {
        if (alpha <= 0) return;
        const shift = r.state.camY * 0.3;
        ctx.fillStyle = '#fff6ea';
        r.stars.forEach((s) => {
            const y = s.y + shift;
            if (y < -4 || y > height + 4) return;
            ctx.globalAlpha = alpha * (0.45 + 0.55 * Math.abs(Math.sin(s.phase + time * s.speed)));
            ctx.beginPath();
            ctx.arc(s.x, y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    function drawRocket(r) {
        const st = r.state;
        if (st.rocketOn <= 0) return;
        ctx.globalCompositeOperation = 'lighter';
        const pts = r.rocketTrail;
        for (let i = 1; i < pts.length; i += 1) {
            const a = pts[i - 1];
            const b = pts[i];
            ctx.strokeStyle = `rgba(255, 190, 110, ${(i / pts.length) * 0.55 * st.rocketOn})`;
            ctx.lineWidth = 1 + (i / pts.length) * 1.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y + st.camY);
            ctx.lineTo(b.x, b.y + st.camY);
            ctx.stroke();
        }
        const head = { x: st.rocketX, y: st.rocketY + st.camY };
        const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 10);
        glow.addColorStop(0, `rgba(255, 245, 220, ${st.rocketOn})`);
        glow.addColorStop(1, 'rgba(255, 180, 90, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    function sparkColor(p) {
        // Pale gold at the burst, deepening to amber as it burns out.
        const r = 255;
        const g = Math.round(236 - 90 * p);
        const b = Math.round(190 - 150 * p);
        return `${r}, ${g}, ${b}`;
    }

    function stepSparks(r, dt) {
        const g = r.R * 0.35;
        const drag = Math.exp(-SPARK_DRAG * SIM_STEP);
        let remaining = Math.min(dt, 4);
        while (remaining > 1e-6) {
            const h = Math.min(SIM_STEP, remaining);
            r.sparks.forEach((s) => {
                s.vy += g * h;
                s.vx *= h === SIM_STEP ? drag : Math.exp(-SPARK_DRAG * h);
                s.vy *= h === SIM_STEP ? drag : Math.exp(-SPARK_DRAG * h);
                s.x += s.vx * h;
                s.y += s.vy * h;
                s.age += h;
            });
            remaining -= h;
        }
    }

    function sparkAlpha(s) {
        const t = s.age / s.life;
        if (t >= 1) return 0;
        let a = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
        if (t > 0.6 && Math.random() < 0.3) a *= 0.35;
        return a;
    }

    function drawSparks(r) {
        const st = r.state;
        const cx = r.cx;
        const cy = r.apexWorld + st.camY;
        const keep = Math.pow(0.5, Math.max(0, st.frameDt) / TRAIL_HALF_LIFE);

        trailCtx.globalCompositeOperation = 'destination-out';
        trailCtx.fillStyle = `rgba(0, 0, 0, ${1 - keep * st.fade})`;
        trailCtx.fillRect(0, 0, width, height);
        trailCtx.globalCompositeOperation = 'lighter';
        trailCtx.lineCap = 'round';

        const heads = [];
        r.sparks.forEach((s) => {
            const a = sparkAlpha(s) * st.fade;
            const x = cx + s.x * st.zoom;
            const y = cy + s.y * st.zoom;
            if (a > 0) {
                const color = sparkColor(s.age / s.life);
                trailCtx.strokeStyle = `rgba(${color}, ${a * 0.85})`;
                trailCtx.lineWidth = 1.7;
                trailCtx.beginPath();
                trailCtx.moveTo(s.px == null ? x : s.px, s.py == null ? y : s.py);
                trailCtx.lineTo(x, y);
                trailCtx.stroke();
                heads.push({ x, y, a, color });
            }
            s.px = x;
            s.py = y;
        });

        ctx.drawImage(trail, 0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';
        heads.forEach((h) => {
            ctx.fillStyle = `rgba(${h.color}, ${h.a})`;
            ctx.beginPath();
            ctx.arc(h.x, h.y, 1.6, 0, Math.PI * 2);
            ctx.fill();
        });

        if (st.flash > 0) {
            const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.9);
            flash.addColorStop(0, `rgba(255, 236, 190, ${st.flash})`);
            flash.addColorStop(0.35, `rgba(255, 200, 120, ${st.flash * 0.35})`);
            flash.addColorStop(1, 'rgba(255, 180, 90, 0)');
            ctx.fillStyle = flash;
            ctx.fillRect(0, 0, width, height);
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    function render(r) {
        const st = r.state;
        const time = r.tl ? r.tl.time() : 0;
        st.frameDt = Math.max(0, time - r.lastTime);
        r.lastTime = time;

        const skyAlpha = clamp01(st.camY / (height * 0.7));
        sky.style.opacity = String(skyAlpha);
        if (r.scene) gsap.set(r.scene, { y: st.camY });
        if (window.Ambient) window.Ambient.setOffset(st.camY * 0.35);

        if (st.rocketOn > 0 && !r.burstDone) {
            const last = r.rocketTrail[r.rocketTrail.length - 1];
            if (!last || Math.abs(last.y - st.rocketY) > 1) {
                r.rocketTrail.push({ x: st.rocketX, y: st.rocketY });
                if (r.rocketTrail.length > 26) r.rocketTrail.shift();
            }
        }
        if (r.burstDone) stepSparks(r, st.frameDt);

        ctx.clearRect(0, 0, width, height);
        drawStars(r, time, skyAlpha);
        drawRocket(r);
        if (r.burstDone) drawSparks(r);
    }

    function burst(r) {
        const count = width < 500 ? 170 : 210;
        const speed = r.R * SPARK_DRAG;
        r.sparks = spherePoints(count).map((p) => {
            const jitter = rand(0.97, 1.03);
            return {
                x: 0,
                y: 0,
                vx: p.x * speed * jitter,
                vy: p.y * speed * jitter,
                age: 0,
                life: rand(2.6, 3.4),
                px: null,
                py: null
            };
        });
        r.burstDone = true;
        r.state.rocketOn = 0;
        trailCtx.clearRect(0, 0, width, height);
    }

    // ===== Lifecycle =====
    function cleanup() {
        const r = run;
        run = null;
        if (!r) return;
        if (r.tl) r.tl.kill();
        if (r.msgTl) r.msgTl.kill();
        if (r.out) {
            try {
                r.out.disconnect();
            } catch (e) { /* already gone */ }
        }
        ctx.clearRect(0, 0, width, height);
        trailCtx.clearRect(0, 0, width, height);
        sky.style.opacity = '0';
        gsap.killTweensOf(messageEl.querySelectorAll('.firework-line'));
        gsap.set(messageEl, { opacity: 0 });
        messageEl.innerHTML = '';
        if (r.scene) gsap.set(r.scene, { clearProps: 'transform' });
        if (window.Ambient) window.Ambient.setOffset(0);
    }

    function stop() {
        const r = run;
        cleanup();
        return Boolean(r);
    }

    // Reduced motion: no camera, no flight. Night sky, a still golden ring
    // and the message; the next tap dismisses it.
    function playStill(opts) {
        const r = { opts, waiting: true, state: { camY: 0 } };
        run = r;
        r.stars = makeStars(80, 0, height);
        const cx = width / 2;
        const cy = height * 0.42;
        const radius = Math.min(width, height) * 0.4;
        sky.style.opacity = '1';
        ctx.clearRect(0, 0, width, height);
        drawStars(r, 0, 1);
        ctx.fillStyle = 'rgba(255, 214, 140, 0.9)';
        spherePoints(200).forEach((p) => {
            ctx.beginPath();
            ctx.arc(cx + p.x * radius, cy + p.y * radius, 1.6, 0, Math.PI * 2);
            ctx.fill();
        });
        buildMessage(opts.lines);
        messageEl.style.top = `${cy}px`;
        gsap.set(messageEl, { opacity: 1 });
    }

    function play(opts) {
        cleanup();
        sizeCanvases();
        if (opts.reduced) {
            playStill(opts);
            return;
        }

        const target = height * 0.38;
        const climb = height * 1.4;
        const R = height * 0.45;
        const zoomEnd = Math.min(1, (0.95 * Math.min(width, height)) / (2 * R));
        const settleY = Math.max(target, R * zoomEnd + height * 0.04);
        const r = {
            opts,
            scene: opts.scene,
            cx: opts.origin.x,
            apexWorld: target - climb,
            R,
            stars: makeStars(Math.round(Math.min(110, Math.max(50, (width * height) / 9000))),
                -climb * 0.3 - height * 0.1, height),
            rocketTrail: [],
            sparks: [],
            burstDone: false,
            lastTime: 0,
            out: null,
            waiting: false,
            state: {
                camY: 0,
                rocketX: opts.origin.x,
                rocketY: opts.origin.y,
                rocketOn: 0,
                zoom: 1,
                flash: 0,
                fade: 1,
                frameDt: 0
            }
        };
        run = r;
        const st = r.state;
        const rows = buildMessage(opts.lines);
        messageEl.style.top = `${settleY}px`;
        gsap.set(messageEl, { opacity: 0 });
        // Staggered lines must stay hidden until their own turn comes.
        gsap.set(rows, { opacity: 0 });
        scheduleSound(r);

        const rise = { t: 0 };
        const tl = gsap.timeline({
            onUpdate() {
                render(r);
            },
            onComplete() {
                cleanup();
                if (opts.onDone) opts.onDone();
            }
        });
        r.tl = tl;

        tl.set(st, { rocketOn: 1 }, T.rocket);
        // The camera stays put until the shell passes the target line, then
        // locks onto it; the shell's own deceleration becomes the camera's.
        tl.to(rise, {
            t: 1,
            duration: T.ascent,
            ease: 'power2.out',
            onUpdate() {
                st.rocketY = opts.origin.y + (r.apexWorld - opts.origin.y) * rise.t;
                st.rocketX = opts.origin.x + Math.sin(rise.t * 9) * 5 * (1 - rise.t);
                st.camY = Math.max(0, target - st.rocketY);
            }
        }, T.launch);
        // Hang: everything holds its breath.
        tl.to(st, { rocketOn: 0.55, duration: T.hang, ease: 'sine.inOut' }, T.launch + T.ascent);

        tl.call(() => burst(r), null, T.burst);
        tl.fromTo(st, { flash: 0.6 }, { flash: 0, duration: 0.45, ease: 'power2.out', immediateRender: false }, T.burst);
        tl.to(st, { zoom: zoomEnd, duration: 0.8, ease: 'power2.out' }, T.burst);
        tl.to(st, { camY: climb + (settleY - target), duration: 0.8, ease: 'power2.inOut' }, T.burst);

        // Each line is lit up by the burst: it swells out of a soft blur and
        // settles, the Japanese line following a beat later.
        tl.set(messageEl, { opacity: 1 }, T.burst + 0.5);
        tl.fromTo(rows, { opacity: 0, scale: 1.12, filter: 'blur(10px)' }, {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 1.4,
            stagger: 0.6,
            ease: 'power2.out',
            immediateRender: false
        }, T.burst + 0.5);
        tl.to(messageEl, { opacity: 0, duration: 0.6, ease: 'power2.in' }, T.burst + T.droop);

        tl.to(st, { fade: 0, duration: 1, ease: 'power1.in' }, T.burst + T.droop);
        tl.to(st, { camY: 0, duration: T.back, ease: 'power2.inOut' }, T.burst + T.droop);
        tl.set({}, {}, T.end);
    }

    function dismiss() {
        const r = run;
        if (!r || !r.waiting) return;
        cleanup();
        if (r.opts.onDone) r.opts.onDone();
    }

    window.Firework = {
        primeAudio,
        play,
        stop,
        dismiss,
        isWaiting() {
            return Boolean(run && run.waiting);
        }
    };
})();
