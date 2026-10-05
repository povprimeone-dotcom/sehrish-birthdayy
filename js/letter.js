/**
 * ============================================================================
 * SEHRISH BIRTHDAY EXPERIENCE
 * ============================================================================
 * File    : js/letter.js
 * Project : sehrish-birthday
 * Version : 1.0.0
 *
 * Purpose:
 * - Interactive birthday letter experience
 * - Envelope opening
 * - Letter reveal animation state
 * - Page-by-page letter support
 * - Typewriter mode support
 * - Read progress tracking
 * - Previous / next page navigation
 * - Open / close controls
 * - Optional handwritten-text presentation hooks
 * - Mobile/touch friendly behavior
 * - Keyboard accessibility
 * - Reduced-motion support
 * - Scene lifecycle integration
 * - app.js integration
 * - audio.js integration hooks
 * - Dynamic letter pages
 * - Persistent reading statistics
 * - Safe reset / destroy lifecycle
 *
 * DESIGN:
 * - Visual styling belongs to css/style.css.
 * - Audio assets are deliberately not hard-coded.
 * - The final audio can be chosen later after the scene is reviewed.
 * - Letter text comes from HTML/data attributes rather than being
 *   permanently hard-coded in this controller.
 * ============================================================================
 */

'use strict';


/* ============================================================================
 * CONFIGURATION
 * ========================================================================== */

const LETTER_CONFIG = Object.freeze({
    name: 'Sehrish Birthday Letter',
    version: '1.0.0',

    selectors: Object.freeze({
        root: [
            '[data-letter]',
            '#birthday-letter',
            '.birthday-letter'
        ],

        envelope: [
            '[data-letter-envelope]',
            '.letter-envelope'
        ],

        envelopeOpen: [
            '[data-letter-action="open"]',
            '[data-action="open-letter"]',
            '.letter-open'
        ],

        letter: [
            '[data-letter-paper]',
            '.letter-paper',
            '.birthday-letter-paper'
        ],

        content: [
            '[data-letter-content]',
            '.letter-content'
        ],

        page: [
            '[data-letter-page]',
            '.letter-page'
        ],

        pageContainer: [
            '[data-letter-pages]',
            '.letter-pages'
        ],

        pageNumber: [
            '[data-letter-page-number]',
            '.letter-page-number'
        ],

        pageCount: [
            '[data-letter-page-count]',
            '.letter-page-count'
        ],

        progress: [
            '[data-letter-progress]',
            '.letter-progress'
        ],

        progressText: [
            '[data-letter-progress-text]',
            '.letter-progress-text'
        ],

        previous: [
            '[data-letter-action="previous"]',
            '[data-action="previous-letter-page"]',
            '.letter-previous'
        ],

        next: [
            '[data-letter-action="next"]',
            '[data-action="next-letter-page"]',
            '.letter-next'
        ],

        close: [
            '[data-letter-action="close"]',
            '[data-action="close-letter"]',
            '.letter-close'
        ],

        finish: [
            '[data-letter-action="finish"]',
            '[data-action="finish-letter"]',
            '.letter-finish'
        ],

        restart: [
            '[data-letter-action="restart"]',
            '[data-action="restart-letter"]',
            '.letter-restart'
        ],

        reset: [
            '[data-letter-action="reset"]',
            '[data-action="reset-letter"]',
            '.letter-reset'
        ],

        status: [
            '[data-letter-status]',
            '.letter-status'
        ],

        recipient: [
            '[data-letter-recipient]',
            '.letter-recipient'
        ],

        sender: [
            '[data-letter-sender]',
            '.letter-sender'
        ],

        date: [
            '[data-letter-date]',
            '.letter-date'
        ],

        signature: [
            '[data-letter-signature]',
            '.letter-signature'
        ],

        reveal: [
            '[data-letter-reveal]',
            '.letter-reveal'
        ],

        result: [
            '[data-letter-result]',
            '.letter-result'
        ],

        resultTitle: [
            '[data-letter-result-title]',
            '.letter-result-title'
        ],

        resultText: [
            '[data-letter-result-text]',
            '.letter-result-text'
        ],

        seal: [
            '[data-letter-seal]',
            '.letter-seal'
        ],

        sparkleLayer: [
            '[data-letter-sparkles]',
            '.letter-sparkles'
        ]
    }),

    defaults: Object.freeze({
        autoStart: false,

        autoOpenEnvelope: false,

        pageMode: 'paged',

        typewriter: false,

        typewriterSpeed: 24,

        typewriterChunkSize: 1,

        openDuration: 950,

        closeDuration: 650,

        pageTransitionDuration: 420,

        finishDuration: 1100,

        allowPrevious: true,

        allowClose: true,

        loopPages: false,

        showProgress: true,

        preserveReadingProgress: false,

        announcePageChanges: true,

        sparkleCount: 18,

        reducedMotionRespect: true,

        autoCreatePages: false
    }),

    classes: Object.freeze({
        initialized:
            'letter-initialized',

        active:
            'letter-active',

        opening:
            'letter-opening',

        opened:
            'letter-opened',

        closing:
            'letter-closing',

        closed:
            'letter-closed',

        pageTransition:
            'letter-page-transition',

        typewriting:
            'letter-typewriting',

        complete:
            'letter-complete',

        celebration:
            'letter-celebration',

        reading:
            'letter-reading',

        sealed:
            'letter-sealed',

        selected:
            'letter-page-selected',

        hiddenPage:
            'letter-page-hidden'
    }),

    storage: Object.freeze({
        prefix:
            'sehrish-birthday:',

        pagesRead:
            'letter-pages-read',

        lettersOpened:
            'letters-opened',

        completed:
            'letter-completed'
    }),

    events: Object.freeze({
        initialized:
            'letter:initialized',

        envelopeOpened:
            'letter:envelope-opened',

        opened:
            'letter:opened',

        pageChanged:
            'letter:page-changed',

        typewriterStarted:
            'letter:typewriter-started',

        typewriterCompleted:
            'letter:typewriter-completed',

        closed:
            'letter:closed',

        finished:
            'letter:finished',

        reset:
            'letter:reset',

        destroyed:
            'letter:destroyed'
    }),

    audio: Object.freeze({
        enabled:
            true,

        /*
         * Intentionally empty.
         * Final audio choices are decided later.
         */
        envelopeOpen:
            '',

        pageTurn:
            '',

        typewriter:
            '',

        complete:
            '',

        close:
            ''
    })
});


/* ============================================================================
 * UTILITY HELPERS
 * ========================================================================== */

function letterNormalizeSelectors(
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

    return [
        String(selectors)
    ];
}


function letterQueryFirst(
    selectors,
    root = document
) {
    const list =
        letterNormalizeSelectors(
            selectors
        );

    for (
        const selector
        of list
    ) {
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
                '[Letter] Invalid selector:',
                selector,
                error
            );
        }
    }

    return null;
}


function letterQueryAll(
    selectors,
    root = document
) {
    const list =
        letterNormalizeSelectors(
            selectors
        );

    const output = [];

    const seen =
        new Set();

    for (
        const selector
        of list
    ) {
        try {
            root.querySelectorAll(
                selector
            ).forEach(
                (
                    element
                ) => {
                    if (
                        !seen.has(
                            element
                        )
                    ) {
                        seen.add(
                            element
                        );

                        output.push(
                            element
                        );
                    }
                }
            );
        } catch (error) {
            console.warn(
                '[Letter] Invalid selector:',
                selector,
                error
            );
        }
    }

    return output;
}


function letterToBoolean(
    value,
    fallback = false
) {
    if (
        typeof value ===
        'boolean'
    ) {
        return value;
    }

    if (
        typeof value ===
        'string'
    ) {
        const normalized =
            value
                .trim()
                .toLowerCase();

        if (
            [
                'true',
                '1',
                'yes',
                'on'
            ].includes(
                normalized
            )
        ) {
            return true;
        }

        if (
            [
                'false',
                '0',
                'no',
                'off'
            ].includes(
                normalized
            )
        ) {
            return false;
        }
    }

    return fallback;
}


function letterClamp(
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


function letterReducedMotion() {
    if (
        !LETTER_CONFIG
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


function letterWait(
    milliseconds
) {
    return new Promise(
        (
            resolve
        ) => {
            window.setTimeout(
                resolve,
                Math.max(
                    0,
                    Number(
                        milliseconds
                    ) || 0
                )
            );
        }
    );
}


function letterCreateId() {
    return (
        'letter-' +
        Date.now()
            .toString(36) +
        '-' +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );
}


function letterDispatchEvent(
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
        // Ignore unsupported event environments.
    }
}


/* ============================================================================
 * EVENT BUS
 * ========================================================================== */

class LetterEventBus {
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
                handlers.size ===
                0
            ) {
                this.events.delete(
                    eventName
                );
            }
        };
    }

    emit(
        eventName,
        payload
    ) {
        const handlers =
            this.events.get(
                eventName
            );

        if (
            !handlers
        ) {
            return;
        }

        [
            ...handlers
        ].forEach(
            (
                handler
            ) => {
                try {
                    handler(
                        payload
                    );
                } catch (error) {
                    console.error(
                        '[Letter] Event handler error:',
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

class LetterStorage {
    constructor() {
        this.storage =
            null;

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
        name
    ) {
        return (
            LETTER_CONFIG
                .storage
                .prefix +
            name
        );
    }

    get(
        name,
        fallback = null
    ) {
        if (
            !this.storage
        ) {
            return fallback;
        }

        try {
            const raw =
                this.storage.getItem(
                    this.key(
                        name
                    )
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

    set(
        name,
        value
    ) {
        if (
            !this.storage
        ) {
            return;
        }

        try {
            this.storage.setItem(
                this.key(
                    name
                ),
                JSON.stringify(
                    value
                )
            );
        } catch {
            // Ignore.
        }
    }

    increment(
        name,
        amount = 1
    ) {
        const current =
            Number(
                this.get(
                    name,
                    0
                )
            ) || 0;

        const next =
            current +
            Number(
                amount || 0
            );

        this.set(
            name,
            next
        );

        return next;
    }
}


/* ============================================================================
 * LETTER PAGE MODEL
 * ========================================================================== */

class LetterPage {
    constructor(
        options = {}
    ) {
        this.id =
            options.id ||
            letterCreateId();

        this.index =
            Number(
                options.index || 0
            );

        this.title =
            options.title ||
            '';

        this.content =
            options.content ||
            '';

        this.element =
            options.element ||
            null;

        this.read =
            false;

        this.typewriterComplete =
            false;

        this.metadata =
            {
                ...(options.metadata || {})
            };
    }
}


/* ============================================================================
 * MAIN LETTER MANAGER
 * ========================================================================== */

class BirthdayLetterManager {
    constructor() {
        this.name =
            LETTER_CONFIG.name;

        this.version =
            LETTER_CONFIG.version;

        this.config =
            {
                ...LETTER_CONFIG
                    .defaults
            };

        this.root =
            null;

        this.envelope =
            null;

        this.letter =
            null;

        this.app =
            null;

        this.audio =
            null;

        this.events =
            new LetterEventBus();

        this.storage =
            new LetterStorage();

        this.pages =
            [];

        this.currentPage =
            0;

        this.open =
            false;

        this.opening =
            false;

        this.closing =
            false;

        this.completed =
            false;

        this.initialized =
            false;

        this.destroyed =
            false;

        this.typing =
            false;

        this.typewriterTimer =
            null;

        this.transitionTimer =
            null;

        this.finishTimer =
            null;

        this.sparkleTimer =
            null;

        this.lettersOpened =
            0;

        this.pagesRead =
            0;

        this.previousFocus =
            null;

        this.ui =
            {
                content:
                    null,

                pageContainer:
                    null,

                pageNumber:
                    [],

                pageCount:
                    [],

                progress:
                    [],

                progressText:
                    [],

                previous:
                    [],

                next:
                    [],

                close:
                    [],

                open:
                    [],

                finish:
                    [],

                restart:
                    [],

                reset:
                    [],

                status:
                    [],

                recipient:
                    [],

                sender:
                    [],

                date:
                    [],

                signature:
                    [],

                reveal:
                    [],

                result:
                    [],

                resultTitle:
                    [],

                resultText:
                    [],

                seal:
                    [],

                sparkleLayer:
                    null
            };

        this.boundHandlers =
            {
                keydown:
                    this.handleKeyDown
                        .bind(
                            this
                        ),

                sceneChanged:
                    this.handleSceneChanged
                        .bind(
                            this
                        ),

                visibility:
                    this.handleVisibility
                        .bind(
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
            this.initialized ||
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
                LETTER_CONFIG
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

        this.discoverStructure();

        this.discoverPages();

        this.discoverUI();

        this.restoreStatistics();

        this.bindEvents();

        this.setupAccessibility();

        this.prepareInitialState();

        this.initialized =
            true;

        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .initialized
        );

        this.updateUI();

        if (
            this.config.autoStart
        ) {
            this.start();
        }

        this.emit(
            LETTER_CONFIG
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
            // Audio is optional.
        }

        return null;
    }


    findDOM() {
        this.root =
            letterQueryFirst(
                LETTER_CONFIG
                    .selectors
                    .root
            );
    }


    loadConfiguration() {
        const dataset =
            this.root.dataset;

        this.config.autoStart =
            letterToBoolean(
                dataset.letterAutoStart,
                this.config.autoStart
            );

        this.config.autoOpenEnvelope =
            letterToBoolean(
                dataset.letterAutoOpen,
                this.config.autoOpenEnvelope
            );

        this.config.typewriter =
            letterToBoolean(
                dataset.letterTypewriter,
                this.config.typewriter
            );

        this.config.allowPrevious =
            letterToBoolean(
                dataset.letterAllowPrevious,
                this.config.allowPrevious
            );

        this.config.allowClose =
            letterToBoolean(
                dataset.letterAllowClose,
                this.config.allowClose
            );

        this.config.loopPages =
            letterToBoolean(
                dataset.letterLoopPages,
                this.config.loopPages
            );

        this.config.preserveReadingProgress =
            letterToBoolean(
                dataset.letterPersistProgress,
                this.config.preserveReadingProgress
            );

        if (
            dataset.letterPageMode
        ) {
            this.config.pageMode =
                dataset.letterPageMode;
        }

        if (
            dataset.letterTypewriterSpeed
        ) {
            this.config.typewriterSpeed =
                Math.max(
                    5,
                    Number(
                        dataset
                            .letterTypewriterSpeed
                    ) || 24
                );
        }
    }


    /* ========================================================================
     * STRUCTURE DISCOVERY
     * ====================================================================== */

    discoverStructure() {
        this.envelope =
            letterQueryFirst(
                LETTER_CONFIG
                    .selectors
                    .envelope,
                this.root
            );

        this.letter =
            letterQueryFirst(
                LETTER_CONFIG
                    .selectors
                    .letter,
                this.root
            );

        this.ui.content =
            letterQueryFirst(
                LETTER_CONFIG
                    .selectors
                    .content,
                this.root
            );

        this.ui.pageContainer =
            letterQueryFirst(
                LETTER_CONFIG
                    .selectors
                    .pageContainer,
                this.root
            );

        if (
            this.ui.pageContainer
        ) {
            this.ui.pageContainer
                .dataset
                .letterPagesReady =
                'true';
        }
    }


    /* ========================================================================
     * PAGE DISCOVERY
     * ====================================================================== */

    discoverPages() {
        const pageElements =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .page,
                this.ui.pageContainer ||
                this.root
            );

        this.pages =
            pageElements.map(
                (
                    element,
                    index
                ) => {
                    const title =
                        element.dataset
                            .letterPageTitle ||
                        '';

                    const content =
                        element.dataset
                            .letterPageContent ||
                        element
                            .innerHTML ||
                        '';

                    const page =
                        new LetterPage({
                            id:
                                element.dataset
                                    .letterPageId ||
                                `page-${
                                    index + 1
                                }`,

                            index,

                            title,

                            content,

                            element,

                            metadata:
                                {
                                    originalHTML:
                                        element.innerHTML
                                }
                        });

                    element.dataset
                        .letterPageId =
                        page.id;

                    element.dataset
                        .letterPageIndex =
                        String(
                            index
                        );

                    return page;
                }
            );

        if (
            this.pages.length ===
                0 &&
            this.config
                .autoCreatePages
        ) {
            this.createFallbackPage();
        }

        this.pages.forEach(
            (
                page,
                index
            ) => {
                page.index =
                    index;
            }
        );

        this.hideAllPages();

        this.restoreReadingProgress();
    }


    createFallbackPage() {
        if (
            !this.ui.pageContainer
        ) {
            return;
        }

        const element =
            document.createElement(
                'article'
            );

        element.className =
            'letter-page';

        element.dataset.letterPage =
            'true';

        element.dataset.letterPageId =
            'page-1';

        element.innerHTML = `
            <div
                class="letter-page__content"
                data-letter-page-content
            >
                <p>
                    A special birthday message is waiting here.
                </p>
            </div>
        `;

        this.ui.pageContainer
            .appendChild(
                element
            );

        const page =
            new LetterPage({
                id:
                    'page-1',

                index:
                    0,

                title:
                    '',

                content:
                    element.innerHTML,

                element
            });

        this.pages.push(
            page
        );
    }


    hideAllPages() {
        this.pages.forEach(
            (
                page
            ) => {
                if (
                    page.element
                ) {
                    page.element.hidden =
                        true;

                    page.element.classList.add(
                        LETTER_CONFIG
                            .classes
                            .hiddenPage
                    );
                }
            }
        );
    }


    showCurrentPage() {
        const current =
            this.getCurrentPage();

        this.pages.forEach(
            (
                page,
                index
            ) => {
                const active =
                    index ===
                    this.currentPage;

                if (
                    page.element
                ) {
                    page.element.hidden =
                        !active;

                    page.element.classList.toggle(
                        LETTER_CONFIG
                            .classes
                            .selected,
                        active
                    );

                    page.element.classList.toggle(
                        LETTER_CONFIG
                            .classes
                            .hiddenPage,
                        !active
                    );
                }
            }
        );

        if (
            current
        ) {
            this.pages[
                this.currentPage
            ].read =
                true;
        }

        this.updateProgress();
    }


    /* ========================================================================
     * UI DISCOVERY
     * ====================================================================== */

    discoverUI() {
        this.ui.pageNumber =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .pageNumber,
                this.root
            );

        this.ui.pageCount =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .pageCount,
                this.root
            );

        this.ui.progress =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .progress,
                this.root
            );

        this.ui.progressText =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .progressText,
                this.root
            );

        this.ui.previous =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .previous,
                this.root
            );

        this.ui.next =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .next,
                this.root
            );

        this.ui.close =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .close,
                this.root
            );

        this.ui.open =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .envelopeOpen,
                this.root
            );

        this.ui.finish =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .finish,
                this.root
            );

        this.ui.restart =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .restart,
                this.root
            );

        this.ui.reset =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .reset,
                this.root
            );

        this.ui.status =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .status,
                this.root
            );

        this.ui.recipient =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .recipient,
                this.root
            );

        this.ui.sender =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .sender,
                this.root
            );

        this.ui.date =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .date,
                this.root
            );

        this.ui.signature =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .signature,
                this.root
            );

        this.ui.reveal =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .reveal,
                this.root
            );

        this.ui.result =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .result,
                this.root
            );

        this.ui.resultTitle =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .resultTitle,
                this.root
            );

        this.ui.resultText =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .resultText,
                this.root
            );

        this.ui.seal =
            letterQueryAll(
                LETTER_CONFIG
                    .selectors
                    .seal,
                this.root
            );

        this.ui.sparkleLayer =
            letterQueryFirst(
                LETTER_CONFIG
                    .selectors
                    .sparkleLayer,
                this.root
            );
    }


    /* ========================================================================
     * EVENT BINDING
     * ====================================================================== */

    bindEvents() {
        this.ui.open.forEach(
            (
                button
            ) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.openLetter();
                    }
                );
            }
        );

        this.ui.previous.forEach(
            (
                button
            ) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.previousPage();
                    }
                );
            }
        );

        this.ui.next.forEach(
            (
                button
            ) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.nextPage();
                    }
                );
            }
        );

        this.ui.close.forEach(
            (
                button
            ) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.closeLetter();
                    }
                );
            }
        );

        this.ui.finish.forEach(
            (
                button
            ) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.finishLetter();
                    }
                );
            }
        );

        this.ui.restart.forEach(
            (
                button
            ) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.restart();
                    }
                );
            }
        );

        this.ui.reset.forEach(
            (
                button
            ) => {
                button.addEventListener(
                    'click',
                    () => {
                        this.reset();
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

        this.root.setAttribute(
            'aria-label',
            this.root.getAttribute(
                'aria-label'
            ) ||
            'Interactive birthday letter'
        );

        if (
            this.letter
        ) {
            this.letter.setAttribute(
                'aria-hidden',
                'true'
            );
        }
    }


    /* ========================================================================
     * INITIAL STATE
     * ====================================================================== */

    prepareInitialState() {
        this.currentPage =
            letterClamp(
                this.currentPage,
                0,
                Math.max(
                    0,
                    this.pages.length -
                        1
                )
            );

        this.open =
            false;

        this.opening =
            false;

        this.closing =
            false;

        this.completed =
            false;

        this.typing =
            false;

        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .sealed
        );

        this.root.classList.remove(
            LETTER_CONFIG
                .classes
                .opened,

            LETTER_CONFIG
                .classes
                .active,

            LETTER_CONFIG
                .classes
                .complete,

            LETTER_CONFIG
                .classes
                .celebration,

            LETTER_CONFIG
                .classes
                .reading
        );

        this.updateUI();
    }


    /* ========================================================================
     * OPEN LETTER
     * ====================================================================== */

    async openLetter() {
        if (
            this.open ||
            this.opening ||
            this.destroyed
        ) {
            return false;
        }

        if (
            this.pages.length ===
                0
        ) {
            this.showStatus(
                'The birthday letter is not ready yet.'
            );

            return false;
        }

        this.opening =
            true;

        this.previousFocus =
            document.activeElement;

        this.root.classList.remove(
            LETTER_CONFIG
                .classes
                .sealed
        );

        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .opening
        );

        this.announce(
            'Opening the birthday letter.'
        );

        this.playAudio(
            'envelopeOpen'
        );

        this.emit(
            LETTER_CONFIG
                .events
                .envelopeOpened,
            {
                state:
                    this.getState()
            }
        );

        await letterWait(
            letterReducedMotion()
                ? 120
                : LETTER_CONFIG
                    .defaults
                    .openDuration
        );

        this.opening =
            false;

        this.open =
            true;

        this.root.classList.remove(
            LETTER_CONFIG
                .classes
                .opening
        );

        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .opened,

            LETTER_CONFIG
                .classes
                .active,

            LETTER_CONFIG
                .classes
                .reading
        );

        if (
            this.letter
        ) {
            this.letter.setAttribute(
                'aria-hidden',
                'false'
            );
        }

        this.lettersOpened +=
            1;

        this.storage.set(
            LETTER_CONFIG
                .storage
                .lettersOpened,
            this.lettersOpened
        );

        this.showCurrentPage();

        this.updateUI();

        this.emit(
            LETTER_CONFIG
                .events
                .opened,
            {
                state:
                    this.getState()
            }
        );

        this.focusLetter();

        if (
            this.config.typewriter
        ) {
            await this.startTypewriter(
                this.getCurrentPage()
            );
        }

        return true;
    }


    /* ========================================================================
     * START TYPEWRITER
     * ====================================================================== */

    async startTypewriter(
        page
    ) {
        if (
            !page ||
            !page.element ||
            !this.config.typewriter
        ) {
            return false;
        }

        const content =
            letterQueryFirst(
                [
                    '[data-letter-page-content]',
                    '.letter-page__content',
                    '.letter-content'
                ],
                page.element
            ) ||
            page.element;

        if (
            !content
        ) {
            return false;
        }

        const fullHTML =
            page.metadata
                .originalHTML ||
            content.innerHTML;

        if (
            !fullHTML
        ) {
            return false;
        }

        if (
            page.typewriterComplete
        ) {
            return false;
        }

        /*
         * For rich HTML, we only type plain text into a dedicated
         * temporary layer. This preserves safety and avoids constructing
         * malformed HTML one character at a time.
         */
        const plainText =
            content.textContent
                ?.trim() ||
            '';

        if (
            !plainText
        ) {
            page.typewriterComplete =
                true;

            return false;
        }

        this.typing =
            true;

        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .typewriting
        );

        this.emit(
            LETTER_CONFIG
                .events
                .typewriterStarted,
            {
                page,
                index:
                    page.index
            }
        );

        if (
            letterReducedMotion()
        ) {
            content.textContent =
                plainText;

            page.typewriterComplete =
                true;

            this.typing =
                false;

            this.root.classList.remove(
                LETTER_CONFIG
                    .classes
                    .typewriting
            );

            this.emit(
                LETTER_CONFIG
                    .events
                    .typewriterCompleted,
                {
                    page
                }
            );

            return true;
        }

        content.innerHTML =
            '';

        const textNode =
            document.createTextNode(
                ''
            );

        content.appendChild(
            textNode
        );

        let position =
            0;

        const speed =
            Math.max(
                5,
                Number(
                    this.config
                        .typewriterSpeed
                ) || 24
            );

        await new Promise(
            (
                resolve
            ) => {
                const tick =
                    () => {
                        if (
                            !this.open ||
                            page !==
                                this.getCurrentPage()
                        ) {
                            resolve();

                            return;
                        }

                        const chunk =
                            plainText.slice(
                                position,
                                position +
                                    Math.max(
                                        1,
                                        Number(
                                            this.config
                                                .typewriterChunkSize
                                        ) || 1
                                    )
                            );

                        textNode.nodeValue +=
                            chunk;

                        position +=
                            chunk.length;

                        if (
                            position >=
                            plainText.length
                        ) {
                            resolve();

                            return;
                        }

                        this.typewriterTimer =
                            window.setTimeout(
                                tick,
                                speed
                            );
                    };

                tick();
            }
        );

        /*
         * Restore original rich HTML after the typewriter has completed.
         * This keeps paragraph/strong/emphasis markup intact.
         */
        if (
            this.open &&
            page === this.getCurrentPage()
        ) {
            content.innerHTML =
                fullHTML;

            page.typewriterComplete =
                true;
        }

        this.typing =
            false;

        this.root.classList.remove(
            LETTER_CONFIG
                .classes
                .typewriting
        );

        this.emit(
            LETTER_CONFIG
                .events
                .typewriterCompleted,
            {
                page
            }
        );

        return true;
    }


    /* ========================================================================
     * PAGE NAVIGATION
     * ====================================================================== */

    async nextPage() {
        if (
            !this.open ||
            this.opening ||
            this.closing ||
            this.typing
        ) {
            return false;
        }

        const current =
            this.getCurrentPage();

        if (
            current
        ) {
            current.read =
                true;
        }

        if (
            this.currentPage >=
            this.pages.length -
                1
        ) {
            return this.finishLetter();
        }

        this.playAudio(
            'pageTurn'
        );

        this.currentPage +=
            1;

        await this.transitionPage(
            'next'
        );

        this.showCurrentPage();

        this.pagesRead =
            Math.max(
                this.pagesRead,
                this.currentPage +
                    1
            );

        this.storage.set(
            LETTER_CONFIG
                .storage
                .pagesRead,
            this.pagesRead
        );

        this.updateUI();

        this.emit(
            LETTER_CONFIG
                .events
                .pageChanged,
            {
                direction:
                    'next',

                page:
                    this.getCurrentPage(),

                index:
                    this.currentPage,

                state:
                    this.getState()
            }
        );

        this.announceCurrentPage();

        if (
            this.config.typewriter
        ) {
            await this.startTypewriter(
                this.getCurrentPage()
            );
        }

        return true;
    }


    async previousPage() {
        if (
            !this.open ||
            this.opening ||
            this.closing ||
            this.typing
        ) {
            return false;
        }

        if (
            !this.config
                .allowPrevious
        ) {
            return false;
        }

        if (
            this.currentPage <=
            0
        ) {
            return false;
        }

        this.playAudio(
            'pageTurn'
        );

        this.currentPage -=
            1;

        await this.transitionPage(
            'previous'
        );

        this.showCurrentPage();

        this.updateUI();

        this.emit(
            LETTER_CONFIG
                .events
                .pageChanged,
            {
                direction:
                    'previous',

                page:
                    this.getCurrentPage(),

                index:
                    this.currentPage,

                state:
                    this.getState()
            }
        );

        this.announceCurrentPage();

        if (
            this.config.typewriter
        ) {
            await this.startTypewriter(
                this.getCurrentPage()
            );
        }

        return true;
    }


    async transitionPage(
        direction
    ) {
        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .pageTransition
        );

        this.root.dataset
            .letterTransition =
            direction;

        if (
            !letterReducedMotion()
        ) {
            await letterWait(
                LETTER_CONFIG
                    .defaults
                    .pageTransitionDuration
            );
        }

        this.root.classList.remove(
            LETTER_CONFIG
                .classes
                .pageTransition
        );

        delete this.root.dataset
            .letterTransition;
    }


    /* ========================================================================
     * FINISH
     * ====================================================================== */

    async finishLetter() {
        if (
            !this.open ||
            this.completed ||
            this.typing
        ) {
            return false;
        }

        if (
            this.currentPage <
            this.pages.length -
                1
        ) {
            this.currentPage =
                this.pages.length -
                1;

            this.showCurrentPage();
        }

        this.pages.forEach(
            (
                page
            ) => {
                page.read =
                    true;
            }
        );

        this.pagesRead =
            this.pages.length;

        this.storage.set(
            LETTER_CONFIG
                .storage
                .pagesRead,
            this.pagesRead
        );

        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .celebration
        );

        this.showResult();

        this.playAudio(
            'complete'
        );

        this.createSparkles();

        await letterWait(
            letterReducedMotion()
                ? 120
                : LETTER_CONFIG
                    .defaults
                    .finishDuration
        );

        this.completed =
            true;

        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .complete
        );

        this.storage.set(
            LETTER_CONFIG
                .storage
                .completed,
            true
        );

        this.emit(
            LETTER_CONFIG
                .events
                .finished,
            {
                state:
                    this.getState()
            }
        );

        this.announce(
            'The birthday letter has been completely read.'
        );

        this.updateUI();

        return true;
    }


    /* ========================================================================
     * RESULT
     * ====================================================================== */

    showResult() {
        this.ui.result.forEach(
            (
                element
            ) => {
                element.hidden =
                    false;

                element.classList.add(
                    'is-visible'
                );
            }
        );

        this.ui.resultTitle.forEach(
            (
                element
            ) => {
                element.textContent =
                    'Letter read with love. 💕';
            }
        );

        this.ui.resultText.forEach(
            (
                element
            ) => {
                element.textContent =
                    'This little birthday message is now yours to keep.';
            }
        );
    }


    hideResult() {
        this.ui.result.forEach(
            (
                element
            ) => {
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


    /* ========================================================================
     * CLOSE / RESET
     * ====================================================================== */

    async closeLetter() {
        if (
            !this.open ||
            !this.config.allowClose ||
            this.closing
        ) {
            return false;
        }

        this.stopTypewriter();

        this.closing =
            true;

        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .closing
        );

        this.playAudio(
            'close'
        );

        await letterWait(
            letterReducedMotion()
                ? 100
                : LETTER_CONFIG
                    .defaults
                    .closeDuration
        );

        this.closing =
            false;

        this.open =
            false;

        this.root.classList.remove(
            LETTER_CONFIG
                .classes
                .closing,

            LETTER_CONFIG
                .classes
                .opened,

            LETTER_CONFIG
                .classes
                .active,

            LETTER_CONFIG
                .classes
                .reading
        );

        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .closed
        );

        if (
            this.letter
        ) {
            this.letter.setAttribute(
                'aria-hidden',
                'true'
            );
        }

        this.emit(
            LETTER_CONFIG
                .events
                .closed,
            {
                state:
                    this.getState()
            }
        );

        this.restoreFocus();

        return true;
    }


    restart() {
        this.stopTypewriter();

        this.currentPage =
            0;

        this.completed =
            false;

        this.open =
            false;

        this.opening =
            false;

        this.closing =
            false;

        this.typing =
            false;

        this.pages.forEach(
            (
                page
            ) => {
                page.read =
                    false;

                page.typewriterComplete =
                    false;

                if (
                    page.element
                ) {
                    const original =
                        page.metadata
                            .originalHTML;

                    if (
                        original
                    ) {
                        page.element
                            .innerHTML =
                            original;
                    }
                }
            }
        );

        this.pagesRead =
            0;

        this.root.classList.remove(
            LETTER_CONFIG
                .classes
                .opened,

            LETTER_CONFIG
                .classes
                .opening,

            LETTER_CONFIG
                .classes
                .closing,

            LETTER_CONFIG
                .classes
                .active,

            LETTER_CONFIG
                .classes
                .reading,

            LETTER_CONFIG
                .classes
                .complete,

            LETTER_CONFIG
                .classes
                .celebration,

            LETTER_CONFIG
                .classes
                .pageTransition
        );

        this.root.classList.add(
            LETTER_CONFIG
                .classes
                .sealed
        );

        this.hideResult();

        this.hideAllPages();

        this.updateUI();

        return true;
    }


    reset() {
        this.stopTypewriter();

        window.clearTimeout(
            this.transitionTimer
        );

        window.clearTimeout(
            this.finishTimer
        );

        window.clearTimeout(
            this.sparkleTimer
        );

        this.restart();

        this.lettersOpened =
            0;

        this.storage.set(
            LETTER_CONFIG
                .storage
                .lettersOpened,
            0
        );

        this.storage.set(
            LETTER_CONFIG
                .storage
                .pagesRead,
            0
        );

        this.storage.set(
            LETTER_CONFIG
                .storage
                .completed,
            false
        );

        this.emit(
            LETTER_CONFIG
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
     * TYPEWRITER CONTROL
     * ====================================================================== */

    stopTypewriter() {
        if (
            this.typewriterTimer !==
            null
        ) {
            window.clearTimeout(
                this.typewriterTimer
            );

            this.typewriterTimer =
                null;
        }

        this.typing =
            false;

        this.root?.classList.remove(
            LETTER_CONFIG
                .classes
                .typewriting
        );
    }


    /* ========================================================================
     * SPARKLES
     * ====================================================================== */

    createSparkles() {
        if (
            letterReducedMotion()
        ) {
            return;
        }

        let layer =
            this.ui.sparkleLayer;

        if (
            !layer
        ) {
            layer =
                document.createElement(
                    'div'
                );

            layer.className =
                'letter-sparkles';

            layer.dataset
                .letterSparkles =
                'true';

            layer.setAttribute(
                'aria-hidden',
                'true'
            );

            this.root.appendChild(
                layer
            );

            this.ui.sparkleLayer =
                layer;
        }

        while (
            layer.firstChild
        ) {
            layer.firstChild.remove();
        }

        for (
            let index = 0;
            index <
            LETTER_CONFIG
                .defaults
                .sparkleCount;
            index += 1
        ) {
            const sparkle =
                document.createElement(
                    'span'
                );

            sparkle.className =
                'letter-sparkle';

            sparkle.setAttribute(
                'aria-hidden',
                'true'
            );

            sparkle.style.setProperty(
                '--sparkle-x',
                `${Math.random() * 100}%`
            );

            sparkle.style.setProperty(
                '--sparkle-y',
                `${Math.random() * 100}%`
            );

            sparkle.style.setProperty(
                '--sparkle-delay',
                `${Math.random() * 600}ms`
            );

            layer.appendChild(
                sparkle
            );
        }

        window.clearTimeout(
            this.sparkleTimer
        );

        this.sparkleTimer =
            window.setTimeout(
                () => {
                    while (
                        layer.firstChild
                    ) {
                        layer.firstChild.remove();
                    }
                },
                2400
            );
    }


    /* ========================================================================
     * UI
     * ====================================================================== */

    updateUI() {
        const total =
            this.pages.length;

        const current =
            total > 0
                ? this.currentPage +
                    1
                : 0;

        const progress =
            total > 0
                ? (
                    current /
                    total
                ) *
                100
                : 0;

        this.ui.pageNumber.forEach(
            (
                element
            ) => {
                element.textContent =
                    String(
                        current
                    );
            }
        );

        this.ui.pageCount.forEach(
            (
                element
            ) => {
                element.textContent =
                    String(
                        total
                    );
            }
        );

        this.ui.progress.forEach(
            (
                element
            ) => {
                const value =
                    letterClamp(
                        progress,
                        0,
                        100
                    );

                element.style.setProperty(
                    '--letter-progress',
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

        this.ui.progressText.forEach(
            (
                element
            ) => {
                element.textContent =
                    `${current} / ${total}`;
            }
        );

        this.updateNavigationControls();

        this.updateMetadata();

        this.updateStateClasses();

        if (
            this.open
        ) {
            this.updateStatus();
        }
    }


    updateNavigationControls() {
        const atStart =
            this.currentPage <=
            0;

        const atEnd =
            this.currentPage >=
            this.pages.length -
                1;

        this.ui.previous.forEach(
            (
                button
            ) => {
                button.disabled =
                    !this.open ||
                    (
                        atStart &&
                        !this.config
                            .allowPrevious
                    );
            }
        );

        this.ui.next.forEach(
            (
                button
            ) => {
                button.disabled =
                    !this.open ||
                    (
                        atEnd &&
                        !this.config
                            .loopPages
                    ) ||
                    this.completed;
            }
        );

        this.ui.finish.forEach(
            (
                button
            ) => {
                button.disabled =
                    !this.open ||
                    this.completed;
            }
        );

        this.ui.close.forEach(
            (
                button
            ) => {
                button.disabled =
                    !this.open ||
                    this.closing ||
                    !this.config
                        .allowClose;
            }
        );
    }


    updateMetadata() {
        const dataset =
            this.root.dataset;

        this.setText(
            this.ui.recipient,
            dataset.letterRecipient ||
            ''
        );

        this.setText(
            this.ui.sender,
            dataset.letterSender ||
            ''
        );

        this.setText(
            this.ui.date,
            dataset.letterDate ||
            ''
        );

        this.setText(
            this.ui.signature,
            dataset.letterSignature ||
            ''
        );
    }


    setText(
        elements,
        value
    ) {
        if (
            value ===
            undefined
        ) {
            return;
        }

        elements.forEach(
            (
                element
            ) => {
                element.textContent =
                    String(
                        value
                    );
            }
        );
    }


    updateProgress() {
        const total =
            this.pages.length;

        const read =
            this.pages.filter(
                (
                    page
                ) =>
                    page.read
            ).length;

        this.pagesRead =
            Math.max(
                this.pagesRead,
                read
            );

        const percentage =
            total > 0
                ? (
                    this.pagesRead /
                    total
                ) *
                100
                : 0;

        this.ui.progress.forEach(
            (
                element
            ) => {
                element.style.setProperty(
                    '--letter-progress',
                    `${letterClamp(
                        percentage,
                        0,
                        100
                    )}%`
                );
            }
        );
    }


    updateStateClasses() {
        const classes =
            LETTER_CONFIG.classes;

        this.root.classList.toggle(
            classes.opened,
            this.open
        );

        this.root.classList.toggle(
            classes.active,
            this.open
        );

        this.root.classList.toggle(
            classes.complete,
            this.completed
        );

        this.root.classList.toggle(
            classes.celebration,
            this.completed
        );

        this.root.classList.toggle(
            classes.reading,
            this.open &&
            !this.completed
        );

        this.root.dataset.letterState =
            this.getStateName();

        this.root.dataset.letterPage =
            String(
                this.currentPage + 1
            );

        this.root.dataset.letterPages =
            String(
                this.pages.length
            );
    }


    updateStatus() {
        let message =
            '';

        if (
            this.completed
        ) {
            message =
                'Birthday letter complete. 💕';
        } else if (
            this.open
        ) {
            message =
                `Reading page ${
                    this.currentPage + 1
                } of ${
                    this.pages.length
                }.`;
        } else {
            message =
                'A special birthday letter is waiting.';
        }

        this.showStatus(
            message
        );
    }


    showStatus(
        message
    ) {
        this.ui.status.forEach(
            (
                element
            ) => {
                element.textContent =
                    String(
                        message
                    );
            }
        );
    }


    /* ========================================================================
     * ACCESSIBILITY FOCUS
     * ====================================================================== */

    focusLetter() {
        if (
            !this.letter
        ) {
            return;
        }

        const target =
            this.ui.close[0] ||
            this.letter;

        if (
            typeof target.focus !==
                'function'
        ) {
            return;
        }

        if (
            !target.hasAttribute(
                'tabindex'
            )
        ) {
            target.setAttribute(
                'tabindex',
                '-1'
            );
        }

        window.setTimeout(
            () => {
                try {
                    target.focus({
                        preventScroll:
                            true
                    });
                } catch {
                    try {
                        target.focus();
                    } catch {
                        // Ignore.
                    }
                }
            },
            30
        );
    }


    restoreFocus() {
        const target =
            this.previousFocus;

        this.previousFocus =
            null;

        if (
            !target ||
            !document.contains(
                target
            ) ||
            typeof target.focus !==
                'function'
        ) {
            return;
        }

        window.setTimeout(
            () => {
                try {
                    target.focus({
                        preventScroll:
                            true
                    });
                } catch {
                    try {
                        target.focus();
                    } catch {
                        // Ignore.
                    }
                }
            },
            30
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

        let region =
            document.getElementById(
                'letter-live-region'
            );

        if (
            !region
        ) {
            region =
                document.createElement(
                    'div'
                );

            region.id =
                'letter-live-region';

            region.setAttribute(
                'aria-live',
                'polite'
            );

            region.setAttribute(
                'aria-atomic',
                'true'
            );

            Object.assign(
                region.style,
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
                region
            );
        }

        region.textContent =
            String(
                message
            );
    }


    announceCurrentPage() {
        if (
            !this.config
                .announcePageChanges
        ) {
            return;
        }

        this.announce(
            `Page ${
                this.currentPage + 1
            } of ${
                this.pages.length
            }.`
        );
    }


    /* ========================================================================
     * STATE
     * ====================================================================== */

    getCurrentPage() {
        return (
            this.pages[
                this.currentPage
            ] ||
            null
        );
    }


    getStateName() {
        if (
            this.completed
        ) {
            return 'completed';
        }

        if (
            this.typing
        ) {
            return 'typing';
        }

        if (
            this.opening
        ) {
            return 'opening';
        }

        if (
            this.closing
        ) {
            return 'closing';
        }

        if (
            this.open
        ) {
            return 'reading';
        }

        return 'sealed';
    }


    getState() {
        const page =
            this.getCurrentPage();

        return {
            initialized:
                this.initialized,

            open:
                this.open,

            opening:
                this.opening,

            closing:
                this.closing,

            typing:
                this.typing,

            completed:
                this.completed,

            currentPage:
                this.currentPage,

            pageNumber:
                this.currentPage +
                1,

            totalPages:
                this.pages.length,

            pagesRead:
                this.pagesRead,

            progress:
                this.pages.length > 0
                    ? (
                        this.pagesRead /
                        this.pages.length
                    ) *
                    100
                    : 0,

            currentPageId:
                page?.id ||
                null,

            lettersOpened:
                this.lettersOpened,

            state:
                this.getStateName()
        };
    }


    /* ========================================================================
     * PERSISTENCE
     * ====================================================================== */

    restoreStatistics() {
        this.lettersOpened =
            Number(
                this.storage.get(
                    LETTER_CONFIG
                        .storage
                        .lettersOpened,
                    0
                )
            ) || 0;

        this.pagesRead =
            Number(
                this.storage.get(
                    LETTER_CONFIG
                        .storage
                        .pagesRead,
                    0
                )
            ) || 0;
    }


    restoreReadingProgress() {
        if (
            !this.config
                .preserveReadingProgress
        ) {
            return;
        }

        const saved =
            Number(
                this.storage.get(
                    LETTER_CONFIG
                        .storage
                        .pagesRead,
                    0
                )
            ) || 0;

        if (
            saved > 0 &&
            saved <
                this.pages.length
        ) {
            this.currentPage =
                saved - 1;

            this.pages.forEach(
                (
                    page,
                    index
                ) => {
                    page.read =
                        index <
                        saved;
                }
            );
        }
    }


    /* ========================================================================
     * KEYBOARD
     * ====================================================================== */

    handleKeyDown(
        event
    ) {
        if (
            !this.root
        ) {
            return;
        }

        const key =
            String(
                event.key ||
                ''
            ).toLowerCase();

        if (
            !this.open
        ) {
            if (
                (
                    key ===
                        'enter' ||
                    key ===
                        ' '
                ) &&
                this.envelope
            ) {
                event.preventDefault();

                this.openLetter();
            }

            return;
        }

        if (
            this.typing
        ) {
            return;
        }

        switch (
            key
        ) {
            case 'escape':
                if (
                    this.config
                        .allowClose
                ) {
                    event.preventDefault();

                    this.closeLetter();
                }
                break;

            case 'arrowright':
                event.preventDefault();

                this.nextPage();
                break;

            case 'arrowleft':
                event.preventDefault();

                this.previousPage();
                break;

            case 'home':
                event.preventDefault();

                this.currentPage =
                    0;

                this.showCurrentPage();

                this.updateUI();
                break;

            case 'end':
                event.preventDefault();

                this.currentPage =
                    Math.max(
                        0,
                        this.pages.length -
                            1
                    );

                this.showCurrentPage();

                this.updateUI();
                break;

            default:
                break;
        }
    }


    /* ========================================================================
     * VISIBILITY
     * ====================================================================== */

    handleVisibility() {
        if (
            document.hidden
        ) {
            this.stopTypewriter();
        }
    }


    /* ========================================================================
     * SCENE INTEGRATION
     * ====================================================================== */

    handleSceneChanged(
        payload
    ) {
        const scene =
            payload?.scene;

        if (
            !scene ||
            !this.root
        ) {
            return;
        }

        const sceneElement =
            scene.element ||
            scene;

        if (
            !(sceneElement instanceof
                Element)
        ) {
            return;
        }

        const letterScene =
            this.root.closest(
                '[data-scene]'
            );

        if (
            letterScene ===
            sceneElement
        ) {
            this.updateUI();

            return;
        }

        if (
            letterScene &&
            letterScene.getAttribute(
                'aria-hidden'
            ) ===
                'true'
        ) {
            this.stopTypewriter();
        }
    }


    /* ========================================================================
     * AUDIO
     * ====================================================================== */

    playAudio(
        type
    ) {
        if (
            !LETTER_CONFIG
                .audio
                .enabled
        ) {
            return;
        }

        const source =
            LETTER_CONFIG
                .audio[
                    type
                ];

        /*
         * Intentionally empty until final scene audio is chosen.
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
                window.SehrishAudio
                    .playSFX(
                        source
                    );
            }
        } catch (error) {
            console.warn(
                '[Letter] Audio failed:',
                error
            );
        }
    }


    /* ========================================================================
     * NAVIGATION HELPERS
     * ====================================================================== */

    goToPage(
        index
    ) {
        const numeric =
            Number(
                index
            );

        if (
            !Number.isInteger(
                numeric
            )
        ) {
            return false;
        }

        if (
            numeric < 0 ||
            numeric >=
                this.pages.length
        ) {
            return false;
        }

        this.currentPage =
            numeric;

        this.showCurrentPage();

        this.updateUI();

        return true;
    }


    addPage(
        options = {}
    ) {
        if (
            !this.ui.pageContainer
        ) {
            return null;
        }

        const element =
            options.element ||
            document.createElement(
                'article'
            );

        if (
            !options.element
        ) {
            element.className =
                'letter-page';

            element.dataset.letterPage =
                'true';

            element.innerHTML =
                options.content ||
                '<p></p>';

            this.ui.pageContainer
                .appendChild(
                    element
                );
        }

        const page =
            new LetterPage({
                id:
                    options.id ||
                    letterCreateId(),

                index:
                    this.pages.length,

                title:
                    options.title ||
                    '',

                content:
                    options.content ||
                    element.innerHTML,

                element
            });

        page.metadata
            .originalHTML =
            element.innerHTML;

        element.dataset
            .letterPageId =
            page.id;

        element.dataset
            .letterPageIndex =
            String(
                page.index
            );

        this.pages.push(
            page
        );

        this.hideAllPages();

        this.showCurrentPage();

        this.updateUI();

        return page;
    }


    /* ========================================================================
     * PUBLIC EVENT API
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

        letterDispatchEvent(
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

        this.stopTypewriter();

        window.clearTimeout(
            this.transitionTimer
        );

        window.clearTimeout(
            this.finishTimer
        );

        window.clearTimeout(
            this.sparkleTimer
        );

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

        this.events.clear();

        this.initialized =
            false;

        this.open =
            false;

        this.destroyed =
            true;

        this.emit(
            LETTER_CONFIG
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

let birthdayLetterManager =
    null;


function getBirthdayLetterManager() {
    if (
        !birthdayLetterManager
    ) {
        birthdayLetterManager =
            new BirthdayLetterManager();
    }

    return birthdayLetterManager;
}


birthdayLetterManager =
    getBirthdayLetterManager();


/* ============================================================================
 * GLOBAL COMPATIBILITY NAMES
 * ========================================================================== */

window.LetterManager =
    birthdayLetterManager;

window.BirthdayLetter =
    birthdayLetterManager;

window.letterManager =
    birthdayLetterManager;

window.Letter =
    birthdayLetterManager;


/* ============================================================================
 * PUBLIC NAMESPACE
 * ========================================================================== */

window.SehrishLetter =
    Object.freeze({
        init(
            app = null
        ) {
            return getBirthdayLetterManager()
                .init(
                    app
                );
        },

        open() {
            return getBirthdayLetterManager()
                .openLetter();
        },

        close() {
            return getBirthdayLetterManager()
                .closeLetter();
        },

        next() {
            return getBirthdayLetterManager()
                .nextPage();
        },

        previous() {
            return getBirthdayLetterManager()
                .previousPage();
        },

        finish() {
            return getBirthdayLetterManager()
                .finishLetter();
        },

        restart() {
            return getBirthdayLetterManager()
                .restart();
        },

        reset() {
            return getBirthdayLetterManager()
                .reset();
        },

        goTo(
            index
        ) {
            return getBirthdayLetterManager()
                .goToPage(
                    index
                );
        },

        addPage(
            options
        ) {
            return getBirthdayLetterManager()
                .addPage(
                    options
                );
        },

        state() {
            return getBirthdayLetterManager()
                .getState();
        },

        currentPage() {
            return getBirthdayLetterManager()
                .getCurrentPage();
        },

        manager() {
            return getBirthdayLetterManager();
        }
    });


/* ============================================================================
 * AUTOMATIC INITIALIZATION
 * ========================================================================== */

function initializeBirthdayLetter() {
    try {
        getBirthdayLetterManager()
            .init();
    } catch (error) {
        console.error(
            '[Letter] Initialization failed:',
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
        initializeBirthdayLetter,
        {
            once:
                true
        }
    );
} else {
    initializeBirthdayLetter();
}


/* ============================================================================
 * DEBUG API
 * ========================================================================== */

window.SBLetterDebug =
    Object.freeze({
        state:
            () =>
                getBirthdayLetterManager()
                    .getState(),

        pages:
            () =>
                [
                    ...getBirthdayLetterManager()
                        .pages
                ],

        current:
            () =>
                getBirthdayLetterManager()
                    .getCurrentPage(),

        open:
            () =>
                getBirthdayLetterManager()
                    .openLetter(),

        close:
            () =>
                getBirthdayLetterManager()
                    .closeLetter(),

        next:
            () =>
                getBirthdayLetterManager()
                    .nextPage(),

        previous:
            () =>
                getBirthdayLetterManager()
                    .previousPage(),

        finish:
            () =>
                getBirthdayLetterManager()
                    .finishLetter(),

        restart:
            () =>
                getBirthdayLetterManager()
                    .restart(),

        reset:
            () =>
                getBirthdayLetterManager()
                    .reset()
    });


/* ============================================================================
 * END OF FILE
 * ============================================================================
 */