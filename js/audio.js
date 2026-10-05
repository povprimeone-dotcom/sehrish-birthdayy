/**
 * ============================================================================
 * SEHRISH BIRTHDAY EXPERIENCE
 * ============================================================================
 * File       : js/audio.js
 * Project    : sehrish-birthday
 * Version    : 3.0.0
 *
 * Purpose:
 * - Centralized audio engine for the complete birthday experience
 * - Scene-aware background music
 * - Scene-specific audio tracks
 * - Voice-note playback
 * - Sound effects
 * - Crossfading between tracks
 * - Fade in / fade out support
 * - Global mute / unmute
 * - Independent volume controls
 * - Browser autoplay restrictions handling
 * - Mobile browser compatibility
 * - Audio state persistence
 * - Audio element pooling
 * - Preloading support
 * - DOM data-attribute integration
 * - Accessibility-aware behavior
 * - Safe failure handling
 *
 * Integration:
 * - Works with js/app.js
 * - Detects the global application controller when available
 * - Listens for "scene:changed"
 * - Supports data-audio-* attributes directly from HTML
 *
 * Design principle:
 * - This engine preserves the existing public audio API.
 * - The birthday workflow below owns the scene-to-song mapping.
 * - Scene changes use a reliable observer + app-event fallback because
 *   audio.js is loaded BEFORE app.js in the project.
 * - Track changes are true crossfades: outgoing scene music fades down
 *   while incoming scene music fades up.
 * - Voice/video duck ONLY background music; they never mute themselves.
 * - The mute control mutes ONLY background music.

 * ============================================================================
 */

'use strict';


/* ============================================================================
 * AUDIO CONFIGURATION
 * ========================================================================== */

const BIRTHDAY_AUDIO_CONFIG = Object.freeze({
    appName: 'Sehrish Birthday Experience',
    version: '1.0.0',

    paths: Object.freeze({
        music: 'assets/music/',
        sfx: 'assets/sfx/',
        voice: 'assets/voice/'
    }),

    selectors: Object.freeze({
        audioRoot: [
            '[data-audio-root]',
            '.audio-controller',
            '#audio-controller'
        ],

        soundButton: [
            '[data-action="sound"]',
            '[data-audio-action="toggle"]',
            '[data-audio-toggle]'
        ],

        muteButton: [
            '[data-audio-action="mute"]',
            '[data-audio-mute]'
        ],

        musicButton: [
            '[data-audio-action="music"]',
            '[data-audio-music-toggle]'
        ],

        voiceButtons: [
            '[data-audio-action="voice"]',
            '[data-audio-voice]'
        ],

        effectButtons: [
            '[data-audio-action="sfx"]',
            '[data-audio-sfx]'
        ],

        volumeControls: [
            '[data-audio-volume]'
        ]
    }),

    storage: Object.freeze({
        prefix: 'sehrish-birthday:',
        enabled: true,

        muted: 'audio-muted',
        masterVolume: 'audio-master-volume',
        musicVolume: 'audio-music-volume',
        sfxVolume: 'audio-sfx-volume',
        voiceVolume: 'audio-voice-volume'
    }),

    defaults: Object.freeze({
        masterVolume: 1,
        musicVolume: 0.54,
        sfxVolume: 0.82,
        voiceVolume: 0.95,

        fadeIn: 850,
        fadeOut: 650,

        crossfade: 700,

        duckVolume: 0.07,

        defaultLoop: true,

        preload: 'metadata',

        pauseWhenHidden: true,

        stopMusicOnLastScene: false
    }),

    limits: Object.freeze({
        minVolume: 0,
        maxVolume: 1,

        minRate: 0.5,
        maxRate: 2
    }),

    classes: Object.freeze({
        muted: 'audio-muted',
        enabled: 'audio-enabled',
        playing: 'audio-playing',
        paused: 'audio-paused',
        loading: 'audio-loading',
        unlocked: 'audio-unlocked'
    })
});


/* ============================================================================
 * USER-REQUESTED SCENE AUDIO WORKFLOW
 * ========================================================================== */

const BIRTHDAY_WORKFLOW_AUDIO = Object.freeze({
    scenes: Object.freeze({
        '1': Object.freeze({
            key: 'scene-1',
            source: 'assets/music/scene1-song.mp3',
            loop: true
        }),

        '2': Object.freeze({
            key: 'scene-2-before-pop',
            source: 'assets/music/scene2-before-pop.mp3',
            loop: false
        }),

        '3': Object.freeze({
            key: 'scene-3-5',
            source: 'assets/music/scene3-5-song.mp3',
            loop: true
        }),

        '4': Object.freeze({
            key: 'scene-3-5',
            source: 'assets/music/scene3-5-song.mp3',
            loop: true
        }),

        '5': Object.freeze({
            key: 'scene-3-5',
            source: 'assets/music/scene3-5-song.mp3',
            loop: true
        }),

        '6': Object.freeze({
            key: 'scene-6-7',
            source: 'assets/music/scene6-7-song.mp3',
            loop: true
        }),

        '7': Object.freeze({
            key: 'scene-6-7',
            source: 'assets/music/scene6-7-song.mp3',
            loop: true
        }),

        '8': Object.freeze({
            key: 'scene-8-q1-q3',
            source: 'assets/music/scene8-q1-q3-song.mp3',
            loop: true
        }),

        '9': Object.freeze({
            key: 'scene-9',
            source: 'assets/music/scene9-song.mp3',
            loop: true
        }),

        '10': Object.freeze({
            key: 'scene-10',
            source: 'assets/music/scene10-song.mp3',
            loop: true
        }),

        '11': Object.freeze({
            key: 'scene-11',
            source: 'assets/music/scene11-day-night-song.mp3',
            loop: true
        }),

        '12': Object.freeze({
            key: 'scene-12',
            source: 'assets/music/scene12-song.mp3',
            loop: true
        }),

        '13': Object.freeze({
            key: 'scene-13',
            source: 'assets/music/scene13-song.mp3',
            loop: true
        }),

        '14': Object.freeze({
            key: 'scene-14',
            source: 'assets/music/scene14-song.mp3',
            loop: true
        })
    }),

    scene2AfterPop: Object.freeze({
        key: 'scene-2-after-pop',
        source: 'assets/music/scene2-heart-pop.mp3',
        loop: true
    }),

    /* Backward-compatible alias for any internal legacy reference. */
    scene2Pop: Object.freeze({
        source: 'assets/music/scene2-heart-pop.mp3',
        volume: 1
    }),

    scene8Q4: Object.freeze({
        key: 'scene-8-q4',
        source: 'assets/music/scene8-q4-song.mp3',
        loop: true
    }),

    muteButton: Object.freeze({
        labelOn: 'Mute background music',
        labelOff: 'Turn background music on'
    })
});


/* ============================================================================
 * UTILITY HELPERS
 * ========================================================================== */

/**
 * Normalize selector list.
 *
 * @param {string|string[]} selectors
 * @returns {string[]}
 */
function audioNormalizeSelectors(selectors) {
    if (!selectors) {
        return [];
    }

    if (Array.isArray(selectors)) {
        return selectors
            .filter(Boolean)
            .map(String);
    }

    return [String(selectors)];
}


/**
 * Safely query first matching element.
 *
 * @param {string|string[]} selectors
 * @param {ParentNode} root
 * @returns {Element|null}
 */
function audioQueryFirst(
    selectors,
    root = document
) {
    const normalized =
        audioNormalizeSelectors(selectors);

    for (const selector of normalized) {
        try {
            const element =
                root.querySelector(selector);

            if (element) {
                return element;
            }
        } catch (error) {
            console.warn(
                '[SehrishBirthdayAudio] Invalid selector:',
                selector,
                error
            );
        }
    }

    return null;
}


/**
 * Safely query all unique elements.
 *
 * @param {string|string[]} selectors
 * @param {ParentNode} root
 * @returns {Element[]}
 */
function audioQueryAll(
    selectors,
    root = document
) {
    const normalized =
        audioNormalizeSelectors(selectors);

    const output = [];
    const seen = new Set();

    normalized.forEach((selector) => {
        try {
            root.querySelectorAll(selector)
                .forEach((element) => {
                    if (!seen.has(element)) {
                        seen.add(element);
                        output.push(element);
                    }
                });
        } catch (error) {
            console.warn(
                '[SehrishBirthdayAudio] Invalid selector:',
                selector,
                error
            );
        }
    });

    return output;
}


/**
 * Clamp numeric value.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function audioClamp(
    value,
    min,
    max
) {
    return Math.min(
        Math.max(
            Number(value) || 0,
            min
        ),
        max
    );
}


/**
 * Convert value to boolean.
 *
 * @param {*} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function audioToBoolean(
    value,
    fallback = false
) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized =
            value.trim().toLowerCase();

        if (
            [
                'true',
                '1',
                'yes',
                'on'
            ].includes(normalized)
        ) {
            return true;
        }

        if (
            [
                'false',
                '0',
                'no',
                'off'
            ].includes(normalized)
        ) {
            return false;
        }
    }

    return fallback;
}


/**
 * Normalize audio URL.
 *
 * @param {string} source
 * @param {'music'|'sfx'|'voice'|'auto'} category
 * @returns {string}
 */
function audioResolveSource(
    source,
    category = 'auto'
) {
    if (!source) {
        return '';
    }

    const value =
        String(source).trim();

    if (!value) {
        return '';
    }

    /*
     * Absolute URLs and already resolved paths should remain untouched.
     */
    if (
        value.startsWith('/') ||
        value.startsWith('./') ||
        value.startsWith('../') ||
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('blob:') ||
        value.startsWith('data:')
    ) {
        return value;
    }

    /*
     * If a source already looks like a path, keep it.
     */
    if (value.includes('/')) {
        return value;
    }

    let basePath =
        BIRTHDAY_AUDIO_CONFIG.paths.music;

    if (category === 'sfx') {
        basePath =
            BIRTHDAY_AUDIO_CONFIG.paths.sfx;
    }

    if (category === 'voice') {
        basePath =
            BIRTHDAY_AUDIO_CONFIG.paths.voice;
    }

    return `${basePath}${value}`;
}


/**
 * Generate unique ID.
 *
 * @returns {string}
 */
function createAudioId() {
    return (
        'audio-' +
        Date.now().toString(36) +
        '-' +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );
}


/**
 * Delay helper.
 *
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function audioWait(milliseconds) {
    return new Promise(
        (resolve) => {
            window.setTimeout(
                resolve,
                Math.max(
                    0,
                    Number(milliseconds) || 0
                )
            );
        }
    );
}


/**
 * Detect supported audio formats.
 *
 * @returns {object}
 */
function detectAudioSupport() {
    const element =
        document.createElement('audio');

    return {
        mp3:
            Boolean(
                element.canPlayType(
                    'audio/mpeg'
                )
            ),

        ogg:
            Boolean(
                element.canPlayType(
                    'audio/ogg'
                )
            ),

        wav:
            Boolean(
                element.canPlayType(
                    'audio/wav'
                )
            ),

        m4a:
            Boolean(
                element.canPlayType(
                    'audio/mp4'
                )
            ),

        webm:
            Boolean(
                element.canPlayType(
                    'audio/webm'
                )
            )
    };
}


/* ============================================================================
 * AUDIO TRACK MODEL
 * ========================================================================== */

class BirthdayAudioTrack {
    constructor(options = {}) {
        this.id =
            options.id ||
            createAudioId();

        this.src =
            String(
                options.src ||
                ''
            ).trim();

        this.category =
            options.category ||
            'music';

        this.loop =
            audioToBoolean(
                options.loop,
                false
            );

        this.volume =
            audioClamp(
                options.volume,
                0,
                1
            );

        this.rate =
            audioClamp(
                options.rate ?? 1,
                BIRTHDAY_AUDIO_CONFIG.limits.minRate,
                BIRTHDAY_AUDIO_CONFIG.limits.maxRate
            );

        this.preload =
            options.preload ||
            BIRTHDAY_AUDIO_CONFIG.defaults.preload;

        this.label =
            options.label ||
            this.id;

        this.sceneId =
            options.sceneId ||
            null;

        this.metadata = {
            ...(options.metadata || {})
        };

        this.element =
            options.element ||
            null;

        this.loaded = false;
        this.loading = false;
        this.playing = false;
        this.paused = true;
        this.failed = false;
    }

    createElement() {
        if (this.element) {
            return this.element;
        }

        this.element =
            document.createElement(
                'audio'
            );

        this.element.preload =
            this.preload;

        this.element.loop =
            this.loop;

        this.element.setAttribute(
            'aria-hidden',
            'true'
        );

        this.element.setAttribute(
            'playsinline',
            'true'
        );

        this.element.dataset.audioTrack =
            this.id;

        this.element.dataset.audioCategory =
            this.category;

        if (this.src) {
            this.element.src =
                this.src;
        }

        this.element.volume =
            this.volume;

        this.element.playbackRate =
            this.rate;

        return this.element;
    }

    setSource(source) {
        const nextSource =
            String(
                source || ''
            ).trim();

        if (nextSource === this.src) {
            return;
        }

        this.src = nextSource;

        if (this.element) {
            this.element.src =
                this.src;

            this.element.load();
        }

        this.loaded = false;
        this.loading = false;
        this.failed = false;
    }

    setVolume(volume) {
        this.volume =
            audioClamp(
                volume,
                0,
                1
            );

        if (this.element) {
            this.element.volume =
                this.volume;
        }
    }

    setRate(rate) {
        this.rate =
            audioClamp(
                rate,
                BIRTHDAY_AUDIO_CONFIG.limits.minRate,
                BIRTHDAY_AUDIO_CONFIG.limits.maxRate
            );

        if (this.element) {
            this.element.playbackRate =
                this.rate;
        }
    }

    async load() {
        if (!this.src) {
            return false;
        }

        const element =
            this.createElement();

        if (
            this.loaded
        ) {
            return true;
        }

        this.loading = true;
        this.failed = false;

        return new Promise(
            (resolve) => {
                let settled = false;

                const cleanup = () => {
                    element.removeEventListener(
                        'canplaythrough',
                        handleLoaded
                    );

                    element.removeEventListener(
                        'loadeddata',
                        handleLoaded
                    );

                    element.removeEventListener(
                        'error',
                        handleError
                    );
                };

                const finish = (
                    success
                ) => {
                    if (settled) {
                        return;
                    }

                    settled = true;

                    cleanup();

                    this.loading = false;
                    this.loaded = success;
                    this.failed = !success;

                    resolve(success);
                };

                const handleLoaded =
                    () => finish(true);

                const handleError =
                    () => finish(false);

                element.addEventListener(
                    'canplaythrough',
                    handleLoaded,
                    {
                        once: true
                    }
                );

                element.addEventListener(
                    'loadeddata',
                    handleLoaded,
                    {
                        once: true
                    }
                );

                element.addEventListener(
                    'error',
                    handleError,
                    {
                        once: true
                    }
                );

                try {
                    element.load();
                } catch {
                    finish(false);
                }
            }
        );
    }

    async play() {
        if (!this.src) {
            return false;
        }

        const element =
            this.createElement();

        try {
            await element.play();

            this.playing = true;
            this.paused = false;

            return true;
        } catch (error) {
            this.playing = false;
            this.paused = true;

            throw error;
        }
    }

    pause() {
        if (!this.element) {
            return;
        }

        try {
            this.element.pause();
        } catch {
            // Ignore browser media errors.
        }

        this.playing = false;
        this.paused = true;
    }

    stop() {
        if (!this.element) {
            return;
        }

        try {
            this.element.pause();
            this.element.currentTime = 0;
        } catch {
            // Ignore media state errors.
        }

        this.playing = false;
        this.paused = true;
    }

    destroy() {
        if (!this.element) {
            return;
        }

        try {
            this.element.pause();
            this.element.removeAttribute(
                'src'
            );
            this.element.load();
        } catch {
            // Ignore cleanup errors.
        }

        this.element.remove();

        this.element = null;
        this.playing = false;
        this.paused = true;
    }
}


/* ============================================================================
 * AUDIO FADE CONTROLLER
 * ========================================================================== */

class AudioFadeController {
    constructor() {
        this.activeAnimations =
            new WeakMap();
    }

    /**
     * Fade an HTMLAudioElement.
     *
     * @param {HTMLAudioElement} element
     * @param {number} targetVolume
     * @param {number} duration
     * @returns {Promise<void>}
     */
    fadeTo(
        element,
        targetVolume,
        duration = 500
    ) {
        if (
            !element ||
            !(element instanceof HTMLMediaElement)
        ) {
            return Promise.resolve();
        }

        const target =
            audioClamp(
                targetVolume,
                0,
                1
            );

        const start =
            audioClamp(
                Number(element.volume),
                0,
                1
            );

        if (
            duration <= 0 ||
            Math.abs(
                start - target
            ) < 0.005
        ) {
            element.volume =
                target;

            return Promise.resolve();
        }

        const previousAnimation =
            this.activeAnimations.get(
                element
            );

        if (previousAnimation) {
            previousAnimation.cancelled =
                true;
        }

        const animation = {
            cancelled: false
        };

        this.activeAnimations.set(
            element,
            animation
        );

        const started =
            performance.now();

        return new Promise(
            (resolve) => {
                const tick = (
                    now
                ) => {
                    if (
                        animation.cancelled
                    ) {
                        resolve();
                        return;
                    }

                    const elapsed =
                        now - started;

                    const progress =
                        Math.min(
                            1,
                            elapsed /
                            duration
                        );

                    /*
                     * Smoothstep easing.
                     */
                    const eased =
                        progress *
                        progress *
                        (
                            3 -
                            2 *
                            progress
                        );

                    element.volume =
                        start +
                        (
                            target -
                            start
                        ) *
                        eased;

                    if (
                        progress >= 1
                    ) {
                        element.volume =
                            target;

                        this.activeAnimations.delete(
                            element
                        );

                        resolve();
                        return;
                    }

                    window.requestAnimationFrame(
                        tick
                    );
                };

                window.requestAnimationFrame(
                    tick
                );
            }
        );
    }

    cancel(element) {
        const animation =
            this.activeAnimations.get(
                element
            );

        if (animation) {
            animation.cancelled =
                true;

            this.activeAnimations.delete(
                element
            );
        }
    }

    cancelAll() {
        /*
         * WeakMap doesn't expose iteration.
         * Existing animations naturally settle on their own.
         */
    }
}


/* ============================================================================
 * AUDIO EVENT BUS
 * ========================================================================== */

class AudioEventBus {
    constructor() {
        this.events =
            new Map();
    }

    on(
        eventName,
        handler
    ) {
        if (
            !eventName ||
            typeof handler !==
            'function'
        ) {
            return () => {};
        }

        if (
            !this.events.has(
                eventName
            )
        ) {
            this.events.set(
                eventName,
                new Set()
            );
        }

        const handlers =
            this.events.get(
                eventName
            );

        handlers.add(
            handler
        );

        return () => {
            handlers.delete(
                handler
            );

            if (
                handlers.size === 0
            ) {
                this.events.delete(
                    eventName
                );
            }
        };
    }

    once(
        eventName,
        handler
    ) {
        let unsubscribe =
            null;

        const wrapped =
            (...args) => {
                unsubscribe?.();
                handler(...args);
            };

        unsubscribe =
            this.on(
                eventName,
                wrapped
            );

        return unsubscribe;
    }

    emit(
        eventName,
        payload
    ) {
        const handlers =
            this.events.get(
                eventName
            );

        if (!handlers) {
            return;
        }

        [
            ...handlers
        ].forEach(
            (handler) => {
                try {
                    handler(
                        payload
                    );
                } catch (error) {
                    console.error(
                        '[SehrishBirthdayAudio] Event handler error:',
                        eventName,
                        error
                    );
                }
            }
        );
    }

    clear(
        eventName = null
    ) {
        if (eventName) {
            this.events.delete(
                eventName
            );

            return;
        }

        this.events.clear();
    }
}


/* ============================================================================
 * AUDIO ENGINE
 * ========================================================================== */

class BirthdayAudioManager {
    constructor() {
        this.name =
            BIRTHDAY_AUDIO_CONFIG.appName;

        this.version =
            BIRTHDAY_AUDIO_CONFIG.version;

        this.events =
            new AudioEventBus();

        this.fade =
            new AudioFadeController();

        this.tracks =
            new Map();

        this.sceneAudioMap =
            new Map();

        this.sfxPool =
            new Map();

        this.voicePool =
            new Map();

        this.domAudioElements =
            new Set();

        this.activeMusic =
            null;

        this.currentSceneId =
            null;

        this.currentSceneIndex =
            0;

        this.initialized =
            false;

        this.unlocked =
            false;

        this.destroyed =
            false;

        this.visibilityPaused =
            false;

        this.isTransitioning =
            false;

        this.workflowMusicKey =
            null;

        this.workflowReady =
            false;

        this.workflowScene2PopHandled =
            false;

        this.mediaDuckCount =
            0;

        this.duckedMedia =
            new Set();

        this.boundWorkflowMedia =
            new WeakSet();

        this.workflowObservers =
            [];

        /*
         * Transition / scene-sync state.
         * These guards prevent fast navigation from allowing an older
         * crossfade or observer callback to overwrite the newest Scene.
         */
        this.musicTransitionToken = 0;
        this.sceneSyncTimer = 0;
        this.sceneSyncPending = false;
        this.sceneObserver = null;
        this.applicationBindTimer = 0;
        this.applicationBindingAttempts = 0;
        this.boundApplication = null;
        this.initialSceneSyncDone = false;
        this.pendingSceneTarget = null;
        this.lastCommittedSceneId = null;
        this.workflowPreloadedKeys = new Set();
        this.voiceDuckKeys = new Set();
        this.manualDuckCount = 0;


        this.masterVolume =
            BIRTHDAY_AUDIO_CONFIG.defaults.masterVolume;

        this.musicVolume =
            BIRTHDAY_AUDIO_CONFIG.defaults.musicVolume;

        this.sfxVolume =
            BIRTHDAY_AUDIO_CONFIG.defaults.sfxVolume;

        this.voiceVolume =
            BIRTHDAY_AUDIO_CONFIG.defaults.voiceVolume;

        this.muted =
            false;

        this.support =
            detectAudioSupport();

        this.app =
            null;

        this.ui =
            {
                soundButtons: [],
                muteButtons: [],
                musicButtons: [],
                voiceButtons: [],
                effectButtons: [],
                volumeControls: []
            };

        this.boundHandlers = {
            pointerdown:
                this.handlePointerDown.bind(
                    this
                ),

            keydown:
                this.handleKeyDown.bind(
                    this
                ),

            visibilitychange:
                this.handleVisibilityChange.bind(
                    this
                ),

            sceneChanged:
                this.handleSceneChanged.bind(
                    this
                ),

            sceneBeforeChange:
                this.handleSceneBeforeChange.bind(
                    this
                )
        };
    }


    /* ========================================================================
     * INITIALIZATION
     * ====================================================================== */

    init(
        app = null
    ) {
        if (
            this.initialized
        ) {
            return this;
        }

        if (
            this.destroyed
        ) {
            return this;
        }

        this.app =
            app ||
            this.findApplication();

        this.restorePreferences();

        /* Migrate the previous hard-coded 0.62 music default to 0.54. */
        if (this.musicVolume === 0.62) {
            this.musicVolume = 0.54;
            this.writeStoredValue(
                BIRTHDAY_AUDIO_CONFIG.storage.musicVolume,
                this.musicVolume
            );
        }

        this.setupWorkflowAudio();

        this.scanDOMAudio();

        this.preloadWorkflowTracks();

        this.bindDOMEvents();

        this.bindApplicationEvents();

        this.createGlobalStateAttributes();

        this.initialized =
            true;

        /*
         * Start with the actually visible Scene. This is intentionally a best-
         * effort autoplay attempt; browser policy can still require the first
         * real user gesture, which is handled by pointerdown above.
         */
        this.scheduleWorkflowSceneSync({
            delay: 0,
            force: true
        });

        this.emit(
            'audio:initialized',
            this.getState()
        );

        return this;
    }


    findApplication() {
        try {
            if (
                window.SehrishBirthday &&
                typeof
                    window.SehrishBirthday.getApp ===
                    'function'
            ) {
                return window.SehrishBirthday.getApp();
            }
        } catch {
            // Application may not yet exist.
        }

        return null;
    }


    restorePreferences() {
        const storedMuted =
            this.readStoredValue(
                BIRTHDAY_AUDIO_CONFIG.storage.muted,
                null
            );

        const storedMaster =
            this.readStoredValue(
                BIRTHDAY_AUDIO_CONFIG.storage.masterVolume,
                null
            );

        const storedMusic =
            this.readStoredValue(
                BIRTHDAY_AUDIO_CONFIG.storage.musicVolume,
                null
            );

        const storedSfx =
            this.readStoredValue(
                BIRTHDAY_AUDIO_CONFIG.storage.sfxVolume,
                null
            );

        const storedVoice =
            this.readStoredValue(
                BIRTHDAY_AUDIO_CONFIG.storage.voiceVolume,
                null
            );

        if (
            storedMuted !== null
        ) {
            this.muted =
                audioToBoolean(
                    storedMuted,
                    false
                );
        }

        if (
            storedMaster !== null
        ) {
            this.masterVolume =
                audioClamp(
                    Number(
                        storedMaster
                    ),
                    0,
                    1
                );
        }

        if (
            storedMusic !== null
        ) {
            this.musicVolume =
                audioClamp(
                    Number(
                        storedMusic
                    ),
                    0,
                    1
                );
        }

        if (
            storedSfx !== null
        ) {
            this.sfxVolume =
                audioClamp(
                    Number(
                        storedSfx
                    ),
                    0,
                    1
                );
        }

        if (
            storedVoice !== null
        ) {
            this.voiceVolume =
                audioClamp(
                    Number(
                        storedVoice
                    ),
                    0,
                    1
                );
        }
    }


    readStoredValue(
        key,
        fallback = null
    ) {
        try {
            const fullKey =
                BIRTHDAY_AUDIO_CONFIG.storage
                    .prefix +
                key;

            const raw =
                window.localStorage?.getItem(
                    fullKey
                );

            if (
                raw === null
            ) {
                return fallback;
            }

            try {
                return JSON.parse(
                    raw
                );
            } catch {
                return raw;
            }
        } catch {
            return fallback;
        }
    }


    writeStoredValue(
        key,
        value
    ) {
        try {
            const fullKey =
                BIRTHDAY_AUDIO_CONFIG.storage
                    .prefix +
                key;

            window.localStorage?.setItem(
                fullKey,
                JSON.stringify(
                    value
                )
            );
        } catch {
            // Storage may be unavailable.
        }
    }


    /* ========================================================================
     * DOM DISCOVERY
     * ====================================================================== */

    scanDOMAudio() {
        /*
         * Existing audio elements can be declared directly in HTML:
         *
         * <audio
         *   data-audio-id="..."
         *   data-audio-category="music"
         *   data-audio-src="..."
         * ></audio>
         */

        const elements =
            document.querySelectorAll(
                'audio[data-audio-id], ' +
                'audio[data-audio-track], ' +
                'audio[data-audio-src]'
            );

        elements.forEach(
            (element) => {
                this.registerDOMElement(
                    element
                );
            }
        );


        /*
         * Scene-level audio configuration:
         *
         * <section
         *   data-scene="scene-1"
         *   data-audio-music="..."
         * >
         *
         * No actual track is chosen here unless the HTML explicitly
         * provides one. This keeps future audio decisions flexible.
         */

        const scenes =
            document.querySelectorAll(
                '[data-scene]'
            );

        scenes.forEach(
            (scene) => {
                this.readSceneConfiguration(
                    scene
                );
            }
        );


        /*
         * Buttons are also discovered automatically.
         */
        this.refreshUIControls();
    }


    registerDOMElement(
        element
    ) {
        if (
            !(element instanceof
                HTMLAudioElement)
        ) {
            return null;
        }

        const id =
            element.dataset.audioId ||
            element.dataset.audioTrack ||
            createAudioId();

        const category =
            element.dataset.audioCategory ||
            'music';

        const source =
            element.dataset.audioSrc ||
            element.getAttribute(
                'src'
            ) ||
            '';

        const loop =
            audioToBoolean(
                element.dataset.audioLoop,
                category === 'music'
            );

        const volume =
            audioClamp(
                Number(
                    element.dataset.audioVolume ??
                    1
                ),
                0,
                1
            );

        element.preload =
            element.dataset.audioPreload ||
            'metadata';

        element.loop =
            loop;

        element.setAttribute(
            'playsinline',
            'true'
        );

        element.setAttribute(
            'aria-hidden',
            'true'
        );

        const track =
            new BirthdayAudioTrack({
                id,
                src:
                    audioResolveSource(
                        source,
                        category
                    ),
                category,
                loop,
                volume,
                rate:
                    Number(
                        element.dataset.audioRate ||
                        1
                    ),
                preload:
                    element.dataset.audioPreload ||
                    'metadata',
                label:
                    element.dataset.audioLabel ||
                    id,
                element
            });

        this.tracks.set(
            id,
            track
        );

        this.domAudioElements.add(
            element
        );

        this.bindTrackEvents(
            track
        );

        return track;
    }


    readSceneConfiguration(
        scene
    ) {
        if (
            !(scene instanceof Element)
        ) {
            return;
        }

        const sceneId =
            scene.dataset.scene ||
            scene.id ||
            '';

        if (!sceneId) {
            return;
        }

        const configuration =
            {
                music:
                    scene.dataset.audioMusic ||
                    scene.dataset.sceneAudioMusic ||
                    '',

                musicLoop:
                    audioToBoolean(
                        scene.dataset.audioMusicLoop,
                        BIRTHDAY_AUDIO_CONFIG
                            .defaults
                            .defaultLoop
                    ),

                voice:
                    scene.dataset.audioVoice ||
                    scene.dataset.sceneAudioVoice ||
                    '',

                introSfx:
                    scene.dataset.audioIntroSfx ||
                    '',

                outroSfx:
                    scene.dataset.audioOutroSfx ||
                    ''
            };

        this.sceneAudioMap.set(
            String(sceneId),
            configuration
        );
    }


    refreshUIControls() {
        this.ui.soundButtons =
            audioQueryAll(
                BIRTHDAY_AUDIO_CONFIG
                    .selectors
                    .soundButton
            );

        this.ui.muteButtons =
            audioQueryAll(
                BIRTHDAY_AUDIO_CONFIG
                    .selectors
                    .muteButton
            );

        this.ui.musicButtons =
            audioQueryAll(
                BIRTHDAY_AUDIO_CONFIG
                    .selectors
                    .musicButton
            );

        this.ui.voiceButtons =
            audioQueryAll(
                BIRTHDAY_AUDIO_CONFIG
                    .selectors
                    .voiceButtons
            );

        this.ui.effectButtons =
            audioQueryAll(
                BIRTHDAY_AUDIO_CONFIG
                    .selectors
                    .effectButtons
            );

        this.ui.volumeControls =
            audioQueryAll(
                BIRTHDAY_AUDIO_CONFIG
                    .selectors
                    .volumeControls
            );

        this.updateUIState();
    }


    /* ========================================================================
     * TRACK REGISTRATION
     * ====================================================================== */

    registerTrack(
        options = {}
    ) {
        const category =
            options.category ||
            'music';

        const resolvedSource =
            audioResolveSource(
                options.src ||
                options.source ||
                '',
                category
            );

        if (
            !resolvedSource
        ) {
            return null;
        }

        const id =
            options.id ||
            createAudioId();

        const existing =
            this.tracks.get(
                id
            );

        if (
            existing
        ) {
            if (existing.src !== resolvedSource) {
                existing.setSource(
                    resolvedSource
                );
            }

            existing.category =
                category;

            if (options.loop !== undefined) {
                existing.loop =
                    audioToBoolean(
                        options.loop,
                        existing.loop
                    );

                if (existing.element) {
                    existing.element.loop =
                        existing.loop;
                }
            }

            if (options.volume !== undefined) {
                existing.volume =
                    audioClamp(
                        options.volume,
                        0,
                        1
                    );
            }

            return existing;
        }

        const track =
            new BirthdayAudioTrack({
                ...options,
                id,
                src:
                    resolvedSource,
                category,
                volume:
                    options.volume ??
                    1
            });

        track.createElement();

        this.tracks.set(
            id,
            track
        );

        this.bindTrackEvents(
            track
        );

        return track;
    }


    registerMusic(
        id,
        src,
        options = {}
    ) {
        return this.registerTrack({
            ...options,
            id,
            src,
            category: 'music',
            loop:
                options.loop ??
                true
        });
    }


    registerSFX(
        id,
        src,
        options = {}
    ) {
        return this.registerTrack({
            ...options,
            id,
            src,
            category: 'sfx',
            loop: false
        });
    }


    registerVoice(
        id,
        src,
        options = {}
    ) {
        return this.registerTrack({
            ...options,
            id,
            src,
            category: 'voice',
            loop: false
        });
    }


    unregisterTrack(
        id
    ) {
        const track =
            this.tracks.get(
                String(id)
            );

        if (!track) {
            return false;
        }

        if (
            this.activeMusic ===
            track
        ) {
            this.stopMusic({
                fade: false
            });
        }

        track.destroy();

        this.tracks.delete(
            String(id)
        );

        return true;
    }


    getTrack(
        id
    ) {
        if (
            !id
        ) {
            return null;
        }

        return this.tracks.get(
            String(id)
        ) || null;
    }


    /* ========================================================================
     * TRACK EVENTS
     * ====================================================================== */

    bindTrackEvents(
        track
    ) {
        const element =
            track.element ||
            track.createElement();

        element.addEventListener(
            'play',
            () => {
                track.playing = true;
                track.paused = false;

                this.applyGlobalClasses();

                this.emit(
                    'track:play',
                    {
                        track
                    }
                );
            }
        );

        element.addEventListener(
            'pause',
            () => {
                track.playing = false;
                track.paused = true;

                this.applyGlobalClasses();

                this.emit(
                    'track:pause',
                    {
                        track
                    }
                );
            }
        );

        element.addEventListener(
            'ended',
            () => {
                track.playing = false;
                track.paused = true;

                this.emit(
                    'track:ended',
                    {
                        track
                    }
                );
            }
        );

        element.addEventListener(
            'loadeddata',
            () => {
                track.loaded = true;
                track.loading = false;
            }
        );

        element.addEventListener(
            'error',
            (event) => {
                track.failed = true;
                track.loading = false;

                this.emit(
                    'track:error',
                    {
                        track,
                        event
                    }
                );

                console.warn(
                    '[SehrishBirthdayAudio] Track failed:',
                    track.src
                );
            }
        );

    }


    /* ========================================================================
     * MUSIC
     * ====================================================================== */

    async playMusic(
        source,
        options = {}
    ) {
        if (
            this.destroyed
        ) {
            return false;
        }

        const {
            id = null,
            loop =
                BIRTHDAY_AUDIO_CONFIG
                    .defaults
                    .defaultLoop,
            fade =
                BIRTHDAY_AUDIO_CONFIG
                    .defaults
                    .crossfade,
            volume = null,
            replace = true,
            restart = false,
            category = 'music'
        } = options;

        let track =
            id
                ? this.getTrack(id)
                : null;

        if (
            !track &&
            source
        ) {
            track =
                this.registerTrack({
                    id:
                        id ||
                        createAudioId(),
                    src:
                        source,
                    category,
                    loop
                });
        }

        if (
            !track
        ) {
            return false;
        }

        track.loop =
            audioToBoolean(
                loop,
                true
            );

        track.element.loop =
            track.loop;

        if (
            volume !== null
        ) {
            track.setVolume(
                audioClamp(
                    Number(volume),
                    0,
                    1
                )
            );
        }

        /*
         * Prevent duplicate playback.
         */
        if (
            this.activeMusic ===
            track &&
            track.element &&
            !track.element.paused &&
            !restart
        ) {
            return true;
        }

        await this.unlock();

        if (
            replace &&
            this.activeMusic
        ) {
            await this.crossfadeTo(
                track,
                fade,
                { restart }
            );

            return true;
        }

        return this.startTrack(
            track,
            {
                fadeIn:
                    fade
            }
        );
    }


    async startTrack(
        track,
        options = {}
    ) {
        if (!track?.element) {
            return false;
        }

        const fadeIn =
            Number.isFinite(Number(options.fadeIn))
                ? Math.max(0, Number(options.fadeIn))
                : BIRTHDAY_AUDIO_CONFIG.defaults.fadeIn;

        const element = track.element;
        const finalVolume =
            this.getMusicOutputVolume(track);

        try {
            if (options.startAt !== null && options.startAt !== undefined) {
                try {
                    element.currentTime = Math.max(0, Number(options.startAt) || 0);
                } catch {}
            }

            /* Start loading without waiting for network buffering. */
            this.primeTrack(track);

            element.loop = track.loop;
            element.playbackRate = track.rate;
            element.volume = fadeIn > 0 ? 0 : finalVolume;

            const playPromise = element.play();
            if (playPromise?.catch) {
                playPromise.catch((error) => {
                    this.handlePlaybackError(track, error);
                });
            }

            track.playing = true;
            track.paused = false;
            this.activeMusic = track;

            if (fadeIn > 0) {
                void this.fade.fadeTo(element, finalVolume, fadeIn);
            }

            this.applyGlobalClasses();
            this.emit('music:started', { track });
            return true;
        } catch (error) {
            this.handlePlaybackError(track, error);
            return false;
        }
    }

    primeTrack(track) {
        if (!track?.element) {
            return false;
        }

        const element = track.element;
        element.preload = 'auto';

        try {
            if (!element.src && track.src) {
                element.src = track.src;
            }
            if (element.readyState === 0 || !track.loaded) {
                element.load();
            }
        } catch {}

        return true;
    }


    getMusicOutputVolume(track) {
        if (!track) {
            return 0;
        }

        const base = this.getEffectiveVolume('music', track.volume);
        return this.mediaDuckCount > 0
            ? base * BIRTHDAY_AUDIO_CONFIG.defaults.duckVolume
            : base;
    }


    async crossfadeTo(
        incomingTrack,
        duration = BIRTHDAY_AUDIO_CONFIG.defaults.crossfade,
        options = {}
    ) {
        if (!incomingTrack?.element) {
            return false;
        }

        const outgoing = this.activeMusic;
        const restartSameTrack =
            options.restart === true && outgoing === incomingTrack;

        if (outgoing === incomingTrack && !restartSameTrack) {
            if (!incomingTrack.element.paused) {
                return true;
            }

            await this.unlock();

            const target = this.getMusicOutputVolume(incomingTrack);
            incomingTrack.element.volume = target;

            const resumePromise = incomingTrack.element.play();
            resumePromise?.catch?.((error) => {
                this.handlePlaybackError(incomingTrack, error);
            });

            incomingTrack.playing = true;
            incomingTrack.paused = false;
            return true;
        }

        const token = ++this.musicTransitionToken;

        await this.unlock();
        const incomingElement = incomingTrack.element;
        const safeDuration = Math.min(900, Math.max(220, Number(duration) || 700));
        const incomingTarget = this.getMusicOutputVolume(incomingTrack);

        try {
            this.primeTrack(incomingTrack);
            incomingElement.loop = incomingTrack.loop;
            incomingElement.playbackRate = incomingTrack.rate;

            if (restartSameTrack) {
                this.fade.cancel(incomingElement);

                await this.fade.fadeTo(
                    incomingElement,
                    0,
                    Math.min(240, safeDuration * 0.34)
                );

                if (token !== this.musicTransitionToken) {
                    return false;
                }

                try {
                    incomingElement.currentTime = 0;
                } catch {}

                incomingElement.volume = 0;
                const playPromise = incomingElement.play();
                playPromise?.catch?.((error) => {
                    this.handlePlaybackError(incomingTrack, error);
                });

                incomingTrack.playing = true;
                incomingTrack.paused = false;
                this.activeMusic = incomingTrack;

                void this.fade.fadeTo(
                    incomingElement,
                    incomingTarget,
                    Math.min(420, safeDuration * 0.62)
                );

                return true;
            }

            this.fade.cancel(incomingElement);
            incomingElement.volume = 0;

            /* Do NOT await load/canplaythrough. Start immediately. */
            const playPromise = incomingElement.play();
            playPromise?.catch?.((error) => {
                this.handlePlaybackError(incomingTrack, error);
            });

            incomingTrack.playing = true;
            incomingTrack.paused = false;
            this.activeMusic = incomingTrack;

            if (outgoing?.element && outgoing !== incomingTrack) {
                this.fade.cancel(outgoing.element);
                void this.fade.fadeTo(outgoing.element, 0, safeDuration).then(() => {
                    if (token !== this.musicTransitionToken) {
                        return;
                    }
                    try {
                        outgoing.element.pause();
                        outgoing.element.currentTime = 0;
                    } catch {}
                    outgoing.playing = false;
                    outgoing.paused = true;
                });
            }

            void this.fade.fadeTo(
                incomingElement,
                incomingTarget,
                safeDuration
            );

            this.applyGlobalClasses();
            this.emit('music:crossfaded', { from: outgoing, to: incomingTrack });
            return true;
        } catch (error) {
            this.handlePlaybackError(incomingTrack, error);
            return false;
        }
    }

    async stopMusic(
        options = {}
    ) {
        const {
            fade = true,
            duration =
                BIRTHDAY_AUDIO_CONFIG
                    .defaults
                    .fadeOut
        } = options;

        const track =
            this.activeMusic;

        if (
            !track ||
            !track.element
        ) {
            return;
        }

        const element =
            track.element;

        if (
            fade
        ) {
            await this.fade.fadeTo(
                element,
                0,
                duration
            );
        }

        try {
            element.pause();
            element.currentTime =
                0;
        } catch {
            // Ignore cleanup errors.
        }

        element.volume =
            this.getEffectiveVolume(
                track.category,
                track.volume
            );

        track.playing =
            false;

        track.paused =
            true;

        if (
            this.activeMusic ===
            track
        ) {
            this.activeMusic =
                null;
        }

        this.workflowMusicKey =
            null;

        this.applyGlobalClasses();

        this.emit(
            'music:stopped',
            {
                track
            }
        );
    }


    pauseMusic(
        options = {}
    ) {
        const track =
            this.activeMusic;

        if (
            !track?.element
        ) {
            return;
        }

        try {
            track.element.pause();
        } catch {
            // Ignore.
        }

        track.playing =
            false;

        track.paused =
            true;

        this.emit(
            'music:paused',
            {
                track,
                reason:
                    options.reason ||
                    'manual'
            }
        );

        this.applyGlobalClasses();
    }


    resumeMusic() {
        const track =
            this.activeMusic;

        if (
            !track?.element
        ) {
            return false;
        }

        if (
            !track.element.paused
        ) {
            return true;
        }

        return track.element
            .play()
            .then(
                () => {
                    track.playing =
                        true;

                    track.paused =
                        false;

                    this.applyGlobalClasses();

                    this.emit(
                        'music:resumed',
                        {
                            track
                        }
                    );

                    return true;
                }
            )
            .catch(
                (error) => {
                    this.handlePlaybackError(
                        track,
                        error
                    );

                    return false;
                }
            );
    }


    toggleMusic() {
        if (
            this.activeMusic
        ) {
            if (
                this.activeMusic
                    .element
                    ?.paused
            ) {
                return this.resumeMusic();
            }

            this.pauseMusic();

            return true;
        }

        /*
         * No track should be guessed here.
         * The scene configuration decides whether a track exists.
         */
        this.emit(
            'music:no-track'
        );

        return false;
    }


    /* ========================================================================
     * SOUND EFFECTS
     * ====================================================================== */

    async playSFX(
        source,
        options = {}
    ) {
        if (
            !source
        ) {
            return false;
        }

        await this.unlock();

        const {
            id = null,
            volume = 1,
            rate = 1,
            overlap = true
        } = options;

        const resolved =
            audioResolveSource(
                source,
                'sfx'
            );

        const key =
            id ||
            resolved;

        let element = null;

        if (
            !overlap &&
            this.sfxPool.has(key)
        ) {
            element =
                this.sfxPool.get(key);
        } else {
            element =
                document.createElement(
                    'audio'
                );

            element.preload =
                'auto';

            element.setAttribute(
                'playsinline',
                'true'
            );

            element.setAttribute(
                'aria-hidden',
                'true'
            );

            element.src =
                resolved;

            if (
                !overlap
            ) {
                this.sfxPool.set(
                    key,
                    element
                );
            }
        }

        const effectiveVolume =
            this.getEffectiveVolume(
                'sfx',
                audioClamp(
                    Number(volume),
                    0,
                    1
                )
            );

        try {
            element.currentTime =
                0;

            element.playbackRate =
                audioClamp(
                    Number(rate),
                    BIRTHDAY_AUDIO_CONFIG
                        .limits
                        .minRate,
                    BIRTHDAY_AUDIO_CONFIG
                        .limits
                        .maxRate
                );

            element.volume =
                effectiveVolume;

            const playPromise =
                element.play();

            if (
                playPromise &&
                typeof
                    playPromise.then ===
                    'function'
            ) {
                await playPromise;
            }

            this.emit(
                'sfx:played',
                {
                    source: resolved,
                    id: key
                }
            );

            return true;
        } catch (error) {
            this.emit(
                'sfx:error',
                {
                    source: resolved,
                    error
                }
            );

            console.warn(
                '[SehrishBirthdayAudio] SFX playback failed:',
                resolved
            );

            return false;
        }
    }


    stopAllSFX() {
        this.sfxPool.forEach(
            (element) => {
                try {
                    element.pause();
                    element.currentTime =
                        0;
                } catch {
                    // Ignore.
                }
            }
        );
    }


    /* ========================================================================
     * VOICE
     * ====================================================================== */

    async playVoice(
        source,
        options = {}
    ) {
        if (
            !source
        ) {
            return false;
        }

        await this.unlock();

        const {
            id = null,
            volume = 1,
            pauseMusic = false,
            duckMusic = true,
            fade = true
        } = options;

        const resolved =
            audioResolveSource(
                source,
                'voice'
            );

        const key =
            id ||
            resolved;

        let voice =
            this.voicePool.get(
                key
            );

        if (
            !voice
        ) {
            voice =
                document.createElement(
                    'audio'
                );

            voice.preload =
                'auto';

            voice.setAttribute(
                'playsinline',
                'true'
            );

            voice.setAttribute(
                'aria-hidden',
                'true'
            );

            voice.src =
                resolved;

            this.voicePool.set(
                key,
                voice
            );

            voice.addEventListener(
                'ended',
                () => {
                    this.voiceDuckKeys.delete(key);
                    void this.syncMusicDucking();

                    this.emit(
                        'voice:ended',
                        {
                            source:
                                resolved
                        }
                    );
                }
            );
        }

        const effectiveVolume =
            this.getEffectiveVolume(
                'voice',
                audioClamp(
                    Number(volume),
                    0,
                    1
                )
            );

        try {
            voice.currentTime =
                0;

            voice.volume =
                fade
                    ? 0
                    : effectiveVolume;

            /*
             * User workflow: voice never pauses background music.
             * Even when an older caller asks for pauseMusic=true,
             * keep the song running and duck it instead.
             */
            if (
                pauseMusic ||
                duckMusic
            ) {
                this.voiceDuckKeys.add(key);
                await this.syncMusicDucking();
            }

            const promise =
                voice.play();

            if (
                promise &&
                typeof promise.then ===
                    'function'
            ) {
                await promise;
            }

            if (
                fade
            ) {
                await this.fade.fadeTo(
                    voice,
                    effectiveVolume,
                    BIRTHDAY_AUDIO_CONFIG
                        .defaults
                        .fadeIn
                );
            }

            this.emit(
                'voice:played',
                {
                    source:
                        resolved
                }
            );

            return true;
        } catch (error) {
            if (
                pauseMusic ||
                duckMusic
            ) {
                this.voiceDuckKeys.delete(key);
                void this.syncMusicDucking();
            }

            this.emit(
                'voice:error',
                {
                    source:
                        resolved,
                    error
                }
            );

            return false;
        }
    }


    stopVoice(
        id = null,
        fade = true
    ) {
        const voices =
            id
                ? [
                    this.voicePool.get(
                        String(id)
                    )
                ]
                : [
                    ...this.voicePool.values()
                ];

        voices
            .filter(Boolean)
            .forEach(
                async (voice) => {
                    if (
                        fade
                    ) {
                        await this.fade.fadeTo(
                            voice,
                            0,
                            BIRTHDAY_AUDIO_CONFIG
                                .defaults
                                .fadeOut
                        );
                    }

                    try {
                        voice.pause();
                        voice.currentTime =
                            0;
                    } catch {
                        // Ignore.
                    }
                }
            );

        if (id) {
            this.voiceDuckKeys.delete(String(id));
        } else {
            this.voiceDuckKeys.clear();
        }

        void this.syncMusicDucking();
    }


    /* ========================================================================
     * MUSIC DUCKING
     * ====================================================================== */

    async syncMusicDucking() {
        this.mediaDuckCount =
            this.duckedMedia.size +
            this.voiceDuckKeys.size +
            this.manualDuckCount;

        const track = this.activeMusic;
        if (!track?.element) {
            return;
        }

        const target = this.getMusicOutputVolume(track);
        track.element.dataset.audioDucked =
            this.mediaDuckCount > 0 ? 'true' : 'false';

        await this.fade.fadeTo(
            track.element,
            target,
            this.mediaDuckCount > 0 ? 220 : 320
        );
    }


    async duckMusic() {
        this.manualDuckCount =
            Math.max(0, this.manualDuckCount + 1);
        await this.syncMusicDucking();
    }


    async restoreMusicVolume() {
        this.manualDuckCount =
            Math.max(0, this.manualDuckCount - 1);
        await this.syncMusicDucking();
    }

    /* ========================================================================
     * WORKFLOW AUDIO HELPERS
     * ====================================================================== */

    getWorkflowSceneAudio(
        sceneId,
        sceneElement
    ) {
        const id =
            String(sceneId);

        if (
            id === '8' &&
            this.isScene8Question4Visible(
                sceneElement ||
                document.getElementById('scene-8')
            )
        ) {
            return BIRTHDAY_WORKFLOW_AUDIO
                .scene8Q4;
        }

        return (
            BIRTHDAY_WORKFLOW_AUDIO
                .scenes[id] ||
            null
        );
    }


    isScene8Question4Visible(
        sceneElement
    ) {
        const scene =
            sceneElement ||
            document.getElementById('scene-8');

        const question =
            scene?.querySelector(
                '#quiz-question-4'
            );

        if (!question) {
            return false;
        }

        return (
            question.getAttribute('aria-hidden') ===
                'false' &&
            !question.hidden
        );
    }


    async applyWorkflowSceneMusic(
        workflow,
        options = {}
    ) {
        if (!workflow?.source) {
            return false;
        }

        const track = this.registerMusic(
            `workflow:${workflow.key}`,
            workflow.source,
            {
                loop: workflow.loop !== false,
                label: `Workflow ${workflow.key}`,
                sceneId: workflow.key,
                volume: 1
            }
        );

        if (!track) {
            return false;
        }

        track.loop = workflow.loop !== false;
        track.element.loop = track.loop;

        const forceRestart = options.forceRestart === true;
        const sameActiveTrack =
            this.activeMusic === track &&
            !track.element.paused;

        /* Forward inside a continuous group: keep exact song position. */
        if (sameActiveTrack && !forceRestart) {
            this.workflowMusicKey = workflow.key;
            return true;
        }

        const played = await this.playMusic(null, {
            id: track.id,
            loop: track.loop,
            fade: BIRTHDAY_AUDIO_CONFIG.defaults.crossfade,
            restart: forceRestart
        });

        if (played) {
            this.workflowMusicKey = workflow.key;
        }

        return played;
    }


    preloadWorkflowTracks() {
        const workflows = [
            ...Object.values(BIRTHDAY_WORKFLOW_AUDIO.scenes),
            BIRTHDAY_WORKFLOW_AUDIO.scene2AfterPop,
            BIRTHDAY_WORKFLOW_AUDIO.scene8Q4
        ].filter(Boolean);

        const seen = new Set();

        workflows.forEach((workflow) => {
            if (!workflow.key || seen.has(workflow.key)) {
                return;
            }
            seen.add(workflow.key);

            const track = this.registerMusic(
                `workflow:${workflow.key}`,
                workflow.source,
                {
                    loop: workflow.loop !== false,
                    label: `Workflow ${workflow.key}`,
                    sceneId: workflow.key,
                    volume: 1
                }
            );

            if (!track) {
                return;
            }

            track.element.preload = 'auto';
            this.workflowPreloadedKeys.add(workflow.key);

            try {
                track.element.load();
            } catch {}
        });

        /*
         * Scene 2's post-pop file is a MUSIC track, not an SFX.
         * Preload it as music so the crossfade can begin immediately at
         * the exact heart-pop moment.
         */
        const scene2AfterPop =
            BIRTHDAY_WORKFLOW_AUDIO.scene2AfterPop;

        if (scene2AfterPop?.source) {
            const afterPopTrack = this.registerMusic(
                `workflow:${scene2AfterPop.key}`,
                scene2AfterPop.source,
                {
                    loop: scene2AfterPop.loop !== false,
                    label: 'Scene 2 After-Pop Music',
                    sceneId: scene2AfterPop.key,
                    volume: 1
                }
            );

            if (afterPopTrack) {
                afterPopTrack.element.preload = 'auto';
                try {
                    afterPopTrack.element.load();
                } catch {}
            }
        }
    }


    async handleScene2HeartPop() {
        if (
            this.currentSceneId !== '2'
        ) {
            return false;
        }

        const scene2 =
            document.getElementById('scene-2');

        if (
            scene2 &&
            scene2.getAttribute('aria-hidden') === 'true'
        ) {
            return false;
        }

        const afterPop =
            BIRTHDAY_WORKFLOW_AUDIO.scene2AfterPop;

        /*
         * IMPORTANT: the Scene 2 post-pop file is the SECOND BACKGROUND
         * MUSIC TRACK. It must replace the before-pop music immediately at
         * the pop/spark moment. Do not play it as an SFX, otherwise the global
         * music crossfade engine cannot hand over cleanly to Scene 3.
         */
        if (afterPop?.source) {
            const played =
                await this.applyWorkflowSceneMusic(
                    afterPop,
                    {
                        forceRestart: true
                    }
                );

            if (!played) {
                /*
                 * A second attempt is useful when the browser was still
                 * completing the preload of scene2-heart-pop.mp3 at the
                 * exact impact frame.  The retry is limited to the same
                 * Scene-2 lifecycle and will not affect Scene 3+.
                 */
                window.setTimeout(() => {
                    if (
                        this.currentSceneId === '2' &&
                        document.getElementById('scene-3')?.getAttribute('aria-hidden') === 'true'
                    ) {
                        void this.applyWorkflowSceneMusic(
                            afterPop,
                            {
                                forceRestart: true
                            }
                        );
                    }
                }, 80);
            }

            return played;
        }

        return false;
    }


    restartCurrentMusic() {
        const track =
            this.activeMusic;

        if (!track?.element) {
            return false;
        }

        try {
            track.element.currentTime =
                0;

            const target = this.getMusicOutputVolume(track);
            track.element.volume = target;

            const promise =
                track.element.play();

            if (
                promise &&
                typeof promise.then ===
                    'function'
            ) {
                promise.catch(() => {});
            }

            track.playing = true;
            track.paused = false;

            return true;
        } catch {
            return false;
        }
    }


    ensureWorkflowMuteButtons() {
        if (
            !document.body
        ) {
            return;
        }

        if (!document.getElementById(
            'sbaudio-mute-style'
        )) {
            const style =
                document.createElement(
                    'style'
                );

            style.id =
                'sbaudio-mute-style';

            style.textContent = `
                .sbaudio-scene-mute {
                    position: absolute;
                    top: 68px;
                    right: 16px;
                    z-index: 9999;
                    width: 38px;
                    height: 38px;
                    border: 1px solid rgba(255,255,255,.68);
                    border-radius: 999px;
                    background: rgba(255,255,255,.58);
                    color: rgba(90,65,82,.92);
                    box-shadow: 0 8px 24px rgba(128,87,111,.13);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    display: grid;
                    place-items: center;
                    padding: 0;
                    cursor: pointer;
                    font-size: 16px;
                    line-height: 1;
                    transition: transform .2s ease, background .2s ease, box-shadow .2s ease;
                }
                .sbaudio-scene-mute:hover {
                    transform: translateY(-1px) scale(1.03);
                    box-shadow: 0 10px 28px rgba(128,87,111,.18);
                }
                .sbaudio-scene-mute:active {
                    transform: scale(.96);
                }
                @media (max-width: 640px) {
                    .sbaudio-scene-mute {
                        top: 62px;
                        right: 12px;
                        width: 34px;
                        height: 34px;
                        font-size: 15px;
                    }
                }
            `;

            document.head?.appendChild(
                style
            );
        }

        document
            .querySelectorAll('.scene')
            .forEach((scene) => {
                if (
                    scene.querySelector(
                        '.sbaudio-scene-mute'
                    )
                ) {
                    return;
                }

                const button =
                    document.createElement(
                        'button'
                    );

                button.type =
                    'button';
                button.className =
                    'sbaudio-scene-mute';
                button.setAttribute(
                    'data-audio-action',
                    'mute'
                );
                button.setAttribute(
                    'aria-pressed',
                    'false'
                );
                button.setAttribute(
                    'aria-label',
                    BIRTHDAY_WORKFLOW_AUDIO
                        .muteButton
                        .labelOn
                );
                button.textContent =
                    '🔊';
                button.title =
                    'Background music';

                scene.appendChild(
                    button
                );
            });
    }


    bindWorkflowMediaElement(
        media
    ) {
        if (
            !(media instanceof HTMLMediaElement) ||
            this.boundWorkflowMedia.has(media)
        ) {
            return;
        }

        const isMusicElement = () => {
            const category = media.dataset?.audioCategory || '';
            const id = media.id || '';
            const src =
                media.currentSrc ||
                media.src ||
                media.getAttribute('src') ||
                '';

            return (
                category === 'music' ||
                /song-audio/i.test(id) ||
                /scene\d+-(?:song|music)/i.test(id) ||
                (/assets\/music\//i.test(src) && /song/i.test(id))
            );
        };

        if (isMusicElement()) {
            return;
        }

        this.boundWorkflowMedia.add(media);

        const beginDuck = () => {
            if (media.paused || media.ended || isMusicElement()) {
                return;
            }

            this.duckedMedia.add(media);
            void this.syncMusicDucking();
        };

        const endDuck = () => {
            if (this.duckedMedia.delete(media)) {
                void this.syncMusicDucking();
            }
        };

        media.addEventListener('play', beginDuck);
        media.addEventListener('playing', beginDuck);
        media.addEventListener('pause', endDuck);
        media.addEventListener('ended', endDuck);
        media.addEventListener('emptied', endDuck);
        media.addEventListener('abort', endDuck);
        media.addEventListener('error', endDuck);
    }

    bindWorkflowMediaDucking() {
        document
            .querySelectorAll('audio, video')
            .forEach((media) => {
                this.bindWorkflowMediaElement(
                    media
                );
            });

        const observer =
            new MutationObserver(
                (mutations) => {
                    mutations.forEach(
                        (mutation) => {
                            mutation.addedNodes
                                .forEach(
                                    (node) => {
                                        if (
                                            !(node instanceof
                                                Element)
                                        ) {
                                            return;
                                        }

                                        if (
                                            node.matches?.(
                                                'audio, video'
                                            )
                                        ) {
                                            this.bindWorkflowMediaElement(
                                                node
                                            );
                                        }

                                        node.querySelectorAll?.(
                                            'audio, video'
                                        ).forEach(
                                            (media) => {
                                                this.bindWorkflowMediaElement(
                                                    media
                                                );
                                            }
                                        );
                                    }
                                );

                            mutation.removedNodes.forEach((node) => {
                                if (node instanceof HTMLMediaElement) {
                                    this.duckedMedia.delete(node);
                                }
                                node.querySelectorAll?.('audio, video').forEach((media) => {
                                    this.duckedMedia.delete(media);
                                });
                            });

                            void this.syncMusicDucking();
                        }
                    );
                }
            );

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        this.workflowObservers.push(
            observer
        );
    }


    bindWorkflowInteractionHooks() {
        const scene2 =
            document.getElementById(
                'scene-2'
            );

        const archery =
            scene2?.querySelector(
                '#page2-heart-archery'
            );

        if (scene2 && archery) {
            /*
             * Scene 2 has its own two-part music workflow.  The visual
             * scratch/archery code adds the pop classes after the arrow hits
             * the heart.  Earlier versions could see stale classes from a
             * previous visit and mark the pop as "already handled" before
             * the user actually hit the heart.
             *
             * Arm the pop detector only after Scene 2 has become visible and
             * its own reset routine has had time to clear old classes.  Then
             * react to the first real pop signal only once per Scene-2 visit.
             */
            let scene2PopArmed = false;
            let scene2ArmTimer = 0;
            let scene2LifecycleToken = 0;

            const isScene2Visible = () => {
                const ariaVisible =
                    scene2.getAttribute(
                        'aria-hidden'
                    ) !== 'true';

                return ariaVisible &&
                    (
                        scene2.classList.contains('is-active') ||
                        ariaVisible
                    );
            };

            const clearScene2ArmTimer = () => {
                if (scene2ArmTimer) {
                    window.clearTimeout(
                        scene2ArmTimer
                    );
                    scene2ArmTimer = 0;
                }
            };

            const armScene2PopDetector = () => {
                clearScene2ArmTimer();

                scene2PopArmed = false;
                scene2LifecycleToken += 1;
                const token = scene2LifecycleToken;

                /*
                 * navigation.js / Scene-2 itself clears the old visual state
                 * shortly after activation.  Wait just beyond that reset so
                 * a stale p2-spark-show from a previous visit cannot trigger
                 * the second song.
                 */
                scene2ArmTimer =
                    window.setTimeout(() => {
                        scene2ArmTimer = 0;

                        if (
                            token !== scene2LifecycleToken ||
                            !isScene2Visible()
                        ) {
                            return;
                        }

                        scene2PopArmed = true;

                        /* New Scene-2 visit = fresh pop lifecycle. */
                        this.workflowScene2PopHandled = false;
                    }, 90);
            };

            const disarmScene2PopDetector = () => {
                clearScene2ArmTimer();
                scene2LifecycleToken += 1;
                scene2PopArmed = false;
                this.workflowScene2PopHandled = false;
            };

            const triggerScene2HeartPop = () => {
                if (
                    !scene2PopArmed ||
                    !isScene2Visible() ||
                    this.workflowScene2PopHandled
                ) {
                    return;
                }

                /* Mark synchronously so multiple MutationObserver/animation
                 * callbacks cannot start the second track twice. */
                this.workflowScene2PopHandled = true;

                void this.handleScene2HeartPop();
            };

            const scene2Observer =
                new MutationObserver(() => {
                    if (!isScene2Visible()) {
                        disarmScene2PopDetector();
                        return;
                    }

                    if (!scene2PopArmed) {
                        armScene2PopDetector();
                        return;
                    }

                    const popVisible =
                        archery.classList.contains('p2-spark-show') ||
                        archery.classList.contains('p2-blast-zoom');

                    if (popVisible) {
                        triggerScene2HeartPop();
                    }
                });

            scene2Observer.observe(
                scene2,
                {
                    attributes: true,
                    attributeFilter: [
                        'aria-hidden',
                        'class'
                    ]
                }
            );

            const archeryObserver =
                new MutationObserver(() => {
                    if (!isScene2Visible()) {
                        return;
                    }

                    if (!scene2PopArmed) {
                        return;
                    }

                    const popVisible =
                        archery.classList.contains('p2-spark-show') ||
                        archery.classList.contains('p2-blast-zoom');

                    if (popVisible) {
                        triggerScene2HeartPop();
                    }
                });

            archeryObserver.observe(
                archery,
                {
                    attributes: true,
                    attributeFilter: [
                        'class'
                    ]
                }
            );

            /* CSS animation starts at the same visual impact moment.  This
             * gives us a second, very low-latency signal in browsers where
             * MutationObserver delivery is delayed by rendering work. */
            archery.addEventListener(
                'animationstart',
                (event) => {
                    const animationName =
                        String(
                            event.animationName ||
                            ''
                        );

                    if (
                        animationName === 'p2HeartHitZoom' ||
                        animationName === 'p2BlastZoom'
                    ) {
                        triggerScene2HeartPop();
                    }
                },
                true
            );

            this.workflowObservers.push(
                scene2Observer,
                archeryObserver
            );

            /* Handle the initial state when the page opens directly on Scene 2. */
            if (isScene2Visible()) {
                armScene2PopDetector();
            }
        }

        const scene8 =
            document.getElementById(
                'scene-8'
            );

        if (scene8) {
            const observer =
                new MutationObserver(
                    () => {
                        if (
                            scene8.getAttribute(
                                'aria-hidden'
                            ) === 'true'
                        ) {
                            return;
                        }

                        if (
                            this.isScene8Question4Visible(
                                scene8
                            )
                        ) {
                            void this.applyWorkflowSceneMusic(
                                BIRTHDAY_WORKFLOW_AUDIO
                                    .scene8Q4
                            );
                        }
                    }
                );

            observer.observe(
                scene8,
                {
                    subtree: true,
                    attributes: true,
                    attributeFilter: [
                        'aria-hidden',
                        'hidden',
                        'class'
                    ]
                }
            );

            this.workflowObservers.push(
                observer
            );
        }

        document.addEventListener(
            'click',
            (event) => {
                const target =
                    event.target instanceof
                        Element
                        ? event.target
                        : null;

                if (!target) {
                    return;
                }

                const scene9Button =
                    target.closest(
                        '#scene-9 button, #scene-9 [role="button"]'
                    );

                if (
                    scene9Button &&
                    this.currentSceneId === '9'
                ) {
                    const label =
                        (
                            scene9Button
                                .textContent ||
                            ''
                        ).trim();

                    const action =
                        scene9Button
                            .dataset.action ||
                        '';

                    if (
                        /try\s*again/i.test(
                            label
                        ) ||
                        /retry|restart|again/i.test(
                            action
                        )
                    ) {
                        this.restartCurrentMusic();
                    }
                }
            },
            true
        );
    }


    setupWorkflowAudio() {
        if (
            this.workflowReady
        ) {
            return;
        }

        this.workflowReady =
            true;

        this.workflowScene2PopHandled =
            false;

        this.ensureWorkflowMuteButtons();
        this.bindWorkflowMediaDucking();
        this.bindWorkflowInteractionHooks();

        /*
         * audio.js is loaded before app.js in this project.  The observer
         * guarantees scene tracking immediately; the late app binder adds the
         * application's own scene:event path once app.js becomes available.
         */
        this.bindWorkflowSceneObserver();
        this.bindLateApplicationEvents();
    }


    /* ========================================================================
     * RELIABLE SCENE SYNCHRONIZATION
     * ====================================================================== */

    getWorkflowActiveScene() {
        const scenes = [
            ...document.querySelectorAll('.scene')
        ];

        if (!scenes.length) {
            return null;
        }

        /*
         * The navigation system marks the real active Scene with
         * `.is-active`. Prefer this over aria-hidden because transitions can
         * briefly leave more than one aria state in the DOM.
         */
        const activeClassScene =
            scenes.find(
                (scene) =>
                    scene.classList.contains('is-active')
            );

        if (activeClassScene) {
            return activeClassScene;
        }

        const visibleAriaScene =
            scenes.find(
                (scene) =>
                    scene.getAttribute('aria-hidden') === 'false'
            );

        if (visibleAriaScene) {
            return visibleAriaScene;
        }

        return null;
    }


    getSceneIdFromElement(scene) {
        if (!scene) {
            return '';
        }

        const raw =
            scene.dataset?.scene ||
            scene.id ||
            '';

        const match = String(raw).match(/(?:scene[-_])?(\d+)$/i);

        return match ? match[1] : '';
    }


    getSceneIndexFromElement(scene) {
        const id = Number(
            this.getSceneIdFromElement(scene)
        );

        return Number.isFinite(id) && id > 0
            ? id - 1
            : 0;
    }


    scheduleWorkflowSceneSync(options = {}) {
        const delay = Math.max(
            0,
            Number(options.delay) || 0
        );
        const force = options.force === true;
        const expectedSceneId =
            options.expectedSceneId
                ? String(options.expectedSceneId)
                : '';

        if (this.sceneSyncPending && !force) {
            return;
        }

        this.sceneSyncPending = true;

        window.clearTimeout(
            this.sceneSyncTimer
        );

        this.sceneSyncTimer =
            window.setTimeout(
                () => {
                    this.sceneSyncPending = false;
                    this.syncWorkflowSceneAudio({
                        force,
                        expectedSceneId
                    });
                },
                delay
            );
    }


    syncWorkflowSceneAudio(options = {}) {
        const scene =
            this.getWorkflowActiveScene();

        if (!scene) {
            return false;
        }

        const sceneId =
            this.getSceneIdFromElement(scene);

        if (!sceneId) {
            return false;
        }

        if (
            options.expectedSceneId &&
            String(options.expectedSceneId) !== String(sceneId)
        ) {
            /*
             * Navigation may still be settling. Run one more check without
             * guessing or changing any other Scene.
             */
            this.scheduleWorkflowSceneSync({
                delay: 80,
                force: true
            });
            return false;
        }

        const force = options.force === true;

        if (
            !force &&
            this.currentSceneId === String(sceneId) &&
            this.isWorkflowTrackActiveForScene(sceneId)
        ) {
            return true;
        }

        this.pendingSceneTarget = String(sceneId);

        void this.handleSceneChanged({
            scene,
            index: this.getSceneIndexFromElement(scene),
            source: 'dom-sync'
        });

        this.initialSceneSyncDone = true;
        return true;
    }


   isWorkflowTrackActiveForScene(sceneId) {
    const id =
        String(sceneId);

    /*
     * ================================================================
     * SCENE 2 SPECIAL CASE
     * ================================================================
     *
     * Scene 2 has two music states:
     *
     * 1. before heart pop
     * 2. after heart pop
     *
     * Once the heart has been hit, the second track becomes the
     * correct active track for Scene 2. The global scene observer
     * must NOT switch it back to the first track.
     */

    if (
        id === '2' &&
        this.workflowScene2PopHandled
    ) {
        const afterPop =
            BIRTHDAY_WORKFLOW_AUDIO.scene2AfterPop;

        const resolvedAfterPopSource =
            audioResolveSource(
                afterPop.source,
                'music'
            );

        return Boolean(
            this.activeMusic?.element &&
            this.activeMusic.src ===
                resolvedAfterPopSource &&
            !this.activeMusic.element.paused
        );
    }


    /*
     * ================================================================
     * NORMAL SCENE WORKFLOW
     * ================================================================
     */

    const workflow =
        this.getWorkflowSceneAudio(
            id,
            document.getElementById(
                `scene-${id}`
            )
        );


    if (!workflow?.source) {
        return Boolean(
            !this.activeMusic ||
            this.currentSceneId === id
        );
    }


    const resolvedSource =
        audioResolveSource(
            workflow.source,
            'music'
        );


    return Boolean(
        this.activeMusic?.element &&
        this.activeMusic.src ===
            resolvedSource &&
        !this.activeMusic.element.paused
    );
}


    bindWorkflowSceneObserver() {
        if (
            this.sceneObserver ||
            typeof MutationObserver === 'undefined'
        ) {
            return;
        }

        const root =
            document.body ||
            document.documentElement;

        if (!root) {
            return;
        }

        this.sceneObserver =
            new MutationObserver(() => {
                this.scheduleWorkflowSceneSync({
                    delay: 0
                });
            });

        this.sceneObserver.observe(
            root,
            {
                subtree: true,
                attributes: true,
                attributeFilter: [
                    'aria-hidden',
                    'class',
                    'hidden'
                ]
            }
        );

        this.workflowObservers.push(
            this.sceneObserver
        );

        /*
         * Capture navigation intent too. This helps when the app emits its
         * internal event before the DOM settles, and the final observer pass
         * then confirms the actual visible Scene.
         */
        document.addEventListener(
            'click',
            (event) => {
                const target =
                    event.target instanceof Element
                        ? event.target.closest(
                            '[data-target-scene]'
                        )
                        : null;

                if (!target) {
                    return;
                }

                const targetScene =
                    target.getAttribute(
                        'data-target-scene'
                    );

                if (!targetScene) {
                    return;
                }

                this.pendingSceneTarget =
                    String(targetScene);

                /* Several passes handle both instant and animated nav. */
                this.scheduleWorkflowSceneSync({
                    delay: 0,
                    force: true,
                    expectedSceneId: targetScene
                });

                window.setTimeout(
                    () => {
                        this.scheduleWorkflowSceneSync({
                            delay: 0,
                            force: true,
                            expectedSceneId: targetScene
                        });
                    },
                    80
                );
            },
            true
        );

        this.scheduleWorkflowSceneSync({
            delay: 0,
            force: true
        });
    }


    bindLateApplicationEvents() {
        if (this.boundApplication) {
            return;
        }

        const tryBind = () => {
            if (this.boundApplication) {
                window.clearInterval(
                    this.applicationBindTimer
                );
                this.applicationBindTimer = 0;
                return;
            }

            const app = this.findApplication();

            if (app?.events) {
                this.attachApplicationEvents(app);
                window.clearInterval(
                    this.applicationBindTimer
                );
                this.applicationBindTimer = 0;
                return;
            }

            this.applicationBindingAttempts += 1;

            if (this.applicationBindingAttempts >= 80) {
                window.clearInterval(
                    this.applicationBindTimer
                );
                this.applicationBindTimer = 0;
            }
        };

        tryBind();

        if (!this.boundApplication) {
            this.applicationBindTimer =
                window.setInterval(
                    tryBind,
                    100
                );
        }
    }


    /* ========================================================================
     * SCENE AUDIO
     * ====================================================================== */

    async handleSceneBeforeChange(
        payload
    ) {
        this.isTransitioning =
            true;

        this.emit(
            'scene-audio:transition-start',
            payload
        );
    }


    async handleSceneChanged(
        payload
    ) {
        const {
            scene,
            index
        } =
            payload || {};

        if (
            !scene
        ) {
            this.isTransitioning =
                false;

            return;
        }

        const sceneElement =
            scene.element ||
            scene;

        if (
            !(sceneElement instanceof Element) &&
            !sceneElement?.dataset
        ) {
            this.isTransitioning = false;
            return;
        }

        const rawSceneId =
            scene.id ||
            sceneElement?.dataset?.scene ||
            sceneElement?.id ||
            '';

        const sceneId =
            String(rawSceneId)
                .replace(/^scene-?/i, '');

        if (!sceneId) {
            this.isTransitioning = false;
            return;
        }

        const previousSceneId = this.currentSceneId;
        const sceneIndex = Number.isInteger(Number(index))
            ? Number(index)
            : this.getSceneIndexFromElement(sceneElement);
        const movingBack =
            previousSceneId !== null &&
            Number(sceneId) < Number(previousSceneId);

        this.currentSceneId = String(sceneId);
        this.currentSceneIndex = sceneIndex;

        /*
         * Re-read scene data in case it was modified dynamically.
         */
        if (
            sceneElement
        ) {
            this.readSceneConfiguration(
                sceneElement
            );
        }

        await this.applySceneAudio(
            String(sceneId),
            sceneElement,
            { movingBack }
        );

        /*
         * If navigation changed again while the track was loading, immediately
         * reconcile once more instead of leaving the previous Scene's song.
         */
        const latestScene =
            this.getWorkflowActiveScene();

        const latestSceneId =
            this.getSceneIdFromElement(latestScene);

        if (
            latestScene &&
            latestSceneId &&
            latestSceneId !== String(sceneId)
        ) {
            this.scheduleWorkflowSceneSync({
                delay: 0,
                force: true,
                expectedSceneId: latestSceneId
            });
        }

        this.isTransitioning =
            false;

        this.emit(
            'scene-audio:transition-complete',
            {
                sceneId:
                    this.currentSceneId,
                index:
                    this.currentSceneIndex
            }
        );
    }


    async applySceneAudio(
        sceneId,
        sceneElement,
        navigation = {}
    ) {
        const configuration =
            this.sceneAudioMap.get(
                String(sceneId)
            ) || {};

        const dynamicConfiguration =
            {
                ...configuration,
                music:
                    sceneElement?.dataset
                        ?.audioMusic ||
                    configuration.music ||
                    '',

                musicLoop:
                    sceneElement?.dataset
                        ?.audioMusicLoop ??
                    configuration.musicLoop,

                voice:
                    sceneElement?.dataset
                        ?.audioVoice ||
                    configuration.voice ||
                    '',

                introSfx:
                    sceneElement?.dataset
                        ?.audioIntroSfx ||
                    configuration.introSfx ||
                    '',

                outroSfx:
                    sceneElement?.dataset
                        ?.audioOutroSfx ||
                    configuration.outroSfx ||
                    ''
            };

        const stopRequested =
            audioToBoolean(
                sceneElement?.dataset
                    ?.audioStopMusic,
                false
            );

        if (
            stopRequested
        ) {
            await this.stopMusic({
                fade: true
            });

            this.workflowMusicKey =
                null;
        }

        const workflow =
            stopRequested
                ? null
                : this.getWorkflowSceneAudio(
                    sceneId,
                    sceneElement
                );

        if (workflow) {
            await this.applyWorkflowSceneMusic(
                workflow,
                { forceRestart: navigation.movingBack === true }
            );
        } else if (
            dynamicConfiguration.music
        ) {
            const track =
                this.registerMusic(
                    `scene:${sceneId}`,
                    dynamicConfiguration.music,
                    {
                        loop:
                            audioToBoolean(
                                dynamicConfiguration
                                    .musicLoop,
                                true
                            ),
                        label:
                            `Scene ${sceneId} Music`,
                        sceneId
                    }
                );

            await this.playMusic(
                null,
                {
                    id:
                        track.id,
                    loop:
                        track.loop,
                    fade:
                        BIRTHDAY_AUDIO_CONFIG
                            .defaults
                            .crossfade
                }
            );

            this.workflowMusicKey =
                null;
        }

        if (
            String(sceneId) === '2'
        ) {
            this.workflowScene2PopHandled =
                false;
        } else {
            this.workflowScene2PopHandled =
                false;
        }

        if (
            dynamicConfiguration.introSfx
        ) {
            await this.playSFX(
                dynamicConfiguration.introSfx,
                {
                    id:
                        `scene-intro:${sceneId}`
                }
            );
        }

        const autoVoice =
            audioToBoolean(
                sceneElement?.dataset
                    ?.audioAutoVoice,
                false
            );

        if (
            autoVoice &&
            dynamicConfiguration.voice
        ) {
            await this.playVoice(
                dynamicConfiguration.voice
            );
        }
    }



    /* ========================================================================
     * VOLUME MANAGEMENT
     * ====================================================================== */

    getCategoryVolume(
        category
    ) {
        switch (
            String(category)
                .toLowerCase()
        ) {
            case 'sfx':
                return this.sfxVolume;

            case 'voice':
                return this.voiceVolume;

            case 'music':
            default:
                return this.musicVolume;
        }
    }


    getEffectiveVolume(
        category,
        trackVolume = 1
    ) {
        if (
            this.muted &&
            String(category).toLowerCase() === 'music'
        ) {
            return 0;
        }

        const base =
            this.getCategoryVolume(
                category
            );

        return audioClamp(
            this.masterVolume *
            base *
            audioClamp(
                Number(trackVolume),
                0,
                1
            ),
            0,
            1
        );
    }


    setMasterVolume(
        volume,
        options = {}
    ) {
        this.masterVolume =
            audioClamp(
                Number(volume),
                0,
                1
            );

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .masterVolume,
            this.masterVolume
        );

        this.applyAllVolumes();

        if (
            options.emit !== false
        ) {
            this.emit(
                'volume:master',
                this.masterVolume
            );
        }

        this.updateUIState();
    }


    setMusicVolume(
        volume
    ) {
        this.musicVolume =
            audioClamp(
                Number(volume),
                0,
                1
            );

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .musicVolume,
            this.musicVolume
        );

        this.applyAllMusicVolumes();

        this.emit(
            'volume:music',
            this.musicVolume
        );

        this.updateUIState();
    }


    setSFXVolume(
        volume
    ) {
        this.sfxVolume =
            audioClamp(
                Number(volume),
                0,
                1
            );

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .sfxVolume,
            this.sfxVolume
        );

        this.applyAllSFXVolumes();

        this.emit(
            'volume:sfx',
            this.sfxVolume
        );

        this.updateUIState();
    }


    setVoiceVolume(
        volume
    ) {
        this.voiceVolume =
            audioClamp(
                Number(volume),
                0,
                1
            );

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .voiceVolume,
            this.voiceVolume
        );

        this.applyAllVoiceVolumes();

        this.emit(
            'volume:voice',
            this.voiceVolume
        );

        this.updateUIState();
    }


    applyAllVolumes() {
        this.applyAllMusicVolumes();
        this.applyAllSFXVolumes();
        this.applyAllVoiceVolumes();
    }


    applyAllMusicVolumes() {
        this.tracks.forEach((track) => {
            if (track.category !== 'music' || !track.element) {
                return;
            }

            track.element.volume =
                this.getMusicOutputVolume(track);
        });
    }

    applyAllSFXVolumes() {
        this.sfxPool.forEach(
            (element) => {
                if (
                    !element
                ) {
                    return;
                }

                const sourceVolume =
                    Number(
                        element.dataset
                            .audioBaseVolume ||
                        1
                    );

                element.volume =
                    this.getEffectiveVolume(
                        'sfx',
                        sourceVolume
                    );
            }
        );
    }


    applyAllVoiceVolumes() {
        this.voicePool.forEach(
            (element) => {
                if (
                    !element
                ) {
                    return;
                }

                const sourceVolume =
                    Number(
                        element.dataset
                            .audioBaseVolume ||
                        1
                    );

                element.volume =
                    this.getEffectiveVolume(
                        'voice',
                        sourceVolume
                    );
            }
        );
    }


    /* ========================================================================
     * MUTE / UNMUTE
     * ====================================================================== */

    mute(
        options = {}
    ) {
        this.muted =
            true;

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .muted,
            true
        );

        this.applyAllMusicVolumes();

        if (
            options.pauseMusic
        ) {
            this.pauseMusic({
                reason:
                    'mute'
            });
        }

        this.emit(
            'audio:muted'
        );

        this.updateUIState();

        this.applyGlobalClasses();
    }


    unmute() {
        this.muted =
            false;

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .muted,
            false
        );

        this.applyAllMusicVolumes();

        this.emit(
            'audio:unmuted'
        );

        this.updateUIState();

        this.applyGlobalClasses();
    }


    toggleMute() {
        if (
            this.muted
        ) {
            this.unmute();

            return false;
        }

        this.mute();

        return true;
    }


    toggle() {
        return this.toggleMute();
    }


    toggleSound() {
        return this.toggleMute();
    }


    /* ========================================================================
     * AUDIO UNLOCK / BROWSER RESTRICTIONS
     * ====================================================================== */

    async unlock() {
        if (
            this.unlocked
        ) {
            return true;
        }

        /*
         * Browsers typically permit audio after a user gesture.
         * We do not force-play an actual music file here.
         */
        try {
            const silent =
                document.createElement(
                    'audio'
                );

            silent.muted = true;
            silent.volume = 0;

            silent.src =
                'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YQAAAAA=';

            const promise =
                silent.play();

            if (
                promise &&
                typeof promise.then ===
                    'function'
            ) {
                await promise;
            }

            silent.pause();

            silent.removeAttribute(
                'src'
            );

            silent.load();

            this.unlocked =
                true;

            this.applyGlobalClasses();

            this.emit(
                'audio:unlocked'
            );

            return true;
        } catch {
            /*
             * A failed silent unlock does not mean the app is broken.
             * The next genuine user gesture will try again.
             */
            return false;
        }
    }


    handlePointerDown() {
        const reconcile = () => {
            this.scheduleWorkflowSceneSync({
                delay: 0,
                force: true
            });
        };

        if (!this.unlocked) {
            this.unlock().finally(reconcile);
            return;
        }

        reconcile();
    }


    handleKeyDown(event) {
        if (
            !this.unlocked &&
            event?.isTrusted
        ) {
            this.unlock();
        }
    }


    /* ========================================================================
     * UI BINDINGS
     * ====================================================================== */

    bindDOMEvents() {
        document.addEventListener(
            'pointerdown',
            this.boundHandlers.pointerdown,
            {
                passive: true
            }
        );

        document.addEventListener(
            'keydown',
            this.boundHandlers.keydown
        );

        this.ui.muteButtons.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.toggleMute();
                    }
                );
            }
        );

        this.ui.soundButtons.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.toggleMute();
                    }
                );
            }
        );

        this.ui.musicButtons.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.toggleMusic();
                    }
                );
            }
        );

        this.ui.voiceButtons.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.handleVoiceButton(
                            button
                        );
                    }
                );
            }
        );

        this.ui.effectButtons.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.handleEffectButton(
                            button
                        );
                    }
                );
            }
        );

        this.ui.volumeControls.forEach(
            (control) => {
                control.addEventListener(
                    'input',
                    () => {
                        this.handleVolumeControl(
                            control
                        );
                    }
                );
            }
        );
    }


    handleVoiceButton(
        button
    ) {
        if (
            !(button instanceof Element)
        ) {
            return;
        }

        const source =
            button.dataset.audioVoice ||
            button.dataset.voiceSrc ||
            button.getAttribute(
                'data-src'
            );

        if (
            !source
        ) {
            return;
        }

        const pauseMusic =
            audioToBoolean(
                button.dataset.voicePauseMusic,
                false
            );

        const duckMusic =
            audioToBoolean(
                button.dataset.voiceDuckMusic,
                true
            );

        this.playVoice(
            source,
            {
                pauseMusic,
                duckMusic
            }
        );
    }


    handleEffectButton(
        button
    ) {
        if (
            !(button instanceof Element)
        ) {
            return;
        }

        const source =
            button.dataset.audioSfx ||
            button.dataset.sfxSrc ||
            button.getAttribute(
                'data-src'
            );

        if (
            !source
        ) {
            return;
        }

        const volume =
            Number(
                button.dataset.sfxVolume ||
                1
            );

        const rate =
            Number(
                button.dataset.sfxRate ||
                1
            );

        this.playSFX(
            source,
            {
                volume,
                rate,
                overlap:
                    audioToBoolean(
                        button.dataset
                            .sfxOverlap,
                        true
                    )
            }
        );
    }


    handleVolumeControl(
        control
    ) {
        if (
            !(control instanceof Element)
        ) {
            return;
        }

        const value =
            audioClamp(
                Number(
                    control.value
                ) || 0,
                0,
                1
            );

        const category =
            control.dataset
                .audioVolumeCategory ||
            'master';

        switch (
            category
                .toLowerCase()
        ) {
            case 'music':
                this.setMusicVolume(
                    value
                );
                break;

            case 'sfx':
                this.setSFXVolume(
                    value
                );
                break;

            case 'voice':
                this.setVoiceVolume(
                    value
                );
                break;

            case 'master':
            default:
                this.setMasterVolume(
                    value
                );
                break;
        }
    }


    /* ========================================================================
     * APP EVENT BINDINGS
     * ====================================================================== */

    attachApplicationEvents(app) {
        if (!app?.events) {
            return false;
        }

        if (this.boundApplication === app) {
            return true;
        }

        if (this.boundApplication?.events) {
            try {
                this.boundApplication.events.off?.(
                    'scene:before-change',
                    this.boundHandlers.sceneBeforeChange
                );
                this.boundApplication.events.off?.(
                    'scene:changed',
                    this.boundHandlers.sceneChanged
                );
            } catch {
                // Older event buses may not expose off().
            }
        }

        app.events.on(
            'scene:before-change',
            this.boundHandlers.sceneBeforeChange
        );

        app.events.on(
            'scene:changed',
            this.boundHandlers.sceneChanged
        );

        this.boundApplication = app;

        /* Immediately reconcile the DOM with the newly attached app. */
        this.scheduleWorkflowSceneSync({
            delay: 0,
            force: true
        });

        return true;
    }


    bindApplicationEvents() {
        const app =
            this.findApplication();

        if (app?.events) {
            this.attachApplicationEvents(app);
        }

        /*
         * Always keep the late-binding fallback active because app.js is
         * loaded after audio.js in index.html.
         */
        this.bindLateApplicationEvents();

        /*
         * Additional fallback for independently used scene managers.
         */
        if (!this._documentSceneChangedBound) {
            this._documentSceneChangedBound = true;

            document.addEventListener(
                'scene:changed',
                (event) => {
                    this.handleSceneChanged(
                        event.detail
                    );
                }
            );
        }
    }


    /* ========================================================================
     * VISIBILITY
     * ====================================================================== */

    handleVisibilityChange() {
        if (
            !BIRTHDAY_AUDIO_CONFIG
                .defaults
                .pauseWhenHidden
        ) {
            return;
        }

        if (
            document.hidden
        ) {
            this.visibilityPaused =
                Boolean(
                    this.activeMusic &&
                    this.activeMusic
                        .element &&
                    !this.activeMusic
                        .element
                        .paused
                );

            if (
                this.visibilityPaused
            ) {
                this.pauseMusic({
                    reason:
                        'page-hidden'
                });
            }

            this.emit(
                'audio:background'
            );

            return;
        }

        this.emit(
            'audio:foreground'
        );
    }


    /* ========================================================================
     * STATE / UI
     * ====================================================================== */

    createGlobalStateAttributes() {
        this.applyGlobalClasses();

        document.documentElement.dataset.audioReady =
            'true';

        document.documentElement.dataset.audioMuted =
            String(
                this.muted
            );

        document.documentElement.dataset.audioUnlocked =
            String(
                this.unlocked
            );
    }


    applyGlobalClasses() {
        const root =
            document.documentElement;

        const musicPlaying =
            Boolean(
                this.activeMusic &&
                this.activeMusic
                    .element &&
                !this.activeMusic
                    .element
                    .paused
            );

        root.classList.toggle(
            BIRTHDAY_AUDIO_CONFIG
                .classes
                .muted,
            this.muted
        );

        root.classList.toggle(
            BIRTHDAY_AUDIO_CONFIG
                .classes
                .enabled,
            !this.muted
        );

        root.classList.toggle(
            BIRTHDAY_AUDIO_CONFIG
                .classes
                .playing,
            musicPlaying
        );

        root.classList.toggle(
            BIRTHDAY_AUDIO_CONFIG
                .classes
                .paused,
            !musicPlaying
        );

        root.classList.toggle(
            BIRTHDAY_AUDIO_CONFIG
                .classes
                .unlocked,
            this.unlocked
        );

        root.dataset.audioPlaying =
            String(
                musicPlaying
            );

        root.dataset.audioMuted =
            String(
                this.muted
            );

        root.dataset.audioUnlocked =
            String(
                this.unlocked
            );
    }


    updateUIState() {
        const buttons =
            [
                ...this.ui.soundButtons,
                ...this.ui.muteButtons
            ];

        buttons.forEach(
            (button) => {
                if (
                    !(button instanceof Element)
                ) {
                    return;
                }

                const muted =
                    this.muted;

                button.classList.toggle(
                    'is-muted',
                    muted
                );

                button.classList.toggle(
                    'is-active',
                    !muted
                );

                button.setAttribute(
                    'aria-pressed',
                    String(
                        !muted
                    )
                );

                button.dataset.audioState =
                    muted
                        ? 'muted'
                        : 'enabled';

                const label =
                    muted
                        ? BIRTHDAY_WORKFLOW_AUDIO
                            .muteButton
                            .labelOff
                        : BIRTHDAY_WORKFLOW_AUDIO
                            .muteButton
                            .labelOn;

                if (
                    button.classList.contains(
                        'sbaudio-scene-mute'
                    )
                ) {
                    button.textContent =
                        muted
                            ? '🔇'
                            : '🔊';
                    button.title =
                        muted
                            ? 'Background music is muted'
                            : 'Background music';
                }

                if (
                    !button.hasAttribute(
                        'aria-label'
                    )
                ) {
                    button.setAttribute(
                        'aria-label',
                        label
                    );
                }
            }
        );

        this.ui.musicButtons.forEach(
            (button) => {
                const playing =
                    Boolean(
                        this.activeMusic &&
                        this.activeMusic.element &&
                        !this.activeMusic.element.paused
                    );

                button.classList.toggle(
                    'is-active',
                    playing
                );

                button.setAttribute(
                    'aria-pressed',
                    String(
                        playing
                    )
                );

                button.dataset.audioState =
                    playing
                        ? 'playing'
                        : 'paused';
            }
        );

        this.ui.volumeControls.forEach(
            (control) => {
                const category =
                    control.dataset
                        .audioVolumeCategory ||
                    'master';

                control.value =
                    String(
                        this.getCategoryVolume(
                            category
                        )
                    );
            }
        );

        this.createGlobalStateAttributes();
    }


    /* ========================================================================
     * GENERIC PLAYBACK
     * ====================================================================== */

    async play(
        source,
        options = {}
    ) {
        const category =
            options.category ||
            'music';

        switch (
            category
                .toLowerCase()
        ) {
            case 'sfx':
                return this.playSFX(
                    source,
                    options
                );

            case 'voice':
                return this.playVoice(
                    source,
                    options
                );

            case 'music':
            default:
                return this.playMusic(
                    source,
                    options
                );
        }
    }


    pause(
        options = {}
    ) {
        const category =
            options.category ||
            'music';

        switch (
            category
                .toLowerCase()
        ) {
            case 'voice':
                this.voicePool.forEach(
                    (voice) => {
                        try {
                            voice.pause();
                        } catch {
                            // Ignore.
                        }
                    }
                );
                break;

            case 'sfx':
                this.stopAllSFX();
                break;

            case 'music':
            default:
                this.pauseMusic(
                    options
                );
                break;
        }
    }


    stop(
        options = {}
    ) {
        const category =
            options.category ||
            'music';

        switch (
            category
                .toLowerCase()
        ) {
            case 'voice':
                this.stopVoice();
                break;

            case 'sfx':
                this.stopAllSFX();
                break;

            case 'music':
            default:
                this.stopMusic(
                    options
                );
                break;
        }
    }


    /* ========================================================================
     * ERROR HANDLING
     * ====================================================================== */

    handlePlaybackError(
        track,
        error
    ) {
        if (
            error?.name ===
            'NotAllowedError'
        ) {
            /*
             * This is common when browser autoplay restrictions
             * prevent playback before a gesture.
             */
            this.emit(
                'audio:gesture-required',
                {
                    track,
                    error
                }
            );

            return;
        }

        if (
            error?.name ===
            'AbortError'
        ) {
            return;
        }

        this.emit(
            'audio:playback-error',
            {
                track,
                error
            }
        );

        console.warn(
            '[SehrishBirthdayAudio] Playback error:',
            error
        );
    }


    /* ========================================================================
     * PRELOADING
     * ====================================================================== */

    async preloadTrack(
        id
    ) {
        const track =
            this.getTrack(
                id
            );

        if (
            !track
        ) {
            return false;
        }

        const result =
            await track.load();

        this.emit(
            'track:preloaded',
            {
                track,
                success:
                    result
            }
        );

        return result;
    }


    async preloadSource(
        source,
        category = 'music'
    ) {
        const track =
            this.registerTrack({
                src:
                    source,
                category,
                id:
                    `preload:${category}:${source}`
            });

        if (
            !track
        ) {
            return false;
        }

        return this.preloadTrack(
            track.id
        );
    }


    async preloadSceneAudio(
        sceneId
    ) {
        const configuration =
            this.sceneAudioMap.get(
                String(sceneId)
            );

        if (
            !configuration
        ) {
            return false;
        }

        const sources = [
            {
                value:
                    configuration.music,
                category:
                    'music'
            },
            {
                value:
                    configuration.voice,
                category:
                    'voice'
            },
            {
                value:
                    configuration.introSfx,
                category:
                    'sfx'
            },
            {
                value:
                    configuration.outroSfx,
                category:
                    'sfx'
            }
        ];

        const tasks =
            sources
                .filter(
                    (item) =>
                        Boolean(
                            item.value
                        )
                )
                .map(
                    (item) =>
                        this.preloadSource(
                            item.value,
                            item.category
                        )
                );

        if (
            tasks.length === 0
        ) {
            return true;
        }

        const results =
            await Promise.allSettled(
                tasks
            );

        return results.every(
            (result) =>
                result.status ===
                'fulfilled' &&
                result.value ===
                    true
        );
    }


    /* ========================================================================
     * EVENT HELPERS
     * ====================================================================== */

    emit(
        eventName,
        payload = undefined
    ) {
        this.events.emit(
            eventName,
            payload
        );

        /*
         * Also expose a DOM CustomEvent so standalone UI modules can
         * subscribe without importing this controller.
         */
        try {
            document.dispatchEvent(
                new CustomEvent(
                    eventName,
                    {
                        detail:
                            payload
                    }
                )
            );
        } catch {
            // Older/restricted environments may not support CustomEvent.
        }
    }


    /* ========================================================================
     * STATE SNAPSHOT
     * ====================================================================== */

    getState() {
        const musicPlaying =
            Boolean(
                this.activeMusic &&
                this.activeMusic.element &&
                !this.activeMusic
                    .element
                    .paused
            );

        return {
            initialized:
                this.initialized,

            unlocked:
                this.unlocked,

            muted:
                this.muted,

            musicPlaying,

            currentSceneId:
                this.currentSceneId,

            currentSceneIndex:
                this.currentSceneIndex,

            masterVolume:
                this.masterVolume,

            musicVolume:
                this.musicVolume,

            sfxVolume:
                this.sfxVolume,

            voiceVolume:
                this.voiceVolume,

            activeMusic:
                this.activeMusic
                    ? {
                        id:
                            this.activeMusic
                                .id,
                        src:
                            this.activeMusic
                                .src,
                        category:
                            this.activeMusic
                                .category,
                        playing:
                            this.activeMusic
                                .playing
                    }
                    : null,

            trackCount:
                this.tracks.size,

            support:
                {
                    ...this.support
                }
        };
    }


    getCurrentTrack() {
        return this.activeMusic;
    }


    /* ========================================================================
     * RESET
     * ====================================================================== */

    resetPreferences() {
        this.muted =
            false;

        this.masterVolume =
            BIRTHDAY_AUDIO_CONFIG
                .defaults
                .masterVolume;

        this.musicVolume =
            BIRTHDAY_AUDIO_CONFIG
                .defaults
                .musicVolume;

        this.sfxVolume =
            BIRTHDAY_AUDIO_CONFIG
                .defaults
                .sfxVolume;

        this.voiceVolume =
            BIRTHDAY_AUDIO_CONFIG
                .defaults
                .voiceVolume;

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .muted,
            this.muted
        );

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .masterVolume,
            this.masterVolume
        );

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .musicVolume,
            this.musicVolume
        );

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .sfxVolume,
            this.sfxVolume
        );

        this.writeStoredValue(
            BIRTHDAY_AUDIO_CONFIG
                .storage
                .voiceVolume,
            this.voiceVolume
        );

        this.applyAllVolumes();
        this.updateUIState();

        this.emit(
            'audio:preferences-reset'
        );
    }


    /* ========================================================================
     * DESTROY
     * ====================================================================== */

    destroy() {
        if (
            this.destroyed
        ) {
            return;
        }

        document.removeEventListener(
            'pointerdown',
            this.boundHandlers.pointerdown
        );

        document.removeEventListener(
            'keydown',
            this.boundHandlers.keydown
        );

        this.stopMusic({
            fade:
                false
        });

        this.stopAllSFX();

        this.stopVoice(
            null,
            false
        );

        this.tracks.forEach(
            (track) => {
                track.destroy();
            }
        );

        this.tracks.clear();

        this.sfxPool.forEach(
            (element) => {
                try {
                    element.pause();
                    element.remove();
                } catch {
                    // Ignore.
                }
            }
        );

        this.sfxPool.clear();

        this.voicePool.forEach(
            (element) => {
                try {
                    element.pause();
                    element.remove();
                } catch {
                    // Ignore.
                }
            }
        );

        this.voicePool.clear();

        this.workflowObservers.forEach(
            (observer) => {
                try {
                    observer.disconnect();
                } catch {
                    // Ignore.
                }
            }
        );

        this.workflowObservers = [];

        this.sceneAudioMap.clear();

        this.domAudioElements.clear();

        this.events.clear();

        this.initialized =
            false;

        this.destroyed =
            true;

        this.activeMusic =
            null;
    }
}


/* ============================================================================
 * GLOBAL AUDIO INSTANCE
 * ========================================================================== */

let birthdayAudioManager = null;


/**
 * Get/create the global birthday audio manager.
 *
 * @returns {BirthdayAudioManager}
 */
function getBirthdayAudioManager() {
    if (
        !birthdayAudioManager
    ) {
        birthdayAudioManager =
            new BirthdayAudioManager();
    }

    return birthdayAudioManager;
}


/* ============================================================================
 * GLOBAL API
 * ========================================================================== */

const globalAudioManager =
    getBirthdayAudioManager();


/*
 * The main app.js module resolver checks for:
 *
 *   Audio
 *   AudioManager
 *   audioManager
 *
 * Expose multiple compatible names.
 */
window.AudioManager =
    globalAudioManager;

window.audioManager =
    globalAudioManager;


/*
 * A lightweight public namespace is also provided.
 */
window.SehrishAudio = Object.freeze({
    init(
        app = null
    ) {
        return getBirthdayAudioManager()
            .init(app);
    },

    play(
        source,
        options = {}
    ) {
        return getBirthdayAudioManager()
            .play(
                source,
                options
            );
    },

    playMusic(
        source,
        options = {}
    ) {
        return getBirthdayAudioManager()
            .playMusic(
                source,
                options
            );
    },

    playSFX(
        source,
        options = {}
    ) {
        return getBirthdayAudioManager()
            .playSFX(
                source,
                options
            );
    },

    playVoice(
        source,
        options = {}
    ) {
        return getBirthdayAudioManager()
            .playVoice(
                source,
                options
            );
    },

    pause(
        options = {}
    ) {
        return getBirthdayAudioManager()
            .pause(
                options
            );
    },

    stop(
        options = {}
    ) {
        return getBirthdayAudioManager()
            .stop(
                options
            );
    },

    mute() {
        return getBirthdayAudioManager()
            .mute();
    },

    unmute() {
        return getBirthdayAudioManager()
            .unmute();
    },

    toggleMute() {
        return getBirthdayAudioManager()
            .toggleMute();
    },

    toggle() {
        return getBirthdayAudioManager()
            .toggle();
    },

    setMasterVolume(
        value
    ) {
        return getBirthdayAudioManager()
            .setMasterVolume(
                value
            );
    },

    setMusicVolume(
        value
    ) {
        return getBirthdayAudioManager()
            .setMusicVolume(
                value
            );
    },

    setSFXVolume(
        value
    ) {
        return getBirthdayAudioManager()
            .setSFXVolume(
                value
            );
    },

    setVoiceVolume(
        value
    ) {
        return getBirthdayAudioManager()
            .setVoiceVolume(
                value
            );
    },

    state() {
        return getBirthdayAudioManager()
            .getState();
    },

    getManager() {
        return getBirthdayAudioManager();
    }
});


/* ============================================================================
 * AUTOMATIC INITIALIZATION
 * ========================================================================== */

function initializeBirthdayAudio() {
    const manager =
        getBirthdayAudioManager();

    /*
     * The file can be loaded before OR after app.js.
     * Initializing it here is safe because module initialization
     * in app.js is idempotent.
     */
    try {
        manager.init();
    } catch (error) {
        console.error(
            '[SehrishBirthdayAudio] Initialization failed:',
            error
        );
    }
}


if (
    document.readyState ===
    'loading'
) {
    document.addEventListener(
        'DOMContentLoaded',
        initializeBirthdayAudio,
        {
            once: true
        }
    );
} else {
    initializeBirthdayAudio();
}


/* ============================================================================
 * OPTIONAL DEBUG INTERFACE
 * ========================================================================== */

window.SBAudioDebug =
    Object.freeze({
        state:
            () =>
                getBirthdayAudioManager()
                    .getState(),

        tracks:
            () =>
                [
                    ...getBirthdayAudioManager()
                        .tracks
                        .entries()
                ],

        current:
            () =>
                getBirthdayAudioManager()
                    .getCurrentTrack(),

        play:
            (
                source,
                options
            ) =>
                getBirthdayAudioManager()
                    .play(
                        source,
                        options
                    ),

        playSFX:
            (
                source,
                options
            ) =>
                getBirthdayAudioManager()
                    .playSFX(
                        source,
                        options
                    ),

        playVoice:
            (
                source,
                options
            ) =>
                getBirthdayAudioManager()
                    .playVoice(
                        source,
                        options
                    ),

        stop:
            (
                options
            ) =>
                getBirthdayAudioManager()
                    .stop(
                        options
                    ),

        mute:
            () =>
                getBirthdayAudioManager()
                    .mute(),

        unmute:
            () =>
                getBirthdayAudioManager()
                    .unmute()
    });


/* ============================================================================
 * END OF FILE
 * ============================================================================
 */