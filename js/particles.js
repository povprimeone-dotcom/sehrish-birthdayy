/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/particles.js
 * Version: 1.0.0
 *
 * Production-ready ambient particle engine.
 *
 * Responsibilities:
 * - Continuous decorative background particles
 * - Stars / dots / hearts / sparkles
 * - Canvas rendering
 * - Performance-aware particle count
 * - Device pixel ratio handling
 * - Reduced-motion support
 * - Start / pause / resume / clear
 * - Dynamic density control
 * - Scene-aware density
 * - Automatic resize handling
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
        enabled: true,

        particleCount: 42,

        desktopParticleCount: 48,
        tabletParticleCount: 34,
        mobileParticleCount: 22,

        minSize: 1.5,
        maxSize: 5.5,

        minSpeed: 0.08,
        maxSpeed: 0.32,

        minOpacity: 0.18,
        maxOpacity: 0.72,

        driftStrength: 0.12,

        connectionLines: false,

        connectionDistance: 110,

        connectionOpacity: 0.08,

        shapeDistribution: {
            dot: 0.42,
            star: 0.28,
            sparkle: 0.18,
            heart: 0.12
        },

        respectReducedMotion: true,

        highPerformanceMode: false,

        maxDevicePixelRatio: 2,

        zIndex: 0,

        interactive:
            false,

        interactionStrength:
            0.035,

        interactionRadius:
            150,

        resizeThrottle:
            120
    });

    const SHAPES = Object.freeze([
        "dot",
        "star",
        "sparkle",
        "heart"
    ]);

    const EVENTS = Object.freeze({
        ready:
            "sehrish:particles:ready",

        started:
            "sehrish:particles:started",

        stopped:
            "sehrish:particles:stopped",

        paused:
            "sehrish:particles:paused",

        resumed:
            "sehrish:particles:resumed",

        resized:
            "sehrish:particles:resized",

        cleared:
            "sehrish:particles:cleared",

        densityChanged:
            "sehrish:particles:density-changed"
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

    const distance = (
        x1,
        y1,
        x2,
        y2
    ) => {
        const dx =
            x2 - x1;

        const dy =
            y2 - y1;

        return Math.sqrt(
            dx * dx +
            dy * dy
        );
    };

    const chooseWeightedShape = (
        distribution
    ) => {
        const entries =
            Object.entries(
                distribution
            );

        const total =
            entries.reduce(
                (
                    sum,
                    [, weight]
                ) =>
                    sum +
                    Math.max(
                        0,
                        Number(
                            weight
                        ) || 0
                    ),
                0
            );

        if (
            total <= 0
        ) {
            return "dot";
        }

        let cursor =
            Math.random() *
            total;

        for (
            const [
                shape,
                weight
            ] of entries
        ) {
            const normalizedWeight =
                Math.max(
                    0,
                    Number(
                        weight
                    ) || 0
                );

            cursor -=
                normalizedWeight;

            if (
                cursor <= 0 &&
                SHAPES.includes(
                    shape
                )
            ) {
                return shape;
            }
        }

        return "dot";
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
            /* Ignore event dispatch failures. */
        }
    };

    /* ------------------------------------------------------------------------
     * PARTICLE CLASS
     * --------------------------------------------------------------------- */

    class AmbientParticle {
        constructor(
            engine,
            options = {}
        ) {
            this.engine =
                engine;

            this.x =
                options.x ??
                random(
                    0,
                    engine.width
                );

            this.y =
                options.y ??
                random(
                    0,
                    engine.height
                );

            this.size =
                options.size ??
                random(
                    engine.options.minSize,
                    engine.options.maxSize
                );

            this.opacity =
                options.opacity ??
                random(
                    engine.options.minOpacity,
                    engine.options.maxOpacity
                );

            this.baseOpacity =
                this.opacity;

            this.speed =
                options.speed ??
                random(
                    engine.options.minSpeed,
                    engine.options.maxSpeed
                );

            this.angle =
                options.angle ??
                random(
                    0,
                    Math.PI * 2
                );

            this.vx =
                Math.cos(
                    this.angle
                ) *
                this.speed;

            this.vy =
                Math.sin(
                    this.angle
                ) *
                this.speed;

            this.rotation =
                random(
                    0,
                    Math.PI * 2
                );

            this.rotationSpeed =
                random(
                    -0.004,
                    0.004
                );

            this.pulseOffset =
                random(
                    0,
                    Math.PI * 2
                );

            this.pulseSpeed =
                random(
                    0.008,
                    0.025
                );

            this.phase =
                random(
                    0,
                    Math.PI * 2
                );

            this.waveSpeed =
                random(
                    0.002,
                    0.008
                );

            this.shape =
                options.shape ||
                chooseWeightedShape(
                    engine.options
                        .shapeDistribution
                );

            this.active =
                true;
        }

        update(
            deltaTime
        ) {
            const engine =
                this.engine;

            if (
                !this.active
            ) {
                return;
            }

            const normalizedDelta =
                clamp(
                    deltaTime / 16.67,
                    0.2,
                    3
                );

            this.phase +=
                this.waveSpeed *
                normalizedDelta;

            this.rotation +=
                this.rotationSpeed *
                normalizedDelta;

            const waveX =
                Math.sin(
                    this.phase
                ) *
                engine.options
                    .driftStrength;

            const waveY =
                Math.cos(
                    this.phase *
                        0.7
                ) *
                engine.options
                    .driftStrength;

            this.vx +=
                waveX *
                0.002 *
                normalizedDelta;

            this.vy +=
                waveY *
                0.002 *
                normalizedDelta;

            if (
                engine.options
                    .interactive
            ) {
                this.applyPointerForce(
                    normalizedDelta
                );
            }

            this.x +=
                this.vx *
                normalizedDelta;

            this.y +=
                this.vy *
                normalizedDelta;

            const pulse =
                Math.sin(
                    this.pulseOffset +
                        this.pulseSpeed *
                            performance.now()
                );

            this.opacity =
                clamp(
                    this.baseOpacity +
                        pulse *
                            0.08,
                    0.05,
                    1
                );

            this.wrap();
        }

        applyPointerForce(
            normalizedDelta
        ) {
            const engine =
                this.engine;

            if (
                !engine.pointer.active
            ) {
                return;
            }

            const dx =
                this.x -
                engine.pointer.x;

            const dy =
                this.y -
                engine.pointer.y;

            const distanceFromPointer =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (
                distanceFromPointer <=
                0
            ) {
                return;
            }

            if (
                distanceFromPointer >
                engine.options
                    .interactionRadius
            ) {
                return;
            }

            const influence =
                1 -
                distanceFromPointer /
                    engine.options
                        .interactionRadius;

            const strength =
                engine.options
                    .interactionStrength *
                influence *
                normalizedDelta;

            this.x +=
                dx *
                strength;

            this.y +=
                dy *
                strength;
        }

        wrap() {
            const engine =
                this.engine;

            const margin =
                this.size * 3;

            if (
                this.x <
                -margin
            ) {
                this.x =
                    engine.width +
                    margin;
            } else if (
                this.x >
                engine.width +
                    margin
            ) {
                this.x =
                    -margin;
            }

            if (
                this.y <
                -margin
            ) {
                this.y =
                    engine.height +
                    margin;
            } else if (
                this.y >
                engine.height +
                    margin
            ) {
                this.y =
                    -margin;
            }
        }

        draw(
            context
        ) {
            if (
                !this.active
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

            switch (
                this.shape
            ) {
                case "star":
                    this.drawStar(
                        context
                    );
                    break;

                case "sparkle":
                    this.drawSparkle(
                        context
                    );
                    break;

                case "heart":
                    this.drawHeart(
                        context
                    );
                    break;

                case "dot":
                default:
                    this.drawDot(
                        context
                    );
                    break;
            }

            context.restore();
        }

        drawDot(
            context
        ) {
            context.beginPath();

            context.arc(
                0,
                0,
                this.size,
                0,
                Math.PI * 2
            );

            context.fill();
        }

        drawStar(
            context
        ) {
            const spikes =
                5;

            const outer =
                this.size * 1.7;

            const inner =
                this.size * 0.72;

            let rotation =
                -Math.PI / 2;

            const step =
                Math.PI /
                spikes;

            context.beginPath();

            for (
                let index = 0;
                index <
                spikes * 2;
                index += 1
            ) {
                const radius =
                    index % 2 === 0
                        ? outer
                        : inner;

                const x =
                    Math.cos(
                        rotation
                    ) *
                    radius;

                const y =
                    Math.sin(
                        rotation
                    ) *
                    radius;

                if (
                    index === 0
                ) {
                    context.moveTo(
                        x,
                        y
                    );
                } else {
                    context.lineTo(
                        x,
                        y
                    );
                }

                rotation +=
                    step;
            }

            context.closePath();

            context.fill();
        }

        drawSparkle(
            context
        ) {
            const length =
                this.size * 2.2;

            const width =
                Math.max(
                    0.7,
                    this.size * 0.45
                );

            context.beginPath();

            context.moveTo(
                0,
                -length
            );

            context.lineTo(
                width,
                -width
            );

            context.lineTo(
                length,
                0
            );

            context.lineTo(
                width,
                width
            );

            context.lineTo(
                0,
                length
            );

            context.lineTo(
                -width,
                width
            );

            context.lineTo(
                -length,
                0
            );

            context.lineTo(
                -width,
                -width
            );

            context.closePath();

            context.fill();
        }

        drawHeart(
            context
        ) {
            const size =
                this.size * 0.95;

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
                4
            );

            context.bezierCurveTo(
                -10,
                -3,
                -9,
                -11,
                -3,
                -11
            );

            context.bezierCurveTo(
                0,
                -11,
                2,
                -9,
                0,
                -6
            );

            context.bezierCurveTo(
                2,
                -9,
                4,
                -11,
                7,
                -11
            );

            context.bezierCurveTo(
                13,
                -11,
                14,
                -3,
                4,
                4
            );

            context.lineTo(
                0,
                8
            );

            context.closePath();

            context.fill();

            context.restore();
        }
    }

    /* ------------------------------------------------------------------------
     * PARTICLE ENGINE
     * --------------------------------------------------------------------- */

    class BirthdayParticlesManager {
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

            this.particles =
                [];

            this.width =
                0;

            this.height =
                0;

            this.pixelRatio =
                1;

            this.running =
                false;

            this.paused =
                false;

            this.initialized =
                false;

            this.destroyed =
                false;

            this.lastFrameTime =
                0;

            this.animationFrame =
                null;

            this.resizeTimer =
                null;

            this.resizeHandler =
                null;

            this.pointerHandlersBound =
                false;

            this.pointer = {
                active:
                    false,

                x:
                    0,

                y:
                    0
            };

            this.theme =
                {
                    density:
                        1
                };
        }

        /* --------------------------------------------------------------------
         * INIT
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
                return this;
            }

            this.createCanvas();

            this.resize();

            this.bindEvents();

            this.createParticles();

            this.initialized =
                true;

            dispatch(
                EVENTS.ready,
                {
                    manager:
                        this,

                    particleCount:
                        this.particles
                            .length
                }
            );

            this.start();

            return this;
        }

        /* --------------------------------------------------------------------
         * CANVAS CREATION
         * ----------------------------------------------------------------- */

        createCanvas() {
            const existing =
                document.getElementById(
                    "sehrish-particles-canvas"
                );

            if (
                existing instanceof
                HTMLCanvasElement
            ) {
                this.canvas =
                    existing;
            } else {
                this.canvas =
                    document.createElement(
                        "canvas"
                    );

                this.canvas.id =
                    "sehrish-particles-canvas";

                this.canvas.setAttribute(
                    "aria-hidden",
                    "true"
                );

                this.canvas.dataset
                    .ambientParticles =
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

            this.context =
                this.canvas.getContext(
                    "2d"
                );

            if (
                !this.context
            ) {
                throw new Error(
                    "[SehrishParticles] " +
                    "Could not create 2D canvas context."
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

            this.width =
                window.innerWidth;

            this.height =
                window.innerHeight;

            this.pixelRatio =
                Math.min(
                    window.devicePixelRatio ||
                        1,
                    this.options
                        .maxDevicePixelRatio
                );

            this.canvas.width =
                Math.floor(
                    this.width *
                        this.pixelRatio
                );

            this.canvas.height =
                Math.floor(
                    this.height *
                        this.pixelRatio
                );

            this.context.setTransform(
                this.pixelRatio,
                0,
                0,
                this.pixelRatio,
                0,
                0
            );

            this.adjustParticleCount();

            dispatch(
                EVENTS.resized,
                {
                    manager:
                        this,

                    width:
                        this.width,

                    height:
                        this.height
                }
            );
        }

        /* --------------------------------------------------------------------
         * DEVICE DENSITY
         * ----------------------------------------------------------------- */

        getDeviceParticleCount() {
            if (
                this.options
                    .highPerformanceMode
            ) {
                return Math.min(
                    16,
                    this.options
                        .mobileParticleCount
                );
            }

            const width =
                window.innerWidth;

            if (
                width <= 600
            ) {
                return this.options
                    .mobileParticleCount;
            }

            if (
                width <= 1024
            ) {
                return this.options
                    .tabletParticleCount;
            }

            return this.options
                .desktopParticleCount;
        }

        /* --------------------------------------------------------------------
         * CREATE PARTICLES
         * ----------------------------------------------------------------- */

        createParticles() {
            this.particles =
                [];

            const targetCount =
                this.getTargetParticleCount();

            for (
                let index = 0;
                index <
                targetCount;
                index += 1
            ) {
                this.particles.push(
                    new AmbientParticle(
                        this
                    )
                );
            }

            this.adjustThemeDensity();

            dispatch(
                EVENTS.densityChanged,
                {
                    manager:
                        this,

                    particleCount:
                        this.particles
                            .length
                }
            );
        }

        /* --------------------------------------------------------------------
         * TARGET COUNT
         * ----------------------------------------------------------------- */

        getTargetParticleCount() {
            const configured =
                Number(
                    this.options
                        .particleCount
                );

            const device =
                this.getDeviceParticleCount();

            if (
                Number.isFinite(
                    configured
                ) &&
                configured > 0
            ) {
                return clamp(
                    Math.round(
                        configured
                    ),
                    0,
                    180
                );
            }

            return clamp(
                Math.round(
                    device
                ),
                0,
                180
            );
        }

        /* --------------------------------------------------------------------
         * ADJUST PARTICLE COUNT
         * ----------------------------------------------------------------- */

        adjustParticleCount() {
            const target =
                this.getTargetParticleCount();

            if (
                this.particles
                    .length <
                target
            ) {
                while (
                    this.particles
                        .length <
                    target
                ) {
                    this.particles.push(
                        new AmbientParticle(
                            this
                        )
                    );
                }
            } else if (
                this.particles
                    .length >
                target
            ) {
                this.particles.length =
                    target;
            }
        }

        /* --------------------------------------------------------------------
         * THEME DENSITY
         * ----------------------------------------------------------------- */

        adjustThemeDensity() {
            const root =
                document.documentElement;

            const density =
                Number(
                    root.dataset
                        .particleDensity
                );

            if (
                Number.isFinite(
                    density
                )
            ) {
                this.setDensity(
                    density
                );
            }
        }

        /* --------------------------------------------------------------------
         * SET DENSITY
         * ----------------------------------------------------------------- */

        setDensity(
            multiplier
        ) {
            const normalized =
                clamp(
                    Number(
                        multiplier
                    ) || 1,
                    0,
                    2
                );

            this.theme.density =
                normalized;

            const base =
                this.getDeviceParticleCount();

            const target =
                Math.round(
                    base *
                    normalized
                );

            this.setParticleCount(
                target
            );

            dispatch(
                EVENTS.densityChanged,
                {
                    manager:
                        this,

                    density:
                        normalized,

                    particleCount:
                        this.particles
                            .length
                }
            );
        }

        /* --------------------------------------------------------------------
         * SET PARTICLE COUNT
         * ----------------------------------------------------------------- */

        setParticleCount(
            count
        ) {
            const target =
                clamp(
                    Math.round(
                        Number(
                            count
                        ) || 0
                    ),
                    0,
                    180
                );

            while (
                this.particles
                    .length <
                target
            ) {
                this.particles.push(
                    new AmbientParticle(
                        this
                    )
                );
            }

            if (
                this.particles
                    .length >
                target
            ) {
                this.particles.length =
                    target;
            }

            return this;
        }

        /* --------------------------------------------------------------------
         * EVENT BINDING
         * ----------------------------------------------------------------- */

        bindEvents() {
            if (
                this.resizeHandler
            ) {
                return;
            }

            this.resizeHandler =
                () => {
                    if (
                        this.resizeTimer
                    ) {
                        return;
                    }

                    this.resizeTimer =
                        window.setTimeout(
                            () => {
                                this.resizeTimer =
                                    null;

                                this.resize();
                            },
                            this.options
                                .resizeThrottle
                        );
                };

            window.addEventListener(
                "resize",
                this.resizeHandler,
                {
                    passive:
                        true
                }
            );

            if (
                this.options
                    .interactive
            ) {
                this.bindPointerEvents();
            }

            window.addEventListener(
                "sehrish:navigation:change",
                this.boundSceneChange ||
                    (
                        this.boundSceneChange =
                            (
                                event
                            ) =>
                                this.handleSceneChange(
                                    event
                                )
                    )
            );
        }

        /* --------------------------------------------------------------------
         * POINTER EVENTS
         * ----------------------------------------------------------------- */

        bindPointerEvents() {
            if (
                this.pointerHandlersBound
            ) {
                return;
            }

            this.pointerHandlersBound =
                true;

            this.boundPointerMove =
                (
                    event
                ) => {
                    this.pointer.active =
                        true;

                    this.pointer.x =
                        event.clientX;

                    this.pointer.y =
                        event.clientY;
                };

            this.boundPointerLeave =
                () => {
                    this.pointer.active =
                        false;
                };

            window.addEventListener(
                "pointermove",
                this.boundPointerMove,
                {
                    passive:
                        true
                }
            );

            window.addEventListener(
                "pointerleave",
                this.boundPointerLeave,
                {
                    passive:
                        true
                }
            );

            window.addEventListener(
                "blur",
                this.boundPointerLeave,
                {
                    passive:
                        true
                }
            );
        }

        /* --------------------------------------------------------------------
         * SCENE CHANGE
         * ----------------------------------------------------------------- */

        handleSceneChange(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const scene =
                detail.toScene ||
                detail.scene;

            const element =
                scene?.element ||
                (
                    scene instanceof
                    HTMLElement
                        ? scene
                        : null
                );

            if (
                !element
            ) {
                return;
            }

            const density =
                Number(
                    element.dataset
                        .particleDensity
                );

            if (
                Number.isFinite(
                    density
                )
            ) {
                this.setDensity(
                    density
                );
            }
        }

        /* --------------------------------------------------------------------
         * START
         * ----------------------------------------------------------------- */

        start() {
            if (
                this.destroyed ||
                !this.options.enabled
            ) {
                return this;
            }

            if (
                this.shouldReduceMotion()
            ) {
                this.running =
                    false;

                return this;
            }

            if (
                this.running
            ) {
                return this;
            }

            this.running =
                true;

            this.paused =
                false;

            this.lastFrameTime =
                performance.now();

            dispatch(
                EVENTS.started,
                {
                    manager:
                        this
                }
            );

            this.animationFrame =
                requestAnimationFrame(
                    (
                        time
                    ) =>
                        this.animate(
                            time
                        )
                );

            return this;
        }

        /* --------------------------------------------------------------------
         * PAUSE
         * ----------------------------------------------------------------- */

        pause() {
            if (
                !this.running
            ) {
                return this;
            }

            this.paused =
                true;

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

            dispatch(
                EVENTS.paused,
                {
                    manager:
                        this
                }
            );

            return this;
        }

        /* --------------------------------------------------------------------
         * RESUME
         * ----------------------------------------------------------------- */

        resume() {
            if (
                this.destroyed
            ) {
                return this;
            }

            if (
                !this.paused
            ) {
                return this;
            }

            if (
                this.shouldReduceMotion()
            ) {
                return this;
            }

            this.paused =
                false;

            this.running =
                true;

            this.lastFrameTime =
                performance.now();

            dispatch(
                EVENTS.resumed,
                {
                    manager:
                        this
                }
            );

            this.animationFrame =
                requestAnimationFrame(
                    (
                        time
                    ) =>
                        this.animate(
                            time
                        )
                );

            return this;
        }

        /* --------------------------------------------------------------------
         * STOP
         * ----------------------------------------------------------------- */

        stop() {
            this.running =
                false;

            this.paused =
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

            dispatch(
                EVENTS.stopped,
                {
                    manager:
                        this
                }
            );

            return this;
        }

        /* --------------------------------------------------------------------
         * ANIMATION
         * ----------------------------------------------------------------- */

        animate(
            timestamp
        ) {
            if (
                !this.running ||
                this.destroyed
            ) {
                return;
            }

            if (
                this.shouldReduceMotion()
            ) {
                this.stop();

                this.clearCanvas();

                return;
            }

            const deltaTime =
                timestamp -
                this.lastFrameTime;

            this.lastFrameTime =
                timestamp;

            this.clearCanvas();

            this.updateParticles(
                deltaTime
            );

            this.drawParticles();

            if (
                this.options
                    .connectionLines
            ) {
                this.drawConnections();
            }

            this.animationFrame =
                requestAnimationFrame(
                    (
                        time
                    ) =>
                        this.animate(
                            time
                        )
                );
        }

        /* --------------------------------------------------------------------
         * UPDATE PARTICLES
         * ----------------------------------------------------------------- */

        updateParticles(
            deltaTime
        ) {
            this.particles.forEach(
                (
                    particle
                ) => {
                    particle.update(
                        deltaTime
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * DRAW PARTICLES
         * ----------------------------------------------------------------- */

        drawParticles() {
            if (
                !this.context
            ) {
                return;
            }

            this.particles.forEach(
                (
                    particle
                ) => {
                    particle.draw(
                        this.context
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * CONNECTIONS
         * ----------------------------------------------------------------- */

        drawConnections() {
            if (
                !this.context
            ) {
                return;
            }

            const maxDistance =
                this.options
                    .connectionDistance;

            for (
                let firstIndex = 0;
                firstIndex <
                    this.particles
                        .length;
                firstIndex +=
                    1
            ) {
                const first =
                    this.particles[
                        firstIndex
                    ];

                for (
                    let secondIndex =
                        firstIndex + 1;
                    secondIndex <
                        this.particles
                            .length;
                    secondIndex +=
                        1
                ) {
                    const second =
                        this.particles[
                            secondIndex
                        ];

                    const currentDistance =
                        distance(
                            first.x,
                            first.y,
                            second.x,
                            second.y
                        );

                    if (
                        currentDistance >
                        maxDistance
                    ) {
                        continue;
                    }

                    const strength =
                        1 -
                        currentDistance /
                            maxDistance;

                    this.context.save();

                    this.context.globalAlpha =
                        strength *
                        this.options
                            .connectionOpacity;

                    this.context.beginPath();

                    this.context.moveTo(
                        first.x,
                        first.y
                    );

                    this.context.lineTo(
                        second.x,
                        second.y
                    );

                    this.context.stroke();

                    this.context.restore();
                }
            }
        }

        /* --------------------------------------------------------------------
         * CLEAR CANVAS
         * ----------------------------------------------------------------- */

        clearCanvas() {
            if (
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
        }

        /* --------------------------------------------------------------------
         * CLEAR PARTICLES
         * ----------------------------------------------------------------- */

        clear() {
            this.particles =
                [];

            this.clearCanvas();

            dispatch(
                EVENTS.cleared,
                {
                    manager:
                        this
                }
            );

            return this;
        }

        /* --------------------------------------------------------------------
         * REDUCED MOTION
         * ----------------------------------------------------------------- */

        shouldReduceMotion() {
            return (
                this.options
                    .respectReducedMotion &&
                prefersReducedMotion()
            );
        }

        /* --------------------------------------------------------------------
         * ENABLE
         * ----------------------------------------------------------------- */

        enable() {
            this.options.enabled =
                true;

            this.createParticles();

            this.start();

            return this;
        }

        /* --------------------------------------------------------------------
         * DISABLE
         * ----------------------------------------------------------------- */

        disable() {
            this.options.enabled =
                false;

            this.stop();

            this.clear();

            return this;
        }

        /* --------------------------------------------------------------------
         * FORCE STATIC FRAME
         * ----------------------------------------------------------------- */

        renderStatic() {
            if (
                this.destroyed
            ) {
                return;
            }

            this.clearCanvas();

            this.particles.forEach(
                (
                    particle
                ) => {
                    particle.draw(
                        this.context
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * STATE
         * ----------------------------------------------------------------- */

        getState() {
            return {
                version:
                    VERSION,

                initialized:
                    this.initialized,

                destroyed:
                    this.destroyed,

                enabled:
                    this.options.enabled,

                running:
                    this.running,

                paused:
                    this.paused,

                reducedMotion:
                    this.shouldReduceMotion(),

                particleCount:
                    this.particles.length,

                width:
                    this.width,

                height:
                    this.height,

                pixelRatio:
                    this.pixelRatio,

                density:
                    this.theme.density,

                interactive:
                    this.options
                        .interactive,

                pointerActive:
                    this.pointer.active
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

            this.stop();

            if (
                this.resizeTimer
            ) {
                window.clearTimeout(
                    this.resizeTimer
                );

                this.resizeTimer =
                    null;
            }

            if (
                this.resizeHandler
            ) {
                window.removeEventListener(
                    "resize",
                    this.resizeHandler
                );
            }

            if (
                this.boundSceneChange
            ) {
                window.removeEventListener(
                    "sehrish:navigation:change",
                    this.boundSceneChange
                );
            }

            if (
                this.pointerHandlersBound
            ) {
                window.removeEventListener(
                    "pointermove",
                    this.boundPointerMove
                );

                window.removeEventListener(
                    "pointerleave",
                    this.boundPointerLeave
                );

                window.removeEventListener(
                    "blur",
                    this.boundPointerLeave
                );

                this.pointerHandlersBound =
                    false;
            }

            this.clear();

            if (
                this.canvas &&
                this.canvas.dataset
                    .ambientParticles ===
                    "true"
            ) {
                this.canvas.remove();
            }

            this.canvas =
                null;

            this.context =
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
                    new BirthdayParticlesManager(
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
                    new BirthdayParticlesManager();

                manager.init();
            }

            return manager;
        },

        start() {
            return this.getManager()
                .start();
        },

        stop() {
            return this.getManager()
                .stop();
        },

        pause() {
            return this.getManager()
                .pause();
        },

        resume() {
            return this.getManager()
                .resume();
        },

        clear() {
            return this.getManager()
                .clear();
        },

        setDensity(
            value
        ) {
            return this.getManager()
                .setDensity(
                    value
                );
        },

        setParticleCount(
            count
        ) {
            return this.getManager()
                .setParticleCount(
                    count
                );
        },

        renderStatic() {
            return this.getManager()
                .renderStatic();
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
            if (
                manager
            ) {
                manager.destroy();
            }

            manager =
                null;
        }
    };

    /* ------------------------------------------------------------------------
     * GLOBAL EXPORTS
     * --------------------------------------------------------------------- */

    window.AmbientParticle =
        AmbientParticle;

    window.BirthdayParticlesManager =
        BirthdayParticlesManager;

    window.SehrishParticles =
        api;

    window.SehrishBirthdayParticles =
        api;

    /* ------------------------------------------------------------------------
     * AUTO BOOT
     * --------------------------------------------------------------------- */

    const boot = () => {
        try {
            api.init();
        } catch (
            error
        ) {
            console.error(
                "[SehrishParticles] " +
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
                once:
                    true
            }
        );
    } else {
        boot();
    }

    /* ------------------------------------------------------------------------
     * MODULE INTEGRATION
     * --------------------------------------------------------------------- */

    window.addEventListener(
        "sehrish:preloader:complete",
        () => {
            if (
                manager &&
                !manager.running
            ) {
                manager.start();
            }
        }
    );

    window.addEventListener(
        "sehrish:preloader:hidden",
        () => {
            if (
                manager &&
                !manager.running &&
                !manager.shouldReduceMotion()
            ) {
                manager.start();
            }
        }
    );

    console.info(
        `[SehrishParticles] ` +
        `Particle module v${VERSION} loaded.`
    );
})();