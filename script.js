// ===== Configuration =====
const CONFIG = {
    // Stage 0: Scattered small hearts
    smallHeartCount: 12,
    smallHeartSize: 40, // px

    // Stage 1: Gathering animation
    gatherDuration: 1000, // 1 second

    // Stage 2: Explosion
    particleCount: 12,
    particleDuration: 1500,
    messageDuration: 2000,
    clickCooldown: 600,

    // Hints
    hints: {
        stage0: '點擊匯聚愛心 ❤️',
        stage1: '再點一次看魔法 ✨',
        stage2: '點擊查看我們的時光 ⏰',
        stage3: '點擊愛心查看回憶 💕',
        stage4: ''
    },

    // Stage 4: Together Timer
    startDate: new Date('2020-12-19T00:00:00'),

    // V8: Timeline configuration (all points enabled)
    currentVersionIndex: 4, // V8 is the fifth timeline point (index 4)
    timelineData: [
        {
            version: 'V4',
            date: new Date('2020-12-19'),
            title: '在一起',
            description: '',
            image: 'photos/1.jpg'
        },
        {
            version: 'V5',  // 開放此時間點
            date: new Date('2021-02-12'),
            title: '一起的手環',
            description: '',
            image: 'photos/2.jpg'
        },
        {
            version: 'V6',  // 開放此時間點
            date: new Date('2022-09-24'),
            title: '住在一起',
            description: '',
            image: 'photos/3.jpg'
        },
        {
            version: 'V7',  // 開放此時間點
            date: new Date('2023-08-01'),
            title: '米漿/小貓',
            description: '',
            image: 'photos/4.jpg'
        },
        {
            version: 'V8',  // 開放此時間點
            date: new Date('2024-12-12'),
            title: '結婚',
            description: '',
            image: 'photos/5.jpg'
        }
    ]
};

// ===== Helper: Format Date =====
function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// ===== State Management =====
let currentStage = 0; // 0: scattered, 1: gathered, 2: exploded, 3: timeline
let isAnimating = false;
let smallHearts = [];

// ===== DOM Elements =====
const container = document.querySelector('.container');
const heartWrapper = document.querySelector('.heart-wrapper');
const heart = document.querySelector('.heart');
const message = document.querySelector('.message');
const particlesContainer = document.querySelector('.particles-container');
const smallHeartsContainer = document.querySelector('.small-hearts-container');
const hintElement = document.querySelector('.hint');

// V4: Timeline elements
const timelineContainer = document.querySelector('.timeline-container');
const timelinePoints = document.querySelector('.timeline-points');
const infoModal = document.querySelector('.info-modal');
const infoClose = document.querySelector('.info-close');

// Stage 4: Timer elements
const timerContainer = document.querySelector('.timer-container');
const timerRestart = document.querySelector('.timer-restart');
const timelineContinue = document.querySelector('.timeline-continue');
let timerInterval = null;

// ===== Heart SVG Path =====
const heartPath = 'M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,21.2c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z';

// ===== Create Small Heart Element =====
function createSmallHeart() {
    const heartDiv = document.createElement('div');
    heartDiv.className = 'small-heart';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 29.6');

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', `smallHeartGradient-${Date.now()}-${Math.random()}`);
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
    path.setAttribute('fill', `url(#${gradient.id})`);

    svg.appendChild(path);
    heartDiv.appendChild(svg);

    return heartDiv;
}

// ===== Initialize Small Hearts (Stage 0) =====
function initializeSmallHearts() {
    smallHeartsContainer.innerHTML = '';
    smallHearts = [];

    const padding = 80; // Padding from edges
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    for (let i = 0; i < CONFIG.smallHeartCount; i++) {
        const smallHeart = createSmallHeart();

        // Random position (avoid edges)
        const x = padding + Math.random() * (viewportWidth - padding * 2);
        const y = padding + Math.random() * (viewportHeight - padding * 2);

        smallHeart.style.left = `${x}px`;
        smallHeart.style.top = `${y}px`;

        // Store initial position for gathering animation
        smallHeart.dataset.initialX = x;
        smallHeart.dataset.initialY = y;

        smallHeartsContainer.appendChild(smallHeart);
        smallHearts.push(smallHeart);
    }
}

// ===== Gather Hearts to Center (Stage 0 → Stage 1) =====
function gatherHearts() {
    if (isAnimating) return;
    isAnimating = true;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    smallHearts.forEach((smallHeart, index) => {
        const rect = smallHeart.getBoundingClientRect();
        const currentX = rect.left + rect.width / 2;
        const currentY = rect.top + rect.height / 2;

        const deltaX = centerX - currentX;
        const deltaY = centerY - currentY;

        smallHeart.style.setProperty('--gather-x', `${deltaX}px`);
        smallHeart.style.setProperty('--gather-y', `${deltaY}px`);

        smallHeart.classList.add('gathering');

        // Start animation with slight delay for wave effect
        setTimeout(() => {
            smallHeart.style.animation = `gatherToCenter ${CONFIG.gatherDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
        }, index * 30);
    });

    // After gathering completes, show big heart
    setTimeout(() => {
        currentStage = 1;
        updateStage();
        isAnimating = false;
    }, CONFIG.gatherDuration + CONFIG.smallHeartCount * 30);
}

// ===== Create Particle Element (for explosion) =====
function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 29.6');

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', `particleGradient-${Date.now()}-${Math.random()}`);
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
    path.setAttribute('fill', `url(#${gradient.id})`);

    svg.appendChild(path);
    particle.appendChild(svg);

    return particle;
}

// ===== Animate Particles (explosion) =====
function animateParticles() {
    const heartRect = heart.getBoundingClientRect();
    const centerX = heartRect.left + heartRect.width / 2;
    const centerY = heartRect.top + heartRect.height / 2;

    for (let i = 0; i < CONFIG.particleCount; i++) {
        const particle = createParticle();
        particlesContainer.appendChild(particle);

        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;

        const angle = (Math.PI * 2 * i) / CONFIG.particleCount + (Math.random() - 0.5) * 0.5;
        const distance = 200 + Math.random() * 300;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        particle.style.animation = `particleFloat ${CONFIG.particleDuration}ms ease-out forwards`;

        setTimeout(() => {
            particle.remove();
        }, CONFIG.particleDuration);
    }
}

// ===== Show Message =====
function showMessage() {
    message.classList.add('show');

    setTimeout(() => {
        message.classList.remove('show');
    }, CONFIG.messageDuration);
}

// ===== Create Ripple Effect =====
function createRipple() {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    document.body.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 2000);
}

// ===== Explode Hearts (Stage 1 → Stage 2) =====
function explodeHearts() {
    if (isAnimating) return;
    isAnimating = true;

    heartWrapper.classList.add('clicked');

    animateParticles();
    createRipple();
    showMessage();

    setTimeout(() => {
        heartWrapper.classList.remove('clicked');
    }, CONFIG.clickCooldown);

    setTimeout(() => {
        currentStage = 2;
        updateStage();
        isAnimating = false;
    }, CONFIG.clickCooldown);
}

// ===== Reset to Stage 0 =====
function resetToScattered() {
    if (isAnimating) return;
    isAnimating = true;

    // Fade out big heart
    heartWrapper.style.transition = 'opacity 0.4s, transform 0.4s';
    heartWrapper.style.opacity = '0';
    heartWrapper.style.transform = 'scale(0.5)';

    setTimeout(() => {
        currentStage = 0;
        updateStage();
        initializeSmallHearts();

        // Reset big heart style
        heartWrapper.style.opacity = '';
        heartWrapper.style.transform = '';

        isAnimating = false;
    }, 400);
}

// ===== V4: Enter Timeline Mode (Stage 2 → Stage 3) =====
function enterTimeline() {
    if (isAnimating) return;
    isAnimating = true;

    // Calculate target position for the heart based on current version
    const targetIndex = CONFIG.currentVersionIndex;
    const timelineHeight = window.innerHeight * 0.7; // 70vh
    const timelineTop = (window.innerHeight - timelineHeight) / 2;
    const pointCount = CONFIG.timelineData.length;

    // Calculate Y position for this version's timeline point
    // Timeline points are positioned with top, and vertically centered with transform
    const pointY = timelineTop + (timelineHeight / (pointCount - 1)) * targetIndex;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Calculate movement delta (no X movement since we stay centered)
    const deltaX = 0;
    const deltaY = pointY - centerY;

    // Animate big heart: shrink and move to timeline position
    // Timeline point width is 50px, so scale to match: 50/300 ≈ 0.167
    heartWrapper.style.transition = 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
    heartWrapper.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.167)`;

    // After heart animation, hide heart and show timeline
    setTimeout(() => {
        // Hide the moved heart to avoid overlap with timeline point
        heartWrapper.style.opacity = '0';

        generateTimelinePoints();
        timelineContainer.classList.add('show');
        currentStage = 3;
        updateStage();
        isAnimating = false;
    }, 1000);
}

// ===== V4: Generate Timeline Points =====
function generateTimelinePoints() {
    timelinePoints.innerHTML = '';

    const timelineHeight = window.innerHeight * 0.7; // Match CSS 70vh
    const pointCount = CONFIG.timelineData.length;

    CONFIG.timelineData.forEach((data, index) => {
        // Calculate vertical position (evenly distributed)
        const y = (timelineHeight / (pointCount - 1)) * index;

        // Determine if this point should be on left or right (alternating)
        const isLeft = index % 2 === 1;

        // Create timeline point
        const point = createTimelinePoint(data, y, isLeft, index);
        timelinePoints.appendChild(point);
    });
}

// ===== V4: Create Timeline Point Element =====
function createTimelinePoint(data, y, isLeft, index) {
    const pointDiv = document.createElement('div');
    pointDiv.className = 'timeline-point';
    if (isLeft) {
        pointDiv.classList.add('left');
    }
    pointDiv.style.top = `${y}px`;

    // Create heart SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 29.6');

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', `timelineGradient-${index}`);
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
    path.setAttribute('fill', `url(#timelineGradient-${index})`);

    svg.appendChild(path);
    pointDiv.appendChild(svg);

    // Determine if this point is enabled
    const isEnabled = data.version !== '敬請期待';

    // Create label: enabled points show date, disabled show "敬請期待"
    const label = document.createElement('div');
    label.className = 'timeline-label';
    label.textContent = isEnabled ? formatDate(data.date) : data.version;
    pointDiv.appendChild(label);

    // Add interactivity based on enabled state
    if (isEnabled) {
        // Enabled point: add click event
        pointDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            showInfoModal(data);
        });
    } else {
        // Disabled point: add disabled class
        pointDiv.classList.add('disabled');
    }

    return pointDiv;
}

// ===== V4: Show Info Modal =====
function showInfoModal(data) {
    const image = infoModal.querySelector('.info-image');
    const title = infoModal.querySelector('.info-title');
    const date = infoModal.querySelector('.info-date');
    const description = infoModal.querySelector('.info-description');

    // Fill data
    image.src = data.image;
    image.alt = data.title;
    title.textContent = data.title;
    date.textContent = formatDate(data.date);
    description.textContent = data.description;

    // Show modal
    infoModal.classList.add('show');
}

// ===== V4: Close Info Modal =====
function closeInfoModal() {
    infoModal.classList.remove('show');
}

// ===== Stage 4: Timer Functions =====
function calculateTimeDifference() {
    const now = new Date();
    const diff = now - CONFIG.startDate;

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
    // Initial update
    updateTimerDisplay();

    // Update every second
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ===== Stage 4: Enter Timer (Stage 3 → Stage 4) =====
function enterTimer() {
    if (isAnimating) return;
    isAnimating = true;

    // Hide timeline
    timelineContainer.classList.remove('show');

    setTimeout(() => {
        currentStage = 4;
        updateStage();
        timerContainer.classList.add('show');
        startTimer();
        isAnimating = false;
    }, 600);
}

// ===== Stage 4: Reset from Timer (Stage 4 → Stage 0) =====
function resetFromTimer() {
    if (isAnimating) return;
    isAnimating = true;

    // Stop timer
    stopTimer();

    // Hide timer container
    timerContainer.classList.remove('show');

    // Reset heart position
    heartWrapper.style.transition = 'all 0.8s ease';
    heartWrapper.style.transform = '';
    heartWrapper.style.opacity = '0';

    setTimeout(() => {
        currentStage = 0;
        updateStage();
        initializeSmallHearts();

        // Reset heart styles
        heartWrapper.style.opacity = '';

        isAnimating = false;
    }, 800);
}

// ===== V4: Reset from Timeline (Stage 3 → Stage 0) =====
function resetFromTimeline() {
    if (isAnimating) return;
    isAnimating = true;

    // Hide timeline
    timelineContainer.classList.remove('show');

    // Reset big heart position and scale
    heartWrapper.style.transition = 'all 0.8s ease';
    heartWrapper.style.transform = '';
    heartWrapper.style.opacity = '0';

    setTimeout(() => {
        currentStage = 0;
        updateStage();
        initializeSmallHearts();

        // Reset heart styles
        heartWrapper.style.opacity = '';

        isAnimating = false;
    }, 800);
}

// ===== Update Stage (UI and hints) =====
function updateStage() {
    // Update container class
    container.className = 'container';
    container.classList.add(`stage-${currentStage}`);

    // Update hint text
    let hintText = '';
    switch (currentStage) {
        case 0:
            hintText = CONFIG.hints.stage0;
            break;
        case 1:
            hintText = CONFIG.hints.stage1;
            break;
        case 2:
            hintText = CONFIG.hints.stage2;
            break;
        case 3:
            hintText = CONFIG.hints.stage3;
            break;
        case 4:
            hintText = CONFIG.hints.stage4;
            break;
    }

    // Fade out, change text, fade in
    hintElement.classList.remove('show');
    setTimeout(() => {
        hintElement.textContent = hintText;
        if (currentStage !== 3) {
            hintElement.classList.add('show');
        }
    }, 200);
}

// ===== Main Click Handler =====
function handleClick(e) {
    // Prevent clicks during animation
    if (isAnimating) return;

    switch (currentStage) {
        case 0:
            // Stage 0: Gather small hearts
            gatherHearts();
            break;
        case 1:
            // Stage 1: Explode big heart
            explodeHearts();
            break;
        case 2:
            // Stage 2: Enter timeline
            enterTimeline();
            break;
        // Stage 3 and 4: Handled by specific buttons (continue button, restart button)
        // No action needed in handleClick
    }
}

// ===== Event Listeners =====
// Click on small hearts (stage 0)
smallHeartsContainer.addEventListener('click', (e) => {
    if (currentStage === 0) {
        handleClick(e);
    }
});

// Click on big heart (stage 1 and 2)
heartWrapper.addEventListener('click', (e) => {
    if (currentStage === 1 || currentStage === 2) {
        handleClick(e);
    }
});

// Touch support for mobile
smallHeartsContainer.addEventListener('touchstart', (e) => {
    if (currentStage === 0) {
        e.preventDefault();
        handleClick(e);
    }
}, { passive: false });

heartWrapper.addEventListener('touchstart', (e) => {
    if (currentStage === 1 || currentStage === 2) {
        e.preventDefault();
        handleClick(e);
    }
}, { passive: false });

// ===== V4: Timeline Event Listeners =====
// Close info modal
infoClose.addEventListener('click', closeInfoModal);

// Click modal background to close
infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) {
        closeInfoModal();
    }
});

// Click timeline background to reset (Stage 3)
timelineContainer.addEventListener('click', (e) => {
    if (e.target === timelineContainer && currentStage === 3) {
        resetFromTimeline();
    }
});

// Click timer restart button to reset (Stage 4)
timerRestart.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFromTimer();
});

// Click timer container background to reset (Stage 4)
timerContainer.addEventListener('click', (e) => {
    if (e.target === timerContainer && currentStage === 4) {
        resetFromTimer();
    }
});

// Click continue button to enter timer (Stage 3 -> Stage 4)
timelineContinue.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentStage === 3) {
        enterTimer();
    }
});

// ===== Keyboard Accessibility =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(e);
    }
});

// ===== Initialize =====
function init() {
    // Set initial stage
    currentStage = 0;
    updateStage();

    // Create small hearts
    initializeSmallHearts();

    // Show hint after a brief delay
    setTimeout(() => {
        hintElement.classList.add('show');
    }, 500);
}

// Start the experience
init();

// ===== Console Easter Egg =====
console.log('%c❤️ Made with love - V5 Edition', 'color: #ff6b9d; font-size: 20px; font-weight: bold;');
console.log('%cFive stages of love: Scattered → Gathered → Exploded → Timeline → Timer 💕', 'color: #c23866; font-size: 14px;');

