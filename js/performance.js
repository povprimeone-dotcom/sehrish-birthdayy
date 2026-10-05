/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/performance.js
 * Version: 1.0.0
 *
 * Production-ready runtime performance manager.
 *
 * Responsibilities:
 * - Device capability estimation
 * - Runtime FPS monitoring
 * - Adaptive quality levels
 * - Particle / effect optimization
 * - Visibility-aware animation control
 * - Reduced-motion handling
 * - Battery-conscious behavior
 * - Performance state events
 * - Cross-module integration
 * - Public API
 *
 * No external dependency required.
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const QUALITY = Object.freeze({
        low: "low",
        medium: "medium",
        high: "high"
    });

    const DEFAULTS = Object.freeze({
        enabled: true,

        monitorFps: true,

        fpsSampleDuration: 1800,

        fpsCheckInterval: 2200,

        lowFpsThreshold: 36,

        mediumFpsThreshold: 50,

        severeFpsThreshold: 28,

        lowPerformanceDeviceMemory: 2,

        mediumPerformanceDeviceMemory: 4,

        lowPerformanceCpuCores: 2,

        mediumPerformanceCpuCores: 4,

        mobileQuality:
            QUALITY.medium,

        adaptiveQuality: true,

        reduceParticles:
            true,

        reduceEffects:
            true,

        pauseWhenHidden:
            true,

        respectReducedMotion:
            true,

        batteryAware:
            true,

        autoRecovery:
            true,

        recoveryDelay:
            7000
    });

    const EVENTS = Object.freeze({
        ready:
            "sehrish:performance:ready",

        fps:
            "sehrish:performance:fps",

        quality:
            "sehrish:performance:quality",

        degraded:
            "sehrish:performance:degraded",

        improved:
            "sehrish:performance:improved",

        visibility:
            "sehrish:performance:visibility",

        battery:
            "sehrish:performance:battery"
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

    const isFiniteNumber = (
        value
    ) => {
        return Number.isFinite(
            value
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
            /* Ignore custom event errors. */
        }
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

    const isMobileViewport =
        () => {
            return (
                window.innerWidth <=
                600
            );
        };

    /* ------------------------------------------------------------------------
     * PERFORMANCE MANAGER
     * --------------------------------------------------------------------- */

    class BirthdayPerformanceManager {
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

            this.running =
                false;

            this.visible =
                !document.hidden;

            this.manualQuality =
                null;

            this.quality =
                QUALITY.medium;

            this.previousQuality =
                null;

            this.estimatedDeviceClass =
                "medium";

            this.deviceInfo =
                {
                    memory:
                        null,

                    cpuCores:
                        null,

                    touch:
                        false,

                    mobile:
                        false,

                    reducedMotion:
                        false
                };

            this.fps =
                {
                    current:
                        60,

                    average:
                        60,

                    minimum:
                        60,

                    maximum:
                        60
                };

            this.frameCounter =
                0;

            this.sampleStart =
                0;

            this.lastFrameTime =
                0;

            this.monitorTimer =
                null;

            this.animationFrame =
                null;

            this.visibilityHandler =
                null;

            this.lastQualityChange =
                0;

            this.recoveryTimer =
                null;

            this.listeners =
                [];
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

            this.detectDevice();

            this.detectInitialQuality();

            this.bindEvents();

            this.applyQuality();

            if (
                this.options
                    .monitorFps
            ) {
                this.startMonitoring();
            }

            this.initialized =
                true;

            dispatch(
                EVENTS.ready,
                {
                    manager:
                        this,

                    quality:
                        this.quality,

                    device:
                        this.deviceInfo
                }
            );

            return this;
        }

        /* --------------------------------------------------------------------
         * DEVICE DETECTION
         * ----------------------------------------------------------------- */

        detectDevice() {
            const nav =
                navigator;

            const memory =
                isFiniteNumber(
                    nav.deviceMemory
                )
                    ? nav.deviceMemory
                    : null;

            const cores =
                isFiniteNumber(
                    nav.hardwareConcurrency
                )
                    ? nav.hardwareConcurrency
                    : null;

            const touch =
                "ontouchstart" in
                    window ||
                (
                    isFiniteNumber(
                        nav.maxTouchPoints
                    ) &&
                    nav.maxTouchPoints >
                        0
                );

            const mobile =
                isMobileViewport();

            const reducedMotion =
                this.options
                    .respectReducedMotion &&
                prefersReducedMotion();

            this.deviceInfo =
                {
                    memory,
                    cpuCores:
                        cores,
                    touch,
                    mobile,
                    reducedMotion
                };

            if (
                memory !== null &&
                memory <=
                    this.options
                        .lowPerformanceDeviceMemory
            ) {
                this.estimatedDeviceClass =
                    "low";

                return;
            }

            if (
                cores !== null &&
                cores <=
                    this.options
                        .lowPerformanceCpuCores
            ) {
                this.estimatedDeviceClass =
                    "low";

                return;
            }

            if (
                memory !== null &&
                memory >=
                    this.options
                        .mediumPerformanceDeviceMemory &&
                cores !== null &&
                cores >=
                    this.options
                        .mediumPerformanceCpuCores
            ) {
                this.estimatedDeviceClass =
                    "high";

                return;
            }

            if (
                !memory &&
                !cores
            ) {
                this.estimatedDeviceClass =
                    mobile
                        ? "medium"
                        : "high";

                return;
            }

            this.estimatedDeviceClass =
                "medium";
        }

        /* --------------------------------------------------------------------
         * INITIAL QUALITY
         * ----------------------------------------------------------------- */

        detectInitialQuality() {
            if (
                this.manualQuality
            ) {
                this.quality =
                    this.manualQuality;

                return;
            }

            if (
                this.deviceInfo
                    .reducedMotion
            ) {
                this.quality =
                    QUALITY.low;

                return;
            }

            if (
                this.estimatedDeviceClass ===
                "low"
            ) {
                this.quality =
                    QUALITY.low;

                return;
            }

            if (
                this.deviceInfo.mobile
            ) {
                this.quality =
                    this.options
                        .mobileQuality;

                return;
            }

            if (
                this.estimatedDeviceClass ===
                "high"
            ) {
                this.quality =
                    QUALITY.high;

                return;
            }

            this.quality =
                QUALITY.medium;
        }

        /* --------------------------------------------------------------------
         * EVENTS
         * ----------------------------------------------------------------- */

        bindEvents() {
            this.visibilityHandler =
                () => {
                    this.handleVisibilityChange();
                };

            this.addListener(
                document,
                "visibilitychange",
                this.visibilityHandler
            );

            this.addListener(
                window,
                "resize",
                () => {
                    this.handleResize();
                }
            );

            this.addListener(
                window,
                "orientationchange",
                () => {
                    window.setTimeout(
                        () => {
                            this.handleResize();
                        },
                        100
                    );
                }
            );

            this.addListener(
                window,
                "sehrish:responsive:change",
                (
                    event
                ) => {
                    this.handleResponsiveChange(
                        event
                    );
                }
            );

            this.addListener(
                window,
                "sehrish:preloader:complete",
                () => {
                    this.handlePreloaderComplete();
                }
            );
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
         * START MONITOR
         * ----------------------------------------------------------------- */

        startMonitoring() {
            if (
                this.running
            ) {
                return;
            }

            this.running =
                true;

            this.frameCounter =
                0;

            this.sampleStart =
                performance.now();

            this.lastFrameTime =
                this.sampleStart;

            this.monitorFrame();

            this.monitorTimer =
                window.setInterval(
                    () => {
                        this.evaluatePerformance();
                    },
                    this.options
                        .fpsCheckInterval
                );
        }

        /* --------------------------------------------------------------------
         * FRAME MONITOR
         * ----------------------------------------------------------------- */

        monitorFrame(
            timestamp
        ) {
            if (
                !this.running ||
                this.destroyed
            ) {
                return;
            }

            const now =
                timestamp ??
                performance.now();

            this.frameCounter +=
                1;

            this.lastFrameTime =
                now;

            if (
                !this.sampleStart
            ) {
                this.sampleStart =
                    now;
            }

            this.animationFrame =
                requestAnimationFrame(
                    (
                        nextTime
                    ) => {
                        this.monitorFrame(
                            nextTime
                        );
                    }
                );
        }

        /* --------------------------------------------------------------------
         * PERFORMANCE EVALUATION
         * ----------------------------------------------------------------- */

        evaluatePerformance() {
            if (
                !this.running ||
                !this.visible
            ) {
                return;
            }

            const now =
                performance.now();

            const elapsed =
                now -
                this.sampleStart;

            if (
                elapsed <=
                0
            ) {
                return;
            }

            const currentFps =
                (
                    this.frameCounter /
                    elapsed
                ) *
                1000;

            this.fps.current =
                clamp(
                    currentFps,
                    0,
                    240
                );

            this.fps.average =
                (
                    this.fps.average *
                        0.65 +
                    this.fps.current *
                        0.35
                );

            this.fps.minimum =
                Math.min(
                    this.fps.minimum,
                    this.fps.current
                );

            this.fps.maximum =
                Math.max(
                    this.fps.maximum,
                    this.fps.current
                );

            dispatch(
                EVENTS.fps,
                {
                    manager:
                        this,

                    fps:
                        Math.round(
                            this.fps
                                .current
                        ),

                    averageFps:
                        Math.round(
                            this.fps
                                .average
                        ),

                    minimumFps:
                        Math.round(
                            this.fps
                                .minimum
                        )
                }
            );

            this.frameCounter =
                0;

            this.sampleStart =
                now;

            if (
                this.options
                    .adaptiveQuality
            ) {
                this.applyAdaptiveQuality();
            }
        }

        /* --------------------------------------------------------------------
         * ADAPTIVE QUALITY
         * ----------------------------------------------------------------- */

        applyAdaptiveQuality() {
            if (
                this.manualQuality
            ) {
                return;
            }

            const fps =
                this.fps.average;

            const oldQuality =
                this.quality;

            if (
                fps <=
                this.options
                    .severeFpsThreshold
            ) {
                this.quality =
                    QUALITY.low;
            } else if (
                fps <
                this.options
                    .lowFpsThreshold
            ) {
                this.quality =
                    QUALITY.low;
            } else if (
                fps <
                this.options
                    .mediumFpsThreshold
            ) {
                this.quality =
                    QUALITY.medium;
            } else {
                this.tryImproveQuality();
            }

            if (
                oldQuality !==
                this.quality
            ) {
                this.lastQualityChange =
                    Date.now();

                this.applyQuality();

                if (
                    this.getQualityRank(
                        this.quality
                    ) <
                    this.getQualityRank(
                        oldQuality
                    )
                ) {
                    dispatch(
                        EVENTS.degraded,
                        {
                            manager:
                                this,

                            previous:
                                oldQuality,

                            current:
                                this.quality,

                            fps:
                                this.fps
                                    .average
                        }
                    );
                } else {
                    dispatch(
                        EVENTS.improved,
                        {
                            manager:
                                this,

                            previous:
                                oldQuality,

                            current:
                                this.quality,

                            fps:
                                this.fps
                                    .average
                        }
                    );
                }

                dispatch(
                    EVENTS.quality,
                    {
                        manager:
                            this,

                        previous:
                            oldQuality,

                        current:
                            this.quality
                    }
                );
            }
        }

        /* --------------------------------------------------------------------
         * QUALITY RECOVERY
         * ----------------------------------------------------------------- */

        tryImproveQuality() {
            if (
                !this.options
                    .autoRecovery
            ) {
                return;
            }

            const now =
                Date.now();

            if (
                now -
                    this.lastQualityChange <
                this.options
                    .recoveryDelay
            ) {
                return;
            }

            if (
                this.quality ===
                QUALITY.low
            ) {
                if (
                    this.fps.average >=
                    this.options
                        .mediumFpsThreshold
                ) {
                    this.quality =
                        QUALITY.medium;
                }

                return;
            }

            if (
                this.quality ===
                QUALITY.medium
            ) {
                if (
                    this.fps.average >=
                        58 &&
                    this.estimatedDeviceClass ===
                        "high"
                ) {
                    this.quality =
                        QUALITY.high;
                }
            }
        }

        /* --------------------------------------------------------------------
         * APPLY QUALITY
         * ----------------------------------------------------------------- */

        applyQuality() {
            const root =
                document.documentElement;

            const body =
                document.body;

            const quality =
                this.quality;

            root.dataset.performanceQuality =
                quality;

            body?.classList.remove(
                "performance-low",
                "performance-medium",
                "performance-high"
            );

            body?.classList.add(
                `performance-${quality}`
            );

            const values =
                this.getQualitySettings(
                    quality
                );

            root.style.setProperty(
                "--performance-particle-scale",
                String(
                    values.particleScale
                )
            );

            root.style.setProperty(
                "--performance-effect-scale",
                String(
                    values.effectScale
                )
            );

            root.style.setProperty(
                "--performance-animation-scale",
                String(
                    values.animationScale
                )
            );

            root.style.setProperty(
                "--performance-blur-scale",
                String(
                    values.blurScale
                )
            );

            this.applyParticleQuality(
                values
            );

            this.applyEffectQuality(
                values
            );
        }

        /* --------------------------------------------------------------------
         * QUALITY SETTINGS
         * ----------------------------------------------------------------- */

        getQualitySettings(
            quality
        ) {
            switch (
                quality
            ) {
                case QUALITY.low:
                    return {
                        particleScale:
                            0.35,

                        effectScale:
                            0.55,

                        animationScale:
                            0.65,

                        blurScale:
                            0.35
                    };

                case QUALITY.high:
                    return {
                        particleScale:
                            1,

                        effectScale:
                            1,

                        animationScale:
                            1,

                        blurScale:
                            1
                    };

                case QUALITY.medium:
                default:
                    return {
                        particleScale:
                            0.65,

                        effectScale:
                            0.8,

                        animationScale:
                            0.85,

                        blurScale:
                            0.65
                    };
            }
        }

        /* --------------------------------------------------------------------
         * PARTICLE QUALITY
         * ----------------------------------------------------------------- */

        applyParticleQuality(
            values
        ) {
            if (
                !this.options
                    .reduceParticles
            ) {
                return;
            }

            const particles =
                window.SehrishParticles;

            if (
                !particles
            ) {
                return;
            }

            if (
                typeof particles
                    .setDensity !==
                "function"
            ) {
                return;
            }

            particles.setDensity(
                values.particleScale
            );
        }

        /* --------------------------------------------------------------------
         * EFFECT QUALITY
         * ----------------------------------------------------------------- */

        applyEffectQuality(
            values
        ) {
            if (
                !this.options
                    .reduceEffects
            ) {
                return;
            }

            const root =
                document.documentElement;

            root.dataset.effectQuality =
                this.quality;

            root.style.setProperty(
                "--birthday-effect-scale",
                String(
                    values.effectScale
                )
            );

            root.style.setProperty(
                "--birthday-animation-scale",
                String(
                    values.animationScale
                )
            );

            root.style.setProperty(
                "--birthday-blur-scale",
                String(
                    values.blurScale
                )
            );
        }

        /* --------------------------------------------------------------------
         * QUALITY RANK
         * ----------------------------------------------------------------- */

        getQualityRank(
            quality
        ) {
            switch (
                quality
            ) {
                case QUALITY.low:
                    return 1;

                case QUALITY.medium:
                    return 2;

                case QUALITY.high:
                    return 3;

                default:
                    return 2;
            }
        }

        /* --------------------------------------------------------------------
         * MANUAL QUALITY
         * ----------------------------------------------------------------- */

        setQuality(
            quality
        ) {
            const normalized =
                String(
                    quality || ""
                )
                    .trim()
                    .toLowerCase();

            if (
                !Object.values(
                    QUALITY
                ).includes(
                    normalized
                )
            ) {
                return false;
            }

            this.manualQuality =
                normalized;

            const previous =
                this.quality;

            this.quality =
                normalized;

            this.applyQuality();

            if (
                previous !==
                normalized
            ) {
                dispatch(
                    EVENTS.quality,
                    {
                        manager:
                            this,

                        previous,

                        current:
                            normalized,

                        manual:
                            true
                    }
                );
            }

            return true;
        }

        /* --------------------------------------------------------------------
         * RELEASE MANUAL QUALITY
         * ----------------------------------------------------------------- */

        enableAdaptiveQuality() {
            this.manualQuality =
                null;

            this.detectInitialQuality();

            this.applyQuality();

            return this;
        }

        /* --------------------------------------------------------------------
         * VISIBILITY
         * ----------------------------------------------------------------- */

        handleVisibilityChange() {
            const previous =
                this.visible;

            this.visible =
                !document.hidden;

            if (
                previous ===
                this.visible
            ) {
                return;
            }

            if (
                this.options
                    .pauseWhenHidden
            ) {
                if (
                    this.visible
                ) {
                    this.resumeMonitoring();
                } else {
                    this.pauseMonitoring();
                }
            }

            dispatch(
                EVENTS.visibility,
                {
                    manager:
                        this,

                    visible:
                        this.visible
                }
            );
        }

        /* --------------------------------------------------------------------
         * PAUSE MONITORING
         * ----------------------------------------------------------------- */

        pauseMonitoring() {
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

            if (
                this.monitorTimer
            ) {
                window.clearInterval(
                    this.monitorTimer
                );

                this.monitorTimer =
                    null;
            }

            this.running =
                false;
        }

        /* --------------------------------------------------------------------
         * RESUME MONITORING
         * ----------------------------------------------------------------- */

        resumeMonitoring() {
            if (
                !this.options
                    .monitorFps
            ) {
                return;
            }

            if (
                this.running
            ) {
                return;
            }

            this.running =
                true;

            this.frameCounter =
                0;

            this.sampleStart =
                performance.now();

            this.startMonitoring();
        }

        /* --------------------------------------------------------------------
         * RESIZE
         * ----------------------------------------------------------------- */

        handleResize() {
            const previousMobile =
                this.deviceInfo
                    .mobile;

            const previousClass =
                this.estimatedDeviceClass;

            this.detectDevice();

            if (
                previousMobile !==
                this.deviceInfo.mobile
            ) {
                this.detectInitialQuality();

                this.applyQuality();
            }

            if (
                previousClass !==
                this.estimatedDeviceClass
            ) {
                this.detectInitialQuality();

                this.applyQuality();
            }
        }

        /* --------------------------------------------------------------------
         * RESPONSIVE CHANGE
         * ----------------------------------------------------------------- */

        handleResponsiveChange(
            event
        ) {
            const state =
                event.detail
                    ?.current ||
                event.detail
                    ?.state;

            if (
                state
            ) {
                if (
                    state.device ===
                    "mobile"
                ) {
                    this.deviceInfo
                        .mobile =
                        true;
                } else if (
                    state.device
                ) {
                    this.deviceInfo
                        .mobile =
                        false;
                }

                this.applyQuality();
            }
        }

        /* --------------------------------------------------------------------
         * PRELOADER
         * ----------------------------------------------------------------- */

        handlePreloaderComplete() {
            if (
                !this.running &&
                this.options
                    .monitorFps
            ) {
                this.startMonitoring();
            }

            this.applyQuality();
        }

        /* --------------------------------------------------------------------
         * BATTERY
         * ----------------------------------------------------------------- */

        async detectBattery() {
            if (
                !this.options
                    .batteryAware
            ) {
                return null;
            }

            if (
                !(
                    "getBattery" in
                    navigator
                )
            ) {
                return null;
            }

            try {
                const battery =
                    await navigator.getBattery();

                const state = {
                    level:
                        battery.level,

                    charging:
                        battery.charging,

                    low:
                        battery.level <=
                        0.2 &&
                        !battery.charging
                };

                if (
                    state.low &&
                    this.quality ===
                        QUALITY.high
                ) {
                    this.setQuality(
                        QUALITY.medium
                    );
                }

                dispatch(
                    EVENTS.battery,
                    {
                        manager:
                            this,

                        ...state
                    }
                );

                return state;
            } catch {
                return null;
            }
        }

        /* --------------------------------------------------------------------
         * HARDWARE CAPABILITIES
         * ----------------------------------------------------------------- */

        getCapabilities() {
            return {
                deviceMemory:
                    this.deviceInfo
                        .memory,

                hardwareConcurrency:
                    this.deviceInfo
                        .cpuCores,

                touch:
                    this.deviceInfo
                        .touch,

                mobile:
                    this.deviceInfo
                        .mobile,

                reducedMotion:
                    this.deviceInfo
                        .reducedMotion
            };
        }

        /* --------------------------------------------------------------------
         * CURRENT FPS
         * ----------------------------------------------------------------- */

        getFps() {
            return {
                current:
                    this.fps.current,

                average:
                    this.fps.average,

                minimum:
                    this.fps.minimum,

                maximum:
                    this.fps.maximum
            };
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

                running:
                    this.running,

                visible:
                    this.visible,

                quality:
                    this.quality,

                manualQuality:
                    this.manualQuality,

                estimatedDeviceClass:
                    this.estimatedDeviceClass,

                capabilities:
                    this.getCapabilities(),

                fps:
                    this.getFps(),

                adaptiveQuality:
                    this.options
                        .adaptiveQuality
            };
        }

        /* --------------------------------------------------------------------
         * RESET
         * ----------------------------------------------------------------- */

        reset() {
            this.manualQuality =
                null;

            this.detectDevice();

            this.detectInitialQuality();

            this.applyQuality();

            this.fps = {
                current:
                    60,

                average:
                    60,

                minimum:
                    60,

                maximum:
                    60
            };

            return this;
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

            this.pauseMonitoring();

            if (
                this.resizeTimer
            ) {
                window.clearTimeout(
                    this.resizeTimer
                );
            }

            if (
                this.recoveryTimer
            ) {
                window.clearTimeout(
                    this.recoveryTimer
                );
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

        QUALITY,

        init(
            options = {}
        ) {
            if (!manager) {
                manager =
                    new BirthdayPerformanceManager(
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
                    new BirthdayPerformanceManager();

                manager.init();
            }

            return manager;
        },

        startMonitoring() {
            return this.getManager()
                .startMonitoring();
        },

        pauseMonitoring() {
            return this.getManager()
                .pauseMonitoring();
        },

        resumeMonitoring() {
            return this.getManager()
                .resumeMonitoring();
        },

        setQuality(
            quality
        ) {
            return this.getManager()
                .setQuality(
                    quality
                );
        },

        enableAdaptiveQuality() {
            return this.getManager()
                .enableAdaptiveQuality();
        },

        getQualitySettings(
            quality
        ) {
            return this.getManager()
                .getQualitySettings(
                    quality
                );
        },

        getCapabilities() {
            return this.getManager()
                .getCapabilities();
        },

        getFps() {
            return this.getManager()
                .getFps();
        },

        detectBattery() {
            return this.getManager()
                .detectBattery();
        },

        reset() {
            return this.getManager()
                .reset();
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

    window.BirthdayPerformanceManager =
        BirthdayPerformanceManager;

    window.SehrishPerformance =
        api;

    window.SehrishBirthdayPerformance =
        api;

    /* ------------------------------------------------------------------------
     * AUTO BOOT
     * --------------------------------------------------------------------- */

    const boot = () => {
        try {
            api.init();

            void api
                .getManager()
                .detectBattery();
        } catch (
            error
        ) {
            console.error(
                "[SehrishPerformance] " +
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
        "sehrish:responsive:change",
        () => {
            if (
                manager
            ) {
                manager.handleResize();
            }
        }
    );

    window.addEventListener(
        "sehrish:confetti:ready",
        () => {
            if (
                manager &&
                manager.quality ===
                    QUALITY.low
            ) {
                /*
                 * Low quality mode intentionally
                 * leaves celebration logic available,
                 * while confetti.js can reduce its
                 * own particle count based on the
                 * shared performance state.
                 */
            }
        }
    );

    console.info(
        `[SehrishPerformance] ` +
        `Performance module v${VERSION} loaded.`
    );
})();