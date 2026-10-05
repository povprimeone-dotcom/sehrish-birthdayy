/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/effects.js
 * Version: 1.0.0
 *
 * Production-ready visual effects engine.
 *
 * Responsibilities:
 * - Generic UI entrance / exit effects
 * - Reveal animations
 * - Fade / slide / zoom / pop animations
 * - Sparkle effects
 * - Floating particles
 * - Shake / bounce / pulse effects
 * - Button interaction effects
 * - Scene transition effects
 * - Dynamic DOM support
 * - Reduced-motion support
 * - Automatic cleanup
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

        respectReducedMotion: true,

        defaultDuration: 600,

        defaultDelay: 0,

        sparkleCount: 12,

        particleCount: 18,

        maxActiveEffects: 120,

        observeDynamicContent: true,

        autoReveal: true,

        interactionEffects: true
    });

    const EFFECTS = Object.freeze({
        fadeIn: "fade-in",
        fadeOut: "fade-out",
        slideUp: "slide-up",
        slideDown: "slide-down",
        slideLeft: "slide-left",
        slideRight: "slide-right",
        zoomIn: "zoom-in",
        zoomOut: "zoom-out",
        pop: "pop",
        bounce: "bounce",
        pulse: "pulse",
        shake: "shake",
        float: "float",
        reveal: "reveal"
    });

    const EVENTS = Object.freeze({
        ready:
            "sehrish:effects:ready",

        start:
            "sehrish:effects:start",

        complete:
            "sehrish:effects:complete",

        sparkle:
            "sehrish:effects:sparkle",

        particle:
            "sehrish:effects:particle",

        destroyed:
            "sehrish:effects:destroyed"
    });

    const SELECTORS = Object.freeze({
        effect:
            "[data-effect]",

        reveal:
            "[data-reveal]",

        sparkle:
            "[data-sparkle]",

        float:
            "[data-float]",

        interaction:
            "[data-effect-hover], " +
            "[data-effect-press], " +
            "[data-effect-tilt]"
    });

    /* ------------------------------------------------------------------------
     * UTILITY FUNCTIONS
     * --------------------------------------------------------------------- */

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

    const prefersReducedMotion =
        () => {
            try {
                return window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches;
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
            /* Ignore event errors. */
        }
    };

    const wait = (
        milliseconds
    ) => {
        if (
            !milliseconds ||
            milliseconds <= 0
        ) {
            return Promise.resolve();
        }

        return new Promise(
            (resolve) => {
                window.setTimeout(
                    resolve,
                    milliseconds
                );
            }
        );
    };

    /* ------------------------------------------------------------------------
     * EFFECT INSTANCE
     * --------------------------------------------------------------------- */

    class EffectInstance {
        constructor(
            element,
            name,
            options = {}
        ) {
            this.element =
                element;

            this.name =
                name;

            this.options =
                options;

            this.started =
                false;

            this.completed =
                false;

            this.cancelled =
                false;

            this.startedAt =
                null;

            this.completedAt =
                null;

            this.timer =
                null;

            this.cleanup =
                null;
        }

        markStarted() {
            this.started =
                true;

            this.startedAt =
                performance.now();
        }

        markCompleted() {
            this.completed =
                true;

            this.completedAt =
                performance.now();
        }

        cancel() {
            this.cancelled =
                true;

            if (
                this.timer !==
                null
            ) {
                window.clearTimeout(
                    this.timer
                );

                this.timer =
                    null;
            }

            if (
                typeof this.cleanup ===
                "function"
            ) {
                try {
                    this.cleanup();
                } catch {
                    /* Ignore cleanup errors. */
                }
            }
        }

        getState() {
            return {
                name:
                    this.name,

                started:
                    this.started,

                completed:
                    this.completed,

                cancelled:
                    this.cancelled,

                startedAt:
                    this.startedAt,

                completedAt:
                    this.completedAt
            };
        }
    }

    /* ------------------------------------------------------------------------
     * VISUAL EFFECTS MANAGER
     * --------------------------------------------------------------------- */

    class BirthdayEffectsManager {
        constructor(
            options = {}
        ) {
            this.options = {
                ...DEFAULTS,
                ...options
            };

            this.instances =
                new Set();

            this.generatedElements =
                new Set();

            this.observer =
                null;

            this.listeners =
                [];

            this.initialized =
                false;

            this.destroyed =
                false;

            this.active =
                true;
        }

        /* --------------------------------------------------------------------
         * INITIALIZATION
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

            this.active =
                Boolean(
                    this.options.enabled
                );

            this.applyMotionState();

            this.prepareExistingElements();

            this.bindEvents();

            if (
                this.options
                    .observeDynamicContent
            ) {
                this.startObserver();
            }

            this.initialized =
                true;

            dispatch(
                EVENTS.ready,
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

        applyMotionState() {
            document.documentElement.classList.toggle(
                "effects-reduced-motion",
                this.shouldReduceMotion()
            );
        }

        /* --------------------------------------------------------------------
         * PREPARE EXISTING ELEMENTS
         * ----------------------------------------------------------------- */

        prepareExistingElements() {
            if (
                !this.options
                    .autoReveal
            ) {
                return;
            }

            document
                .querySelectorAll(
                    SELECTORS.effect
                )
                .forEach(
                    (
                        element
                    ) => {
                        this.prepareEffectElement(
                            element
                        );
                    }
                );

            document
                .querySelectorAll(
                    SELECTORS.reveal
                )
                .forEach(
                    (
                        element
                    ) => {
                        this.prepareReveal(
                            element
                        );
                    }
                );

            document
                .querySelectorAll(
                    SELECTORS.float
                )
                .forEach(
                    (
                        element
                    ) => {
                        this.prepareFloat(
                            element
                        );
                    }
                );
        }

        /* --------------------------------------------------------------------
         * PREPARE EFFECT ELEMENT
         * ----------------------------------------------------------------- */

        prepareEffectElement(
            element
        ) {
            const effect =
                element.dataset.effect;

            if (
                !effect
            ) {
                return;
            }

            element.dataset.effectPrepared =
                "true";

            element.style.setProperty(
                "--effect-duration",
                `${this.getElementDuration(
                    element
                )}ms`
            );

            const delay =
                this.getElementDelay(
                    element
                );

            element.style.setProperty(
                "--effect-delay",
                `${delay}ms`
            );
        }

        /* --------------------------------------------------------------------
         * PREPARE REVEAL
         * ----------------------------------------------------------------- */

        prepareReveal(
            element
        ) {
            if (
                element.dataset
                    .effectPrepared ===
                "true"
            ) {
                return;
            }

            element.dataset.effectPrepared =
                "true";

            element.classList.add(
                "effect-reveal-ready"
            );
        }

        /* --------------------------------------------------------------------
         * PREPARE FLOAT
         * ----------------------------------------------------------------- */

        prepareFloat(
            element
        ) {
            const duration =
                Number(
                    element.dataset
                        .floatDuration
                );

            const delay =
                Number(
                    element.dataset
                        .floatDelay
                );

            element.style.setProperty(
                "--float-duration",
                `${
                    Number.isFinite(
                        duration
                    )
                        ? duration
                        : 3500
                }ms`
            );

            element.style.setProperty(
                "--float-delay",
                `${
                    Number.isFinite(
                        delay
                    )
                        ? delay
                        : 0
                }ms`
            );
        }

        /* --------------------------------------------------------------------
         * EVENT BINDING
         * ----------------------------------------------------------------- */

        bindEvents() {
            this.addListener(
                document,
                "click",
                (
                    event
                ) =>
                    this.handleClick(
                        event
                    )
            );

            this.addListener(
                document,
                "pointerdown",
                (
                    event
                ) =>
                    this.handlePointerDown(
                        event
                    )
            );

            this.addListener(
                document,
                "pointerenter",
                (
                    event
                ) =>
                    this.handlePointerEnter(
                        event
                    ),
                true
            );

            this.addListener(
                document,
                "pointerleave",
                (
                    event
                ) =>
                    this.handlePointerLeave(
                        event
                    ),
                true
            );

            this.addListener(
                window,
                "sehrish:navigation:change",
                (
                    event
                ) =>
                    this.handleSceneChange(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:navigation:after-change",
                (
                    event
                ) =>
                    this.handleSceneAfterChange(
                        event
                    )
            );
        }

        addListener(
            target,
            eventName,
            handler,
            capture = false
        ) {
            target.addEventListener(
                eventName,
                handler,
                capture
            );

            this.listeners.push({
                target,
                eventName,
                handler,
                capture
            });
        }

        /* --------------------------------------------------------------------
         * CLICK
         * ----------------------------------------------------------------- */

        handleClick(
            event
        ) {
            if (
                !this.active ||
                !this.options
                    .interactionEffects
            ) {
                return;
            }

            if (
                !(
                    event.target instanceof
                    Element
                )
            ) {
                return;
            }

            const element =
                event.target.closest(
                    "[data-effect-click]"
                );

            if (
                !element
            ) {
                return;
            }

            const effect =
                element.dataset
                    .effectClick ||
                "pop";

            this.play(
                element,
                effect,
                {
                    source:
                        "click"
                }
            );
        }

        /* --------------------------------------------------------------------
         * POINTER DOWN
         * ----------------------------------------------------------------- */

        handlePointerDown(
            event
        ) {
            if (
                !this.active ||
                !this.options
                    .interactionEffects
            ) {
                return;
            }

            if (
                !(
                    event.target instanceof
                    Element
                )
            ) {
                return;
            }

            const element =
                event.target.closest(
                    "[data-effect-press]"
                );

            if (
                !element
            ) {
                return;
            }

            const effect =
                element.dataset
                    .effectPress ||
                "pulse";

            this.play(
                element,
                effect,
                {
                    source:
                        "press"
                }
            );
        }

        /* --------------------------------------------------------------------
         * POINTER ENTER
         * ----------------------------------------------------------------- */

        handlePointerEnter(
            event
        ) {
            if (
                !this.active ||
                !this.options
                    .interactionEffects
            ) {
                return;
            }

            const element =
                event.target;

            if (
                !(
                    element instanceof
                    Element
                )
            ) {
                return;
            }

            if (
                !element.matches(
                    "[data-effect-hover]"
                )
            ) {
                return;
            }

            const effect =
                element.dataset
                    .effectHover ||
                "pulse";

            this.play(
                element,
                effect,
                {
                    source:
                        "hover"
                }
            );
        }

        /* --------------------------------------------------------------------
         * POINTER LEAVE
         * ----------------------------------------------------------------- */

        handlePointerLeave(
            event
        ) {
            const element =
                event.target;

            if (
                !(
                    element instanceof
                    Element
                )
            ) {
                return;
            }

            element.classList.remove(
                "effect-hover-active"
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

            const target =
                detail.toScene ||
                detail.scene;

            const element =
                target?.element ||
                (
                    target instanceof
                    HTMLElement
                        ? target
                        : null
                );

            if (
                !element
            ) {
                return;
            }

            if (
                this.shouldReduceMotion()
            ) {
                return;
            }

            this.revealScene(
                element
            );
        }

        /* --------------------------------------------------------------------
         * AFTER SCENE CHANGE
         * ----------------------------------------------------------------- */

        handleSceneAfterChange(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const target =
                detail.toScene ||
                detail.scene;

            const element =
                target?.element;

            if (
                !element
            ) {
                return;
            }

            this.triggerSceneEffects(
                element
            );
        }

        /* --------------------------------------------------------------------
         * PLAY EFFECT
         * ----------------------------------------------------------------- */

        async play(
            element,
            effect,
            options = {}
        ) {
            if (
                !this.active ||
                !element ||
                this.destroyed
            ) {
                return null;
            }

            if (
                this.instances.size >=
                this.options
                    .maxActiveEffects
            ) {
                this.cleanupOldestEffect();
            }

            const effectName =
                String(
                    effect ||
                        EFFECTS.fadeIn
                ).trim();

            const duration =
                Number.isFinite(
                    options.duration
                )
                    ? Math.max(
                          0,
                          options.duration
                      )
                    : this.getElementDuration(
                          element
                      );

            const delayValue =
                Number.isFinite(
                    options.delay
                )
                    ? Math.max(
                          0,
                          options.delay
                      )
                    : this.getElementDelay(
                          element
                      );

            const instance =
                new EffectInstance(
                    element,
                    effectName,
                    {
                        ...options,
                        duration:
                            duration,
                        delay:
                            delayValue
                    }
                );

            this.instances.add(
                instance
            );

            dispatch(
                EVENTS.start,
                {
                    manager:
                        this,

                    instance
                }
            );

            instance.markStarted();

            if (
                delayValue > 0
            ) {
                await wait(
                    delayValue
                );
            }

            if (
                instance.cancelled
            ) {
                return null;
            }

            if (
                this.shouldReduceMotion()
            ) {
                await this.runReducedEffect(
                    instance
                );

                this.finishInstance(
                    instance
                );

                return instance;
            }

            await this.runEffect(
                instance
            );

            this.finishInstance(
                instance
            );

            return instance;
        }

        /* --------------------------------------------------------------------
         * EFFECT DISPATCHER
         * ----------------------------------------------------------------- */

        async runEffect(
            instance
        ) {
            const element =
                instance.element;

            const effect =
                instance.name;

            const duration =
                instance.options
                    .duration;

            const className =
                `effect-${effect}`;

            element.classList.remove(
                "effect-active",
                "effect-complete"
            );

            element.classList.add(
                className,
                "effect-active"
            );

            void element.offsetWidth;

            await wait(
                duration
            );

            element.classList.remove(
                className,
                "effect-active"
            );

            element.classList.add(
                "effect-complete"
            );

            await wait(
                30
            );

            element.classList.remove(
                "effect-complete"
            );
        }

        /* --------------------------------------------------------------------
         * REDUCED EFFECT
         * ----------------------------------------------------------------- */

        async runReducedEffect(
            instance
        ) {
            const element =
                instance.element;

            element.classList.add(
                "effect-reduced-feedback"
            );

            await wait(
                Math.min(
                    120,
                    instance.options
                        .duration
                )
            );

            element.classList.remove(
                "effect-reduced-feedback"
            );
        }

        /* --------------------------------------------------------------------
         * FINISH INSTANCE
         * ----------------------------------------------------------------- */

        finishInstance(
            instance
        ) {
            if (
                instance.completed
            ) {
                return;
            }

            instance.markCompleted();

            this.instances.delete(
                instance
            );

            dispatch(
                EVENTS.complete,
                {
                    manager:
                        this,

                    instance
                }
            );
        }

        /* --------------------------------------------------------------------
         * REVEAL
         * ----------------------------------------------------------------- */

        async reveal(
            element,
            options = {}
        ) {
            if (
                !element
            ) {
                return null;
            }

            const effect =
                options.effect ||
                element.dataset
                    .reveal ||
                EFFECTS.reveal;

            element.classList.add(
                "effect-reveal-hidden"
            );

            await wait(
                Number(
                    options.delay ||
                        element.dataset
                            .revealDelay ||
                        0
                )
            );

            element.classList.remove(
                "effect-reveal-hidden"
            );

            return this.play(
                element,
                effect,
                {
                    ...options,

                    source:
                        options.source ||
                        "reveal"
                }
            );
        }

        /* --------------------------------------------------------------------
         * REVEAL SCENE
         * ----------------------------------------------------------------- */

        async revealScene(
            scene
        ) {
            if (
                !scene ||
                this.shouldReduceMotion()
            ) {
                return;
            }

            const elements =
                scene.querySelectorAll(
                    "[data-reveal], " +
                    "[data-effect]"
                );

            let index = 0;

            for (
                const element of
                    elements
            ) {
                const delayValue =
                    Number(
                        element.dataset
                            .revealDelay ||
                        element.dataset
                            .effectDelay ||
                        index * 70
                    );

                void this.reveal(
                    element,
                    {
                        delay:
                            delayValue,

                        duration:
                            Number(
                                element
                                    .dataset
                                    .effectDuration ||
                                    this.options
                                        .defaultDuration
                            ),

                        source:
                            "scene"
                    }
                );

                index += 1;
            }
        }

        /* --------------------------------------------------------------------
         * SCENE EFFECTS
         * ----------------------------------------------------------------- */

        triggerSceneEffects(
            scene
        ) {
            if (
                !scene ||
                !this.active
            ) {
                return;
            }

            const sparkleTarget =
                scene.querySelector(
                    "[data-scene-sparkle]"
                );

            if (
                sparkleTarget
            ) {
                this.sparkle(
                    sparkleTarget,
                    {
                        count:
                            this.options
                                .sparkleCount
                    }
                );
            }

            const floating =
                scene.querySelector(
                    "[data-scene-float]"
                );

            if (
                floating
            ) {
                this.float(
                    floating
                );
            }
        }

        /* --------------------------------------------------------------------
         * SPARKLE
         * ----------------------------------------------------------------- */

        sparkle(
            target,
            options = {}
        ) {
            if (
                !this.active ||
                !target
            ) {
                return [];
            }

            if (
                this.shouldReduceMotion()
            ) {
                return [];
            }

            const count =
                clamp(
                    Number.isFinite(
                        options.count
                    )
                        ? Math.floor(
                              options.count
                          )
                        : this.options
                              .sparkleCount,
                    1,
                    50
                );

            const rect =
                target.getBoundingClientRect();

            const container =
                document.createElement(
                    "div"
                );

            container.className =
                "birthday-sparkle-layer";

            container.setAttribute(
                "aria-hidden",
                "true"
            );

            container.style.position =
                "fixed";

            container.style.left =
                "0";

            container.style.top =
                "0";

            container.style.width =
                "100vw";

            container.style.height =
                "100vh";

            container.style.pointerEvents =
                "none";

            container.style.zIndex =
                "9998";

            document.body.appendChild(
                container
            );

            this.generatedElements.add(
                container
            );

            const particles =
                [];

            for (
                let index = 0;
                index < count;
                index += 1
            ) {
                const sparkle =
                    document.createElement(
                        "span"
                    );

                sparkle.className =
                    "birthday-sparkle";

                sparkle.textContent =
                    options.symbol ||
                    "✦";

                sparkle.style.position =
                    "fixed";

                sparkle.style.left =
                    `${
                        rect.left +
                        random(
                            0,
                            Math.max(
                                1,
                                rect.width
                            )
                        )
                    }px`;

                sparkle.style.top =
                    `${
                        rect.top +
                        random(
                            0,
                            Math.max(
                                1,
                                rect.height
                            )
                        )
                    }px`;

                sparkle.style.fontSize =
                    `${
                        random(
                            9,
                            20
                        )
                    }px`;

                sparkle.style.opacity =
                    "0";

                sparkle.style.transform =
                    "scale(0)";

                sparkle.style.willChange =
                    "transform, opacity";

                container.appendChild(
                    sparkle
                );

                particles.push(
                    sparkle
                );

                this.animateSparkle(
                    sparkle
                );
            }

            dispatch(
                EVENTS.sparkle,
                {
                    manager:
                        this,

                    target,

                    count
                }
            );

            window.setTimeout(
                () => {
                    container.remove();

                    this.generatedElements.delete(
                        container
                    );
                },
                1200
            );

            return particles;
        }

        /* --------------------------------------------------------------------
         * SPARKLE ANIMATION
         * ----------------------------------------------------------------- */

        animateSparkle(
            sparkle
        ) {
            const x =
                random(
                    -45,
                    45
                );

            const y =
                random(
                    -60,
                    30
                );

            const rotation =
                random(
                    -180,
                    180
                );

            const duration =
                random(
                    650,
                    1050
                );

            const delayValue =
                random(
                    0,
                    180
                );

            window.setTimeout(
                () => {
                    if (
                        !document.contains(
                            sparkle
                        )
                    ) {
                        return;
                    }

                    sparkle.style.transition =
                        `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;

                    sparkle.style.opacity =
                        "1";

                    sparkle.style.transform =
                        `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(1)`;

                    window.setTimeout(
                        () => {
                            if (
                                !document.contains(
                                    sparkle
                                )
                            ) {
                                return;
                            }

                            sparkle.style.opacity =
                                "0";

                            sparkle.style.transform =
                                `translate(${x}px, ${
                                    y - 15
                                }px) rotate(${
                                    rotation +
                                    90
                                }deg) scale(0.2)`;
                        },
                        duration *
                            0.65
                    );
                },
                delayValue
            );
        }

        /* --------------------------------------------------------------------
         * FLOAT
         * ----------------------------------------------------------------- */

        float(
            element,
            options = {}
        ) {
            if (
                !element ||
                this.shouldReduceMotion()
            ) {
                return null;
            }

            const duration =
                Number.isFinite(
                    options.duration
                )
                    ? options.duration
                    : Number(
                          element.dataset
                              .floatDuration
                      ) ||
                      3500;

            const amount =
                Number.isFinite(
                    options.amount
                )
                    ? options.amount
                    : 10;

            const direction =
                options.direction ||
                "vertical";

            const className =
                "effect-floating";

            element.style.setProperty(
                "--float-duration",
                `${duration}ms`
            );

            element.style.setProperty(
                "--float-distance",
                `${amount}px`
            );

            element.dataset.floatDirection =
                direction;

            element.classList.add(
                className
            );

            dispatch(
                EVENTS.particle,
                {
                    manager:
                        this,

                    type:
                        "float",

                    element
                }
            );

            return element;
        }

        /* --------------------------------------------------------------------
         * PARTICLE FIELD
         * ----------------------------------------------------------------- */

        particles(
            options = {}
        ) {
            if (
                !this.active ||
                this.shouldReduceMotion()
            ) {
                return [];
            }

            const count =
                clamp(
                    Number.isFinite(
                        options.count
                    )
                        ? Math.floor(
                              options.count
                          )
                        : this.options
                              .particleCount,
                    1,
                    100
                );

            const container =
                document.createElement(
                    "div"
                );

            container.className =
                "birthday-particle-field";

            container.setAttribute(
                "aria-hidden",
                "true"
            );

            container.style.position =
                "fixed";

            container.style.inset =
                "0";

            container.style.pointerEvents =
                "none";

            container.style.overflow =
                "hidden";

            container.style.zIndex =
                "9997";

            document.body.appendChild(
                container
            );

            this.generatedElements.add(
                container
            );

            const particles =
                [];

            for (
                let index = 0;
                index < count;
                index += 1
            ) {
                const particle =
                    document.createElement(
                        "span"
                    );

                particle.className =
                    "birthday-floating-particle";

                particle.setAttribute(
                    "aria-hidden",
                    "true"
                );

                particle.textContent =
                    options.symbol ||
                    "•";

                particle.style.position =
                    "absolute";

                particle.style.left =
                    `${random(
                        0,
                        100
                    )}%`;

                particle.style.top =
                    `${random(
                        100,
                        115
                    )}%`;

                particle.style.fontSize =
                    `${random(
                        5,
                        14
                    )}px`;

                particle.style.opacity =
                    String(
                        random(
                            0.25,
                            0.8
                        )
                    );

                particle.style.animationDuration =
                    `${random(
                        4500,
                        8000
                    )}ms`;

                particle.style.animationDelay =
                    `${random(
                        0,
                        1500
                    )}ms`;

                container.appendChild(
                    particle
                );

                particles.push(
                    particle
                );
            }

            dispatch(
                EVENTS.particle,
                {
                    manager:
                        this,

                    type:
                        "field",

                    count
                }
            );

            const duration =
                Number.isFinite(
                    options.duration
                )
                    ? Math.max(
                          500,
                          options.duration
                      )
                    : 7000;

            window.setTimeout(
                () => {
                    container.remove();

                    this.generatedElements.delete(
                        container
                    );
                },
                duration
            );

            return particles;
        }

        /* --------------------------------------------------------------------
         * EFFECT SHORTCUTS
         * ----------------------------------------------------------------- */

        fadeIn(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.fadeIn,
                options
            );
        }

        fadeOut(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.fadeOut,
                options
            );
        }

        slideUp(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.slideUp,
                options
            );
        }

        slideDown(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.slideDown,
                options
            );
        }

        slideLeft(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.slideLeft,
                options
            );
        }

        slideRight(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.slideRight,
                options
            );
        }

        zoomIn(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.zoomIn,
                options
            );
        }

        zoomOut(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.zoomOut,
                options
            );
        }

        pop(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.pop,
                options
            );
        }

        bounce(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.bounce,
                options
            );
        }

        pulse(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.pulse,
                options
            );
        }

        shake(
            element,
            options = {}
        ) {
            return this.play(
                element,
                EFFECTS.shake,
                options
            );
        }

        /* --------------------------------------------------------------------
         * DURATION / DELAY
         * ----------------------------------------------------------------- */

        getElementDuration(
            element
        ) {
            const value =
                Number(
                    element?.dataset
                        ?.effectDuration
                );

            return Number.isFinite(
                value
            )
                ? Math.max(
                      0,
                      value
                  )
                : this.options
                      .defaultDuration;
        }

        getElementDelay(
            element
        ) {
            const value =
                Number(
                    element?.dataset
                        ?.effectDelay
                );

            return Number.isFinite(
                value
            )
                ? Math.max(
                      0,
                      value
                  )
                : this.options
                      .defaultDelay;
        }

        /* --------------------------------------------------------------------
         * CLEANUP
         * ----------------------------------------------------------------- */

        cleanupOldestEffect() {
            const first =
                this.instances.values()
                    .next()
                    .value;

            if (
                first
            ) {
                first.cancel();

                this.instances.delete(
                    first
                );
            }
        }

        clearGeneratedElements() {
            this.generatedElements.forEach(
                (
                    element
                ) => {
                    element.remove();
                }
            );

            this.generatedElements.clear();
        }

        clearEffects(
            element = null
        ) {
            if (
                element
            ) {
                element.classList.remove(
                    ...Array.from(
                        Object.values(
                            EFFECTS
                        )
                    ).map(
                        (
                            effect
                        ) =>
                            `effect-${effect}`
                    ),
                    "effect-active",
                    "effect-complete",
                    "effect-reduced-feedback",
                    "effect-reveal-hidden",
                    "effect-floating"
                );

                return;
            }

            this.instances.forEach(
                (
                    instance
                ) => {
                    instance.cancel();
                }
            );

            this.instances.clear();

            document
                .querySelectorAll(
                    "[class*=\"effect-\"]"
                )
                .forEach(
                    (
                        item
                    ) => {
                        item.classList.remove(
                            "effect-active",
                            "effect-complete",
                            "effect-reduced-feedback",
                            "effect-reveal-hidden",
                            "effect-floating"
                        );
                    }
                );
        }

        /* --------------------------------------------------------------------
         * DYNAMIC DOM OBSERVER
         * ----------------------------------------------------------------- */

        startObserver() {
            if (
                !(
                    "MutationObserver" in
                    window
                )
            ) {
                return;
            }

            if (
                this.observer
            ) {
                return;
            }

            this.observer =
                new MutationObserver(
                    (
                        mutations
                    ) => {
                        mutations.forEach(
                            (
                                mutation
                            ) => {
                                mutation.addedNodes.forEach(
                                    (
                                        node
                                    ) => {
                                        if (
                                            !(
                                                node instanceof
                                                Element
                                            )
                                        ) {
                                            return;
                                        }

                                        if (
                                            node.matches(
                                                SELECTORS.effect
                                            )
                                        ) {
                                            this.prepareEffectElement(
                                                node
                                            );
                                        }

                                        if (
                                            node.matches(
                                                SELECTORS.reveal
                                            )
                                        ) {
                                            this.prepareReveal(
                                                node
                                            );
                                        }

                                        if (
                                            node.matches(
                                                SELECTORS.float
                                            )
                                        ) {
                                            this.prepareFloat(
                                                node
                                            );
                                        }

                                        node
                                            .querySelectorAll?.(
                                                SELECTORS.effect
                                            )
                                            .forEach(
                                                (
                                                    child
                                                ) => {
                                                    this.prepareEffectElement(
                                                        child
                                                    );
                                                }
                                            );

                                        node
                                            .querySelectorAll?.(
                                                SELECTORS.reveal
                                            )
                                            .forEach(
                                                (
                                                    child
                                                ) => {
                                                    this.prepareReveal(
                                                        child
                                                    );
                                                }
                                            );

                                        node
                                            .querySelectorAll?.(
                                                SELECTORS.float
                                            )
                                            .forEach(
                                                (
                                                    child
                                                ) => {
                                                    this.prepareFloat(
                                                        child
                                                    );
                                                }
                                            );
                                    }
                                );
                            }
                        );
                    }
                );

            this.observer.observe(
                document.body,
                {
                    childList:
                        true,

                    subtree:
                        true
                }
            );
        }

        /* --------------------------------------------------------------------
         * ENABLE / DISABLE
         * ----------------------------------------------------------------- */

        enable() {
            this.options.enabled =
                true;

            this.active =
                true;

            return this;
        }

        disable(
            clear = true
        ) {
            this.options.enabled =
                false;

            this.active =
                false;

            if (
                clear
            ) {
                this.clearEffects();
                this.clearGeneratedElements();
            }

            return this;
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

                enabled:
                    this.options.enabled,

                active:
                    this.active,

                reducedMotion:
                    this.shouldReduceMotion(),

                activeEffects:
                    this.instances.size,

                generatedElements:
                    this.generatedElements.size,

                observerActive:
                    Boolean(
                        this.observer
                    )
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

            this.instances.forEach(
                (
                    instance
                ) => {
                    instance.cancel();
                }
            );

            this.instances.clear();

            this.clearGeneratedElements();

            if (
                this.observer
            ) {
                this.observer.disconnect();

                this.observer =
                    null;
            }

            this.listeners.forEach(
                ({
                    target,
                    eventName,
                    handler,
                    capture
                }) => {
                    target.removeEventListener(
                        eventName,
                        handler,
                        capture
                    );
                }
            );

            this.listeners =
                [];

            dispatch(
                EVENTS.destroyed,
                {
                    manager:
                        this
                }
            );

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
                    new BirthdayEffectsManager(
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
                    new BirthdayEffectsManager();

                manager.init();
            }

            return manager;
        },

        play(
            element,
            effect,
            options = {}
        ) {
            return this.getManager()
                .play(
                    element,
                    effect,
                    options
                );
        },

        reveal(
            element,
            options = {}
        ) {
            return this.getManager()
                .reveal(
                    element,
                    options
                );
        },

        revealScene(
            scene
        ) {
            return this.getManager()
                .revealScene(
                    scene
                );
        },

        triggerSceneEffects(
            scene
        ) {
            return this.getManager()
                .triggerSceneEffects(
                    scene
                );
        },

        sparkle(
            target,
            options = {}
        ) {
            return this.getManager()
                .sparkle(
                    target,
                    options
                );
        },

        particles(
            options = {}
        ) {
            return this.getManager()
                .particles(
                    options
                );
        },

        float(
            element,
            options = {}
        ) {
            return this.getManager()
                .float(
                    element,
                    options
                );
        },

        fadeIn(
            element,
            options = {}
        ) {
            return this.getManager()
                .fadeIn(
                    element,
                    options
                );
        },

        fadeOut(
            element,
            options = {}
        ) {
            return this.getManager()
                .fadeOut(
                    element,
                    options
                );
        },

        slideUp(
            element,
            options = {}
        ) {
            return this.getManager()
                .slideUp(
                    element,
                    options
                );
        },

        slideDown(
            element,
            options = {}
        ) {
            return this.getManager()
                .slideDown(
                    element,
                    options
                );
        },

        slideLeft(
            element,
            options = {}
        ) {
            return this.getManager()
                .slideLeft(
                    element,
                    options
                );
        },

        slideRight(
            element,
            options = {}
        ) {
            return this.getManager()
                .slideRight(
                    element,
                    options
                );
        },

        zoomIn(
            element,
            options = {}
        ) {
            return this.getManager()
                .zoomIn(
                    element,
                    options
                );
        },

        zoomOut(
            element,
            options = {}
        ) {
            return this.getManager()
                .zoomOut(
                    element,
                    options
                );
        },

        pop(
            element,
            options = {}
        ) {
            return this.getManager()
                .pop(
                    element,
                    options
                );
        },

        bounce(
            element,
            options = {}
        ) {
            return this.getManager()
                .bounce(
                    element,
                    options
                );
        },

        pulse(
            element,
            options = {}
        ) {
            return this.getManager()
                .pulse(
                    element,
                    options
                );
        },

        shake(
            element,
            options = {}
        ) {
            return this.getManager()
                .shake(
                    element,
                    options
                );
        },

        clearEffects(
            element = null
        ) {
            return this.getManager()
                .clearEffects(
                    element
                );
        },

        enable() {
            return this.getManager()
                .enable();
        },

        disable(
            clear = true
        ) {
            return this.getManager()
                .disable(
                    clear
                );
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

    window.EffectInstance =
        EffectInstance;

    window.BirthdayEffectsManager =
        BirthdayEffectsManager;

    window.SehrishEffects =
        api;

    window.SehrishBirthdayEffects =
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
                "[SehrishEffects] " +
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
     * CROSS-MODULE INTEGRATION
     * --------------------------------------------------------------------- */

    window.addEventListener(
        "sehrish:quiz:answer-correct",
        (
            event
        ) => {
            const target =
                event.detail?.element ||
                document.querySelector(
                    "[data-quiz-feedback]"
                );

            if (
                target
            ) {
                api.pop(
                    target
                );
            }
        }
    );

    window.addEventListener(
        "sehrish:gifts:gift-opened",
        (
            event
        ) => {
            const target =
                event.detail?.element ||
                document.querySelector(
                    "[data-gift-opened]"
                );

            if (
                target
            ) {
                api.bounce(
                    target
                );
            }
        }
    );

    window.addEventListener(
        "sehrish:cake:completed",
        (
            event
        ) => {
            const target =
                event.detail?.element ||
                document.querySelector(
                    "[data-cake]"
                );

            if (
                target
            ) {
                api.pulse(
                    target,
                    {
                        duration:
                            850
                    }
                );

                api.sparkle(
                    target,
                    {
                        count:
                            16
                    }
                );
            }
        }
    );

    window.addEventListener(
        "sehrish:letter:completed",
        (
            event
        ) => {
            const target =
                event.detail?.element ||
                document.querySelector(
                    "[data-letter]"
                );

            if (
                target
            ) {
                api.fadeIn(
                    target
                );
            }
        }
    );

    console.info(
        `[SehrishEffects] ` +
        `Effects module v${VERSION} loaded.`
    );
})();