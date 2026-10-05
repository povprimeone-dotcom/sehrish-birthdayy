/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/preloader.js
 * Version: 1.0.0
 *
 * Production-ready website preloader and asset preparation manager.
 *
 * Responsibilities:
 * - Initial application loading screen
 * - Asset discovery
 * - Image preloading
 * - Video metadata preparation
 * - Audio metadata preparation
 * - Font readiness detection
 * - Loading progress calculation
 * - Loading status updates
 * - Minimum loader visibility time
 * - Maximum loading timeout protection
 * - Reduced-motion awareness
 * - Graceful handling of failed optional assets
 * - Custom loading events
 * - Integration with app.js and other modules
 * - Public API
 *
 * Supported HTML:
 *
 * <div data-preloader>
 *     <div data-preloader-progress></div>
 *     <div data-preloader-percent></div>
 *     <div data-preloader-status></div>
 * </div>
 *
 * Optional:
 *
 * <div data-preloader-bar></div>
 * <div data-preloader-spinner></div>
 * <div data-preloader-logo></div>
 *
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const DEFAULTS = Object.freeze({
        minimumDuration: 850,
        maximumDuration: 12000,

        preloadImages: true,
        preloadVideos: true,
        preloadAudio: true,
        preloadFonts: true,

        includeLazyImages: false,
        includeHiddenAssets: true,

        decodeImages: true,

        videoMetadataTimeout: 5000,
        audioMetadataTimeout: 5000,

        hideAfterComplete: true,
        removeAfterComplete: false,

        fadeDuration: 450,

        respectReducedMotion: true,

        persistLoadedState: false,

        storageKey:
            "sehrish-birthday-preloader-v1"
    });

    const SELECTORS = Object.freeze({
        root:
            "[data-preloader], #app-loader, .app-loader, [data-app-loader]",

        progress:
            "[data-preloader-progress]",

        bar:
            "[data-preloader-bar]",

        percent:
            "[data-preloader-percent]",

        status:
            "[data-preloader-status]",

        loaded:
            "[data-preloader-loaded]",

        total:
            "[data-preloader-total]",

        spinner:
            "[data-preloader-spinner]"
    });

    const EVENTS = Object.freeze({
        ready:
            "sehrish:preloader:ready",

        start:
            "sehrish:preloader:start",

        progress:
            "sehrish:preloader:progress",

        assetLoaded:
            "sehrish:preloader:asset-loaded",

        assetFailed:
            "sehrish:preloader:asset-failed",

        complete:
            "sehrish:preloader:complete",

        hidden:
            "sehrish:preloader:hidden",

        timeout:
            "sehrish:preloader:timeout"
    });

    /* ------------------------------------------------------------------------
     * UTILITY FUNCTIONS
     * --------------------------------------------------------------------- */

    const prefersReducedMotion = () => {
        try {
            return window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;
        } catch {
            return false;
        }
    };

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
        name,
        detail = {}
    ) => {
        try {
            window.dispatchEvent(
                new CustomEvent(
                    name,
                    {
                        detail
                    }
                )
            );
        } catch {
            /* Ignore event dispatch errors. */
        }
    };

    const wait = (
        milliseconds
    ) => {
        if (
            !milliseconds ||
            milliseconds <= 0
        ) {
            return Promise.resolve();
        }

        return new Promise(
            (resolve) => {
                window.setTimeout(
                    resolve,
                    milliseconds
                );
            }
        );
    };

    const waitForEvent = (
        target,
        eventName,
        timeout
    ) => {
        return new Promise(
            (resolve) => {
                let settled =
                    false;

                let timer = null;

                const cleanup = () => {
                    target.removeEventListener(
                        eventName,
                        onEvent
                    );

                    if (timer !== null) {
                        window.clearTimeout(
                            timer
                        );
                    }
                };

                const finish = (
                    value
                ) => {
                    if (settled) {
                        return;
                    }

                    settled = true;

                    cleanup();

                    resolve(value);
                };

                const onEvent = () => {
                    finish(true);
                };

                target.addEventListener(
                    eventName,
                    onEvent,
                    {
                        once: true
                    }
                );

                if (
                    Number.isFinite(
                        timeout
                    ) &&
                    timeout > 0
                ) {
                    timer =
                        window.setTimeout(
                            () => {
                                finish(false);
                            },
                            timeout
                        );
                }
            }
        );
    };

    /* ------------------------------------------------------------------------
     * ASSET RECORD
     * --------------------------------------------------------------------- */

    class PreloadAsset {
        constructor(
            type,
            source,
            element = null
        ) {
            this.type =
                type;

            this.source =
                source || "";

            this.element =
                element;

            this.loaded =
                false;

            this.failed =
                false;

            this.started =
                false;

            this.error =
                null;

            this.duration =
                0;

            this.startedAt =
                null;

            this.finishedAt =
                null;
        }

        markStarted() {
            this.started =
                true;

            this.startedAt =
                performance.now();
        }

        markLoaded() {
            this.loaded =
                true;

            this.failed =
                false;

            this.finishedAt =
                performance.now();

            this.duration =
                this.finishedAt -
                (this.startedAt ||
                    this.finishedAt);
        }

        markFailed(
            error = null
        ) {
            this.failed =
                true;

            this.loaded =
                false;

            this.error =
                error;

            this.finishedAt =
                performance.now();

            this.duration =
                this.finishedAt -
                (this.startedAt ||
                    this.finishedAt);
        }

        getState() {
            return {
                type:
                    this.type,

                source:
                    this.source,

                loaded:
                    this.loaded,

                failed:
                    this.failed,

                started:
                    this.started,

                duration:
                    this.duration
            };
        }
    }

    /* ------------------------------------------------------------------------
     * PRELOADER MANAGER
     * --------------------------------------------------------------------- */

    class BirthdayPreloaderManager {
        constructor(
            options = {}
        ) {
            this.options = {
                ...DEFAULTS,
                ...options
            };

            this.root =
                null;

            this.progressElement =
                null;

            this.barElement =
                null;

            this.percentElement =
                null;

            this.statusElement =
                null;

            this.loadedElement =
                null;

            this.totalElement =
                null;

            this.spinnerElement =
                null;

            this.assets = [];

            this.loadedCount =
                0;

            this.failedCount =
                0;

            this.completedCount =
                0;

            this.totalCount =
                0;

            this.progress =
                0;

            this.running =
                false;

            this.completed =
                false;

            this.hidden =
                false;

            this.timedOut =
                false;

            this.initialized =
                false;

            this.destroyed =
                false;

            this.startedAt =
                null;

            this.completedAt =
                null;

            this.minimumTimer =
                null;

            this.maximumTimer =
                null;

            this.bound =
                false;

            this.listeners =
                [];
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

            this.discoverUI();

            this.prepareUI();

            this.bindEvents();

            this.initialized =
                true;

            dispatch(
                EVENTS.ready,
                {
                    manager:
                        this
                }
            );

            return this;
        }

        /* --------------------------------------------------------------------
         * UI DISCOVERY
         * ----------------------------------------------------------------- */

        discoverUI() {
            this.root =
                document.querySelector(
                    SELECTORS.root
                );

            this.progressElement =
                document.querySelector(
                    SELECTORS.progress
                );

            this.barElement =
                document.querySelector(
                    SELECTORS.bar
                );

            this.percentElement =
                document.querySelector(
                    SELECTORS.percent
                );

            this.statusElement =
                document.querySelector(
                    SELECTORS.status
                );

            this.loadedElement =
                document.querySelector(
                    SELECTORS.loaded
                );

            this.totalElement =
                document.querySelector(
                    SELECTORS.total
                );

            this.spinnerElement =
                document.querySelector(
                    SELECTORS.spinner
                );
        }

        /* --------------------------------------------------------------------
         * UI PREPARATION
         * ----------------------------------------------------------------- */

        prepareUI() {
            if (!this.root) {
                return;
            }

            this.root.dataset.preloaderState =
                "ready";

            this.root.setAttribute(
                "aria-busy",
                "true"
            );

            this.root.setAttribute(
                "aria-live",
                "polite"
            );

            if (
                this.progressElement
            ) {
                this.progressElement.setAttribute(
                    "role",
                    "progressbar"
                );

                this.progressElement.setAttribute(
                    "aria-valuemin",
                    "0"
                );

                this.progressElement.setAttribute(
                    "aria-valuemax",
                    "100"
                );

                this.progressElement.setAttribute(
                    "aria-valuenow",
                    "0"
                );
            }

            if (
                this.barElement
            ) {
                this.barElement.style.width =
                    "0%";
            }

            if (
                this.percentElement
            ) {
                this.percentElement.textContent =
                    "0%";
            }

            this.updateCounters();

            document.body?.classList.add(
                "preloader-active"
            );
        }

        /* --------------------------------------------------------------------
         * EVENTS
         * ----------------------------------------------------------------- */

        bindEvents() {
            if (
                this.bound
            ) {
                return;
            }

            this.bound =
                true;

            this.addListener(
                window,
                "sehrish:preloader:start",
                () => {
                    /*
                     * Prevent duplicate
                     * automatic starts.
                     */
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
         * START
         * ----------------------------------------------------------------- */

        async start() {
            if (
                this.running ||
                this.completed ||
                this.destroyed
            ) {
                return this.getState();
            }

            if (
                !this.initialized
            ) {
                this.init();
            }

            this.running =
                true;

            this.completed =
                false;

            this.hidden =
                false;

            this.timedOut =
                false;

            this.loadedCount =
                0;

            this.failedCount =
                0;

            this.completedCount =
                0;

            this.progress =
                0;

            this.startedAt =
                performance.now();

            this.show();

            dispatch(
                EVENTS.start,
                {
                    manager:
                        this
                }
            );

            this.minimumTimer =
                window.setTimeout(
                    () => {},
                    this.options
                        .minimumDuration
                );

            this.maximumTimer =
                window.setTimeout(
                    () => {
                        this.handleMaximumTimeout();
                    },
                    this.options
                        .maximumDuration
                );

            this.collectAssets();

            this.updateProgress(
                0
            );

            const loadingPromise =
                this.preloadAssets();

            const minimumPromise =
                wait(
                    this.options
                        .minimumDuration
                );

            await Promise.all([
                loadingPromise,
                minimumPromise
            ]);

            if (
                this.timedOut
            ) {
                return this.finish(
                    "timeout"
                );
            }

            return this.finish(
                "complete"
            );
        }

        /* --------------------------------------------------------------------
         * ASSET COLLECTION
         * ----------------------------------------------------------------- */

        collectAssets() {
            this.assets =
                [];

            if (
                this.options
                    .preloadImages
            ) {
                this.collectImages();
            }

            if (
                this.options
                    .preloadVideos
            ) {
                this.collectVideos();
            }

            if (
                this.options
                    .preloadAudio
            ) {
                this.collectAudio();
            }

            this.totalCount =
                this.assets.length;

            this.updateCounters();
        }

        /* --------------------------------------------------------------------
         * IMAGE COLLECTION
         * ----------------------------------------------------------------- */

        collectImages() {
            const elements =
                document.querySelectorAll(
                    "img"
                );

            elements.forEach(
                (image) => {
                    if (
                        !this.options
                            .includeLazyImages &&
                        image.loading ===
                            "lazy"
                    ) {
                        return;
                    }

                    if (
                        !this.options
                            .includeHiddenAssets
                    ) {
                        const style =
                            window.getComputedStyle(
                                image
                            );

                        if (
                            style.display ===
                                "none" ||
                            style.visibility ===
                                "hidden"
                        ) {
                            return;
                        }
                    }

                    const source =
                        image.currentSrc ||
                        image.src;

                    if (!source) {
                        return;
                    }

                    this.addAsset(
                        "image",
                        source,
                        image
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * VIDEO COLLECTION
         * ----------------------------------------------------------------- */

        collectVideos() {
            const videos =
                document.querySelectorAll(
                    "video"
                );

            videos.forEach(
                (video) => {
                    const source =
                        video.currentSrc ||
                        video.src ||
                        video.querySelector(
                            "source"
                        )?.src;

                    if (!source) {
                        return;
                    }

                    this.addAsset(
                        "video",
                        source,
                        video
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * AUDIO COLLECTION
         * ----------------------------------------------------------------- */

        collectAudio() {
            const audioElements =
                document.querySelectorAll(
                    "audio"
                );

            audioElements.forEach(
                (audio) => {
                    const source =
                        audio.currentSrc ||
                        audio.src ||
                        audio.querySelector(
                            "source"
                        )?.src;

                    if (!source) {
                        return;
                    }

                    this.addAsset(
                        "audio",
                        source,
                        audio
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * ADD ASSET
         * ----------------------------------------------------------------- */

        addAsset(
            type,
            source,
            element
        ) {
            const existing =
                this.assets.find(
                    (
                        asset
                    ) =>
                        asset.type ===
                            type &&
                        asset.source ===
                            source
                );

            if (
                existing
            ) {
                return existing;
            }

            const asset =
                new PreloadAsset(
                    type,
                    source,
                    element
                );

            this.assets.push(
                asset
            );

            return asset;
        }

        /* --------------------------------------------------------------------
         * PRELOAD ASSETS
         * ----------------------------------------------------------------- */

        async preloadAssets() {
            if (
                !this.assets.length
            ) {
                this.updateProgress(
                    100
                );

                return true;
            }

            const tasks =
                this.assets.map(
                    (asset) =>
                        this.loadAsset(
                            asset
                        )
                );

            await Promise.allSettled(
                tasks
            );

            if (
                this.options
                    .preloadFonts
            ) {
                await this.preloadFonts();
            }

            this.updateProgress(
                100
            );

            return true;
        }

        /* --------------------------------------------------------------------
         * LOAD SINGLE ASSET
         * ----------------------------------------------------------------- */

        async loadAsset(
            asset
        ) {
            asset.markStarted();

            try {
                let result =
                    false;

                switch (
                    asset.type
                ) {
                    case "image":
                        result =
                            await this.loadImage(
                                asset
                            );
                        break;

                    case "video":
                        result =
                            await this.loadVideo(
                                asset
                            );
                        break;

                    case "audio":
                        result =
                            await this.loadAudio(
                                asset
                            );
                        break;

                    default:
                        result =
                            true;
                        break;
                }

                if (result) {
                    asset.markLoaded();

                    this.loadedCount +=
                        1;

                    dispatch(
                        EVENTS.assetLoaded,
                        {
                            manager:
                                this,

                            asset
                        }
                    );
                } else {
                    asset.markFailed();

                    this.failedCount +=
                        1;

                    dispatch(
                        EVENTS.assetFailed,
                        {
                            manager:
                                this,

                            asset
                        }
                    );
                }
            } catch (error) {
                asset.markFailed(
                    error
                );

                this.failedCount +=
                    1;

                dispatch(
                    EVENTS.assetFailed,
                    {
                        manager:
                            this,

                        asset,

                        error
                    }
                );
            }

            this.completedCount +=
                1;

            this.updateProgressFromAssets();
        }

        /* --------------------------------------------------------------------
         * IMAGE LOADING
         * ----------------------------------------------------------------- */

        async loadImage(
            asset
        ) {
            const image =
                asset.element;

            if (
                image?.complete &&
                image.naturalWidth >
                    0
            ) {
                if (
                    this.options
                        .decodeImages &&
                    typeof image.decode ===
                        "function"
                ) {
                    try {
                        await image.decode();
                    } catch {
                        /*
                         * Browser may reject decode
                         * for already-decoded images.
                         */
                    }
                }

                return true;
            }

            const loader =
                new Image();

            loader.src =
                asset.source;

            const loaded =
                await new Promise(
                    (resolve) => {
                        let settled =
                            false;

                        const finish = (
                            value
                        ) => {
                            if (
                                settled
                            ) {
                                return;
                            }

                            settled =
                                true;

                            resolve(
                                value
                            );
                        };

                        loader.onload =
                            () =>
                                finish(
                                    true
                                );

                        loader.onerror =
                            () =>
                                finish(
                                    false
                                );

                        if (
                            loader.complete
                        ) {
                            finish(
                                loader
                                    .naturalWidth >
                                    0
                            );
                        }
                    }
                );

            if (
                loaded &&
                this.options
                    .decodeImages &&
                typeof loader.decode ===
                    "function"
            ) {
                try {
                    await loader.decode();
                } catch {
                    /*
                     * Ignore decode failure when
                     * the image itself loaded.
                     */
                }
            }

            return loaded;
        }

        /* --------------------------------------------------------------------
         * VIDEO LOADING
         * ----------------------------------------------------------------- */

        async loadVideo(
            asset
        ) {
            const video =
                asset.element;

            if (
                video &&
                video.readyState >=
                    1
            ) {
                return true;
            }

            const loader =
                document.createElement(
                    "video"
                );

            loader.preload =
                "metadata";

            loader.muted =
                true;

            loader.playsInline =
                true;

            loader.src =
                asset.source;

            loader.load();

            return waitForEvent(
                loader,
                "loadedmetadata",
                this.options
                    .videoMetadataTimeout
            );
        }

        /* --------------------------------------------------------------------
         * AUDIO LOADING
         * ----------------------------------------------------------------- */

        async loadAudio(
            asset
        ) {
            const audio =
                asset.element;

            if (
                audio &&
                audio.readyState >=
                    1
            ) {
                return true;
            }

            const loader =
                document.createElement(
                    "audio"
                );

            loader.preload =
                "metadata";

            loader.src =
                asset.source;

            loader.load();

            return waitForEvent(
                loader,
                "loadedmetadata",
                this.options
                    .audioMetadataTimeout
            );
        }

        /* --------------------------------------------------------------------
         * FONT PRELOAD
         * ----------------------------------------------------------------- */

        async preloadFonts() {
            if (
                !document.fonts
            ) {
                return;
            }

            try {
                await Promise.race([
                    document.fonts.ready,
                    wait(3500)
                ]);
            } catch {
                /*
                 * Fonts are considered optional
                 * for initial application startup.
                 */
            }
        }

        /* --------------------------------------------------------------------
         * PROGRESS
         * ----------------------------------------------------------------- */

        updateProgressFromAssets() {
            if (
                this.totalCount <= 0
            ) {
                this.updateProgress(
                    100
                );

                return;
            }

            const percentage =
                Math.round(
                    (this.completedCount /
                        this.totalCount) *
                        100
                );

            this.updateProgress(
                percentage
            );
        }

        updateProgress(
            value
        ) {
            this.progress =
                clamp(
                    Number(value) || 0,
                    0,
                    100
                );

            if (
                this.progressElement
            ) {
                this.progressElement.setAttribute(
                    "aria-valuenow",
                    String(
                        Math.round(
                            this.progress
                        )
                    )
                );

                if (
                    this.progressElement instanceof
                    HTMLProgressElement
                ) {
                    this.progressElement.max =
                        100;

                    this.progressElement.value =
                        this.progress;
                }
            }

            if (
                this.barElement
            ) {
                this.barElement.style.width =
                    `${this.progress}%`;

                this.barElement.style.transform =
                    `scaleX(${this.progress / 100})`;
            }

            if (
                this.percentElement
            ) {
                this.percentElement.textContent =
                    `${Math.round(
                        this.progress
                    )}%`;
            }

            if (
                this.statusElement
            ) {
                this.statusElement.textContent =
                    this.getStatusText();
            }

            this.updateCounters();

            dispatch(
                EVENTS.progress,
                {
                    manager:
                        this,

                    progress:
                        this.progress,

                    loaded:
                        this.loadedCount,

                    failed:
                        this.failedCount,

                    total:
                        this.totalCount
                }
            );
        }

        /* --------------------------------------------------------------------
         * COUNTERS
         * ----------------------------------------------------------------- */

        updateCounters() {
            if (
                this.loadedElement
            ) {
                this.loadedElement.textContent =
                    String(
                        this.loadedCount
                    );
            }

            if (
                this.totalElement
            ) {
                this.totalElement.textContent =
                    String(
                        this.totalCount
                    );
            }
        }

        /* --------------------------------------------------------------------
         * STATUS TEXT
         * ----------------------------------------------------------------- */

        getStatusText() {
            if (
                this.completed
            ) {
                return "Ready";
            }

            if (
                this.timedOut
            ) {
                return "Starting";
            }

            if (
                this.totalCount === 0
            ) {
                return "Preparing...";
            }

            if (
                this.progress < 25
            ) {
                return "Preparing your surprise...";
            }

            if (
                this.progress < 50
            ) {
                return "Loading memories...";
            }

            if (
                this.progress < 75
            ) {
                return "Preparing something special...";
            }

            if (
                this.progress < 100
            ) {
                return "Almost ready...";
            }

            return "Ready!";
        }

        /* --------------------------------------------------------------------
         * TIMEOUT
         * ----------------------------------------------------------------- */

        handleMaximumTimeout() {
            if (
                !this.running ||
                this.completed
            ) {
                return;
            }

            this.timedOut =
                true;

            dispatch(
                EVENTS.timeout,
                {
                    manager:
                        this,

                    loaded:
                        this.loadedCount,

                    failed:
                        this.failedCount,

                    total:
                        this.totalCount
                }
            );

            /*
             * A preload failure must never permanently
             * block the birthday experience.
             */
            /*
             * Use the real completion method. The previous implementation
             * called a non-existent `complete()` method here, which could
             * throw exactly when the maximum timeout was reached.
             */
            void this.finish(
                "timeout"
            );
        }

        /* --------------------------------------------------------------------
         * FINISH
         * ----------------------------------------------------------------- */

        async finish(
            reason = "complete"
        ) {
            if (
                this.completed
            ) {
                return this.getState();
            }

            this.completed =
                true;

            this.running =
                false;

            this.completedAt =
                performance.now();

            this.progress =
                100;

            this.updateProgress(
                100
            );

            if (
                this.maximumTimer
            ) {
                window.clearTimeout(
                    this.maximumTimer
                );

                this.maximumTimer =
                    null;
            }

            if (
                this.minimumTimer
            ) {
                window.clearTimeout(
                    this.minimumTimer
                );

                this.minimumTimer =
                    null;
            }

            if (this.root) {
                this.root.dataset.preloaderState =
                    "complete";

                this.root.setAttribute(
                    "aria-busy",
                    "false"
                );
            }

            document.body?.classList.add(
                "preloader-complete"
            );

            dispatch(
                EVENTS.complete,
                {
                    manager:
                        this,

                    reason,

                    state:
                        this.getState()
                }
            );

            if (
                this.options
                    .hideAfterComplete
            ) {
                await this.hide();
            }

            if (
                this.options
                    .persistLoadedState
            ) {
                this.persistState();
            }

            return this.getState();
        }

        /* --------------------------------------------------------------------
         * SHOW
         * ----------------------------------------------------------------- */

        show() {
            if (!this.root) {
                return;
            }

            this.hidden =
                false;

            this.root.hidden =
                false;

            this.root.removeAttribute(
                "hidden"
            );

            this.root.classList.remove(
                "preloader-hidden",
                "preloader-hiding",
                "is-hidden"
            );

            this.root.classList.add(
                "preloader-visible"
            );

            this.root.style.display =
                "";

            this.root.style.pointerEvents =
                "auto";

            this.root.setAttribute(
                "aria-hidden",
                "false"
            );
        }

        /* --------------------------------------------------------------------
         * HIDE
         * ----------------------------------------------------------------- */

        async hide() {
            if (
                this.hidden
            ) {
                return;
            }

            this.hidden =
                true;

            if (!this.root) {
                document.body?.classList.remove(
                    "preloader-active"
                );

                return;
            }

            if (
                !(
                    this.options
                        .respectReducedMotion &&
                    prefersReducedMotion()
                )
            ) {
                this.root.classList.add(
                    "preloader-hiding"
                );

                await wait(
                    this.options
                        .fadeDuration
                );
            }

            this.root.classList.remove(
                "preloader-visible",
                "preloader-hiding"
            );

            /*
             * The main app.js loader uses `.is-hidden`. Keep both
             * class systems synchronized so either loader controller
             * can safely hide the same DOM node.
             */
            this.root.classList.add(
                "preloader-hidden",
                "is-hidden"
            );

            this.root.setAttribute(
                "aria-hidden",
                "true"
            );

            this.root.style.pointerEvents =
                "none";

            this.root.style.display =
                "none";

            document.body?.classList.remove(
                "preloader-active"
            );

            document.body?.classList.add(
                "preloader-has-loaded"
            );

            dispatch(
                EVENTS.hidden,
                {
                    manager:
                        this
                }
            );

            if (
                this.options
                    .removeAfterComplete
            ) {
                this.root.remove();
            }
        }

        /* --------------------------------------------------------------------
         * PERSISTENCE
         * ----------------------------------------------------------------- */

        persistState() {
            try {
                localStorage.setItem(
                    this.options
                        .storageKey,
                    JSON.stringify(
                        {
                            version:
                                VERSION,

                            completed:
                                true,

                            savedAt:
                                Date.now()
                        }
                    )
                );
            } catch {
                /*
                 * Ignore storage restrictions.
                 */
            }
        }

        /* --------------------------------------------------------------------
         * RESET
         * ----------------------------------------------------------------- */

        reset() {
            this.loadedCount =
                0;

            this.failedCount =
                0;

            this.completedCount =
                0;

            this.progress =
                0;

            this.running =
                false;

            this.completed =
                false;

            this.hidden =
                false;

            this.timedOut =
                false;

            this.startedAt =
                null;

            this.completedAt =
                null;

            this.assets =
                [];

            if (
                this.root
            ) {
                this.root.hidden =
                    false;

                this.root.removeAttribute(
                    "aria-hidden"
                );

                this.root.dataset.preloaderState =
                    "ready";

                this.root.classList.remove(
                    "preloader-hidden",
                    "preloader-hiding",
                    "is-hidden"
                );

                this.root.style.display =
                    "";

                this.root.style.pointerEvents =
                    "auto";

                this.root.classList.add(
                    "preloader-visible"
                );
            }

            document.body?.classList.add(
                "preloader-active"
            );

            this.updateProgress(
                0
            );
        }

        /* --------------------------------------------------------------------
         * STATE
         * ----------------------------------------------------------------- */

        getState() {
            const duration =
                this.startedAt !== null
                    ? (
                          this.completedAt ||
                          performance.now()
                      ) -
                      this.startedAt
                    : 0;

            return {
                version:
                    VERSION,

                initialized:
                    this.initialized,

                running:
                    this.running,

                completed:
                    this.completed,

                hidden:
                    this.hidden,

                timedOut:
                    this.timedOut,

                progress:
                    Math.round(
                        this.progress
                    ),

                loaded:
                    this.loadedCount,

                failed:
                    this.failedCount,

                completedAssets:
                    this.completedCount,

                total:
                    this.totalCount,

                duration,

                assets:
                    this.assets.map(
                        (asset) =>
                            asset.getState()
                    )
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
                this.minimumTimer
            ) {
                window.clearTimeout(
                    this.minimumTimer
                );
            }

            if (
                this.maximumTimer
            ) {
                window.clearTimeout(
                    this.maximumTimer
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

            this.running =
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
                    new BirthdayPreloaderManager(
                        options
                    );
            }

            return manager.init(
                options
            );
        },

        start() {
            if (!manager) {
                manager =
                    new BirthdayPreloaderManager();

                manager.init();
            }

            return manager.start();
        },

        getManager() {
            if (!manager) {
                manager =
                    new BirthdayPreloaderManager();

                manager.init();
            }

            return manager;
        },

        show() {
            return this.getManager()
                .show();
        },

        hide() {
            return this.getManager()
                .hide();
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
            if (manager) {
                manager.destroy();
            }

            manager =
                null;
        }
    };

    /* ------------------------------------------------------------------------
     * GLOBAL EXPORTS
     * --------------------------------------------------------------------- */

    window.PreloadAsset =
        PreloadAsset;

    window.BirthdayPreloaderManager =
        BirthdayPreloaderManager;

    window.SehrishPreloader =
        api;

    window.SehrishBirthdayPreloader =
        api;

    /* ------------------------------------------------------------------------
     * AUTO BOOT
     * --------------------------------------------------------------------- */

    const boot = () => {
        try {
            /*
             * IMPORTANT:
             * app.js is the single owner of the visual application loader.
             *
             * Older versions of this module automatically called
             * `manager.start()` here. That created a second boot path:
             * preloader.js and app.js both tried to control the same startup
             * experience. The result could leave the visible loader in an
             * inconsistent state.
             *
             * We therefore initialize the preloader API only. Standalone
             * preloading remains available through SehrishPreloader.start(),
             * while the main birthday application controls its own loader.
             */
            api.init();

            /*
             * Optional standalone mode:
             *
             * Add `data-preloader-auto-start="true"` to the preloader root
             * only when this module is intentionally being used as the
             * standalone boot controller.
             */
            const root = document.querySelector(
                SELECTORS.root
            );

            if (
                root?.dataset.preloaderAutoStart ===
                "true"
            ) {
                window.setTimeout(
                    () => {
                        if (
                            manager &&
                            !manager.running &&
                            !manager.completed
                        ) {
                            void manager.start();
                        }
                    },
                    0
                );
            }
        } catch (error) {
            console.error(
                "[SehrishPreloader] " +
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
                once: true
            }
        );
    } else {
        boot();
    }

    /* ------------------------------------------------------------------------
     * CROSS-MODULE READY EVENTS
     * --------------------------------------------------------------------- */

    window.addEventListener(
        "sehrish:app:ready",
        () => {
            if (
                manager &&
                !manager.completed
            ) {
                /*
                 * If standalone preloading is running, finish it normally.
                 * If it was only initialized as an integration module, there
                 * is no second loading cycle to wait for.
                 */
                if (manager.running) {
                    void manager.finish(
                        "app-ready"
                    );
                } else {
                    manager.completed =
                        true;

                    manager.progress =
                        100;

                    manager.updateProgress(
                        100
                    );

                    manager.hidden =
                        true;

                    manager.root?.classList.add(
                        "is-hidden",
                        "preloader-hidden"
                    );

                    manager.root?.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                    if (manager.root) {
                        manager.root.style.pointerEvents =
                            "none";

                        manager.root.style.display =
                            "none";
                    }

                    document.body?.classList.remove(
                        "preloader-active"
                    );

                    document.body?.classList.add(
                        "preloader-has-loaded"
                    );

                    dispatch(
                        EVENTS.hidden,
                        {
                            manager:
                                manager
                        }
                    );
                }
            }
        }
    );

    console.info(
        `[SehrishPreloader] ` +
        `Preloader module v${VERSION} loaded.`
    );
})();

/* ============================================================================
 * LOADER OWNERSHIP NOTE
 * ----------------------------------------------------------------------------
 * The birthday application has one authoritative visual loader controller:
 * LoaderManager inside app.js. This preloader remains compatible with that
 * controller and can still be used as a standalone asset preparation API.
 *
 * Compatibility guarantees:
 * - Existing SehrishPreloader API names remain unchanged.
 * - Existing preloader events remain unchanged.
 * - The app-loader element is now recognized when no data-preloader wrapper
 *   exists.
 * - The app.js `is-hidden` class is synchronized with preloader classes.
 * - Maximum-timeout completion uses the existing finish() lifecycle method.
 * - Automatic standalone start is opt-in instead of competing with app.js.
 * ========================================================================== */
