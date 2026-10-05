/*
 * ============================================================================
 * SEHRISH BIRTHDAY EXPERIENCE
 * Scene 10 — BALLOON SHOOTING GAME v3
 *
 * Full replacement for js/balloon-game.js.
 *
 * Design:
 * - 7 balloons on desktop; 5 balloons on phone-sized screens.
 * - Balloons enter from the TOP, settle slightly above the middle,
 *   remain readable for about 1.8 seconds, then softly leave.
 * - New balloons enter from changing horizontal positions.
 * - Small cute Page-2-inspired bow + ONE arrow only.
 * - Press/hold on the bow, pull, aim, release to shoot.
 * - Projectile follows the exact released direction.
 * - Wrong direction = balloon remains untouched.
 * - Correct hit = balloon pop + skyshot-style spark burst.
 * - 16 real hits unlock the existing next button.
 * - 30-second timer with warning colors and Try Again on timeout.
 * - Scene re-entry resets the game so it can be played again.
 *
 * No other page or asset is modified by this file.
 * ============================================================================
 */

'use strict';

(() => {
    const ROOT = '#balloon-game-arena';
    const SCENE = '#scene-9';
    const CONTAINER = '#balloon-container';
    const SCORE = '#balloon-score';
    const NEXT = '#balloon-next-button';
    const INSTRUCTION = '.balloon-game-instruction';
    const STYLE_ID = 'sehrish-balloon-v3-style';

    const CONFIG = Object.freeze({
        target: 16,
        visibleCount: 7,
        mobileVisibleCount: 5,
        minSize: 62,
        maxSize: 82,
        enterDuration: 620,
        visibleDuration: 1800,
        exitDuration: 520,
        replacementDelay: 180,
        minRise: 6,
        maxRise: 12,
        swayAmount: 18,
        swaySpeedMin: 0.75,
        swaySpeedMax: 1.18,
        projectileSpeed: 1080,
        projectileMaxDistance: 1700,
        minPull: 18,
        maxPull: 62,
        shooterBottom: 44,
        bowRadius: 24,
        bowWidth: 38,
        arrowLength: 73,
        hitRadiusFactor: 0.50,
        particleCount: 52,
        particleLife: 850
    });

    const PALETTE = Object.freeze([
        ['#f68daf', '#db5b87', '#ffd9e7'],
        ['#c1aaf6', '#9c83df', '#ece6ff'],
        ['#83dbc3', '#4eb89e', '#dff8ef'],
        ['#ffda78', '#efb947', '#fff2c8'],
        ['#f6b6d1', '#df8bb1', '#ffeaf3'],
        ['#a9d9f8', '#6fb5df', '#e4f5ff']
    ]);

    let instance = null;

    const clamp = (value, min, max) =>
        Math.max(min, Math.min(max, value));

    const rand = (min, max) =>
        min + Math.random() * (max - min);

    const randInt = (min, max) =>
        Math.floor(rand(min, max + 1));

    const lerp = (a, b, t) =>
        a + (b - a) * t;

    const easeOut = (t) =>
        1 - Math.pow(1 - clamp(t, 0, 1), 3);

    const easeInOut = (t) => {
        const x = clamp(t, 0, 1);
        return x < 0.5
            ? 4 * x * x * x
            : 1 - Math.pow(-2 * x + 2, 3) / 2;
    };

    function sceneIsVisible(scene) {
        if (!scene) {
            return false;
        }

        if (scene.getAttribute('aria-hidden') === 'true') {
            return false;
        }

        const style = getComputedStyle(scene);
        const rect = scene.getBoundingClientRect();

        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0
        );
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .scene--balloon-game #balloon-game-arena {
                position: relative !important;
                width: min(92vw, 650px) !important;
                height: clamp(330px, 54vh, 500px) !important;
                min-height: 330px !important;
                margin: 8px auto 0 !important;
                overflow: hidden !important;
                border-radius: 28px !important;
                isolation: isolate !important;
                touch-action: none !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                background:
                    radial-gradient(circle at 50% 25%, rgba(255,255,255,.98), transparent 40%),
                    linear-gradient(180deg, #fffdfd 0%, #f7fbff 58%, #eefaf6 100%) !important;
                border: 1px solid rgba(183,190,210,.16) !important;
                box-shadow:
                    inset 0 0 48px rgba(255,255,255,.8),
                    0 16px 42px rgba(95,98,129,.09) !important;
            }

            .scene--balloon-game #balloon-container {
                position: absolute !important;
                inset: 0 !important;
                z-index: 10 !important;
                overflow: hidden !important;
                pointer-events: none !important;
            }

            .scene--balloon-game #balloon-character,
            .scene--balloon-game #balloon-aim {
                display: none !important;
            }

            .scene--balloon-game .bbg-v3-canvas {
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 45 !important;
                pointer-events: none !important;
            }

            .scene--balloon-game .bbg-v3-balloon {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                outline: 0 !important;
                pointer-events: none !important;
                transform-origin: 50% 37% !important;
                will-change: transform, opacity !important;
                opacity: var(--bbg-opacity, 0) !important;
            }

            .scene--balloon-game .bbg-v3-body {
                position: absolute !important;
                left: 8% !important;
                top: 0 !important;
                width: 84% !important;
                height: 69% !important;
                border-radius: 51% 51% 46% 46% / 53% 53% 45% 45% !important;
                background:
                    radial-gradient(circle at 29% 20%, rgba(255,255,255,.97) 0 6%, transparent 7%),
                    radial-gradient(circle at 36% 28%, rgba(255,255,255,.28) 0 14%, transparent 15%),
                    linear-gradient(142deg, var(--bbg-light) 0%, var(--bbg-main) 42%, var(--bbg-dark) 100%) !important;
                border: 2px solid rgba(255,255,255,.9) !important;
                box-shadow:
                    inset -9px -12px 16px rgba(116,70,102,.13),
                    inset 8px 7px 14px rgba(255,255,255,.26),
                    0 10px 20px rgba(109,106,137,.13) !important;
            }

            .scene--balloon-game .bbg-v3-body::after {
                content: "" !important;
                position: absolute !important;
                left: 51% !important;
                bottom: -5px !important;
                width: 9px !important;
                height: 11px !important;
                transform: translateX(-50%) rotate(1deg) !important;
                background: var(--bbg-dark) !important;
                clip-path: polygon(0 0, 100% 0, 50% 100%) !important;
            }

            .scene--balloon-game .bbg-v3-shine {
                position: absolute !important;
                left: 25% !important;
                top: 11% !important;
                width: 12% !important;
                height: 23% !important;
                border-radius: 999px !important;
                background: rgba(255,255,255,.75) !important;
                transform: rotate(20deg) !important;
            }

            .scene--balloon-game .bbg-v3-string {
                position: absolute !important;
                left: 50% !important;
                top: 68% !important;
                width: 2px !important;
                height: 34% !important;
                border-radius: 999px !important;
                background: rgba(86,77,93,.25) !important;
                transform-origin: top center !important;
            }

            .scene--balloon-game .bbg-v3-timer {
                position: absolute !important;
                top: 12px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                z-index: 90 !important;
                min-width: 58px !important;
                padding: 6px 12px !important;
                border-radius: 999px !important;
                background: rgba(255,255,255,.94) !important;
                border: 1px solid rgba(255,190,214,.45) !important;
                box-shadow: 0 8px 20px rgba(95,98,129,.10) !important;
                text-align: center !important;
                font: 800 17px/1 'Baloo 2',sans-serif !important;
                color: #6f536b !important;
                pointer-events: none !important;
                transition: color 180ms ease, background 180ms ease !important;
            }

            .scene--balloon-game .bbg-v3-retry {
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 95 !important;
                border: 0 !important;
                border-radius: 999px !important;
                padding: 12px 22px !important;
                background: linear-gradient(135deg, #ff9fc4, #c9a5f5) !important;
                color: #fff !important;
                box-shadow: 0 12px 28px rgba(113,88,133,.20) !important;
                font: 800 17px/1 'Baloo 2',sans-serif !important;
                cursor: pointer !important;
                pointer-events: auto !important;
            }

            @media (max-width: 700px) {
                .scene--balloon-game #balloon-game-arena {
                    width: min(94vw, 650px) !important;
                    height: min(55vh, 430px) !important;
                    min-height: 300px !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    class BalloonGameV3 {
        constructor(root) {
            this.root = root;
            this.scene = root.closest(SCENE) || document.querySelector(SCENE);
            this.container = root.querySelector(CONTAINER);
            this.scoreEl = document.querySelector(SCORE) || null;
            this.nextButton = this.scene?.querySelector(NEXT) || null;
            this.instructionEl = this.scene?.querySelector(INSTRUCTION) || null;

            this.canvas = null;
            this.ctx = null;
            this.dpr = 1;

            this.running = false;
            this.completed = false;
            this.destroyed = false;
            this.wasVisible = false;
            this.reentryResetPending = false;

            this.balloons = new Map();
            this.popped = 0;
            this.spawnIndex = 0;
            this.spawnTimer = 0;

            this.pointerId = null;
            this.dragging = false;
            this.pointer = { x: 0, y: 0 };
            this.aimAngle = -Math.PI / 2;
            this.pull = 0;

            this.shooterX = 0;
            this.shooterY = 0;
            this.nockX = 0;
            this.nockY = 0;

            this.shot = null;
            this.particles = [];
            this.rings = [];

            this.raf = 0;
            this.lastFrame = 0;
            this.visibilityTimer = 0;

            this.timerEl = null;
            this.timerInterval = 0;
            this.timerSeconds = 30;
            
                        this.retryUI = null;
            this.retryButton = null;

this.observer = null;
            this.bound = false;
        }

        init() {
            if (!this.container || this.destroyed) {
                return;
            }

            injectStyles();
            this.container.innerHTML = '';
            this.createCanvas();
            this.bindEvents();
            this.prepareUI();
            this.observeScene();

            this.resize();

            const visible = sceneIsVisible(this.scene);
            this.wasVisible = visible;

            if (visible) {
                this.resetAndStart();
            }

            this.visibilityTimer = window.setInterval(() => {
                if (this.destroyed || !this.scene) {
                    return;
                }

                const nowVisible = sceneIsVisible(this.scene);

                if (nowVisible && !this.wasVisible) {
                    this.resetAndStart();
                } else if (!nowVisible && this.wasVisible) {
                    this.stop();
                }

                this.wasVisible = nowVisible;
            }, 350);
        }

        createCanvas() {
            const old = this.root.querySelector('.bbg-v3-canvas');
            old?.remove();

            this.canvas = document.createElement('canvas');
            this.canvas.className = 'bbg-v3-canvas';
            this.canvas.setAttribute('aria-hidden', 'true');
            this.root.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
        }

        resize() {
            if (!this.canvas || !this.ctx) {
                return;
            }

            const rect = this.root.getBoundingClientRect();
            const width = Math.max(280, rect.width);
            const height = Math.max(300, rect.height);

            this.dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = Math.round(width * this.dpr);
            this.canvas.height = Math.round(height * this.dpr);
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

            this.shooterX = width / 2;
            this.shooterY = height - CONFIG.shooterBottom;
            this.setAimGeometry();
            this.drawScene();
        }

        setAimGeometry() {
            if (!this.dragging && !this.shot && this.pull <= 0) {
                this.nockX = this.shooterX;
                this.nockY = this.shooterY;
            }
        }

        getVisibleCount() {
            return window.matchMedia('(max-width: 700px)').matches
                ? CONFIG.mobileVisibleCount
                : CONFIG.visibleCount;
        }

        prepareUI() {
            if (this.instructionEl) {
                this.instructionEl.textContent =
                    'Bow ko press karo • Kheecho • Aim karo • Chhod do 🏹';
            }

            if (this.nextButton) {
                this.nextButton.disabled = true;
                this.nextButton.setAttribute('aria-disabled', 'true');
                this.nextButton.textContent = 'Chalooo, Aageee 🌸';
            }

            
            if (!this.timerEl || !this.timerEl.isConnected) {
                this.timerEl = document.createElement('div');
                this.timerEl.className = 'bbg-v3-timer';
                this.timerEl.setAttribute('aria-live', 'polite');
                this.root.appendChild(this.timerEl);
            }

            this.updateTimerUI();
            this.removeRetryUI();
this.updateScore();
        }

        resetAndStart() {
            this.stop();
            this.clearBalloons();
            this.removeAllEffects();
            this.popped = 0;
            this.completed = false;
            this.spawnIndex = 0;
            this.shot = null;
            this.dragging = false;
            this.pointerId = null;
            this.pull = 0;
            this.aimAngle = -Math.PI / 2;
            this.timerSeconds = 30;
            this.updateScore();
            this.prepareUI();

            if (this.nextButton) {
                this.nextButton.disabled = true;
                this.nextButton.setAttribute('aria-disabled', 'true');
            }

            this.running = true;
            this.lastFrame = performance.now();
            
this.spawnInitial();
            this.raf = requestAnimationFrame((now) => this.frame(now));
        }

        stop() {
            this.running = false;
            this.stopTimer();
            cancelAnimationFrame(this.raf);
            this.raf = 0;
            window.clearTimeout(this.spawnTimer);
            this.spawnTimer = 0;
        }
        updateTimerUI() {
            if (!this.timerEl) {
                return;
            }

            this.timerEl.innerHTML = `⏱️ <strong>${this.timerSeconds}</strong>`;

            if (this.timerSeconds <= 10) {
                this.timerEl.style.color = '#d94b5f';
                this.timerEl.style.background = 'rgba(255,225,231,.96)';
            } else if (this.timerSeconds <= 17) {
                this.timerEl.style.color = '#b87800';
                this.timerEl.style.background = 'rgba(255,243,195,.96)';
            } else {
                this.timerEl.style.color = '#6f536b';
                this.timerEl.style.background = 'rgba(255,255,255,.94)';
            }
        }

        startTimer() {
            this.stopTimer();
            this.timerSeconds = 30;
            this.updateTimerUI();

            this.timerInterval = window.setInterval(() => {
                if (!this.running || this.completed) {
                    this.stopTimer();
                    return;
                }

                this.timerSeconds -= 1;
                this.updateTimerUI();

                if (this.timerSeconds <= 0) {
                    this.timerSeconds = 0;
                    this.updateTimerUI();
                    this.timeUp();
                }
            }, 1000);
        }

        stopTimer() {
            if (this.timerInterval) {
                window.clearInterval(this.timerInterval);
                this.timerInterval = 0;
            }
        }

        timeUp() {
            if (this.completed || !this.running) {
                return;
            }

            this.stop();
            this.clearShot();
            this.clearBalloons();
            this.removeAllEffects();

            if (this.instructionEl) {
                this.instructionEl.textContent =
                    'Time Up! 😭 30 seconds mein 16 balloons complete nahi hue.';
            }

            if (this.nextButton) {
                this.nextButton.disabled = true;
                this.nextButton.setAttribute('aria-disabled', 'true');
            }

            this.showRetryUI();
        }

        showRetryUI() {
            this.removeRetryUI();

            const wrap = document.createElement('div');
            wrap.className = 'bbg-v3-effect';
            wrap.style.position = 'absolute';
            wrap.style.left = '50%';
            wrap.style.top = '42%';
            wrap.style.transform = 'translate(-50%, -50%)';
            wrap.style.zIndex = '94';
            wrap.style.textAlign = 'center';
            wrap.style.pointerEvents = 'none';

            const message = document.createElement('div');
            message.style.padding = '14px 18px 10px';
            message.style.borderRadius = '20px';
            message.style.background = 'rgba(255,255,255,.94)';
            message.style.boxShadow = '0 16px 36px rgba(92,72,91,.13)';
            message.style.font = '800 22px/1.1 "Baloo 2",sans-serif';
            message.style.color = '#d96490';
            message.textContent = 'Oops! Time Up! ⏰💗';

            const sub = document.createElement('div');
            sub.style.marginTop = '5px';
            sub.style.font = '400 15px/1.2 "Caveat",cursive';
            sub.style.color = '#73596a';
            sub.textContent = `${this.popped}/${CONFIG.target} balloons pop hue.`;

            wrap.append(message, sub);
            this.root.appendChild(wrap);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'bbg-v3-retry';
            button.textContent = 'Try Again ✨';
            button.addEventListener('click', () => this.resetAndStart());
            this.root.appendChild(button);

            this.retryUI = wrap;
            this.retryButton = button;
        }

        removeRetryUI() {
            this.retryUI?.remove();
            this.retryButton?.remove();
            this.retryUI = null;
            this.retryButton = null;
        }



        clearBalloons() {
            for (const balloon of this.balloons.values()) {
                balloon.el.remove();
            }
            this.balloons.clear();
        }

        removeAllEffects() {
            this.particles.length = 0;
            this.rings.length = 0;

            this.root
                .querySelectorAll('.bbg-v3-effect')
                .forEach((el) => el.remove());
        }

        spawnInitial() {
            for (let i = 0; i < this.getVisibleCount(); i += 1) {
                window.setTimeout(() => {
                    if (!this.running || this.completed) {
                        return;
                    }
                    this.spawnBalloon(i, false);
                }, i * 115);
            }
        }

        scheduleReplacement(delay = CONFIG.replacementDelay) {
            if (this.spawnTimer || this.completed || !this.running) {
                return;
            }

            this.spawnTimer = window.setTimeout(() => {
                this.spawnTimer = 0;

                if (!this.running || this.completed) {
                    return;
                }

                if (this.balloons.size < this.getVisibleCount()) {
                    this.spawnBalloon(this.spawnIndex++, false);
                }

                if (this.balloons.size < this.getVisibleCount()) {
                    this.scheduleReplacement();
                }
            }, delay);
        }

        getSpawnSlot(index) {
            const slots = [
                { x: 0.12, y: 0.19 },
                { x: 0.30, y: 0.28 },
                { x: 0.48, y: 0.17 },
                { x: 0.66, y: 0.27 },
                { x: 0.84, y: 0.20 },
                { x: 0.25, y: 0.40 },
                { x: 0.73, y: 0.39 },
                { x: 0.50, y: 0.34 }
            ];

            return slots[index % slots.length];
        }

        spawnBalloon(index, initial = false) {
            if (!this.running || this.completed || this.balloons.size >= this.getVisibleCount()) {
                return null;
            }

            const rect = this.root.getBoundingClientRect();
            const width = Math.max(280, rect.width);
            const height = Math.max(300, rect.height);
            const size = rand(CONFIG.minSize, CONFIG.maxSize);
            const colors = PALETTE[randInt(0, PALETTE.length - 1)];
            const slot = this.getSpawnSlot(index);

            const targetX = clamp(
                width * slot.x + rand(-16, 16) - size / 2,
                16,
                width - size - 16
            );

            const targetY = clamp(
                height * slot.y + rand(-12, 12),
                54,
                height * 0.58
            );

            const entryFromLeft = index % 2 === 0;
            const startX = clamp(
                targetX + rand(-28, 28),
                12,
                width - size - 12
            );
            const startY = -size - rand(34, 90);

            const id = `bbg3-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
            const el = document.createElement('div');
            el.className = 'bbg-v3-balloon';
            el.dataset.balloonId = id;
            el.setAttribute('aria-hidden', 'true');
            el.style.width = `${size}px`;
            el.style.height = `${size * 1.28}px`;
            el.style.setProperty('--bbg-main', colors[0]);
            el.style.setProperty('--bbg-dark', colors[1]);
            el.style.setProperty('--bbg-light', colors[2]);

            const body = document.createElement('span');
            body.className = 'bbg-v3-body';
            const shine = document.createElement('span');
            shine.className = 'bbg-v3-shine';
            const string = document.createElement('span');
            string.className = 'bbg-v3-string';
            el.append(body, shine, string);
            this.container.appendChild(el);

            const balloon = {
                id,
                el,
                size,
                x: startX,
                y: startY,
                targetX,
                targetY,
                startX,
                startY,
                entryFromLeft,
                phase: rand(0, Math.PI * 2),
                sway: rand(CONFIG.swayAmount * 0.65, CONFIG.swayAmount),
                swaySpeed: rand(CONFIG.swaySpeedMin, CONFIG.swaySpeedMax),
                rotation: rand(-4, 4),
                age: 0,
                lifeStart: performance.now(),
                state: 'entering'
            };

            this.balloons.set(id, balloon);
            this.positionBalloon(balloon, performance.now(), true);
            return balloon;
        }

        positionBalloon(balloon, now, first = false) {
            const t = now / 1000;
            const sway = Math.sin(balloon.phase + t * balloon.swaySpeed) * balloon.sway;
            const rotation =
                balloon.rotation +
                Math.sin(balloon.phase + t * 0.95) * 2.2;

            let x = balloon.x + sway;
            let y = balloon.y;
            let opacity = 1;
            let scale = 1;

            if (balloon.state === 'entering') {
                const p = clamp(balloon.age / CONFIG.enterDuration, 0, 1);
                const eased = easeOut(p);
                x = lerp(balloon.startX, balloon.targetX, eased) + sway * 0.4;
                y = lerp(balloon.startY, balloon.targetY, eased);
                opacity = p * 0.98;
                scale = 0.88 + 0.12 * eased;

                if (p >= 1) {
                    balloon.state = 'visible';
                    balloon.age = 0;
                }
            } else if (balloon.state === 'visible') {
                const age = balloon.age;
                const fadeStart = Math.max(0, CONFIG.visibleDuration - 330);

                if (age >= CONFIG.visibleDuration) {
                    balloon.state = 'exiting';
                    balloon.age = 0;
                } else if (age >= fadeStart) {
                    const p = clamp(
                        (age - fadeStart) / 330,
                        0,
                        1
                    );
                    opacity = 1 - easeInOut(p);
                    y -= 6 * p;
                    scale = 1 - 0.06 * p;
                }
            }

            if (balloon.state === 'exiting') {
                const p = clamp(balloon.age / CONFIG.exitDuration, 0, 1);
                const eased = easeInOut(p);
                y = lerp(balloon.targetY, -balloon.size - 50, eased);
                x = balloon.targetX + sway * (1 - eased * 0.45);
                opacity = 1 - eased;
                scale = 1 - 0.10 * eased;
            }

            balloon.el.style.setProperty(
                '--bbg-opacity',
                String(clamp(opacity, 0, 1))
            );

            balloon.el.style.transform =
                `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`;

            if (first) {
                balloon.el.style.setProperty(
                    '--bbg-opacity',
                    String(clamp(opacity, 0, 1))
                );
            }
        }

        updateBalloons(dt, now) {
            const dtSec = dt / 1000;

            for (const balloon of [...this.balloons.values()]) {
                if (balloon.state === 'popping') {
                    continue;
                }

                balloon.age += dt;

                this.positionBalloon(balloon, now);

                if (balloon.state === 'visible') {
                    balloon.x = balloon.targetX;
                    balloon.y = balloon.targetY -
                        Math.sin(balloon.phase + now / 1000 * 0.8) * 3;
                }

                if (balloon.state === 'exiting' && balloon.age >= CONFIG.exitDuration) {
                    this.removeBalloon(balloon, true);
                    continue;
                }

                // Tiny natural floating motion.
                if (balloon.state === 'visible') {
                    balloon.targetX = clamp(
                        balloon.targetX +
                            Math.sin(balloon.phase + now / 1000 * 0.22) *
                            CONFIG.maxRise * dtSec * 0.05,
                        12,
                        this.root.clientWidth - balloon.size - 12
                    );
                }
            }
        }

        removeBalloon(balloon, replace = false) {
            if (!balloon || !this.balloons.has(balloon.id)) {
                return;
            }

            balloon.el.remove();
            this.balloons.delete(balloon.id);

            if (replace && !this.completed) {
                this.scheduleReplacement();
            }
        }

        frame(now) {
            if (!this.running || this.destroyed) {
                return;
            }

            const dt = Math.min(50, Math.max(0, now - this.lastFrame));
            this.lastFrame = now;

            this.updateBalloons(dt, now);
            this.updateShot(dt, now);
            this.updateParticles(dt);
            this.drawScene();

            if (!this.completed && this.balloons.size < this.getVisibleCount()) {
                this.scheduleReplacement(80);
            }

            this.raf = requestAnimationFrame((time) => this.frame(time));
        }

        updatePointer(event) {
            this.updatePull(event);
        }

        updatePull(event) {
            const rect = this.root.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            let dx = x - this.shooterX;
            let dy = y - this.shooterY;

            // Archery-style gesture: pull DOWN/backward.
            // The arrow points to the opposite direction of the pull.
            // Keeping the nock slightly below the bow prevents the arrow
            // from flipping upside-down when the finger moves too high.

            const distance = Math.hypot(dx, dy);

            if (distance < 0.001) {
                return;
            }

            const pull = clamp(
                distance,
                0,
                CONFIG.maxPull
            );

            const ux = dx / distance;
            const uy = dy / distance;

            this.pull = pull;
            this.nockX = this.shooterX + ux * pull;
            this.nockY = this.shooterY + uy * pull;

            // Arrow travels opposite to the pull vector.
            this.aimAngle = Math.atan2(
                this.shooterY - this.nockY,
                this.shooterX - this.nockX
            );
        }

        bindEvents() {
            if (this.bound) {
                return;
            }

            this.bound = true;

            this.onPointerDown = (event) => {
                if (!this.running || this.completed || this.shot) {
                    return;
                }

                const rect = this.root.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;

                const distance = Math.hypot(
                    x - this.shooterX,
                    y - this.shooterY
                );

                // Start when the pointer is near the bow / current nock.
                if (distance > 110) {
                    return;
                }

                this.pointerId = event.pointerId;
                this.dragging = true;

                this.root.setPointerCapture?.(event.pointerId);

                this.updatePointer(event);
                this.updatePull(event);

                event.preventDefault();
            };

            this.onPointerMove = (event) => {
                if (!this.dragging || event.pointerId !== this.pointerId) {
                    return;
                }

                this.updatePointer(event);
                this.updatePull(event);

                event.preventDefault();
            };

            this.onPointerUp = (event) => {
                if (!this.dragging || event.pointerId !== this.pointerId) {
                    return;
                }

                this.updatePointer(event);
                this.updatePull(event);

                this.dragging = false;

                if (this.pull >= CONFIG.minPull) {
                    this.fire();
                } else {
                    this.pull = 0;
                    this.setAimGeometry();
                }

                try {
                    this.root.releasePointerCapture?.(event.pointerId);
                } catch {
                    // Ignore pointer capture cleanup errors.
                }

                this.pointerId = null;
                event.preventDefault();
            };

            this.onPointerCancel = () => {
                this.dragging = false;
                this.pointerId = null;
                this.pull = 0;
                this.setAimGeometry();
            };

            this.root.addEventListener(
                'pointerdown',
                this.onPointerDown,
                { passive: false }
            );

            this.root.addEventListener(
                'pointermove',
                this.onPointerMove,
                { passive: false }
            );

            this.root.addEventListener(
                'pointerup',
                this.onPointerUp,
                { passive: false }
            );

            this.root.addEventListener(
                'pointercancel',
                this.onPointerCancel,
                { passive: true }
            );

            this.root.addEventListener(
                'contextmenu',
                (event) => event.preventDefault()
            );

            this.onResize = () => this.resize();

            window.addEventListener(
                'resize',
                this.onResize,
                { passive: true }
            );
        }

        fire() {
            if (!this.running || this.completed || this.shot) {
                return;
            }

            const angle = this.aimAngle;
            const startX = this.nockX;
            const startY = this.nockY;

            this.shot = {
                x: startX,
                y: startY,
                prevX: startX,
                prevY: startY,
                angle,
                vx: Math.cos(angle) * CONFIG.projectileSpeed,
                vy: Math.sin(angle) * CONFIG.projectileSpeed,
                distance: 0
            };

            this.pull = 0;
            this.nockX = this.shooterX;
            this.nockY = this.shooterY;
        }

        updateShot(dt, now) {
            const shot = this.shot;

            if (!shot) {
                return;
            }

            const sec = dt / 1000;

            shot.prevX = shot.x;
            shot.prevY = shot.y;
            shot.x += shot.vx * sec;
            shot.y += shot.vy * sec;
            shot.distance += CONFIG.projectileSpeed * sec;

            const hit = this.findHit(
                shot.prevX,
                shot.prevY,
                shot.x,
                shot.y
            );

            if (hit) {
                const cx = hit.x + hit.size / 2;
                const cy = hit.y + hit.size * 0.33;

                this.popBalloon(hit, cx, cy, now);
                this.clearShot();

                return;
            }

            const rect = this.root.getBoundingClientRect();

            const outside =
                shot.distance >= CONFIG.projectileMaxDistance ||
                shot.x < -140 ||
                shot.x > rect.width + 140 ||
                shot.y < -160 ||
                shot.y > rect.height + 100;

            if (outside) {
                this.clearShot();
            }
        }

        findHit(x1, y1, x2, y2) {
            let best = null;
            let bestDistance = Infinity;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const lengthSq = dx * dx + dy * dy || 1;

            for (const balloon of this.balloons.values()) {
                if (
                    balloon.state === 'popping' ||
                    balloon.state === 'exiting'
                ) {
                    continue;
                }

                // Use the current visual position including sway.
                const time = performance.now() / 1000;

                const sway =
                    Math.sin(
                        balloon.phase + time * balloon.swaySpeed
                    ) * balloon.sway;

                const bx = balloon.x + sway;
                const by = balloon.y;

                const cx = bx + balloon.size / 2;
                const cy = by + balloon.size * 0.34;
                const radius = balloon.size * CONFIG.hitRadiusFactor;

                let t =
                    ((cx - x1) * dx + (cy - y1) * dy) /
                    lengthSq;

                t = clamp(t, 0, 1);

                const px = x1 + dx * t;
                const py = y1 + dy * t;

                const distance = Math.hypot(
                    px - cx,
                    py - cy
                );

                if (
                    distance <= radius &&
                    distance < bestDistance
                ) {
                    best = balloon;
                    bestDistance = distance;
                }
            }

            return best;
        }

        popBalloon(balloon, x, y, now) {
            if (
                !balloon ||
                balloon.state === 'popping' ||
                this.completed
            ) {
                return;
            }

            balloon.state = 'popping';

            balloon.el.style.transition =
                'transform 260ms cubic-bezier(.16,1.15,.3,1), opacity 260ms ease';

            balloon.el.style.transform += ' scale(1.34)';
            balloon.el.style.opacity = '0';

            this.popped += 1;

            if (this.popped === 1) {
                this.startTimer();
            }

            this.nockX = this.shooterX;
            this.nockY = this.shooterY;

            this.updateScore();
            this.createSkyshotBurst(x, y, now);

            window.setTimeout(() => {
                this.removeBalloon(balloon, false);

                if (
                    this.popped < CONFIG.target &&
                    this.running
                ) {
                    this.scheduleReplacement(90);
                }
            }, 270);

            if (this.popped >= CONFIG.target) {
                window.setTimeout(
                    () => this.complete(),
                    330
                );
            }
        }

        clearShot() {
            this.shot = null;
        }

        createSkyshotBurst(x, y, now) {
            const colors = [
                '#ff4c9a',
                '#ff8abb',
                '#ffc5dc',
                '#ffd86d',
                '#ffffff',
                '#bda8f4'
            ];

            this.rings.push({
                x,
                y,
                radius: 8,
                maxRadius: 56,
                born: now,
                life: 430
            });

            for (
                let i = 0;
                i < CONFIG.particleCount;
                i += 1
            ) {
                const angle =
                    (Math.PI * 2 * i) /
                        CONFIG.particleCount +
                    rand(-0.18, 0.18);

                const speed = rand(110, 300);

                const type =
                    i % 5 === 0
                        ? 'star'
                        : i % 3 === 0
                            ? 'line'
                            : 'dot';

                this.particles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy:
                        Math.sin(angle) * speed -
                        rand(10, 70),
                    size:
                        type === 'line'
                            ? rand(3, 5)
                            : rand(2, 4.6),
                    life: rand(
                        600,
                        CONFIG.particleLife
                    ),
                    born: now,
                    color:
                        colors[
                            i % colors.length
                        ],
                    type,
                    rotation: rand(
                        0,
                        Math.PI * 2
                    ),
                    spin: rand(-5, 5)
                });
            }
        }

        updateParticles(dt) {
            const sec = dt / 1000;

            this.particles = this.particles.filter((p) => {
                p.x += p.vx * sec;
                p.y += p.vy * sec;
                p.vy += 430 * sec;
                p.vx *= Math.pow(0.992, dt);
                p.rotation += p.spin * sec;
                p.life -= dt;

                return p.life > 0;
            });

            this.rings = this.rings.filter((r) => {
                r.radius = lerp(
                    r.radius,
                    r.maxRadius,
                    clamp(dt / r.life, 0, 1)
                );

                r.life -= dt;

                return r.life > 0;
            });
        }

        drawScene() {
            if (!this.ctx || !this.canvas) {
                return;
            }

            const ctx = this.ctx;
            const width =
                this.canvas.width / this.dpr;
            const height =
                this.canvas.height / this.dpr;

            ctx.clearRect(
                0,
                0,
                width,
                height
            );

            ctx.save();

            this.drawAimGuide(
                ctx,
                width,
                height
            );

            this.drawParticles(ctx);
            this.drawBowAndArrow(ctx);

            ctx.restore();
        }

        drawAimGuide(ctx, width, height) {
            if (!this.dragging || this.shot) {
                return;
            }

            const angle = this.aimAngle;
            const startX = this.nockX;
            const startY = this.nockY;
            const length =
                95 + this.pull * 1.05;

            ctx.save();

            ctx.strokeStyle =
                'rgba(195,131,164,.28)';

            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 7]);

            ctx.beginPath();

            ctx.moveTo(
                startX,
                startY
            );

            ctx.lineTo(
                startX +
                    Math.cos(angle) *
                    length,
                startY +
                    Math.sin(angle) *
                    length
            );

            ctx.stroke();
            ctx.restore();
        }

        drawBowAndArrow(ctx) {
            const x = this.shooterX;
            const y = this.shooterY;
            const half = 39;

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // =========================================================
            // BOW BODY ONLY
            // Curved dhanush ki dandi ko vertically ulta kiya gaya hai.
            // Purana shape:  \ /
            // Naya shape:    ∩
            //
            // Arrow ko modify nahi kiya gaya.
            // =========================================================
            ctx.strokeStyle = '#674438';
            ctx.lineWidth = 4.2;

            ctx.beginPath();

            ctx.moveTo(
                x - half,
                y
            );

            ctx.quadraticCurveTo(
                x,
                y - 40,
                x + half,
                y
            );

            ctx.stroke();

            // Cute pink inner bow line — also flipped.
            ctx.strokeStyle = '#f0a1bd';
            ctx.lineWidth = 1.4;

            ctx.beginPath();

            ctx.moveTo(
                x - half + 2,
                y
            );

            ctx.quadraticCurveTo(
                x,
                y - 40,
                x + half - 2,
                y
            );

            ctx.stroke();

            // =========================================================
            // BOW STRING
            // Same behavior, but endpoints now follow the flipped bow.
            // =========================================================
            ctx.strokeStyle =
                'rgba(76,61,74,.72)';

            ctx.lineWidth = 1.25;

            ctx.beginPath();

            ctx.moveTo(
                x - half,
                y
            );

            ctx.lineTo(
                this.nockX,
                this.nockY
            );

            ctx.lineTo(
                x + half,
                y
            );

            ctx.stroke();

            // =========================================================
            // ARROW
            // ORIGINAL ARROW DRAWING — UNCHANGED
            // =========================================================
            const arrowX =
                this.shot
                    ? this.shot.x
                    : this.nockX;

            const arrowY =
                this.shot
                    ? this.shot.y
                    : this.nockY;

            const arrowAngle =
                this.shot
                    ? this.shot.angle
                    : this.aimAngle;

            const pullExtra =
                this.shot
                    ? 0
                    : this.pull * 0.28;

            const arrowLen =
                CONFIG.arrowLength +
                pullExtra;

            ctx.save();

            ctx.translate(
                arrowX,
                arrowY
            );

            ctx.rotate(arrowAngle);

            ctx.strokeStyle = '#44363a';
            ctx.lineWidth = 2.05;

            ctx.beginPath();

            ctx.moveTo(
                0,
                0
            );

            ctx.lineTo(
                arrowLen,
                0
            );

            ctx.stroke();

            // Tiny warm arrowhead.
            ctx.fillStyle = '#cfa64b';

            ctx.beginPath();

            ctx.moveTo(
                arrowLen + 8,
                0
            );

            ctx.lineTo(
                arrowLen - 6,
                -4.8
            );

            ctx.lineTo(
                arrowLen - 3,
                0
            );

            ctx.lineTo(
                arrowLen - 6,
                4.8
            );

            ctx.closePath();
            ctx.fill();

            // Cute pink feathers.
            ctx.fillStyle = '#ef579b';

            ctx.beginPath();

            ctx.moveTo(
                7,
                0
            );

            ctx.lineTo(
                -10,
                -6
            );

            ctx.lineTo(
                -5,
                0
            );

            ctx.lineTo(
                -10,
                6
            );

            ctx.closePath();
            ctx.fill();

            ctx.restore();
            ctx.restore();
        }

        drawParticles(ctx) {
            for (const p of this.particles) {
                const alpha =
                    clamp(
                        p.life /
                            CONFIG.particleLife,
                        0,
                        1
                    );

                ctx.save();

                ctx.globalAlpha = alpha;

                ctx.translate(
                    p.x,
                    p.y
                );

                ctx.rotate(
                    p.rotation
                );

                ctx.fillStyle = p.color;
                ctx.strokeStyle = p.color;
                ctx.lineCap = 'round';

                if (p.type === 'star') {
                    ctx.lineWidth = 2;

                    ctx.beginPath();

                    ctx.moveTo(
                        0,
                        -p.size * 2.2
                    );

                    ctx.lineTo(
                        0,
                        p.size * 2.2
                    );

                    ctx.moveTo(
                        -p.size * 2.2,
                        0
                    );

                    ctx.lineTo(
                        p.size * 2.2,
                        0
                    );

                    ctx.stroke();
                } else if (p.type === 'line') {
                    ctx.lineWidth =
                        p.size * 0.7;

                    ctx.beginPath();

                    ctx.moveTo(
                        -p.size * 2.6,
                        0
                    );

                    ctx.lineTo(
                        p.size * 2.6,
                        0
                    );

                    ctx.stroke();
                } else {
                    ctx.beginPath();

                    ctx.arc(
                        0,
                        0,
                        p.size,
                        0,
                        Math.PI * 2
                    );

                    ctx.fill();
                }

                ctx.restore();
            }

            for (const ring of this.rings) {
                const alpha =
                    clamp(
                        ring.life / 430,
                        0,
                        1
                    );

                ctx.save();

                ctx.globalAlpha =
                    alpha * 0.8;

                ctx.strokeStyle =
                    '#ff92ba';

                ctx.lineWidth = 2.2;

                ctx.beginPath();

                ctx.arc(
                    ring.x,
                    ring.y,
                    ring.radius,
                    0,
                    Math.PI * 2
                );

                ctx.stroke();
                ctx.restore();
            }
        }

        updateScore() {
            if (this.scoreEl) {
                this.scoreEl.textContent =
                    String(this.popped);
            }

            this.root.dataset.pops =
                String(this.popped);

            this.root.dataset.target =
                String(CONFIG.target);
        }

        complete() {
            if (
                this.completed ||
                this.popped < CONFIG.target
            ) {
                return;
            }

            this.completed = true;
            this.stop();
            this.clearShot();
            this.removeRetryUI();

            if (this.instructionEl) {
                this.instructionEl.textContent =
                    'Yaaaayyy! 16 Complete! 🎀✨';
            }

            if (this.nextButton) {
                this.nextButton.disabled = false;

                this.nextButton.removeAttribute(
                    'aria-disabled'
                );

                this.nextButton.textContent =
                    'Chalooo, Aageee 🌸';
            }

            const message =
                document.createElement('div');

            message.className =
                'bbg-v3-effect';

            message.style.position =
                'absolute';

            message.style.left =
                '50%';

            message.style.top =
                '44%';

            message.style.transform =
                'translate(-50%, -50%) scale(.88)';

            message.style.opacity =
                '0';

            message.style.zIndex =
                '82';

            message.style.pointerEvents =
                'none';

            message.style.padding =
                '14px 20px';

            message.style.borderRadius =
                '20px';

            message.style.background =
                'rgba(255,255,255,.94)';

            message.style.boxShadow =
                '0 16px 36px rgba(92,72,91,.13)';

            message.style.textAlign =
                'center';

            message.innerHTML = `
                <div style="font:800 24px/1.1 'Baloo 2',sans-serif;color:#d96490;">
                    Yaaaayyy! 16 Complete! 🎀✨
                </div>

                <div style="margin-top:6px;font:400 18px/1.2 'Caveat',cursive;color:#73596a;">
                    InshaAllah, tumhari zindagi ka ye naya saal tumhare liye bahut saari muskurahat, khushiyan aur khoobsurat yaadein lekar aaye. 🌸✨
                    <br>
                    Allah tumhe hamesha khush rakhe aur tumhari har dua qubool ho. 🤲🏻💗
                    <br>
                    Keep smiling, keep shining, and keep making beautiful memories. 🫶🏻✨
                </div>
            `;

            this.root.appendChild(message);

            requestAnimationFrame(() => {
                message.style.transition =
                    'opacity 420ms ease, transform 420ms cubic-bezier(.2,.9,.3,1)';

                message.style.opacity =
                    '1';

                message.style.transform =
                    'translate(-50%, -50%) scale(1)';
            });
        }

        observeScene() {
            if (
                !this.scene ||
                this.observer
            ) {
                return;
            }

            this.observer =
                new MutationObserver(() => {
                    if (this.destroyed) {
                        return;
                    }

                    const visible =
                        sceneIsVisible(
                            this.scene
                        );

                    if (
                        !visible &&
                        this.running
                    ) {
                        this.stop();
                        this.wasVisible =
                            false;
                    }

                    if (
                        visible &&
                        !this.wasVisible
                    ) {
                        this.wasVisible =
                            true;

                        this.resetAndStart();
                    }
                });

            this.observer.observe(
                this.scene,
                {
                    attributes: true,
                    attributeFilter: [
                        'class',
                        'aria-hidden',
                        'data-active',
                        'style'
                    ]
                }
            );
        }

        destroy() {
            if (this.destroyed) {
                return;
            }

            this.destroyed = true;

            this.stop();
            this.clearShot();
            this.removeRetryUI();
            this.timerEl?.remove();
            this.timerEl = null;
            this.clearBalloons();

            this.observer?.disconnect();
            this.observer = null;

            window.clearInterval(
                this.visibilityTimer
            );

            if (this.bound) {
                this.root.removeEventListener(
                    'pointerdown',
                    this.onPointerDown
                );

                this.root.removeEventListener(
                    'pointermove',
                    this.onPointerMove
                );

                this.root.removeEventListener(
                    'pointerup',
                    this.onPointerUp
                );

                this.root.removeEventListener(
                    'pointercancel',
                    this.onPointerCancel
                );

                window.removeEventListener(
                    'resize',
                    this.onResize
                );
            }
        }

        getState() {
            return {
                version: '3.0.0',
                initialized: !this.destroyed,
                running: this.running,
                completed: this.completed,
                popped: this.popped,
                target: CONFIG.target,
                balloons: this.balloons.size,
                dragging: this.dragging,
                pull: this.pull,
                angle: this.aimAngle
            };
        }
    }

    function boot() {
        const root =
            document.querySelector(ROOT);

        if (!root) {
            return;
        }

        if (
            instance &&
            !instance.destroyed &&
            instance.root === root
        ) {
            return;
        }

        instance?.destroy();

        instance =
            new BalloonGameV3(root);

        instance.init();

        window.BalloonGame =
            instance;

        window.balloonGame =
            instance;

        window.BalloonGameManager =
            BalloonGameV3;

        window.SehrishBalloonGame =
            instance;

        window.SBBalloonDebug = {
            getState: () =>
                instance?.getState?.() || null,

            reset: () =>
                instance?.resetAndStart?.(),

            pop: () =>
                instance?.popped || 0
        };
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            boot,
            { once: true }
        );
    } else {
        boot();
    }

    window.setTimeout(
        boot,
        800
    );
})();