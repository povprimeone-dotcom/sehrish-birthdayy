/**
 * ============================================================================
 * SEHRISH BIRTHDAY EXPERIENCE
 * ============================================================================
 * File       : js/gifts.js
 * Project    : sehrish-birthday
 * Version    : 1.0.0
 *
 * Purpose:
 * - Interactive gift-box experience
 * - Multiple gift support
 * - Gift opening / closing
 * - Sequential reveal flow
 * - Individual gift actions
 * - Gift progress tracking
 * - Animated reveal states
 * - Touch / pointer support through buttons
 * - Keyboard accessibility
 * - Reduced-motion support
 * - Scene lifecycle integration
 * - app.js integration
 * - audio.js integration hooks
 * - Optional custom reveal callbacks
 * - Persistent gift statistics
 * - Safe reset / restart
 * - Dynamic gift discovery and generation
 * - Responsive state handling
 *
 * IMPORTANT:
 * - No specific audio file is hard-coded.
 * - Final music/SFX will be selected later after visual review.
 * - Visual appearance remains controlled by style.css.
 * - This file controls behavior and application state.
 * ============================================================================
 */

'use strict';


/* ============================================================================
 * CONFIGURATION
 * ========================================================================== */

const GIFTS_CONFIG = Object.freeze({
    name: 'Sehrish Birthday Gifts',
    version: '1.0.0',

    selectors: Object.freeze({
        root: [
            '[data-gifts]',
            '#birthday-gifts',
            '.birthday-gifts'
        ],

        gift: [
            '[data-gift]',
            '.birthday-gift',
            '.gift-box'
        ],

        giftTrigger: [
            '[data-gift-action="open"]',
            '[data-action="open-gift"]',
            '.gift-open'
        ],

        closeTrigger: [
            '[data-gift-action="close"]',
            '[data-action="close-gift"]',
            '.gift-close'
        ],

        openAllTrigger: [
            '[data-gift-action="open-all"]',
            '[data-action="open-all-gifts"]',
            '.open-all-gifts'
        ],

        resetTrigger: [
            '[data-gift-action="reset"]',
            '[data-action="reset-gifts"]',
            '.reset-gifts'
        ],

        continueTrigger: [
            '[data-gift-action="continue"]',
            '[data-action="gifts-continue"]',
            '.gifts-continue'
        ],

        counter: [
            '[data-gifts-opened]',
            '.gifts-opened'
        ],

        total: [
            '[data-gifts-total]',
            '.gifts-total'
        ],

        remaining: [
            '[data-gifts-remaining]',
            '.gifts-remaining'
        ],

        progress: [
            '[data-gifts-progress]',
            '.gifts-progress'
        ],

        status: [
            '[data-gifts-status]',
            '.gifts-status'
        ],

        result: [
            '[data-gifts-result]',
            '.gifts-result'
        ],

        resultTitle: [
            '[data-gifts-result-title]',
            '.gifts-result-title'
        ],

        resultText: [
            '[data-gifts-result-text]',
            '.gifts-result-text'
        ],

        overlay: [
            '[data-gifts-overlay]',
            '.gifts-overlay'
        ],

        reveal: [
            '[data-gift-reveal]',
            '.gift-reveal'
        ],

        decoration: [
            '[data-gift-decoration]',
            '.gift-decoration'
        ]
    }),

    defaults: Object.freeze({
        autoDiscover: true,

        requireSequential: false,

        allowReopen: true,

        openAnimationDuration: 900,

        closeAnimationDuration: 600,

        revealAnimationDuration: 850,

        celebrationDuration: 2200,

        staggerDelay: 180,

        progressSmoothing: true,

        persistProgress: true
    }),

    classes: Object.freeze({
        initialized: 'gifts-initialized',
        active: 'gifts-active',
        opening: 'gift-opening',
        open: 'gift-open',
        closing: 'gift-closing',
        closed: 'gift-closed',
        revealed: 'gift-revealed',
        completed: 'gifts-completed',
        celebration: 'gifts-celebration',
        disabled: 'gift-disabled',
        selected: 'gift-selected'
    }),

    storage: Object.freeze({
        prefix: 'sehrish-birthday:',
        opened: 'gifts-opened',
        totalOpened: 'gifts-total-opened',
        sessions: 'gifts-sessions',
        completed: 'gifts-completed'
    }),

    events: Object.freeze({
        initialized: 'gifts:initialized',
        opened: 'gift:opened',
        closed: 'gift:closed',
        revealed: 'gift:revealed',
        allOpened: 'gifts:all-opened',
        celebration: 'gifts:celebration',
        reset: 'gifts:reset',
        continue: 'gifts:continue',
        destroyed: 'gifts:destroyed'
    }),

    audio: Object.freeze({
        enabled: true,

        /*
         * Intentionally empty until the scene's final audio design
         * has been reviewed and selected.
         */
        open: '',
        reveal: '',
        celebration: '',
        close: ''
    })
});


/* ============================================================================
 * UTILITY FUNCTIONS
 * ========================================================================== */

/**
 * Normalize selector values.
 *
 * @param {string|string[]} selectors
 * @returns {string[]}
 */
function giftsNormalizeSelectors(selectors) {
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
 * Query first matching element.
 *
 * @param {string|string[]} selectors
 * @param {ParentNode} root
 * @returns {Element|null}
 */
function giftsQueryFirst(
    selectors,
    root = document
) {
    const list =
        giftsNormalizeSelectors(
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
                '[Gifts] Invalid selector:',
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
function giftsQueryAll(
    selectors,
    root = document
) {
    const list =
        giftsNormalizeSelectors(
            selectors
        );

    const output = [];
    const seen = new Set();

    list.forEach((selector) => {
        try {
            root.querySelectorAll(
                selector
            ).forEach((element) => {
                if (!seen.has(element)) {
                    seen.add(element);
                    output.push(element);
                }
            });
        } catch (error) {
            console.warn(
                '[Gifts] Invalid selector:',
                selector,
                error
            );
        }
    });

    return output;
}


/**
 * Clamp a number.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function giftsClamp(
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
 * Convert boolean-like values.
 *
 * @param {*} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function giftsToBoolean(
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
 * Detect reduced motion.
 *
 * @returns {boolean}
 */
function giftsReducedMotion() {
    try {
        return Boolean(
            window.matchMedia?.(
                '(prefers-reduced-motion: reduce)'
            ).matches
        );
    } catch {
        return false;
    }
}


/**
 * Delay helper.
 *
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function giftsWait(
    milliseconds
) {
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
 * Generate unique ID.
 *
 * @returns {string}
 */
function giftsCreateId() {
    return (
        'gift-' +
        Date.now().toString(36) +
        '-' +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );
}


/**
 * Dispatch CustomEvent safely.
 *
 * @param {string} name
 * @param {*} detail
 */
function giftsDispatchEvent(
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

class GiftsEventBus {
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
                        '[Gifts] Event handler error:',
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

class GiftsStorage {
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

    key(
        value
    ) {
        return (
            GIFTS_CONFIG
                .storage
                .prefix +
            value
        );
    }

    set(
        key,
        value
    ) {
        const finalKey =
            this.key(key);

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
                JSON.stringify(
                    value
                )
            );
        } catch {
            // Ignore storage failures.
        }
    }

    get(
        key,
        fallback = null
    ) {
        const finalKey =
            this.key(key);

        if (
            this.storage
        ) {
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
                // Fall through to memory.
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

    increment(
        key,
        amount = 1
    ) {
        const current =
            Number(
                this.get(
                    key,
                    0
                )
            ) || 0;

        const next =
            current +
            Number(
                amount || 0
            );

        this.set(
            key,
            next
        );

        return next;
    }
}


/* ============================================================================
 * GIFT MODEL
 * ========================================================================== */

class BirthdayGift {
    constructor(
        options = {}
    ) {
        this.id =
            options.id ||
            giftsCreateId();

        this.index =
            Number(
                options.index || 0
            );

        this.label =
            options.label ||
            `Gift ${this.index + 1}`;

        this.title =
            options.title ||
            this.label;

        this.description =
            options.description ||
            '';

        this.element =
            options.element ||
            null;

        this.trigger =
            options.trigger ||
            null;

        this.reveal =
            options.reveal ||
            null;

        this.opened =
            giftsToBoolean(
                options.opened,
                false
            );

        this.revealed =
            giftsToBoolean(
                options.revealed,
                false
            );

        this.opening =
            false;

        this.closing =
            false;

        this.disabled =
            false;

        this.lastInteraction =
            0;

        this.metadata =
            {
                ...(options.metadata || {})
            };
    }

    setOpened(
        value
    ) {
        this.opened =
            Boolean(value);

        if (
            this.opened
        ) {
            this.revealed =
                false;
        }
    }

    setRevealed(
        value
    ) {
        this.revealed =
            Boolean(value);

        if (
            this.revealed
        ) {
            this.opened =
                true;
        }
    }
}


/* ============================================================================
 * GIFTS MANAGER
 * ========================================================================== */

class BirthdayGiftsManager {
    constructor() {
        this.name =
            GIFTS_CONFIG.name;

        this.version =
            GIFTS_CONFIG.version;

        this.config =
            {
                ...GIFTS_CONFIG
                    .defaults
            };

        this.app =
            null;

        this.audio =
            null;

        this.root =
            null;

        this.gifts =
            [];

        this.events =
            new GiftsEventBus();

        this.storage =
            new GiftsStorage();

        this.state =
            {
                initialized: false,
                active: false,
                celebrating: false,
                completed: false
            };

        this.openedCount =
            0;

        this.totalOpenedLifetime =
            0;

        this.sessions =
            0;

        this.selectedGiftId =
            null;

        this.currentOpeningPromise =
            null;

        this.celebrationTimer =
            null;

        this.resizeObserver =
            null;

        this.destroyed =
            false;

        this.ui =
            {
                giftTriggers: [],
                closeTriggers: [],
                openAllTriggers: [],
                resetTriggers: [],
                continueTriggers: [],
                counters: [],
                totals: [],
                remaining: [],
                progress: [],
                status: [],
                result: [],
                resultTitle: [],
                resultText: [],
                overlay: [],
                reveal: [],
                decoration: []
            };

        this.boundHandlers =
            {
                keydown:
                    this.handleKeyDown
                        .bind(this),

                visibility:
                    this.handleVisibility
                        .bind(this),

                resize:
                    this.handleResize
                        .bind(this),

                sceneChanged:
                    this.handleSceneChanged
                        .bind(this)
            };
    }


    /* ========================================================================
     * INITIALIZATION
     * ====================================================================== */

    init(
        app = null
    ) {
        if (
            this.state.initialized
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
            this.state.initialized =
                true;

            this.emit(
                GIFTS_CONFIG.events.initialized,
                {
                    available: false
                }
            );

            return this;
        }

        this.loadConfiguration();

        this.discoverGifts();

        this.discoverUI();

        this.restoreStatistics();

        this.bindDOMEvents();

        this.bindApplicationEvents();

        this.setupAccessibility();

        this.setupResponsiveObserver();

        this.prepareInitialState();

        this.state.initialized =
            true;

        this.root.classList.add(
            GIFTS_CONFIG
                .classes
                .initialized
        );

        this.updateUI();

        this.emit(
            GIFTS_CONFIG.events.initialized,
            {
                available: true,
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
            // Audio remains optional.
        }

        return null;
    }


    findDOM() {
        this.root =
            giftsQueryFirst(
                GIFTS_CONFIG
                    .selectors
                    .root
            );
    }


    loadConfiguration() {
        const dataset =
            this.root.dataset;

        this.config.autoDiscover =
            giftsToBoolean(
                dataset.giftsAutoDiscover,
                true
            );

        this.config.requireSequential =
            giftsToBoolean(
                dataset.giftsSequential,
                false
            );

        this.config.allowReopen =
            giftsToBoolean(
                dataset.giftsAllowReopen,
                true
            );

        this.config.persistProgress =
            giftsToBoolean(
                dataset.giftsPersist,
                true
            );
    }


    /* ========================================================================
     * GIFT DISCOVERY
     * ====================================================================== */

    discoverGifts() {
        const giftElements =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .gift,
                this.root
            );

        this.gifts = giftElements.map(
            (element, index) => {
                const id =
                    element.dataset.giftId ||
                    element.id ||
                    `gift-${index + 1}`;

                const label =
                    element.dataset.giftLabel ||
                    `Gift ${index + 1}`;

                const title =
                    element.dataset.giftTitle ||
                    label;

                const description =
                    element.dataset.giftDescription ||
                    '';

                const trigger =
                    giftsQueryFirst(
                        GIFTS_CONFIG
                            .selectors
                            .giftTrigger,
                        element
                    );

                const reveal =
                    giftsQueryFirst(
                        GIFTS_CONFIG
                            .selectors
                            .reveal,
                        element
                    );

                const opened =
                    giftsToBoolean(
                        element.dataset.giftOpened,
                        false
                    );

                const gift =
                    new BirthdayGift({
                        id,
                        index,
                        label,
                        title,
                        description,
                        element,
                        trigger,
                        reveal,
                        opened,
                        metadata: {
                            type:
                                element.dataset
                                    .giftType ||
                                'standard',

                            media:
                                element.dataset
                                    .giftMedia ||
                                '',

                            action:
                                element.dataset
                                    .giftRevealAction ||
                                ''
                        }
                    });

                this.decorateGift(
                    gift
                );

                return gift;
            }
        );

        /*
         * No gifts in HTML:
         *
         * We do not invent a large visual gift system from nothing.
         * A single dynamically generated generic gift is provided only
         * as a safe fallback so the JS module remains functional.
         */
        if (
            this.gifts.length === 0 &&
            this.config.autoDiscover
        ) {
            this.createFallbackGift();
        }
    }


    createFallbackGift() {
        const gift =
            document.createElement(
                'button'
            );

        gift.type =
            'button';

        gift.className =
            'birthday-gift';

        gift.dataset.gift =
            'true';

        gift.dataset.giftId =
            'gift-1';

        gift.dataset.giftLabel =
            'Special Gift';

        gift.dataset.giftTitle =
            'A Special Surprise';

        gift.innerHTML = `
            <span
                class="gift-box"
                aria-hidden="true"
            >
                <span class="gift-box__body"></span>
                <span class="gift-box__ribbon"></span>
                <span class="gift-box__bow"></span>
            </span>

            <span
                class="gift-box__label"
            >
                Open Me
            </span>
        `;

        this.root.appendChild(
            gift
        );

        const birthdayGift =
            new BirthdayGift({
                id:
                    'gift-1',

                index:
                    0,

                label:
                    'Special Gift',

                title:
                    'A Special Surprise',

                element:
                    gift,

                trigger:
                    gift
            });

        this.decorateGift(
            birthdayGift
        );

        this.gifts.push(
            birthdayGift
        );
    }


    decorateGift(
        gift
    ) {
        const element =
            gift.element;

        if (
            !element
        ) {
            return;
        }

        element.dataset.giftId =
            gift.id;

        element.dataset.giftIndex =
            String(
                gift.index
            );

        element.dataset.giftState =
            gift.opened
                ? 'open'
                : 'closed';

        if (
            !element.hasAttribute(
                'role'
            ) &&
            element.tagName !==
                'BUTTON'
        ) {
            element.setAttribute(
                'role',
                'button'
            );
        }

        if (
            !element.hasAttribute(
                'tabindex'
            )
        ) {
            element.setAttribute(
                'tabindex',
                '0'
            );
        }

        if (
            !element.hasAttribute(
                'aria-label'
            )
        ) {
            element.setAttribute(
                'aria-label',
                `${gift.label}. Open gift.`
            );
        }

        if (
            gift.trigger &&
            !gift.trigger.hasAttribute(
                'aria-label'
            )
        ) {
            gift.trigger.setAttribute(
                'aria-label',
                `Open ${gift.label}`
            );
        }

        this.updateGiftElement(
            gift
        );
    }


    /* ========================================================================
     * UI DISCOVERY
     * ====================================================================== */

    discoverUI() {
        this.ui.giftTriggers =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .giftTrigger,
                this.root
            );

        this.ui.closeTriggers =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .closeTrigger,
                this.root
            );

        this.ui.openAllTriggers =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .openAllTrigger,
                this.root
            );

        this.ui.resetTriggers =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .resetTrigger,
                this.root
            );

        this.ui.continueTriggers =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .continueTrigger,
                this.root
            );

        this.ui.counters =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .counter,
                this.root
            );

        this.ui.totals =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .total,
                this.root
            );

        this.ui.remaining =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .remaining,
                this.root
            );

        this.ui.progress =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .progress,
                this.root
            );

        this.ui.status =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .status,
                this.root
            );

        this.ui.result =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .result,
                this.root
            );

        this.ui.resultTitle =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .resultTitle,
                this.root
            );

        this.ui.resultText =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .resultText,
                this.root
            );

        this.ui.overlay =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .overlay,
                this.root
            );

        this.ui.reveal =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .reveal,
                this.root
            );

        this.ui.decoration =
            giftsQueryAll(
                GIFTS_CONFIG
                    .selectors
                    .decoration,
                this.root
            );
    }


    /* ========================================================================
     * EVENT BINDINGS
     * ====================================================================== */

    bindDOMEvents() {
        this.gifts.forEach(
            (gift) => {
                if (
                    !gift.element
                ) {
                    return;
                }

                gift.element.addEventListener(
                    'click',
                    (event) => {
                        /*
                         * When there is a child trigger, prevent the parent
                         * from handling the event twice.
                         */
                        if (
                            event.target instanceof Element &&
                            event.target.closest(
                                '[data-gift-action="open"]'
                            )
                        ) {
                            return;
                        }

                        event.preventDefault();

                        this.openGift(
                            gift.id
                        );
                    }
                );

                gift.element.addEventListener(
                    'keydown',
                    (event) => {
                        const key =
                            String(
                                event.key || ''
                            ).toLowerCase();

                        if (
                            key === 'enter' ||
                            key === ' '
                        ) {
                            event.preventDefault();

                            this.openGift(
                                gift.id
                            );
                        }
                    }
                );

                if (
                    gift.trigger &&
                    gift.trigger !==
                        gift.element
                ) {
                    gift.trigger.addEventListener(
                        'click',
                        (event) => {
                            event.preventDefault();

                            this.openGift(
                                gift.id
                            );
                        }
                    );
                }
            }
        );

        this.ui.closeTriggers.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.closeSelectedGift();
                    }
                );
            }
        );

        this.ui.openAllTriggers.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.openAll();
                    }
                );
            }
        );

        this.ui.resetTriggers.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.reset();
                    }
                );
            }
        );

        this.ui.continueTriggers.forEach(
            (button) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.continueAfterGifts();
                    }
                );
            }
        );

        document.addEventListener(
            'keydown',
            this.boundHandlers
                .keydown
        );

        document.addEventListener(
            'visibilitychange',
            this.boundHandlers
                .visibility
        );

        window.addEventListener(
            'resize',
            this.boundHandlers
                .resize,
            {
                passive: true
            }
        );
    }


    bindApplicationEvents() {
        if (
            this.app?.events
        ) {
            this.app.events.on(
                'scene:changed',
                this.boundHandlers
                    .sceneChanged
            );
        }
    }


    /* ========================================================================
     * ACCESSIBILITY
     * ====================================================================== */

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
                'region'
            );
        }

        if (
            !this.root.hasAttribute(
                'aria-label'
            )
        ) {
            this.root.setAttribute(
                'aria-label',
                'Interactive birthday gifts'
            );
        }

        this.root.setAttribute(
            'aria-live',
            'polite'
        );

        this.root.setAttribute(
            'aria-busy',
            'false'
        );
    }


    /* ========================================================================
     * RESPONSIVE
     * ====================================================================== */

    setupResponsiveObserver() {
        if (
            typeof ResizeObserver ===
                'undefined' ||
            !this.root
        ) {
            return;
        }

        this.resizeObserver =
            new ResizeObserver(
                () => {
                    this.handleResize();
                }
            );

        this.resizeObserver.observe(
            this.root
        );
    }


    handleResize() {
        if (
            !this.root
        ) {
            return;
        }

        const rect =
            this.root.getBoundingClientRect();

        this.root.style.setProperty(
            '--gifts-width',
            `${rect.width}px`
        );

        this.root.style.setProperty(
            '--gifts-height',
            `${rect.height}px`
        );

        this.emit(
            'gifts:resize',
            {
                width:
                    rect.width,

                height:
                    rect.height
            }
        );
    }


    /* ========================================================================
     * INITIAL STATE
     * ====================================================================== */

    prepareInitialState() {
        this.state.active =
            true;

        this.state.celebrating =
            false;

        this.state.completed =
            false;

        this.gifts.forEach(
            (gift) => {
                /*
                 * Persisted open state is not automatically restored as
                 * visually open because the user should experience the
                 * surprise again. Statistics remain persisted separately.
                 */
                gift.setOpened(
                    false
                );

                gift.setRevealed(
                    false
                );

                gift.opening =
                    false;

                gift.closing =
                    false;

                this.updateGiftElement(
                    gift
                );
            }
        );

        this.openedCount =
            0;

        this.selectedGiftId =
            null;

        this.updateUI();

        this.hideResult();

        this.applyRootState();
    }


    /* ========================================================================
     * OPEN GIFT
     * ====================================================================== */

    async openGift(
        giftId
    ) {
        if (
            !this.canOpenGift(
                giftId
            )
        ) {
            return false;
        }

        const gift =
            this.getGift(
                giftId
            );

        if (
            !gift
        ) {
            return false;
        }

        const now =
            performance.now();

        if (
            now -
            gift.lastInteraction <
            150
        ) {
            return false;
        }

        gift.lastInteraction =
            now;

        this.selectedGiftId =
            gift.id;

        this.currentOpeningPromise =
            this.performOpenGift(
                gift
            );

        try {
            await this.currentOpeningPromise;
        } finally {
            this.currentOpeningPromise =
                null;
        }

        return true;
    }


    canOpenGift(
        giftId
    ) {
        if (
            !this.state.initialized ||
            !this.state.active ||
            this.state.completed
        ) {
            return false;
        }

        const gift =
            this.getGift(
                giftId
            );

        if (
            !gift
        ) {
            return false;
        }

        if (
            gift.opening ||
            gift.closing
        ) {
            return false;
        }

        if (
            gift.disabled
        ) {
            return false;
        }

        if (
            gift.opened &&
            !this.config.allowReopen
        ) {
            return false;
        }

        if (
            this.config.requireSequential &&
            gift.index >
            this.getNextSequentialIndex()
        ) {
            this.showStatus(
                'Open the previous gift first.'
            );

            return false;
        }

        return true;
    }


    getNextSequentialIndex() {
        const next =
            this.gifts.find(
                (gift) =>
                    !gift.opened
            );

        return next
            ? next.index
            : this.gifts.length;
    }


    async performOpenGift(
        gift
    ) {
        gift.opening =
            true;

        gift.closing =
            false;

        this.selectedGiftId =
            gift.id;

        this.applyGiftInteractionLock(
            true
        );

        this.updateGiftElement(
            gift
        );

        this.playAudio(
            'open'
        );

        this.emit(
            GIFTS_CONFIG.events.opened,
            {
                gift,
                phase:
                    'opening',
                state:
                    this.getState()
            }
        );

        const openDuration =
            giftsReducedMotion()
                ? 120
                : GIFTS_CONFIG
                    .defaults
                    .openAnimationDuration;

        await giftsWait(
            openDuration
        );

        gift.setOpened(
            true
        );

        gift.opening =
            false;

        /*
         * Opening a previously opened gift does not increase the count.
         */
        const newlyOpened =
            !gift.revealed &&
            !gift.metadata
                .countedOnce;

        if (
            newlyOpened
        ) {
            gift.metadata
                .countedOnce =
                true;

            this.openedCount +=
                1;

            this.totalOpenedLifetime =
                this.storage.increment(
                    GIFTS_CONFIG
                        .storage
                        .totalOpened,
                    1
                );
        }

        this.updateGiftElement(
            gift
        );

        this.updateUI();

        this.emit(
            GIFTS_CONFIG.events.opened,
            {
                gift,
                phase:
                    'opened',
                state:
                    this.getState()
            }
        );

        await this.performReveal(
            gift
        );

        this.applyGiftInteractionLock(
            false
        );

        this.checkCompletion();

        return true;
    }


    /* ========================================================================
     * REVEAL
     * ====================================================================== */

    async performReveal(
        gift
    ) {
        if (
            gift.revealed
        ) {
            return;
        }

        const revealDuration =
            giftsReducedMotion()
                ? 80
                : GIFTS_CONFIG
                    .defaults
                    .revealAnimationDuration;

        this.playAudio(
            'reveal'
        );

        if (
            gift.reveal
        ) {
            gift.reveal.hidden =
                false;

            gift.reveal.classList.add(
                GIFTS_CONFIG
                    .classes
                    .revealed
            );

            gift.reveal.setAttribute(
                'aria-hidden',
                'false'
            );
        }

        await giftsWait(
            revealDuration
        );

        gift.setRevealed(
            true
        );

        this.updateGiftElement(
            gift
        );

        this.emit(
            GIFTS_CONFIG.events.revealed,
            {
                gift,
                state:
                    this.getState()
            }
        );

        this.announce(
            `${gift.label} opened.`
        );
    }


    /* ========================================================================
     * CLOSE GIFT
     * ====================================================================== */

    async closeGift(
        giftId
    ) {
        const gift =
            this.getGift(
                giftId
            );

        if (
            !gift ||
            !gift.opened ||
            gift.closing ||
            gift.opening
        ) {
            return false;
        }

        if (
            !this.config.allowReopen
        ) {
            return false;
        }

        gift.closing =
            true;

        this.updateGiftElement(
            gift
        );

        this.playAudio(
            'close'
        );

        await giftsWait(
            giftsReducedMotion()
                ? 80
                : GIFTS_CONFIG
                    .defaults
                    .closeAnimationDuration
        );

        gift.closing =
            false;

        /*
         * Closing should not erase the fact that the gift has already
         * been opened. It only changes the visual state.
         */
        this.updateGiftElement(
            gift
        );

        this.emit(
            GIFTS_CONFIG.events.closed,
            {
                gift,
                state:
                    this.getState()
            }
        );

        return true;
    }


    async closeSelectedGift() {
        if (
            !this.selectedGiftId
        ) {
            return false;
        }

        return this.closeGift(
            this.selectedGiftId
        );
    }


    /* ========================================================================
     * OPEN ALL
     * ====================================================================== */

    async openAll() {
        if (
            !this.state.initialized ||
            !this.state.active ||
            this.state.completed
        ) {
            return false;
        }

        const giftsToOpen =
            this.gifts.filter(
                (gift) =>
                    !gift.opened
            );

        if (
            giftsToOpen.length === 0
        ) {
            this.checkCompletion();

            return true;
        }

        this.applyGlobalInteractionLock(
            true
        );

        for (
            let index = 0;
            index <
            giftsToOpen.length;
            index += 1
        ) {
            const gift =
                giftsToOpen[index];

            await this.performOpenGift(
                gift
            );

            if (
                index <
                giftsToOpen.length - 1
            ) {
                await giftsWait(
                    giftsReducedMotion()
                        ? 40
                        : GIFTS_CONFIG
                            .defaults
                            .staggerDelay
                );
            }
        }

        this.applyGlobalInteractionLock(
            false
        );

        this.checkCompletion();

        return true;
    }


    /* ========================================================================
     * COMPLETION
     * ====================================================================== */

    checkCompletion() {
        const allOpened =
            this.gifts.length > 0 &&
            this.gifts.every(
                (gift) =>
                    gift.opened
            );

        if (
            allOpened
        ) {
            this.complete();
        }
    }


    complete() {
        if (
            this.state.completed
        ) {
            return;
        }

        this.state.completed =
            true;

        this.state.celebrating =
            true;

        this.root.classList.add(
            GIFTS_CONFIG
                .classes
                .celebration
        );

        this.storage.set(
            GIFTS_CONFIG
                .storage
                .completed,
            true
        );

        this.storage.increment(
            GIFTS_CONFIG
                .storage
                .sessions,
            1
        );

        this.playAudio(
            'celebration'
        );

        this.updateUI();

        this.emit(
            GIFTS_CONFIG
                .events
                .allOpened,
            {
                state:
                    this.getState()
            }
        );

        this.emit(
            GIFTS_CONFIG
                .events
                .celebration,
            {
                state:
                    this.getState()
            }
        );

        this.dispatchCelebrationHooks();

        window.clearTimeout(
            this.celebrationTimer
        );

        this.celebrationTimer =
            window.setTimeout(
                () => {
                    this.state.celebrating =
                        false;

                    this.root.classList.remove(
                        GIFTS_CONFIG
                            .classes
                            .celebration
                    );

                    this.state.completed =
                        true;

                    this.showResult();

                    this.updateUI();
                },
                giftsReducedMotion()
                    ? 300
                    : GIFTS_CONFIG
                        .defaults
                        .celebrationDuration
            );
    }


    dispatchCelebrationHooks() {
        giftsDispatchEvent(
            'birthday:gifts-complete',
            {
                source:
                    'gifts',
                state:
                    this.getState()
            }
        );

        if (
            this.app?.events
        ) {
            this.app.events.emit(
                'birthday:gifts-complete',
                {
                    source:
                        'gifts',
                    state:
                        this.getState()
                }
            );
        }

        /*
         * Optional confetti integration.
         */
        if (
            typeof window.confetti ===
                'function' &&
            !giftsReducedMotion()
        ) {
            try {
                window.confetti({
                    particleCount:
                        85,

                    spread:
                        72,

                    startVelocity:
                        22,

                    origin: {
                        y:
                            0.64
                    }
                });
            } catch {
                // Optional library may not exist.
            }
        }
    }


    /* ========================================================================
     * RESET
     * ====================================================================== */

    reset() {
        window.clearTimeout(
            this.celebrationTimer
        );

        this.state.celebrating =
            false;

        this.state.completed =
            false;

        this.selectedGiftId =
            null;

        this.openedCount =
            0;

        this.gifts.forEach(
            (gift) => {
                gift.opened =
                    false;

                gift.revealed =
                    false;

                gift.opening =
                    false;

                gift.closing =
                    false;

                gift.disabled =
                    false;

                gift.metadata
                    .countedOnce =
                    false;

                this.updateGiftElement(
                    gift
                );
            }
        );

        this.root.classList.remove(
            GIFTS_CONFIG
                .classes
                .celebration,

            GIFTS_CONFIG
                .classes
                .completed
        );

        this.hideResult();

        this.applyGlobalInteractionLock(
            false
        );

        this.updateUI();

        this.emit(
            GIFTS_CONFIG.events.reset,
            {
                state:
                    this.getState()
            }
        );

        return true;
    }


    /* ========================================================================
     * GIFT ELEMENT STATE
     * ====================================================================== */

    updateGiftElement(
        gift
    ) {
        const element =
            gift.element;

        if (
            !element
        ) {
            return;
        }

        element.classList.toggle(
            GIFTS_CONFIG
                .classes
                .opening,
            gift.opening
        );

        element.classList.toggle(
            GIFTS_CONFIG
                .classes
                .open,
            gift.opened &&
            !gift.closing
        );

        element.classList.toggle(
            GIFTS_CONFIG
                .classes
                .closing,
            gift.closing
        );

        element.classList.toggle(
            GIFTS_CONFIG
                .classes
                .revealed,
            gift.revealed
        );

        element.classList.toggle(
            GIFTS_CONFIG
                .classes
                .closed,
            !gift.opened &&
            !gift.opening
        );

        element.classList.toggle(
            GIFTS_CONFIG
                .classes
                .selected,
            this.selectedGiftId ===
            gift.id
        );

        element.dataset.giftState =
            gift.closing
                ? 'closing'
                : gift.opening
                    ? 'opening'
                    : gift.revealed
                        ? 'revealed'
                        : gift.opened
                            ? 'open'
                            : 'closed';

        element.dataset.giftIndex =
            String(
                gift.index + 1
            );

        element.setAttribute(
            'aria-expanded',
            String(
                gift.opened
            )
        );

        const label =
            gift.opened
                ? `Close ${gift.label}`
                : `Open ${gift.label}`;

        element.setAttribute(
            'aria-label',
            label
        );

        if (
            gift.trigger &&
            gift.trigger !==
                gift.element
        ) {
            gift.trigger.disabled =
                gift.opening ||
                gift.closing ||
                gift.disabled;

            gift.trigger.setAttribute(
                'aria-expanded',
                String(
                    gift.opened
                )
            );
        }

        if (
            gift.reveal
        ) {
            gift.reveal.hidden =
                !gift.revealed;

            gift.reveal.setAttribute(
                'aria-hidden',
                String(
                    !gift.revealed
                )
            );
        }
    }


    /* ========================================================================
     * UI
     * ====================================================================== */

    updateUI() {
        if (
            !this.root
        ) {
            return;
        }

        const total =
            this.gifts.length;

        const opened =
            this.openedCount;

        const remaining =
            Math.max(
                0,
                total -
                opened
            );

        const progress =
            total > 0
                ? (
                    opened /
                    total
                ) *
                100
                : 0;

        this.ui.counters.forEach(
            (element) => {
                element.textContent =
                    String(
                        opened
                    );
            }
        );

        this.ui.totals.forEach(
            (element) => {
                element.textContent =
                    String(
                        total
                    );
            }
        );

        this.ui.remaining.forEach(
            (element) => {
                element.textContent =
                    String(
                        remaining
                    );
            }
        );

        this.ui.progress.forEach(
            (element) => {
                const value =
                    giftsClamp(
                        progress,
                        0,
                        100
                    );

                element.style.setProperty(
                    '--gifts-progress',
                    `${value}%`
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
                                value
                            )
                        )
                ); 

                if (
                    'value' in
                    element
                ) {
                    try {
                        element.value =
                            value;
                    } catch {
                        // Ignore.
                    }
                }
            }
        );

        this.updateStatus();

        this.updateGlobalControls();

        this.updateResult();

        this.applyRootState();
    }


    updateStatus() {
        let message =
            'Choose a gift to open. 🎁';

        if (
            this.state.completed
        ) {
            message =
                'Every special gift has been opened! ✨';
        } else if (
            this.state.celebrating
        ) {
            message =
                'A little birthday surprise is unfolding! 🎉';
        } else if (
            this.openedCount > 0 &&
            this.openedCount <
                this.gifts.length
        ) {
            const remaining =
                this.gifts.length -
                this.openedCount;

            message =
                `${remaining} surprise${
                    remaining === 1
                        ? ''
                        : 's'
                } left to open.`;
        }

        this.showStatus(
            message
        );
    }


    showStatus(
        message
    ) {
        this.ui.status.forEach(
            (element) => {
                element.textContent =
                    String(
                        message
                    );
            }
        );
    }


    updateGlobalControls() {
        const completed =
            this.state.completed;

        this.ui.openAllTriggers.forEach(
            (button) => {
                button.disabled =
                    completed ||
                    this.openedCount >=
                        this.gifts.length;
            }
        );

        this.ui.closeTriggers.forEach(
            (button) => {
                button.disabled =
                    !this.selectedGiftId ||
                    this.state.celebrating;
            }
        );

        this.ui.continueTriggers.forEach(
            (button) => {
                button.disabled =
                    !completed;
            }
        );

        this.ui.resetTriggers.forEach(
            (button) => {
                button.disabled =
                    false;
            }
        );
    }


    updateResult() {
        if (
            !this.state.completed
        ) {
            this.hideResult();
            return;
        }

        this.ui.result.forEach(
            (element) => {
                element.hidden =
                    false;

                element.classList.add(
                    'is-visible'
                );
            }
        );

        this.ui.resultTitle.forEach(
            (element) => {
                element.textContent =
                    'All the surprises are open! 🎁✨';
            }
        );

        this.ui.resultText.forEach(
            (element) => {
                element.textContent =
                    'Your birthday surprises are ready.';
            }
        );
    }


    showResult() {
        this.ui.result.forEach(
            (element) => {
                element.hidden =
                    false;

                element.classList.add(
                    'is-visible'
                );
            }
        );
    }


    hideResult() {
        this.ui.result.forEach(
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


    applyRootState() {
        if (
            !this.root
        ) {
            return;
        }

        const classes =
            GIFTS_CONFIG
                .classes;

        this.root.classList.toggle(
            classes.active,
            this.state.active
        );

        this.root.classList.toggle(
            classes.celebration,
            this.state.celebrating
        );

        this.root.classList.toggle(
            classes.completed,
            this.state.completed
        );

        this.root.dataset.giftsState =
            this.getStateName();

        this.root.dataset.giftsOpened =
            String(
                this.openedCount
            );

        this.root.dataset.giftsTotal =
            String(
                this.gifts.length
            );

        this.root.dataset.giftsCompleted =
            String(
                this.state.completed
            );
    }


    getStateName() {
        if (
            this.state.completed
        ) {
            return 'completed';
        }

        if (
            this.state.celebrating
        ) {
            return 'celebrating';
        }

        if (
            this.state.active
        ) {
            return 'active';
        }

        return 'idle';
    }


    /* ========================================================================
     * INTERACTION LOCK
     * ====================================================================== */

    applyGiftInteractionLock(
        locked
    ) {
        const gift =
            this.selectedGiftId
                ? this.getGift(
                    this.selectedGiftId
                )
                : null;

        if (!gift) {
            return;
        }

        if (
            locked
        ) {
            this.gifts.forEach(
                (item) => {
                    if (
                        item.id !==
                        gift.id
                    ) {
                        item.disabled =
                            true;

                        item.element
                            ?.classList
                            .add(
                                GIFTS_CONFIG
                                    .classes
                                    .disabled
                            );
                    }
                }
            );

            return;
        }

        this.gifts.forEach(
            (item) => {
                item.disabled =
                    false;

                item.element
                    ?.classList
                    .remove(
                        GIFTS_CONFIG
                            .classes
                            .disabled
                    );
            }
        );
    }


    applyGlobalInteractionLock(
        locked
    ) {
        this.gifts.forEach(
            (gift) => {
                gift.disabled =
                    Boolean(
                        locked
                    );

                gift.element
                    ?.classList
                    .toggle(
                        GIFTS_CONFIG
                            .classes
                            .disabled,
                        Boolean(
                            locked
                        )
                    );
            }
        );

        this.ui.openAllTriggers.forEach(
            (button) => {
                button.disabled =
                    Boolean(
                        locked
                    );
            }
        );

        this.root.dataset.giftsLocked =
            String(
                Boolean(
                    locked
                )
            );
    }


    /* ========================================================================
     * AUDIO
     * ====================================================================== */

    playAudio(
        type
    ) {
        if (
            !GIFTS_CONFIG
                .audio
                .enabled
        ) {
            return;
        }

        const source =
            GIFTS_CONFIG
                .audio[
                    type
                ];

        /*
         * Intentionally blank until the user chooses the actual sound.
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

                return;
            }

            if (
                window.SehrishAudio &&
                typeof
                    window.SehrishAudio.playSFX ===
                    'function'
            ) {
                window.SehrishAudio.playSFX(
                    source
                );
            }
        } catch (error) {
            console.warn(
                '[Gifts] Audio failed:',
                error
            );
        }
    }


    /* ========================================================================
     * NAVIGATION / CONTINUE
     * ====================================================================== */

    continueAfterGifts() {
        if (
            !this.state.completed
        ) {
            return false;
        }

        this.emit(
            GIFTS_CONFIG
                .events
                .continue,
            {
                state:
                    this.getState()
            }
        );

        if (
            this.app?.navigation &&
            typeof
                this.app.navigation.next ===
                    'function'
        ) {
            return this.app.navigation.next();
        }

        return false;
    }


    /* ========================================================================
     * SCENE HANDLING
     * ====================================================================== */

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

        const giftsScene =
            this.root.closest(
                '[data-scene]'
            );

        if (
            giftsScene ===
            sceneElement
        ) {
            this.state.active =
                true;

            this.refreshDOM();

            return;
        }

        if (
            giftsScene &&
            giftsScene.getAttribute(
                'aria-hidden'
            ) === 'true'
        ) {
            this.state.active =
                false;
        }
    }


    refreshDOM() {
        this.findDOM();

        this.discoverGifts();

        this.discoverUI();

        this.setupAccessibility();

        this.updateUI();
    }


    /* ========================================================================
     * KEYBOARD / VISIBILITY
     * ====================================================================== */

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
            key === 'escape'
        ) {
            event.preventDefault();

            this.closeSelectedGift();

            return;
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
            this.currentOpeningPromise
        ) {
            /*
             * We do not cancel opening animations because that could
             * leave the DOM and state out of sync.
             */
            this.emit(
                'gifts:background',
                {
                    state:
                        this.getState()
                }
            );
        }
    }


    /* ========================================================================
     * GIFT ACCESSORS
     * ====================================================================== */

    getGift(
        giftId
    ) {
        if (
            giftId === null ||
            giftId === undefined
        ) {
            return null;
        }

        return (
            this.gifts.find(
                (gift) =>
                    gift.id ===
                    String(
                        giftId
                    )
            ) ||
            this.gifts.find(
                (gift) =>
                    String(
                        gift.index
                    ) ===
                    String(
                        giftId
                    )
            ) ||
            null
        );
    }


    getGiftByIndex(
        index
    ) {
        return (
            this.gifts[
                Number(index)
            ] ||
            null
        );
    }


    getSelectedGift() {
        return this.selectedGiftId
            ? this.getGift(
                this.selectedGiftId
            )
            : null;
    }


    getOpenedGifts() {
        return this.gifts.filter(
            (gift) =>
                gift.opened
        );
    }


    getRemainingGifts() {
        return this.gifts.filter(
            (gift) =>
                !gift.opened
        );
    }


    /* ========================================================================
     * ANNOUNCEMENTS
     * ====================================================================== */

    announce(
        message
    ) {
        if (
            !message
        ) {
            return;
        }

        let liveRegion =
            document.getElementById(
                'gifts-live-region'
            );

        if (
            !liveRegion
        ) {
            liveRegion =
                document.createElement(
                    'div'
                );

            liveRegion.id =
                'gifts-live-region';

            liveRegion.setAttribute(
                'aria-live',
                'polite'
            );

            liveRegion.setAttribute(
                'aria-atomic',
                'true'
            );

            Object.assign(
                liveRegion.style,
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
                liveRegion
            );
        }

        liveRegion.textContent =
            String(
                message
            );
    }


    /* ========================================================================
     * STATISTICS
     * ====================================================================== */

    restoreStatistics() {
        this.totalOpenedLifetime =
            Number(
                this.storage.get(
                    GIFTS_CONFIG
                        .storage
                        .totalOpened,
                    0
                )
            ) || 0;

        this.sessions =
            Number(
                this.storage.get(
                    GIFTS_CONFIG
                        .storage
                        .sessions,
                    0
                )
            ) || 0;
    }


    /* ========================================================================
     * STATE
     * ====================================================================== */

    getState() {
        return {
            initialized:
                this.state.initialized,

            active:
                this.state.active,

            celebrating:
                this.state.celebrating,

            completed:
                this.state.completed,

            selectedGiftId:
                this.selectedGiftId,

            totalGifts:
                this.gifts.length,

            opened:
                this.openedCount,

            remaining:
                Math.max(
                    0,
                    this.gifts.length -
                    this.openedCount
                ),

            progress:
                this.gifts.length > 0
                    ? (
                        this.openedCount /
                        this.gifts.length
                    ) *
                    100
                    : 0,

            lifetimeOpened:
                this.totalOpenedLifetime,

            sessions:
                this.sessions,

            state:
                this.getStateName()
        };
    }


    isComplete() {
        return this.state.completed;
    }


    getProgress() {
        return this.gifts.length > 0
            ? (
                this.openedCount /
                this.gifts.length
            ) * 100
            : 0;
    }


    /* ========================================================================
     * PUBLIC API
     * ====================================================================== */

    addGift(
        options = {}
    ) {
        if (
            !this.root
        ) {
            return null;
        }

        const element =
            options.element ||
            document.createElement(
                'button'
            );

        if (
            !options.element
        ) {
            element.type =
                'button';

            element.className =
                'birthday-gift';

            element.dataset.gift =
                'true';

            element.innerHTML = `
                <span
                    class="gift-box"
                    aria-hidden="true"
                >
                    <span class="gift-box__body"></span>
                    <span class="gift-box__ribbon"></span>
                    <span class="gift-box__bow"></span>
                </span>

                <span
                    class="gift-box__label"
                >
                    Open Me
                </span>
            `;

            this.root.appendChild(
                element
            );
        }

        const gift =
            new BirthdayGift({
                id:
                    options.id ||
                    `gift-${this.gifts.length + 1}`,

                index:
                    this.gifts.length,

                label:
                    options.label ||
                    `Gift ${this.gifts.length + 1}`,

                title:
                    options.title ||
                    `Gift ${this.gifts.length + 1}`,

                description:
                    options.description ||
                    '',

                element,

                trigger:
                    options.trigger ||
                    element,

                reveal:
                    options.reveal ||
                    null
            });

        this.decorateGift(
            gift
        );

        this.gifts.push(
            gift
        );

        /*
         * Bind interactions for dynamically added gifts.
         */
        gift.element.addEventListener(
            'click',
            () => {
                this.openGift(
                    gift.id
                );
            }
        );

        gift.element.addEventListener(
            'keydown',
            (event) => {
                const key =
                    String(
                        event.key || ''
                    ).toLowerCase();

                if (
                    key === 'enter' ||
                    key === ' '
                ) {
                    event.preventDefault();

                    this.openGift(
                        gift.id
                    );
                }
            }
        );

        this.updateUI();

        return gift;
    }


    removeGift(
        giftId
    ) {
        const gift =
            this.getGift(
                giftId
            );

        if (
            !gift
        ) {
            return false;
        }

        const index =
            this.gifts.indexOf(
                gift
            );

        if (
            index < 0
        ) {
            return false;
        }

        gift.element?.remove();

        this.gifts.splice(
            index,
            1
        );

        this.gifts.forEach(
            (item, itemIndex) => {
                item.index =
                    itemIndex;

                if (
                    item.element
                ) {
                    item.element.dataset.giftIndex =
                        String(
                            itemIndex
                        );
                }
            }
        );

        if (
            this.selectedGiftId ===
            gift.id
        ) {
            this.selectedGiftId =
                null;
        }

        this.openedCount =
            this.gifts.filter(
                (item) =>
                    item.opened
            ).length;

        this.checkCompletion();

        this.updateUI();

        return true;
    }


    configure(
        options = {}
    ) {
        if (
            !options ||
            typeof options !==
                'object'
        ) {
            return this;
        }

        if (
            'requireSequential' in
            options
        ) {
            this.config.requireSequential =
                Boolean(
                    options.requireSequential
                );
        }

        if (
            'allowReopen' in
            options
        ) {
            this.config.allowReopen =
                Boolean(
                    options.allowReopen
                );
        }

        if (
            'persistProgress' in
            options
        ) {
            this.config.persistProgress =
                Boolean(
                    options.persistProgress
                );
        }

        this.updateUI();

        return this;
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

        giftsDispatchEvent(
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

        window.clearTimeout(
            this.celebrationTimer
        );

        if (
            this.resizeObserver
        ) {
            try {
                this.resizeObserver.disconnect();
            } catch {
                // Ignore.
            }

            this.resizeObserver =
                null;
        }

        document.removeEventListener(
            'keydown',
            this.boundHandlers
                .keydown
        );

        document.removeEventListener(
            'visibilitychange',
            this.boundHandlers
                .visibility
        );

        window.removeEventListener(
            'resize',
            this.boundHandlers
                .resize
        );

        this.events.clear();

        this.destroyed =
            true;

        this.state.initialized =
            false;

        this.state.active =
            false;

        this.emit(
            GIFTS_CONFIG
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

let birthdayGiftsManager =
    null;


/**
 * Get/create global gifts manager.
 *
 * @returns {BirthdayGiftsManager}
 */
function getBirthdayGiftsManager() {
    if (
        !birthdayGiftsManager
    ) {
        birthdayGiftsManager =
            new BirthdayGiftsManager();
    }

    return birthdayGiftsManager;
}


birthdayGiftsManager =
    getBirthdayGiftsManager();


/* ============================================================================
 * GLOBAL COMPATIBILITY NAMES
 * ========================================================================== */

window.GiftManager =
    birthdayGiftsManager;

window.GiftsManager =
    birthdayGiftsManager;

window.giftsManager =
    birthdayGiftsManager;

window.Gifts =
    birthdayGiftsManager;


/* ============================================================================
 * PUBLIC NAMESPACE
 * ========================================================================== */

window.SehrishGifts =
    Object.freeze({
        init(
            app = null
        ) {
            return getBirthdayGiftsManager()
                .init(app);
        },

        open(
            id
        ) {
            return getBirthdayGiftsManager()
                .openGift(id);
        },

        openAll() {
            return getBirthdayGiftsManager()
                .openAll();
        },

        close(
            id
        ) {
            return getBirthdayGiftsManager()
                .closeGift(id);
        },

        closeSelected() {
            return getBirthdayGiftsManager()
                .closeSelectedGift();
        },

        reset() {
            return getBirthdayGiftsManager()
                .reset();
        },

        continue() {
            return getBirthdayGiftsManager()
                .continueAfterGifts();
        },

        state() {
            return getBirthdayGiftsManager()
                .getState();
        },

        add(
            options
        ) {
            return getBirthdayGiftsManager()
                .addGift(
                    options
                );
        },

        remove(
            id
        ) {
            return getBirthdayGiftsManager()
                .removeGift(id);
        },

        configure(
            options
        ) {
            return getBirthdayGiftsManager()
                .configure(
                    options
                );
        },

        manager() {
            return getBirthdayGiftsManager();
        }
    });


/* ============================================================================
 * AUTOMATIC INITIALIZATION
 * ========================================================================== */

function initializeBirthdayGifts() {
    const manager =
        getBirthdayGiftsManager();

    try {
        manager.init();
    } catch (error) {
        console.error(
            '[Gifts] Initialization failed:',
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
        initializeBirthdayGifts,
        {
            once: true
        }
    );
} else {
    initializeBirthdayGifts();
}


/* ============================================================================
 * DEBUG API
 * ========================================================================== */

window.SBGiftsDebug =
    Object.freeze({
        state:
            () =>
                getBirthdayGiftsManager()
                    .getState(),

        gifts:
            () =>
                [
                    ...getBirthdayGiftsManager()
                        .gifts
                ],

        open:
            (id) =>
                getBirthdayGiftsManager()
                    .openGift(id),

        openAll:
            () =>
                getBirthdayGiftsManager()
                    .openAll(),

        close:
            (id) =>
                getBirthdayGiftsManager()
                    .closeGift(id),

        reset:
            () =>
                getBirthdayGiftsManager()
                    .reset(),

        config:
            () =>
                ({
                    ...getBirthdayGiftsManager()
                        .config
                })
    });


/* ============================================================================
 * END OF FILE
 * ============================================================================
 */