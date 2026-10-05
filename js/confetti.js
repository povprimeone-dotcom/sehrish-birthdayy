/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/confetti.js
 * Version: 1.0.0
 *
 * Production-ready celebration effects engine.
 *
 * Responsibilities:
 * - Birthday confetti animation
 * - Burst effects
 * - Multi-burst celebration sequences
 * - Canvas-based rendering
 * - Device-performance awareness
 * - Reduced-motion support
 * - Automatic cleanup
 * - Multiple shape types
 * - Optional emoji particles
 * - Integration with Quiz, Gifts, Cake, Letter and Navigation modules
 * - Public API
 *
 * No external library required.
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const DEFAULTS = Object.freeze({
        particleCount: 110,
        gravity: 0.22,
        drag: 0.992,
        velocityMin: 4,
        velocityMax: 11,
        spread: Math.PI * 2,
        lifeMin: 70,
        lifeMax: 150,

        particleSizeMin: 5,
        particleSizeMax: 11,

        rotationSpeedMin: -0.18,
        rotationSpeedMax: 0.18,

        fadeStart: 0.72,

        burstDuration: 4200,

        zIndex: 9999,

        respectReducedMotion: true,

        enabled: true,

        useEmoji: false,

        emojiList: [
            "🎈",
            "⭐",
            "💖",
            "✨",
            "🌸"
        ]
    });

    const SHAPES = Object.freeze([
        "rectangle",
        "circle",
        "triangle",
        "heart"
    ]);

    const EVENTS = Object.freeze({
        ready:
            "sehrish:confetti:ready",

        burst:
            "sehrish:confetti:burst",

        sequenceStart:
            "sehrish:confetti:sequence-start",

        sequenceEnd:
            "sehrish:confetti:sequence-end",

        disabled:
            "sehrish:confetti:disabled"
    });

    /* ------------------------------------------------------------------------
     * UTILITY FUNCTIONS
     * --------------------------------------------------------------------- */

    const random = (
        min,
        max
    ) => {
        return (
            Math.random() *
                (max - min) +
            min
        );
    };

    const randomInteger = (
        min,
        max
    ) => {
        return Math.floor(
            random(
                min,
                max + 1
            )
        );
    };

    const clamp = (
        value,
        min,
        max
    ) => {
        return Math.min(
            Math.max(
                value,
                min
            ),
            max
        );
    };

    const choose = (array) => {
        if (
            !Array.isArray(array) ||
            !array.length
        ) {
            return null;
        }

        return array[
            Math.floor(
                Math.random() *
                    array.length
            )
        ];
    };

    const prefersReducedMotion =
        () => {
            try {
                return window
                    .matchMedia(
                        "(prefers-reduced-motion: reduce)"
                    )
                    .matches;
            } catch {
                return false;
            }
        };

    const dispatch = (
        name,
        detail = {}
    ) => {
        try {
            window.dispatchEvent(
                new CustomEvent(
                    name,
                    {
                        detail
                    }
                )
            );
        } catch {
            /* Ignore event failures. */
        }
    };

    /* ------------------------------------------------------------------------
     * PARTICLE CLASS
     * --------------------------------------------------------------------- */

    class ConfettiParticle {
        constructor(
            options = {}
        ) {
            this.reset(
                options
            );
        }

        reset(
            options = {}
        ) {
            const {
                x = 0,
                y = 0,
                angle = random(
                    0,
                    Math.PI * 2
                ),
                speed = random(
                    4,
                    10
                ),
                size = random(
                    5,
                    11
                ),
                life = randomInteger(
                    70,
                    150
                )
            } = options;

            this.x = x;
            this.y = y;

            this.vx =
                Math.cos(angle) *
                speed;

            this.vy =
                Math.sin(angle) *
                speed;

            this.size =
                size;

            this.initialSize =
                size;

            this.life =
                life;

            this.maxLife =
                life;

            this.rotation =
                random(
                    0,
                    Math.PI * 2
                );

            this.rotationSpeed =
                random(
                    -0.18,
                    0.18
                );

            this.opacity = 1;

            this.shape =
                choose(
                    SHAPES
                ) ||
                "rectangle";

            this.flip =
                random(
                    0,
                    1
                );

            this.flipSpeed =
                random(
                    0.05,
                    0.18
                );

            this.flipTime =
                random(
                    0,
                    Math.PI * 2
                );

            this.gravity =
                0.22;

            this.drag =
                0.992;

            this.wind =
                random(
                    -0.015,
                    0.015
                );

            this.active =
                true;

            this.emoji =
                null;

            this.useEmoji =
                false;
        }

        update(
            options = {}
        ) {
            if (
                !this.active
            ) {
                return;
            }

            const gravity =
                Number.isFinite(
                    options.gravity
                )
                    ? options.gravity
                    : this.gravity;

            const drag =
                Number.isFinite(
                    options.drag
                )
                    ? options.drag
                    : this.drag;

            this.vx *= drag;

            this.vy *= drag;

            this.vy += gravity;

            this.vx += this.wind;

            this.x += this.vx;

            this.y += this.vy;

            this.rotation +=
                this.rotationSpeed;

            this.flipTime +=
                this.flipSpeed;

            this.life -= 1;

            const progress =
                1 -
                this.life /
                    this.maxLife;

            this.opacity =
                progress >
                0.72
                    ? clamp(
                          1 -
                              (progress -
                                  0.72) /
                                  0.28,
                          0,
                          1
                      )
                    : 1;

            if (
                this.life <= 0
            ) {
                this.active =
                    false;
            }
        }

        draw(
            context
        ) {
            if (
                !this.active ||
                this.opacity <= 0
            ) {
                return;
            }

            context.save();

            context.translate(
                this.x,
                this.y
            );

            context.rotate(
                this.rotation
            );

            context.globalAlpha =
                this.opacity;

            if (
                this.useEmoji &&
                this.emoji
            ) {
                this.drawEmoji(
                    context
                );
            } else {
                this.drawShape(
                    context
                );
            }

            context.restore();
        }

        drawEmoji(
            context
        ) {
            context.font =
                `${Math.max(
                    14,
                    this.size * 2.6
                )}px sans-serif`;

            context.textAlign =
                "center";

            context.textBaseline =
                "middle";

            context.fillText(
                this.emoji,
                0,
                0
            );
        }

        drawShape(
            context
        ) {
            const half =
                this.size / 2;

            context.beginPath();

            switch (
                this.shape
            ) {
                case "circle":
                    context.arc(
                        0,
                        0,
                        half,
                        0,
                        Math.PI * 2
                    );
                    context.fill();
                    break;

                case "triangle":
                    context.moveTo(
                        0,
                        -half
                    );

                    context.lineTo(
                        half,
                        half
                    );

                    context.lineTo(
                        -half,
                        half
                    );

                    context.closePath();

                    context.fill();
                    break;

                case "heart":
                    this.drawHeart(
                        context,
                        half
                    );
                    break;

                case "rectangle":
                default:
                    context.fillRect(
                        -half,
                        -half,
                        this.size,
                        this.size *
                            0.72
                    );
                    break;
            }
        }

        drawHeart(
            context,
            size
        ) {
            const scale =
                size / 10;

            context.save();

            context.scale(
                scale,
                scale
            );

            context.beginPath();

            context.moveTo(
                0,
                3
            );

            context.bezierCurveTo(
                -10,
                -4,
                -8,
                -12,
                -3,
                -12
            );

            context.bezierCurveTo(
                0,
                -12,
                2,
                -10,
                0,
                -7
            );

            context.bezierCurveTo(
                2,
                -10,
                4,
                -12,
                7,
                -12
            );

            context.bezierCurveTo(
                12,
                -12,
                14,
                -4,
                4,
                3
            );

            context.lineTo(
                0,
                7
            );

            context.closePath();

            context.fill();

            context.restore();
        }
    }

    /* ------------------------------------------------------------------------
     * CONFETTI ENGINE
     * --------------------------------------------------------------------- */

    class BirthdayConfettiManager {
        constructor(
            options = {}
        ) {
            this.options = {
                ...DEFAULTS,
                ...options
            };

            this.canvas =
                null;

            this.context =
                null;

            this.particles = [];

            this.running =
                false;

            this.initialized =
                false;

            this.destroyed =
                false;

            this.animationFrame =
                null;

            this.resizeObserver =
                null;

            this.resizeHandler =
                null;

            this.width =
                0;

            this.height =
                0;

            this.devicePixelRatio =
                1;

            this.sequenceToken =
                0;
        }

        /* --------------------------------------------------------------------
         * INITIALIZE
         * ----------------------------------------------------------------- */

        init(
            options = {}
        ) {
            if (
                this.destroyed
            ) {
                return this;
            }

            this.options = {
                ...this.options,
                ...options
            };

            if (
                !this.options.enabled
            ) {
                dispatch(
                    EVENTS.disabled,
                    {
                        manager:
                            this
                    }
                );

                return this;
            }

            if (
                this.options
                    .respectReducedMotion &&
                prefersReducedMotion()
            ) {
                this.initialized =
                    true;

                dispatch(
                    EVENTS.ready,
                    {
                        manager:
                            this,

                        reducedMotion:
                            true
                    }
                );

                return this;
            }

            this.createCanvas();

            this.resize();

            this.bindEvents();

            this.initialized =
                true;

            dispatch(
                EVENTS.ready,
                {
                    manager:
                        this,

                    reducedMotion:
                        false
                }
            );

            return this;
        }

        /* --------------------------------------------------------------------
         * CANVAS
         * ----------------------------------------------------------------- */

        createCanvas() {
            const existing =
                document.getElementById(
                    "sehrish-confetti-canvas"
                );

            if (existing) {
                this.canvas =
                    existing;
            } else {
                this.canvas =
                    document.createElement(
                        "canvas"
                    );

                this.canvas.id =
                    "sehrish-confetti-canvas";

                this.canvas.setAttribute(
                    "aria-hidden",
                    "true"
                );

                this.canvas.dataset
                    .confettiCanvas =
                    "true";

                document.body.appendChild(
                    this.canvas
                );
            }

            this.canvas.style.position =
                "fixed";

            this.canvas.style.inset =
                "0";

            this.canvas.style.width =
                "100%";

            this.canvas.style.height =
                "100%";

            this.canvas.style.pointerEvents =
                "none";

            this.canvas.style.zIndex =
                String(
                    this.options.zIndex
                );

            this.canvas.style.display =
                "block";

            this.canvas.style.opacity =
                "1";

            this.canvas.style.visibility =
                "visible";

            this.context =
                this.canvas.getContext(
                    "2d"
                );

            if (!this.context) {
                throw new Error(
                    "[SehrishConfetti] " +
                    "Canvas 2D context unavailable."
                );
            }
        }

        /* --------------------------------------------------------------------
         * EVENTS
         * ----------------------------------------------------------------- */

        bindEvents() {
            if (
                this.resizeHandler
            ) {
                return;
            }

            this.resizeHandler =
                () =>
                    this.resize();

            window.addEventListener(
                "resize",
                this.resizeHandler,
                {
                    passive:
                        true
                }
            );

            if (
                "ResizeObserver" in
                window
            ) {
                this.resizeObserver =
                    new ResizeObserver(
                        () =>
                            this.resize()
                    );

                this.resizeObserver.observe(
                    document.documentElement
                );
            }
        }

        /* --------------------------------------------------------------------
         * RESIZE
         * ----------------------------------------------------------------- */

        resize() {
            if (
                !this.canvas ||
                !this.context
            ) {
                return;
            }

            this.devicePixelRatio =
                Math.min(
                    window.devicePixelRatio ||
                        1,
                    2
                );

            this.width =
                window.innerWidth;

            this.height =
                window.innerHeight;

            this.canvas.width =
                Math.floor(
                    this.width *
                        this.devicePixelRatio
                );

            this.canvas.height =
                Math.floor(
                    this.height *
                        this.devicePixelRatio
                );

            this.context.setTransform(
                this.devicePixelRatio,
                0,
                0,
                this.devicePixelRatio,
                0,
                0
            );
        }

        /* --------------------------------------------------------------------
         * CREATE PARTICLE
         * ----------------------------------------------------------------- */

        createParticle(
            options = {}
        ) {
            const centerX =
                Number.isFinite(
                    options.x
                )
                    ? options.x
                    : this.width / 2;

            const centerY =
                Number.isFinite(
                    options.y
                )
                    ? options.y
                    : this.height /
                      3;

            const direction =
                Number.isFinite(
                    options.angle
                )
                    ? options.angle
                    : random(
                          0,
                          Math.PI * 2
                      );

            const speed =
                Number.isFinite(
                    options.speed
                )
                    ? options.speed
                    : random(
                          this.options
                              .velocityMin,
                          this.options
                              .velocityMax
                      );

            const particle =
                new ConfettiParticle(
                    {
                        x: centerX,

                        y: centerY,

                        angle:
                            direction,

                        speed,

                        size:
                            random(
                                this.options
                                    .particleSizeMin,
                                this.options
                                    .particleSizeMax
                            ),

                        life:
                            randomInteger(
                                this.options
                                    .lifeMin,
                                this.options
                                    .lifeMax
                            )
                    }
                );

            particle.gravity =
                this.options
                    .gravity;

            particle.drag =
                this.options.drag;

            if (
                this.options
                    .useEmoji
            ) {
                particle.useEmoji =
                    true;

                particle.emoji =
                    choose(
                        this.options
                            .emojiList
                    );
            }

            return particle;
        }

        /* --------------------------------------------------------------------
         * BURST
         * ----------------------------------------------------------------- */

        burst(
            options = {}
        ) {
            if (
                !this.initialized ||
                !this.options.enabled ||
                this.destroyed
            ) {
                return {
                    started: false,
                    reason:
                        "disabled"
                };
            }

            if (
                this.options
                    .respectReducedMotion &&
                prefersReducedMotion()
            ) {
                return {
                    started: false,
                    reason:
                        "reduced-motion"
                };
            }

            const count =
                Math.max(
                    1,
                    Math.floor(
                        Number(
                            options.count ??
                                this.options
                                    .particleCount
                        )
                    )
                );

            const originX =
                Number.isFinite(
                    options.x
                )
                    ? options.x
                    : this.width / 2;

            const originY =
                Number.isFinite(
                    options.y
                )
                    ? options.y
                    : this.height /
                      2;

            const minAngle =
                Number.isFinite(
                    options.minAngle
                )
                    ? options.minAngle
                    : -Math.PI;

            const maxAngle =
                Number.isFinite(
                    options.maxAngle
                )
                    ? options.maxAngle
                    : 0;

            for (
                let index = 0;
                index < count;
                index += 1
            ) {
                let angle;

                if (
                    Number.isFinite(
                        options.angle
                    )
                ) {
                    const spread =
                        Number.isFinite(
                            options.spread
                        )
                            ? options.spread
                            : this.options
                                  .spread;

                    angle =
                        options.angle +
                        random(
                            -spread / 2,
                            spread / 2
                        );
                } else {
                    angle =
                        random(
                            minAngle,
                            maxAngle
                        );
                }

                const particle =
                    this.createParticle(
                        {
                            x:
                                originX +
                                random(
                                    -20,
                                    20
                                ),

                            y:
                                originY +
                                random(
                                    -10,
                                    10
                                ),

                            angle,

                            speed:
                                Number.isFinite(
                                    options.speed
                                )
                                    ? options.speed
                                    : undefined
                        }
                    );

                if (
                    options.shape &&
                    SHAPES.includes(
                        options.shape
                    )
                ) {
                    particle.shape =
                        options.shape;
                }

                if (
                    options.emoji
                ) {
                    particle.useEmoji =
                        true;

                    particle.emoji =
                        options.emoji;
                }

                this.particles.push(
                    particle
                );
            }

            dispatch(
                EVENTS.burst,
                {
                    manager:
                        this,

                    count,

                    x:
                        originX,

                    y:
                        originY
                }
            );

            this.start();

            return {
                started: true,
                count
            };
        }

        /* --------------------------------------------------------------------
         * EDGE BURST
         * ----------------------------------------------------------------- */

        sideBurst(
            side = "left",
            options = {}
        ) {
            if (
                !this.initialized
            ) {
                return false;
            }

            let x;
            let angle;

            switch (
                side
            ) {
                case "right":
                    x =
                        this.width -
                        15;

                    angle =
                        Math.PI +
                        random(
                            -0.55,
                            0.55
                        );
                    break;

                case "bottom":
                    x =
                        random(
                            this.width *
                                0.2,
                            this.width *
                                0.8
                        );

                    angle =
                        -Math.PI / 2 +
                        random(
                            -0.45,
                            0.45
                        );
                    break;

                case "top":
                    x =
                        random(
                            this.width *
                                0.2,
                            this.width *
                                0.8
                        );

                    angle =
                        Math.PI / 2 +
                        random(
                            -0.45,
                            0.45
                        );
                    break;

                case "left":
                default:
                    x = 15;

                    angle =
                        random(
                            -0.55,
                            0.55
                        );
                    break;
            }

            const y =
                side === "top"
                    ? 10
                    : side ===
                        "bottom"
                      ? this.height -
                        10
                      : random(
                            this.height *
                                0.25,
                            this.height *
                                0.65
                        );

            return this.burst({
                ...options,
                x,
                y,
                angle
            });
        }

        /* --------------------------------------------------------------------
         * CENTER CELEBRATION
         * ----------------------------------------------------------------- */

        centerBurst(
            options = {}
        ) {
            return this.burst({
                ...options,
                x:
                    this.width / 2,
                y:
                    this.height * 0.38,
                angle:
                    -Math.PI / 2,
                spread:
                    Math.PI * 1.25
            });
        }

        /* --------------------------------------------------------------------
         * DOUBLE BURST
         * ----------------------------------------------------------------- */

        async doubleBurst(
            options = {}
        ) {
            const gap =
                Number.isFinite(
                    options.gap
                )
                    ? options.gap
                    : 250;

            this.sideBurst(
                "left",
                options
            );

            await this.delay(
                gap
            );

            this.sideBurst(
                "right",
                options
            );
        }

        /* --------------------------------------------------------------------
         * CELEBRATION SEQUENCE
         * ----------------------------------------------------------------- */

        async celebrate(
            options = {}
        ) {
            if (
                !this.initialized
            ) {
                return false;
            }

            const token =
                ++this.sequenceToken;

            const gap =
                Number.isFinite(
                    options.gap
                )
                    ? options.gap
                    : 300;

            const bursts =
                Number.isFinite(
                    options.bursts
                )
                    ? Math.max(
                          1,
                          Math.floor(
                              options.bursts
                          )
                      )
                    : 5;

            dispatch(
                EVENTS.sequenceStart,
                {
                    manager:
                        this,
                    bursts
                }
            );

            for (
                let index = 0;
                index < bursts;
                index += 1
            ) {
                if (
                    token !==
                    this.sequenceToken
                ) {
                    break;
                }

                if (
                    index % 2 ===
                    0
                ) {
                    this.sideBurst(
                        "left",
                        {
                            count:
                                options
                                    .count ||
                                55
                        }
                    );
                } else {
                    this.sideBurst(
                        "right",
                        {
                            count:
                                options
                                    .count ||
                                55
                        }
                    );
                }

                await this.delay(
                    gap
                );
            }

            if (
                token ===
                this.sequenceToken
            ) {
                this.centerBurst({
                    count:
                        options.centerCount ||
                        90
                });
            }

            dispatch(
                EVENTS.sequenceEnd,
                {
                    manager:
                        this
                }
            );

            return true;
        }

        /* --------------------------------------------------------------------
         * ANIMATION LOOP
         * ----------------------------------------------------------------- */

        start() {
            if (
                this.running ||
                !this.context
            ) {
                return;
            }

            this.running =
                true;

            this.animate();
        }

        stop() {
            this.running =
                false;

            if (
                this.animationFrame !==
                null
            ) {
                cancelAnimationFrame(
                    this.animationFrame
                );

                this.animationFrame =
                    null;
            }
        }

        animate() {
            if (
                !this.running ||
                !this.context
            ) {
                return;
            }

            this.context.clearRect(
                0,
                0,
                this.width,
                this.height
            );

            const active =
                [];

            for (
                const particle of
                    this.particles
            ) {
                particle.update({
                    gravity:
                        this.options
                            .gravity,

                    drag:
                        this.options
                            .drag
                });

                particle.draw(
                    this.context
                );

                if (
                    particle.active
                ) {
                    active.push(
                        particle
                    );
                }
            }

            this.particles =
                active;

            if (
                this.particles.length ===
                0
            ) {
                this.context.clearRect(
                    0,
                    0,
                    this.width,
                    this.height
                );

                this.stop();

                return;
            }

            this.animationFrame =
                requestAnimationFrame(
                    () =>
                        this.animate()
                );
        }

        /* --------------------------------------------------------------------
         * CLEAR
         * ----------------------------------------------------------------- */

        clear() {
            this.particles =
                [];

            if (
                this.context
            ) {
                this.context.clearRect(
                    0,
                    0,
                    this.width,
                    this.height
                );
            }

            this.stop();
        }

        /* --------------------------------------------------------------------
         * DELAY
         * ----------------------------------------------------------------- */

        delay(
            milliseconds
        ) {
            return new Promise(
                (resolve) => {
                    window.setTimeout(
                        resolve,
                        Math.max(
                            0,
                            milliseconds
                        )
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * ENABLE / DISABLE
         * ----------------------------------------------------------------- */

        enable() {
            this.options.enabled =
                true;

            if (
                !this.initialized
            ) {
                this.init();
            }

            return this;
        }

        disable() {
            this.options.enabled =
                false;

            this.clear();

            return this;
        }

        /* --------------------------------------------------------------------
         * GET STATE
         * ----------------------------------------------------------------- */

        getState() {
            return {
                version:
                    VERSION,

                initialized:
                    this.initialized,

                enabled:
                    this.options.enabled,

                running:
                    this.running,

                particleCount:
                    this.particles.length,

                width:
                    this.width,

                height:
                    this.height,

                reducedMotion:
                    prefersReducedMotion()
            };
        }

        /* --------------------------------------------------------------------
         * DESTROY
         * ----------------------------------------------------------------- */

        destroy() {
            if (
                this.destroyed
            ) {
                return;
            }

            this.sequenceToken +=
                1;

            this.clear();

            if (
                this.resizeHandler
            ) {
                window.removeEventListener(
                    "resize",
                    this.resizeHandler
                );
            }

            if (
                this.resizeObserver
            ) {
                this.resizeObserver.disconnect();

                this.resizeObserver =
                    null;
            }

            if (
                this.canvas &&
                this.canvas.dataset
                    .confettiCanvas ===
                    "true"
            ) {
                this.canvas.remove();
            }

            this.canvas =
                null;

            this.context =
                null;

            this.resizeHandler =
                null;

            this.initialized =
                false;

            this.destroyed =
                true;
        }
    }

    /* ------------------------------------------------------------------------
     * SINGLETON
     * --------------------------------------------------------------------- */

    let manager =
        null;

    /* ------------------------------------------------------------------------
     * PUBLIC API
     * --------------------------------------------------------------------- */

    const api = {
        VERSION,

        init(
            options = {}
        ) {
            if (!manager) {
                manager =
                    new BirthdayConfettiManager(
                        options
                    );
            }

            return manager.init(
                options
            );
        },

        getManager() {
            if (!manager) {
                manager =
                    new BirthdayConfettiManager();

                manager.init();
            }

            return manager;
        },

        burst(
            options = {}
        ) {
            return this.getManager()
                .burst(
                    options
                );
        },

        centerBurst(
            options = {}
        ) {
            return this.getManager()
                .centerBurst(
                    options
                );
        },

        sideBurst(
            side,
            options = {}
        ) {
            return this.getManager()
                .sideBurst(
                    side,
                    options
                );
        },

        doubleBurst(
            options = {}
        ) {
            return this.getManager()
                .doubleBurst(
                    options
                );
        },

        celebrate(
            options = {}
        ) {
            return this.getManager()
                .celebrate(
                    options
                );
        },

        clear() {
            return this.getManager()
                .clear();
        },

        enable() {
            return this.getManager()
                .enable();
        },

        disable() {
            return this.getManager()
                .disable();
        },

        getState() {
            return this.getManager()
                .getState();
        },

        destroy() {
            if (manager) {
                manager.destroy();
            }

            manager =
                null;
        }
    };

    /* ------------------------------------------------------------------------
     * GLOBAL EXPORTS
     * --------------------------------------------------------------------- */

    window.BirthdayConfettiManager =
        BirthdayConfettiManager;

    window.ConfettiParticle =
        ConfettiParticle;

    window.SehrishConfetti =
        api;

    window.SehrishBirthdayConfetti =
        api;

    /* ------------------------------------------------------------------------
     * AUTO BOOT
     * --------------------------------------------------------------------- */

    const boot = () => {
        try {
            api.init();
        } catch (error) {
            console.error(
                "[SehrishConfetti] " +
                "Initialization failed:",
                error
            );
        }
    };

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            boot,
            {
                once: true
            }
        );
    } else {
        boot();
    }

    /* ------------------------------------------------------------------------
     * CROSS-MODULE CELEBRATION INTEGRATION
     * --------------------------------------------------------------------- */

    window.addEventListener(
        "sehrish:gifts:all-opened",
        () => {
            api.celebrate({
                bursts: 4,
                gap: 260,
                count: 48
            });
        }
    );

    window.addEventListener(
        "sehrish:quiz:completed",
        () => {
            api.celebrate({
                bursts: 5,
                gap: 280,
                count: 55
            });
        }
    );

    window.addEventListener(
        "sehrish:cake:completed",
        () => {
            api.centerBurst({
                count: 100
            });
        }
    );

    window.addEventListener(
        "sehrish:letter:completed",
        () => {
            api.celebrate({
                bursts: 6,
                gap: 300,
                count: 58
            });
        }
    );

    console.info(
        `[SehrishConfetti] ` +
        `Confetti module v${VERSION} loaded.`
    );
})();