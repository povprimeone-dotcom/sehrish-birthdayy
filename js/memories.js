'use strict';

/**
 * ============================================================================
 * SEHRISH BIRTHDAY EXPERIENCE
 * ============================================================================
 * File    : js/memories.js
 * Version : 1.1.0
 *
 * Features:
 * - Photo memories
 * - Landscape video support
 * - Portrait / Reel video support
 * - Automatic intrinsic aspect-ratio detection
 * - YouTube-style 16:9 support
 * - Reel-style 9:16 support
 * - Square and other ratios
 * - No forced cropping
 * - No stretching
 * - Responsive media presentation
 * - Lightbox
 * - Previous / next navigation
 * - Keyboard navigation
 * - Touch swipe navigation
 * - Accessible controls
 * - Lazy/preload support
 * - Video metadata detection
 * - Scene integration
 * - app.js integration
 * - audio.js integration hooks
 * ============================================================================
 */

const MEMORIES_CONFIG = Object.freeze({
    name: 'Sehrish Birthday Memories',
    version: '1.1.0',

    selectors: Object.freeze({
        root: [
            '[data-memories]',
            '#birthday-memories',
            '.birthday-memories'
        ],

        memory: [
            '[data-memory]',
            '.memory-card',
            '.memory-item'
        ],

        trigger: [
            '[data-memory-action="open"]',
            '[data-action="open-memory"]',
            '.memory-open'
        ],

        lightbox: [
            '[data-memory-lightbox]',
            '.memory-lightbox',
            '.memories-lightbox'
        ],

        mediaContainer: [
            '[data-memory-media]',
            '.memory-media'
        ],

        previous: [
            '[data-memory-action="previous"]',
            '[data-action="previous-memory"]',
            '.memory-previous'
        ],

        next: [
            '[data-memory-action="next"]',
            '[data-action="next-memory"]',
            '.memory-next'
        ],

        close: [
            '[data-memory-action="close"]',
            '[data-action="close-memory"]',
            '.memory-close'
        ],

        thumbnails: [
            '[data-memory-thumbnail]',
            '.memory-thumbnail'
        ],

        title: [
            '[data-memory-title]',
            '.memory-title'
        ],

        caption: [
            '[data-memory-caption]',
            '.memory-caption'
        ],

        date: [
            '[data-memory-date]',
            '.memory-date'
        ],

        counter: [
            '[data-memory-counter]',
            '.memory-counter'
        ],

        total: [
            '[data-memory-total]',
            '.memory-total'
        ],

        progress: [
            '[data-memory-progress]',
            '.memory-progress'
        ],

        status: [
            '[data-memory-status]',
            '.memory-status'
        ],

        empty: [
            '[data-memory-empty]',
            '.memories-empty'
        ],

        loading: [
            '[data-memory-loading]',
            '.memory-loading'
        ],

        error: [
            '[data-memory-error]',
            '.memory-error'
        ]
    }),

    defaults: Object.freeze({
        enableLightbox: true,

        enableKeyboard: true,

        enableSwipe: true,

        swipeThreshold: 52,

        swipeVerticalTolerance: 90,

        preloadAdjacent: true,

        preloadDistance: 1,

        loopNavigation: false,

        closeOnBackdrop: true,

        closeOnEscape: true,

        autoplayVideos: false,

        pauseVideoOnClose: true,

        resetVideoOnClose: false,

        preserveIntrinsicAspect: true,

        landscapeAspectThreshold: 1.18,

        portraitAspectThreshold: 0.85,

        imageObjectFit: 'contain',

        videoObjectFit: 'contain',

        lightboxTransitionDuration: 360,

        mediaLoadTimeout: 15000,

        reducedMotionRespect: true,

        persistLastMemory: false,

        announceMemoryChanges: true
    }),

    classes: Object.freeze({
        initialized: 'memories-initialized',

        active: 'memories-active',

        lightboxOpen: 'memory-lightbox-open',

        mediaLoading: 'memory-media-loading',

        mediaLoaded: 'memory-media-loaded',

        mediaError: 'memory-media-error',

        selected: 'memory-selected',

        transitioning: 'memory-transitioning',

        playing: 'memory-video-playing',

        landscape: 'memory-landscape',

        portrait: 'memory-portrait',

        square: 'memory-square',

        image: 'memory-type-image',

        video: 'memory-type-video'
    }),

    storage: Object.freeze({
        prefix: 'sehrish-birthday:',

        lastMemory: 'last-memory'
    }),

    events: Object.freeze({
        initialized: 'memories:initialized',

        opened: 'memory:opened',

        closed: 'memory:closed',

        changed: 'memory:changed',

        loaded: 'memory:loaded',

        error: 'memory:error',

        videoPlay: 'memory:video-play',

        videoPause: 'memory:video-pause',

        aspectDetected: 'memory:aspect-detected',

        destroyed: 'memories:destroyed'
    }),

    audio: Object.freeze({
        enabled: true,

        /*
         * Intentionally empty.
         * Final audio will be chosen scene-by-scene later.
         */
        open: '',

        close: '',

        next: '',

        previous: ''
    })
});


/* ============================================================================
 * UTILITY HELPERS
 * ========================================================================== */

function memoriesNormalizeSelectors(
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


function memoriesQueryFirst(
    selectors,
    root = document
) {
    const list =
        memoriesNormalizeSelectors(
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
                '[Memories] Invalid selector:',
                selector,
                error
            );
        }
    }

    return null;
}


function memoriesQueryAll(
    selectors,
    root = document
) {
    const list =
        memoriesNormalizeSelectors(
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
                '[Memories] Invalid selector:',
                selector,
                error
            );
        }
    }

    return output;
}


function memoriesToBoolean(
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


function memoriesReducedMotion() {
    if (
        !MEMORIES_CONFIG
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


function memoriesWait(
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


function memoriesDispatchEvent(
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
        // Ignore unsupported environments.
    }
}


/* ============================================================================
 * EVENT BUS
 * ========================================================================== */

class MemoriesEventBus {
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
                        '[Memories] Event handler error:',
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

class MemoriesStorage {
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
            MEMORIES_CONFIG
                .storage
                .prefix +
            name
        );
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
            // Ignore storage errors.
        }
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
}


/* ============================================================================
 * MEMORY MODEL
 * ========================================================================== */

class BirthdayMemory {
    constructor(
        options = {}
    ) {
        this.id =
            options.id ||
            (
                'memory-' +
                Date.now().toString(36) +
                '-' +
                Math.random()
                    .toString(36)
                    .slice(2, 8)
            );

        this.index =
            Number(
                options.index || 0
            );

        this.type =
            options.type ||
            'image';

        this.src =
            options.src ||
            '';

        this.poster =
            options.poster ||
            '';

        this.thumbnail =
            options.thumbnail ||
            '';

        this.title =
            options.title ||
            '';

        this.caption =
            options.caption ||
            '';

        this.date =
            options.date ||
            '';

        this.alt =
            options.alt ||
            options.title ||
            'Birthday memory';

        this.element =
            options.element ||
            null;

        this.trigger =
            options.trigger ||
            null;

        this.loaded =
            false;

        this.error =
            false;

        this.aspectRatio =
            null;

        this.aspectKind =
            'unknown';

        this.metadata =
            {
                ...(options.metadata || {})
            };
    }

    isVideo() {
        return (
            this.type ===
            'video'
        );
    }

    isImage() {
        return (
            this.type ===
            'image'
        );
    }
}


/* ============================================================================
 * MEDIA LOADER
 * ========================================================================== */

class MemoryMediaLoader {
    constructor(
        manager
    ) {
        this.manager =
            manager;

        this.pending =
            new Map();
    }

    load(
        memory,
        target
    ) {
        if (
            !memory ||
            !target
        ) {
            return Promise.resolve(
                false
            );
        }

        if (
            this.pending.has(
                memory.id
            )
        ) {
            return this.pending.get(
                memory.id
            );
        }

        const promise =
            memory.isVideo()
                ? this.loadVideo(
                    memory,
                    target
                )
                : this.loadImage(
                    memory,
                    target
                );

        this.pending.set(
            memory.id,
            promise
        );

        return promise.finally(
            () => {
                this.pending.delete(
                    memory.id
                );
            }
        );
    }

    loadImage(
        memory,
        target
    ) {
        return new Promise(
            (
                resolve
            ) => {
                let settled =
                    false;

                const cleanup =
                    () => {
                        target.removeEventListener(
                            'load',
                            handleLoad
                        );

                        target.removeEventListener(
                            'error',
                            handleError
                        );
                    };

                const finish =
                    (
                        success
                    ) => {
                        if (
                            settled
                        ) {
                            return;
                        }

                        settled =
                            true;

                        cleanup();

                        memory.loaded =
                            success;

                        memory.error =
                            !success;

                        if (
                            success
                        ) {
                            this.manager
                                .detectImageAspect(
                                    memory,
                                    target
                                );
                        }

                        this.manager.emit(
                            success
                                ? MEMORIES_CONFIG
                                    .events
                                    .loaded
                                : MEMORIES_CONFIG
                                    .events
                                    .error,
                            {
                                memory,
                                target
                            }
                        );

                        resolve(
                            success
                        );
                    };

                const handleLoad =
                    () => {
                        finish(
                            true
                        );
                    };

                const handleError =
                    () => {
                        finish(
                            false
                        );
                    };

                target.addEventListener(
                    'load',
                    handleLoad,
                    {
                        once:
                            true
                    }
                );

                target.addEventListener(
                    'error',
                    handleError,
                    {
                        once:
                            true
                    }
                );

                try {
                    target.src =
                        memory.src;

                    target.alt =
                        memory.alt ||
                        memory.title ||
                        'Birthday memory';
                } catch {
                    finish(
                        false
                    );

                    return;
                }

                window.setTimeout(
                    () => {
                        if (
                            !settled
                        ) {
                            finish(
                                false
                            );
                        }
                    },
                    MEMORIES_CONFIG
                        .defaults
                        .mediaLoadTimeout
                );
            }
        );
    }

    loadVideo(
        memory,
        target
    ) {
        return new Promise(
            (
                resolve
            ) => {
                let settled =
                    false;

                const cleanup =
                    () => {
                        target.removeEventListener(
                            'loadedmetadata',
                            handleMetadata
                        );

                        target.removeEventListener(
                            'loadeddata',
                            handleLoaded
                        );

                        target.removeEventListener(
                            'canplay',
                            handleLoaded
                        );

                        target.removeEventListener(
                            'error',
                            handleError
                        );
                    };

                const finish =
                    (
                        success
                    ) => {
                        if (
                            settled
                        ) {
                            return;
                        }

                        settled =
                            true;

                        cleanup();

                        memory.loaded =
                            success;

                        memory.error =
                            !success;

                        if (
                            success
                        ) {
                            this.manager
                                .detectVideoAspect(
                                    memory,
                                    target
                                );
                        }

                        this.manager.emit(
                            success
                                ? MEMORIES_CONFIG
                                    .events
                                    .loaded
                                : MEMORIES_CONFIG
                                    .events
                                    .error,
                            {
                                memory,
                                target
                            }
                        );

                        resolve(
                            success
                        );
                    };

                const handleMetadata =
                    () => {
                        this.manager
                            .detectVideoAspect(
                                memory,
                                target
                            );
                    };

                const handleLoaded =
                    () => {
                        this.manager
                            .detectVideoAspect(
                                memory,
                                target
                            );

                        finish(
                            true
                        );
                    };

                const handleError =
                    () => {
                        finish(
                            false
                        );
                    };

                target.addEventListener(
                    'loadedmetadata',
                    handleMetadata
                );

                target.addEventListener(
                    'loadeddata',
                    handleLoaded,
                    {
                        once:
                            true
                    }
                );

                target.addEventListener(
                    'canplay',
                    handleLoaded,
                    {
                        once:
                            true
                    }
                );

                target.addEventListener(
                    'error',
                    handleError,
                    {
                        once:
                            true
                    }
                );

                try {
                    target.preload =
                        'metadata';

                    target.playsInline =
                        true;

                    target.controls =
                        true;

                    target.src =
                        memory.src;

                    if (
                        memory.poster
                    ) {
                        target.poster =
                            memory.poster;
                    }

                    target.load();
                } catch {
                    finish(
                        false
                    );

                    return;
                }

                window.setTimeout(
                    () => {
                        if (
                            !settled
                        ) {
                            finish(
                                false
                            );
                        }
                    },
                    MEMORIES_CONFIG
                        .defaults
                        .mediaLoadTimeout
                );
            }
        );
    }
}


/* ============================================================================
 * MAIN MEMORIES MANAGER
 * ========================================================================== */

class BirthdayMemoriesManager {
    constructor() {
        this.name =
            MEMORIES_CONFIG.name;

        this.version =
            MEMORIES_CONFIG.version;

        this.config =
            {
                ...MEMORIES_CONFIG
                    .defaults
            };

        this.app =
            null;

        this.audio =
            null;

        this.root =
            null;

        this.lightbox =
            null;

        this.memories =
            [];

        this.currentIndex =
            -1;

        this.open =
            false;

        this.initialized =
            false;

        this.destroyed =
            false;

        this.storage =
            new MemoriesStorage();

        this.events =
            new MemoriesEventBus();

        this.loader =
            new MemoryMediaLoader(
                this
            );

        this.activeMedia =
            null;

        this.previousFocus =
            null;

        this.touchStart =
            null;

        this.touchEnd =
            null;

        this.videoInstances =
            new Set();

        this.ui =
            {
                mediaContainer:
                    null,

                previous:
                    [],

                next:
                    [],

                close:
                    [],

                thumbnails:
                    [],

                title:
                    [],

                caption:
                    [],

                date:
                    [],

                counter:
                    [],

                total:
                    [],

                progress:
                    [],

                status:
                    [],

                loading:
                    [],

                error:
                    [],

                empty:
                    []
            };

        this.boundHandlers =
            {
                keydown:
                    this.handleKeyDown.bind(
                        this
                    ),

                pointerDown:
                    this.handlePointerDown.bind(
                        this
                    ),

                pointerUp:
                    this.handlePointerUp.bind(
                        this
                    ),

                backdropClick:
                    this.handleBackdropClick.bind(
                        this
                    ),

                sceneChanged:
                    this.handleSceneChanged.bind(
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
                MEMORIES_CONFIG
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

        this.discoverMemories();

        this.discoverLightbox();

        this.discoverUI();

        this.bindEvents();

        this.setupAccessibility();

        this.restoreLastMemory();

        this.initialized =
            true;

        this.root.classList.add(
            MEMORIES_CONFIG
                .classes
                .initialized
        );

        this.root.dataset.memoriesReady =
            'true';

        this.root.dataset.memoriesCount =
            String(
                this.memories.length
            );

        this.updateUI();

        this.emit(
            MEMORIES_CONFIG
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
            memoriesQueryFirst(
                MEMORIES_CONFIG
                    .selectors
                    .root
            );
    }


    loadConfiguration() {
        const dataset =
            this.root.dataset;

        this.config.enableLightbox =
            memoriesToBoolean(
                dataset.memoriesLightbox,
                this.config.enableLightbox
            );

        this.config.enableKeyboard =
            memoriesToBoolean(
                dataset.memoriesKeyboard,
                this.config.enableKeyboard
            );

        this.config.enableSwipe =
            memoriesToBoolean(
                dataset.memoriesSwipe,
                this.config.enableSwipe
            );

        this.config.loopNavigation =
            memoriesToBoolean(
                dataset.memoriesLoop,
                this.config.loopNavigation
            );

        this.config.autoplayVideos =
            memoriesToBoolean(
                dataset.memoriesAutoplayVideo,
                this.config.autoplayVideos
            );

        this.config.preserveIntrinsicAspect =
            memoriesToBoolean(
                dataset.memoriesPreserveAspect,
                this.config.preserveIntrinsicAspect
            );

        this.config.persistLastMemory =
            memoriesToBoolean(
                dataset.memoriesPersistLast,
                this.config.persistLastMemory
            );
    }


    /* ========================================================================
     * MEMORY DISCOVERY
     * ====================================================================== */

    discoverMemories() {
        const elements =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .memory,
                this.root
            );

        this.memories =
            elements.map(
                (
                    element,
                    index
                ) => {
                    const type =
                        this.detectMemoryType(
                            element
                        );

                    const media =
                        this.extractMediaData(
                            element,
                            type
                        );

                    const title =
                        element.dataset
                            .memoryTitle ||
                        memoriesQueryFirst(
                            MEMORIES_CONFIG
                                .selectors
                                .title,
                            element
                        )?.textContent
                            ?.trim() ||
                        '';

                    const caption =
                        element.dataset
                            .memoryCaption ||
                        memoriesQueryFirst(
                            MEMORIES_CONFIG
                                .selectors
                                .caption,
                            element
                        )?.textContent
                            ?.trim() ||
                        '';

                    const date =
                        element.dataset
                            .memoryDate ||
                        memoriesQueryFirst(
                            MEMORIES_CONFIG
                                .selectors
                                .date,
                            element
                        )?.textContent
                            ?.trim() ||
                        '';

                    const memory =
                        new BirthdayMemory({
                            id:
                                element.dataset
                                    .memoryId ||
                                element.id ||
                                `memory-${
                                    index + 1
                                }`,

                            index,

                            type,

                            src:
                                media.src,

                            poster:
                                media.poster,

                            thumbnail:
                                media.thumbnail,

                            title,

                            caption,

                            date,

                            alt:
                                element.dataset
                                    .memoryAlt ||
                                title ||
                                'Birthday memory',

                            element,

                            trigger:
                                memoriesQueryFirst(
                                    MEMORIES_CONFIG
                                        .selectors
                                        .trigger,
                                    element
                                ),

                            metadata:
                                {
                                    category:
                                        element.dataset
                                            .memoryCategory ||
                                        '',

                                    year:
                                        element.dataset
                                            .memoryYear ||
                                        '',

                                    location:
                                        element.dataset
                                            .memoryLocation ||
                                        ''
                                }
                        });

                    this.decorateMemory(
                        memory
                    );

                    return memory;
                }
            );

        this.memories.forEach(
            (
                memory,
                index
            ) => {
                memory.index =
                    index;

                memory.element.dataset
                    .memoryIndex =
                    String(
                        index
                    );
            }
        );

        this.handleEmptyGallery();
    }


    detectMemoryType(
        element
    ) {
        const explicit =
            element.dataset
                .memoryType;

        if (
            explicit
        ) {
            return (
                explicit
                    .toLowerCase() ===
                'video'
            )
                ? 'video'
                : 'image';
        }

        if (
            element.querySelector(
                'video'
            )
        ) {
            return 'video';
        }

        const source =
            element.dataset
                .memorySrc ||
            element.dataset
                .memoryVideo ||
            element.dataset
                .memoryUrl ||
            '';

        if (
            /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(
                source
            )
        ) {
            return 'video';
        }

        return 'image';
    }


    extractMediaData(
        element,
        type
    ) {
        const image =
            element.querySelector(
                'img'
            );

        const video =
            element.querySelector(
                'video'
            );

        if (
            type ===
            'video'
        ) {
            return {
                src:
                    element.dataset
                        .memorySrc ||
                    element.dataset
                        .memoryVideo ||
                    video?.dataset
                        .src ||
                    video?.getAttribute(
                        'src'
                    ) ||
                    '',

                poster:
                    element.dataset
                        .memoryPoster ||
                    video?.poster ||
                    '',

                thumbnail:
                    element.dataset
                        .memoryThumbnail ||
                    image?.currentSrc ||
                    image?.src ||
                    ''
            };
        }

        return {
            src:
                element.dataset
                    .memorySrc ||
                element.dataset
                    .memoryImage ||
                image?.dataset
                    .src ||
                image?.currentSrc ||
                image?.src ||
                '',

            poster:
                '',

            thumbnail:
                element.dataset
                    .memoryThumbnail ||
                image?.currentSrc ||
                image?.src ||
                ''
        };
    }


    decorateMemory(
        memory
    ) {
        const element =
            memory.element;

        if (
            !element
        ) {
            return;
        }

        element.dataset.memoryId =
            memory.id;

        element.dataset.memoryIndex =
            String(
                memory.index
            );

        element.dataset.memoryType =
            memory.type;

        element.classList.add(
            memory.isVideo()
                ? MEMORIES_CONFIG
                    .classes
                    .video
                : MEMORIES_CONFIG
                    .classes
                    .image
        );

        const target =
            memory.trigger ||
            element;

        if (
            target &&
            !target.hasAttribute(
                'aria-label'
            )
        ) {
            target.setAttribute(
                'aria-label',
                `Open ${
                    memory.title ||
                    `memory ${
                        memory.index + 1
                    }`
                }`
            );
        }
    }


    /* ========================================================================
     * LIGHTBOX
     * ====================================================================== */

    discoverLightbox() {
        if (
            !this.config
                .enableLightbox
        ) {
            return;
        }

        this.lightbox =
            memoriesQueryFirst(
                MEMORIES_CONFIG
                    .selectors
                    .lightbox,
                this.root
            );

        if (
            !this.lightbox
        ) {
            this.lightbox =
                this.createLightbox();
        }

        this.setupLightboxStructure();
    }


    createLightbox() {
        const lightbox =
            document.createElement(
                'div'
            );

        lightbox.className =
            'memory-lightbox';

        lightbox.setAttribute(
            'aria-hidden',
            'true'
        );

        lightbox.style.display =
            'none';

        lightbox.innerHTML = `
            <div
                class="memory-lightbox__backdrop"
                data-memory-backdrop
                aria-hidden="true"
            ></div>

            <div
                class="memory-lightbox__dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Memory preview"
                tabindex="-1"
            >
                <button
                    type="button"
                    class="memory-close"
                    data-memory-action="close"
                    aria-label="Close memory preview"
                >
                    <span aria-hidden="true">×</span>
                </button>

                <div
                    class="memory-lightbox__media"
                    data-memory-media
                ></div>

                <div
                    class="memory-lightbox__info"
                >
                    <div
                        class="memory-title"
                        data-memory-title
                    ></div>

                    <div
                        class="memory-caption"
                        data-memory-caption
                    ></div>

                    <div
                        class="memory-date"
                        data-memory-date
                    ></div>
                </div>

                <div
                    class="memory-lightbox__navigation"
                >
                    <button
                        type="button"
                        class="memory-previous"
                        data-memory-action="previous"
                        aria-label="Previous memory"
                    >
                        <span aria-hidden="true">‹</span>
                    </button>

                    <div
                        class="memory-counter"
                        data-memory-counter
                        aria-live="polite"
                    >
                        0 / 0
                    </div>

                    <button
                        type="button"
                        class="memory-next"
                        data-memory-action="next"
                        aria-label="Next memory"
                    >
                        <span aria-hidden="true">›</span>
                    </button>
                </div>
            </div>
        `;

        this.root.appendChild(
            lightbox
        );

        return lightbox;
    }


    setupLightboxStructure() {
        if (
            !this.lightbox
        ) {
            return;
        }

        this.lightbox.setAttribute(
            'aria-hidden',
            'true'
        );

        this.lightbox.dataset
            .memoryLightboxReady =
            'true';

        const dialog =
            this.lightbox.querySelector(
                '[role="dialog"]'
            );

        if (
            dialog &&
            !dialog.hasAttribute(
                'tabindex'
            )
        ) {
            dialog.setAttribute(
                'tabindex',
                '-1'
            );
        }
    }


    discoverUI() {
        const source =
            this.lightbox ||
            this.root;

        this.ui.mediaContainer =
            memoriesQueryFirst(
                MEMORIES_CONFIG
                    .selectors
                    .mediaContainer,
                source
            );

        this.ui.previous =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .previous,
                source
            );

        this.ui.next =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .next,
                source
            );

        this.ui.close =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .close,
                source
            );

        this.ui.thumbnails =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .thumbnails,
                this.root
            );

        this.ui.title =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .title,
                source
            );

        this.ui.caption =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .caption,
                source
            );

        this.ui.date =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .date,
                source
            );

        this.ui.counter =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .counter,
                source
            );

        this.ui.total =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .total,
                source
            );

        this.ui.progress =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .progress,
                source
            );

        this.ui.status =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .status,
                this.root
            );

        this.ui.loading =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .loading,
                source
            );

        this.ui.error =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .error,
                source
            );

        this.ui.empty =
            memoriesQueryAll(
                MEMORIES_CONFIG
                    .selectors
                    .empty,
                this.root
            );
    }


    /* ========================================================================
     * EVENTS
     * ====================================================================== */

    bindEvents() {
        this.memories.forEach(
            (
                memory
            ) => {
                const trigger =
                    memory.trigger ||
                    memory.element;

                if (
                    !trigger
                ) {
                    return;
                }

                if (
                    trigger.dataset
                        .memoryInteractionBound ===
                    'true'
                ) {
                    return;
                }

                trigger.dataset
                    .memoryInteractionBound =
                    'true';

                trigger.addEventListener(
                    'click',
                    (
                        event
                    ) => {
                        event.preventDefault();

                        this.openMemory(
                            memory.index
                        );
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
                        this.previous();
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
                        this.next();
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
                        this.close();
                    }
                );
            }
        );

        this.ui.thumbnails.forEach(
            (
                thumbnail
            ) => {
                thumbnail.addEventListener(
                    'click',
                    () => {
                        const index =
                            Number(
                                thumbnail
                                    .dataset
                                    .memoryIndex
                            );

                        if (
                            Number.isInteger(
                                index
                            )
                        ) {
                            this.openMemory(
                                index
                            );
                        }
                    }
                );
            }
        );

        if (
            this.lightbox
        ) {
            this.lightbox.addEventListener(
                'pointerdown',
                this.boundHandlers
                    .pointerDown,
                {
                    passive:
                        true
                }
            );

            this.lightbox.addEventListener(
                'pointerup',
                this.boundHandlers
                    .pointerUp,
                {
                    passive:
                        true
                }
            );

            this.lightbox.addEventListener(
                'click',
                this.boundHandlers
                    .backdropClick
            );
        }

        if (
            this.config
                .enableKeyboard
        ) {
            document.addEventListener(
                'keydown',
                this.boundHandlers
                    .keydown
            );
        }

        if (
            this.app?.events
        ) {
            this.app.events.on(
                'scene:changed',
                this.boundHandlers
                    .sceneChanged
            );
        }

        this.on(
            MEMORIES_CONFIG
                .events
                .loaded,
            (
                payload
            ) => {
                this.handleMediaLoad(
                    payload
                );
            }
        );

        this.on(
            MEMORIES_CONFIG
                .events
                .error,
            (
                payload
            ) => {
                this.handleMediaError(
                    payload
                );
            }
        );
    }


    /* ========================================================================
     * OPEN
     * ====================================================================== */

    async openMemory(
        index
    ) {
        if (
            !this.config
                .enableLightbox
        ) {
            return false;
        }

        const target =
            this.resolveIndex(
                index
            );

        if (
            target < 0
        ) {
            return false;
        }

        this.previousFocus =
            document.activeElement;

        this.currentIndex =
            target;

        this.open =
            true;

        this.root.classList.add(
            MEMORIES_CONFIG
                .classes
                .active
        );

        if (
            this.lightbox
        ) {
            this.lightbox.classList.add(
                MEMORIES_CONFIG
                    .classes
                    .lightboxOpen
            );

            this.lightbox.setAttribute(
                'aria-hidden',
                'false'
            );

            this.lightbox.style.display =
                '';
        }

        document.body.classList.add(
            'memory-preview-active'
        );

        this.lockBackground();

        this.updateUI();

        this.playAudio(
            'open'
        );

        this.emit(
            MEMORIES_CONFIG
                .events
                .opened,
            {
                memory:
                    this.getCurrentMemory(),

                index:
                    target
            }
        );

        await this.renderCurrentMemory();

        this.focusLightbox();

        this.persistCurrentMemory();

        return true;
    }


    /* ========================================================================
     * MEDIA CREATION
     * ====================================================================== */

    createMediaElement(
        memory
    ) {
        if (
            memory.isVideo()
        ) {
            const video =
                document.createElement(
                    'video'
                );

            video.className =
                'memory-preview-video';

            video.controls =
                true;

            video.playsInline =
                true;

            video.preload =
                'metadata';

            video.style.display =
                'block';

            video.style.width =
                '100%';

            video.style.height =
                'auto';

            video.style.maxWidth =
                '100%';

            video.style.maxHeight =
                '100%';

            /*
             * IMPORTANT:
             * Do NOT force 16:9 here.
             * The video's real intrinsic ratio is detected from
             * videoWidth / videoHeight after metadata loads.
             */
            video.style.aspectRatio =
                'auto';

            video.style.objectFit =
                this.config
                    .videoObjectFit;

            video.setAttribute(
                'aria-label',
                memory.title ||
                'Birthday memory video'
            );

            if (
                memory.poster
            ) {
                video.poster =
                    memory.poster;
            }

            this.videoInstances.add(
                video
            );

            return video;
        }

        const image =
            document.createElement(
                'img'
            );

        image.className =
            'memory-preview-image';

        image.alt =
            memory.alt ||
            memory.title ||
            'Birthday memory';

        image.decoding =
            'async';

        image.loading =
            'eager';

        image.style.display =
            'block';

        image.style.maxWidth =
            '100%';

        image.style.maxHeight =
            '100%';

        image.style.width =
            'auto';

        image.style.height =
            'auto';

        image.style.objectFit =
            this.config
                .imageObjectFit;

        return image;
    }


    /* ========================================================================
     * ASPECT RATIO DETECTION
     * ====================================================================== */

    detectVideoAspect(
        memory,
        video
    ) {
        const width =
            Number(
                video.videoWidth
            ) || 0;

        const height =
            Number(
                video.videoHeight
            ) || 0;

        if (
            width <= 0 ||
            height <= 0
        ) {
            return null;
        }

        const ratio =
            width /
            height;

        this.applyAspectMetadata(
            memory,
            ratio
        );

        return ratio;
    }


    detectImageAspect(
        memory,
        image
    ) {
        const width =
            Number(
                image.naturalWidth
            ) || 0;

        const height =
            Number(
                image.naturalHeight
            ) || 0;

        if (
            width <= 0 ||
            height <= 0
        ) {
            return null;
        }

        const ratio =
            width /
            height;

        this.applyAspectMetadata(
            memory,
            ratio
        );

        return ratio;
    }


    applyAspectMetadata(
        memory,
        ratio
    ) {
        if (
            !Number.isFinite(
                ratio
            ) ||
            ratio <= 0
        ) {
            return;
        }

        memory.aspectRatio =
            ratio;

        if (
            ratio >=
            this.config
                .landscapeAspectThreshold
        ) {
            memory.aspectKind =
                'landscape';
        } else if (
            ratio <=
            this.config
                .portraitAspectThreshold
        ) {
            memory.aspectKind =
                'portrait';
        } else {
            memory.aspectKind =
                'square';
        }

        const container =
            this.ui.mediaContainer;

        if (
            !container
        ) {
            return;
        }

        const classes =
            MEMORIES_CONFIG.classes;

        container.classList.remove(
            classes.landscape,
            classes.portrait,
            classes.square
        );

        container.classList.add(
            classes[
                memory.aspectKind
            ]
        );

        container.dataset
            .aspectKind =
            memory.aspectKind;

        container.dataset
            .aspectRatio =
            ratio.toFixed(
                4
            );

        /*
         * The media itself remains intrinsic-size aware.
         * The wrapper receives the detected ratio so CSS can target it.
         */
        if (
            this.config
                .preserveIntrinsicAspect
        ) {
            container.style.aspectRatio =
                String(
                    ratio
                );
        }

        /*
         * Explicitly mark common production formats.
         */
        container.dataset
            .isYouTubeLandscape =
            String(
                ratio >= 1.60 &&
                ratio <= 1.85
            );

        container.dataset
            .isReelPortrait =
            String(
                ratio >= 0.50 &&
                ratio <= 0.67
            );

        this.emit(
            MEMORIES_CONFIG
                .events
                .aspectDetected,
            {
                memory,

                ratio,

                kind:
                    memory.aspectKind,

                isYouTubeLandscape:
                    ratio >= 1.60 &&
                    ratio <= 1.85,

                isReelPortrait:
                    ratio >= 0.50 &&
                    ratio <= 0.67
            }
        );
    }


    applyMediaState(
        memory
    ) {
        if (
            !this.ui.mediaContainer
        ) {
            return;
        }

        this.ui.mediaContainer
            .dataset
            .memoryType =
            memory.type;

        this.ui.mediaContainer
            .dataset
            .memoryId =
            memory.id;

        this.ui.mediaContainer
            .dataset
            .aspectKind =
            memory.aspectKind;
    }


    applyMediaLoadedState(
        memory,
        media
    ) {
        media.classList.add(
            MEMORIES_CONFIG
                .classes
                .mediaLoaded
        );

        this.ui.mediaContainer
            ?.classList
            .add(
                MEMORIES_CONFIG
                    .classes
                    .mediaLoaded
            );

        memory.element
            ?.classList
            .add(
                MEMORIES_CONFIG
                    .classes
                    .mediaLoaded
            );
    }


    clearMediaContainer() {
        if (
            !this.ui.mediaContainer
        ) {
            return;
        }

        while (
            this.ui.mediaContainer
                .firstChild
        ) {
            this.ui.mediaContainer
                .firstChild
                .remove();
        }

        this.ui.mediaContainer
            .classList
            .remove(
                MEMORIES_CONFIG
                    .classes
                    .mediaLoaded,

                MEMORIES_CONFIG
                    .classes
                    .landscape,

                MEMORIES_CONFIG
                    .classes
                    .portrait,

                MEMORIES_CONFIG
                    .classes
                    .square
            );

        this.ui.mediaContainer
            .style
            .removeProperty(
                'aspect-ratio'
            );

        delete this.ui.mediaContainer
            .dataset
            .aspectKind;

        delete this.ui.mediaContainer
            .dataset
            .aspectRatio;

        delete this.ui.mediaContainer
            .dataset
            .isYouTubeLandscape;

        delete this.ui.mediaContainer
            .dataset
            .isReelPortrait;
    }


    /* ========================================================================
     * NAVIGATION
     * ====================================================================== */

    next() {
        if (
            this.memories.length ===
            0
        ) {
            return false;
        }

        let nextIndex =
            this.currentIndex +
            1;

        if (
            nextIndex >=
            this.memories.length
        ) {
            if (
                !this.config
                    .loopNavigation
            ) {
                return false;
            }

            nextIndex =
                0;
        }

        this.playAudio(
            'next'
        );

        return this.goTo(
            nextIndex
        );
    }


    previous() {
        if (
            this.memories.length ===
            0
        ) {
            return false;
        }

        let previousIndex =
            this.currentIndex -
            1;

        if (
            previousIndex < 0
        ) {
            if (
                !this.config
                    .loopNavigation
            ) {
                return false;
            }

            previousIndex =
                this.memories.length -
                1;
        }

        this.playAudio(
            'previous'
        );

        return this.goTo(
            previousIndex
        );
    }


    async goTo(
        index
    ) {
        const target =
            this.resolveIndex(
                index
            );

        if (
            target < 0 ||
            target ===
                this.currentIndex
        ) {
            return false;
        }

        const current =
            this.getCurrentMemory();

        if (
            current
        ) {
            current.element
                ?.classList
                .remove(
                    MEMORIES_CONFIG
                        .classes
                        .selected
                );
        }

        this.currentIndex =
            target;

        this.root.classList.add(
            MEMORIES_CONFIG
                .classes
                .transitioning
        );

        this.updateUI();

        await this.renderCurrentMemory();

        if (
            !memoriesReducedMotion()
        ) {
            await memoriesWait(
                MEMORIES_CONFIG
                    .defaults
                    .lightboxTransitionDuration
            );
        }

        this.root.classList.remove(
            MEMORIES_CONFIG
                .classes
                .transitioning
        );

        this.persistCurrentMemory();

        this.updateUI();

        return true;
    }


    resolveIndex(
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
            return -1;
        }

        if (
            numeric < 0 ||
            numeric >=
                this.memories.length
        ) {
            return -1;
        }

        return numeric;
    }


    getCurrentMemory() {
        if (
            this.currentIndex <
            0
        ) {
            return null;
        }

        return (
            this.memories[
                this.currentIndex
            ] ||
            null
        );
    }


    /* ========================================================================
     * PRELOAD
     * ====================================================================== */

    preloadAdjacentIfNeeded() {
        if (
            !this.config
                .preloadAdjacent
        ) {
            return;
        }

        const distance =
            Math.max(
                1,
                Number(
                    this.config
                        .preloadDistance
                ) || 1
            );

        for (
            let offset = 1;
            offset <= distance;
            offset += 1
        ) {
            const nextMemory =
                this.memories[
                    this.currentIndex +
                    offset
                ];

            const previousMemory =
                this.memories[
                    this.currentIndex -
                    offset
                ];

            this.preloadMemory(
                nextMemory
            );

            this.preloadMemory(
                previousMemory
            );
        }
    }


    async preloadMemory(
        memory
    ) {
        if (
            !memory ||
            memory.loaded ||
            !memory.src
        ) {
            return false;
        }

        /*
         * Video metadata is intentionally not aggressively downloaded.
         */
        if (
            memory.isVideo()
        ) {
            return true;
        }

        try {
            const image =
                new Image();

            image.src =
                memory.src;

            if (
                typeof
                    image.decode ===
                'function'
            ) {
                await image.decode();
            } else {
                await new Promise(
                    (
                        resolve,
                        reject
                    ) => {
                        image.onload =
                            resolve;

                        image.onerror =
                            reject;
                    }
                );
            }

            memory.loaded =
                true;

            if (
                image.naturalWidth &&
                image.naturalHeight
            ) {
                this.applyAspectMetadata(
                    memory,
                    image.naturalWidth /
                    image.naturalHeight
                );
            }

            return true;
        } catch {
            memory.error =
                true;

            return false;
        }
    }


    /* ========================================================================
     * VIDEO EVENTS
     * ====================================================================== */

    bindVideoRuntimeEvents(
        memory,
        video
    ) {
        video.addEventListener(
            'loadedmetadata',
            () => {
                this.detectVideoAspect(
                    memory,
                    video
                );
            }
        );

        video.addEventListener(
            'play',
            () => {
                video.classList.add(
                    MEMORIES_CONFIG
                        .classes
                        .playing
                );

                this.emit(
                    MEMORIES_CONFIG
                        .events
                        .videoPlay,
                    {
                        memory,
                        video
                    }
                );
            }
        );

        video.addEventListener(
            'pause',
            () => {
                video.classList.remove(
                    MEMORIES_CONFIG
                        .classes
                        .playing
                );

                this.emit(
                    MEMORIES_CONFIG
                        .events
                        .videoPause,
                    {
                        memory,
                        video
                    }
                );
            }
        );

        video.addEventListener(
            'ended',
            () => {
                video.classList.remove(
                    MEMORIES_CONFIG
                        .classes
                        .playing
                );
            }
        );
    }


    tryAutoplayVideo(
        video
    ) {
        if (
            !video
        ) {
            return;
        }

        try {
            video.muted =
                true;

            const promise =
                video.play();

            promise?.catch?.(
                () => {}
            );
        } catch {
            // Autoplay may be blocked.
        }
    }


    stopActiveVideo(
        reset = false
    ) {
        const video =
            this.activeMedia;

        if (
            !(
                video instanceof
                HTMLVideoElement
            )
        ) {
            return;
        }

        try {
            video.pause();

            if (
                reset
            ) {
                video.currentTime =
                    0;
            }
        } catch {
            // Ignore media errors.
        }

        video.classList.remove(
            MEMORIES_CONFIG
                .classes
                .playing
        );
    }


    /* ========================================================================
     * RENDER
     * ====================================================================== */

    async renderCurrentMemory() {
        const memory =
            this.getCurrentMemory();

        if (
            !memory ||
            !this.ui.mediaContainer
        ) {
            return false;
        }

        this.setMediaLoading(
            true
        );

        this.setMediaError(
            false
        );

        this.stopActiveVideo(
            true
        );

        this.clearMediaContainer();

        this.activeMedia =
            null;

        this.memories.forEach(
            (
                item
            ) => {
                item.element
                    ?.classList
                    .remove(
                        MEMORIES_CONFIG
                            .classes
                            .selected
                    );
            }
        );

        memory.element
            ?.classList
            .add(
                MEMORIES_CONFIG
                    .classes
                    .selected
            );

        const media =
            this.createMediaElement(
                memory
            );

        if (
            !media
        ) {
            this.setMediaLoading(
                false
            );

            this.setMediaError(
                true
            );

            return false;
        }

        this.activeMedia =
            media;

        this.ui.mediaContainer
            .appendChild(
                media
            );

        this.applyMediaState(
            memory
        );

        const loaded =
            await this.loader.load(
                memory,
                media
            );

        this.setMediaLoading(
            false
        );

        if (
            !loaded
        ) {
            this.setMediaError(
                true
            );

            return false;
        }

        this.setMediaError(
            false
        );

        this.applyMediaLoadedState(
            memory,
            media
        );

        if (
            memory.isVideo()
        ) {
            this.bindVideoRuntimeEvents(
                memory,
                media
            );

            this.detectVideoAspect(
                memory,
                media
            );

            if (
                this.config
                    .autoplayVideos &&
                !memoriesReducedMotion()
            ) {
                this.tryAutoplayVideo(
                    media
                );
            }
        } else {
            this.detectImageAspect(
                memory,
                media
            );
        }

        this.updateUI();

        this.preloadAdjacentIfNeeded();

        this.emit(
            MEMORIES_CONFIG
                .events
                .changed,
            {
                memory,
                index:
                    this.currentIndex
            }
        );

        return true;
    }


    /* ========================================================================
     * LOADING / ERRORS
     * ====================================================================== */

    setMediaLoading(
        loading
    ) {
        this.ui.loading.forEach(
            (
                element
            ) => {
                element.hidden =
                    !loading;
            }
        );

        this.ui.mediaContainer
            ?.classList
            .toggle(
                MEMORIES_CONFIG
                    .classes
                    .mediaLoading,
                loading
            );
    }


    setMediaError(
        error
    ) {
        this.ui.error.forEach(
            (
                element
            ) => {
                element.hidden =
                    !error;
            }
        );

        this.ui.mediaContainer
            ?.classList
            .toggle(
                MEMORIES_CONFIG
                    .classes
                    .mediaError,
                error
            );
    }


    handleMediaLoad(
        payload
    ) {
        if (
            !payload?.memory
        ) {
            return;
        }

        this.setMediaLoading(
            false
        );

        this.setMediaError(
            false
        );
    }


    handleMediaError(
        payload
    ) {
        const memory =
            payload?.memory;

        if (
            !memory
        ) {
            return;
        }

        memory.error =
            true;

        this.setMediaLoading(
            false
        );

        this.setMediaError(
            true
        );

        this.announce(
            `Unable to load ${
                memory.title ||
                'this memory'
            }.`
        );
    }


    /* ========================================================================
     * CLOSE
     * ====================================================================== */

    close() {
        if (
            !this.open
        ) {
            return false;
        }

        const memory =
            this.getCurrentMemory();

        this.stopActiveVideo(
            this.config
                .resetVideoOnClose
        );

        memory?.element
            ?.classList
            .remove(
                MEMORIES_CONFIG
                    .classes
                    .selected
            );

        this.open =
            false;

        if (
            this.lightbox
        ) {
            this.lightbox.classList.remove(
                MEMORIES_CONFIG
                    .classes
                    .lightboxOpen
            );

            this.lightbox.setAttribute(
                'aria-hidden',
                'true'
            );

            if (
                memoriesReducedMotion()
            ) {
                this.lightbox.style.display =
                    'none';
            } else {
                window.setTimeout(
                    () => {
                        if (
                            !this.open &&
                            this.lightbox
                        ) {
                            this.lightbox.style.display =
                                'none';
                        }
                    },
                    MEMORIES_CONFIG
                        .defaults
                        .lightboxTransitionDuration
                );
            }
        }

        document.body.classList.remove(
            'memory-preview-active'
        );

        this.unlockBackground();

        this.playAudio(
            'close'
        );

        this.persistCurrentMemory();

        this.emit(
            MEMORIES_CONFIG
                .events
                .closed,
            {
                memory,
                index:
                    this.currentIndex
            }
        );

        this.restoreFocus();

        return true;
    }


    /* ========================================================================
     * FOCUS / MODAL
     * ====================================================================== */

    lockBackground() {
        document.body.dataset
            .memoryLock =
            'true';

        document.body.style.overflow =
            'hidden';
    }


    unlockBackground() {
        document.body.dataset
            .memoryLock =
            'false';

        document.body.style.overflow =
            '';
    }


    focusLightbox() {
        if (
            !this.lightbox
        ) {
            return;
        }

        const target =
            this.ui.close[0] ||
            this.lightbox.querySelector(
                '[role="dialog"]'
            );

        if (
            target &&
            typeof target.focus ===
                'function'
        ) {
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
                20
            );
        }
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


    /* ========================================================================
     * SWIPE
     * ====================================================================== */

    handlePointerDown(
        event
    ) {
        if (
            !this.open ||
            !this.config
                .enableSwipe
        ) {
            return;
        }

        this.touchStart =
            {
                x:
                    event.clientX,

                y:
                    event.clientY
            };

        this.touchEnd =
            null;
    }


    handlePointerUp(
        event
    ) {
        if (
            !this.open ||
            !this.config
                .enableSwipe ||
            !this.touchStart
        ) {
            return;
        }

        this.touchEnd =
            {
                x:
                    event.clientX,

                y:
                    event.clientY
            };

        const dx =
            this.touchEnd.x -
            this.touchStart.x;

        const dy =
            this.touchEnd.y -
            this.touchStart.y;

        this.touchStart =
            null;

        this.touchEnd =
            null;

        if (
            Math.abs(dx) <
            this.config
                .swipeThreshold
        ) {
            return;
        }

        if (
            Math.abs(dy) >
            this.config
                .swipeVerticalTolerance
        ) {
            return;
        }

        if (
            dx < 0
        ) {
            this.next();
        } else {
            this.previous();
        }
    }


    /* ========================================================================
     * BACKDROP
     * ====================================================================== */

    handleBackdropClick(
        event
    ) {
        if (
            !this.open ||
            !this.config
                .closeOnBackdrop
        ) {
            return;
        }

        if (
            event.target ===
            this.lightbox
        ) {
            this.close();

            return;
        }

        if (
            event.target instanceof
                Element &&
            event.target.matches(
                '[data-memory-backdrop]'
            )
        ) {
            this.close();
        }
    }


    /* ========================================================================
     * KEYBOARD
     * ====================================================================== */

    handleKeyDown(
        event
    ) {
        if (
            !this.open ||
            !this.config
                .enableKeyboard
        ) {
            return;
        }

        switch (
            String(
                event.key ||
                ''
            ).toLowerCase()
        ) {
            case 'escape':
                if (
                    this.config
                        .closeOnEscape
                ) {
                    event.preventDefault();

                    this.close();
                }
                break;

            case 'arrowleft':
                event.preventDefault();

                this.previous();
                break;

            case 'arrowright':
                event.preventDefault();

                this.next();
                break;

            default:
                break;
        }
    }


    /* ========================================================================
     * UI
     * ====================================================================== */

    updateUI() {
        const total =
            this.memories.length;

        const current =
            this.currentIndex >=
            0
                ? this.currentIndex +
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

        const memory =
            this.getCurrentMemory();

        this.ui.counter.forEach(
            (
                element
            ) => {
                element.textContent =
                    `${current} / ${total}`;
            }
        );

        this.ui.total.forEach(
            (
                element
            ) => {
                element.textContent =
                    String(
                        total
                    );
            }
        );

        this.ui.title.forEach(
            (
                element
            ) => {
                element.textContent =
                    memory?.title ||
                    '';
            }
        );

        this.ui.caption.forEach(
            (
                element
            ) => {
                element.textContent =
                    memory?.caption ||
                    '';
            }
        );

        this.ui.date.forEach(
            (
                element
            ) => {
                element.textContent =
                    memory?.date ||
                    '';
            }
        );

        this.ui.progress.forEach(
            (
                element
            ) => {
                const value =
                    Math.min(
                        Math.max(
                            progress,
                            0
                        ),
                        100
                    );

                element.style.setProperty(
                    '--memory-progress',
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
            }
        );

        this.updateNavigationControls();

        this.updateThumbnails();

        this.updateStatus();

        this.updateEmptyState();
    }


    updateNavigationControls() {
        const atStart =
            this.currentIndex <=
            0;

        const atEnd =
            this.currentIndex >=
            this.memories.length -
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
                            .loopNavigation
                    );

                button.setAttribute(
                    'aria-disabled',
                    String(
                        button.disabled
                    )
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
                            .loopNavigation
                    );

                button.setAttribute(
                    'aria-disabled',
                    String(
                        button.disabled
                    )
                );
            }
        );
    }


    updateThumbnails() {
        this.ui.thumbnails.forEach(
            (
                thumbnail
            ) => {
                const index =
                    Number(
                        thumbnail.dataset
                            .memoryIndex
                    );

                const selected =
                    index ===
                    this.currentIndex;

                thumbnail.classList.toggle(
                    MEMORIES_CONFIG
                        .classes
                        .selected,
                    selected
                );

                thumbnail.setAttribute(
                    'aria-current',
                    selected
                        ? 'true'
                        : 'false'
                );
            }
        );
    }


    updateStatus() {
        let message =
            '';

        if (
            this.memories.length ===
            0
        ) {
            message =
                'No memories are available yet.';
        } else if (
            !this.getCurrentMemory()
        ) {
            message =
                `${this.memories.length} memories available.`;
        } else {
            message =
                `Memory ${
                    this.currentIndex + 1
                } of ${
                    this.memories.length
                }.`;
        }

        this.ui.status.forEach(
            (
                element
            ) => {
                element.textContent =
                    message;
            }
        );
    }


    updateEmptyState() {
        const empty =
            this.memories.length ===
            0;

        this.ui.empty.forEach(
            (
                element
            ) => {
                element.hidden =
                    !empty;
            }
        );
    }


    handleEmptyGallery() {
        const empty =
            this.memories.length ===
            0;

        this.ui.empty.forEach(
            (
                element
            ) => {
                element.hidden =
                    !empty;
            }
        );
    }


    /* ========================================================================
     * ACCESSIBILITY
     * ====================================================================== */

    setupAccessibility() {
        if (
            !this.lightbox
        ) {
            return;
        }

        const dialog =
            this.lightbox.querySelector(
                '[role="dialog"]'
            );

        if (
            dialog &&
            !dialog.hasAttribute(
                'aria-label'
            )
        ) {
            dialog.setAttribute(
                'aria-label',
                'Birthday memory preview'
            );
        }

        this.lightbox.setAttribute(
            'aria-hidden',
            'true'
        );
    }


    announce(
        message
    ) {
        if (
            !this.config
                .announceMemoryChanges ||
            !message
        ) {
            return;
        }

        let live =
            document.getElementById(
                'memories-live-region'
            );

        if (
            !live
        ) {
            live =
                document.createElement(
                    'div'
                );

            live.id =
                'memories-live-region';

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

                    margin:
                        '-1px',

                    padding:
                        '0',

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


    /* ========================================================================
     * AUDIO
     * ====================================================================== */

    playAudio(
        type
    ) {
        if (
            !MEMORIES_CONFIG
                .audio
                .enabled
        ) {
            return;
        }

        const source =
            MEMORIES_CONFIG
                .audio[
                    type
                ];

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
                '[Memories] Audio failed:',
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

        const memoryScene =
            this.root.closest(
                '[data-scene]'
            );

        if (
            memoryScene ===
            sceneElement
        ) {
            this.refreshDOM();

            return;
        }

        if (
            memoryScene &&
            memoryScene.getAttribute(
                'aria-hidden'
            ) ===
                'true' &&
            this.open
        ) {
            this.close();
        }
    }


    refreshDOM() {
        this.findDOM();

        if (
            !this.root
        ) {
            return;
        }

        this.discoverMemories();

        this.discoverLightbox();

        this.discoverUI();

        this.updateUI();
    }


    /* ========================================================================
     * PERSISTENCE
     * ====================================================================== */

    restoreLastMemory() {
        if (
            !this.config
                .persistLastMemory
        ) {
            return;
        }

        const stored =
            Number(
                this.storage.get(
                    MEMORIES_CONFIG
                        .storage
                        .lastMemory,
                    -1
                )
            );

        if (
            Number.isInteger(
                stored
            ) &&
            stored >= 0 &&
            stored <
                this.memories.length
        ) {
            this.currentIndex =
                stored;
        }
    }


    persistCurrentMemory() {
        if (
            !this.config
                .persistLastMemory
        ) {
            return;
        }

        if (
            this.currentIndex <
            0
        ) {
            return;
        }

        this.storage.set(
            MEMORIES_CONFIG
                .storage
                .lastMemory,
            this.currentIndex
        );
    }


    /* ========================================================================
     * DYNAMIC MEMORY API
     * ====================================================================== */

    addMemory(
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
                'article'
            );

        if (
            !options.element
        ) {
            element.className =
                'memory-card';

            element.dataset.memory =
                'true';

            element.innerHTML =
                `
                <img
                    class="memory-image"
                    alt=""
                />
                `;

            this.root.appendChild(
                element
            );
        }

        const memory =
            new BirthdayMemory({
                id:
                    options.id ||
                    `memory-${
                        this.memories.length + 1
                    }`,

                index:
                    this.memories.length,

                type:
                    options.type ||
                    'image',

                src:
                    options.src ||
                    '',

                poster:
                    options.poster ||
                    '',

                thumbnail:
                    options.thumbnail ||
                    '',

                title:
                    options.title ||
                    '',

                caption:
                    options.caption ||
                    '',

                date:
                    options.date ||
                    '',

                alt:
                    options.alt ||
                    options.title ||
                    'Birthday memory',

                element
            });

        element.dataset.memory =
            'true';

        element.dataset.memoryId =
            memory.id;

        element.dataset.memoryIndex =
            String(
                memory.index
            );

        element.dataset.memoryType =
            memory.type;

        this.decorateMemory(
            memory
        );

        this.memories.push(
            memory
        );

        const trigger =
            memory.trigger ||
            memory.element;

        trigger?.addEventListener(
            'click',
            (
                event
            ) => {
                event.preventDefault();

                this.openMemory(
                    memory.index
                );
            }
        );

        this.updateUI();

        return memory;
    }


    removeMemory(
        idOrIndex
    ) {
        const numeric =
            Number(
                idOrIndex
            );

        const memory =
            Number.isInteger(
                numeric
            )
                ? this.memories[
                    numeric
                ]
                : this.memories.find(
                    (
                        item
                    ) =>
                        item.id ===
                        String(
                            idOrIndex
                        )
                );

        if (
            !memory
        ) {
            return false;
        }

        if (
            this.getCurrentMemory()
                ?.id ===
            memory.id
        ) {
            this.close();
        }

        memory.element?.remove();

        const index =
            this.memories.indexOf(
                memory
            );

        if (
            index >= 0
        ) {
            this.memories.splice(
                index,
                1
            );
        }

        this.memories.forEach(
            (
                item,
                itemIndex
            ) => {
                item.index =
                    itemIndex;

                item.element.dataset
                    .memoryIndex =
                    String(
                        itemIndex
                    );
            }
        );

        if (
            this.currentIndex >=
            this.memories.length
        ) {
            this.currentIndex =
                this.memories.length -
                1;
        }

        this.updateUI();

        return true;
    }


    /* ========================================================================
     * STATE
     * ====================================================================== */

    getState() {
        const memory =
            this.getCurrentMemory();

        return {
            initialized:
                this.initialized,

            open:
                this.open,

            count:
                this.memories.length,

            currentIndex:
                this.currentIndex,

            currentId:
                memory?.id ||
                null,

            currentType:
                memory?.type ||
                null,

            currentTitle:
                memory?.title ||
                '',

            aspectRatio:
                memory?.aspectRatio ||
                null,

            aspectKind:
                memory?.aspectKind ||
                null,

            mediaLoaded:
                Boolean(
                    memory?.loaded
                ),

            mediaError:
                Boolean(
                    memory?.error
                )
        };
    }


    getCurrentMemoryData() {
        const memory =
            this.getCurrentMemory();

        if (
            !memory
        ) {
            return null;
        }

        return {
            id:
                memory.id,

            index:
                memory.index,

            type:
                memory.type,

            src:
                memory.src,

            poster:
                memory.poster,

            thumbnail:
                memory.thumbnail,

            title:
                memory.title,

            caption:
                memory.caption,

            date:
                memory.date,

            alt:
                memory.alt,

            aspectRatio:
                memory.aspectRatio,

            aspectKind:
                memory.aspectKind,

            loaded:
                memory.loaded,

            error:
                memory.error
        };
    }


    /* ========================================================================
     * EVENT API
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

        memoriesDispatchEvent(
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

        this.stopActiveVideo(
            this.config
                .resetVideoOnClose
        );

        if (
            this.open
        ) {
            this.close();
        }

        if (
            this.lightbox
        ) {
            this.lightbox.removeEventListener(
                'pointerdown',
                this.boundHandlers
                    .pointerDown
            );

            this.lightbox.removeEventListener(
                'pointerup',
                this.boundHandlers
                    .pointerUp
            );

            this.lightbox.removeEventListener(
                'click',
                this.boundHandlers
                    .backdropClick
            );
        }

        if (
            this.config
                .enableKeyboard
        ) {
            document.removeEventListener(
                'keydown',
                this.boundHandlers
                    .keydown
            );
        }

        this.videoInstances.forEach(
            (
                video
            ) => {
                try {
                    video.pause();

                    video.removeAttribute(
                        'src'
                    );

                    video.load();
                } catch {
                    // Ignore.
                }
            }
        );

        this.videoInstances.clear();

        this.events.clear();

        this.initialized =
            false;

        this.destroyed =
            true;

        this.emit(
            MEMORIES_CONFIG
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

let birthdayMemoriesManager =
    null;


function getBirthdayMemoriesManager() {
    if (
        !birthdayMemoriesManager
    ) {
        birthdayMemoriesManager =
            new BirthdayMemoriesManager();
    }

    return birthdayMemoriesManager;
}


birthdayMemoriesManager =
    getBirthdayMemoriesManager();


/* ============================================================================
 * GLOBAL COMPATIBILITY NAMES
 * ========================================================================== */

window.MemoriesManager =
    birthdayMemoriesManager;

window.MemoryManager =
    birthdayMemoriesManager;

window.memoriesManager =
    birthdayMemoriesManager;

window.Memories =
    birthdayMemoriesManager;


/* ============================================================================
 * PUBLIC NAMESPACE
 * ========================================================================== */

window.SehrishMemories =
    Object.freeze({
        init(
            app = null
        ) {
            return getBirthdayMemoriesManager()
                .init(
                    app
                );
        },

        open(
            index
        ) {
            return getBirthdayMemoriesManager()
                .openMemory(
                    index
                );
        },

        next() {
            return getBirthdayMemoriesManager()
                .next();
        },

        previous() {
            return getBirthdayMemoriesManager()
                .previous();
        },

        close() {
            return getBirthdayMemoriesManager()
                .close();
        },

        state() {
            return getBirthdayMemoriesManager()
                .getState();
        },

        current() {
            return getBirthdayMemoriesManager()
                .getCurrentMemoryData();
        },

        add(
            options
        ) {
            return getBirthdayMemoriesManager()
                .addMemory(
                    options
                );
        },

        remove(
            idOrIndex
        ) {
            return getBirthdayMemoriesManager()
                .removeMemory(
                    idOrIndex
                );
        },

        configure(
            options
        ) {
            return getBirthdayMemoriesManager()
                .configure?.(
                    options
                );
        },

        manager() {
            return getBirthdayMemoriesManager();
        }
    });


/* ============================================================================
 * AUTOMATIC INITIALIZATION
 * ========================================================================== */

function initializeBirthdayMemories() {
    try {
        getBirthdayMemoriesManager()
            .init();
    } catch (error) {
        console.error(
            '[Memories] Initialization failed:',
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
        initializeBirthdayMemories,
        {
            once:
                true
        }
    );
} else {
    initializeBirthdayMemories();
}


/* ============================================================================
 * DEBUG API
 * ========================================================================== */

window.SBMemoriesDebug =
    Object.freeze({
        state:
            () =>
                getBirthdayMemoriesManager()
                    .getState(),

        current:
            () =>
                getBirthdayMemoriesManager()
                    .getCurrentMemoryData(),

        memories:
            () =>
                [
                    ...getBirthdayMemoriesManager()
                        .memories
                ],

        open:
            (
                index
            ) =>
                getBirthdayMemoriesManager()
                    .openMemory(
                        index
                    ),

        next:
            () =>
                getBirthdayMemoriesManager()
                    .next(),

        previous:
            () =>
                getBirthdayMemoriesManager()
                    .previous(),

        close:
            () =>
                getBirthdayMemoriesManager()
                    .close()
    });


/* ============================================================================
 * END OF FILE
 * ============================================================================
 */


/* ================================================================
   SCENE 13 — FINAL PHOTO MEMORY SCRATCH
   ================================================================
   FLOW:

   4 photos
       ↓
   Tap to reveal ✨
       ↓
   Smooth roomy zoom card
       ↓
   Hidden photo + shiny scratch foil
       ↓
   Heart + stars
       ↓
   Scratch with mouse/finger
       ↓
   Heart + star particles follow scratch point
       ↓
   94% real scratched area
       ↓
   Full photo reveal
       ↓
   Small download button
       ↓
   Close
       ↓
   Scene 13

   IMPORTANT:
   No localStorage.
   No sessionStorage.
   Every new opening is a fresh scratch.
   ================================================================ */

(() => {
    "use strict";


    /* ============================================================
       FIND SCENE
       ============================================================ */

    const scene =
        document.querySelector(
            ".scene--13.scene--final-memory"
        );

    if (!scene) {
        return;
    }


    /* ============================================================
       PHOTO CARDS
       ============================================================ */

    const cards = [
        ...scene.querySelectorAll(
            ".final-memory-photo"
        )
    ];

    if (!cards.length) {
        return;
    }


    /* ============================================================
       CONFIG
       ============================================================ */

    const COMPLETE_THRESHOLD = 94;


    /* ============================================================
       MEMORY LINES
       ============================================================ */

    const memoryLines = {

        1:
            "Just us, in a moment worth remembering. ✨",

        2:
            "One frame, countless little memories. 💗",

        3:
            "Together, this moment feels a little more special. 🤍",

        4:
            "A moment of us, saved forever. ✨"
    };


    function getMemoryLine(card) {

        const index =
            Number(
                card.dataset.photoIndex
            );

        return (
            memoryLines[index] ||
            "A little moment, made beautiful just for you. 🤍"
        );
    }


    /* ============================================================
       STATE
       ============================================================ */

    let modal = null;

    let canvas = null;

    let ctx = null;

    let activeCard = null;

    let scratching = false;

    let lastPoint = null;

    let revealComplete = false;

    let lastParticleTime = 0;


    /* ============================================================
       REMOVE OUR OLD DYNAMIC STYLE
       ============================================================ */

    document
        .getElementById(
            "scene13-final-scratch-style"
        )
        ?.remove();


    /* ============================================================
       STYLE
       ============================================================ */

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "scene13-final-scratch-style";


    style.textContent = `

        /* ========================================================
           MAIN SCENE 13 CLEANUP
           ======================================================== */

        .scene--13.scene--final-memory
        .memory-song-status {

            display:
                none !important;
        }


        .scene--13.scene--final-memory
        .final-memory-photo__label {

            display:
                none !important;
        }


        .scene--13.scene--final-memory
        .final-memory-photo {

            position:
                relative;

            cursor:
                pointer;

            overflow:
                visible;
        }


        .scene--13.scene--final-memory
        .final-memory-photo img {

            width:
                100% !important;

            height:
                100% !important;

            object-fit:
                contain !important;

            object-position:
                center !important;

            display:
                block;

            user-select:
                none;

            -webkit-user-select:
                none;

            -webkit-user-drag:
                none;
        }


        /* ========================================================
           MAIN PAGE — TAP TO REVEAL
           ======================================================== */

        .scene--13.scene--final-memory
        .final-memory-photo::after {

            content:
                "Tap to reveal ✨";

            position:
                absolute;

            left:
                50%;

            bottom:
                -27px;

            transform:
                translateX(-50%);

            z-index:
                60;

            white-space:
                nowrap;

            color:
                rgba(255,245,252,.96);

            font-family:
                "Caveat",
                cursive;

            font-size:
                clamp(
                    1rem,
                    4vw,
                    1.18rem
                );

            line-height:
                1;

            text-shadow:
                0 2px 8px
                rgba(0,0,0,.30);

            pointer-events:
                none;

            animation:
                scene13TapHint
                2.3s
                ease-in-out
                infinite;
        }

        .scene--13.scene--final-memory
        .final-memory-photo.is-revealed img {
            opacity: 1 !important;
            visibility: visible !important;
        }

        .scene--13.scene--final-memory
        .final-memory-photo.is-revealed::before {
            content: none !important;
            display: none !important;
        }

        .scene--13.scene--final-memory
        .final-memory-photo.is-revealed::after {
            content: none !important;
            display: none !important;
        }

        .scene--13.scene--final-memory
        .final-memory-photo.is-revealed
        .birthday-scratch-v2-stage {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }


        @keyframes scene13TapHint {

            0%,
            100% {

                opacity:
                    .55;

                transform:
                    translateX(-50%)
                    translateY(0);
            }

            50% {

                opacity:
                    1;

                transform:
                    translateX(-50%)
                    translateY(-3px);
            }
        }


        /* ========================================================
           ZOOM MODAL
           ======================================================== */

        .scene13-scratch-modal {

            position:
                fixed;

            inset:
                0;

            z-index:
                99999;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            padding:
                10px;

            box-sizing:
                border-box;

            overflow:
                hidden;

            background:

                radial-gradient(
                    circle at 50% 18%,
                    rgba(118,92,184,.28),
                    transparent 35%
                ),

                radial-gradient(
                    circle at 12% 82%,
                    rgba(255,164,209,.13),
                    transparent 26%
                ),

                radial-gradient(
                    circle at 88% 78%,
                    rgba(179,191,255,.11),
                    transparent 26%
                ),

                rgba(7,6,24,.95);

            backdrop-filter:
                blur(11px);

            -webkit-backdrop-filter:
                blur(11px);

            opacity:
                0;

            transition:
                opacity
                300ms ease;

            touch-action:
                none;

            overscroll-behavior:
                none;
        }


        .scene13-scratch-modal.is-open {

            opacity:
                1;
        }


        /* ========================================================
           ROOMY CARD
           ======================================================== */

        .scene13-scratch-card {

            position:
                relative;

            width:
                min(
                    94vw,
                    560px
                );

            max-width:
                calc(
                    100vw - 20px
                );

            box-sizing:
                border-box;

            padding:
                10px;

            border:
                2px solid
                rgba(255,255,255,.96);

            border-radius:
                28px;

            background:

                radial-gradient(
                    circle at 16% 14%,
                    rgba(255,180,214,.24),
                    transparent 24%
                ),

                radial-gradient(
                    circle at 84% 15%,
                    rgba(211,194,255,.23),
                    transparent 24%
                ),

                radial-gradient(
                    circle at 16% 86%,
                    rgba(255,217,177,.12),
                    transparent 23%
                ),

                linear-gradient(
                    145deg,
                    #fffaff,
                    #f4eaf8 54%,
                    #e7e3f7
                );

            box-shadow:

                0 30px 70px
                rgba(0,0,0,.42),

                0 0 36px
                rgba(255,177,215,.28);

            transform:
                scale(.78)
                translateY(28px)
                rotate(-1deg);

            transition:
                transform
                600ms
                cubic-bezier(
                    .16,
                    1,
                    .3,
                    1
                );

            overflow:
                visible;
        }


        .scene13-scratch-modal.is-open
        .scene13-scratch-card {

            transform:
                scale(1)
                translateY(0)
                rotate(0deg);
        }


        /* ========================================================
           CARD BACKGROUND HEARTS / STARS
           ======================================================== */

        .scene13-card-decoration {

            position:
                absolute;

            inset:
                0;

            z-index:
                1;

            pointer-events:
                none;

            overflow:
                hidden;

            border-radius:
                26px;
        }


        .scene13-card-decoration span {

            position:
                absolute;

            line-height:
                1;

            pointer-events:
                none;

            animation:
                scene13CardFloat
                4.8s
                ease-in-out
                infinite;
        }


        .scene13-card-decoration
        .heart {

            color:
                rgba(238,139,182,.46);

            font-size:
                18px;

            text-shadow:
                0 0 7px
                rgba(255,180,213,.35);
        }


        .scene13-card-decoration
        .star {

            color:
                rgba(239,201,120,.62);

            font-size:
                15px;

            text-shadow:
                0 0 7px
                rgba(255,220,145,.55);
        }


        .scene13-card-decoration
        span:nth-child(1) {

            left:
                8%;

            top:
                12%;
        }


        .scene13-card-decoration
        span:nth-child(2) {

            right:
                10%;

            top:
                10%;

            animation-delay:
                -.8s;
        }


        .scene13-card-decoration
        span:nth-child(3) {

            left:
                7%;

            bottom:
                15%;

            animation-delay:
                -1.7s;
        }


        .scene13-card-decoration
        span:nth-child(4) {

            right:
                8%;

            bottom:
                13%;

            animation-delay:
                -2.5s;
        }


        .scene13-card-decoration
        span:nth-child(5) {

            left:
                17%;

            top:
                35%;

            animation-delay:
                -3.1s;
        }


        .scene13-card-decoration
        span:nth-child(6) {

            right:
                18%;

            bottom:
                34%;

            animation-delay:
                -3.8s;
        }


        @keyframes scene13CardFloat {

            0%,
            100% {

                transform:
                    translateY(0)
                    rotate(-4deg)
                    scale(.90);

                opacity:
                    .34;
            }

            50% {

                transform:
                    translateY(-7px)
                    rotate(5deg)
                    scale(1.08);

                opacity:
                    .85;
            }
        }


        /* ========================================================
           CLOSE BUTTON
           ======================================================== */

        .scene13-scratch-close {

            position:
                absolute;

            top:
                8px;

            right:
                8px;

            z-index:
                80;

            width:
                35px;

            height:
                35px;

            border:
                0;

            border-radius:
                50%;

            background:
                rgba(255,255,255,.95);

            color:
                #754c67;

            display:
                grid;

            place-items:
                center;

            font-size:
                21px;

            cursor:
                pointer;

            box-shadow:
                0 6px 15px
                rgba(0,0,0,.12);
        }


        /* ========================================================
           SCRATCH PHOTO AREA
           ======================================================== */

        .scene13-scratch-photo {

            position:
                relative;

            flex:
                0 0 auto;

            width:
                300px;

            height:
                300px;

            max-width:
                calc(
                    100vw - 42px
                );

            max-height:
                calc(
                    100dvh - 105px
                );

            overflow:
                hidden;

            border:
                3px solid
                rgba(255,255,255,.97);

            border-radius:
                21px;

            background:
                #eee7f4;

            box-shadow:

                inset 0 0 0 1px
                rgba(255,255,255,.78),

                0 0 25px
                rgba(255,184,216,.22);

            z-index:
                5;
        }


        /*
         * REAL IMAGE IS UNDER THE FOIL.
         * It is naturally fitted with contain.
         */

        .scene13-scratch-photo img {

            position:
                absolute;

            inset:
                0;

            width:
                100% !important;

            height:
                100% !important;

            object-fit:
                contain !important;

            object-position:
                center !important;

            display:
                block;

            background:
                #eee7f4;

            pointer-events:
                none;

            user-select:
                none;

            -webkit-user-select:
                none;

            -webkit-user-drag:
                none;
        }


        /* ========================================================
           SCRATCH CANVAS
           ======================================================== */

        .scene13-scratch-canvas {

            position:
                absolute;

            inset:
                0;

            width:
                100%;

            height:
                100%;

            z-index:
                10;

            display:
                block;

            touch-action:
                none;

            cursor:
                crosshair;
        }


        /* ========================================================
           HEART + STARS ON FOIL
           ======================================================== */

        .scene13-scratch-cover {

            position:
                absolute;

            inset:
                0;

            z-index:
                11;

            pointer-events:
                none;

            border-radius:
                18px;
        }


        /* Center heart */

        .scene13-scratch-cover::before {

            content:
                "♥";

            position:
                absolute;

            left:
                50%;

            top:
                50%;

            transform:
                translate(
                    -50%,
                    -50%
                );

            color:
                #f39abf;

            font-size:
                clamp(
                    60px,
                    16vw,
                    90px
                );

            line-height:
                1;

            text-shadow:

                0 0 9px
                rgba(255,198,220,.92),

                0 0 24px
                rgba(255,157,205,.58);

            animation:
                scene13HeartPulse
                2.2s
                ease-in-out
                infinite;
        }


        /* Four stars */

        .scene13-scratch-cover::after {

            content:
                "✦          ✧\\A\\A"
                "          ✧          ✦";

            position:
                absolute;

            inset:
                0;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            white-space:
                pre;

            color:
                #ffe2a0;

            font-size:
                clamp(
                    18px,
                    4.5vw,
                    26px
                );

            line-height:
                4;

            letter-spacing:
                18px;

            text-shadow:
                0 0 8px
                rgba(255,220,145,.92);

            animation:
                scene13StarBlink
                2.7s
                ease-in-out
                infinite;
        }


        @keyframes scene13HeartPulse {

            0%,
            100% {

                transform:
                    translate(
                        -50%,
                        -50%
                    )
                    scale(.94);

                opacity:
                    .76;
            }

            50% {

                transform:
                    translate(
                        -50%,
                        -50%
                    )
                    scale(1.06);

                opacity:
                    1;
            }
        }


        @keyframes scene13StarBlink {

            0%,
            100% {

                opacity:
                    .62;

                transform:
                    scale(.94);
            }

            50% {

                opacity:
                    1;

                transform:
                    scale(1.06);
            }
        }


        /* ========================================================
           MEMORY LINE
           ======================================================== */

        .scene13-scratch-line {

            position:
                relative;

            z-index:
                30;

            width:
                min(
                    92vw,
                    500px
                );

            margin:
                7px auto 7px;

            padding:
                0 28px;

            box-sizing:
                border-box;

            color:
                #8a5c78;

            font-family:
                "Caveat",
                cursive;

            font-size:
                clamp(
                    1.05rem,
                    4.5vw,
                    1.30rem
                );

            line-height:
                1.08;

            text-align:
                center;

            text-shadow:
                0 1px 4px
                rgba(255,255,255,.72);
        }


        /* ========================================================
           FOLLOWING HEART / STAR PARTICLES
           ======================================================== */

        .scene13-follow-particle {

            position:
                absolute;

            z-index:
                45;

            pointer-events:
                none;

            user-select:
                none;

            -webkit-user-select:
                none;

            line-height:
                1;

            opacity:
                0;

            transform:
                translate3d(
                    0,
                    0,
                    0
                )
                scale(.45);

            will-change:
                transform,
                opacity;

            animation:
                scene13ParticleFly
                760ms
                cubic-bezier(
                    .16,
                    1,
                    .3,
                    1
                )
                forwards;
        }


        .scene13-follow-particle.heart {

            color:
                #ffafd0;

            font-size:
                15px;

            text-shadow:
                0 0 7px
                rgba(255,190,220,.95);
        }


        .scene13-follow-particle.star {

            color:
                #ffe3a0;

            font-size:
                15px;

            text-shadow:
                0 0 8px
                rgba(255,225,145,.95);
        }


        @keyframes scene13ParticleFly {

            0% {

                opacity:
                    0;

                transform:
                    translate3d(
                        0,
                        0,
                        0
                    )
                    scale(.45)
                    rotate(0deg);
            }

            16% {

                opacity:
                    1;

                transform:
                    translate3d(
                        0,
                        -2px,
                        0
                    )
                    scale(1)
                    rotate(-4deg);
            }

            55% {

                opacity:
                    .92;

                transform:
                    translate3d(
                        var(--dx),
                        var(--dy),
                        0
                    )
                    scale(1.04)
                    rotate(7deg);
            }

            100% {

                opacity:
                    0;

                transform:
                    translate3d(
                        var(--dx2),
                        var(--dy2),
                        0
                    )
                    scale(.62)
                    rotate(
                        var(--rot)
                    );
            }
        }


        /* ========================================================
           DOWNLOAD BUTTON
           ======================================================== */

        .scene13-scratch-download {

            position:
                absolute;

            right:
                9px;

            bottom:
                9px;

            z-index:
                70;

            width:
                37px;

            height:
                37px;

            padding:
                0;

            border:
                0;

            border-radius:
                50%;

            display:
                grid;

            place-items:
                center;

            background:
                rgba(255,255,255,.96);

            color:
                #965c7d;

            font-size:
                18px;

            box-shadow:
                0 7px 16px
                rgba(0,0,0,.14);

            cursor:
                pointer;

            opacity:
                0;

            transform:
                scale(.80);

            pointer-events:
                none;

            transition:

                opacity
                220ms ease,

                transform
                220ms
                cubic-bezier(
                    .16,
                    1,
                    .3,
                    1
                );
        }


        .scene13-scratch-download:not(:disabled) {

            opacity:
                1;

            transform:
                scale(1);

            pointer-events:
                auto;
        }


        /* ========================================================
           COMPLETED STATE
           ======================================================== */

        .scene13-scratch-card.is-complete
        .scene13-scratch-cover {

            opacity:
                0;

            transition:
                opacity
                260ms ease;
        }


        .scene13-scratch-card.is-complete
        .scene13-scratch-canvas {

            opacity:
                0;

            pointer-events:
                none;
        }


        /* ========================================================
           MOBILE
           ======================================================== */

        @media (max-width: 480px) {

            .scene13-scratch-card {

                width:
                    94vw;

                max-width:
                    94vw;

                padding:
                    8px;

                border-radius:
                    23px;
            }


            .scene13-scratch-photo {

                max-width:
                    calc(
                        94vw - 18px
                    );
            }


            .scene13-scratch-line {

                padding:
                    0 20px;
            }
        }

    `;


    document.head.appendChild(
        style
    );


    /* ============================================================
       PHOTO SIZE — KEEP REAL ASPECT RATIO
       ============================================================ */

    function sizeScratchPhoto(
        image,
        photo
    ) {

        if (
            !image.naturalWidth ||
            !image.naturalHeight
        ) {
            return;
        }


        const ratio =
            image.naturalWidth /
            image.naturalHeight;


        const maxWidth =
            Math.min(
                window.innerWidth * .88,
                520
            );


        const maxHeight =
            Math.min(
                window.innerHeight * .67,
                585
            );


        let width =
            maxWidth;


        let height =
            width /
            ratio;


        if (
            height >
            maxHeight
        ) {

            height =
                maxHeight;


            width =
                height *
                ratio;
        }


        photo.style.width =
            `${Math.floor(width)}px`;


        photo.style.height =
            `${Math.floor(height)}px`;
    }


    /* ============================================================
       OPEN MEMORY
       ============================================================ */

    function openMemory(
        card
    ) {

        /*
         * IMPORTANT:
         * There is deliberately NO storage check here.
         * Every opening is fresh.
         */

        if (
            modal
        ) {
            return;
        }


        activeCard =
            card;


        revealComplete =
            false;


        lastPoint =
            null;


        scratching =
            false;


        const source =
            card.querySelector(
                "img"
            );

        const index =
            Number(
                card.dataset.photoIndex
            ) || 1;

        const src =
            source?.currentSrc ||
            source?.src ||
            `assets/photos/final/final-${String(index).padStart(2, "0")}.jpg`;

        if (!src) {
            return;
        }


        modal =
            document.createElement(
                "div"
            );


        modal.className =
            "scene13-scratch-modal";


        modal.innerHTML = `

            <div
                class="scene13-scratch-card"
            >

                <!-- CARD BACKGROUND DECOR -->

                <div
                    class="scene13-card-decoration"
                    aria-hidden="true"
                >

                    <span class="heart">
                        ♡
                    </span>

                    <span class="star">
                        ✦
                    </span>

                    <span class="heart">
                        ♥
                    </span>

                    <span class="star">
                        ✧
                    </span>

                    <span class="star">
                        ✦
                    </span>

                    <span class="heart">
                        ♡
                    </span>

                </div>


                <!-- CLOSE -->

                <button
                    type="button"
                    class="scene13-scratch-close"
                    aria-label="Close"
                >
                    ×
                </button>


                <!-- SCRATCH PHOTO -->

                <div
                    class="scene13-scratch-photo"
                >

                    <img
                        class="scene13-scratch-image"
                        alt="Memory photo"
                        draggable="false"
                    >


                    <canvas
                        class="scene13-scratch-canvas"
                    ></canvas>


                    <div
                        class="scene13-scratch-cover"
                    ></div>

                </div>


                <!-- INDIVIDUAL MEMORY LINE -->

                <div
                    class="scene13-scratch-line"
                ></div>


                <!-- SMALL DOWNLOAD -->

                <button
                    type="button"
                    class="scene13-scratch-download"
                    disabled
                    aria-label="Download photo"
                    title="Download"
                >
                    ⇩
                </button>

            </div>
        `;


        document.body.appendChild(
            modal
        );


        const image =
            modal.querySelector(
                ".scene13-scratch-image"
            );


        const photo =
            modal.querySelector(
                ".scene13-scratch-photo"
            );


        const line =
            modal.querySelector(
                ".scene13-scratch-line"
            );


        const closeButton =
            modal.querySelector(
                ".scene13-scratch-close"
            );


        const downloadButton =
            modal.querySelector(
                ".scene13-scratch-download"
            );


        image.src =
            src;


        line.textContent =
            getMemoryLine(
                card
            );


        function prepareScratch() {

            if (!modal) {
                return;
            }


            sizeScratchPhoto(
                image,
                photo
            );


            canvas =
                modal.querySelector(
                    ".scene13-scratch-canvas"
                );


            if (!canvas) {
                return;
            }


            ctx =
                canvas.getContext(
                    "2d",
                    {
                        willReadFrequently:
                            true
                    }
                );


            if (!ctx) {
                return;
            }


            setupCanvas();

            createScratchSurface();

            bindScratchEvents();
        }


        if (
            image.complete &&
            image.naturalWidth
        ) {

            prepareScratch();

        } else {

            image.addEventListener(
                "load",
                prepareScratch,
                {
                    once:
                        true
                }
            );
        }


        closeButton.addEventListener(
            "click",
            closeMemory
        );


        downloadButton.addEventListener(
            "click",
            () => {

                if (
                    !revealComplete
                ) {
                    return;
                }


                downloadPhoto(
                    src,
                    card
                );
            }
        );


        requestAnimationFrame(
            () => {

                modal?.classList.add(
                    "is-open"
                );
            }
        );


        document.body.style.overflow =
            "hidden";
    }


    /* ============================================================
       CANVAS SETUP
       ============================================================ */

    function setupCanvas() {

        if (
            !canvas ||
            !ctx
        ) {
            return;
        }


        const rect =
            canvas.getBoundingClientRect();


        const dpr =
            Math.max(
                1,
                Math.min(
                    window.devicePixelRatio || 1,
                    2
                )
            );


        canvas.width =
            Math.round(
                rect.width *
                dpr
            );


        canvas.height =
            Math.round(
                rect.height *
                dpr
            );


        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );
    }


    /* ============================================================
       SCRATCH FOIL
       ============================================================ */

    function createScratchSurface() {

        if (
            !canvas ||
            !ctx
        ) {
            return;
        }


        const width =
            canvas.clientWidth;


        const height =
            canvas.clientHeight;


        /*
         * Metallic pink / lavender foil.
         */

        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                width,
                height
            );


        gradient.addColorStop(
            0,
            "#efbdd7"
        );


        gradient.addColorStop(
            .30,
            "#dac6e7"
        );


        gradient.addColorStop(
            .52,
            "#f6dce9"
        );


        gradient.addColorStop(
            .76,
            "#cfdcdf"
        );


        gradient.addColorStop(
            1,
            "#e2c3d9"
        );


        ctx.fillStyle =
            gradient;


        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        /*
         * Diagonal foil shine.
         */

        ctx.save();


        ctx.globalAlpha =
            .24;


        ctx.strokeStyle =
            "#ffffff";


        ctx.lineWidth =
            2;


        for (
            let x = -height;
            x <
                width + height;
            x += 18
        ) {

            ctx.beginPath();


            ctx.moveTo(
                x,
                0
            );


            ctx.lineTo(
                x + height,
                height
            );


            ctx.stroke();
        }


        ctx.restore();


        /*
         * Small glitter points.
         */

        ctx.save();


        ctx.globalAlpha =
            .52;


        for (
            let i = 0;
            i < 105;
            i++
        ) {

            const x =
                Math.random() *
                width;


            const y =
                Math.random() *
                height;


            const radius =
                .7 +
                Math.random() *
                1.2;


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                radius,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                "#fff8fc";


            ctx.fill();
        }


        ctx.restore();


        /*
         * Soft center glow.
         */

        const glow =
            ctx.createRadialGradient(
                width * .50,
                height * .47,
                5,
                width * .50,
                height * .47,
                Math.max(
                    width,
                    height
                ) * .48
            );


        glow.addColorStop(
            0,
            "rgba(255,255,255,.30)"
        );


        glow.addColorStop(
            .35,
            "rgba(255,255,255,.10)"
        );


        glow.addColorStop(
            1,
            "rgba(255,255,255,0)"
        );


        ctx.fillStyle =
            glow;


        ctx.fillRect(
            0,
            0,
            width,
            height
        );
    }


    /* ============================================================
       POINTER POSITION
       ============================================================ */

    function getPoint(
        event
    ) {

        const rect =
            canvas.getBoundingClientRect();


        return {

            x:
                event.clientX -
                rect.left,

            y:
                event.clientY -
                rect.top
        };
    }


    /* ============================================================
       HEART + STAR FOLLOW PARTICLES
       ============================================================ */

    function spawnParticle(
        point,
        type,
        offsetX,
        offsetY
    ) {

        if (
            !modal
        ) {
            return;
        }


        const photo =
            modal.querySelector(
                ".scene13-scratch-photo"
            );


        if (!photo) {
            return;
        }


        const particle =
            document.createElement(
                "span"
            );


        particle.className =
            `scene13-follow-particle ${type}`;


        particle.textContent =
            type === "heart"
                ? (
                    Math.random() < .5
                        ? "♥"
                        : "♡"
                )
                : (
                    Math.random() < .5
                        ? "✦"
                        : "✧"
                );


        particle.style.left =
            `${point.x + offsetX}px`;


        particle.style.top =
            `${point.y + offsetY}px`;


        particle.style.setProperty(
            "--dx",
            `${(
                Math.random() *
                34
            ) - 17}px`
        );


        particle.style.setProperty(
            "--dy",
            `${(
                Math.random() *
                -38
            ) - 8}px`
        );


        particle.style.setProperty(
            "--dx2",
            `${(
                Math.random() *
                64
            ) - 32}px`
        );


        particle.style.setProperty(
            "--dy2",
            `${(
                Math.random() *
                -78
            ) - 18}px`
        );


        particle.style.setProperty(
            "--rot",
            `${(
                Math.random() *
                80
            ) - 40
            }deg`
        );


        photo.appendChild(
            particle
        );


        setTimeout(
            () => {

                particle.remove();

            },
            800
        );
    }


    function spawnFollowParticles(
        point
    ) {

        const now =
            performance.now();


        /*
         * Keep it cute, not overcrowded.
         */

        if (
            now -
            lastParticleTime <
            70
        ) {
            return;
        }


        lastParticleTime =
            now;


        /*
         * One heart + one star per
         * small scratch movement.
         */

        spawnParticle(
            point,
            "heart",
            -6,
            2
        );


        spawnParticle(
            point,
            "star",
            8,
            -4
        );
    }


    /* ============================================================
       SCRATCH
       ============================================================ */

    function scratch(
        point
    ) {

        if (
            !ctx ||
            !canvas ||
            revealComplete
        ) {
            return;
        }


        /*
         * Hearts + stars come directly
         * from the finger/mouse scratch point.
         */

        spawnFollowParticles(
            point
        );


        /*
         * Real scratch.
         */

        ctx.save();


        ctx.globalCompositeOperation =
            "destination-out";


        const radius =
            Math.max(
                18,
                Math.min(
                    28,
                    canvas.clientWidth *
                    .043
                )
            );


        ctx.lineWidth =
            radius * 2;


        ctx.lineCap =
            "round";


        ctx.lineJoin =
            "round";


        ctx.beginPath();


        if (
            lastPoint
        ) {

            ctx.moveTo(
                lastPoint.x,
                lastPoint.y
            );


            ctx.lineTo(
                point.x,
                point.y
            );

        } else {

            ctx.moveTo(
                point.x,
                point.y
            );


            ctx.lineTo(
                point.x + .1,
                point.y + .1
            );
        }


        ctx.stroke();


        ctx.beginPath();


        ctx.arc(
            point.x,
            point.y,
            radius,
            0,
            Math.PI * 2
        );


        ctx.fill();


        ctx.restore();


        lastPoint =
            point;


        updateReveal();
    }


    /* ============================================================
       REVEAL PERCENTAGE
       ============================================================ */

    function updateReveal() {

        if (
            !ctx ||
            !canvas ||
            revealComplete
        ) {
            return;
        }


        const pixels =
            ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            ).data;


        const step =
            10;


        let total =
            0;


        let clear =
            0;


        for (
            let y = 0;
            y < canvas.height;
            y += step
        ) {

            for (
                let x = 0;
                x < canvas.width;
                x += step
            ) {

                const alpha =
                    pixels[
                        (
                            y *
                            canvas.width +
                            x
                        ) * 4 + 3
                    ];


                total++;


                if (
                    alpha <
                    25
                ) {

                    clear++;
                }
            }
        }


        if (
            !total
        ) {
            return;
        }


        const percent =
            (
                clear /
                total
            ) * 100;


        if (
            percent >=
            COMPLETE_THRESHOLD
        ) {

            finishReveal();
        }
    }


    /* ============================================================
       FINISH REVEAL
       ============================================================ */

    function finishReveal() {

        if (
            revealComplete
        ) {
            return;
        }


        revealComplete =
            true;


        /*
         * Remove remaining foil.
         */

        ctx?.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        const card =
            modal?.querySelector(
                ".scene13-scratch-card"
            );


        card?.classList.add(
            "is-complete"
        );

        if (activeCard) {
            activeCard.classList.add(
                "is-revealed"
            );
        }


        /*
         * Download appears ONLY now.
         */

        const download =
            modal?.querySelector(
                ".scene13-scratch-download"
            );


        if (
            download
        ) {

            download.disabled =
                false;
        }
    }


    /* ============================================================
       POINTER DOWN
       ============================================================ */

    function onPointerDown(
        event
    ) {

        if (
            !canvas ||
            revealComplete
        ) {
            return;
        }


        scratching =
            true;


        lastPoint =
            null;


        try {

            canvas.setPointerCapture(
                event.pointerId
            );

        } catch (_) {}


        scratch(
            getPoint(event)
        );


        event.preventDefault();
    }


    /* ============================================================
       POINTER MOVE
       ============================================================ */

    function onPointerMove(
        event
    ) {

        if (
            !scratching ||
            revealComplete
        ) {
            return;
        }


        scratch(
            getPoint(event)
        );


        event.preventDefault();
    }


    /* ============================================================
       POINTER UP
       ============================================================ */

    function onPointerUp() {

        scratching =
            false;


        lastPoint =
            null;
    }


    /* ============================================================
       BIND SCRATCH
       ============================================================ */

    function bindScratchEvents() {

        if (
            !canvas
        ) {
            return;
        }


        canvas.addEventListener(
            "pointerdown",
            onPointerDown,
            {
                passive:
                    false
            }
        );


        canvas.addEventListener(
            "pointermove",
            onPointerMove,
            {
                passive:
                    false
            }
        );


        canvas.addEventListener(
            "pointerup",
            onPointerUp
        );


        canvas.addEventListener(
            "pointercancel",
            onPointerUp
        );


        document.addEventListener(
            "keydown",
            handleEscape
        );
    }


    /* ============================================================
       ESCAPE
       ============================================================ */

    function handleEscape(
        event
    ) {

        if (
            event.key ===
                "Escape" &&
            modal
        ) {

            closeMemory();
        }
    }


    /* ============================================================
       DOWNLOAD
       ============================================================ */

    function downloadPhoto(
        src,
        card
    ) {

        const index =
            Number(
                card.dataset.photoIndex
            ) || 1;


        const link =
            document.createElement(
                "a"
            );


        link.href =
            src;


        link.download =
            `Sehrish-Memory-${index}.jpg`;


        link.rel =
            "noopener";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();
    }


    /* ============================================================
       CLOSE
       ============================================================ */

    function closeMemory() {

        if (
            !modal
        ) {
            return;
        }


        document.removeEventListener(
            "keydown",
            handleEscape
        );


        const oldModal =
            modal;


        modal =
            null;


        canvas =
            null;


        ctx =
            null;


        if (
            revealComplete &&
            activeCard
        ) {
            activeCard.classList.add(
                "is-revealed"
            );
        }

        activeCard =
        null;


        scratching =
            false;


        lastPoint =
            null;


        revealComplete =
            false;


        lastParticleTime =
            0;


        document.body.style.overflow =
            "";


        oldModal.classList.remove(
            "is-open"
        );


        setTimeout(
            () => {

                oldModal.remove();

            },
            300
        );
    }


    /* ============================================================
       CLOSE MODAL WHEN LEAVING SCENE 13
       ============================================================ */

    const sceneObserver =
        new MutationObserver(
            () => {

                const active =
                    scene.classList.contains(
                        "is-active"
                    ) &&
                    scene.getAttribute(
                        "aria-hidden"
                    ) !== "true";


                if (!active) {

                    scene
                        .querySelectorAll(
                            ".final-memory-photo.is-revealed"
                        )
                        .forEach(
                            (card) => {
                                card.classList.remove(
                                    "is-revealed"
                                );
                            }
                        );

                if (modal) {
                    closeMemory();
                }
            }
            }
        );


    sceneObserver.observe(
        scene,
        {
            attributes:
                true,

            attributeFilter: [
                "class",
                "aria-hidden"
            ]
        }
    );


    /* ============================================================
   PHOTO CLICK — CAPTURE PHASE
   ============================================================ */

scene.addEventListener(
    "click",
    (event) => {

        const card =
            event.target.closest(
                ".final-memory-photo"
            );

        if (
            !card ||
            !scene.contains(card)
        ) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        openMemory(
            card
        );

    },
    true
);


/* ============================================================
   SCENE 13 — DIRECT POINTER OPEN
   Prevent older scratch interaction from swallowing taps.
   ============================================================ */

scene.addEventListener(
    "pointerdown",
    (event) => {

        const card =
            event.target.closest(
                ".final-memory-photo"
            );

        if (
            !card ||
            !scene.contains(card)
        ) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        openMemory(
            card
        );

    },
    true
);

})();