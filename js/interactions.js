/**
 * ============================================================================
 * SEHRISH BIRTHDAY EXPERIENCE
 * ============================================================================
 * File       : js/interactions.js
 * Project    : sehrish-birthday
 * Version    : 1.0.0
 *
 * Purpose:
 * - Centralized interaction layer for the birthday website
 * - Pointer / touch / mouse enhancements
 * - Click delegation
 * - Button feedback
 * - Ripple effects
 * - Press states
 * - Card tilt effects
 * - Magnetic-style micro interactions
 * - Hover handling
 * - Focus handling
 * - Keyboard accessibility helpers
 * - Clipboard support
 * - Copy/share interaction hooks
 * - Long-press detection
 * - Double-tap detection
 * - Scene-aware interaction lifecycle
 * - Reduced-motion support
 * - Mobile-safe behavior
 * - Passive event optimization
 * - Dynamic DOM support through event delegation
 * - Integration hooks for audio.js
 * - Integration hooks for app.js
 * - Integration hooks for gifts.js / cake.js / balloon-game.js
 * - Toast/status notifications
 * - CSS custom-property based pointer coordinates
 * - Safe cleanup and destroy lifecycle
 *
 * IMPORTANT:
 * This module intentionally does not hard-code visual styling.
 * Final appearance remains controlled by css/style.css.
 *
 * Audio effects are also not hard-coded. The audio engine is contacted only
 * through optional hooks, allowing the final sound design to be selected
 * scene-by-scene later.
 * ============================================================================
 */

'use strict';


/* ============================================================================
 * CONFIGURATION
 * ========================================================================== */

const INTERACTIONS_CONFIG = Object.freeze({
    name: 'Sehrish Birthday Interaction Engine',
    version: '1.0.0',

    selectors: Object.freeze({
        interactionRoot: [
            '[data-interactions]',
            '[data-interaction-root]',
            '.interaction-root'
        ],

        ripple: [
            '[data-ripple]',
            '.ripple-effect'
        ],

        tilt: [
            '[data-tilt]',
            '.interactive-tilt',
            '.tilt-card'
        ],

        magnetic: [
            '[data-magnetic]',
            '.magnetic-button'
        ],

        hover: [
            '[data-hover]',
            '.interactive-hover'
        ],

        copy: [
            '[data-copy]',
            '[data-action="copy"]'
        ],

        share: [
            '[data-share]',
            '[data-action="share"]'
        ],

        email: [
            '[data-email]',
            '[data-action="email"]'
        ],

        sound: [
            '[data-interaction-sound]',
            '[data-sfx]'
        ],

        longPress: [
            '[data-long-press]'
        ],

        doubleTap: [
            '[data-double-tap]'
        ],

        disableInteraction: [
            '[data-interaction-disabled]'
        ],

        cursorFollower: [
            '[data-cursor-follower]'
        ]
    }),

    defaults: Object.freeze({
        rippleDuration: 620,

        tiltMaxRotation: 5,
        tiltPerspective: 900,
        tiltScale: 1.015,

        magneticStrength: 0.18,
        magneticMaxDistance: 30,

        hoverTransition: 220,

        longPressDuration: 650,
        doubleTapDelay: 300,

        pointerUpdateInterval: 16,

        clickFeedbackDuration: 150,

        copiedMessage: 'Copied!',

        shareMessage: 'Share link copied.',

        invalidActionMessage: 'This action is not available right now.',

        reducedMotionRespect: true,

        enableCursorEffects: true,

        enableTiltOnTouch: false,

        enableMagneticOnTouch: false,

        enableRipple: true,

        enableClipboard: true,

        enableShare: true,

        enableKeyboardEnhancements: true,

        preventDoubleSubmit: true
    }),

    classes: Object.freeze({
        initialized: 'interactions-initialized',

        pointerActive: 'pointer-active',

        pressed: 'interaction-pressed',

        hover: 'interaction-hover',

        focusVisible: 'interaction-focus-visible',

        copied: 'interaction-copied',

        sharing: 'interaction-sharing',

        blocked: 'interaction-blocked',

        longPressed: 'interaction-long-pressed',

        doubleTapped: 'interaction-double-tapped',

        tiltActive: 'interaction-tilt-active',

        magneticActive: 'interaction-magnetic-active',

        hasPointer: 'has-pointer',

        hasTouch: 'has-touch',

        reducedMotion: 'interaction-reduced-motion'
    }),

    events: Object.freeze({
        initialized: 'interactions:initialized',

        pointerMove: 'interaction:pointer-move',

        pointerDown: 'interaction:pointer-down',

        pointerUp: 'interaction:pointer-up',

        click: 'interaction:click',

        ripple: 'interaction:ripple',

        tilt: 'interaction:tilt',

        magnetic: 'interaction:magnetic',

        copy: 'interaction:copy',

        share: 'interaction:share',

        longPress: 'interaction:long-press',

        doubleTap: 'interaction:double-tap',

        error: 'interaction:error',

        destroyed: 'interactions:destroyed'
    }),

    audio: Object.freeze({
        enabled: true,

        /*
         * Intentionally empty.
         * Sound choice will be finalized later.
         */
        click: '',
        ripple: '',
        copy: '',
        share: '',
        longPress: ''
    })
});


/* ============================================================================
 * UTILITY HELPERS
 * ========================================================================== */

/**
 * Normalize selectors.
 *
 * @param {string|string[]} selectors
 * @returns {string[]}
 */
function interactionNormalizeSelectors(
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
 * Query the first matching element.
 *
 * @param {string|string[]} selectors
 * @param {ParentNode} root
 * @returns {Element|null}
 */
function interactionQueryFirst(
    selectors,
    root = document
) {
    const list =
        interactionNormalizeSelectors(
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
                '[Interactions] Invalid selector:',
                selector,
                error
            );
        }
    }

    return null;
}


/**
 * Query all unique matching elements.
 *
 * @param {string|string[]} selectors
 * @param {ParentNode} root
 * @returns {Element[]}
 */
function interactionQueryAll(
    selectors,
    root = document
) {
    const list =
        interactionNormalizeSelectors(
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
                '[Interactions] Invalid selector:',
                selector,
                error
            );
        }
    });

    return output;
}


/**
 * Clamp number.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function interactionClamp(
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
 * Reduced motion preference.
 *
 * @returns {boolean}
 */
function interactionReducedMotion() {
    if (
        !INTERACTIONS_CONFIG
            .defaults
            .reducedMotionRespect
    ) {
        return false;
    }

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
 * Touch-capable device detection.
 *
 * @returns {boolean}
 */
function interactionHasTouch() {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
    );
}


/**
 * Delay helper.
 *
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function interactionWait(
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
function interactionCreateId() {
    return (
        'interaction-' +
        Date.now().toString(36) +
        '-' +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );
}


/**
 * Dispatch CustomEvent.
 *
 * @param {string} eventName
 * @param {*} detail
 */
function interactionDispatchEvent(
    eventName,
    detail = {}
) {
    try {
        document.dispatchEvent(
            new CustomEvent(
                eventName,
                {
                    detail
                }
            )
        );
    } catch {
        // Gracefully ignore unsupported environments.
    }
}


/**
 * Safely call a function.
 *
 * @param {Function} callback
 * @param {*} fallback
 * @returns {*}
 */
function interactionSafeCall(
    callback,
    fallback = undefined
) {
    try {
        if (
            typeof callback === 'function'
        ) {
            return callback();
        }
    } catch (error) {
        console.error(
            '[Interactions] Callback error:',
            error
        );
    }

    return fallback;
}


/* ============================================================================
 * EVENT BUS
 * ========================================================================== */

class InteractionEventBus {
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
                handler(
                    ...args
                );
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
                        '[Interactions] Event error:',
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
 * RIPPLE EFFECT MANAGER
 * ========================================================================== */

class InteractionRippleManager {
    constructor(
        manager
    ) {
        this.manager =
            manager;

        this.ripples =
            new Set();
    }

    create(
        target,
        event
    ) {
        if (
            !INTERACTIONS_CONFIG
                .defaults
                .enableRipple
        ) {
            return null;
        }

        if (
            interactionReducedMotion()
        ) {
            return null;
        }

        if (
            !target ||
            !(target instanceof Element)
        ) {
            return null;
        }

        if (
            target.matches(
                '[data-ripple="false"]'
            )
        ) {
            return null;
        }

        /*
         * Avoid ripple on inputs, videos, links that opt out,
         * and already-created ripple child elements.
         */
        if (
            target.matches(
                'input, textarea, select, video, audio'
            )
        ) {
            return null;
        }

        const rect =
            target.getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return null;
        }

        const ripple =
            document.createElement(
                'span'
            );

        ripple.className =
            'interaction-ripple';

        ripple.dataset.rippleId =
            interactionCreateId();

        ripple.setAttribute(
            'aria-hidden',
            'true'
        );

        const clientX =
            Number(
                event?.clientX
            );

        const clientY =
            Number(
                event?.clientY
            );

        const localX =
            Number.isFinite(
                clientX
            )
                ? clientX -
                    rect.left
                : rect.width / 2;

        const localY =
            Number.isFinite(
                clientY
            )
                ? clientY -
                    rect.top
                : rect.height / 2;

        const diameter =
            Math.max(
                rect.width,
                rect.height
            ) *
            2.2;

        ripple.style.width =
            `${diameter}px`;

        ripple.style.height =
            `${diameter}px`;

        ripple.style.left =
            `${localX - diameter / 2}px`;

        ripple.style.top =
            `${localY - diameter / 2}px`;

        ripple.style.setProperty(
            '--ripple-x',
            `${localX}px`
        );

        ripple.style.setProperty(
            '--ripple-y',
            `${localY}px`
        );

        /*
         * Ensure ripple can remain inside the target without affecting
         * the interaction model.
         */
        const computedPosition =
            window.getComputedStyle(
                target
            ).position;

        if (
            computedPosition ===
                'static'
        ) {
            target.style.position =
                'relative';
        }

        /*
         * Prevent ripple from intercepting pointer events.
         */
        ripple.style.pointerEvents =
            'none';

        // target.appendChild(
        //     ripple
        // );

        this.ripples.add(
            ripple
        );

        target.classList.add(
            'has-ripple'
        );

        const duration =
            INTERACTIONS_CONFIG
                .defaults
                .rippleDuration;

        const cleanup =
            () => {
                this.remove(
                    ripple
                );
            };

        ripple.addEventListener(
            'animationend',
            cleanup,
            {
                once: true
            }
        );

        window.setTimeout(
            cleanup,
            duration + 250
        );

        this.manager.emit(
            INTERACTIONS_CONFIG
                .events
                .ripple,
            {
                target,
                ripple,
                x:
                    localX,
                y:
                    localY
            }
        );

        this.manager.playInteractionAudio(
            'ripple'
        );

        return ripple;
    }

    remove(
        ripple
    ) {
        if (!ripple) {
            return;
        }

        this.ripples.delete(
            ripple
        );

        try {
            ripple.remove();
        } catch {
            // Ignore DOM cleanup errors.
        }
    }

    clear() {
        [
            ...this.ripples
        ].forEach(
            (ripple) => {
                this.remove(
                    ripple
                );
            }
        );

        this.ripples.clear();
    }
}


/* ============================================================================
 * TILT INTERACTION MANAGER
 * ========================================================================== */

class InteractionTiltManager {
    constructor(
        manager
    ) {
        this.manager =
            manager;

        this.active =
            new Map();
    }

    shouldEnable(
        element
    ) {
        if (
            !element
        ) {
            return false;
        }

        if (
            interactionReducedMotion()
        ) {
            return false;
        }

        if (
            interactionHasTouch() &&
            !INTERACTIONS_CONFIG
                .defaults
                .enableTiltOnTouch
        ) {
            return false;
        }

        return true;
    }

    pointerEnter(
        element
    ) {
        if (
            !this.shouldEnable(
                element
            )
        ) {
            return;
        }

        element.classList.add(
            INTERACTIONS_CONFIG
                .classes
                .tiltActive
        );

        element.style.setProperty(
            '--tilt-perspective',
            `${INTERACTIONS_CONFIG.defaults.tiltPerspective}px`
        );
    }

    move(
        element,
        event
    ) {
        if (
            !this.shouldEnable(
                element
            )
        ) {
            return;
        }

        const rect =
            element.getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }

        const relativeX =
            interactionClamp(
                (
                    event.clientX -
                    rect.left
                ) /
                rect.width,
                0,
                1
            );

        const relativeY =
            interactionClamp(
                (
                    event.clientY -
                    rect.top
                ) /
                rect.height,
                0,
                1
            );

        const normalizedX =
            (
                relativeX -
                0.5
            ) *
            2;

        const normalizedY =
            (
                relativeY -
                0.5
            ) *
            2;

        const maxRotation =
            Number(
                element.dataset
                    .tiltMax ||
                INTERACTIONS_CONFIG
                    .defaults
                    .tiltMaxRotation
            );

        const rotateX =
            -normalizedY *
            maxRotation;

        const rotateY =
            normalizedX *
            maxRotation;

        const scale =
            Number(
                element.dataset
                    .tiltScale ||
                INTERACTIONS_CONFIG
                    .defaults
                    .tiltScale
            );

        element.style.setProperty(
            '--tilt-x',
            `${rotateX}deg`
        );

        element.style.setProperty(
            '--tilt-y',
            `${rotateY}deg`
        );

        element.style.setProperty(
            '--tilt-scale',
            String(
                interactionClamp(
                    scale,
                    1,
                    1.08
                )
            )
        );

        element.style.transform =
            `perspective(${INTERACTIONS_CONFIG.defaults.tiltPerspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${interactionClamp(scale, 1, 1.08)})`;

        this.active.set(
            element,
            {
                x:
                    rotateX,
                y:
                    rotateY
            }
        );

        this.manager.emit(
            INTERACTIONS_CONFIG
                .events
                .tilt,
            {
                element,
                rotateX,
                rotateY,
                scale
            }
        );
    }

    leave(
        element
    ) {
        if (
            !element
        ) {
            return;
        }

        element.classList.remove(
            INTERACTIONS_CONFIG
                .classes
                .tiltActive
        );

        element.style.transform =
            '';

        element.style.removeProperty(
            '--tilt-x'
        );

        element.style.removeProperty(
            '--tilt-y'
        );

        element.style.removeProperty(
            '--tilt-scale'
        );

        this.active.delete(
            element
        );
    }

    resetAll() {
        [
            ...this.active.keys()
        ].forEach(
            (element) => {
                this.leave(
                    element
                );
            }
        );
    }
}


/* ============================================================================
 * MAGNETIC INTERACTION MANAGER
 * ========================================================================== */

class InteractionMagneticManager {
    constructor(
        manager
    ) {
        this.manager =
            manager;

        this.active =
            new Map();
    }

    shouldEnable(
        element
    ) {
        if (
            !element
        ) {
            return false;
        }

        if (
            interactionReducedMotion()
        ) {
            return false;
        }

        if (
            interactionHasTouch() &&
            !INTERACTIONS_CONFIG
                .defaults
                .enableMagneticOnTouch
        ) {
            return false;
        }

        return true;
    }

    move(
        element,
        event
    ) {
        if (
            !this.shouldEnable(
                element
            )
        ) {
            return;
        }

        const rect =
            element.getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }

        const centerX =
            rect.left +
            rect.width /
            2;

        const centerY =
            rect.top +
            rect.height /
            2;

        const dx =
            event.clientX -
            centerX;

        const dy =
            event.clientY -
            centerY;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        const maxDistance =
            Number(
                element.dataset
                    .magneticDistance ||
                INTERACTIONS_CONFIG
                    .defaults
                    .magneticMaxDistance
            );

        if (
            distance >
            maxDistance
        ) {
            this.reset(
                element
            );

            return;
        }

        const strength =
            interactionClamp(
                Number(
                    element.dataset
                        .magneticStrength ||
                    INTERACTIONS_CONFIG
                        .defaults
                        .magneticStrength
                ),
                0,
                0.5
            );

        const translateX =
            dx *
            strength;

        const translateY =
            dy *
            strength;

        element.style.setProperty(
            '--magnetic-x',
            `${translateX}px`
        );

        element.style.setProperty(
            '--magnetic-y',
            `${translateY}px`
        );

        element.style.transform =
            `translate3d(${translateX}px, ${translateY}px, 0)`;

        element.classList.add(
            INTERACTIONS_CONFIG
                .classes
                .magneticActive
        );

        this.active.set(
            element,
            {
                x:
                    translateX,
                y:
                    translateY
            }
        );

        this.manager.emit(
            INTERACTIONS_CONFIG
                .events
                .magnetic,
            {
                element,
                translateX,
                translateY,
                distance
            }
        );
    }

    reset(
        element
    ) {
        if (
            !element
        ) {
            return;
        }

        element.style.removeProperty(
            '--magnetic-x'
        );

        element.style.removeProperty(
            '--magnetic-y'
        );

        element.style.transform =
            '';

        element.classList.remove(
            INTERACTIONS_CONFIG
                .classes
                .magneticActive
        );

        this.active.delete(
            element
        );
    }

    resetAll() {
        [
            ...this.active.keys()
        ].forEach(
            (element) => {
                this.reset(
                    element
                );
            }
        );
    }
}


/* ============================================================================
 * PRESS STATE MANAGER
 * ========================================================================== */

class InteractionPressManager {
    constructor(
        manager
    ) {
        this.manager =
            manager;

        this.active =
            new Set();
    }

    press(
        element
    ) {
        if (
            !element
        ) {
            return;
        }

        element.classList.add(
            INTERACTIONS_CONFIG
                .classes
                .pressed
        );

        this.active.add(
            element
        );

        this.manager.emit(
            INTERACTIONS_CONFIG
                .events
                .pointerDown,
            {
                element
            }
        );
    }

    release(
        element
    ) {
        if (
            !element
        ) {
            return;
        }

        element.classList.remove(
            INTERACTIONS_CONFIG
                .classes
                .pressed
        );

        this.active.delete(
            element
        );

        this.manager.emit(
            INTERACTIONS_CONFIG
                .events
                .pointerUp,
            {
                element
            }
        );
    }

    clear() {
        [
            ...this.active
        ].forEach(
            (element) => {
                this.release(
                    element
                );
            }
        );

        this.active.clear();
    }
}


/* ============================================================================
 * LONG PRESS TRACKER
 * ========================================================================== */

class LongPressTracker {
    constructor(
        manager
    ) {
        this.manager =
            manager;

        this.entries =
            new Map();
    }

    start(
        element,
        event
    ) {
        if (
            !element.matches(
                '[data-long-press]'
            )
        ) {
            return;
        }

        this.cancel(
            element
        );

        const duration =
            Math.max(
                250,
                Number(
                    element.dataset
                        .longPressDuration ||
                    INTERACTIONS_CONFIG
                        .defaults
                        .longPressDuration
                )
            );

        const timer =
            window.setTimeout(
                () => {
                    this.entries.delete(
                        element
                    );

                    element.classList.add(
                        INTERACTIONS_CONFIG
                            .classes
                            .longPressed
                    );

                    this.manager.playInteractionAudio(
                        'longPress'
                    );

                    this.manager.emit(
                        INTERACTIONS_CONFIG
                            .events
                            .longPress,
                        {
                            element,
                            event
                        }
                    );

                    interactionDispatchEvent(
                        'interaction:long-press',
                        {
                            element,
                            event
                        }
                    );
                },
                duration
            );

        this.entries.set(
            element,
            {
                timer,
                startedAt:
                    performance.now()
            }
        );
    }

    cancel(
        element
    ) {
        const entry =
            this.entries.get(
                element
            );

        if (
            !entry
        ) {
            return;
        }

        window.clearTimeout(
            entry.timer
        );

        this.entries.delete(
            element
        );
    }

    cancelAll() {
        this.entries.forEach(
            (entry) => {
                window.clearTimeout(
                    entry.timer
                );
            }
        );

        this.entries.clear();
    }
}


/* ============================================================================
 * DOUBLE-TAP TRACKER
 * ========================================================================== */

class DoubleTapTracker {
    constructor(
        manager
    ) {
        this.manager =
            manager;

        this.lastTap =
            new WeakMap();

        this.timers =
            new Set();
    }

    handle(
        element,
        event
    ) {
        if (
            !element.matches(
                '[data-double-tap]'
            )
        ) {
            return false;
        }

        const now =
            performance.now();

        const previous =
            this.lastTap.get(
                element
            );

        this.lastTap.set(
            element,
            {
                time:
                    now,
                x:
                    event?.clientX || 0,
                y:
                    event?.clientY || 0
            }
        );

        if (
            !previous
        ) {
            this.scheduleClear(
                element
            );

            return false;
        }

        const delta =
            now -
            previous.time;

        if (
            delta >
            INTERACTIONS_CONFIG
                .defaults
                .doubleTapDelay
        ) {
            this.scheduleClear(
                element
            );

            return false;
        }

        element.classList.add(
            INTERACTIONS_CONFIG
                .classes
                .doubleTapped
        );

        this.manager.emit(
            INTERACTIONS_CONFIG
                .events
                .doubleTap,
            {
                element,
                event
            }
        );

        interactionDispatchEvent(
            'interaction:double-tap',
            {
                element,
                event
            }
        );

        window.setTimeout(
            () => {
                element.classList.remove(
                    INTERACTIONS_CONFIG
                        .classes
                        .doubleTapped
                );
            },
            220
        );

        return true;
    }

    scheduleClear(
        element
    ) {
        const timer =
            window.setTimeout(
                () => {
                    this.lastTap.delete(
                        element
                    );

                    this.timers.delete(
                        timer
                    );
                },
                INTERACTIONS_CONFIG
                    .defaults
                    .doubleTapDelay
            );

        this.timers.add(
            timer
        );
    }

    clear() {
        this.timers.forEach(
            (timer) => {
                window.clearTimeout(
                    timer
                );
            }
        );

        this.timers.clear();

        /*
         * WeakMap does not require explicit cleanup.
         */
    }
}


/* ============================================================================
 * MAIN INTERACTION MANAGER
 * ========================================================================== */

class BirthdayInteractionsManager {
    constructor() {
        this.name =
            INTERACTIONS_CONFIG.name;

        this.version =
            INTERACTIONS_CONFIG.version;

        this.config =
            {
                ...INTERACTIONS_CONFIG
                    .defaults
            };

        this.app =
            null;

        this.audio =
            null;

        this.root =
            null;

        this.events =
            new InteractionEventBus();

        this.ripple =
            new InteractionRippleManager(
                this
            );

        this.tilt =
            new InteractionTiltManager(
                this
            );

        this.magnetic =
            new InteractionMagneticManager(
                this
            );

        this.press =
            new InteractionPressManager(
                this
            );

        this.longPress =
            new LongPressTracker(
                this
            );

        this.doubleTap =
            new DoubleTapTracker(
                this
            );

        this.initialized =
            false;

        this.destroyed =
            false;

        this.pointerSupported =
            typeof PointerEvent !==
            'undefined';

        this.pointerType =
            null;

        this.lastPointerUpdate =
            0;

        this.cursorElements =
            [];

        this.focusedElement =
            null;

        this.actionLocks =
            new WeakMap();

        this.lastClickAt =
            0;

        this.lastClickTarget =
            null;

        this.boundHandlers =
            {
                pointerMove:
                    this.handlePointerMove
                        .bind(this),

                pointerDown:
                    this.handlePointerDown
                        .bind(this),

                pointerUp:
                    this.handlePointerUp
                        .bind(this),

                pointerCancel:
                    this.handlePointerCancel
                        .bind(this),

                pointerEnter:
                    this.handlePointerEnter
                        .bind(this),

                pointerLeave:
                    this.handlePointerLeave
                        .bind(this),

                click:
                    this.handleClick
                        .bind(this),

                focusIn:
                    this.handleFocusIn
                        .bind(this),

                focusOut:
                    this.handleFocusOut
                        .bind(this),

                keyDown:
                    this.handleKeyDown
                        .bind(this),

                contextMenu:
                    this.handleContextMenu
                        .bind(this),

                windowPointerMove:
                    this.handleWindowPointerMove
                        .bind(this),

                windowPointerUp:
                    this.handleWindowPointerUp
                        .bind(this),

                visibility:
                    this.handleVisibility
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

        this.findRoot();

        this.detectCapabilities();

        this.bindEvents();

        this.discoverCursorElements();

        this.setupRootState();

        this.initialized =
            true;

        if (
            this.root
        ) {
            this.root.classList.add(
                INTERACTIONS_CONFIG
                    .classes
                    .initialized
            );
        }

        this.emit(
            INTERACTIONS_CONFIG
                .events
                .initialized,
            {
                available:
                    Boolean(
                        this.root
                    ),

                touch:
                    interactionHasTouch(),

                reducedMotion:
                    interactionReducedMotion(),

                pointer:
                    this.pointerSupported
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


    findRoot() {
        this.root =
            interactionQueryFirst(
                INTERACTIONS_CONFIG
                    .selectors
                    .interactionRoot
            );

        /*
         * The document itself remains a valid interaction surface.
         */
        if (
            !this.root
        ) {
            this.root =
                document.body;
        }
    }


    detectCapabilities() {
        document.documentElement.classList.toggle(
            INTERACTIONS_CONFIG
                .classes
                .hasTouch,
            interactionHasTouch()
        );

        document.documentElement.classList.toggle(
            INTERACTIONS_CONFIG
                .classes
                .reducedMotion,
            interactionReducedMotion()
        );

        document.documentElement.dataset.interactionPointer =
            this.pointerSupported
                ? 'pointer'
                : 'legacy';
    }


    setupRootState() {
        if (
            !this.root
        ) {
            return;
        }

        this.root.dataset.interactionsReady =
            'true';

        this.root.dataset.interactionVersion =
            this.version;
    }


    /* ========================================================================
     * EVENT BINDING
     * ====================================================================== */

    bindEvents() {
        const target =
            this.root ||
            document;

        target.addEventListener(
            'pointermove',
            this.boundHandlers
                .pointerMove,
            {
                passive: true
            }
        );

        target.addEventListener(
            'pointerdown',
            this.boundHandlers
                .pointerDown,
            {
                passive: false
            }
        );

        target.addEventListener(
            'pointerup',
            this.boundHandlers
                .pointerUp,
            {
                passive: false
            }
        );

        target.addEventListener(
            'pointercancel',
            this.boundHandlers
                .pointerCancel,
            {
                passive: true
            }
        );

        target.addEventListener(
            'pointerenter',
            this.boundHandlers
                .pointerEnter,
            true
        );

        target.addEventListener(
            'pointerleave',
            this.boundHandlers
                .pointerLeave,
            true
        );

        target.addEventListener(
            'click',
            this.boundHandlers
                .click
        );

        target.addEventListener(
            'focusin',
            this.boundHandlers
                .focusIn
        );

        target.addEventListener(
            'focusout',
            this.boundHandlers
                .focusOut
        );

        if (
            this.config.enableKeyboardEnhancements
        ) {
            target.addEventListener(
                'keydown',
                this.boundHandlers
                    .keyDown
            );
        }

        target.addEventListener(
            'contextmenu',
            this.boundHandlers
                .contextMenu
        );

        window.addEventListener(
            'pointermove',
            this.boundHandlers
                .windowPointerMove,
            {
                passive: true
            }
        );

        window.addEventListener(
            'pointerup',
            this.boundHandlers
                .windowPointerUp,
            {
                passive: true
            }
        );

        document.addEventListener(
            'visibilitychange',
            this.boundHandlers
                .visibility
        );

        if (
            this.app?.events
        ) {
            this.app.events.on(
                'scene:changed',
                this.boundHandlers
                    .sceneChanged
            );

            this.app.events.on(
                'viewport:change',
                () => {
                    this.detectCapabilities();
                    this.discoverCursorElements();
                }
            );
        }
    }


    /* ========================================================================
     * POINTER MOVE
     * ====================================================================== */

    handlePointerMove(
        event
    ) {
        if (
            !event
        ) {
            return;
        }

        this.pointerType =
            event.pointerType ||
            null;

        const now =
            performance.now();

        if (
            now -
            this.lastPointerUpdate <
            INTERACTIONS_CONFIG
                .defaults
                .pointerUpdateInterval
        ) {
            return;
        }

        this.lastPointerUpdate =
            now;

        const target =
            event.target instanceof Element
                ? event.target
                : null;

        if (
            !target
        ) {
            return;
        }

        const tiltElement =
            target.closest(
                INTERACTIONS_CONFIG
                    .selectors
                    .tilt
                    .join(',')
            );

        const magneticElement =
            target.closest(
                INTERACTIONS_CONFIG
                    .selectors
                    .magnetic
                    .join(',')
            );

        if (
            tiltElement
        ) {
            this.tilt.move(
                tiltElement,
                event
            );
        }

        if (
            magneticElement
        ) {
            this.magnetic.move(
                magneticElement,
                event
            );
        }

        this.updateCursorCoordinates(
            event
        );

        this.emit(
            INTERACTIONS_CONFIG
                .events
                .pointerMove,
            {
                event,
                target
            }
        );
    }


    handleWindowPointerMove(
        event
    ) {
        if (
            !this.config
                .enableCursorEffects
        ) {
            return;
        }

        if (
            interactionReducedMotion()
        ) {
            return;
        }

        this.updateCursorCoordinates(
            event
        );
    }


    updateCursorCoordinates(
        event
    ) {
        if (
            !this.root
        ) {
            return;
        }

        if (
            !this.cursorElements
                .length
        ) {
            return;
        }

        const x =
            Number(
                event.clientX
            ) || 0;

        const y =
            Number(
                event.clientY
            ) || 0;

        this.root.style.setProperty(
            '--pointer-x',
            `${x}px`
        );

        this.root.style.setProperty(
            '--pointer-y',
            `${y}px`
        );

        const width =
            window.innerWidth ||
            1;

        const height =
            window.innerHeight ||
            1;

        const normalizedX =
            interactionClamp(
                x /
                width,
                0,
                1
            );

        const normalizedY =
            interactionClamp(
                y /
                height,
                0,
                1
            );

        this.root.style.setProperty(
            '--pointer-x-normalized',
            String(
                normalizedX
            )
        );

        this.root.style.setProperty(
            '--pointer-y-normalized',
            String(
                normalizedY
            )
        );

        this.cursorElements.forEach(
            (element) => {
                element.style.setProperty(
                    '--cursor-x',
                    `${x}px`
                );

                element.style.setProperty(
                    '--cursor-y',
                    `${y}px`
                );

                element.style.setProperty(
                    '--cursor-x-normalized',
                    String(
                        normalizedX
                    )
                );

                element.style.setProperty(
                    '--cursor-y-normalized',
                    String(
                        normalizedY
                    )
                );
            }
        );
    }


    /* ========================================================================
     * POINTER DOWN
     * ====================================================================== */

    handlePointerDown(
        event
    ) {
        if (
            !event
        ) {
            return;
        }

        this.pointerType =
            event.pointerType ||
            null;

        const target =
            event.target instanceof Element
                ? event.target
                : null;

        if (
            !target
        ) {
            return;
        }

        const interactive =
            this.findInteractiveTarget(
                target
            );

        if (
            interactive
        ) {
            this.press.press(
                interactive
            );

            if (
                this.config
                    .enableRipple
            ) {
                this.ripple.create(
                    interactive,
                    event
                );
            }

            this.longPress.start(
                interactive,
                event
            );

            this.doubleTap.handle(
                interactive,
                event
            );
        }

        if (
            target.matches(
                'button, [role="button"], a'
            )
        ) {
            this.emit(
                INTERACTIONS_CONFIG
                    .events
                    .pointerDown,
                {
                    event,
                    target
                }
            );
        }

        /*
         * Pointer capture keeps drag/press state stable when the pointer
         * temporarily leaves a small button.
         */
        try {
            if (
                target.setPointerCapture &&
                Number.isFinite(
                    event.pointerId
                )
            ) {
                target.setPointerCapture(
                    event.pointerId
                );
            }
        } catch {
            // Pointer capture is optional.
        }

        /*
         * On touch devices we prevent accidental browser behavior only for
         * explicitly interactive areas.
         */
        if (
            event.pointerType ===
                'touch' &&
            interactive &&
            interactive.dataset
                .interactionScroll ===
                'lock'
        ) {
            event.preventDefault();
        }
    }


    /* ========================================================================
     * POINTER UP
     * ====================================================================== */

    handlePointerUp(
        event
    ) {
        const target =
            event?.target instanceof Element
                ? event.target
                : null;

        if (
            !target
        ) {
            return;
        }

        const interactive =
            this.findInteractiveTarget(
                target
            );

        if (
            interactive
        ) {
            this.press.release(
                interactive
            );

            this.longPress.cancel(
                interactive
            );

            this.resetElementTransforms(
                interactive
            );
        }

        this.emit(
            INTERACTIONS_CONFIG
                .events
                .pointerUp,
            {
                event,
                target: interactive ||
                    target
            }
        );
    }


    handlePointerCancel(
        event
    ) {
        const target =
            event?.target instanceof Element
                ? event.target
                : null;

        if (
            !target
        ) {
            return;
        }

        const interactive =
            this.findInteractiveTarget(
                target
            );

        if (
            interactive
        ) {
            this.press.release(
                interactive
            );

            this.longPress.cancel(
                interactive
            );

            this.tilt.leave(
                interactive
            );

            this.magnetic.reset(
                interactive
            );
        }
    }


    handleWindowPointerUp() {
        this.press.clear();
        this.longPress.cancelAll();
    }


    /* ========================================================================
     * POINTER ENTER / LEAVE
     * ====================================================================== */

    handlePointerEnter(
        event
    ) {
        const target =
            event.target instanceof Element
                ? event.target
                : null;

        if (
            !target
        ) {
            return;
        }

        const tiltElement =
            target.closest(
                INTERACTIONS_CONFIG
                    .selectors
                    .tilt
                    .join(',')
            );

        if (
            tiltElement
        ) {
            this.tilt.pointerEnter(
                tiltElement
            );
        }

        const hoverElement =
            target.closest(
                INTERACTIONS_CONFIG
                    .selectors
                    .hover
                    .join(',')
            );

        if (
            hoverElement
        ) {
            hoverElement.classList.add(
                INTERACTIONS_CONFIG
                    .classes
                    .hover
            );
        }
    }


    handlePointerLeave(
        event
    ) {
        const target =
            event.target instanceof Element
                ? event.target
                : null;

        if (
            !target
        ) {
            return;
        }

        const tiltElement =
            target.closest(
                INTERACTIONS_CONFIG
                    .selectors
                    .tilt
                    .join(',')
            );

        if (
            tiltElement
        ) {
            this.tilt.leave(
                tiltElement
            );
        }

        const magneticElement =
            target.closest(
                INTERACTIONS_CONFIG
                    .selectors
                    .magnetic
                    .join(',')
            );

        if (
            magneticElement
        ) {
            this.magnetic.reset(
                magneticElement
            );
        }

        const hoverElement =
            target.closest(
                INTERACTIONS_CONFIG
                    .selectors
                    .hover
                    .join(',')
            );

        if (
            hoverElement
        ) {
            hoverElement.classList.remove(
                INTERACTIONS_CONFIG
                    .classes
                    .hover
            );
        }

        this.press.release(
            target
        );

        this.longPress.cancel(
            target
        );
    }


    /* ========================================================================
     * CLICK HANDLING
     * ====================================================================== */

    handleClick(
        event
    ) {
        const target =
            event.target instanceof Element
                ? event.target
                : null;

        if (
            !target
        ) {
            return;
        }

        const actionElement =
            target.closest(
                '[data-action], ' +
                '[data-copy], ' +
                '[data-share], ' +
                '[data-email], ' +
                '[data-sfx], ' +
                '[data-interaction-action]'
            );

        const interactive =
            this.findInteractiveTarget(
                target
            );

        if (
            interactive
        ) {
            this.playInteractionAudio(
                interactive.dataset
                    .interactionSound ||
                interactive.dataset
                    .sfx ||
                'click'
            );

            this.addClickFeedback(
                interactive
            );
        }

        if (
            actionElement
        ) {
            this.handleDataAction(
                actionElement,
                event
            );
        }

        const now =
            performance.now();

        if (
            interactive &&
            this.config
                .preventDoubleSubmit &&
            (
                interactive.tagName ===
                    'BUTTON' ||
                interactive.matches(
                    '[role="button"]'
                )
            )
        ) {
            if (
                this.lastClickTarget ===
                    interactive &&
                (
                    now -
                    this.lastClickAt
                ) <
                    90
            ) {
                event.preventDefault();

                return;
            }

            this.lastClickTarget =
                interactive;

            this.lastClickAt =
                now;
        }

        this.emit(
            INTERACTIONS_CONFIG
                .events
                .click,
            {
                event,
                target,
                interactive,
                actionElement
            }
        );
    }


    handleDataAction(
        element,
        event
    ) {
        if (
            element.hasAttribute(
                'data-copy'
            ) ||
            element.matches(
                INTERACTIONS_CONFIG
                    .selectors
                    .copy
                    .join(',')
            )
        ) {
            this.handleCopyAction(
                element,
                event
            );

            return;
        }

        if (
            element.hasAttribute(
                'data-share'
            ) ||
            element.matches(
                INTERACTIONS_CONFIG
                    .selectors
                    .share
                    .join(',')
            )
        ) {
            this.handleShareAction(
                element,
                event
            );

            return;
        }

        if (
            element.hasAttribute(
                'data-email'
            ) ||
            element.matches(
                INTERACTIONS_CONFIG
                    .selectors
                    .email
                    .join(',')
            )
        ) {
            this.handleEmailAction(
                element,
                event
            );

            return;
        }

        const action =
            element.dataset
                .interactionAction ||
            element.dataset
                .action;

        if (
            action
        ) {
            this.executeCustomAction(
                action,
                element,
                event
            );
        }
    }


    /* ========================================================================
     * ACTION ROUTING
     * ====================================================================== */

    executeCustomAction(
        action,
        element,
        event
    ) {
        switch (
            String(action)
                .trim()
                .toLowerCase()
        ) {
            case 'copy':
                this.handleCopyAction(
                    element,
                    event
                );
                break;

            case 'share':
                this.handleShareAction(
                    element,
                    event
                );
                break;

            case 'email':
                this.handleEmailAction(
                    element,
                    event
                );
                break;

            case 'ripple':
                this.ripple.create(
                    element,
                    event
                );
                break;
            
                            case 'open-note': {
                event.preventDefault();

                const envelope =
                    document.getElementById(
                        'birthday-envelope'
                    );

                const note =
                    document.getElementById(
                        'birthday-note-content'
                    );

                if (!envelope || !note) {
                    return;
                }

                envelope.classList.add(
                    'is-open'
                );

                const envelopeButton =
                    envelope.querySelector(
                        '.envelope-button'
                    );

                if (envelopeButton) {
                    envelopeButton.setAttribute(
                        'aria-expanded',
                        'true'
                    );
                }

                window.setTimeout(
                    () => {
                        note.classList.add(
                            'is-visible'
                        );

                        note.setAttribute(
                            'aria-hidden',
                            'false'
                        );
                    },
                    420
                );

                break;
            }


            default:
                this.emit(
                    'interaction:custom-action',
                    {
                        action,
                        element,
                        event
                    }
                );

                interactionDispatchEvent(
                    'interaction:custom-action',
                    {
                        action,
                        element,
                        event
                    }
                );

                break;
        }
    }


    /* ========================================================================
     * COPY
     * ====================================================================== */

    async handleCopyAction(
        element,
        event
    ) {
        const value =
            element.dataset.copy ||
            element.getAttribute(
                'data-copy-text'
            ) ||
            element.getAttribute(
                'data-text'
            ) ||
            element.textContent
                ?.trim() ||
            '';

        if (
            !value
        ) {
            this.notify(
                INTERACTIONS_CONFIG
                    .defaults
                    .invalidActionMessage
            );

            return false;
        }

        if (
            !this.config
                .enableClipboard
        ) {
            return false;
        }

        if (
            element.dataset
                .interactionLocked ===
            'true'
        ) {
            return false;
        }

        element.dataset.interactionLocked =
            'true';

        element.classList.add(
            INTERACTIONS_CONFIG
                .classes
                .sharing
        );

        try {
            await this.copyText(
                value
            );

            element.classList.add(
                INTERACTIONS_CONFIG
                    .classes
                    .copied
            );

            this.playInteractionAudio(
                'copy'
            );

            this.notify(
                element.dataset
                    .copyMessage ||
                INTERACTIONS_CONFIG
                    .defaults
                    .copiedMessage
            );

            this.emit(
                INTERACTIONS_CONFIG
                    .events
                    .copy,
                {
                    value,
                    element,
                    event
                }
            );

            await interactionWait(
                600
            );

            element.classList.remove(
                INTERACTIONS_CONFIG
                    .classes
                    .copied
            );

            return true;
        } catch (error) {
            console.warn(
                '[Interactions] Clipboard copy failed:',
                error
            );

            this.notify(
                'Unable to copy this right now.'
            );

            this.emit(
                INTERACTIONS_CONFIG
                    .events
                    .error,
                {
                    type:
                        'copy',
                    error
                }
            );

            return false;
        } finally {
            element.classList.remove(
                INTERACTIONS_CONFIG
                    .classes
                    .sharing
            );

            window.setTimeout(
                () => {
                    element.dataset
                        .interactionLocked =
                        'false';
                },
                150
            );
        }
    }


    async copyText(
        value
    ) {
        if (
            navigator.clipboard &&
            typeof
                navigator.clipboard
                    .writeText ===
                    'function'
        ) {
            await navigator.clipboard.writeText(
                String(value)
            );

            return true;
        }

        /*
         * Legacy fallback for browsers where Clipboard API is unavailable.
         */
        const textarea =
            document.createElement(
                'textarea'
            );

        textarea.value =
            String(value);

        textarea.setAttribute(
            'readonly',
            ''
        );

        textarea.style.position =
            'fixed';

        textarea.style.opacity =
            '0';

        textarea.style.pointerEvents =
            'none';

        document.body.appendChild(
            textarea
        );

        textarea.select();

        let successful =
            false;

        try {
            successful =
                document.execCommand(
                    'copy'
                );
        } finally {
            textarea.remove();
        }

        if (
            !successful
        ) {
            throw new Error(
                'Clipboard copy was not successful.'
            );
        }

        return true;
    }


    /* ========================================================================
     * SHARE
     * ====================================================================== */

    async handleShareAction(
        element,
        event
    ) {
        if (
            !this.config
                .enableShare
        ) {
            return false;
        }

        const title =
            element.dataset.shareTitle ||
            document.title;

        const text =
            element.dataset.shareText ||
            'A special birthday experience.';

        const url =
            element.dataset.shareUrl ||
            window.location.href;

        try {
            if (
                navigator.share &&
                typeof
                    navigator.share ===
                    'function'
            ) {
                element.classList.add(
                    INTERACTIONS_CONFIG
                        .classes
                        .sharing
                );

                await navigator.share({
                    title,
                    text,
                    url
                });

                this.emit(
                    INTERACTIONS_CONFIG
                        .events
                        .share,
                    {
                        method:
                            'native',
                        title,
                        text,
                        url,
                        element,
                        event
                    }
                );

                this.playInteractionAudio(
                    'share'
                );

                return true;
            }

            await this.copyText(
                url
            );

            this.notify(
                element.dataset
                    .shareFallbackMessage ||
                INTERACTIONS_CONFIG
                    .defaults
                    .shareMessage
            );

            this.playInteractionAudio(
                'share'
            );

            this.emit(
                INTERACTIONS_CONFIG
                    .events
                    .share,
                {
                    method:
                        'clipboard',
                    title,
                    text,
                    url,
                    element,
                    event
                }
            );

            return true;
        } catch (error) {
            /*
             * Native share cancellation should not be treated as a failure.
             */
            if (
                error?.name ===
                'AbortError'
            ) {
                return false;
            }

            console.warn(
                '[Interactions] Share failed:',
                error
            );

            this.notify(
                'Sharing is not available right now.'
            );

            return false;
        } finally {
            window.setTimeout(
                () => {
                    element.classList.remove(
                        INTERACTIONS_CONFIG
                            .classes
                            .sharing
                    );
                },
                350
            );
        }
    }


    /* ========================================================================
     * EMAIL
     * ====================================================================== */

    handleEmailAction(
        element,
        event
    ) {
        const email =
            element.dataset.email ||
            element.getAttribute(
                'href'
            ) ||
            '';

        const subject =
            element.dataset.emailSubject ||
            '';

        const body =
            element.dataset.emailBody ||
            '';

        let href =
            email;

        if (
            !email.startsWith(
                'mailto:'
            )
        ) {
            href =
                `mailto:${email}`;
        }

        const params =
            new URLSearchParams();

        if (
            subject
        ) {
            params.set(
                'subject',
                subject
            );
        }

        if (
            body
        ) {
            params.set(
                'body',
                body
            );
        }

        const query =
            params.toString();

        if (
            query
        ) {
            href +=
                `${href.includes('?') ? '&' : '?'}${query}`;
        }

        window.location.href =
            href;

        this.emit(
            'interaction:email',
            {
                element,
                event,
                href
            }
        );
    }


    /* ========================================================================
     * FOCUS / KEYBOARD
     * ====================================================================== */

    handleFocusIn(
        event
    ) {
        const element =
            event.target instanceof Element
                ? event.target
                : null;

        if (
            !element
        ) {
            return;
        }

        this.focusedElement =
            element;

        element.classList.add(
            INTERACTIONS_CONFIG
                .classes
                .focusVisible
        );
    }


    handleFocusOut(
        event
    ) {
        const element =
            event.target instanceof Element
                ? event.target
                : null;

        if (
            !element
        ) {
            return;
        }

        element.classList.remove(
            INTERACTIONS_CONFIG
                .classes
                .focusVisible
        );

        if (
            this.focusedElement ===
            element
        ) {
            this.focusedElement =
                null;
        }
    }


    handleKeyDown(
        event
    ) {
        if (
            !event
        ) {
            return;
        }

        const target =
            event.target instanceof Element
                ? event.target
                : null;

        if (
            !target
        ) {
            return;
        }

        const key =
            String(
                event.key || ''
            ).toLowerCase();

        /*
         * Ripple for keyboard activation.
         */
        if (
            (
                key === 'enter' ||
                key === ' '
            ) &&
            target.matches(
                'button, [role="button"], a[href], [tabindex]'
            )
        ) {
            this.ripple.create(
                target,
                {
                    clientX:
                        target.getBoundingClientRect()
                            .left +
                        target.getBoundingClientRect()
                            .width /
                        2,

                    clientY:
                        target.getBoundingClientRect()
                            .top +
                        target.getBoundingClientRect()
                            .height /
                        2
                }
            );

            this.press.press(
                target
            );

            window.setTimeout(
                () => {
                    this.press.release(
                        target
                    );
                },
                INTERACTIONS_CONFIG
                    .defaults
                    .clickFeedbackDuration
            );
        }

        /*
         * Escape should close temporary interaction surfaces exposed
         * through the event layer.
         */
        if (
            key === 'escape'
        ) {
            this.emit(
                'interaction:escape',
                {
                    event,
                    target
                }
            );

            interactionDispatchEvent(
                'interaction:escape',
                {
                    event,
                    target
                }
            );
        }
    }


    /* ========================================================================
     * CONTEXT MENU
     * ====================================================================== */

    handleContextMenu(
        event
    ) {
        const target =
            event.target instanceof Element
                ? event.target
                : null;

        if (
            !target
        ) {
            return;
        }

        if (
            target.matches(
                '[data-no-context-menu]'
            )
        ) {
            event.preventDefault();
        }
    }


    /* ========================================================================
     * INTERACTIVE TARGET RESOLUTION
     * ====================================================================== */

    findInteractiveTarget(
        target
    ) {
        if (
            !target ||
            !(target instanceof Element)
        ) {
            return null;
        }

        const selectors = [
            'button',
            '[role="button"]',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '[data-interaction]',
            '[data-action]',
            '[data-copy]',
            '[data-share]',
            '[data-magnetic]',
            '[data-tilt]',
            '[data-ripple]',
            '[data-long-press]',
            '[data-double-tap]'
        ];

        for (
            const selector
            of selectors
        ) {
            const element =
                target.closest(
                    selector
                );

            if (
                element
            ) {
                return element;
            }
        }

        return null;
    }


    /* ========================================================================
     * CLICK FEEDBACK
     * ====================================================================== */

    addClickFeedback(
        element
    ) {
        if (
            !element
        ) {
            return;
        }

        element.classList.add(
            'is-clicking'
        );

        window.setTimeout(
            () => {
                element.classList.remove(
                    'is-clicking'
                );
            },
            INTERACTIONS_CONFIG
                .defaults
                .clickFeedbackDuration
        );
    }


    resetElementTransforms(
        element
    ) {
        if (
            !element
        ) {
            return;
        }

        const isTilt =
            element.matches(
                INTERACTIONS_CONFIG
                    .selectors
                    .tilt
                    .join(',')
            );

        const isMagnetic =
            element.matches(
                INTERACTIONS_CONFIG
                    .selectors
                    .magnetic
                    .join(',')
            );

        if (
            isTilt
        ) {
            this.tilt.leave(
                element
            );
        }

        if (
            isMagnetic
        ) {
            this.magnetic.reset(
                element
            );
        }
    }


    /* ========================================================================
     * CURSOR ELEMENTS
     * ====================================================================== */

    discoverCursorElements() {
        this.cursorElements =
            interactionQueryAll(
                INTERACTIONS_CONFIG
                    .selectors
                    .cursorFollower
            );
    }


    /* ========================================================================
     * NOTIFICATION
     * ====================================================================== */

    notify(
        message,
        options = {}
    ) {
        const duration =
            Math.max(
                700,
                Number(
                    options.duration ||
                    2800
                )
            );

        /*
         * Prefer app.js toast manager when available.
         */
        if (
            this.app?.toast &&
            typeof
                this.app.toast.show ===
                    'function'
        ) {
            this.app.toast.show(
                message,
                {
                    type:
                        options.type ||
                        'info',
                    duration
                }
            );

            return;
        }

        let toast =
            document.querySelector(
                '[data-interaction-toast]'
            );

        if (
            !toast
        ) {
            toast =
                document.createElement(
                    'div'
                );

            toast.dataset.interactionToast =
                'true';

            toast.className =
                'interaction-toast';

            toast.setAttribute(
                'role',
                'status'
            );

            toast.setAttribute(
                'aria-live',
                'polite'
            );

            Object.assign(
                toast.style,
                {
                    position:
                        'fixed',

                    left:
                        '50%',

                    bottom:
                        '24px',

                    transform:
                        'translate(-50%, 15px)',

                    opacity:
                        '0',

                    pointerEvents:
                        'none',

                    zIndex:
                        '99990',

                    transition:
                        'opacity .2s ease, transform .2s ease'
                }
            );

            document.body.appendChild(
                toast
            );
        }

        toast.textContent =
            String(
                message
            );

        toast.dataset.type =
            options.type ||
            'info';

        toast.style.opacity =
            '1';

        toast.style.transform =
            'translate(-50%, 0)';

        window.clearTimeout(
            toast.__interactionTimer
        );

        toast.__interactionTimer =
            window.setTimeout(
                () => {
                    toast.style.opacity =
                        '0';

                    toast.style.transform =
                        'translate(-50%, 15px)';
                },
                duration
            );
    }


    /* ========================================================================
     * AUDIO INTEGRATION
     * ====================================================================== */

    playInteractionAudio(
        type
    ) {
        if (
            !INTERACTIONS_CONFIG
                .audio
                .enabled
        ) {
            return;
        }

        const source =
            INTERACTIONS_CONFIG
                .audio[
                    type
                ];

        /*
         * Empty by design. Actual sounds will be decided later.
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
                '[Interactions] Audio playback failed:',
                error
            );
        }
    }


    /* ========================================================================
     * SCENE INTEGRATION
     * ====================================================================== */

    handleSceneChanged(
        payload
    ) {
        const scene =
            payload?.scene ||
            null;

        if (
            !scene
        ) {
            return;
        }

        const sceneElement =
            scene.element ||
            scene;

        if (
            !sceneElement ||
            !(sceneElement instanceof Element)
        ) {
            return;
        }

        /*
         * Reset transient effects whenever the visitor changes scene.
         * This prevents tilt/magnetic transforms from carrying into
         * another birthday section.
         */
        this.tilt.resetAll();
        this.magnetic.resetAll();
        this.press.clear();
        this.longPress.cancelAll();

        this.discoverCursorElements();

        const interactions =
            interactionQueryAll(
                [
                    '[data-interaction-scene-reset]'
                ],
                sceneElement
            );

        interactions.forEach(
            (element) => {
                element.classList.remove(
                    INTERACTIONS_CONFIG
                        .classes
                        .copied,

                    INTERACTIONS_CONFIG
                        .classes
                        .doubleTapped,

                    INTERACTIONS_CONFIG
                        .classes
                        .longPressed,

                    'is-clicking'
                );
            }
        );

        this.emit(
            'interaction:scene-changed',
            {
                scene,
                index:
                    payload?.index
            }
        );
    }


    /* ========================================================================
     * VISIBILITY
     * ====================================================================== */

    handleVisibility() {
        if (
            document.hidden
        ) {
            this.tilt.resetAll();
            this.magnetic.resetAll();
            this.press.clear();
            this.longPress.cancelAll();
        }
    }


    /* ========================================================================
     * GLOBAL STATE
     * ====================================================================== */

    getState() {
        return {
            initialized:
                this.initialized,

            destroyed:
                this.destroyed,

            pointerSupported:
                this.pointerSupported,

            pointerType:
                this.pointerType,

            touch:
                interactionHasTouch(),

            reducedMotion:
                interactionReducedMotion(),

            cursorElements:
                this.cursorElements.length,

            activePresses:
                this.press.active.size,

            activeTilt:
                this.tilt.active.size,

            activeMagnetic:
                this.magnetic.active.size,

            activeRipples:
                this.ripple.ripples.size
        };
    }


    /* ========================================================================
     * PUBLIC EVENTS
     * ====================================================================== */

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

        interactionDispatchEvent(
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
     * CONFIGURATION
     * ====================================================================== */

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

        Object.keys(
            this.config
        ).forEach(
            (key) => {
                if (
                    key in options
                ) {
                    this.config[key] =
                        options[key];
                }
            }
        );

        return this;
    }


    /* ========================================================================
     * RESET
     * ====================================================================== */

    reset() {
        this.tilt.resetAll();
        this.magnetic.resetAll();
        this.press.clear();
        this.longPress.cancelAll();
        this.doubleTap.clear();
        this.ripple.clear();

        if (
            this.root
        ) {
            this.root
                .style
                .removeProperty(
                    '--pointer-x'
                );

            this.root
                .style
                .removeProperty(
                    '--pointer-y'
                );

            this.root
                .style
                .removeProperty(
                    '--pointer-x-normalized'
                );

            this.root
                .style
                .removeProperty(
                    '--pointer-y-normalized'
                );
        }

        const transientClasses = [
            INTERACTIONS_CONFIG
                .classes
                .copied,

            INTERACTIONS_CONFIG
                .classes
                .sharing,

            INTERACTIONS_CONFIG
                .classes
                .longPressed,

            INTERACTIONS_CONFIG
                .classes
                .doubleTapped,

            'is-clicking'
        ];

        if (
            this.root
        ) {
            transientClasses.forEach(
                (className) => {
                    this.root
                        .querySelectorAll(
                            `.${className}`
                        )
                        .forEach(
                            (element) => {
                                element.classList.remove(
                                    className
                                );
                            }
                        );
                }
            );
        }

        return true;
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

        const target =
            this.root ||
            document;

        target.removeEventListener(
            'pointermove',
            this.boundHandlers
                .pointerMove
        );

        target.removeEventListener(
            'pointerdown',
            this.boundHandlers
                .pointerDown
        );

        target.removeEventListener(
            'pointerup',
            this.boundHandlers
                .pointerUp
        );

        target.removeEventListener(
            'pointercancel',
            this.boundHandlers
                .pointerCancel
        );

        target.removeEventListener(
            'pointerenter',
            this.boundHandlers
                .pointerEnter,
            true
        );

        target.removeEventListener(
            'pointerleave',
            this.boundHandlers
                .pointerLeave,
            true
        );

        target.removeEventListener(
            'click',
            this.boundHandlers
                .click
        );

        target.removeEventListener(
            'focusin',
            this.boundHandlers
                .focusIn
        );

        target.removeEventListener(
            'focusout',
            this.boundHandlers
                .focusOut
        );

        target.removeEventListener(
            'keydown',
            this.boundHandlers
                .keyDown
        );

        target.removeEventListener(
            'contextmenu',
            this.boundHandlers
                .contextMenu
        );

        window.removeEventListener(
            'pointermove',
            this.boundHandlers
                .windowPointerMove
        );

        window.removeEventListener(
            'pointerup',
            this.boundHandlers
                .windowPointerUp
        );

        document.removeEventListener(
            'visibilitychange',
            this.boundHandlers
                .visibility
        );

        this.reset();

        this.events.clear();

        this.initialized =
            false;

        this.destroyed =
            true;

        this.emit(
            INTERACTIONS_CONFIG
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

let birthdayInteractionsManager =
    null;


/**
 * Get/create interaction manager.
 *
 * @returns {BirthdayInteractionsManager}
 */
function getBirthdayInteractionsManager() {
    if (
        !birthdayInteractionsManager
    ) {
        birthdayInteractionsManager =
            new BirthdayInteractionsManager();
    }

    return birthdayInteractionsManager;
}


birthdayInteractionsManager =
    getBirthdayInteractionsManager();


/* ============================================================================
 * GLOBAL COMPATIBILITY NAMES
 * ========================================================================== */

window.InteractionManager =
    birthdayInteractionsManager;

window.InteractionsManager =
    birthdayInteractionsManager;

window.interactionsManager =
    birthdayInteractionsManager;

window.Interactions =
    birthdayInteractionsManager;


/* ============================================================================
 * PUBLIC NAMESPACE
 * ========================================================================== */

window.SehrishInteractions =
    Object.freeze({
        init(
            app = null
        ) {
            return getBirthdayInteractionsManager()
                .init(app);
        },

        state() {
            return getBirthdayInteractionsManager()
                .getState();
        },

        configure(
            options = {}
        ) {
            return getBirthdayInteractionsManager()
                .configure(
                    options
                );
        },

        reset() {
            return getBirthdayInteractionsManager()
                .reset();
        },

        notify(
            message,
            options = {}
        ) {
            return getBirthdayInteractionsManager()
                .notify(
                    message,
                    options
                );
        },

        copy(
            value
        ) {
            return getBirthdayInteractionsManager()
                .copyText(
                    value
                );
        },

        playSFX(
            type
        ) {
            return getBirthdayInteractionsManager()
                .playInteractionAudio(
                    type
                );
        },

        manager() {
            return getBirthdayInteractionsManager();
        }
    });


/* ============================================================================
 * AUTOMATIC INITIALIZATION
 * ========================================================================== */

function initializeBirthdayInteractions() {
    const manager =
        getBirthdayInteractionsManager();

    try {
        manager.init();
    } catch (error) {
        console.error(
            '[Interactions] Initialization failed:',
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
        initializeBirthdayInteractions,
        {
            once: true
        }
    );
} else {
    initializeBirthdayInteractions();
}


/* ============================================================================
 * DEBUG API
 * ========================================================================== */

window.SBInteractionsDebug =
    Object.freeze({
        state:
            () =>
                getBirthdayInteractionsManager()
                    .getState(),

        reset:
            () =>
                getBirthdayInteractionsManager()
                    .reset(),

        notify:
            (
                message,
                options
            ) =>
                getBirthdayInteractionsManager()
                    .notify(
                        message,
                        options
                    ),

        copy:
            (
                value
            ) =>
                getBirthdayInteractionsManager()
                    .copyText(
                        value
                    ),

        ripples:
            () =>
                [
                    ...getBirthdayInteractionsManager()
                        .ripple
                        .ripples
                ],

        tilt:
            () =>
                [
                    ...getBirthdayInteractionsManager()
                        .tilt
                        .active
                        .entries()
                ],

        magnetic:
            () =>
                [
                    ...getBirthdayInteractionsManager()
                        .magnetic
                        .active
                        .entries()
                ],

        config:
            () =>
                ({
                    ...getBirthdayInteractionsManager()
                        .config
                })
    });


/* ============================================================================
 * END OF FILE
 * ============================================================================
 */