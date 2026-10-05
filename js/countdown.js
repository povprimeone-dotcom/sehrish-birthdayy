/**
 * ============================================================================
 * SEHRISH BIRTHDAY EXPERIENCE
 * ============================================================================
 * File       : js/countdown.js
 * Project    : sehrish-birthday
 * Version    : 1.0.0
 *
 * Purpose:
 * - Countdown experience engine
 * - Target date/time support
 * - Days / hours / minutes / seconds calculation
 * - Live countdown rendering
 * - Multiple countdown instances
 * - Automatic target-date discovery from HTML
 * - Start / pause / resume / reset
 * - Completion state
 * - Celebration hooks
 * - Local timezone support
 * - ISO date support
 * - Explicit date/time configuration
 * - Mobile-safe updates
 * - Reduced-motion awareness
 * - Accessibility live announcements
 * - app.js integration
 * - audio.js integration hooks
 * - Scene lifecycle support
 * - Safe handling of invalid/missing dates
 *
 * IMPORTANT:
 * The exact countdown target can be configured later from HTML/data
 * attributes. No arbitrary birthday date is hard-coded in this module.
 * ============================================================================
 */

'use strict';


/* ============================================================================
 * CONFIGURATION
 * ========================================================================== */

const COUNTDOWN_CONFIG = Object.freeze({
    name: 'Sehrish Birthday Countdown',
    version: '1.0.0',

    selectors: Object.freeze({
        root: [
            '[data-countdown]',
            '#birthday-countdown',
            '.birthday-countdown'
        ],

        days: [
            '[data-countdown-days]',
            '.countdown-days'
        ],

        hours: [
            '[data-countdown-hours]',
            '.countdown-hours'
        ],

        minutes: [
            '[data-countdown-minutes]',
            '.countdown-minutes'
        ],

        seconds: [
            '[data-countdown-seconds]',
            '.countdown-seconds'
        ],

        total: [
            '[data-countdown-total]'
        ],

        progress: [
            '[data-countdown-progress]'
        ],

        status: [
            '[data-countdown-status]',
            '.countdown-status'
        ],

        title: [
            '[data-countdown-title]',
            '.countdown-title'
        ],

        complete: [
            '[data-countdown-complete]',
            '.countdown-complete'
        ],

        start: [
            '[data-countdown-action="start"]',
            '[data-action="countdown-start"]',
            '.countdown-start'
        ],

        pause: [
            '[data-countdown-action="pause"]',
            '[data-action="countdown-pause"]',
            '.countdown-pause'
        ],

        reset: [
            '[data-countdown-action="reset"]',
            '[data-action="countdown-reset"]',
            '.countdown-reset'
        ]
    }),

    defaults: Object.freeze({
        tickInterval: 250,

        autoStart: true,

        padNumbers: true,

        showZeroDays: true,

        announceCompletion: true,

        updateDocumentTitle: false,

        persistCompletion: false,

        useLocalTimezone: true
    }),

    classes: Object.freeze({
        initialized: 'countdown-initialized',
        running: 'countdown-running',
        paused: 'countdown-paused',
        complete: 'countdown-complete',
        invalid: 'countdown-invalid',
        active: 'countdown-active'
    }),

    storage: Object.freeze({
        prefix: 'sehrish-birthday:',
        completed: 'countdown-completed'
    }),

    events: Object.freeze({
        initialized: 'countdown:initialized',
        started: 'countdown:started',
        paused: 'countdown:paused',
        resumed: 'countdown:resumed',
        tick: 'countdown:tick',
        complete: 'countdown:complete',
        reset: 'countdown:reset',
        invalid: 'countdown:invalid',
        destroyed: 'countdown:destroyed'
    }),

    audio: Object.freeze({
        enabled: true,

        /*
         * Intentionally blank.
         * Audio will be selected later after the scene is reviewed.
         */
        complete: ''
    })
});


/* ============================================================================
 * UTILITY FUNCTIONS
 * ========================================================================== */

/**
 * Normalize selectors.
 *
 * @param {string|string[]} selectors
 * @returns {string[]}
 */
function countdownNormalizeSelectors(
    selectors
) {
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
 * Query first element.
 *
 * @param {string|string[]} selectors
 * @param {ParentNode} root
 * @returns {Element|null}
 */
function countdownQueryFirst(
    selectors,
    root = document
) {
    const list =
        countdownNormalizeSelectors(
            selectors
        );

    for (const selector of list) {
        try {
            const element =
                root.querySelector(
                    selector
                );

            if (element) {
                return element;
            }
        } catch (error) {
            console.warn(
                '[Countdown] Invalid selector:',
                selector,
                error
            );
        }
    }

    return null;
}


/**
 * Query all unique elements.
 *
 * @param {string|string[]} selectors
 * @param {ParentNode} root
 * @returns {Element[]}
 */
function countdownQueryAll(
    selectors,
    root = document
) {
    const list =
        countdownNormalizeSelectors(
            selectors
        );

    const result = [];
    const seen = new Set();

    list.forEach((selector) => {
        try {
            root.querySelectorAll(
                selector
            ).forEach(
                (element) => {
                    if (!seen.has(element)) {
                        seen.add(element);
                        result.push(element);
                    }
                }
            );
        } catch (error) {
            console.warn(
                '[Countdown] Invalid selector:',
                selector,
                error
            );
        }
    });

    return result;
}


/**
 * Clamp number.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function countdownClamp(
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
 * Convert to boolean.
 *
 * @param {*} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function countdownToBoolean(
    value,
    fallback = false
) {
    if (
        typeof value === 'boolean'
    ) {
        return value;
    }

    if (
        typeof value === 'string'
    ) {
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
 * Convert value to padded string.
 *
 * @param {number} value
 * @param {boolean} pad
 * @param {number} length
 * @returns {string}
 */
function countdownFormatNumber(
    value,
    pad = true,
    length = 2
) {
    const number =
        Math.max(
            0,
            Math.floor(
                Number(value) || 0
            )
        );

    const stringValue =
        String(number);

    if (!pad) {
        return stringValue;
    }

    return stringValue.padStart(
        length,
        '0'
    );
}


/**
 * Dispatch custom DOM event.
 *
 * @param {string} name
 * @param {*} detail
 */
function countdownDispatchEvent(
    name,
    detail = {}
) {
    try {
        document.dispatchEvent(
            new CustomEvent(
                name,
                {
                    detail
                }
            )
        );
    } catch {
        // Graceful fallback.
    }
}


/* ============================================================================
 * EVENT BUS
 * ========================================================================== */

class CountdownEventBus {
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
            typeof handler !== 'function'
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

    emit(
        eventName,
        payload = undefined
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
                        '[Countdown] Event handler failed:',
                        eventName,
                        error
                    );
                }
            }
        );
    }

    clear() {
        this.events.clear();
    }
}


/* ============================================================================
 * STORAGE
 * ========================================================================== */

class CountdownStorage {
    constructor() {
        this.storage =
            null;

        this.memory =
            new Map();

        try {
            this.storage =
                window.localStorage ||
                null;
        } catch {
            this.storage =
                null;
        }
    }

    getKey(
        key
    ) {
        return (
            COUNTDOWN_CONFIG
                .storage
                .prefix +
            key
        );
    }

    set(
        key,
        value
    ) {
        const finalKey =
            this.getKey(key);

        this.memory.set(
            finalKey,
            value
        );

        if (!this.storage) {
            return;
        }

        try {
            this.storage.setItem(
                finalKey,
                JSON.stringify(value)
            );
        } catch {
            // Ignore.
        }
    }

    get(
        key,
        fallback = null
    ) {
        const finalKey =
            this.getKey(key);

        if (this.storage) {
            try {
                const raw =
                    this.storage.getItem(
                        finalKey
                    );

                if (
                    raw !== null
                ) {
                    try {
                        return JSON.parse(
                            raw
                        );
                    } catch {
                        return raw;
                    }
                }
            } catch {
                // Fall through.
            }
        }

        if (
            this.memory.has(
                finalKey
            )
        ) {
            return this.memory.get(
                finalKey
            );
        }

        return fallback;
    }
}


/* ============================================================================
 * COUNTDOWN TIME MODEL
 * ========================================================================== */

class CountdownTime {
    constructor(
        milliseconds = 0
    ) {
        this.totalMilliseconds =
            Math.max(
                0,
                Number(
                    milliseconds
                ) || 0
            );

        this.calculate();
    }

    calculate() {
        const totalSeconds =
            Math.floor(
                this.totalMilliseconds /
                1000
            );

        this.totalSeconds =
            totalSeconds;

        this.days =
            Math.floor(
                totalSeconds /
                86400
            );

        this.hours =
            Math.floor(
                (
                    totalSeconds %
                    86400
                ) /
                3600
            );

        this.minutes =
            Math.floor(
                (
                    totalSeconds %
                    3600
                ) /
                60
            );

        this.seconds =
            totalSeconds %
            60;

        this.milliseconds =
            this.totalMilliseconds %
            1000;
    }

    isZero() {
        return (
            this.totalMilliseconds <=
            0
        );
    }

    toObject() {
        return {
            totalMilliseconds:
                this.totalMilliseconds,

            totalSeconds:
                this.totalSeconds,

            days:
                this.days,

            hours:
                this.hours,

            minutes:
                this.minutes,

            seconds:
                this.seconds,

            milliseconds:
                this.milliseconds
        };
    }

    toFormattedObject(
        padNumbers = true
    ) {
        return {
            days:
                countdownFormatNumber(
                    this.days,
                    padNumbers,
                    2
                ),

            hours:
                countdownFormatNumber(
                    this.hours,
                    padNumbers,
                    2
                ),

            minutes:
                countdownFormatNumber(
                    this.minutes,
                    padNumbers,
                    2
                ),

            seconds:
                countdownFormatNumber(
                    this.seconds,
                    padNumbers,
                    2
                )
        };
    }
}


/* ============================================================================
 * COUNTDOWN MANAGER
 * ========================================================================== */

class BirthdayCountdownManager {
    constructor() {
        this.name =
            COUNTDOWN_CONFIG.name;

        this.version =
            COUNTDOWN_CONFIG.version;

        this.config =
            {
                ...COUNTDOWN_CONFIG
                    .defaults
            };

        this.root =
            null;

        this.elements =
            {
                days: [],
                hours: [],
                minutes: [],
                seconds: [],
                total: [],
                progress: [],
                status: [],
                title: [],
                complete: [],
                start: [],
                pause: [],
                reset: []
            };

        this.events =
            new CountdownEventBus();

        this.storage =
            new CountdownStorage();

        this.app =
            null;

        this.audio =
            null;

        this.targetDate =
            null;

        this.originalTargetDate =
            null;

        this.startTime =
            null;

        this.running =
            false;

        this.paused =
            false;

        this.completed =
            false;

        this.invalid =
            false;

        this.initialized =
            false;

        this.destroyed =
            false;

        this.lastTickSecond =
            -1;

        this.intervalId =
            null;

        this.pauseRemaining =
            null;

        this.completedAt =
            null;

        this.handleVisibility =
            this.handleVisibility.bind(
                this
            );

        this.handleKeyDown =
            this.handleKeyDown.bind(
                this
            );

        this.handleSceneChanged =
            this.handleSceneChanged.bind(
                this
            );
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
            this.resolveApplication();

        this.audio =
            this.resolveAudio();

        this.findDOM();

        if (
            !this.root
        ) {
            this.initialized =
                true;

            this.emit(
                COUNTDOWN_CONFIG
                    .events
                    .initialized,
                {
                    available:
                        false
                }
            );

            return this;
        }

        this.loadConfiguration();

        this.resolveTargetDate();

        this.discoverUI();

        this.bindEvents();

        this.setupAccessibility();

        this.applyRootState();

        this.update();

        this.initialized =
            true;

        this.root.classList.add(
            COUNTDOWN_CONFIG
                .classes
                .initialized
        );

        if (
            this.config.autoStart &&
            this.targetDate &&
            !this.invalid
        ) {
            this.start();
        }

        this.emit(
            COUNTDOWN_CONFIG
                .events
                .initialized,
            {
                available:
                    true,

                state:
                    this.getState()
            }
        );

        return this;
    }


    resolveApplication() {
        try {
            if (
                window.SehrishBirthday &&
                typeof
                    window.SehrishBirthday
                        .getApp ===
                    'function'
            ) {
                return window.SehrishBirthday
                    .getApp();
            }
        } catch {
            // Ignore.
        }

        return null;
    }


    resolveAudio() {
        try {
            if (
                window.SehrishAudio &&
                typeof
                    window.SehrishAudio
                        .getManager ===
                    'function'
            ) {
                return window.SehrishAudio
                    .getManager();
            }

            if (
                window.AudioManager
            ) {
                return window.AudioManager;
            }

            if (
                window.audioManager
            ) {
                return window.audioManager;
            }
        } catch {
            // Ignore.
        }

        return null;
    }


    findDOM() {
        this.root =
            countdownQueryFirst(
                COUNTDOWN_CONFIG
                    .selectors
                    .root
            );
    }


    loadConfiguration() {
        if (
            !this.root
        ) {
            return;
        }

        const dataset =
            this.root.dataset;

        this.config.tickInterval =
            Math.max(
                100,
                Number(
                    dataset.countdownInterval ||
                    this.config.tickInterval
                )
            );

        this.config.autoStart =
            countdownToBoolean(
                dataset.countdownAutoStart,
                this.config.autoStart
            );

        this.config.padNumbers =
            countdownToBoolean(
                dataset.countdownPad,
                this.config.padNumbers
            );

        this.config.announceCompletion =
            countdownToBoolean(
                dataset.countdownAnnounce,
                this.config.announceCompletion
            );

        this.config.updateDocumentTitle =
            countdownToBoolean(
                dataset.countdownDocumentTitle,
                this.config.updateDocumentTitle
            );

        this.config.persistCompletion =
            countdownToBoolean(
                dataset.countdownPersistCompletion,
                this.config.persistCompletion
            );
    }


    resolveTargetDate() {
        const dataset =
            this.root.dataset;

        const candidates = [
            dataset.countdownTarget,
            dataset.targetDate,
            dataset.countdownDate,
            this.root.getAttribute(
                'data-countdown-target'
            ),
            this.root.getAttribute(
                'data-target-date'
            )
        ].filter(
            Boolean
        );

        if (
            candidates.length === 0
        ) {
            this.invalidate(
                'No countdown target date was configured.'
            );

            return null;
        }

        const rawTarget =
            String(
                candidates[0]
            ).trim();

        const target =
            this.parseTargetDate(
                rawTarget
            );

        if (
            !target
        ) {
            this.invalidate(
                'The configured countdown date is invalid.'
            );

            return null;
        }

        this.originalTargetDate =
            new Date(
                target.getTime()
            );

        this.targetDate =
            new Date(
                target.getTime()
            );

        this.invalid =
            false;

        this.root.classList.remove(
            COUNTDOWN_CONFIG
                .classes
                .invalid
        );

        return this.targetDate;
    }


    parseTargetDate(
        value
    ) {
        if (
            value instanceof Date
        ) {
            const date =
                new Date(
                    value.getTime()
                );

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        }

        if (
            typeof value ===
            'number'
        ) {
            const date =
                new Date(
                    value
                );

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        }

        const input =
            String(
                value || ''
            ).trim();

        if (
            !input
        ) {
            return null;
        }

        /*
         * Pure numeric values can represent a Unix timestamp.
         */
        if (
            /^\d{10,13}$/.test(
                input
            )
        ) {
            const number =
                Number(
                    input
                );

            const milliseconds =
                input.length === 10
                    ? number * 1000
                    : number;

            const date =
                new Date(
                    milliseconds
                );

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        }

        /*
         * YYYY-MM-DD is interpreted in the user's local timezone,
         * avoiding UTC midnight surprises.
         */
        const dateOnly =
            /^(\d{4})-(\d{2})-(\d{2})$/
                .exec(
                    input
                );

        if (
            dateOnly
        ) {
            const year =
                Number(
                    dateOnly[1]
                );

            const month =
                Number(
                    dateOnly[2]
                );

            const day =
                Number(
                    dateOnly[3]
                );

            const date =
                new Date(
                    year,
                    month - 1,
                    day,
                    0,
                    0,
                    0,
                    0
                );

            return this.isValidDate(
                date
            )
                ? date
                : null;
        }

        /*
         * Explicit local date-time without timezone.
         */
        const localDateTime =
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
                .exec(
                    input
                );

        if (
            localDateTime
        ) {
            const year =
                Number(
                    localDateTime[1]
                );

            const month =
                Number(
                    localDateTime[2]
                );

            const day =
                Number(
                    localDateTime[3]
                );

            const hours =
                Number(
                    localDateTime[4]
                );

            const minutes =
                Number(
                    localDateTime[5]
                );

            const seconds =
                Number(
                    localDateTime[6] ||
                    0
                );

            const date =
                new Date(
                    year,
                    month - 1,
                    day,
                    hours,
                    minutes,
                    seconds,
                    0
                );

            return this.isValidDate(
                date
            )
                ? date
                : null;
        }

        const parsed =
            new Date(
                input
            );

        return this.isValidDate(
            parsed
        )
            ? parsed
            : null;
    }


    isValidDate(
        date
    ) {
        return (
            date instanceof Date &&
            !Number.isNaN(
                date.getTime()
            )
        );
    }


    invalidate(
        message
    ) {
        this.invalid =
            true;

        this.running =
            false;

        this.paused =
            false;

        this.stopTimer();

        if (
            this.root
        ) {
            this.root.classList.add(
                COUNTDOWN_CONFIG
                    .classes
                    .invalid
            );

            this.root.dataset.countdownState =
                'invalid';
        }

        this.showStatus(
            message
        );

        this.emit(
            COUNTDOWN_CONFIG
                .events
                .invalid,
            {
                message,
                state:
                    this.getState()
            }
        );

        return false;
    }


    /* ========================================================================
     * UI DISCOVERY
     * ====================================================================== */

    discoverUI() {
        if (
            !this.root
        ) {
            return;
        }

        this.elements.days =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .days,
                this.root
            );

        this.elements.hours =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .hours,
                this.root
            );

        this.elements.minutes =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .minutes,
                this.root
            );

        this.elements.seconds =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .seconds,
                this.root
            );

        this.elements.total =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .total,
                this.root
            );

        this.elements.progress =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .progress,
                this.root
            );

        this.elements.status =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .status,
                this.root
            );

        this.elements.title =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .title,
                this.root
            );

        this.elements.complete =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .complete,
                this.root
            );

        this.elements.start =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .start,
                this.root
            );

        this.elements.pause =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .pause,
                this.root
            );

        this.elements.reset =
            countdownQueryAll(
                COUNTDOWN_CONFIG
                    .selectors
                    .reset,
                this.root
            );
    }


    /* ========================================================================
     * EVENTS
     * ====================================================================== */

    bindEvents() {
        this.elements.start.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.start();
                    }
                );
            }
        );

        this.elements.pause.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.togglePause();
                    }
                );
            }
        );

        this.elements.reset.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.reset();
                    }
                );
            }
        );

        document.addEventListener(
            'visibilitychange',
            this.handleVisibility
        );

        document.addEventListener(
            'keydown',
            this.handleKeyDown
        );

        if (
            this.app?.events
        ) {
            this.app.events.on(
                'scene:changed',
                this.handleSceneChanged
            );
        }
    }


    handleKeyDown(
        event
    ) {
        if (
            !this.root ||
            !this.root.contains(
                document.activeElement
            )
        ) {
            return;
        }

        const key =
            String(
                event.key || ''
            ).toLowerCase();

        if (
            key === ' '
        ) {
            event.preventDefault();
            this.togglePause();

            return;
        }

        if (
            key === 'escape'
        ) {
            if (
                this.running
            ) {
                this.pause({
                    reason:
                        'keyboard'
                });
            }
        }

        if (
            key === 'r' &&
            event.shiftKey
        ) {
            event.preventDefault();

            this.reset();
        }
    }


    handleVisibility() {
        if (
            document.hidden &&
            this.running
        ) {
            this.pause({
                reason:
                    'page-hidden'
            });
        }
    }


    handleSceneChanged(
        payload
    ) {
        const scene =
            payload?.scene ||
            null;

        if (
            !scene ||
            !this.root
        ) {
            return;
        }

        const sceneElement =
            scene.element ||
            scene;

        const parentScene =
            this.root.closest(
                '[data-scene]'
            );

        if (
            parentScene ===
            sceneElement
        ) {
            this.refreshDOM();
        }
    }


    refreshDOM() {
        this.findDOM();

        this.discoverUI();

        this.update();
    }


    /* ========================================================================
     * COUNTDOWN CONTROL
     * ====================================================================== */

    start() {
        if (
            !this.initialized &&
            this.root
        ) {
            this.init(
                this.app
            );
        }

        if (
            this.invalid ||
            !this.targetDate
        ) {
            return false;
        }

        if (
            this.completed
        ) {
            return false;
        }

        if (
            this.running
        ) {
            return true;
        }

        this.running =
            true;

        this.paused =
            false;

        this.startTime =
            new Date();

        this.applyRootState();

        this.update();

        this.startTimer();

        this.emit(
            COUNTDOWN_CONFIG
                .events
                .started,
            {
                state:
                    this.getState()
            }
        );

        return true;
    }


    pause(
        options = {}
    ) {
        if (
            !this.running ||
            this.completed
        ) {
            return false;
        }

        this.update();

        this.running =
            false;

        this.paused =
            true;

        this.stopTimer();

        this.pauseRemaining =
            this.getRemainingMilliseconds();

        this.applyRootState();

        this.updateControls();

        this.emit(
            COUNTDOWN_CONFIG
                .events
                .paused,
            {
                reason:
                    options.reason ||
                    'manual',

                remaining:
                    this.pauseRemaining,

                state:
                    this.getState()
            }
        );

        return true;
    }


    resume() {
        if (
            !this.paused ||
            this.completed ||
            this.invalid
        ) {
            return false;
        }

        this.paused =
            false;

        this.running =
            true;

        /*
         * A paused countdown holds the remaining duration relative
         * to the moment of resume rather than jumping forward while
         * the countdown was paused.
         */
        if (
            this.pauseRemaining !==
            null
        ) {
            this.targetDate =
                new Date(
                    Date.now() +
                    this.pauseRemaining
                );
        }

        this.pauseRemaining =
            null;

        this.applyRootState();

        this.update();

        this.startTimer();

        this.emit(
            COUNTDOWN_CONFIG
                .events
                .resumed,
            {
                state:
                    this.getState()
            }
        );

        return true;
    }


    togglePause() {
        if (
            this.paused
        ) {
            return this.resume();
        }

        return this.pause();
    }


    reset() {
        this.stopTimer();

        this.running =
            false;

        this.paused =
            false;

        this.completed =
            false;

        this.pauseRemaining =
            null;

        this.completedAt =
            null;

        if (
            this.originalTargetDate
        ) {
            this.targetDate =
                new Date(
                    this.originalTargetDate
                        .getTime()
                );
        } else {
            this.resolveTargetDate();
        }

        this.lastTickSecond =
            -1;

        this.hideCompletion();

        this.applyRootState();

        this.update();

        this.emit(
            COUNTDOWN_CONFIG
                .events
                .reset,
            {
                state:
                    this.getState()
            }
        );

        return true;
    }


    /* ========================================================================
     * TIMER
     * ====================================================================== */

    startTimer() {
        this.stopTimer();

        const tick =
            () => {
                if (
                    !this.running
                ) {
                    return;
                }

                this.update();
            };

        /*
         * setInterval is intentionally paired with an immediate update.
         * The real remaining value is always calculated from Date.now(),
         * so timer drift does not accumulate.
         */
        this.intervalId =
            window.setInterval(
                tick,
                Math.max(
                    100,
                    this.config.tickInterval
                )
            );
    }


    stopTimer() {
        if (
            this.intervalId !==
            null
        ) {
            window.clearInterval(
                this.intervalId
            );

            this.intervalId =
                null;
        }
    }


    /* ========================================================================
     * CALCULATION
     * ====================================================================== */

    getRemainingMilliseconds() {
        if (
            this.completed
        ) {
            return 0;
        }

        if (
            !this.targetDate
        ) {
            return 0;
        }

        if (
            this.paused &&
            this.pauseRemaining !==
                null
        ) {
            return Math.max(
                0,
                this.pauseRemaining
            );
        }

        return Math.max(
            0,
            this.targetDate.getTime() -
            Date.now()
        );
    }


    calculateRemaining() {
        const milliseconds =
            this.getRemainingMilliseconds();

        return new CountdownTime(
            milliseconds
        );
    }


    update() {
        if (
            !this.root ||
            this.invalid ||
            !this.targetDate
        ) {
            return;
        }

        const remaining =
            this.calculateRemaining();

        const timeData =
            remaining.toFormattedObject(
                this.config.padNumbers
            );

        this.renderTime(
            remaining,
            timeData
        );

        this.updateProgress(
            remaining
        );

        this.updateStatus(
            remaining
        );

        this.updateDocumentTitle(
            remaining
        );

        this.updateControls();

        const currentSecond =
            remaining.totalSeconds;

        if (
            currentSecond !==
            this.lastTickSecond
        ) {
            this.lastTickSecond =
                currentSecond;

            this.emit(
                COUNTDOWN_CONFIG
                    .events
                    .tick,
                {
                    time:
                        remaining.toObject(),

                    formatted:
                        timeData,

                    state:
                        this.getState()
                }
            );
        }

        if (
            remaining.isZero() &&
            !this.completed
        ) {
            this.complete();
        }
    }


    renderTime(
        time,
        formatted
    ) {
        this.elements.days.forEach(
            (element) => {
                element.textContent =
                    formatted.days;

                element.dataset.value =
                    String(
                        time.days
                    );
            }
        );

        this.elements.hours.forEach(
            (element) => {
                element.textContent =
                    formatted.hours;

                element.dataset.value =
                    String(
                        time.hours
                    );
            }
        );

        this.elements.minutes.forEach(
            (element) => {
                element.textContent =
                    formatted.minutes;

                element.dataset.value =
                    String(
                        time.minutes
                    );
            }
        );

        this.elements.seconds.forEach(
            (element) => {
                element.textContent =
                    formatted.seconds;

                element.dataset.value =
                    String(
                        time.seconds
                    );
            }
        );

        this.elements.total.forEach(
            (element) => {
                element.textContent =
                    String(
                        time.totalSeconds
                    );
            }
        );
    }


    updateProgress(
        remaining
    ) {
        if (
            !this.originalTargetDate
        ) {
            return;
        }

        const totalDuration =
            Math.max(
                1,
                this.originalTargetDate
                    .getTime() -
                (
                    this.startTime?.getTime() ||
                    Date.now()
                )
            );

        const passed =
            Math.max(
                0,
                totalDuration -
                remaining.totalMilliseconds
            );

        const percentage =
            countdownClamp(
                (
                    passed /
                    totalDuration
                ) * 100,
                0,
                100
            );

        this.elements.progress.forEach(
            (element) => {
                element.style.setProperty(
                    '--countdown-progress',
                    `${percentage}%`
                );

                element.setAttribute(
                    'aria-valuemin',
                    '0'
                );

                element.setAttribute(
                    'aria-valuemax',
                    '100'
                );

                element.setAttribute(
                    'aria-valuenow',
                    String(
                        Math.round(
                            percentage
                        )
                    )
                );

                if (
                    'value' in
                    element
                ) {
                    try {
                        element.value =
                            percentage;
                    } catch {
                        // Ignore.
                    }
                }
            }
        );
    }


    updateStatus(
        remaining
    ) {
        if (
            this.completed
        ) {
            this.showStatus(
                'The special moment has arrived! ✨'
            );

            return;
        }

        if (
            this.paused
        ) {
            this.showStatus(
                'Countdown paused.'
            );

            return;
        }

        const message =
            this.createTimeMessage(
                remaining
            );

        this.showStatus(
            message,
            false
        );
    }


    createTimeMessage(
        time
    ) {
        const parts = [];

        if (
            this.config.showZeroDays ||
            time.days > 0
        ) {
            parts.push(
                `${time.days} day${
                    time.days === 1
                        ? ''
                        : 's'
                }`
            );
        }

        parts.push(
            `${time.hours} hour${
                time.hours === 1
                    ? ''
                    : 's'
            }`
        );

        parts.push(
            `${time.minutes} minute${
                time.minutes === 1
                    ? ''
                    : 's'
            }`
        );

        parts.push(
            `${time.seconds} second${
                time.seconds === 1
                    ? ''
                    : 's'
            }`
        );

        return (
            `${parts.join(', ')} remaining.`
        );
    }


    /* ========================================================================
     * COMPLETION
     * ====================================================================== */

    complete() {
        if (
            this.completed
        ) {
            return;
        }

        this.completed =
            true;

        this.running =
            false;

        this.paused =
            false;

        this.completedAt =
            new Date();

        this.stopTimer();

        this.root.classList.add(
            COUNTDOWN_CONFIG
                .classes
                .complete
        );

        this.applyRootState();

        if (
            this.config.persistCompletion
        ) {
            this.storage.set(
                COUNTDOWN_CONFIG
                    .storage
                    .completed,
                true
            );
        }

        this.playCompletionAudio();

        this.showCompletion();

        if (
            this.config.announceCompletion
        ) {
            this.announce(
                'The countdown is complete.'
            );
        }

        this.emit(
            COUNTDOWN_CONFIG
                .events
                .complete,
            {
                completedAt:
                    this.completedAt,

                state:
                    this.getState()
            }
        );
    }


    showCompletion() {
        this.elements.complete.forEach(
            (element) => {
                element.hidden =
                    false;

                element.classList.add(
                    'is-visible'
                );
            }
        );

        this.elements.status.forEach(
            (element) => {
                element.textContent =
                    'The special moment is here! ✨';
            }
        );
    }


    hideCompletion() {
        this.elements.complete.forEach(
            (element) => {
                if (
                    !element.dataset
                        .alwaysVisible
                ) {
                    element.hidden =
                        true;

                    element.classList.remove(
                        'is-visible'
                    );
                }
            }
        );
    }


    playCompletionAudio() {
        if (
            !COUNTDOWN_CONFIG
                .audio
                .enabled
        ) {
            return;
        }

        const source =
            COUNTDOWN_CONFIG
                .audio
                .complete;

        /*
         * Intentionally blank until the user chooses the right audio.
         */
        if (
            !source
        ) {
            return;
        }

        try {
            if (
                this.audio &&
                typeof
                    this.audio.playSFX ===
                    'function'
            ) {
                this.audio.playSFX(
                    source
                );
            } else if (
                window.SehrishAudio &&
                typeof
                    window.SehrishAudio
                        .playSFX ===
                    'function'
            ) {
                window.SehrishAudio.playSFX(
                    source
                );
            }
        } catch (error) {
            console.warn(
                '[Countdown] Completion audio failed:',
                error
            );
        }
    }


    /* ========================================================================
     * UI
     * ====================================================================== */

    showStatus(
        message,
        announce = false
    ) {
        this.elements.status.forEach(
            (element) => {
                element.textContent =
                    String(
                        message
                    );
            }
        );

        if (
            announce
        ) {
            this.announce(
                message
            );
        }
    }


    updateControls() {
        this.elements.start.forEach(
            (button) => {
                const disabled =
                    this.running ||
                    this.completed ||
                    this.invalid;

                button.disabled =
                    disabled;

                button.setAttribute(
                    'aria-disabled',
                    String(
                        disabled
                    )
                );
            }
        );

        this.elements.pause.forEach(
            (button) => {
                const disabled =
                    !this.running ||
                    this.completed ||
                    this.invalid;

                button.disabled =
                    disabled;

                button.dataset.state =
                    this.paused
                        ? 'paused'
                        : 'running';

                button.setAttribute(
                    'aria-pressed',
                    String(
                        this.paused
                    )
                );
            }
        );

        this.elements.reset.forEach(
            (button) => {
                button.disabled =
                    false;
            }
        );
    }


    updateDocumentTitle(
        remaining
    ) {
        if (
            !this.config
                .updateDocumentTitle
        ) {
            return;
        }

        const originalTitle =
            this.elements.title[0]
                ?.textContent
                ?.trim();

        if (
            originalTitle
        ) {
            document.title =
                `${originalTitle} • ${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`;
        }
    }


    setupAccessibility() {
        if (
            !this.root
        ) {
            return;
        }

        if (
            !this.root.hasAttribute(
                'role'
            )
        ) {
            this.root.setAttribute(
                'role',
                'timer'
            );
        }

        this.root.setAttribute(
            'aria-live',
            'polite'
        );

        this.root.setAttribute(
            'aria-atomic',
            'true'
        );
    }


    announce(
        message
    ) {
        if (
            !message
        ) {
            return;
        }

        let live =
            document.getElementById(
                'countdown-live-region'
            );

        if (
            !live
        ) {
            live =
                document.createElement(
                    'div'
                );

            live.id =
                'countdown-live-region';

            live.setAttribute(
                'aria-live',
                'polite'
            );

            live.setAttribute(
                'aria-atomic',
                'true'
            );

            Object.assign(
                live.style,
                {
                    position:
                        'absolute',

                    width:
                        '1px',

                    height:
                        '1px',

                    padding:
                        '0',

                    margin:
                        '-1px',

                    overflow:
                        'hidden',

                    clip:
                        'rect(0,0,0,0)',

                    whiteSpace:
                        'nowrap',

                    border:
                        '0'
                }
            );

            document.body.appendChild(
                live
            );
        }

        live.textContent =
            String(
                message
            );
    }


    applyRootState() {
        if (
            !this.root
        ) {
            return;
        }

        const classes =
            COUNTDOWN_CONFIG
                .classes;

        this.root.classList.toggle(
            classes.initialized,
            this.initialized
        );

        this.root.classList.toggle(
            classes.running,
            this.running
        );

        this.root.classList.toggle(
            classes.paused,
            this.paused
        );

        this.root.classList.toggle(
            classes.complete,
            this.completed
        );

        this.root.classList.toggle(
            classes.invalid,
            this.invalid
        );

        this.root.dataset.countdownState =
            this.getStateName();

        this.root.dataset.running =
            String(
                this.running
            );

        this.root.dataset.paused =
            String(
                this.paused
            );

        this.root.dataset.completed =
            String(
                this.completed
            );
    }


    getStateName() {
        if (
            this.invalid
        ) {
            return 'invalid';
        }

        if (
            this.completed
        ) {
            return 'complete';
        }

        if (
            this.paused
        ) {
            return 'paused';
        }

        if (
            this.running
        ) {
            return 'running';
        }

        return 'idle';
    }


    /* ========================================================================
     * CONFIGURATION API
     * ====================================================================== */

    setTargetDate(
        value
    ) {
        const parsed =
            this.parseTargetDate(
                value
            );

        if (
            !parsed
        ) {
            this.invalidate(
                'Unable to use the supplied countdown date.'
            );

            return false;
        }

        this.targetDate =
            new Date(
                parsed.getTime()
            );

        this.originalTargetDate =
            new Date(
                parsed.getTime()
            );

        this.invalid =
            false;

        this.completed =
            false;

        this.paused =
            false;

        this.lastTickSecond =
            -1;

        this.hideCompletion();

        this.applyRootState();

        this.update();

        return true;
    }


    setAutoStart(
        value
    ) {
        this.config.autoStart =
            countdownToBoolean(
                value,
                this.config.autoStart
            );

        return this;
    }


    /* ========================================================================
     * PUBLIC API
     * ====================================================================== */

    getRemaining() {
        return this.calculateRemaining()
            .toObject();
    }


    getState() {
        const remaining =
            this.calculateRemaining();

        return {
            initialized:
                this.initialized,

            running:
                this.running,

            paused:
                this.paused,

            completed:
                this.completed,

            invalid:
                this.invalid,

            targetDate:
                this.targetDate
                    ? this.targetDate
                        .toISOString()
                    : null,

            completedAt:
                this.completedAt
                    ? this.completedAt
                        .toISOString()
                    : null,

            remaining:
                remaining.toObject(),

            state:
                this.getStateName()
        };
    }


    on(
        eventName,
        handler
    ) {
        return this.events.on(
            eventName,
            handler
        );
    }


    emit(
        eventName,
        payload
    ) {
        this.events.emit(
            eventName,
            payload
        );

        countdownDispatchEvent(
            eventName,
            payload
        );

        if (
            this.app?.events
        ) {
            this.app.events.emit(
                eventName,
                payload
            );
        }
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

        this.stopTimer();

        document.removeEventListener(
            'visibilitychange',
            this.handleVisibility
        );

        document.removeEventListener(
            'keydown',
            this.handleKeyDown
        );

        this.events.clear();

        this.destroyed =
            true;

        this.initialized =
            false;

        this.running =
            false;

        this.paused =
            false;

        this.emit(
            COUNTDOWN_CONFIG
                .events
                .destroyed,
            {
                state:
                    this.getState()
            }
        );
    }
}


/* ============================================================================
 * GLOBAL INSTANCE
 * ========================================================================== */

let birthdayCountdownManager =
    null;


/**
 * Get global countdown manager.
 *
 * @returns {BirthdayCountdownManager}
 */
function getBirthdayCountdownManager() {
    if (
        !birthdayCountdownManager
    ) {
        birthdayCountdownManager =
            new BirthdayCountdownManager();
    }

    return birthdayCountdownManager;
}


birthdayCountdownManager =
    getBirthdayCountdownManager();


/* ============================================================================
 * GLOBAL COMPATIBILITY NAMES
 * ========================================================================== */

window.CountdownManager =
    birthdayCountdownManager;

window.countdownManager =
    birthdayCountdownManager;

window.Countdown =
    birthdayCountdownManager;


/* ============================================================================
 * PUBLIC NAMESPACE
 * ========================================================================== */

window.SehrishCountdown =
    Object.freeze({
        init(
            app = null
        ) {
            return getBirthdayCountdownManager()
                .init(app);
        },

        start() {
            return getBirthdayCountdownManager()
                .start();
        },

        pause(
            options = {}
        ) {
            return getBirthdayCountdownManager()
                .pause(options);
        },

        resume() {
            return getBirthdayCountdownManager()
                .resume();
        },

        togglePause() {
            return getBirthdayCountdownManager()
                .togglePause();
        },

        reset() {
            return getBirthdayCountdownManager()
                .reset();
        },

        setTarget(
            date
        ) {
            return getBirthdayCountdownManager()
                .setTargetDate(
                    date
                );
        },

        remaining() {
            return getBirthdayCountdownManager()
                .getRemaining();
        },

        state() {
            return getBirthdayCountdownManager()
                .getState();
        },

        manager() {
            return getBirthdayCountdownManager();
        }
    });


/* ============================================================================
 * AUTOMATIC INITIALIZATION
 * ========================================================================== */

function initializeBirthdayCountdown() {
    const manager =
        getBirthdayCountdownManager();

    try {
        manager.init();
    } catch (error) {
        console.error(
            '[Countdown] Initialization failed:',
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
        initializeBirthdayCountdown,
        {
            once: true
        }
    );
} else {
    initializeBirthdayCountdown();
}


/* ============================================================================
 * DEBUG API
 * ========================================================================== */

window.SBCountdownDebug =
    Object.freeze({
        state:
            () =>
                getBirthdayCountdownManager()
                    .getState(),

        remaining:
            () =>
                getBirthdayCountdownManager()
                    .getRemaining(),

        start:
            () =>
                getBirthdayCountdownManager()
                    .start(),

        pause:
            () =>
                getBirthdayCountdownManager()
                    .pause(),

        resume:
            () =>
                getBirthdayCountdownManager()
                    .resume(),

        reset:
            () =>
                getBirthdayCountdownManager()
                    .reset(),

        setTarget:
            (date) =>
                getBirthdayCountdownManager()
                    .setTargetDate(
                        date
                    )
    });


/* ============================================================================
 * END OF FILE
 * ============================================================================
 */