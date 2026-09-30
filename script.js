// ===== Content & configuration =====
const CONTENT = window.CONTENT;

if (!CONTENT || !Array.isArray(CONTENT.memories) || !CONTENT.timer) {
    throw new Error('content.js must define window.CONTENT before script.js');
}

const CONFIG = {
    longPressMs: 1500,
    longPressSlop: 10,
    smallHeartCount: 12,
    particleCount: 12,
    particleDuration: 1.5,
    messageDuration: 2,
    gatherDuration: 0.85,
    gatherStagger: 0.04,
    hints: {
        0: '點擊匯聚愛心 ❤️',
        1: '再點一次看魔法 ✨',
        2: '點擊查看我們的時光 ⏰',
        3: '',
        4: ''
    }
};

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const SVG_NS = 'http://www.w3.org/2000/svg';
const CONFETTI_COLORS = ['#d4af37', '#f5e6a3', '#c9a227', '#ffe082', '#e8c547'];
const WARM_GLOW_COLORS = ['#ffb37a', '#ff9a62', '#ffd2a8', '#f7a26b'];
const CJK_CHAR = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/;

function prefersReduced() {
    return reducedMotionQuery.matches;
}

function parseLocalDate(value) {
    return new Date(value);
}

function formatDate(date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function timelineGap() {
    const width = window.innerWidth;
    if (width <= 480) return 148;
    if (width <= 768) return 168;
    return 200;
}

// ===== State =====
let currentStage = 0;
let isAnimating = false;
let smallHearts = [];
let activeTimeline = null;
let hintTimeout = null;
let resizeTimer = null;
let timerInterval = null;
let lastMessageIndex = -1;
let modalSession = 0;
let modalReturnFocus = null;
let heartsViewport = { w: window.innerWidth, h: window.innerHeight };
let modalMemory = null;
let modalIndex = -1;
let modalSwipe = null;
let longPress = null;
let fireworkActive = false;
let suppressPointerId = null;
let lineFrame = null;
const memoryImageCache = new Map();

// ===== DOM =====
const container = document.querySelector('.container');
const heartWrapper = document.querySelector('.heart-wrapper');
const heartVisual = document.querySelector('.heart-visual');
const message = document.querySelector('.message');
const particlesContainer = document.querySelector('.particles-container');
const smallHeartsContainer = document.querySelector('.small-hearts-container');
const tapLayer = document.querySelector('.tap-layer');
const hintElement = document.querySelector('.hint');
const centerGlow = document.querySelector('.center-glow');
const timelineBackdrop = document.querySelector('.timeline-backdrop');
const timelineScroller = document.querySelector('.timeline-scroller');
const timelineContainer = document.querySelector('.timeline-container');
const timelineLine = document.querySelector('.timeline-line');
const timelinePoints = document.querySelector('.timeline-points');
const timelineContinue = document.querySelector('.timeline-continue');
const infoModal = document.querySelector('.info-modal');
const infoContent = document.querySelector('.info-content');
const infoClose = document.querySelector('.info-close');
const modalConfetti = document.querySelector('.modal-confetti');
const infoImageFrame = document.querySelector('.info-image-container');
const infoPrev = document.querySelector('.info-prev');
const infoNext = document.querySelector('.info-next');
const infoCounter = document.querySelector('.info-counter');
const timerContainer = document.querySelector('.timer-container');
const timerRestart = document.querySelector('.timer-restart');
const timerUpcoming = document.querySelector('.timer-upcoming');

const motionNodes = [
    heartWrapper,
    heartVisual,
    timelineScroller,
    timerContainer,
    hintElement,
    infoContent,
    timelineContinue,
    centerGlow,
    message
];

// ===== Motion helpers =====
function quadPoint(p0, p1, p2, t) {
    const u = 1 - t;
    return {
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
}

function addArcToTimeline(tl, el, from, to, opts) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const side = opts.side || 1;
    const ctrlScale = opts.ctrlScale == null ? 0.25 : opts.ctrlScale;
    const ctrl = {
        x: (from.x + to.x) / 2 - dy * ctrlScale * side,
        y: (from.y + to.y) / 2 + dx * ctrlScale * side
    };
    const proxy = { t: 0 };
    tl.to(proxy, {
        t: 1,
        duration: opts.duration,
        ease: opts.ease,
        onUpdate() {
            const point = quadPoint(from, ctrl, to, proxy.t);
            gsap.set(el, { x: point.x - from.x, y: point.y - from.y });
        }
    }, opts.position);
}

function cancelHintTimeout() {
    if (hintTimeout) {
        clearTimeout(hintTimeout);
        hintTimeout = null;
    }
}

function clearParticles() {
    // Also catches the anniversary .rain-heart drops, which carry .particle.
    const bits = particlesContainer.querySelectorAll('.particle');
    gsap.killTweensOf(bits);
    particlesContainer.innerHTML = '';
}

function clearRipples() {
    document.querySelectorAll('.ripple').forEach((el) => {
        gsap.killTweensOf(el);
        el.remove();
    });
}

function clearModalEffects() {
    if (!modalConfetti) return;
    gsap.killTweensOf(modalConfetti.children);
    modalConfetti.innerHTML = '';
}

function clearTapHearts() {
    gsap.killTweensOf(tapLayer.children);
    tapLayer.innerHTML = '';
}

function cancelLineFrame() {
    if (lineFrame) {
        window.cancelAnimationFrame(lineFrame);
        lineFrame = null;
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function preloadImage(src, highPriority) {
    if (!src) return null;
    const cached = memoryImageCache.get(src);
    if (cached) return cached;
    const img = new Image();
    img.decoding = 'async';
    if (highPriority) img.fetchPriority = 'high';
    img.src = src;
    memoryImageCache.set(src, img);
    if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
    }
    return img;
}

function preloadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
        '400 48px "標楷體"',
        '400 48px "DFKai-SB"',
        '400 48px "BiauKai"',
        '400 16px "LXGW WenKai TC"',
        '700 32px "LXGW WenKai TC"'
    ].map((face) => document.fonts.load(face).catch(() => [])));
}

function whenIdle(fn) {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(fn, { timeout: 2000 });
    } else {
        setTimeout(fn, 300);
    }
}

// Only the first photo competes with first paint; the rest wait until the
// first tap (gather), still well before the timeline can open a modal.
function preloadSiteAssets() {
    preloadFonts();
    const first = CONTENT.memories[0];
    if (first) whenIdle(() => preloadImage(first.image, false));
}

function preloadAllMemoryImages() {
    whenIdle(() => {
        CONTENT.memories.forEach((memory) => preloadImage(memory.image, false));
    });
}

// The frame takes the photo's own ratio so portrait shots don't sit in
// a 4:3 box with grey bars; CSS caps the height and derives the width.
function fitImageFrame(image) {
    const frame = image.parentElement;
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    if (!frame || !w || !h) return;
    frame.style.setProperty('--ratio', String(w / h));
}

function startKenBurns(image, memory) {
    gsap.killTweensOf(image);
    const focus = (memory && memory.focus) || '50% 50%';
    gsap.set(image, { scale: 1, transformOrigin: focus });
    if (prefersReduced() || !memory || memory.kenBurns === false) return;
    gsap.to(image, { scale: 1.06, duration: 6, ease: 'sine.out' });
}

function revealModalImage(image, session) {
    if (session !== modalSession) return;
    fitImageFrame(image);
    image.classList.add('is-ready');
    startKenBurns(image, modalMemory);
}

function applyModalImage(image, src, session) {
    image.onload = null;
    image.onerror = null;
    image.classList.remove('is-ready');

    if (image.getAttribute('src') === src && image.complete && image.naturalWidth > 0) {
        revealModalImage(image, session);
        return;
    }

    const reveal = () => revealModalImage(image, session);
    image.addEventListener('load', reveal, { once: true });
    image.addEventListener('error', reveal, { once: true });
    image.src = src;

    if (image.complete && image.naturalWidth > 0) {
        reveal();
    }
}

function modalFields() {
    return {
        image: infoModal.querySelector('.info-image'),
        title: infoModal.querySelector('.info-title'),
        date: infoModal.querySelector('.info-date'),
        description: infoModal.querySelector('.info-description')
    };
}

function clearModalImage() {
    const { image } = modalFields();
    if (!image) return;
    image.onload = null;
    image.onerror = null;
    image.classList.remove('is-ready');
    gsap.set(image, { clearProps: 'transform' });
}

function restoreModalFocus() {
    const target = modalReturnFocus;
    modalReturnFocus = null;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
}

function focusableInModal() {
    return [...infoContent.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null);
}

function trapModalFocus(event) {
    const items = focusableInModal();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    } else if (!infoContent.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
    }
}

function closeInfoModal(immediate) {
    const { image, title, date, description } = modalFields();
    const wasOpen = infoModal.classList.contains('show');
    modalSession += 1;
    gsap.killTweensOf([infoContent, image, title, date, description]);
    clearModalEffects();
    infoContent.classList.remove('theme-blush', 'theme-gold', 'theme-warm');
    clearModalImage();
    gsap.killTweensOf([infoImageFrame, ...infoContent.querySelectorAll('.info-image-container, .info-details')]);
    gsap.set([infoImageFrame, infoContent.querySelector('.info-details')], { clearProps: 'transform,opacity,x' });
    modalIndex = -1;
    modalSwipe = null;
    if (wasOpen) restoreModalFocus();
    if (immediate || prefersReduced() || !wasOpen) {
        infoModal.classList.remove('show');
        gsap.set(infoContent, { clearProps: 'transform,opacity,x,y,scale' });
        setTimelineScrollLock(false);
        return;
    }
    gsap.to(infoContent, {
        opacity: 0,
        scale: 0.94,
        duration: 0.2,
        ease: 'power3.out',
        onComplete() {
            infoModal.classList.remove('show');
            gsap.set(infoContent, { clearProps: 'transform,opacity,x,y,scale' });
            setTimelineScrollLock(false);
        }
    });
}

function killTransition() {
    if (activeTimeline) {
        activeTimeline.kill();
        activeTimeline = null;
    }
    gsap.killTweensOf(motionNodes.concat(smallHearts));
    gsap.killTweensOf('.timeline-point-visual');
    gsap.set([
        heartVisual,
        hintElement,
        infoContent,
        timelineContinue,
        message
    ], { clearProps: 'transform,opacity,x,y,scale,rotation,filter' });
    // The big heart and glow keep their opacity: it is the current stage's
    // resting state (hidden in Stages 3–4), and .heart-wrapper has no CSS
    // opacity to fall back to, so clearing it would flash the heart at full
    // size behind the next transition.
    gsap.set([heartWrapper, centerGlow], { clearProps: 'transform,x,y,scale,rotation,filter' });
    gsap.set([timelineScroller, timelineContainer, timerContainer], { clearProps: 'opacity' });
    setTimelineScrollLock(false);
    cancelHintTimeout();
    closeInfoModal(true);
    clearParticles();
    clearRipples();
    stopTimer();
    clearModalEffects();
    cancelLineFrame();
    stopFirework();
}

function applyStageClass() {
    container.className = 'container';
    container.classList.add(`stage-${currentStage}`);
}

function updateHint() {
    cancelHintTimeout();
    const text = CONFIG.hints[currentStage] || '';
    const show = Boolean(text);
    if (prefersReduced()) {
        hintElement.textContent = text;
        gsap.set(hintElement, { opacity: show ? 1 : 0, y: 0 });
        return;
    }
    gsap.to(hintElement, {
        opacity: 0,
        y: 8,
        duration: 0.15,
        ease: 'power3.out',
        onComplete() {
            hintElement.textContent = text;
            if (!show) {
                gsap.set(hintElement, { opacity: 0, y: 8 });
                return;
            }
            gsap.to(hintElement, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' });
        }
    });
}

function snapIdleStageVisuals() {
    if (currentStage === 0) {
        gsap.set(heartWrapper, { opacity: 0, scale: 0.5, x: 0, y: 0, rotation: 0 });
        gsap.set(centerGlow, { opacity: 0 });
        gsap.set(timelineScroller, { opacity: 0 });
        gsap.set(timelineContinue, { opacity: 1 });
        gsap.set(timerContainer, { opacity: 0 });
        gsap.set(message, { opacity: 0 });
        resetTimelineScroll();
    } else if (currentStage === 1 || currentStage === 2) {
        gsap.set(heartWrapper, { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0 });
        gsap.set(centerGlow, { opacity: currentStage === 1 ? 0.7 : 0 });
        gsap.set(timelineScroller, { opacity: 0 });
        gsap.set(timelineContinue, { opacity: 1 });
        gsap.set(timerContainer, { opacity: 0 });
    } else if (currentStage === 3) {
        gsap.set(heartWrapper, { opacity: 0 });
        gsap.set(centerGlow, { opacity: 0 });
        gsap.set(timelineScroller, { opacity: 1 });
        gsap.set(timelineContinue, { opacity: 1 });
        gsap.set(timerContainer, { opacity: 0 });
        gsap.set(timelineLine, { scaleY: 1 });
        gsap.set('.timeline-point-visual', { opacity: 1, scale: 1 });
        timelinePoints.querySelectorAll('.timeline-point').forEach((point) => point.classList.add('is-revealed'));
    } else if (currentStage === 4) {
        gsap.set(heartWrapper, { opacity: 0 });
        gsap.set(centerGlow, { opacity: 0 });
        gsap.set(timelineScroller, { opacity: 0 });
        gsap.set(timelineContinue, { opacity: 1 });
        gsap.set(timerContainer, { opacity: 1 });
        resetTimelineScroll();
    }
}

// ===== Hearts =====
// Every heart references the shared #heart-shape symbol in index.html.
function createHeartSvg() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 32 29.6');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#heart-shape');
    svg.appendChild(use);
    return svg;
}

function createSmallHeart() {
    const outer = document.createElement('div');
    outer.className = 'small-heart';

    const visual = document.createElement('div');
    visual.className = 'small-heart-visual';

    const svg = createHeartSvg();
    svg.classList.add('small-heart-svg');

    visual.appendChild(svg);
    outer.appendChild(visual);
    return outer;
}

function initializeSmallHearts() {
    gsap.killTweensOf(smallHearts);
    smallHeartsContainer.innerHTML = '';
    smallHearts = [];

    const padding = 80;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    for (let i = 0; i < CONFIG.smallHeartCount; i += 1) {
        const smallHeart = createSmallHeart();
        const x = padding + Math.random() * (viewportWidth - padding * 2);
        const y = padding + Math.random() * (viewportHeight - padding * 2);
        smallHeart.style.left = `${x}px`;
        smallHeart.style.top = `${y}px`;
        gsap.set(smallHeart, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 });
        smallHeartsContainer.appendChild(smallHeart);
        smallHearts.push(smallHeart);
    }
    heartsViewport = { w: viewportWidth, h: viewportHeight };
}

// Keep the scattered hearts in the same relative spots after a resize or
// rotation instead of re-rolling them, so the scene doesn't jump.
function relayoutSmallHearts() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const sx = w / Math.max(heartsViewport.w, 1);
    const sy = h / Math.max(heartsViewport.h, 1);
    smallHearts.forEach((el) => {
        el.style.left = `${parseFloat(el.style.left) * sx}px`;
        el.style.top = `${parseFloat(el.style.top) * sy}px`;
    });
    heartsViewport = { w, h };
}

function pickMessage() {
    const lines = CONTENT.messages;
    if (!lines.length) return '';
    if (lines.length === 1) {
        lastMessageIndex = 0;
        return lines[0];
    }
    let index = Math.floor(Math.random() * lines.length);
    if (index === lastMessageIndex) {
        index = (index + 1 + Math.floor(Math.random() * (lines.length - 1))) % lines.length;
    }
    lastMessageIndex = index;
    return lines[index];
}

function applyMessageStyle(text) {
    message.classList.toggle('is-cjk', /[\u4e00-\u9fff]/.test(text));
}

// Split a line into per-character spans for staggered reveals. CJK
// characters may break anywhere; Latin words stay whole so a line never
// wraps mid-word. Returns the character spans in reading order.
function renderSplitText(target, text) {
    target.textContent = '';
    target.setAttribute('aria-label', text);
    const chars = [];
    const makeChar = (ch) => {
        const span = document.createElement('span');
        span.className = 'split-char';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = ch;
        chars.push(span);
        return span;
    };
    text.split(/(\s+)/).forEach((token) => {
        if (!token) return;
        if (/^\s+$/.test(token)) {
            target.appendChild(document.createTextNode(' '));
            return;
        }
        let word = null;
        Array.from(token).forEach((ch) => {
            if (CJK_CHAR.test(ch)) {
                word = null;
                target.appendChild(makeChar(ch));
                return;
            }
            if (!word) {
                word = document.createElement('span');
                word.className = 'split-word';
                target.appendChild(word);
            }
            word.appendChild(makeChar(ch));
        });
    });
    return chars;
}

function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.appendChild(createHeartSvg());
    return particle;
}

function spawnExplosionParticles(origin) {
    if (prefersReduced()) return;
    for (let i = 0; i < CONFIG.particleCount; i += 1) {
        const particle = createParticle();
        const size = 12 + Math.random() * 22;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${origin.x}px`;
        particle.style.top = `${origin.y}px`;
        particlesContainer.appendChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 280;
        const vx = Math.cos(angle) * dist;
        const vy = Math.sin(angle) * dist - (90 + Math.random() * 170);
        const gravity = 340 + Math.random() * 260;
        const spin = (Math.random() - 0.5) * 420;
        const proxy = { t: 0 };
        const duration = 1.15 + Math.random() * 0.5;

        gsap.to(proxy, {
            t: 1,
            duration,
            ease: 'none',
            onUpdate() {
                const t = proxy.t;
                gsap.set(particle, {
                    x: vx * t,
                    y: vy * t + 0.5 * gravity * t * t,
                    rotation: spin * t,
                    scale: 1 - t * 0.65,
                    opacity: 1 - t
                });
            },
            onComplete() {
                particle.remove();
            }
        });
    }
}

function createRipple() {
    if (prefersReduced()) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    document.body.appendChild(ripple);
    gsap.fromTo(ripple, { scale: 0, opacity: 0.7 }, {
        scale: 70,
        opacity: 0,
        duration: 1.15,
        ease: 'power3.out',
        onComplete() {
            ripple.remove();
        }
    });
}

// Small hearts float up from wherever the screen is tapped.
function spawnTapHearts(x, y, pointerType) {
    if (prefersReduced()) return;
    if (pointerType === 'touch' && navigator.vibrate) navigator.vibrate(10);
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i += 1) {
        const heart = document.createElement('div');
        heart.className = 'tap-heart';
        const size = 14 + Math.random() * 10;
        heart.style.width = `${size}px`;
        heart.style.left = `${x - size / 2}px`;
        heart.style.top = `${y - size / 2}px`;
        heart.appendChild(createHeartSvg());
        tapLayer.appendChild(heart);
        gsap.fromTo(heart, { x: 0, y: 0, scale: 0.4, opacity: 0.95, rotation: (Math.random() - 0.5) * 30 }, {
            x: (Math.random() - 0.5) * 60,
            y: -(50 + Math.random() * 60),
            scale: 1,
            opacity: 0,
            rotation: (Math.random() - 0.5) * 50,
            duration: 0.9 + Math.random() * 0.4,
            delay: i * 0.06,
            ease: 'power2.out',
            onComplete() {
                heart.remove();
            }
        });
    }
}

// ===== Stage transitions =====
function gatherHearts() {
    if (isAnimating) return;
    killTransition();
    isAnimating = true;
    preloadAllMemoryImages();
    gsap.set(heartWrapper, { opacity: 0, scale: 0.5, x: 0, y: 0, rotation: 0 });
    gsap.set(centerGlow, { opacity: 0 });
    gsap.set(message, { opacity: 0 });
    applyStageClass();

    if (prefersReduced()) {
        gsap.set(smallHearts, { opacity: 0 });
        currentStage = 1;
        applyStageClass();
        snapIdleStageVisuals();
        updateHint();
        isAnimating = false;
        return;
    }

    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const duration = CONFIG.gatherDuration;
    const stagger = CONFIG.gatherStagger;
    const lastArrive = (smallHearts.length - 1) * stagger + duration;

    const tl = gsap.timeline({
        onComplete() {
            activeTimeline = null;
            smallHearts.forEach((el) => el.classList.remove('is-gathering'));
            gsap.set(heartVisual, { clearProps: 'scale' });
            currentStage = 1;
            applyStageClass();
            snapIdleStageVisuals();
            updateHint();
            isAnimating = false;
        }
    });
    activeTimeline = tl;

    tl.to(centerGlow, { opacity: 0.85, duration: lastArrive, ease: 'power2.in' }, 0);

    smallHearts.forEach((el, index) => {
        el.classList.add('is-gathering');
        const rect = el.getBoundingClientRect();
        const from = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        addArcToTimeline(tl, el, from, center, {
            duration,
            ease: 'power3.out',
            position: index * stagger,
            ctrlScale: 0.2 + Math.random() * 0.14,
            side: index % 2 === 0 ? 1 : -1
        });
        tl.to(el, {
            scale: 0.22,
            rotation: (Math.random() - 0.5) * 50,
            duration,
            ease: 'power3.out'
        }, index * stagger);
        tl.to(el, {
            opacity: 0,
            duration: 0.18,
            ease: 'power3.out'
        }, index * stagger + duration - 0.18);
    });

    tl.set(heartWrapper, { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0 }, lastArrive - 0.02);
    tl.fromTo(heartVisual, { scale: 1 }, {
        scale: 1.14,
        duration: 0.22,
        ease: 'back.out(1.4)',
        yoyo: true,
        repeat: 1
    }, lastArrive);
}

function explodeHearts() {
    if (isAnimating) return;
    killTransition();
    isAnimating = true;

    const text = pickMessage();
    const chars = renderSplitText(message, text);
    applyMessageStyle(text);
    gsap.set(heartWrapper, { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0 });
    gsap.set(centerGlow, { opacity: 0.7 });

    if (prefersReduced()) {
        gsap.set(message, { opacity: 1, scale: 1 });
        currentStage = 2;
        applyStageClass();
        snapIdleStageVisuals();
        gsap.set(message, { opacity: 1 });
        updateHint();
        isAnimating = false;
        return;
    }

    const rect = heartWrapper.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const hold = Math.max(CONFIG.particleDuration, CONFIG.messageDuration);

    const tl = gsap.timeline({
        onComplete() {
            activeTimeline = null;
            gsap.set(message, { opacity: 0 });
            gsap.set(heartVisual, { clearProps: 'scale' });
            currentStage = 2;
            applyStageClass();
            snapIdleStageVisuals();
            updateHint();
            isAnimating = false;
        }
    });
    activeTimeline = tl;

    createRipple();
    spawnExplosionParticles(origin);

    tl.fromTo(heartVisual, { scale: 1 }, {
        scale: 1.12,
        duration: 0.18,
        ease: 'back.out(1.4)',
        yoyo: true,
        repeat: 1
    }, 0);
    tl.to(centerGlow, { opacity: 0, duration: 0.45, ease: 'power3.out' }, 0);
    tl.set(message, { opacity: 1, scale: 1 }, 0.05);
    tl.fromTo(chars, { opacity: 0, y: 14, filter: 'blur(6px)' }, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.45,
        stagger: Math.min(0.07, 0.6 / Math.max(chars.length, 1)),
        ease: 'power3.out'
    }, 0.05);
    tl.to(message, {
        opacity: 0,
        scale: 0.94,
        duration: 0.35,
        ease: 'power3.out'
    }, CONFIG.messageDuration - 0.35);
    tl.to({}, { duration: hold }, 0);
}

function resetTimelineScroll() {
    if (timelineScroller) timelineScroller.scrollTop = 0;
}

function setTimelineScrollLock(locked) {
    if (!timelineScroller) return;
    timelineScroller.classList.toggle('is-locked', locked);
}

function generateTimelinePoints() {
    timelinePoints.innerHTML = '';
    const list = CONTENT.memories;
    const gap = timelineGap();
    const height = list.length <= 1 ? gap : gap * (list.length - 1);
    timelineContainer.style.height = `${height}px`;

    list.forEach((data, index) => {
        const y = list.length === 1 ? height / 2 : gap * index;
        const point = createTimelinePoint(data, y, index % 2 === 1, index);
        timelinePoints.appendChild(point);
    });
}

function createTimelinePoint(data, y, isLeft, index) {
    const pointDiv = document.createElement('div');
    pointDiv.className = 'timeline-point';
    if (isLeft) pointDiv.classList.add('left');
    pointDiv.style.top = `${y}px`;
    pointDiv.dataset.index = String(index);
    pointDiv.tabIndex = 0;
    pointDiv.setAttribute('role', 'button');
    pointDiv.setAttribute('aria-label', data.title);

    const visual = document.createElement('div');
    visual.className = 'timeline-point-visual';
    const svg = createHeartSvg();
    visual.appendChild(svg);
    pointDiv.appendChild(visual);

    const label = document.createElement('div');
    label.className = 'timeline-label';
    const labelDate = document.createElement('span');
    labelDate.className = 'timeline-label-date';
    labelDate.textContent = formatDate(parseLocalDate(data.date));
    const labelTitle = document.createElement('span');
    labelTitle.className = 'timeline-label-title';
    labelTitle.textContent = data.title;
    label.append(labelDate, labelTitle);
    pointDiv.appendChild(label);

    const open = () => showInfoModal(index, pointDiv);
    pointDiv.addEventListener('click', (event) => {
        event.stopPropagation();
        open();
    });
    pointDiv.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
        }
    });

    return pointDiv;
}

function timelineLineProgress() {
    const height = timelineContainer.offsetHeight;
    if (!height) return 1;
    const reach = timelineScroller.scrollTop + timelineScroller.clientHeight * 0.88 - timelineContainer.offsetTop;
    return Math.min(1, Math.max(0, reach / height));
}

function syncTimelineLine() {
    lineFrame = null;
    if (currentStage !== 3 || isAnimating) return;
    revealVisiblePoints();
    gsap.to(timelineLine, { scaleY: timelineLineProgress(), duration: 0.25, ease: 'power2.out', overwrite: true });
}

function isPointInView(point) {
    const rect = point.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.88 && rect.bottom > 0;
}

function revealPoint(point, delay) {
    if (point.classList.contains('is-revealed')) return;
    point.classList.add('is-revealed');
    const visual = point.querySelector('.timeline-point-visual');
    if (prefersReduced()) {
        gsap.set(visual, { opacity: 1, scale: 1 });
        return;
    }
    gsap.to(visual, {
        opacity: 1,
        scale: 1,
        duration: 0.45,
        delay: delay || 0,
        ease: 'back.out(1.6)',
        onComplete() {
            gsap.set(visual, { clearProps: 'scale' });
        }
    });
}

// Hearts below the fold wait until they're scrolled into view. Driven by
// the same rAF-throttled scroll handler as the line, so both stay in step.
function revealVisiblePoints() {
    timelinePoints.querySelectorAll('.timeline-point:not(.is-revealed)').forEach((point) => {
        if (isPointInView(point)) revealPoint(point);
    });
}

function enterTimeline() {
    if (isAnimating) return;
    killTransition();
    isAnimating = true;

    resetTimelineScroll();
    generateTimelinePoints();
    const targetPoint = timelinePoints.querySelector('[data-index="0"]');
    const visuals = [...timelinePoints.querySelectorAll('.timeline-point-visual')];
    const targetVisual = targetPoint ? targetPoint.querySelector('.timeline-point-visual') : null;

    gsap.set(timelineScroller, { opacity: 1 });
    gsap.set(timelineLine, { scaleY: 0, transformOrigin: 'top center' });
    gsap.set(visuals, { opacity: 0, scale: 0.4 });
    gsap.set(timelineContinue, { opacity: 1 });
    gsap.set(heartWrapper, { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0 });

    if (prefersReduced() || !targetPoint) {
        currentStage = 3;
        applyStageClass();
        snapIdleStageVisuals();
        timelinePoints.querySelectorAll('.timeline-point').forEach((point) => point.classList.add('is-revealed'));
        updateHint();
        isAnimating = false;
        return;
    }

    const heartRect = heartWrapper.getBoundingClientRect();
    const pointRect = targetPoint.getBoundingClientRect();
    const from = {
        x: heartRect.left + heartRect.width / 2,
        y: heartRect.top + heartRect.height / 2
    };
    const to = {
        x: pointRect.left + pointRect.width / 2,
        y: pointRect.top + pointRect.height / 2
    };
    const targetScale = pointRect.width / Math.max(heartRect.width, 1);

    const points = [...timelinePoints.querySelectorAll('.timeline-point')];
    const inView = points.filter((point) => point !== targetPoint && isPointInView(point));

    const tl = gsap.timeline({
        onComplete() {
            activeTimeline = null;
            gsap.set(heartWrapper, { opacity: 0 });
            currentStage = 3;
            applyStageClass();
            updateHint();
            isAnimating = false;
            syncTimelineLine();
        }
    });
    activeTimeline = tl;

    addArcToTimeline(tl, heartWrapper, from, to, {
        duration: 0.95,
        ease: 'power3.out',
        position: 0,
        ctrlScale: 0.28,
        side: 1
    });
    tl.to(heartWrapper, {
        scale: targetScale,
        rotation: -10,
        duration: 0.95,
        ease: 'power3.out'
    }, 0);
    tl.to(heartWrapper, { opacity: 0, duration: 0.22, ease: 'power3.out' }, 0.88);
    tl.to(targetVisual, { opacity: 1, scale: 1, duration: 0.22, ease: 'power3.out' }, 0.88);
    tl.call(() => targetPoint.classList.add('is-revealed'), null, 0.88);
    tl.to(timelineLine, { scaleY: timelineLineProgress(), duration: 0.55, ease: 'power3.out' }, 1.05);
    tl.call(() => inView.forEach((point, i) => revealPoint(point, i * 0.07)), null, 1.18);
    tl.to({}, { duration: 0.4 + inView.length * 0.07 }, 1.18);
}

function refreshTimelineLayout() {
    if (currentStage !== 3) return;
    const keep = timelineScroller ? timelineScroller.scrollTop : 0;
    const revealed = new Set([...timelinePoints.querySelectorAll('.timeline-point.is-revealed')]
        .map((point) => point.dataset.index));
    generateTimelinePoints();
    if (timelineScroller) timelineScroller.scrollTop = keep;
    timelinePoints.querySelectorAll('.timeline-point').forEach((point) => {
        const visual = point.querySelector('.timeline-point-visual');
        if (revealed.has(point.dataset.index) || isPointInView(point)) {
            point.classList.add('is-revealed');
            gsap.set(visual, { opacity: 1 });
        } else {
            gsap.set(visual, { opacity: 0, scale: 0.4 });
        }
    });
    gsap.set(timelineLine, { scaleY: timelineLineProgress() });
}

function spawnWeddingConfetti() {
    const layer = modalConfetti;
    const width = layer.clientWidth || 400;
    const height = layer.clientHeight || 360;

    for (let i = 0; i < 28; i += 1) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        layer.appendChild(piece);
        gsap.fromTo(piece, {
            x: Math.random() * width,
            y: -18 - Math.random() * 40,
            rotation: Math.random() * 80,
            opacity: 1,
            scale: 0.7 + Math.random() * 0.6
        }, {
            y: height + 24,
            x: `+=${(Math.random() - 0.5) * 80}`,
            rotation: 180 + Math.random() * 260,
            opacity: 0,
            duration: 1.3 + Math.random() * 0.9,
            ease: 'power3.out'
        });
    }
}

// Fade a freshly tweened node in, hold, then out across its main tween.
function fadeInOut(node, peak) {
    const main = gsap.getTweensOf(node)[0];
    const duration = main ? main.duration() : 2;
    const delay = main ? main.delay() : 0;
    gsap.timeline({ delay })
        .to(node, { opacity: peak, duration: duration * 0.25, ease: 'power1.out' })
        .to(node, { opacity: 0, duration: duration * 0.35, ease: 'power1.in' }, duration * 0.65);
}

function spawnBlushHearts() {
    const layer = modalConfetti;
    const width = layer.clientWidth || 400;
    const height = layer.clientHeight || 360;
    for (let i = 0; i < 12; i += 1) {
        const heart = document.createElement('div');
        heart.className = 'modal-heart';
        const size = 10 + Math.random() * 12;
        heart.style.width = `${size}px`;
        heart.appendChild(createHeartSvg());
        layer.appendChild(heart);
        gsap.fromTo(heart, {
            x: Math.random() * (width - size),
            y: height + 10,
            opacity: 0,
            scale: 0.6
        }, {
            y: height * (0.1 + Math.random() * 0.4),
            x: `+=${(Math.random() - 0.5) * 60}`,
            scale: 1,
            duration: 1.8 + Math.random() * 1.2,
            delay: Math.random() * 0.6,
            ease: 'power1.out'
        });
        fadeInOut(heart, 0.85);
    }
}

function spawnWarmGlow() {
    const layer = modalConfetti;
    const width = layer.clientWidth || 400;
    const height = layer.clientHeight || 360;
    for (let i = 0; i < 16; i += 1) {
        const dot = document.createElement('span');
        dot.className = 'glow-dot';
        const size = 4 + Math.random() * 6;
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.background = WARM_GLOW_COLORS[i % WARM_GLOW_COLORS.length];
        layer.appendChild(dot);
        gsap.fromTo(dot, {
            x: Math.random() * width,
            y: height * (0.5 + Math.random() * 0.5),
            opacity: 0
        }, {
            y: `-=${60 + Math.random() * 120}`,
            x: `+=${(Math.random() - 0.5) * 40}`,
            duration: 2 + Math.random() * 1.5,
            delay: Math.random() * 0.8,
            ease: 'sine.inOut'
        });
        fadeInOut(dot, 0.9);
    }
}

function spawnModalEffect(theme) {
    if (prefersReduced()) return;
    clearModalEffects();
    if (theme === 'gold') spawnWeddingConfetti();
    else if (theme === 'blush') spawnBlushHearts();
    else if (theme === 'warm') spawnWarmGlow();
}

function timelinePointAt(index) {
    return timelinePoints.querySelector(`.timeline-point[data-index="${index}"]`);
}

function pulsePoint(pointEl) {
    const visual = pointEl && pointEl.querySelector('.timeline-point-visual');
    if (!visual || prefersReduced()) return;
    gsap.fromTo(visual, { scale: 1 }, {
        scale: 1.28,
        duration: 0.18,
        ease: 'back.out(1.4)',
        yoyo: true,
        repeat: 1,
        onComplete() {
            gsap.set(visual, { clearProps: 'scale' });
        }
    });
}

// Keep the timeline behind the dialog on the memory being shown, so closing
// it lands exactly where the viewer left off.
function syncTimelineToMemory(index) {
    const point = timelinePointAt(index);
    if (!point) return;
    const target = point.offsetTop + timelineContainer.offsetTop - timelineScroller.clientHeight / 2;
    timelineScroller.scrollTop = Math.max(0, target);
    revealPoint(point);
    syncTimelineLine();
    modalReturnFocus = point;
}

function updateModalNav() {
    const total = CONTENT.memories.length;
    infoCounter.textContent = `${modalIndex + 1} / ${total}`;
    infoPrev.disabled = modalIndex <= 0;
    infoNext.disabled = modalIndex >= total - 1;
}

function fillModal(data) {
    const { image, title, date, description } = modalFields();
    modalMemory = data;
    image.alt = data.title;
    title.textContent = data.title;
    date.textContent = formatDate(parseLocalDate(data.date));
    description.textContent = data.body || '';
    infoContent.classList.remove('theme-blush', 'theme-gold', 'theme-warm');
    if (data.theme) infoContent.classList.add(`theme-${data.theme}`);
    updateModalNav();
}

function photoRatio(src) {
    const img = memoryImageCache.get(src);
    if (img && img.naturalWidth && img.naturalHeight) return img.naturalWidth / img.naturalHeight;
    return null;
}

function showInfoModal(index, pointEl) {
    const data = CONTENT.memories[index];
    if (!data) return;
    const { image, title, date, description } = modalFields();
    const session = modalSession + 1;
    modalSession = session;

    gsap.killTweensOf([infoContent, image, title, date, description]);
    clearModalEffects();
    modalIndex = index;
    fillModal(data);

    if (!infoModal.classList.contains('show')) {
        modalReturnFocus = pointEl || document.activeElement;
    }
    infoModal.classList.add('show');
    setTimelineScrollLock(true);
    infoClose.focus({ preventScroll: true });
    applyModalImage(image, data.image, session);

    if (prefersReduced()) {
        gsap.set(infoContent, { opacity: 1, scale: 1, y: 0 });
        gsap.set([title, date, description], { opacity: 1, y: 0 });
        return;
    }

    gsap.fromTo(infoContent, { opacity: 0, scale: 0.92, y: 16 }, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: 'power3.out'
    });
    gsap.fromTo([title, date, description], { opacity: 0, y: 10 }, {
        opacity: 1,
        y: 0,
        duration: 0.32,
        stagger: 0.08,
        ease: 'power3.out'
    });
    pulsePoint(pointEl);
    spawnModalEffect(data.theme);
}

// Step to the neighbouring memory without closing the dialog. The old
// content slides out the way the finger moved, the frame eases to the new
// photo's ratio, and the new content slides in from the other side.
function stepMemory(dir) {
    if (modalIndex < 0) return;
    const nextIndex = modalIndex + dir;
    const details = infoContent.querySelector('.info-details');
    if (nextIndex < 0 || nextIndex >= CONTENT.memories.length) {
        if (!prefersReduced()) {
            gsap.fromTo([infoImageFrame, details], { x: 0 }, {
                x: -dir * 14,
                duration: 0.12,
                ease: 'power2.out',
                yoyo: true,
                repeat: 1
            });
        }
        return;
    }

    const data = CONTENT.memories[nextIndex];
    const { image } = modalFields();
    const session = modalSession + 1;
    modalSession = session;
    modalIndex = nextIndex;
    syncTimelineToMemory(nextIndex);
    clearModalEffects();

    const swap = () => {
        fillModal(data);
        const ratio = photoRatio(data.image);
        if (ratio) infoImageFrame.style.setProperty('--ratio', String(ratio));
        applyModalImage(image, data.image, session);
    };

    if (prefersReduced()) {
        swap();
        return;
    }

    const parts = [infoImageFrame, details];
    gsap.killTweensOf(parts);
    const tl = gsap.timeline();
    tl.to(parts, { x: -dir * 60, opacity: 0, duration: 0.18, ease: 'power2.in' });
    tl.call(swap);
    tl.fromTo(parts, { x: dir * 60, opacity: 0 }, {
        x: 0,
        opacity: 1,
        duration: 0.3,
        stagger: 0.04,
        ease: 'power3.out',
        immediateRender: false
    });
    tl.call(() => {
        if (session === modalSession) spawnModalEffect(data.theme);
        pulsePoint(timelinePointAt(nextIndex));
    });
}

function calculateTimeDifference() {
    const now = new Date();
    const diff = Math.max(0, now - parseLocalDate(CONTENT.timer.start));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
}

const timerNodes = {
    days: document.getElementById('t-days'),
    hours: document.getElementById('t-hours'),
    minutes: document.getElementById('t-minutes'),
    seconds: document.getElementById('t-seconds')
};

// Only the unit that changed flips: the old value slides up and out while
// the new one rises in underneath it.
function setTimerValue(node, value, animate) {
    if (node.dataset.value === value) return;
    node.dataset.value = value;
    node.querySelectorAll('.timer-digit.is-leaving').forEach((el) => {
        gsap.killTweensOf(el);
        el.remove();
    });
    const prev = node.querySelector('.timer-digit');
    const next = document.createElement('span');
    next.className = 'timer-digit';
    next.textContent = value;
    node.appendChild(next);
    if (!prev) return;
    if (!animate || prefersReduced()) {
        prev.remove();
        return;
    }
    prev.classList.add('is-leaving');
    gsap.to(prev, {
        yPercent: -70,
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in',
        onComplete() {
            prev.remove();
        }
    });
    gsap.fromTo(next, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
}

function updateTimerDisplay(animate) {
    const time = calculateTimeDifference();
    setTimerValue(timerNodes.days, String(time.days), animate);
    setTimerValue(timerNodes.hours, String(time.hours).padStart(2, '0'), animate);
    setTimerValue(timerNodes.minutes, String(time.minutes).padStart(2, '0'), animate);
    setTimerValue(timerNodes.seconds, String(time.seconds).padStart(2, '0'), animate);
}

// ===== Anniversaries =====
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Whole calendar days between two local dates; rounding absorbs DST shifts.
function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}

function anniversaryOn(base, year) {
    const d = new Date(year, base.getMonth(), base.getDate());
    // Feb 29 in a non-leap year lands on Mar 1; keep it on Feb 28 instead.
    if (d.getMonth() !== base.getMonth()) return new Date(year, base.getMonth() + 1, 0);
    return d;
}

// Next yearly anniversary of every memory flagged `anniversary: true`.
// On the day itself it stays "today" (inDays 0); the day after, it rolls
// over to next year's count automatically.
function upcomingAnniversaries(now) {
    const today = startOfDay(now);
    const events = [];

    CONTENT.memories.filter((m) => m.anniversary).forEach((memory) => {
        const base = parseLocalDate(memory.date);
        let year = today.getFullYear();
        let date = anniversaryOn(base, year);
        if (date < today) {
            year += 1;
            date = anniversaryOn(base, year);
        }
        const n = year - base.getFullYear();
        if (n > 0) events.push({ date, label: `${memory.title} ${n} 週年` });
    });

    return events
        .map((e) => ({ ...e, inDays: daysBetween(today, e.date) }))
        .sort((a, b) => a.inDays - b.inDays);
}

function renderAnniversaries() {
    const events = upcomingAnniversaries(new Date());
    timerUpcoming.innerHTML = '';
    events.forEach((event) => {
        const li = document.createElement('li');
        li.className = 'timer-upcoming-item';
        if (event.inDays === 0) {
            li.classList.add('is-today');
            li.textContent = `🎉 今天是${event.label}！`;
        } else {
            const label = document.createElement('span');
            label.textContent = event.label;
            const days = document.createElement('span');
            days.className = 'timer-upcoming-days';
            days.textContent = `還有 ${event.inDays} 天`;
            li.append(label, days);
        }
        timerUpcoming.appendChild(li);
    });
    return events.some((event) => event.inDays === 0);
}

function spawnHeartRain() {
    if (prefersReduced()) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let i = 0; i < 36; i += 1) {
        const heart = document.createElement('div');
        heart.className = 'particle rain-heart';
        const size = 14 + Math.random() * 18;
        heart.style.width = `${size}px`;
        heart.style.height = `${size}px`;
        heart.style.left = `${Math.random() * width}px`;
        heart.style.top = `${-size}px`;
        heart.appendChild(createHeartSvg());
        particlesContainer.appendChild(heart);
        gsap.fromTo(heart, { y: 0, opacity: 0.9, rotation: (Math.random() - 0.5) * 40 }, {
            y: height + size * 2,
            x: (Math.random() - 0.5) * 80,
            rotation: (Math.random() - 0.5) * 160,
            duration: 2.6 + Math.random() * 1.6,
            delay: Math.random() * 1.8,
            ease: 'power1.in',
            onComplete() {
                heart.remove();
            }
        });
    }
}

function startTimer() {
    updateTimerDisplay(false);
    timerInterval = setInterval(() => updateTimerDisplay(true), 1000);
}

function enterTimer() {
    if (isAnimating) return;
    killTransition();
    isAnimating = true;

    if (prefersReduced()) {
        currentStage = 4;
        applyStageClass();
        snapIdleStageVisuals();
        startTimer();
        if (renderAnniversaries()) spawnHeartRain();
        updateHint();
        isAnimating = false;
        return;
    }

    gsap.set(timelineScroller, { opacity: 1 });
    gsap.set(timerContainer, { opacity: 0 });

    const tl = gsap.timeline({
        onComplete() {
            activeTimeline = null;
            currentStage = 4;
            applyStageClass();
            snapIdleStageVisuals();
            startTimer();
            if (renderAnniversaries()) spawnHeartRain();
            updateHint();
            isAnimating = false;
        }
    });
    activeTimeline = tl;
    tl.to(timelineScroller, { opacity: 0, duration: 0.35, ease: 'power3.out' }, 0);
    tl.to(timerContainer, { opacity: 1, duration: 0.5, ease: 'power3.out' }, 0.2);
}

function resetToStart() {
    if (isAnimating) return;
    const fromStage = currentStage;
    killTransition();
    isAnimating = true;

    const finish = () => {
        currentStage = 0;
        applyStageClass();
        snapIdleStageVisuals();
        initializeSmallHearts();
        updateHint();
        isAnimating = false;
    };

    if (prefersReduced()) {
        finish();
        return;
    }

    if (fromStage === 4) gsap.set(timerContainer, { opacity: 1 });
    if (fromStage === 3) {
        gsap.set(timelineScroller, { opacity: 1 });
        gsap.set(timelineContinue, { opacity: 1 });
    }

    const tl = gsap.timeline({
        onComplete() {
            activeTimeline = null;
            finish();
        }
    });
    activeTimeline = tl;
    tl.to([timerContainer, timelineScroller, timelineContinue, heartWrapper, centerGlow, message], {
        opacity: 0,
        duration: 0.4,
        ease: 'power3.out'
    });
}

function applyContent() {
    document.querySelector('.timer-title').textContent = CONTENT.timer.title;
    document.querySelector('.timer-message').textContent = CONTENT.timer.footer;
}

function onViewportChange() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (currentStage === 0 && !isAnimating) relayoutSmallHearts();
        else if (currentStage === 3) refreshTimelineLayout();
    }, 120);
}

function isChromeControl(target) {
    return Boolean(target.closest('button, .timeline-point, .info-modal'));
}

// ===== Firework easter egg =====
// Long-press the big heart for 1.5s in Stage 1 or 2. While held the heart
// brightens and trembles; letting go early (or moving) cancels and the
// release counts as a normal tap.
function secretLines() {
    const lines = CONTENT.secret && Array.isArray(CONTENT.secret.lines) ? CONTENT.secret.lines : [];
    return lines.map((line) => (typeof line === 'string' ? { text: line } : line)).filter((l) => l.text);
}

function canChargeFirework() {
    return window.Firework && !isAnimating && !fireworkActive
        && (currentStage === 1 || currentStage === 2) && secretLines().length > 0;
}

function resetChargeVisual() {
    heartWrapper.classList.remove('is-charging');
    gsap.killTweensOf(heartVisual);
    gsap.set(heartVisual, { clearProps: 'scale,x,filter' });
}

function cancelLongPress() {
    if (!longPress) return;
    clearTimeout(longPress.timer);
    if (longPress.tween) longPress.tween.kill();
    if (longPress.shake) longPress.shake.kill();
    longPress = null;
    resetChargeVisual();
}

function beginLongPress(event) {
    if (!canChargeFirework()) return;
    // Unlocks Web Audio inside the user gesture so the boom can play later.
    window.Firework.primeAudio();
    heartWrapper.classList.add('is-charging');
    const lp = { x: event.clientX, y: event.clientY, id: event.pointerId };
    if (!prefersReduced()) {
        lp.tween = gsap.to(heartVisual, {
            scale: 1.08,
            filter: 'brightness(1.35) drop-shadow(0 0 28px rgba(255, 190, 120, 0.9))',
            duration: CONFIG.longPressMs / 1000,
            ease: 'power1.in'
        });
        lp.shake = gsap.fromTo(heartVisual, { x: -1 }, {
            x: 1,
            duration: 0.05,
            repeat: -1,
            yoyo: true,
            ease: 'none'
        });
    }
    lp.timer = setTimeout(() => {
        cancelLongPress();
        suppressPointerId = lp.id;
        launchFirework();
    }, CONFIG.longPressMs);
    longPress = lp;
}

function launchFirework() {
    if (!canChargeFirework()) return;
    fireworkActive = true;
    isAnimating = true;
    cancelHintTimeout();
    gsap.to(hintElement, { opacity: 0, duration: 0.2 });
    const rect = heartWrapper.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.15 };
    const reduced = prefersReduced();

    if (!reduced) {
        gsap.fromTo(heartVisual, { y: 0 }, {
            y: 14,
            duration: 0.15,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
            onComplete() {
                gsap.set(heartVisual, { clearProps: 'y' });
            }
        });
    }

    window.Firework.play({
        origin,
        scene: container,
        reduced,
        lines: secretLines(),
        onDone: finishFirework
    });
}

function finishFirework() {
    fireworkActive = false;
    isAnimating = false;
    // Back on the ground in the same stage; the story carries on unchanged.
    snapIdleStageVisuals();
    updateHint();
}

function stopFirework() {
    cancelLongPress();
    if (fireworkActive && window.Firework) window.Firework.stop();
    fireworkActive = false;
}

// ===== Events =====
heartWrapper.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    beginLongPress(event);
});

document.addEventListener('pointermove', (event) => {
    if (!longPress || event.pointerId !== longPress.id) return;
    if (Math.hypot(event.clientX - longPress.x, event.clientY - longPress.y) > CONFIG.longPressSlop) {
        cancelLongPress();
    }
});

document.addEventListener('pointercancel', (event) => {
    cancelLongPress();
    if (event.pointerId === suppressPointerId) suppressPointerId = null;
});
heartWrapper.addEventListener('contextmenu', (event) => event.preventDefault());

document.addEventListener('pointerup', (event) => {
    if (event.button !== 0) return;
    cancelLongPress();
    // The release that completed a long-press must not also advance a stage.
    if (event.pointerId === suppressPointerId) {
        suppressPointerId = null;
        return;
    }
    if (fireworkActive) {
        if (window.Firework.isWaiting()) window.Firework.dismiss();
        return;
    }
    if (!event.target.closest('.info-modal')) {
        spawnTapHearts(event.clientX, event.clientY, event.pointerType);
    }
    if (isAnimating) return;
    if (isChromeControl(event.target)) return;
    if (currentStage === 0) gatherHearts();
    else if (currentStage === 1) explodeHearts();
    else if (currentStage === 2) enterTimeline();
});

infoClose.addEventListener('click', (event) => {
    event.stopPropagation();
    closeInfoModal();
});

infoModal.addEventListener('click', (event) => {
    if (event.target === infoModal) closeInfoModal();
});

infoPrev.addEventListener('click', (event) => {
    event.stopPropagation();
    stepMemory(-1);
});

infoNext.addEventListener('click', (event) => {
    event.stopPropagation();
    stepMemory(1);
});

// Horizontal swipe on the card steps between memories; mostly-vertical
// drags are left alone.
infoContent.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    modalSwipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
});

infoContent.addEventListener('pointerup', (event) => {
    if (!modalSwipe || modalSwipe.id !== event.pointerId) return;
    const dx = event.clientX - modalSwipe.x;
    const dy = event.clientY - modalSwipe.y;
    modalSwipe = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    stepMemory(dx < 0 ? 1 : -1);
});

infoContent.addEventListener('pointercancel', () => {
    modalSwipe = null;
});

let scrollerGesture = null;

timelineScroller.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    scrollerGesture = {
        x: event.clientX,
        y: event.clientY,
        scroll: timelineScroller.scrollTop
    };
});

timelineScroller.addEventListener('click', (event) => {
    if (currentStage !== 3) return;
    if (infoModal.classList.contains('show')) return;
    if (isChromeControl(event.target)) return;
    if (!scrollerGesture) return;
    const moved = Math.hypot(event.clientX - scrollerGesture.x, event.clientY - scrollerGesture.y);
    const scrolled = Math.abs(timelineScroller.scrollTop - scrollerGesture.scroll);
    scrollerGesture = null;
    if (moved > 8 || scrolled > 8) return;
    if (Math.abs(event.clientX - (window.innerWidth / 2)) < 140) return;
    resetToStart();
});

timelineScroller.addEventListener('scroll', () => {
    if (currentStage !== 3 || lineFrame) return;
    lineFrame = window.requestAnimationFrame(syncTimelineLine);
}, { passive: true });

timelineContinue.addEventListener('click', (event) => {
    event.stopPropagation();
    if (currentStage === 3) enterTimer();
});

timerRestart.addEventListener('click', (event) => {
    event.stopPropagation();
    resetToStart();
});

timerContainer.addEventListener('click', (event) => {
    if (event.target === timerContainer && currentStage === 4) resetToStart();
});

document.addEventListener('keydown', (event) => {
    if (!infoModal.classList.contains('show')) return;
    if (event.key === 'Escape') closeInfoModal();
    else if (event.key === 'Tab') trapModalFocus(event);
    else if (event.key === 'ArrowLeft') stepMemory(-1);
    else if (event.key === 'ArrowRight') stepMemory(1);
});

window.addEventListener('resize', onViewportChange);
window.addEventListener('orientationchange', onViewportChange);

// ===== Init =====
function init() {
    applyContent();
    preloadSiteAssets();
    currentStage = 0;
    applyStageClass();
    snapIdleStageVisuals();
    initializeSmallHearts();
    hintTimeout = setTimeout(() => {
        hintElement.textContent = CONFIG.hints[0];
        if (prefersReduced()) {
            gsap.set(hintElement, { opacity: 1, y: 0 });
        } else {
            gsap.to(hintElement, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
        }
    }, 400);
}

init();

console.log('%c❤️ Made with love', 'color: #ff6b9d; font-size: 20px; font-weight: bold;');
console.log('%cFive stages: Scattered → Gathered → Exploded → Timeline → Timer', 'color: #c23866; font-size: 14px;');
