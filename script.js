// ===== Content & configuration =====
const CONTENT = window.CONTENT;

if (!CONTENT || !Array.isArray(CONTENT.memories) || !CONTENT.timer) {
    throw new Error('content.js must define window.CONTENT before script.js');
}

const CONFIG = {
    smallHeartCount: 12,
    particleCount: 12,
    particleDuration: 1.5,
    messageDuration: 2,
    gatherDuration: 0.85,
    gatherStagger: 0.04,
    currentVersionIndex: 4,
    hints: {
        0: '點擊匯聚愛心 ❤️',
        1: '再點一次看魔法 ✨',
        2: '點擊查看我們的時光 ⏰',
        3: '',
        4: ''
    }
};

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const heartPath = 'M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,21.2c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z';
const CONFETTI_COLORS = ['#d4af37', '#f5e6a3', '#c9a227', '#ffe082', '#e8c547'];

function prefersReduced() {
    return reducedMotionQuery.matches;
}

function parseLocalDate(value) {
    return new Date(value);
}

function formatDate(date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function targetMemoryIndex() {
    const byId = CONTENT.memories.findIndex((item) => item.id === 'wedding');
    if (byId >= 0) return byId;
    if (CONFIG.currentVersionIndex < CONTENT.memories.length) {
        return CONFIG.currentVersionIndex;
    }
    return CONTENT.memories.length - 1;
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

// ===== DOM =====
const container = document.querySelector('.container');
const heartWrapper = document.querySelector('.heart-wrapper');
const heartVisual = document.querySelector('.heart-visual');
const message = document.querySelector('.message');
const particlesContainer = document.querySelector('.particles-container');
const smallHeartsContainer = document.querySelector('.small-hearts-container');
const hintElement = document.querySelector('.hint');
const centerGlow = document.querySelector('.center-glow');
const timelineBackdrop = document.querySelector('.timeline-backdrop');
const timelineContainer = document.querySelector('.timeline-container');
const timelineLine = document.querySelector('.timeline-line');
const timelinePoints = document.querySelector('.timeline-points');
const timelineContinue = document.querySelector('.timeline-continue');
const infoModal = document.querySelector('.info-modal');
const infoContent = document.querySelector('.info-content');
const infoClose = document.querySelector('.info-close');
const modalConfetti = document.querySelector('.modal-confetti');
const timerContainer = document.querySelector('.timer-container');
const timerRestart = document.querySelector('.timer-restart');

const motionNodes = [
    heartWrapper,
    heartVisual,
    timelineContainer,
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

function clearWeddingConfetti() {
    if (!modalConfetti) return;
    gsap.killTweensOf(modalConfetti.children);
    modalConfetti.innerHTML = '';
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function closeInfoModal(immediate) {
    clearWeddingConfetti();
    infoContent.classList.remove('theme-blush', 'theme-gold', 'theme-warm');
    if (immediate || prefersReduced() || !infoModal.classList.contains('show')) {
        infoModal.classList.remove('show');
        gsap.set(infoContent, { clearProps: 'transform,opacity,x,y,scale' });
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
    gsap.set(motionNodes, { clearProps: 'transform,opacity,x,y,scale,rotation,filter' });
    cancelHintTimeout();
    closeInfoModal(true);
    clearParticles();
    clearRipples();
    stopTimer();
    clearWeddingConfetti();
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
        gsap.set(timelineContainer, { opacity: 0 });
        gsap.set(timelineContinue, { opacity: 0 });
        gsap.set(timerContainer, { opacity: 0 });
        gsap.set(message, { opacity: 0 });
    } else if (currentStage === 1 || currentStage === 2) {
        gsap.set(heartWrapper, { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0 });
        gsap.set(centerGlow, { opacity: currentStage === 1 ? 0.7 : 0 });
        gsap.set(timelineContainer, { opacity: 0 });
        gsap.set(timelineContinue, { opacity: 0 });
        gsap.set(timerContainer, { opacity: 0 });
    } else if (currentStage === 3) {
        gsap.set(heartWrapper, { opacity: 0 });
        gsap.set(centerGlow, { opacity: 0 });
        gsap.set(timelineContainer, { opacity: 1 });
        gsap.set(timelineContinue, { opacity: 1 });
        gsap.set(timerContainer, { opacity: 0 });
        gsap.set(timelineLine, { scaleY: 1 });
        gsap.set('.timeline-point-visual', { opacity: 1, scale: 1 });
    } else if (currentStage === 4) {
        gsap.set(heartWrapper, { opacity: 0 });
        gsap.set(centerGlow, { opacity: 0 });
        gsap.set(timelineContainer, { opacity: 0 });
        gsap.set(timelineContinue, { opacity: 0 });
        gsap.set(timerContainer, { opacity: 1 });
    }
}

// ===== Hearts =====
function createHeartSvg(idPrefix) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 29.6');

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    const gradientId = `${idPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    gradient.setAttribute('id', gradientId);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('style', 'stop-color:#ff6b9d;stop-opacity:1');

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('style', 'stop-color:#c23866;stop-opacity:1');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', heartPath);
    path.setAttribute('fill', `url(#${gradientId})`);
    svg.appendChild(path);
    return svg;
}

function createSmallHeart() {
    const outer = document.createElement('div');
    outer.className = 'small-heart';

    const visual = document.createElement('div');
    visual.className = 'small-heart-visual';

    const svg = createHeartSvg('smallHeartGradient');
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

function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.appendChild(createHeartSvg('particleGradient'));
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

// ===== Stage transitions =====
function gatherHearts() {
    if (isAnimating) return;
    killTransition();
    isAnimating = true;
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
    message.textContent = text;
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
    tl.fromTo(message, { opacity: 0, scale: 0.86 }, {
        opacity: 1,
        scale: 1,
        duration: 0.4,
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

function generateTimelinePoints() {
    timelinePoints.innerHTML = '';
    const height = timelineContainer.getBoundingClientRect().height || window.innerHeight * 0.7;
    const list = CONTENT.memories;

    list.forEach((data, index) => {
        const y = list.length === 1 ? height / 2 : (height / (list.length - 1)) * index;
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
    const svg = createHeartSvg(`timelineGradient-${index}`);
    visual.appendChild(svg);
    pointDiv.appendChild(visual);

    const label = document.createElement('div');
    label.className = 'timeline-label';
    label.textContent = formatDate(parseLocalDate(data.date));
    pointDiv.appendChild(label);

    const open = () => showInfoModal(data, pointDiv);
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

function enterTimeline() {
    if (isAnimating) return;
    killTransition();
    isAnimating = true;

    generateTimelinePoints();
    const targetIndex = targetMemoryIndex();
    const targetPoint = timelinePoints.querySelector(`[data-index="${targetIndex}"]`);
    const visuals = [...timelinePoints.querySelectorAll('.timeline-point-visual')];
    const targetVisual = targetPoint ? targetPoint.querySelector('.timeline-point-visual') : null;

    gsap.set(timelineContainer, { opacity: 1 });
    gsap.set(timelineLine, { scaleY: 0, transformOrigin: 'top center' });
    gsap.set(visuals, { opacity: 0, scale: 0.4 });
    gsap.set(timelineContinue, { opacity: 0 });
    gsap.set(heartWrapper, { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0 });

    if (prefersReduced() || !targetPoint) {
        currentStage = 3;
        applyStageClass();
        snapIdleStageVisuals();
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

    const tl = gsap.timeline({
        onComplete() {
            activeTimeline = null;
            gsap.set(heartWrapper, { opacity: 0 });
            gsap.set(visuals, { clearProps: 'scale' });
            currentStage = 3;
            applyStageClass();
            updateHint();
            isAnimating = false;
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
    tl.to(timelineLine, { scaleY: 1, duration: 0.55, ease: 'power3.out' }, 1.05);
    tl.to(visuals.filter((node) => node !== targetVisual), {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        stagger: 0.07,
        ease: 'back.out(1.4)'
    }, 1.18);
    tl.to(timelineContinue, { opacity: 1, duration: 0.35, ease: 'power3.out' }, 1.5);
}

function refreshTimelineLayout() {
    if (currentStage !== 3) return;
    generateTimelinePoints();
    gsap.set(timelineLine, { scaleY: 1 });
    gsap.set('.timeline-point-visual', { opacity: 1, clearProps: 'scale' });
}

function spawnWeddingConfetti() {
    if (prefersReduced()) return;
    clearWeddingConfetti();
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

function showInfoModal(data, pointEl) {
    const image = infoModal.querySelector('.info-image');
    const title = infoModal.querySelector('.info-title');
    const date = infoModal.querySelector('.info-date');
    const description = infoModal.querySelector('.info-description');

    image.src = data.image;
    image.alt = data.title;
    title.textContent = data.title;
    date.textContent = formatDate(parseLocalDate(data.date));
    description.textContent = data.body || '';

    infoContent.classList.remove('theme-blush', 'theme-gold', 'theme-warm');
    if (data.theme) infoContent.classList.add(`theme-${data.theme}`);
    infoModal.classList.add('show');

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

    const visual = pointEl && pointEl.querySelector('.timeline-point-visual');
    if (visual) {
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

    if (data.theme === 'gold') {
        spawnWeddingConfetti();
    }
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

function updateTimerDisplay() {
    const time = calculateTimeDifference();
    document.getElementById('t-days').textContent = time.days;
    document.getElementById('t-hours').textContent = String(time.hours).padStart(2, '0');
    document.getElementById('t-minutes').textContent = String(time.minutes).padStart(2, '0');
    document.getElementById('t-seconds').textContent = String(time.seconds).padStart(2, '0');
}

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
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
        updateHint();
        isAnimating = false;
        return;
    }

    gsap.set(timelineContainer, { opacity: 1 });
    gsap.set(timerContainer, { opacity: 0 });

    const tl = gsap.timeline({
        onComplete() {
            activeTimeline = null;
            currentStage = 4;
            applyStageClass();
            snapIdleStageVisuals();
            startTimer();
            updateHint();
            isAnimating = false;
        }
    });
    activeTimeline = tl;
    tl.to([timelineContainer, timelineContinue], { opacity: 0, duration: 0.35, ease: 'power3.out' }, 0);
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
        gsap.set(timelineContainer, { opacity: 1 });
        gsap.set(timelineContinue, { opacity: 1 });
    }

    const tl = gsap.timeline({
        onComplete() {
            activeTimeline = null;
            finish();
        }
    });
    activeTimeline = tl;
    tl.to([timerContainer, timelineContainer, timelineContinue, heartWrapper, centerGlow, message], {
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
    if (currentStage !== 3) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refreshTimelineLayout, 120);
}

function isChromeControl(target) {
    return Boolean(target.closest('button, .timeline-point, .info-modal'));
}

// ===== Events =====
document.addEventListener('pointerup', (event) => {
    if (event.button !== 0) return;
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

timelineBackdrop.addEventListener('click', () => {
    if (currentStage !== 3) return;
    if (infoModal.classList.contains('show')) return;
    resetToStart();
});

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
    if (event.key === 'Escape' && infoModal.classList.contains('show')) {
        closeInfoModal();
    }
});

window.addEventListener('resize', onViewportChange);
window.addEventListener('orientationchange', onViewportChange);

// ===== Init =====
function init() {
    applyContent();
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
