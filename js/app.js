/**
 * ============================================================================
 * SEHRISH BIRTHDAY EXPERIENCE
 * ============================================================================
 * File       : js/app.js
 * Project    : sehrish-birthday
 * Version    : 1.0.0
 *
 * Purpose:
 * - Application bootstrap and lifecycle management
 * - Scene/application state coordination
 * - Global UI event delegation
 * - Navigation orchestration
 * - Integration layer for feature modules
 * - Safe initialization and graceful degradation
 * - Responsive viewport handling
 * - Accessibility support
 * - Global interaction locking
 * - Loading/error state management
 * - Application-level event bus
 *
 * Existing modules:
 *   scenes.js
 *   audio.js
 *   balloon-game.js
 *   cake.js
 *   countdown.js
 *   gifts.js
 *   interactions.js
 *   memories.js
 *   quiz.js
 *
 * NOTE:
 * This file acts as the main application controller.
 * Feature-specific logic should remain inside its respective module.
 * ============================================================================
 */

'use strict';

/* ============================================================================
 * GLOBAL APPLICATION CONSTANTS
 * ========================================================================== */

const APP_CONFIG = Object.freeze({
    name: 'Sehrish Birthday Experience',
    version: '1.0.0',

    selectors: Object.freeze({
        app: [
            '#app',
            '.birthday-app',
            '[data-app]',
            'main'
        ],

        loader: [
            '#app-loader',
            '.app-loader',
            '[data-app-loader]'
        ],

        toast: [
            '#app-toast',
            '.app-toast',
            '[data-app-toast]'
        ],

        navigation: [
            '.scene-navigation',
            '[data-scene-navigation]',
            '.scene-nav'
        ],

        scenes: [
            '.scene',
            '[data-scene]'
        ],

        previousButton: [
            '[data-action="previous"]',
            '[data-action="back"]',
            '[data-nav="prev"]',
            '[data-nav="previous"]',
            '[data-nav="back"]',
            '[data-scene-prev]',
            '.btn-back',
            '.back-button',
            '.scene-back'
        ],

        nextButton: [
            '[data-action="next"]',
            '[data-nav="next"]',
            '[data-nav="forward"]',
            '[data-scene-next]',
            '.btn-next',
            '.next-button',
            '.scene-next'
        ],

        homeButton: [
            '[data-action="home"]',
            '[data-go-home]',
            '.home-button'
        ],

        restartButton: [
            '[data-action="restart"]',
            '[data-restart]',
            '.restart-button'
        ],

        menuButton: [
            '[data-action="menu"]',
            '[data-menu]',
            '.menu-button'
        ],

        closeButton: [
            '[data-action="close"]',
            '[data-close]',
            '.close-button'
        ]
    }),

    timing: Object.freeze({
        bootSafetyTimeout: 12000,
        loaderMinimum: 450,
        toastDuration: 3200,
        resizeDebounce: 120,
        scrollDebounce: 150,
        navigationLock: 700
    }),

    storage: Object.freeze({
        enabled: true,
        prefix: 'sehrish-birthday:',
        lastScene: 'last-scene',
        visited: 'visited-scenes',
        soundPreference: 'sound-enabled',
        reducedMotion: 'reduced-motion'
    }),

    css: Object.freeze({
        ready: 'app-ready',
        loading: 'app-loading',
        initialized: 'app-initialized',
        error: 'app-error',
        locked: 'app-navigation-locked',
        menuOpen: 'app-menu-open',
        reducedMotion: 'reduce-motion',
        mobile: 'is-mobile',
        tablet: 'is-tablet',
        desktop: 'is-desktop',
        landscape: 'is-landscape',
        portrait: 'is-portrait'
    })
});


/* ============================================================================
 * UTILITY HELPERS
 * ========================================================================== */

/**
 * Converts selector array/string into normalized array.
 *
 * @param {string|string[]} selectors
 * @returns {string[]}
 */
function normalizeSelectors(selectors) {
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
 * Safely query one element using multiple selectors.
 *
 * @param {string|string[]} selectors
 * @param {ParentNode} root
 * @returns {Element|null}
 */
function queryFirst(selectors, root = document) {
    const normalized = normalizeSelectors(selectors);

    for (const selector of normalized) {
        try {
            const element = root.querySelector(selector);

            if (element) {
                return element;
            }
        } catch (error) {
            console.warn(
                `[SehrishBirthday] Invalid selector ignored: ${selector}`,
                error
            );
        }
    }

    return null;
}


/**
 * Safely query all unique elements using multiple selectors.
 *
 * @param {string|string[]} selectors
 * @param {ParentNode} root
 * @returns {Element[]}
 */
function queryAllUnique(selectors, root = document) {
    const normalized = normalizeSelectors(selectors);
    const elements = [];
    const seen = new Set();

    normalized.forEach((selector) => {
        try {
            root.querySelectorAll(selector).forEach((element) => {
                if (!seen.has(element)) {
                    seen.add(element);
                    elements.push(element);
                }
            });
        } catch (error) {
            console.warn(
                `[SehrishBirthday] Invalid selector ignored: ${selector}`,
                error
            );
        }
    });

    return elements;
}


/**
 * Debounce helper.
 *
 * @param {Function} callback
 * @param {number} delay
 * @returns {Function}
 */
function debounce(callback, delay = 100) {
    let timeoutId = null;

    return function debouncedFunction(...args) {
        window.clearTimeout(timeoutId);

        timeoutId = window.setTimeout(() => {
            callback.apply(this, args);
        }, delay);
    };
}


/**
 * Clamp numeric value into a range.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}


/**
 * Convert possible boolean-like value.
 *
 * @param {*} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function toBoolean(value, fallback = false) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (['true', '1', 'yes', 'on'].includes(normalized)) {
            return true;
        }

        if (['false', '0', 'no', 'off'].includes(normalized)) {
            return false;
        }
    }

    return fallback;
}


/**
 * Safely parse JSON.
 *
 * @param {string|null} value
 * @param {*} fallback
 * @returns {*}
 */
function safeJSONParse(value, fallback = null) {
    if (!value) {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}


/**
 * Wait for specified duration.
 *
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function wait(milliseconds) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}


/**
 * Run callback safely.
 *
 * @param {Function} callback
 * @param {*} fallback
 * @returns {*}
 */
function safeCall(callback, fallback = undefined) {
    try {
        if (typeof callback === 'function') {
            return callback();
        }
    } catch (error) {
        console.error('[SehrishBirthday] Module error:', error);
    }

    return fallback;
}


/**
 * Resolve globally available module.
 *
 * @param {string[]} names
 * @returns {*|null}
 */
function resolveGlobalModule(names = []) {
    for (const name of names) {
        try {
            if (
                Object.prototype.hasOwnProperty.call(window, name) &&
                window[name]
            ) {
                return window[name];
            }
        } catch (error) {
            console.warn(
                `[SehrishBirthday] Could not resolve module: ${name}`,
                error
            );
        }
    }

    return null;
}


/* ============================================================================
 * APPLICATION EVENT BUS
 * ========================================================================== */

class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event.
     *
     * @param {string} eventName
     * @param {Function} handler
     * @returns {Function}
     */
    on(eventName, handler) {
        if (
            typeof eventName !== 'string' ||
            !eventName.trim() ||
            typeof handler !== 'function'
        ) {
            return () => {};
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        const handlers = this.events.get(eventName);
        handlers.add(handler);

        return () => {
            handlers.delete(handler);

            if (handlers.size === 0) {
                this.events.delete(eventName);
            }
        };
    }

    /**
     * Subscribe to an event only once.
     *
     * @param {string} eventName
     * @param {Function} handler
     * @returns {Function}
     */
    once(eventName, handler) {
        let unsubscribe = null;

        const wrappedHandler = (...args) => {
            if (unsubscribe) {
                unsubscribe();
            }

            handler(...args);
        };

        unsubscribe = this.on(eventName, wrappedHandler);

        return unsubscribe;
    }

    /**
     * Publish an event.
     *
     * @param {string} eventName
     * @param {*} payload
     * @returns {void}
     */
    emit(eventName, payload = undefined) {
        const handlers = this.events.get(eventName);

        if (!handlers || handlers.size === 0) {
            return;
        }

        [...handlers].forEach((handler) => {
            try {
                handler(payload);
            } catch (error) {
                console.error(
                    `[SehrishBirthday] Event handler failed: ${eventName}`,
                    error
                );
            }
        });
    }

    /**
     * Remove all handlers.
     *
     * @param {string|null} eventName
     */
    clear(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
            return;
        }

        this.events.clear();
    }
}


/* ============================================================================
 * STORAGE MANAGER
 * ========================================================================== */

class StorageManager {
    constructor(config = {}) {
        this.enabled = Boolean(config.enabled);
        this.prefix = config.prefix || 'app:';

        this.memoryStore = new Map();

        this.storage = null;

        if (this.enabled) {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    this.storage = window.localStorage;
                }
            } catch (error) {
                console.warn(
                    '[SehrishBirthday] Local storage unavailable.',
                    error
                );
            }
        }
    }

    getKey(key) {
        return `${this.prefix}${key}`;
    }

    set(key, value) {
        const normalizedKey = this.getKey(key);

        this.memoryStore.set(normalizedKey, value);

        if (!this.storage) {
            return;
        }

        try {
            this.storage.setItem(
                normalizedKey,
                JSON.stringify(value)
            );
        } catch (error) {
            console.warn(
                `[SehrishBirthday] Could not persist "${key}".`,
                error
            );
        }
    }

    get(key, fallback = null) {
        const normalizedKey = this.getKey(key);

        if (this.storage) {
            try {
                const rawValue = this.storage.getItem(normalizedKey);

                if (rawValue !== null) {
                    return safeJSONParse(rawValue, rawValue);
                }
            } catch (error) {
                console.warn(
                    `[SehrishBirthday] Could not read "${key}".`,
                    error
                );
            }
        }

        if (this.memoryStore.has(normalizedKey)) {
            return this.memoryStore.get(normalizedKey);
        }

        return fallback;
    }

    remove(key) {
        const normalizedKey = this.getKey(key);

        this.memoryStore.delete(normalizedKey);

        if (!this.storage) {
            return;
        }

        try {
            this.storage.removeItem(normalizedKey);
        } catch (error) {
            console.warn(
                `[SehrishBirthday] Could not remove "${key}".`,
                error
            );
        }
    }

    clearNamespace() {
        if (!this.storage) {
            this.memoryStore.clear();
            return;
        }

        try {
            const keysToRemove = [];

            for (let index = 0; index < this.storage.length; index += 1) {
                const key = this.storage.key(index);

                if (key && key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach((key) => {
                this.storage.removeItem(key);
            });
        } catch (error) {
            console.warn(
                '[SehrishBirthday] Could not clear application storage.',
                error
            );
        }

        this.memoryStore.clear();
    }
}


/* ============================================================================
 * DEVICE / VIEWPORT MANAGER
 * ========================================================================== */

class ViewportManager {
    constructor(app) {
        this.app = app;
        this.root = document.documentElement;

        this.state = {
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: window.devicePixelRatio || 1,
            orientation: this.getOrientation()
        };

        this.handleResize = debounce(
            () => this.refresh(),
            APP_CONFIG.timing.resizeDebounce
        );
    }

    init() {
        window.addEventListener(
            'resize',
            this.handleResize,
            { passive: true }
        );

        window.addEventListener(
            'orientationchange',
            this.handleResize,
            { passive: true }
        );

        this.refresh();
    }

    getOrientation() {
        return window.innerWidth >= window.innerHeight
            ? 'landscape'
            : 'portrait';
    }

    getDeviceClass(width) {
        if (width <= 767) {
            return APP_CONFIG.css.mobile;
        }

        if (width <= 1023) {
            return APP_CONFIG.css.tablet;
        }

        return APP_CONFIG.css.desktop;
    }

    refresh() {
        const width = Math.max(
            0,
            Math.round(window.innerWidth || 0)
        );

        const height = Math.max(
            0,
            Math.round(window.innerHeight || 0)
        );

        const orientation = width >= height
            ? 'landscape'
            : 'portrait';

        this.state = {
            width,
            height,
            dpr: window.devicePixelRatio || 1,
            orientation
        };

        const deviceClass = this.getDeviceClass(width);

        this.root.classList.remove(
            APP_CONFIG.css.mobile,
            APP_CONFIG.css.tablet,
            APP_CONFIG.css.desktop,
            APP_CONFIG.css.landscape,
            APP_CONFIG.css.portrait
        );

        this.root.classList.add(
            deviceClass,
            orientation === 'landscape'
                ? APP_CONFIG.css.landscape
                : APP_CONFIG.css.portrait
        );

        this.root.style.setProperty(
            '--viewport-width',
            `${width}px`
        );

        this.root.style.setProperty(
            '--viewport-height',
            `${height}px`
        );

        this.root.style.setProperty(
            '--viewport-dvh',
            `${height * 0.01}px`
        );

        this.root.style.setProperty(
            '--viewport-safe-height',
            `${Math.max(0, height - this.getApproxKeyboardOffset())}px`
        );

        this.app?.events?.emit('viewport:change', {
            ...this.state
        });
    }

    getApproxKeyboardOffset() {
        if (!window.visualViewport) {
            return 0;
        }

        const viewportHeight = window.visualViewport.height || window.innerHeight;
        const layoutHeight = window.innerHeight || viewportHeight;

        return Math.max(
            0,
            layoutHeight - viewportHeight
        );
    }

    destroy() {
        window.removeEventListener(
            'resize',
            this.handleResize
        );

        window.removeEventListener(
            'orientationchange',
            this.handleResize
        );
    }
}


/* ============================================================================
 * ACCESSIBILITY MANAGER
 * ========================================================================== */

class AccessibilityManager {
    constructor(app) {
        this.app = app;
        this.root = document.documentElement;

        this.mediaQuery = null;
        this.handleReducedMotionChange = null;
    }

    init() {
        this.applyReducedMotionPreference();
        this.ensureGlobalAccessibility();

        if (typeof window.matchMedia === 'function') {
            this.mediaQuery = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            );

            this.handleReducedMotionChange = () => {
                this.applyReducedMotionPreference();
            };

            if (typeof this.mediaQuery.addEventListener === 'function') {
                this.mediaQuery.addEventListener(
                    'change',
                    this.handleReducedMotionChange
                );
            } else if (
                typeof this.mediaQuery.addListener === 'function'
            ) {
                this.mediaQuery.addListener(
                    this.handleReducedMotionChange
                );
            }
        }
    }

    isReducedMotionEnabled() {
        const storedPreference = this.app.storage.get(
            APP_CONFIG.storage.reducedMotion,
            null
        );

        if (storedPreference !== null) {
            return Boolean(storedPreference);
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

    applyReducedMotionPreference() {
        const reducedMotion = this.isReducedMotionEnabled();

        this.root.classList.toggle(
            APP_CONFIG.css.reducedMotion,
            reducedMotion
        );

        this.root.dataset.reducedMotion = reducedMotion
            ? 'true'
            : 'false';

        this.app?.events?.emit(
            'accessibility:motion-change',
            reducedMotion
        );
    }

    ensureGlobalAccessibility() {
        document.body?.setAttribute(
            'data-accessibility-ready',
            'true'
        );
    }

    focusElement(element) {
        if (!element || typeof element.focus !== 'function') {
            return;
        }

        try {
            element.focus({
                preventScroll: true
            });
        } catch {
            try {
                element.focus();
            } catch {
                // Intentionally ignored.
            }
        }
    }

    announce(message) {
        if (!message) {
            return;
        }

        let liveRegion = document.getElementById(
            'app-live-region'
        );

        if (!liveRegion) {
            liveRegion = document.createElement('div');

            liveRegion.id = 'app-live-region';
            liveRegion.className = 'sr-only';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');

            Object.assign(
                liveRegion.style,
                {
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: '0',
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: '0'
                }
            );

            document.body.appendChild(liveRegion);
        }

        liveRegion.textContent = '';

        window.requestAnimationFrame(() => {
            liveRegion.textContent = message;
        });
    }

    destroy() {
        if (!this.mediaQuery || !this.handleReducedMotionChange) {
            return;
        }

        if (
            typeof this.mediaQuery.removeEventListener ===
            'function'
        ) {
            this.mediaQuery.removeEventListener(
                'change',
                this.handleReducedMotionChange
            );
        } else if (
            typeof this.mediaQuery.removeListener ===
            'function'
        ) {
            this.mediaQuery.removeListener(
                this.handleReducedMotionChange
            );
        }
    }
}


/* ============================================================================
 * TOAST / NOTIFICATION MANAGER
 * ========================================================================== */

class ToastManager {
    constructor(app) {
        this.app = app;
        this.element = null;
        this.hideTimer = null;
    }

    init() {
        this.element = queryFirst(
            APP_CONFIG.selectors.toast
        );

        if (!this.element) {
            this.element = document.createElement('div');

            this.element.className = 'app-toast';
            this.element.setAttribute('role', 'status');
            this.element.setAttribute('aria-live', 'polite');
            this.element.setAttribute('aria-atomic', 'true');

            Object.assign(
                this.element.style,
                {
                    display: 'none'
                }
            );

            document.body.appendChild(this.element);
        }
    }

    show(message, options = {}) {
        if (!this.element || !message) {
            return;
        }

        const {
            duration = APP_CONFIG.timing.toastDuration,
            type = 'info'
        } = options;

        window.clearTimeout(this.hideTimer);

        this.element.dataset.type = type;
        this.element.textContent = String(message);
        this.element.style.display = '';

        this.element.classList.add('is-visible');

        this.app.accessibility.announce(message);

        this.hideTimer = window.setTimeout(
            () => this.hide(),
            Math.max(500, duration)
        );
    }

    hide() {
        if (!this.element) {
            return;
        }

        window.clearTimeout(this.hideTimer);

        this.element.classList.remove('is-visible');

        window.setTimeout(() => {
            if (
                this.element &&
                !this.element.classList.contains('is-visible')
            ) {
                this.element.style.display = 'none';
            }
        }, 180);
    }

    destroy() {
        window.clearTimeout(this.hideTimer);
    }
}


/* ============================================================================
 * LOADER MANAGER
 * ========================================================================== */

class LoaderManager {
    constructor(app) {
        this.app = app;
        this.element = null;
        this.startedAt = performance.now();
        this.hidden = false;
    }

    init() {
        this.element = queryFirst(
            APP_CONFIG.selectors.loader
        );

        this.startedAt = performance.now();

        if (this.element) {
            this.element.setAttribute(
                'aria-hidden',
                'false'
            );
        }
    }

    async hide(force = false) {
        if (this.hidden) {
            return;
        }

        const elapsed = performance.now() - this.startedAt;
        const remaining = Math.max(
            0,
            APP_CONFIG.timing.loaderMinimum - elapsed
        );

        if (!force && remaining > 0) {
            await wait(remaining);
        }

        this.hidden = true;

        if (!this.element) {
            return;
        }

        this.element.setAttribute(
            'aria-hidden',
            'true'
        );

        this.element.classList.add('is-hidden');

        await wait(280);

        if (
            this.element &&
            this.element.classList.contains('is-hidden')
        ) {
            this.element.style.display = 'none';
        }
    }
}


/* ============================================================================
 * SCENE DISCOVERY
 * ========================================================================== */

class SceneRegistry {
    constructor(app) {
        this.app = app;
        this.scenes = [];
        this.byId = new Map();
    }

    discover() {
        const elements = queryAllUnique(
            APP_CONFIG.selectors.scenes
        );

        this.scenes = elements.map(
            (element, index) => {
                const sceneId =
                    element.dataset.scene ||
                    element.getAttribute('data-scene-id') ||
                    element.id ||
                    String(index + 1);

                const numericOrder = Number(
                    element.dataset.order ||
                    element.dataset.sceneOrder ||
                    index + 1
                );

                return {
                    element,
                    id: String(sceneId),
                    index,
                    order: Number.isFinite(numericOrder)
                        ? numericOrder
                        : index + 1
                };
            }
        );

        this.scenes.sort(
            (a, b) => a.order - b.order
        );

        this.byId.clear();

        this.scenes.forEach(
            (scene, index) => {
                scene.index = index;
                this.byId.set(scene.id, scene);

                scene.element.dataset.sceneIndex = String(index);

                if (!scene.element.hasAttribute('role')) {
                    scene.element.setAttribute(
                        'role',
                        'region'
                    );
                }

                if (!scene.element.hasAttribute('aria-hidden')) {
                    scene.element.setAttribute(
                        'aria-hidden',
                        'true'
                    );
                }
            }
        );

        return this.scenes;
    }

    get count() {
        return this.scenes.length;
    }

    get(index) {
        if (this.scenes.length === 0) {
            return null;
        }

        const safeIndex = clamp(
            Number(index) || 0,
            0,
            this.scenes.length - 1
        );

        return this.scenes[safeIndex] || null;
    }

    getById(id) {
        if (id === undefined || id === null) {
            return null;
        }

        return this.byId.get(String(id)) || null;
    }

    getIndexById(id) {
        const scene = this.getById(id);

        return scene ? scene.index : -1;
    }

    getCurrent() {
        return this.scenes.find(
            (scene) =>
                scene.element.classList.contains(
                    'is-active'
                ) ||
                scene.element.classList.contains(
                    'active'
                ) ||
                scene.element.getAttribute(
                    'aria-hidden'
                ) === 'false'
        ) || null;
    }
}


/* ============================================================================
 * NAVIGATION MANAGER
 * ========================================================================== */

class NavigationManager {
    constructor(app) {
        this.app = app;

        this.registry = new SceneRegistry(app);

        this.currentIndex = 0;
        this.previousIndex = -1;

        this.locked = false;
        this.transitioning = false;

        this.navigationElements = [];
        this.previousButtons = [];
        this.nextButtons = [];
        this.homeButtons = [];
        this.restartButtons = [];

        this.transitionTimer = null;
    }

    init() {
        this.registry.discover();

        this.cacheElements();
        this.bindEvents();
        this.resolveInitialScene();

        this.updateNavigationUI();
    }

    cacheElements() {
        this.navigationElements = queryAllUnique(
            APP_CONFIG.selectors.navigation
        );

        this.previousButtons = queryAllUnique(
            APP_CONFIG.selectors.previousButton
        );

        this.nextButtons = queryAllUnique(
            APP_CONFIG.selectors.nextButton
        );

        this.homeButtons = queryAllUnique(
            APP_CONFIG.selectors.homeButton
        );

        this.restartButtons = queryAllUnique(
            APP_CONFIG.selectors.restartButton
        );
    }

    bindEvents() {
        this.previousButtons.forEach((button) => {
            button.addEventListener(
                'click',
                () => this.previous()
            );
        });

        this.nextButtons.forEach((button) => {
            button.addEventListener(
                'click',
                () => this.next()
            );
        });

        this.homeButtons.forEach((button) => {
            button.addEventListener(
                'click',
                () => this.goTo(0)
            );
        });

        this.restartButtons.forEach((button) => {
            button.addEventListener(
                'click',
                () => this.restart()
            );
        });
    }

    resolveInitialScene() {
        let index = 0;

        const hash = window.location.hash
            ?.replace(/^#/, '')
            .trim();

        if (hash) {
            const hashSceneIndex =
                this.registry.getIndexById(hash);

            if (hashSceneIndex >= 0) {
                index = hashSceneIndex;
            }
        } else {
            const storedScene =
                this.app.storage.get(
                    APP_CONFIG.storage.lastScene,
                    0
                );

            const storedIndex =
                Number(storedScene);

            if (
                Number.isInteger(storedIndex) &&
                storedIndex >= 0 &&
                storedIndex < this.registry.count
            ) {
                /*
                 * The birthday experience should normally begin
                 * from the first scene on a fresh visit.
                 *
                 * Stored state is retained for analytics/progress,
                 * but we avoid unexpectedly dropping the visitor
                 * into a later section after reopening.
                 */
                index = 0;
            }
        }

        if (this.registry.count > 0) {
            this.applyScene(
                index,
                {
                    immediate: true,
                    direction: 'forward',
                    reason: 'initialization'
                }
            );
        }
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    getCurrentScene() {
        return this.registry.get(
            this.currentIndex
        );
    }

    getTotalScenes() {
        return this.registry.count;
    }

    canPrevious() {
        return (
            this.registry.count > 0 &&
            this.currentIndex > 0 &&
            !this.locked &&
            !this.transitioning
        );
    }

    canNext() {
        return (
            this.registry.count > 0 &&
            this.currentIndex <
                this.registry.count - 1 &&
            !this.locked &&
            !this.transitioning
        );
    }

    previous() {
        if (!this.canPrevious()) {
            return false;
        }

        return this.goTo(
            this.currentIndex - 1,
            {
                direction: 'backward',
                reason: 'previous-button'
            }
        );
    }

    next() {
        if (!this.canNext()) {
            return false;
        }

        return this.goTo(
            this.currentIndex + 1,
            {
                direction: 'forward',
                reason: 'next-button'
            }
        );
    }

    restart() {
        if (this.locked || this.transitioning) {
            return false;
        }

        this.app.events.emit(
            'app:restart-requested'
        );

        return this.goTo(
            0,
            {
                direction: 'backward',
                reason: 'restart'
            }
        );
    }

    goTo(target, options = {}) {
        if (
            this.registry.count === 0 ||
            this.locked ||
            this.transitioning
        ) {
            return false;
        }

        let targetIndex = target;

        if (
            typeof target === 'string' &&
            !/^\d+$/.test(target)
        ) {
            targetIndex =
                this.registry.getIndexById(target);
        }

        targetIndex = Number(targetIndex);

        if (
            !Number.isInteger(targetIndex) ||
            targetIndex < 0 ||
            targetIndex >= this.registry.count
        ) {
            return false;
        }

        if (targetIndex === this.currentIndex) {
            this.updateNavigationUI();
            return true;
        }

        const direction =
            options.direction ||
            (
                targetIndex > this.currentIndex
                    ? 'forward'
                    : 'backward'
            );

        this.applyScene(
            targetIndex,
            {
                ...options,
                direction
            }
        );

        return true;
    }

    applyScene(index, options = {}) {
        const targetScene =
            this.registry.get(index);

        if (!targetScene) {
            return;
        }

        const {
            immediate = false,
            direction = 'forward',
            reason = 'navigation'
        } = options;

        const previousScene =
            this.registry.get(this.currentIndex);

        const oldIndex = this.currentIndex;

        if (previousScene && oldIndex !== index) {
            previousScene.element.classList.remove(
                'is-active',
                'active',
                'scene-active',
                `scene-${direction === 'forward' ? 'exit' : 'reverse-exit'}`
            );

            previousScene.element.setAttribute(
                'aria-hidden',
                'true'
            );
        }

        this.previousIndex = oldIndex;
        this.currentIndex = index;

        targetScene.element.classList.add(
            'is-active',
            'active',
            'scene-active'
        );

        targetScene.element.setAttribute(
            'aria-hidden',
            'false'
        );

        targetScene.element.dataset.navigationDirection =
            direction;

        targetScene.element.dataset.navigationReason =
            reason;

        if (direction === 'forward') {
            targetScene.element.classList.add(
                'scene-enter-forward'
            );
        } else {
            targetScene.element.classList.add(
                'scene-enter-backward'
            );
        }

        this.updateNavigationUI();

        this.persistProgress();
        this.updateHash(targetScene);

        this.app.accessibility.announce(
            this.getSceneAnnouncement(targetScene)
        );

        this.app.events.emit(
            'scene:before-change',
            {
                previousIndex: oldIndex,
                nextIndex: index,
                previousScene,
                nextScene: targetScene,
                direction,
                reason
            }
        );

        this.app.events.emit(
            'scene:changed',
            {
                index,
                previousIndex: oldIndex,
                scene: targetScene,
                previousScene,
                direction,
                reason
            }
        );

        if (!immediate) {
            this.startTransitionLock();
        }

        window.setTimeout(() => {
            targetScene.element.classList.remove(
                'scene-enter-forward',
                'scene-enter-backward'
            );
        }, 700);
    }

    getSceneAnnouncement(scene) {
        if (!scene?.element) {
            return '';
        }

        const heading =
            scene.element.querySelector(
                'h1, h2, h3, [data-scene-title]'
            );

        const label =
            scene.element.getAttribute(
                'aria-label'
            );

        return (
            label ||
            heading?.textContent?.trim() ||
            `Scene ${scene.index + 1}`
        );
    }

    updateHash(scene) {
        if (!scene || !scene.id) {
            return;
        }

        /*
         * Hash updates are deliberately replaced without pushing
         * browser history for every scene. This prevents dozens
         * of history entries during a single birthday journey.
         */
        try {
            window.history.replaceState(
                null,
                '',
                `#${encodeURIComponent(scene.id)}`
            );
        } catch {
            // Graceful fallback for restricted environments.
        }
    }

    persistProgress() {
        this.app.storage.set(
            APP_CONFIG.storage.lastScene,
            this.currentIndex
        );

        const visited =
            this.app.storage.get(
                APP_CONFIG.storage.visited,
                []
            );

        const normalizedVisited = Array.isArray(visited)
            ? visited
            : [];

        if (!normalizedVisited.includes(this.currentIndex)) {
            normalizedVisited.push(
                this.currentIndex
            );
        }

        this.app.storage.set(
            APP_CONFIG.storage.visited,
            normalizedVisited
        );
    }

    updateNavigationUI() {
        const atFirst =
            this.currentIndex <= 0;

        const atLast =
            this.currentIndex >=
            this.registry.count - 1;

        this.previousButtons.forEach((button) => {
            const disabled =
                atFirst ||
                this.locked ||
                this.transitioning;

            button.disabled = disabled;

            button.setAttribute(
                'aria-disabled',
                String(disabled)
            );

            button.classList.toggle(
                'is-disabled',
                disabled
            );
        });

        this.nextButtons.forEach((button) => {
            const disabled =
                atLast ||
                this.locked ||
                this.transitioning;

            button.disabled = disabled;

            button.setAttribute(
                'aria-disabled',
                String(disabled)
            );

            button.classList.toggle(
                'is-disabled',
                disabled
            );
        });

        this.homeButtons.forEach((button) => {
            const disabled =
                this.currentIndex === 0 ||
                this.locked ||
                this.transitioning;

            button.disabled = disabled;

            button.setAttribute(
                'aria-disabled',
                String(disabled)
            );
        });

        this.updateProgressAttributes();
    }

    updateProgressAttributes() {
        document.documentElement.style.setProperty(
            '--scene-index',
            String(this.currentIndex)
        );

        document.documentElement.style.setProperty(
            '--scene-number',
            String(this.currentIndex + 1)
        );

        document.documentElement.style.setProperty(
            '--scene-total',
            String(this.registry.count)
        );

        const progress =
            this.registry.count > 1
                ? (
                    this.currentIndex /
                    (this.registry.count - 1)
                ) * 100
                : 100;

        document.documentElement.style.setProperty(
            '--scene-progress',
            `${clamp(progress, 0, 100)}%`
        );

        this.navigationElements.forEach((navigation) => {
            navigation.dataset.currentScene =
                String(this.currentIndex + 1);

            navigation.dataset.totalScenes =
                String(this.registry.count);

            navigation.setAttribute(
                'aria-label',
                `Birthday journey, scene ${
                    this.currentIndex + 1
                } of ${this.registry.count}`
            );
        });
    }

    startTransitionLock() {
        this.transitioning = true;

        document.documentElement.classList.add(
            APP_CONFIG.css.locked
        );

        this.updateNavigationUI();

        window.clearTimeout(
            this.transitionTimer
        );

        this.transitionTimer = window.setTimeout(
            () => {
                this.transitioning = false;

                document.documentElement.classList.remove(
                    APP_CONFIG.css.locked
                );

                this.updateNavigationUI();
            },
            APP_CONFIG.timing.navigationLock
        );
    }

    setLocked(value, reason = 'manual') {
        this.locked = Boolean(value);

        document.documentElement.classList.toggle(
            APP_CONFIG.css.locked,
            this.locked
        );

        this.updateNavigationUI();

        this.app.events.emit(
            'navigation:lock-change',
            {
                locked: this.locked,
                reason
            }
        );
    }

    refreshScenes() {
        this.registry.discover();
        this.cacheElements();
        this.updateNavigationUI();
    }

    destroy() {
        window.clearTimeout(
            this.transitionTimer
        );
    }
}


/* ============================================================================
 * GLOBAL INTERACTION CONTROLLER
 * ========================================================================== */

class InteractionController {
    constructor(app) {
        this.app = app;

        this.handleClick =
            this.handleClick.bind(this);

        this.handleKeyboard =
            this.handleKeyboard.bind(this);

        this.handleKeyDown =
            this.handleKeyDown.bind(this);

        this.lastPointerTime = 0;
        this.menuOpen = false;
    }

    init() {
        document.addEventListener(
            'click',
            this.handleClick
        );

        document.addEventListener(
            'keydown',
            this.handleKeyDown
        );

        document.addEventListener(
            'keyup',
            this.handleKeyboard
        );

        this.decorateActionElements();
    }

    decorateActionElements() {
        const interactiveElements = document.querySelectorAll(
            'button, [role="button"], a[data-action]'
        );

        interactiveElements.forEach((element) => {
            if (
                element.tagName === 'BUTTON' &&
                !element.hasAttribute('type')
            ) {
                element.setAttribute(
                    'type',
                    'button'
                );
            }
        });
    }

    handleClick(event) {
        const now = Date.now();

        if (
            now - this.lastPointerTime < 80
        ) {
            return;
        }

        this.lastPointerTime = now;

        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const actionElement =
            target.closest('[data-action]');

        if (!actionElement) {
            return;
        }

        const action =
            actionElement.dataset.action;

        if (!action) {
            return;
        }

        this.executeAction(
            action,
            actionElement,
            event
        );
    }

    handleKeyDown(event) {
        if (event.defaultPrevented) {
            return;
        }

        const key =
            String(event.key || '').toLowerCase();

        const activeElement =
            document.activeElement;

        const isTypingContext =
            activeElement &&
            (
                activeElement.matches(
                    'input, textarea, select, [contenteditable="true"]'
                )
            );

        if (isTypingContext) {
            return;
        }

        switch (key) {
            case 'arrowleft':
                event.preventDefault();
                this.app.navigation.previous();
                break;

            case 'arrowright':
            case 'enter':
                if (
                    key === 'enter' &&
                    activeElement &&
                    !activeElement.matches(
                        '[data-action]'
                    )
                ) {
                    return;
                }

                event.preventDefault();
                this.app.navigation.next();
                break;

            case 'escape':
                this.closeOpenUI();
                break;

            case 'home':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.app.navigation.goTo(0);
                }
                break;

            case 'r':
                if (
                    event.ctrlKey ||
                    event.metaKey
                ) {
                    return;
                }

                if (event.shiftKey) {
                    event.preventDefault();
                    this.app.navigation.restart();
                }
                break;

            default:
                break;
        }
    }

    handleKeyboard() {
        // Reserved for future keyboard interaction extensions.
    }

    executeAction(action, element, event) {
        switch (action) {
            case 'next':
                event.preventDefault();
                this.app.navigation.next();
                break;

            case 'previous':
            case 'back':
                event.preventDefault();
                this.app.navigation.previous();
                break;

            case 'home':
                event.preventDefault();
                this.app.navigation.goTo(0);
                break;

            case 'restart':
                event.preventDefault();
                this.app.navigation.restart();
                break;

            case 'menu':
                event.preventDefault();
                this.toggleMenu();
                break;

            case 'close':
                event.preventDefault();
                this.closeOpenUI();
                break;

            case 'sound':
                this.toggleSound();
                break;

            default:
                this.app.events.emit(
                    'action:unknown',
                    {
                        action,
                        element,
                        event
                    }
                );
                break;
        }
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;

        document.documentElement.classList.toggle(
            APP_CONFIG.css.menuOpen,
            this.menuOpen
        );

        this.app.events.emit(
            'menu:toggle',
            {
                open: this.menuOpen
            }
        );
    }

    closeOpenUI() {
        if (!this.menuOpen) {
            return;
        }

        this.menuOpen = false;

        document.documentElement.classList.remove(
            APP_CONFIG.css.menuOpen
        );

        this.app.events.emit(
            'menu:close'
        );
    }

    toggleSound() {
        const audioModule =
            this.app.modules.audio;

        if (!audioModule) {
            return;
        }

        const methods = [
            'toggle',
            'toggleMute',
            'toggleSound',
            'toggleAudio'
        ];

        for (const method of methods) {
            if (
                typeof audioModule[method] ===
                'function'
            ) {
                safeCall(
                    () => audioModule[method](),
                    null
                );
                return;
            }
        }

        this.app.events.emit(
            'audio:toggle-requested'
        );
    }

    destroy() {
        document.removeEventListener(
            'click',
            this.handleClick
        );

        document.removeEventListener(
            'keydown',
            this.handleKeyDown
        );

        document.removeEventListener(
            'keyup',
            this.handleKeyboard
        );
    }
}


/* ============================================================================
 * MODULE INTEGRATION MANAGER
 * ========================================================================== */

class ModuleManager {
    constructor(app) {
        this.app = app;

        this.moduleDefinitions = [
            {
                key: 'scenes',
                globals: [
                    'Scenes',
                    'SceneManager',
                    'ScenesManager',
                    'sceneManager'
                ],
                initMethods: [
                    'init',
                    'initialize',
                    'start'
                ]
            },
            {
                key: 'audio',
                globals: [
                    'Audio',
                    'AudioManager',
                    'audioManager'
                ],
                initMethods: [
                    'init',
                    'initialize',
                    'start'
                ]
            },
            {
                key: 'balloonGame',
                globals: [
                    'BalloonGame',
                    'BalloonGameManager',
                    'balloonGame'
                ],
                initMethods: [
                    'init',
                    'initialize',
                    'start'
                ]
            },
            {
                key: 'cake',
                globals: [
                    'Cake',
                    'CakeManager',
                    'cakeManager'
                ],
                initMethods: [
                    'init',
                    'initialize',
                    'start'
                ]
            },
            {
                key: 'countdown',
                globals: [
                    'Countdown',
                    'CountdownManager',
                    'countdownManager'
                ],
                initMethods: [
                    'init',
                    'initialize',
                    'start'
                ]
            },
            {
                key: 'gifts',
                globals: [
                    'Gifts',
                    'GiftManager',
                    'giftsManager'
                ],
                initMethods: [
                    'init',
                    'initialize',
                    'start'
                ]
            },
            {
                key: 'interactions',
                globals: [
                    'Interactions',
                    'InteractionManager',
                    'interactionsManager'
                ],
                initMethods: [
                    'init',
                    'initialize',
                    'start'
                ]
            },
            {
                key: 'memories',
                globals: [
                    'Memories',
                    'MemoryManager',
                    'memoriesManager'
                ],
                initMethods: [
                    'init',
                    'initialize',
                    'start'
                ]
            },
            {
                key: 'quiz',
                globals: [
                    'Quiz',
                    'QuizManager',
                    'quizManager'
                ],
                initMethods: [
                    'init',
                    'initialize',
                    'start'
                ]
            }
        ];

        this.modules = {};
        this.status = new Map();
    }

    init() {
        this.moduleDefinitions.forEach(
            (definition) => {
                this.initializeModule(
                    definition
                );
            }
        );

        this.app.events.emit(
            'modules:ready',
            {
                modules: this.modules,
                status: this.getStatus()
            }
        );
    }

    initializeModule(definition) {
        const module =
            resolveGlobalModule(
                definition.globals
            );

        if (!module) {
            this.status.set(
                definition.key,
                {
                    available: false,
                    initialized: false
                }
            );

            return;
        }

        this.modules[definition.key] =
            module;

        let initialized = false;
        let methodUsed = null;

        for (
            const method of
            definition.initMethods
        ) {
            if (
                typeof module[method] ===
                'function'
            ) {
                try {
                    const result =
                        module[method](
                            this.app
                        );

                    /*
                     * Promise-returning module
                     * initializers are supported.
                     */
                    if (
                        result &&
                        typeof result.then ===
                        'function'
                    ) {
                        result.catch(
                            (error) => {
                                this.handleModuleError(
                                    definition.key,
                                    error
                                );
                            }
                        );
                    }

                    initialized = true;
                    methodUsed = method;
                    break;
                } catch (error) {
                    this.handleModuleError(
                        definition.key,
                        error
                    );
                }
            }
        }

        this.status.set(
            definition.key,
            {
                available: true,
                initialized,
                method: methodUsed
            }
        );
    }

    handleModuleError(
        moduleName,
        error
    ) {
        console.error(
            `[SehrishBirthday] Module "${moduleName}" failed.`,
            error
        );

        const current =
            this.status.get(moduleName) ||
            {};

        this.status.set(
            moduleName,
            {
                ...current,
                available: true,
                initialized: false,
                error
            }
        );

        this.app.events.emit(
            'module:error',
            {
                module: moduleName,
                error
            }
        );
    }

    getStatus() {
        return Object.fromEntries(
            this.status.entries()
        );
    }

    get(name) {
        return this.modules[name] || null;
    }

    async waitForModule(
        name,
        timeout = 5000
    ) {
        const startedAt =
            performance.now();

        while (
            performance.now() - startedAt <
            timeout
        ) {
            const module =
                this.get(name);

            if (module) {
                return module;
            }

            await wait(50);
        }

        return null;
    }

    destroy() {
        Object.entries(
            this.modules
        ).forEach(
            ([name, module]) => {
                const destroyMethods = [
                    'destroy',
                    'dispose',
                    'cleanup',
                    'stop'
                ];

                for (
                    const method of
                    destroyMethods
                ) {
                    if (
                        typeof module?.[method] ===
                        'function'
                    ) {
                        safeCall(
                            () =>
                                module[method](),
                            null
                        );
                        break;
                    }
                }
            }
        );
    }
}


/* ============================================================================
 * SCENE DATA ATTRIBUTE SUPPORT
 * ========================================================================== */

class SceneEnhancer {
    constructor(app) {
        this.app = app;
    }

    init() {
        this.decorateScenes();
        this.bindSceneSpecificEvents();
    }

    decorateScenes() {
        const scenes =
            this.app.navigation.registry.scenes;

        scenes.forEach((scene) => {
            const element =
                scene.element;

            element.dataset.sceneReady =
                'true';

            element.dataset.scenePosition =
                `${scene.index + 1}/${scenes.length}`;

            if (!element.getAttribute('tabindex')) {
                element.setAttribute(
                    'tabindex',
                    '-1'
                );
            }

            this.decorateSceneProgress(
                element,
                scene.index,
                scenes.length
            );
        });
    }

    decorateSceneProgress(
        sceneElement,
        index,
        total
    ) {
        const progressNodes =
            sceneElement.querySelectorAll(
                '[data-scene-progress]'
            );

        const progress =
            total > 1
                ? (index / (total - 1)) * 100
                : 100;

        progressNodes.forEach((node) => {
            node.style.setProperty(
                '--scene-progress',
                `${progress}%`
            );

            node.setAttribute(
                'aria-valuemin',
                '0'
            );

            node.setAttribute(
                'aria-valuemax',
                '100'
            );

            node.setAttribute(
                'aria-valuenow',
                String(
                    Math.round(progress)
                )
            );
        });
    }

    bindSceneSpecificEvents() {
        this.app.events.on(
            'scene:changed',
            ({ scene }) => {
                if (!scene?.element) {
                    return;
                }

                this.prepareSceneMedia(
                    scene.element
                );

                this.resetTransientSceneState(
                    scene.element
                );
            }
        );
    }

    prepareSceneMedia(scene) {
        const lazyImages =
            scene.querySelectorAll(
                'img[data-src], source[data-srcset]'
            );

        lazyImages.forEach((element) => {
            if (
                element.tagName === 'IMG' &&
                element.dataset.src
            ) {
                element.src =
                    element.dataset.src;

                element.removeAttribute(
                    'data-src'
                );
            }

            if (
                element.tagName === 'SOURCE' &&
                element.dataset.srcset
            ) {
                element.srcset =
                    element.dataset.srcset;

                element.removeAttribute(
                    'data-srcset'
                );
            }
        });

        const videos =
            scene.querySelectorAll(
                'video[data-autoplay-on-scene]'
            );

        videos.forEach((video) => {
            try {
                video.currentTime = 0;

                const playPromise =
                    video.play();

                if (
                    playPromise &&
                    typeof playPromise.catch ===
                    'function'
                ) {
                    playPromise.catch(
                        () => {
                            // Autoplay may be blocked.
                        }
                    );
                }
            } catch {
                // Intentionally ignored.
            }
        });
    }

    resetTransientSceneState(scene) {
        const resetElements =
            scene.querySelectorAll(
                '[data-reset-on-scene-enter]'
            );

        resetElements.forEach((element) => {
            element.classList.remove(
                'is-complete',
                'is-success',
                'is-failed',
                'is-selected',
                'is-open',
                'is-active'
            );

            element.removeAttribute(
                'data-complete'
            );
        });
    }
}


/* ============================================================================
 * GLOBAL MEDIA CONTROLLER
 * ========================================================================== */

class MediaController {
    constructor(app) {
        this.app = app;

        this.handleVisibility =
            this.handleVisibility.bind(this);

        this.pausedMedia = [];
    }

    init() {
        document.addEventListener(
            'visibilitychange',
            this.handleVisibility
        );

        this.bindSceneMediaEvents();
    }

    bindSceneMediaEvents() {
        document.addEventListener(
            'play',
            (event) => {
                const target =
                    event.target;

                if (
                    target instanceof HTMLMediaElement
                ) {
                    target.dataset.appManaged =
                        'true';
                }
            },
            true
        );
    }

    handleVisibility() {
        if (
            document.hidden
        ) {
            this.pauseForBackground();
        } else {
            this.app.events.emit(
                'media:foreground'
            );
        }
    }

    pauseForBackground() {
        this.pausedMedia = [];

        const activeMedia =
            document.querySelectorAll(
                'audio, video'
            );

        activeMedia.forEach((media) => {
            if (
                !media.paused &&
                !media.ended
            ) {
                this.pausedMedia.push(
                    media
                );

                try {
                    media.pause();
                } catch {
                    // Ignore media failures.
                }
            }
        });

        this.app.events.emit(
            'media:background',
            {
                count:
                    this.pausedMedia.length
            }
        );
    }

    resumeAfterBackground() {
        const media =
            [...this.pausedMedia];

        this.pausedMedia = [];

        media.forEach((element) => {
            try {
                const promise =
                    element.play();

                if (
                    promise &&
                    typeof promise.catch ===
                    'function'
                ) {
                    promise.catch(
                        () => {}
                    );
                }
            } catch {
                // Ignore autoplay restrictions.
            }
        });
    }

    destroy() {
        document.removeEventListener(
            'visibilitychange',
            this.handleVisibility
        );
    }
}


/* ============================================================================
 * ERROR RECOVERY CONTROLLER
 * ========================================================================== */

class ErrorRecoveryManager {
    constructor(app) {
        this.app = app;

        this.handleError =
            this.handleError.bind(this);

        this.handleRejection =
            this.handleRejection.bind(this);
    }

    init() {
        window.addEventListener(
            'error',
            this.handleError
        );

        window.addEventListener(
            'unhandledrejection',
            this.handleRejection
        );
    }

    handleError(event) {
        const error =
            event?.error ||
            new Error(
                event?.message ||
                'Unknown application error.'
            );

        console.error(
            '[SehrishBirthday] Runtime error:',
            error
        );

        this.app.events.emit(
            'app:error',
            {
                type: 'error',
                error,
                event
            }
        );
    }

    handleRejection(event) {
        const reason =
            event?.reason instanceof Error
                ? event.reason
                : new Error(
                    String(
                        event?.reason ||
                        'Unhandled promise rejection.'
                    )
                );

        console.error(
            '[SehrishBirthday] Unhandled promise rejection:',
            reason
        );

        this.app.events.emit(
            'app:error',
            {
                type: 'unhandledrejection',
                error: reason,
                event
            }
        );
    }

    destroy() {
        window.removeEventListener(
            'error',
            this.handleError
        );

        window.removeEventListener(
            'unhandledrejection',
            this.handleRejection
        );
    }
}


/* ============================================================================
 * MAIN APPLICATION CLASS
 * ========================================================================== */

class SehrishBirthdayApp {
    constructor() {
        this.name = APP_CONFIG.name;
        this.version = APP_CONFIG.version;

        this.events = new EventBus();

        this.storage = new StorageManager(
            APP_CONFIG.storage
        );

        this.viewport =
            new ViewportManager(
                this
            );

        this.accessibility =
            new AccessibilityManager(
                this
            );

        this.toast =
            new ToastManager(
                this
            );

        this.loader =
            new LoaderManager(
                this
            );

        this.navigation =
            new NavigationManager(
                this
            );

        this.interactions =
            new InteractionController(
                this
            );

        this.modules =
            new ModuleManager(
                this
            );

        this.sceneEnhancer =
            new SceneEnhancer(
                this
            );

        this.media =
            new MediaController(
                this
            );

        this.errorRecovery =
            new ErrorRecoveryManager(
                this
            );

        this.state = {
            initialized: false,
            ready: false,
            failed: false,
            destroyed: false,
            bootStartedAt: null,
            readyAt: null
        };

        this.handleBeforeUnload =
            this.handleBeforeUnload.bind(this);

        this.handlePageShow =
            this.handlePageShow.bind(this);

        this.handlePageHide =
            this.handlePageHide.bind(this);
    }

    /**
     * Bootstrap application.
     *
     * @returns {Promise<SehrishBirthdayApp>}
     */
    async init() {
        if (
            this.state.initialized ||
            this.state.destroyed
        ) {
            return this;
        }

        this.state.bootStartedAt =
            performance.now();

        document.documentElement.classList.add(
            APP_CONFIG.css.loading
        );

        this.loader.init();

        try {
            this.setupRootMetadata();
            this.accessibility.init();
            this.viewport.init();
            this.toast.init();

            this.errorRecovery.init();
            this.media.init();

            this.navigation.init();

            /*
             * Feature modules are initialized after scene discovery
             * so modules can safely inspect the scene structure.
             */
            this.modules.init();

            this.sceneEnhancer.init();
            this.interactions.init();

            this.bindApplicationEvents();
            this.bindPageLifecycle();

            this.state.initialized = true;

            document.documentElement.classList.add(
                APP_CONFIG.css.initialized
            );

            /*
             * Give DOM/layout a chance to settle before removing
             * the loader. This makes the first visual frame cleaner.
             */
            await this.waitForPaint();

            await this.loader.hide();

            document.documentElement.classList.remove(
                APP_CONFIG.css.loading
            );

            document.documentElement.classList.add(
                APP_CONFIG.css.ready
            );

            this.state.ready = true;
            this.state.readyAt =
                performance.now();

            this.events.emit(
                'app:ready',
                this.getStateSnapshot()
            );

            return this;
        } catch (error) {
            await this.handleBootFailure(
                error
            );

            throw error;
        }
    }

    setupRootMetadata() {
        document.documentElement.dataset.appName =
            this.name;

        document.documentElement.dataset.appVersion =
            this.version;

        document.documentElement.dataset.booted =
            'true';

        const appElement =
            queryFirst(
                APP_CONFIG.selectors.app
            );

        if (appElement) {
            appElement.dataset.appReady =
                'false';
        }
    }

    bindApplicationEvents() {
        this.events.on(
            'app:ready',
            () => {
                const appElement =
                    queryFirst(
                        APP_CONFIG.selectors.app
                    );

                if (appElement) {
                    appElement.dataset.appReady =
                        'true';
                }
            }
        );

        this.events.on(
            'scene:changed',
            ({
                scene,
                index
            }) => {
                this.handleSceneChange(
                    scene,
                    index
                );
            }
        );

        this.events.on(
            'module:error',
            ({
                module,
                error
            }) => {
                console.warn(
                    `[SehrishBirthday] Optional module "${module}" failed to initialize.`,
                    error
                );
            }
        );

        this.events.on(
            'app:error',
            ({
                error
            }) => {
                this.handleRuntimeError(
                    error
                );
            }
        );

        this.events.on(
            'navigation:lock-change',
            ({
                locked
            }) => {
                document.documentElement.dataset.navigationLocked =
                    String(locked);
            }
        );

        this.events.on(
            'viewport:change',
            (viewport) => {
                this.handleViewportChange(
                    viewport
                );
            }
        );

        this.events.on(
            'accessibility:motion-change',
            (reducedMotion) => {
                document.documentElement.dataset.reducedMotion =
                    String(reducedMotion);
            }
        );
    }

    bindPageLifecycle() {
        window.addEventListener(
            'beforeunload',
            this.handleBeforeUnload
        );

        window.addEventListener(
            'pageshow',
            this.handlePageShow
        );

        window.addEventListener(
            'pagehide',
            this.handlePageHide
        );
    }

    handleBeforeUnload() {
        this.persistApplicationState();
    }

    handlePageShow() {
        this.events.emit(
            'page:show'
        );

        if (this.media) {
            this.media.resumeAfterBackground();
        }
    }

    handlePageHide() {
        this.persistApplicationState();

        this.events.emit(
            'page:hide'
        );
    }

    handleSceneChange(
        scene,
        index
    ) {
        if (!scene) {
            return;
        }

        this.updateDocumentTitle(
            scene,
            index
        );

        this.preloadAdjacentScenes(
            index
        );
    }

    updateDocumentTitle(
        scene,
        index
    ) {
        const sceneTitle =
            scene.element.querySelector(
                '[data-scene-title], h1, h2'
            )?.textContent?.trim();

        if (
            sceneTitle
        ) {
            document.title =
                `${sceneTitle} • ${this.name}`;
        } else {
            document.title =
                this.name;
        }

        document.documentElement.dataset.currentScene =
            String(index + 1);
    }

    preloadAdjacentScenes(
        index
    ) {
        const directions = [
            index - 1,
            index + 1
        ];

        directions.forEach(
            (sceneIndex) => {
                const scene =
                    this.navigation.registry.get(
                        sceneIndex
                    );

                if (!scene) {
                    return;
                }

                const lazyImages =
                    scene.element.querySelectorAll(
                        'img[data-preload], img[loading="lazy"][data-scene-preload]'
                    );

                lazyImages.forEach((image) => {
                    if (
                        !image.src &&
                        image.dataset.src
                    ) {
                        image.src =
                            image.dataset.src;
                    }
                });
            }
        );
    }

    handleViewportChange(
        viewport
    ) {
        if (
            viewport.width < 360
        ) {
            document.documentElement.dataset.compactScreen =
                'true';
        } else {
            document.documentElement.dataset.compactScreen =
                'false';
        }
    }

    handleRuntimeError(error) {
        this.state.failed = true;

        /*
         * Runtime errors should not destroy the birthday experience.
         * We expose a subtle toast only when an actual recoverable
         * error reaches application level.
         */
        if (
            this.state.ready &&
            error
        ) {
            this.toast.show(
                'Something small went wrong, but the birthday journey can continue.',
                {
                    type: 'warning'
                }
            );
        }
    }

    async handleBootFailure(
        error
    ) {
        this.state.failed = true;

        document.documentElement.classList.add(
            APP_CONFIG.css.error
        );

        console.error(
            '[SehrishBirthday] Application boot failed:',
            error
        );

        try {
            await this.loader.hide(
                true
            );
        } catch {
            // Ignore loader errors during failure recovery.
        }

        const fallback =
            this.createFallbackMessage();

        if (fallback) {
            document.body.appendChild(
                fallback
            );
        }

        this.events.emit(
            'app:boot-failed',
            {
                error
            }
        );
    }

    createFallbackMessage() {
        const existing =
            document.querySelector(
                '[data-app-fallback]'
            );

        if (existing) {
            return null;
        }

        const wrapper =
            document.createElement(
                'div'
            );

        wrapper.dataset.appFallback =
            'true';

        wrapper.setAttribute(
            'role',
            'alert'
        );

        wrapper.innerHTML = `
            <div
                style="
                    position:fixed;
                    inset:0;
                    z-index:99999;
                    display:grid;
                    place-items:center;
                    padding:24px;
                    background:rgba(255,248,252,.98);
                    font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    text-align:center;
                "
            >
                <div
                    style="
                        width:min(460px,100%);
                        padding:32px;
                        border-radius:28px;
                        background:#ffffff;
                        box-shadow:0 18px 60px rgba(90,60,90,.15);
                    "
                >
                    <div
                        style="
                            font-size:42px;
                            line-height:1;
                            margin-bottom:16px;
                        "
                        aria-hidden="true"
                    >
                        🎂
                    </div>

                    <h2
                        style="
                            margin:0 0 10px;
                            font-size:24px;
                        "
                    >
                        Birthday Experience Loading
                    </h2>

                    <p
                        style="
                            margin:0;
                            line-height:1.65;
                            opacity:.78;
                        "
                    >
                        Please refresh the page once and try again.
                    </p>
                </div>
            </div>
        `;

        return wrapper;
    }

    persistApplicationState() {
        this.storage.set(
            APP_CONFIG.storage.lastScene,
            this.navigation.getCurrentIndex()
        );
    }

    async waitForPaint() {
        await new Promise(
            (resolve) => {
                window.requestAnimationFrame(
                    () => {
                        window.requestAnimationFrame(
                            () => resolve()
                        );
                    }
                );
            }
        );
    }

    getStateSnapshot() {
        return {
            name: this.name,
            version: this.version,
            initialized:
                this.state.initialized,
            ready:
                this.state.ready,
            failed:
                this.state.failed,
            destroyed:
                this.state.destroyed,
            currentScene:
                this.navigation.getCurrentIndex(),
            totalScenes:
                this.navigation.getTotalScenes(),
            viewport:
                {
                    ...this.viewport.state
                },
            modules:
                this.modules.getStatus()
        };
    }

    destroy() {
        if (this.state.destroyed) {
            return;
        }

        this.persistApplicationState();

        window.removeEventListener(
            'beforeunload',
            this.handleBeforeUnload
        );

        window.removeEventListener(
            'pageshow',
            this.handlePageShow
        );

        window.removeEventListener(
            'pagehide',
            this.handlePageHide
        );

        this.interactions.destroy();
        this.navigation.destroy();
        this.media.destroy();
        this.errorRecovery.destroy();
        this.accessibility.destroy();
        this.viewport.destroy();
        this.toast.destroy();
        this.modules.destroy();

        this.events.clear();

        this.state.destroyed =
            true;

        this.state.ready =
            false;

        document.documentElement.classList.remove(
            APP_CONFIG.css.ready,
            APP_CONFIG.css.initialized
        );
    }
}


/* ============================================================================
 * GLOBAL APP INSTANCE
 * ========================================================================== */

let sehrishBirthdayApp = null;


/**
 * Returns existing app instance or creates a new one.
 *
 * @returns {SehrishBirthdayApp}
 */
function getSehrishBirthdayApp() {
    if (!sehrishBirthdayApp) {
        sehrishBirthdayApp =
            new SehrishBirthdayApp();
    }

    return sehrishBirthdayApp;
}


/* ============================================================================
 * PUBLIC GLOBAL API
 * ========================================================================== */

window.SehrishBirthday = Object.freeze({
    version:
        APP_CONFIG.version,

    /**
     * Initialize application.
     *
     * @returns {Promise<SehrishBirthdayApp>}
     */
    init() {
        return getSehrishBirthdayApp()
            .init();
    },

    /**
     * Get application instance.
     *
     * @returns {SehrishBirthdayApp}
     */
    getApp() {
        return getSehrishBirthdayApp();
    },

    /**
     * Navigate to a scene.
     *
     * @param {number|string} target
     * @returns {boolean}
     */
    goTo(target) {
        return getSehrishBirthdayApp()
            .navigation
            .goTo(target);
    },

    /**
     * Move to next scene.
     *
     * @returns {boolean}
     */
    next() {
        return getSehrishBirthdayApp()
            .navigation
            .next();
    },

    /**
     * Move to previous scene.
     *
     * @returns {boolean}
     */
    previous() {
        return getSehrishBirthdayApp()
            .navigation
            .previous();
    },

    /**
     * Restart journey.
     *
     * @returns {boolean}
     */
    restart() {
        return getSehrishBirthdayApp()
            .navigation
            .restart();
    },

    /**
     * Get current application state.
     *
     * @returns {object}
     */
    state() {
        return getSehrishBirthdayApp()
            .getStateSnapshot();
    }
});


/* ============================================================================
 * AUTOMATIC BOOTSTRAP
 * ========================================================================== */

function bootSehrishBirthday() {
    const app =
        getSehrishBirthdayApp();

    app.init()
        .catch((error) => {
            console.error(
                '[SehrishBirthday] Fatal initialization error:',
                error
            );
        });
}


if (
    document.readyState ===
    'loading'
) {
    document.addEventListener(
        'DOMContentLoaded',
        bootSehrishBirthday,
        {
            once: true
        }
    );
} else {
    bootSehrishBirthday();
}


/* ============================================================================
 * DEVELOPMENT HELPERS
 *
 * Exposed only for debugging convenience. They do not affect the birthday
 * experience and can safely be ignored in production.
 * ========================================================================== */

window.SB_DEBUG = Object.freeze({
    getApp:
        () => getSehrishBirthdayApp(),

    state:
        () =>
            getSehrishBirthdayApp()
                .getStateSnapshot(),

    scenes:
        () =>
            getSehrishBirthdayApp()
                .navigation
                .registry
                .scenes,

    modules:
        () =>
            getSehrishBirthdayApp()
                .modules
                .getStatus(),

    goTo:
        (target) =>
            getSehrishBirthdayApp()
                .navigation
                .goTo(target),

    next:
        () =>
            getSehrishBirthdayApp()
                .navigation
                .next(),

    previous:
        () =>
            getSehrishBirthdayApp()
                .navigation
                .previous(),

    restart:
        () =>
            getSehrishBirthdayApp()
                .navigation
                .restart()
});


/* ============================================================================
 * END OF FILE
 * ========================================================================== */