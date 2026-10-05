/**
 * ============================================================
 * SEHRISH BIRTHDAY WEBSITE
 * ------------------------------------------------------------
 * File: js/config.js
 * Version: 1.0.0
 *
 * Purpose:
 * - Central application configuration
 * - Birthday metadata
 * - Scene configuration
 * - Animation configuration
 * - Media configuration
 * - Quiz configuration
 * - Gift configuration
 * - Letter configuration
 * - Performance configuration
 * - Accessibility configuration
 * - Storage configuration
 * - Feature flags
 *
 * IMPORTANT:
 * This file contains configuration only.
 * Business logic should remain inside dedicated modules.
 * ============================================================
 */

(() => {
    'use strict';

    /**
     * ------------------------------------------------------------
     * Environment
     * ------------------------------------------------------------
     */

    const ENVIRONMENT = Object.freeze({
        name: 'production',
        debug: false,
        version: '1.0.0',
        build: 'sehrish-birthday-v1',
        timezoneMode: 'local'
    });

    /**
     * ------------------------------------------------------------
     * Application
     * ------------------------------------------------------------
     */

    const APP = Object.freeze({
        name: 'Sehrish Birthday Website',
        shortName: 'Sehrish Birthday',
        version: ENVIRONMENT.version,
        author: 'Afroj',
        type: 'interactive-birthday-experience',

        rootSelector: '#app',

        defaultLanguage: 'en',
        fallbackLanguage: 'en',

        theme: 'pastel-scrapbook',

        startup: Object.freeze({
            preloadAssets: true,
            waitForFonts: true,
            waitForVideos: false,
            revealDelay: 80,
            postReadyDelay: 120
        })
    });

    /**
     * ------------------------------------------------------------
     * Birthday Information
     * ------------------------------------------------------------
     *
     * Keep actual date editable here instead of hard-coding it
     * inside countdown.js or UI modules.
     *
     * Format:
     * YYYY-MM-DDTHH:mm:ss
     */

    const BIRTHDAY = Object.freeze({
        personName: 'Sehrish',

        title: 'Happy Birthday, Sehrish!',

        subtitle: 'A little world made especially for you.',

        targetDate: '',

        timezone: 'local',

        ageLabel: '',

        senderName: 'Afroj',

        greeting: 'Happy Birthday!',

        defaultMessage:
            'Today is all about celebrating a very special person.'
    });

    /**
     * ------------------------------------------------------------
     * Scene Configuration
     * ------------------------------------------------------------
     */

    const SCENES = Object.freeze({
        selector: '[data-scene]',

        attribute: 'data-scene',

        initialScene: '',

        transition: Object.freeze({
            duration: 650,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',

            enterClass: 'scene-enter',
            activeClass: 'scene-active',
            leavingClass: 'scene-leave',

            staggerChildren: true,
            staggerDelay: 45
        }),

        navigation: Object.freeze({
            useHash: true,
            useHistory: true,

            allowBack: true,
            allowForward: true,

            keyboard: true,
            touchSwipe: true,

            swipeThreshold: 55,
            wheelNavigation: false,

            preloadAdjacentScenes: true,

            lockDuringTransition: true
        })
    });

    /**
     * ------------------------------------------------------------
     * Scene Order
     * ------------------------------------------------------------
     *
     * The actual HTML data-scene values should match these names.
     */

    const SCENE_ORDER = Object.freeze([
        'welcome',
        'countdown',
        'memories',
        'quiz',
        'gifts',
        'cake',
        'letter',
        'celebration'
    ]);

    /**
     * ------------------------------------------------------------
     * Animation Configuration
     * ------------------------------------------------------------
     *
     * Main visual direction:
     * Cute + smooth + premium + playful.
     */

    const ANIMATIONS = Object.freeze({
        enabled: true,

        global: Object.freeze({
            duration: 650,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',

            fast: 180,
            normal: 420,
            slow: 850,

            stagger: 55,

            entranceDistance: 26,
            blurAmount: 7,

            scaleFrom: 0.96,
            scaleTo: 1
        }),

        page: Object.freeze({
            fade: true,
            slide: true,
            scale: true,
            blur: true,

            direction: 'horizontal',

            depth: 18
        }),

        floating: Object.freeze({
            enabled: true,

            hearts: true,
            stars: true,
            sparkles: true,
            flowers: true,
            balloons: true,

            amplitude: 8,
            durationMin: 3200,
            durationMax: 6200,

            randomDelay: true
        }),

        hover: Object.freeze({
            enabled: true,

            lift: 4,
            scale: 1.025,
            tilt: 2,

            duration: 220
        }),

        buttons: Object.freeze({
            ripple: true,
            press: true,
            glow: true,

            rippleDuration: 480,
            pressScale: 0.97
        }),

        cards: Object.freeze({
            tilt: true,
            maxTilt: 5,
            perspective: 1000,

            glow: true,
            float: false
        }),

        reveal: Object.freeze({
            enabled: true,

            threshold: 0.1,
            rootMargin: '0px 0px -5% 0px',

            once: true
        }),

        sparkle: Object.freeze({
            enabled: true,

            count: 14,
            duration: 900,

            spread: 80
        }),

        celebration: Object.freeze({
            enabled: true,

            confetti: true,
            sparkles: true,
            hearts: true,
            balloons: true,

            intensity: 1
        })
    });

    /**
     * ------------------------------------------------------------
     * Particle Configuration
     * ------------------------------------------------------------
     */

    const PARTICLES = Object.freeze({
        enabled: true,

        types: Object.freeze({
            dots: true,
            stars: true,
            sparkles: true,
            hearts: true
        }),

        density: Object.freeze({
            mobile: 18,
            tablet: 28,
            desktop: 42
        }),

        size: Object.freeze({
            min: 1,
            max: 4
        }),

        speed: Object.freeze({
            min: 0.15,
            max: 0.65
        }),

        opacity: Object.freeze({
            min: 0.15,
            max: 0.65
        }),

        interaction: Object.freeze({
            enabled: true,
            radius: 110,
            strength: 0.35
        }),

        sceneMultiplier: Object.freeze({
            welcome: 0.85,
            countdown: 0.75,
            memories: 0.7,
            quiz: 0.65,
            gifts: 1,
            cake: 1.2,
            letter: 0.45,
            celebration: 1.5
        })
    });

    /**
     * ------------------------------------------------------------
     * Confetti Configuration
     * ------------------------------------------------------------
     */

    const CONFETTI = Object.freeze({
        enabled: true,

        defaults: Object.freeze({
            particleCount: 90,
            spread: 80,
            startVelocity: 32,

            gravity: 0.8,
            scalar: 1,

            ticks: 220,

            shapes: Object.freeze([
                'square',
                'circle',
                'triangle',
                'heart'
            ])
        }),

        bursts: Object.freeze({
            small: Object.freeze({
                particleCount: 35,
                spread: 55
            }),

            medium: Object.freeze({
                particleCount: 70,
                spread: 72
            }),

            large: Object.freeze({
                particleCount: 120,
                spread: 90
            }),

            final: Object.freeze({
                particleCount: 180,
                spread: 110
            })
        })
    });

    /**
     * ------------------------------------------------------------
     * Media Configuration
     * ------------------------------------------------------------
     */

    const MEDIA = Object.freeze({
        image: Object.freeze({
            lazyLoading: true,

            decoding: 'async',

            fadeIn: true,

            fadeDuration: 450,

            timeout: 12000
        }),

        video: Object.freeze({
            autoplay: false,

            muted: true,

            loop: false,

            playsInline: true,

            controls: true,

            preload: 'metadata',

            lazyLoading: true,

            objectFit: 'contain',

            width: '100%',

            preserveAspectRatio: true,

            detectIntrinsicRatio: true,

            timeout: 20000
        }),

        supportedVideoRatios: Object.freeze({
            landscapeMin: 1.6,
            landscapeMax: 1.85,

            portraitMin: 0.5,
            portraitMax: 0.67,

            squareMin: 0.95,
            squareMax: 1.05
        })
    });

    /**
     * ------------------------------------------------------------
     * Memories Configuration
     * ------------------------------------------------------------
     */

    const MEMORIES = Object.freeze({
        enabled: true,

        autoplayVideo: false,

        allowFullscreen: true,

        allowPictureInPicture: true,

        supportLandscape: true,
        supportPortrait: true,
        supportSquare: true,
        supportCustomRatio: true,

        navigation: Object.freeze({
            loop: false,
            keyboard: true,
            swipe: true,

            swipeThreshold: 55
        }),

        transition: Object.freeze({
            duration: 550,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
        })
    });

    /**
     * ------------------------------------------------------------
     * Quiz Configuration
     * ------------------------------------------------------------
     */

    const QUIZ = Object.freeze({
        enabled: true,

        randomizeQuestions: false,

        randomizeAnswers: false,

        allowRetry: true,

        wrongAnswerBehavior: 'stay',

        correctAnswerBehavior: 'advance',

        scorePerCorrect: 1,

        showProgress: true,

        showScore: true,

        showAttempts: true,

        streaks: true,

        timer: Object.freeze({
            enabled: false,

            secondsPerQuestion: 20,

            warningAt: 5
        }),

        completion: Object.freeze({
            requireAllQuestions: true,

            celebration: true
        })
    });

    /**
     * ------------------------------------------------------------
     * Gifts Configuration
     * ------------------------------------------------------------
     */

    const GIFTS = Object.freeze({
        enabled: true,

        openAnimation: true,

        allowOpenAll: false,

        requireSequentialOpening: false,

        completion: Object.freeze({
            requireAll: true,

            celebration: true
        }),

        animation: Object.freeze({
            duration: 700,

            shakeBeforeOpen: true,

            sparkleOnOpen: true,

            confettiOnOpen: false
        })
    });

    /**
     * ------------------------------------------------------------
     * Cake Configuration
     * ------------------------------------------------------------
     */

    const CAKE = Object.freeze({
        enabled: true,

        interaction: Object.freeze({
            allowCandleInteraction: true,

            requireAllCandles: false,

            clickToBlow: true,

            keyboardSupport: true
        }),

        animation: Object.freeze({
            flameFlicker: true,

            glow: true,

            sparkle: true,

            smoke: true,

            cakeReveal: true
        }),

        completion: Object.freeze({
            celebration: true,

            confetti: true
        })
    });

    /**
     * ------------------------------------------------------------
     * Letter Configuration
     * ------------------------------------------------------------
     */

    const LETTER = Object.freeze({
        enabled: true,

        opening: Object.freeze({
            envelopeAnimation: true,

            duration: 950,

            sparkle: true
        }),

        reading: Object.freeze({
            typewriter: false,

            typewriterSpeed: 24,

            pageTransitionDuration: 500,

            rememberProgress: true
        }),

        navigation: Object.freeze({
            keyboard: true,

            swipe: true,

            allowPrevious: true,

            allowNext: true
        }),

        completion: Object.freeze({
            celebration: true
        })
    });

    /**
     * ------------------------------------------------------------
     * Countdown Configuration
     * ------------------------------------------------------------
     */

    const COUNTDOWN = Object.freeze({
        enabled: true,

        targetSource: 'birthday.targetDate',

        precision: 'seconds',

        updateInterval: 1000,

        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: true,

        zeroBehavior: 'birthday',

        progress: Object.freeze({
            enabled: true,

            startDate: '',

            endDate: ''
        })
    });

    /**
     * ------------------------------------------------------------
     * Celebration Configuration
     * ------------------------------------------------------------
     */

    const CELEBRATION = Object.freeze({
        enabled: true,

        milestones: Object.freeze({
            quiz: true,
            gifts: true,
            cake: true,
            letter: true,

            final: true
        }),

        final: Object.freeze({
            requireAllMilestones: true,

            confetti: true,

            particles: true,

            sparkles: true,

            balloons: true,

            themeShift: true,

            duration: 9000
        }),

        repeatedCelebration: false
    });

    /**
     * ------------------------------------------------------------
     * Theme Configuration
     * ------------------------------------------------------------
     */

    const THEME = Object.freeze({
        name: 'pastel-scrapbook',

        defaultMood: 'default',

        intensity: 1,

        colors: Object.freeze({
            pink: '#ffd6e7',
            lavender: '#e7ddff',
            cream: '#fff8e7',
            mint: '#dff8ed',
            yellow: '#fff0a8',

            pinkDeep: '#f5a8c4',
            lavenderDeep: '#bca9ec',
            mintDeep: '#9edbc3',

            text: '#5e5066',
            textSoft: '#796d80',

            white: '#ffffff'
        }),

        moods: Object.freeze({
            default: 'default',
            welcome: 'welcome',
            memories: 'memories',
            quiz: 'quiz',
            gifts: 'gifts',
            cake: 'cake',
            letter: 'letter',
            celebration: 'celebration'
        })
    });

    /**
     * ------------------------------------------------------------
     * Responsive Configuration
     * ------------------------------------------------------------
     */

    const RESPONSIVE = Object.freeze({
        enabled: true,

        breakpoints: Object.freeze({
            mobile: 767,
            tablet: 1023,
            desktop: 1024
        }),

        orientation: Object.freeze({
            portrait: true,
            landscape: true
        }),

        mobile: Object.freeze({
            particleScale: 0.55,
            animationScale: 0.85,
            tiltEnabled: false
        }),

        tablet: Object.freeze({
            particleScale: 0.8,
            animationScale: 0.95,
            tiltEnabled: true
        }),

        desktop: Object.freeze({
            particleScale: 1,
            animationScale: 1,
            tiltEnabled: true
        }),

        video: Object.freeze({
            preserveIntrinsicRatio: true,
            containMode: true
        })
    });

    /**
     * ------------------------------------------------------------
     * Performance Configuration
     * ------------------------------------------------------------
     */

    const PERFORMANCE = Object.freeze({
        enabled: true,

        adaptiveQuality: true,

        fps: Object.freeze({
            monitor: true,

            sampleSize: 45,

            lowThreshold: 35,

            mediumThreshold: 52
        }),

        quality: Object.freeze({
            low: Object.freeze({
                particles: 0.35,
                effects: 0.45,
                confetti: 0.55
            }),

            medium: Object.freeze({
                particles: 0.7,
                effects: 0.75,
                confetti: 0.8
            }),

            high: Object.freeze({
                particles: 1,
                effects: 1,
                confetti: 1
            })
        }),

        battery: Object.freeze({
            reduceEffectsWhenLow: true,

            lowBatteryThreshold: 0.2
        })
    });

    /**
     * ------------------------------------------------------------
     * Accessibility Configuration
     * ------------------------------------------------------------
     */

    const ACCESSIBILITY = Object.freeze({
        enabled: true,

        focusManagement: true,

        focusVisible: true,

        keyboardNavigation: true,

        screenReaderAnnouncements: true,

        skipLink: true,

        reducedMotion: Object.freeze({
            respectSystemPreference: true,

            disableParticles: true,

            simplifyTransitions: true,

            disableTilt: true
        })
    });

    /**
     * ------------------------------------------------------------
     * Interaction Configuration
     * ------------------------------------------------------------
     */

    const INTERACTIONS = Object.freeze({
        ripple: true,

        magnetic: true,

        tilt: true,

        hover: true,

        touch: true,

        longPress: true,

        doubleTap: true,

        clipboard: true,

        sharing: true,

        email: true,

        vibration: Object.freeze({
            enabled: true,

            duration: 20
        })
    });

    /**
     * ------------------------------------------------------------
     * Notification Configuration
     * ------------------------------------------------------------
     */

    const NOTIFICATIONS = Object.freeze({
        enabled: true,

        position: 'top-center',

        duration: 3200,

        maxVisible: 3,

        queue: true,

        pauseOnHover: true,

        progressBar: true,

        sound: false
    });

    /**
     * ------------------------------------------------------------
     * Modal Configuration
     * ------------------------------------------------------------
     */

    const MODAL = Object.freeze({
        enabled: true,

        backdropClose: true,

        escapeClose: true,

        focusTrap: true,

        restoreFocus: true,

        bodyScrollLock: true,

        animationDuration: 420
    });

    /**
     * ------------------------------------------------------------
     * Storage Configuration
     * ------------------------------------------------------------
     */

    const STORAGE = Object.freeze({
        enabled: true,

        namespace: 'sehrishBirthday',

        version: 1,

        useLocalStorage: true,

        useSessionStorage: true,

        persistProgress: true,

        persistTheme: true,

        persistScene: true,

        persistQuiz: true,

        persistGifts: true,

        persistLetter: true,

        persistCelebration: true,

        keys: Object.freeze({
            app: 'app',
            state: 'state',
            scene: 'scene',
            theme: 'theme',
            quiz: 'quiz',
            gifts: 'gifts',
            cake: 'cake',
            letter: 'letter',
            celebration: 'celebration',
            settings: 'settings'
        })
    });

    /**
     * ------------------------------------------------------------
     * Feature Flags
     * ------------------------------------------------------------
     */

    const FEATURES = Object.freeze({
        welcome: true,

        countdown: true,

        memories: true,

        quiz: true,

        gifts: true,

        cake: true,

        letter: true,

        finalCelebration: true,

        particles: true,

        confetti: true,

        notifications: true,

        accessibility: true,

        responsive: true,

        performanceManager: true,

        themeManager: true,

        debugPanel: false
    });

    /**
     * ------------------------------------------------------------
     * Debug Configuration
     * ------------------------------------------------------------
     */

    const DEBUG = Object.freeze({
        enabled:
            ENVIRONMENT.debug === true,

        logStartup: true,

        logNavigation: false,

        logScenes: false,

        logQuiz: false,

        logGifts: false,

        logMedia: false,

        logAnimations: false,

        exposePublicAPI: true
    });

    /**
     * ------------------------------------------------------------
     * Asset Configuration
     * ------------------------------------------------------------
     */

    const ASSETS = Object.freeze({
        basePath: './',

        directories: Object.freeze({
            images: 'assets/images/',
            videos: 'assets/videos/',
            audio: 'assets/audio/',
            fonts: 'assets/fonts/'
        }),

        preload: Object.freeze({
            images: true,
            videos: false,
            audio: false,
            fonts: true
        })
    });

    /**
     * ------------------------------------------------------------
     * Audio Configuration
     * ------------------------------------------------------------
     *
     * Actual audio files intentionally remain configurable.
     * No arbitrary audio asset is hard-coded here.
     */

    const AUDIO = Object.freeze({
        enabled: true,

        globalVolume: 0.65,

        musicVolume: 0.35,

        effectsVolume: 0.7,

        ducking: true,

        autoplayPolicyAware: true,

        scenes: Object.freeze({
            welcome: '',
            countdown: '',
            memories: '',
            quiz: '',
            gifts: '',
            cake: '',
            letter: '',
            celebration: ''
        }),

        effects: Object.freeze({
            click: '',
            success: '',
            giftOpen: '',
            cakeComplete: '',
            letterComplete: '',
            finalCelebration: ''
        })
    });

    /**
     * ------------------------------------------------------------
     * Validation Rules
     * ------------------------------------------------------------
     */

    const VALIDATION = Object.freeze({
        requireAppRoot: true,

        requireAtLeastOneScene: true,

        allowMissingOptionalModules: true,

        warnOnMissingAssets: true,

        warnOnInvalidDate: true
    });

    /**
     * ------------------------------------------------------------
     * Freeze helper
     * ------------------------------------------------------------
     */

    const deepFreeze = (object) => {
        if (
            object === null ||
            typeof object !== 'object'
        ) {
            return object;
        }

        Object.getOwnPropertyNames(object).forEach(
            (property) => {
                const value =
                    object[property];

                if (
                    value &&
                    typeof value === 'object' &&
                    !Object.isFrozen(value)
                ) {
                    deepFreeze(value);
                }
            }
        );

        return Object.freeze(object);
    };

    /**
     * ------------------------------------------------------------
     * Complete configuration object
     * ------------------------------------------------------------
     */

    const CONFIG = {
        environment: ENVIRONMENT,

        app: APP,

        birthday: BIRTHDAY,

        scenes: SCENES,

        sceneOrder: SCENE_ORDER,

        animations: ANIMATIONS,

        particles: PARTICLES,

        confetti: CONFETTI,

        media: MEDIA,

        memories: MEMORIES,

        countdown: COUNTDOWN,

        quiz: QUIZ,

        gifts: GIFTS,

        cake: CAKE,

        letter: LETTER,

        celebration: CELEBRATION,

        theme: THEME,

        responsive: RESPONSIVE,

        performance: PERFORMANCE,

        accessibility: ACCESSIBILITY,

        interactions: INTERACTIONS,

        notifications: NOTIFICATIONS,

        modal: MODAL,

        storage: STORAGE,

        features: FEATURES,

        debug: DEBUG,

        assets: ASSETS,

        audio: AUDIO,

        validation: VALIDATION
    };

    deepFreeze(CONFIG);

    /**
     * ------------------------------------------------------------
     * Runtime helpers
     * ------------------------------------------------------------
     */

    const get = (path, fallback = undefined) => {
        if (
            typeof path !== 'string' ||
            !path.trim()
        ) {
            return fallback;
        }

        const parts = path
            .split('.')
            .map(
                (part) => part.trim()
            )
            .filter(Boolean);

        let current = CONFIG;

        for (const part of parts) {
            if (
                current === null ||
                current === undefined ||
                !Object.prototype.hasOwnProperty.call(
                    current,
                    part
                )
            ) {
                return fallback;
            }

            current = current[part];
        }

        return current;
    };

    const isFeatureEnabled = (
        featureName
    ) => {
        return (
            Boolean(
                FEATURES[featureName]
            )
        );
    };

    const isAnimationEnabled = () => {
        return (
            ANIMATIONS.enabled === true
        );
    };

    const getSceneIndex = (
        sceneName
    ) => {
        return SCENE_ORDER.indexOf(
            sceneName
        );
    };

    const getSceneByIndex = (
        index
    ) => {
        if (
            !Number.isInteger(index)
        ) {
            return null;
        }

        if (
            index < 0 ||
            index >= SCENE_ORDER.length
        ) {
            return null;
        }

        return SCENE_ORDER[index];
    };

    const getAssetPath = (
        type,
        filename
    ) => {
        if (
            typeof filename !== 'string' ||
            !filename.trim()
        ) {
            return '';
        }

        const directory =
            ASSETS.directories[type];

        if (!directory) {
            return '';
        }

        return (
            ASSETS.basePath +
            directory +
            filename
        );
    };

    /**
     * ------------------------------------------------------------
     * Date helpers
     * ------------------------------------------------------------
     */

    const getBirthdayTargetDate = () => {
        if (
            !BIRTHDAY.targetDate
        ) {
            return null;
        }

        const date =
            new Date(
                BIRTHDAY.targetDate
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }

        return date;
    };

    /**
     * ------------------------------------------------------------
     * Runtime configuration snapshot
     * ------------------------------------------------------------
     */

    const getSnapshot = () => {
        return {
            environment: {
                ...ENVIRONMENT
            },

            app: {
                name: APP.name,
                version: APP.version,
                theme: APP.theme
            },

            birthday: {
                personName:
                    BIRTHDAY.personName,

                targetDate:
                    BIRTHDAY.targetDate,

                senderName:
                    BIRTHDAY.senderName
            },

            scenes: [
                ...SCENE_ORDER
            ],

            features: {
                ...FEATURES
            },

            animationEnabled:
                ANIMATIONS.enabled,

            particlesEnabled:
                PARTICLES.enabled,

            confettiEnabled:
                CONFETTI.enabled,

            timestamp: Date.now()
        };
    };

    /**
     * ------------------------------------------------------------
     * Public API
     * ------------------------------------------------------------
     */

    const API = Object.freeze({
        ...CONFIG,

        get,

        getSceneIndex,

        getSceneByIndex,

        isFeatureEnabled,

        isAnimationEnabled,

        getAssetPath,

        getBirthdayTargetDate,

        getSnapshot
    });

    /**
     * ------------------------------------------------------------
     * Global exports
     * ------------------------------------------------------------
     */

    window.SehrishConfig = API;
    window.SehrishConfigManager = API;
    window.SehrishBirthdayConfig = API;

    /**
     * ------------------------------------------------------------
     * Startup notification
     * ------------------------------------------------------------
     */

    try {
        window.dispatchEvent(
            new CustomEvent(
                'sehrish:config-ready',
                {
                    detail: {
                        name:
                            APP.name,

                        version:
                            APP.version,

                        environment:
                            ENVIRONMENT.name
                    }
                }
            )
        );
    } catch (error) {
        console.warn(
            '[Sehrish Config] Unable to dispatch config-ready event.',
            error
        );
    }

})();