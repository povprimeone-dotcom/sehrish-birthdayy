/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/responsive.js
 * Version: 1.0.0
 *
 * Production-ready responsive environment controller.
 *
 * Responsibilities:
 * - Device category detection
 * - Viewport size detection
 * - Orientation detection
 * - Mobile / tablet / desktop state
 * - Portrait / landscape state
 * - Safe-area support
 * - Resize handling
 * - Orientation-change handling
 * - CSS variable synchronization
 * - Responsive event dispatching
 * - Performance-aware updates
 * - Integration with visual modules
 *
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const DEFAULTS = Object.freeze({
        mobileMax: 600,
        tabletMax: 1024,

        resizeDebounce: 120,

        detectTouch:
            true,

        detectReducedMotion:
            true,

        syncCssVariables:
            true,

        dispatchEvents:
            true
    });

    const EVENTS = Object.freeze({
        ready:
            "sehrish:responsive:ready",

        change:
            "sehrish:responsive:change",

        resize:
            "sehrish:responsive:resize",

        orientation:
            "sehrish:responsive:orientation",

        device:
            "sehrish:responsive:device"
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

    const dispatch = (
        eventName,
        detail = {}
    ) => {
        try {
            window.dispatchEvent(
                new CustomEvent(
                    eventName,
                    {
                        detail
                    }
                )
            );
        } catch {
            /*
             * Ignore event dispatch errors.
             */
        }
    };

    const isTouchDevice = () => {
        if (
            "ontouchstart" in
            window
        ) {
            return true;
        }

        if (
            navigator.maxTouchPoints >
            0
        ) {
            return true;
        }

        return false;
    };

    /* ------------------------------------------------------------------------
     * RESPONSIVE MANAGER
     * --------------------------------------------------------------------- */

    class BirthdayResponsiveManager {
        constructor(
            options = {}
        ) {
            this.options = {
                ...DEFAULTS,
                ...options
            };

            this.initialized =
                false;

            this.destroyed =
                false;

            this.resizeTimer =
                null;

            this.listeners =
                [];

            this.state = {
                width:
                    0,

                height:
                    0,

                pixelRatio:
                    1,

                device:
                    "desktop",

                orientation:
                    "landscape",

                breakpoint:
                    "desktop",

                touch:
                    false,

                reducedMotion:
                    false,

                compact:
                    false,

                verySmall:
                    false,

                safeArea: {
                    top:
                        0,

                    right:
                        0,

                    bottom:
                        0,

                    left:
                        0
                }
            };

            this.lastState =
                null;
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

            this.refresh();

            this.bindEvents();

            this.initialized =
                true;

            if (
                this.options
                    .dispatchEvents
            ) {
                dispatch(
                    EVENTS.ready,
                    {
                        manager:
                            this,

                        state:
                            this.getState()
                    }
                );
            }

            return this;
        }

        /* --------------------------------------------------------------------
         * REFRESH
         * ----------------------------------------------------------------- */

        refresh() {
            if (
                this.destroyed
            ) {
                return this;
            }

            const width =
                Math.max(
                    0,
                    window.innerWidth ||
                        document.documentElement
                            .clientWidth ||
                        0
                );

            const height =
                Math.max(
                    0,
                    window.innerHeight ||
                        document.documentElement
                            .clientHeight ||
                        0
                );

            const pixelRatio =
                Math.min(
                    window.devicePixelRatio ||
                        1,
                    2
                );

            const previous =
                {
                    ...this.state
                };

            this.state.width =
                width;

            this.state.height =
                height;

            this.state.pixelRatio =
                pixelRatio;

            this.state.device =
                this.detectDevice(
                    width
                );

            this.state.breakpoint =
                this.detectBreakpoint(
                    width
                );

            this.state.orientation =
                width >= height
                    ? "landscape"
                    : "portrait";

            this.state.touch =
                this.options
                    .detectTouch
                    ? isTouchDevice()
                    : false;

            this.state.reducedMotion =
                this.detectReducedMotion();

            this.state.compact =
                width <=
                    this.options
                        .mobileMax ||
                height <= 620;

            this.state.verySmall =
                width <= 380 ||
                height <= 560;

            this.state.safeArea =
                this.calculateSafeArea();

            if (
                this.options
                    .syncCssVariables
            ) {
                this.syncCssVariables();
            }

            this.syncDocumentState();

            const changed =
                this.hasStateChanged(
                    previous,
                    this.state
                );

            if (
                changed &&
                this.options
                    .dispatchEvents
            ) {
                dispatch(
                    EVENTS.change,
                    {
                        manager:
                            this,

                        previous,

                        current:
                            this.getState()
                    }
                );
            }

            return this;
        }

        /* --------------------------------------------------------------------
         * DEVICE DETECTION
         * ----------------------------------------------------------------- */

        detectDevice(
            width
        ) {
            if (
                width <=
                this.options
                    .mobileMax
            ) {
                return "mobile";
            }

            if (
                width <=
                this.options
                    .tabletMax
            ) {
                return "tablet";
            }

            return "desktop";
        }

        /* --------------------------------------------------------------------
         * BREAKPOINT
         * ----------------------------------------------------------------- */

        detectBreakpoint(
            width
        ) {
            if (
                width <= 380
            ) {
                return "very-small";
            }

            if (
                width <=
                this.options
                    .mobileMax
            ) {
                return "mobile";
            }

            if (
                width <= 768
            ) {
                return "tablet-small";
            }

            if (
                width <=
                this.options
                    .tabletMax
            ) {
                return "tablet";
            }

            if (
                width <= 1280
            ) {
                return "desktop-small";
            }

            if (
                width <= 1600
            ) {
                return "desktop";
            }

            return "large-desktop";
        }

        /* --------------------------------------------------------------------
         * REDUCED MOTION
         * ----------------------------------------------------------------- */

        detectReducedMotion() {
            if (
                !this.options
                    .detectReducedMotion
            ) {
                return false;
            }

            try {
                return window
                    .matchMedia(
                        "(prefers-reduced-motion: reduce)"
                    )
                    .matches;
            } catch {
                return false;
            }
        }

        /* --------------------------------------------------------------------
         * SAFE AREA
         * ----------------------------------------------------------------- */

        calculateSafeArea() {
            const values = {
                top:
                    0,

                right:
                    0,

                bottom:
                    0,

                left:
                    0
            };

            /*
             * Safe-area values cannot be reliably
             * read directly through JS in every
             * browser. CSS environment variables
             * are therefore exposed here as fallback
             * variables, while actual layout remains
             * controlled by CSS.
             */

            document.documentElement.style.setProperty(
                "--birthday-safe-top",
                "env(safe-area-inset-top, 0px)"
            );

            document.documentElement.style.setProperty(
                "--birthday-safe-right",
                "env(safe-area-inset-right, 0px)"
            );

            document.documentElement.style.setProperty(
                "--birthday-safe-bottom",
                "env(safe-area-inset-bottom, 0px)"
            );

            document.documentElement.style.setProperty(
                "--birthday-safe-left",
                "env(safe-area-inset-left, 0px)"
            );

            return values;
        }

        /* --------------------------------------------------------------------
         * CSS VARIABLE SYNC
         * ----------------------------------------------------------------- */

        syncCssVariables() {
            const root =
                document.documentElement;

            const state =
                this.state;

            root.style.setProperty(
                "--birthday-viewport-width",
                `${state.width}px`
            );

            root.style.setProperty(
                "--birthday-viewport-height",
                `${state.height}px`
            );

            root.style.setProperty(
                "--birthday-device-pixel-ratio",
                String(
                    state.pixelRatio
                )
            );

            root.style.setProperty(
                "--birthday-screen-progress",
                `${clamp(
                    state.width /
                        1920 *
                        100,
                    0,
                    100
                )}%`
            );

            root.style.setProperty(
                "--birthday-mobile-scale",
                state.device ===
                    "mobile"
                    ? "1"
                    : "0"
            );

            root.style.setProperty(
                "--birthday-tablet-scale",
                state.device ===
                    "tablet"
                    ? "1"
                    : "0"
            );

            root.style.setProperty(
                "--birthday-desktop-scale",
                state.device ===
                    "desktop"
                    ? "1"
                    : "0"
            );
        }

        /* --------------------------------------------------------------------
         * DOCUMENT DATA / CLASSES
         * ----------------------------------------------------------------- */

        syncDocumentState() {
            const root =
                document.documentElement;

            const body =
                document.body;

            root.dataset.device =
                this.state.device;

            root.dataset.breakpoint =
                this.state.breakpoint;

            root.dataset.orientation =
                this.state.orientation;

            root.dataset.touch =
                this.state.touch
                    ? "true"
                    : "false";

            root.dataset.reducedMotion =
                this.state.reducedMotion
                    ? "true"
                    : "false";

            root.dataset.compact =
                this.state.compact
                    ? "true"
                    : "false";

            root.dataset.verySmall =
                this.state.verySmall
                    ? "true"
                    : "false";

            body?.classList.remove(
                "device-mobile",
                "device-tablet",
                "device-desktop",
                "orientation-portrait",
                "orientation-landscape",
                "viewport-compact",
                "viewport-very-small"
            );

            body?.classList.add(
                `device-${this.state.device}`,
                `orientation-${this.state.orientation}`
            );

            if (
                this.state.compact
            ) {
                body?.classList.add(
                    "viewport-compact"
                );
            }

            if (
                this.state.verySmall
            ) {
                body?.classList.add(
                    "viewport-very-small"
                );
            }
        }

        /* --------------------------------------------------------------------
         * EVENT BINDING
         * ----------------------------------------------------------------- */

        bindEvents() {
            this.addListener(
                window,
                "resize",
                () =>
                    this.handleResize()
            );

            this.addListener(
                window,
                "orientationchange",
                () =>
                    this.handleOrientationChange()
            );

            this.addListener(
                window,
                "load",
                () =>
                    this.refresh()
            );

            try {
                const motionQuery =
                    window.matchMedia(
                        "(prefers-reduced-motion: reduce)"
                    );

                const listener =
                    () =>
                        this.refresh();

                if (
                    motionQuery.addEventListener
                ) {
                    motionQuery.addEventListener(
                        "change",
                        listener
                    );
                } else if (
                    motionQuery.addListener
                ) {
                    motionQuery.addListener(
                        listener
                    );
                }

                this.motionQuery =
                    motionQuery;

                this.motionListener =
                    listener;
            } catch {
                this.motionQuery =
                    null;

                this.motionListener =
                    null;
            }
        }

        addListener(
            target,
            eventName,
            handler
        ) {
            target.addEventListener(
                eventName,
                handler
            );

            this.listeners.push({
                target,
                eventName,
                handler
            });
        }

        /* --------------------------------------------------------------------
         * RESIZE
         * ----------------------------------------------------------------- */

        handleResize() {
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

                        const oldWidth =
                            this.state.width;

                        const oldHeight =
                            this.state.height;

                        this.refresh();

                        if (
                            this.options
                                .dispatchEvents
                        ) {
                            dispatch(
                                EVENTS.resize,
                                {
                                    manager:
                                        this,

                                    width:
                                        this.state
                                            .width,

                                    height:
                                        this.state
                                            .height,

                                    previousWidth:
                                        oldWidth,

                                    previousHeight:
                                        oldHeight
                                }
                            );
                        }
                    },
                    this.options
                        .resizeDebounce
                );
        }

        /* --------------------------------------------------------------------
         * ORIENTATION
         * ----------------------------------------------------------------- */

        handleOrientationChange() {
            const previous =
                this.state
                    .orientation;

            window.setTimeout(
                () => {
                    this.refresh();

                    if (
                        previous !==
                            this.state
                                .orientation &&
                        this.options
                            .dispatchEvents
                    ) {
                        dispatch(
                            EVENTS.orientation,
                            {
                                manager:
                                    this,

                                previous,

                                current:
                                    this.state
                                        .orientation
                            }
                        );
                    }
                },
                80
            );
        }

        /* --------------------------------------------------------------------
         * STATE CHANGE CHECK
         * ----------------------------------------------------------------- */

        hasStateChanged(
            previous,
            current
        ) {
            return (
                previous.width !==
                    current.width ||
                previous.height !==
                    current.height ||
                previous.device !==
                    current.device ||
                previous.breakpoint !==
                    current.breakpoint ||
                previous.orientation !==
                    current.orientation ||
                previous.touch !==
                    current.touch ||
                previous.reducedMotion !==
                    current.reducedMotion ||
                previous.compact !==
                    current.compact ||
                previous.verySmall !==
                    current.verySmall
            );
        }

        /* --------------------------------------------------------------------
         * DEVICE HELPERS
         * ----------------------------------------------------------------- */

        isMobile() {
            return (
                this.state.device ===
                "mobile"
            );
        }

        isTablet() {
            return (
                this.state.device ===
                "tablet"
            );
        }

        isDesktop() {
            return (
                this.state.device ===
                "desktop"
            );
        }

        isPortrait() {
            return (
                this.state.orientation ===
                "portrait"
            );
        }

        isLandscape() {
            return (
                this.state.orientation ===
                "landscape"
            );
        }

        isTouch() {
            return this.state.touch;
        }

        isCompact() {
            return this.state.compact;
        }

        isVerySmall() {
            return this.state.verySmall;
        }

        /* --------------------------------------------------------------------
         * SIZE HELPERS
         * ----------------------------------------------------------------- */

        getWidth() {
            return this.state.width;
        }

        getHeight() {
            return this.state.height;
        }

        getPixelRatio() {
            return this.state.pixelRatio;
        }

        getAspectRatio() {
            if (
                this.state.height ===
                0
            ) {
                return 0;
            }

            return (
                this.state.width /
                this.state.height
            );
        }

        /* --------------------------------------------------------------------
         * RESPONSIVE VIDEO HELPERS
         * ----------------------------------------------------------------- */

        getVideoLayout(
            width,
            height
        ) {
            const videoWidth =
                Number(width);

            const videoHeight =
                Number(height);

            if (
                !Number.isFinite(
                    videoWidth
                ) ||
                !Number.isFinite(
                    videoHeight
                ) ||
                videoWidth <= 0 ||
                videoHeight <= 0
            ) {
                return {
                    ratio:
                        16 / 9,

                    orientation:
                        "landscape",

                    layout:
                        "landscape"
                };
            }

            const ratio =
                videoWidth /
                videoHeight;

            let orientation =
                "landscape";

            if (
                ratio <
                0.9
            ) {
                orientation =
                    "portrait";
            } else if (
                ratio >=
                    0.9 &&
                ratio <=
                    1.1
            ) {
                orientation =
                    "square";
            }

            let layout =
                "landscape";

            if (
                orientation ===
                "portrait"
            ) {
                layout =
                    "portrait";
            } else if (
                orientation ===
                "square"
            ) {
                layout =
                    "square";
            }

            return {
                ratio,
                orientation,
                layout,

                isYouTube:
                    ratio >=
                        1.6 &&
                    ratio <=
                        1.85,

                isReel:
                    ratio >=
                        0.5 &&
                    ratio <=
                        0.67
            };
        }

        /* --------------------------------------------------------------------
         * PARTICLE DENSITY
         * ----------------------------------------------------------------- */

        getParticleDensity() {
            if (
                this.state.verySmall
            ) {
                return 0.45;
            }

            if (
                this.state.device ===
                "mobile"
            ) {
                return 0.6;
            }

            if (
                this.state.device ===
                "tablet"
            ) {
                return 0.8;
            }

            return 1;
        }

        /* --------------------------------------------------------------------
         * EFFECT SCALE
         * ----------------------------------------------------------------- */

        getEffectScale() {
            if (
                this.state.verySmall
            ) {
                return 0.75;
            }

            if (
                this.state.compact
            ) {
                return 0.88;
            }

            if (
                this.state.device ===
                "tablet"
            ) {
                return 0.95;
            }

            return 1;
        }

        /* --------------------------------------------------------------------
         * NAVIGATION SAFE SPACING
         * ----------------------------------------------------------------- */

        getNavigationOffset() {
            if (
                this.state.verySmall
            ) {
                return 12;
            }

            if (
                this.state.compact
            ) {
                return 16;
            }

            return 24;
        }

        /* --------------------------------------------------------------------
         * PUBLIC STATE
         * ----------------------------------------------------------------- */

        getState() {
            return {
                version:
                    VERSION,

                initialized:
                    this.initialized,

                width:
                    this.state.width,

                height:
                    this.state.height,

                pixelRatio:
                    this.state.pixelRatio,

                device:
                    this.state.device,

                breakpoint:
                    this.state.breakpoint,

                orientation:
                    this.state.orientation,

                aspectRatio:
                    this.getAspectRatio(),

                touch:
                    this.state.touch,

                reducedMotion:
                    this.state.reducedMotion,

                compact:
                    this.state.compact,

                verySmall:
                    this.state.verySmall,

                particleDensity:
                    this.getParticleDensity(),

                effectScale:
                    this.getEffectScale(),

                navigationOffset:
                    this.getNavigationOffset()
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

            if (
                this.resizeTimer
            ) {
                window.clearTimeout(
                    this.resizeTimer
                );

                this.resizeTimer =
                    null;
            }

            this.listeners.forEach(
                ({
                    target,
                    eventName,
                    handler
                }) => {
                    target.removeEventListener(
                        eventName,
                        handler
                    );
                }
            );

            this.listeners =
                [];

            if (
                this.motionQuery &&
                this.motionListener
            ) {
                if (
                    this.motionQuery
                        .removeEventListener
                ) {
                    this.motionQuery
                        .removeEventListener(
                            "change",
                            this.motionListener
                        );
                } else if (
                    this.motionQuery
                        .removeListener
                ) {
                    this.motionQuery
                        .removeListener(
                            this.motionListener
                        );
                }
            }

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
                    new BirthdayResponsiveManager(
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
                    new BirthdayResponsiveManager();

                manager.init();
            }

            return manager;
        },

        refresh() {
            return this.getManager()
                .refresh();
        },

        isMobile() {
            return this.getManager()
                .isMobile();
        },

        isTablet() {
            return this.getManager()
                .isTablet();
        },

        isDesktop() {
            return this.getManager()
                .isDesktop();
        },

        isPortrait() {
            return this.getManager()
                .isPortrait();
        },

        isLandscape() {
            return this.getManager()
                .isLandscape();
        },

        isTouch() {
            return this.getManager()
                .isTouch();
        },

        isCompact() {
            return this.getManager()
                .isCompact();
        },

        isVerySmall() {
            return this.getManager()
                .isVerySmall();
        },

        getWidth() {
            return this.getManager()
                .getWidth();
        },

        getHeight() {
            return this.getManager()
                .getHeight();
        },

        getPixelRatio() {
            return this.getManager()
                .getPixelRatio();
        },

        getAspectRatio() {
            return this.getManager()
                .getAspectRatio();
        },

        getVideoLayout(
            width,
            height
        ) {
            return this.getManager()
                .getVideoLayout(
                    width,
                    height
                );
        },

        getParticleDensity() {
            return this.getManager()
                .getParticleDensity();
        },

        getEffectScale() {
            return this.getManager()
                .getEffectScale();
        },

        getNavigationOffset() {
            return this.getManager()
                .getNavigationOffset();
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

    window.BirthdayResponsiveManager =
        BirthdayResponsiveManager;

    window.SehrishResponsive =
        api;

    window.SehrishBirthdayResponsive =
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
                "[SehrishResponsive] " +
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
        "sehrish:particles:ready",
        () => {
            const particles =
                window.SehrishParticles;

            if (
                particles &&
                typeof particles
                    .setDensity ===
                    "function"
            ) {
                particles.setDensity(
                    api.getParticleDensity()
                );
            }
        }
    );

    window.addEventListener(
        "sehrish:responsive:change",
        () => {
            const particles =
                window.SehrishParticles;

            if (
                particles &&
                typeof particles
                    .setDensity ===
                    "function"
            ) {
                particles.setDensity(
                    api.getParticleDensity()
                );
            }
        }
    );

    window.addEventListener(
        "sehrish:responsive:change",
        () => {
            const effects =
                window.SehrishEffects;

            if (
                effects &&
                typeof effects
                    .getState ===
                    "function"
            ) {
                effects.getState();
            }
        }
    );

    console.info(
        `[SehrishResponsive] ` +
        `Responsive module v${VERSION} loaded.`
    );
})();