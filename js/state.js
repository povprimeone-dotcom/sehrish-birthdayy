/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/state.js
 * Version: 1.0.0
 *
 * Production-ready centralized application state manager.
 *
 * Responsibilities:
 * - Central application state
 * - Scene state
 * - Quiz state
 * - Gifts state
 * - Cake state
 * - Letter state
 * - Celebration state
 * - UI state
 * - Session state
 * - State subscriptions
 * - Persistence through SehrishStorage
 * - Cross-module synchronization
 * - State snapshots
 * - Reset support
 *
 * This module does NOT replace feature modules.
 * It provides a shared state layer for the complete experience.
 *
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const STORAGE_KEY =
        "application-state";

    const EVENTS = Object.freeze({
        ready:
            "sehrish:state:ready",

        changed:
            "sehrish:state:changed",

        sceneChanged:
            "sehrish:state:scene-changed",

        quizChanged:
            "sehrish:state:quiz-changed",

        giftsChanged:
            "sehrish:state:gifts-changed",

        cakeChanged:
            "sehrish:state:cake-changed",

        letterChanged:
            "sehrish:state:letter-changed",

        celebrationChanged:
            "sehrish:state:celebration-changed",

        reset:
            "sehrish:state:reset"
    });

    const DEFAULT_STATE = Object.freeze({
        version:
            VERSION,

        app: {
            initialized:
                false,

            ready:
                false,

            started:
                false,

            lastUpdatedAt:
                null
        },

        scene: {
            current:
                null,

            previous:
                null,

            index:
                -1,

            total:
                0,

            visited:
                [],

            highestIndex:
                -1
        },

        quiz: {
            currentQuestion:
                0,

            totalQuestions:
                0,

            score:
                0,

            attempts:
                0,

            correct:
                0,

            wrong:
                0,

            completed:
                false
        },

        gifts: {
            total:
                0,

            opened:
                0,

            completed:
                false
        },

        cake: {
            started:
                false,

            candlesLit:
                0,

            totalCandles:
                0,

            blown:
                false,

            completed:
                false
        },

        letter: {
            currentPage:
                0,

            totalPages:
                0,

            progress:
                0,

            started:
                false,

            completed:
                false
        },

        celebration: {
            started:
                false,

            quiz:
                false,

            gifts:
                false,

            cake:
                false,

            letter:
                false,

            finalStarted:
                false,

            completed:
                false,

            progress:
                0
        },

        ui: {
            loading:
                true,

            modalOpen:
                false,

            activeModal:
                null,

            menuOpen:
                false,

            muted:
                false,

            reducedMotion:
                false
        },

        session: {
            startedAt:
                null,

            lastActivityAt:
                null,

            interactionCount:
                0
        }
    });

    /* ------------------------------------------------------------------------
     * UTILITY FUNCTIONS
     * --------------------------------------------------------------------- */

    const isObject = (
        value
    ) => {
        return (
            value !== null &&
            typeof value ===
                "object" &&
            !Array.isArray(
                value
            )
        );
    };

    const deepClone = (
        value
    ) => {
        if (
            typeof structuredClone ===
            "function"
        ) {
            try {
                return structuredClone(
                    value
                );
            } catch {
                /* Fall through. */
            }
        }

        try {
            return JSON.parse(
                JSON.stringify(
                    value
                )
            );
        } catch {
            return value;
        }
    };

    const mergeDeep = (
        target,
        source
    ) => {
        if (
            !isObject(
                target
            ) ||
            !isObject(
                source
            )
        ) {
            return deepClone(
                source
            );
        }

        const result =
            deepClone(
                target
            );

        Object.entries(
            source
        ).forEach(
            (
                [
                    key,
                    value
                ]
            ) => {
                if (
                    isObject(
                        value
                    ) &&
                    isObject(
                        result[key]
                    )
                ) {
                    result[key] =
                        mergeDeep(
                            result[key],
                            value
                        );
                } else {
                    result[key] =
                        deepClone(
                            value
                        );
                }
            }
        );

        return result;
    };

    const now = () => {
        return Date.now();
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
            /* Ignore event dispatch errors. */
        }
    };

    /* ------------------------------------------------------------------------
     * STATE MANAGER
     * --------------------------------------------------------------------- */

    class BirthdayStateManager {
        constructor(
            options = {}
        ) {
            this.options = {
                persist:
                    true,

                storageKey:
                    STORAGE_KEY,

                emitEvents:
                    true,

                ...options
            };

            this.state =
                deepClone(
                    DEFAULT_STATE
                );

            this.initialized =
                false;

            this.destroyed =
                false;

            this.listeners =
                [];

            this.subscribers =
                new Set();

            this.updateDepth =
                0;

            this.pendingChanges =
                [];

            this.lastChange =
                null;
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

            this.load();

            this.detectInitialEnvironment();

            this.bindEvents();

            this.state.app.initialized =
                true;

            this.state.app.ready =
                true;

            if (
                !this.state.session
                    .startedAt
            ) {
                this.state.session
                    .startedAt =
                    now();
            }

            this.state.session
                .lastActivityAt =
                now();

            this.touch();

            this.initialized =
                true;

            this.persist();

            this.emit(
                EVENTS.ready,
                {
                    state:
                        this.getState()
                }
            );

            return this;
        }

        /* --------------------------------------------------------------------
         * INITIAL ENVIRONMENT
         * ----------------------------------------------------------------- */

        detectInitialEnvironment() {
            try {
                this.state.ui
                    .reducedMotion =
                    window
                        .matchMedia(
                            "(prefers-reduced-motion: reduce)"
                        )
                        .matches;
            } catch {
                this.state.ui
                    .reducedMotion =
                    false;
            }
        }

        /* --------------------------------------------------------------------
         * EVENT BINDING
         * ----------------------------------------------------------------- */

        bindEvents() {
            this.addListener(
                window,
                "sehrish:navigation:change",
                (
                    event
                ) =>
                    this.handleNavigationChange(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:navigation:ready",
                (
                    event
                ) =>
                    this.handleNavigationReady(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:quiz:progress",
                (
                    event
                ) =>
                    this.handleQuizProgress(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:quiz:completed",
                (
                    event
                ) =>
                    this.handleQuizCompleted(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:gifts:progress",
                (
                    event
                ) =>
                    this.handleGiftsProgress(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:gifts:all-opened",
                (
                    event
                ) =>
                    this.handleGiftsCompleted(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:cake:completed",
                (
                    event
                ) =>
                    this.handleCakeCompleted(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:letter:progress",
                (
                    event
                ) =>
                    this.handleLetterProgress(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:letter:completed",
                (
                    event
                ) =>
                    this.handleLetterCompleted(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:preloader:complete",
                () => {
                    this.set(
                        "ui.loading",
                        false,
                        {
                            source:
                                "preloader"
                        }
                    );

                    this.state.app.started =
                        true;

                    this.touch();

                    this.persist();
                }
            );

            this.addListener(
                document,
                "click",
                () => {
                    this.touch();
                }
            );

            this.addListener(
                document,
                "keydown",
                () => {
                    this.touch();
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
         * NAVIGATION EVENTS
         * ----------------------------------------------------------------- */

        handleNavigationReady(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const total =
                Number(
                    detail.total
                );

            if (
                Number.isFinite(
                    total
                )
            ) {
                this.set(
                    "scene.total",
                    total,
                    {
                        source:
                            "navigation"
                    }
                );
            }

            const scene =
                detail.currentScene;

            const id =
                typeof scene ===
                    "string"
                    ? scene
                    : scene?.id;

            if (
                id
            ) {
                this.setScene(
                    id,
                    {
                        index:
                            Number.isInteger(
                                detail.currentIndex
                            )
                                ? detail.currentIndex
                                : 0,

                        source:
                            "navigation"
                    }
                );
            }
        }

        handleNavigationChange(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const toScene =
                detail.toScene;

            const fromScene =
                detail.fromScene;

            const toId =
                typeof toScene ===
                    "string"
                    ? toScene
                    : toScene?.id;

            const fromId =
                typeof fromScene ===
                    "string"
                    ? fromScene
                    : fromScene?.id;

            if (
                toId
            ) {
                this.setScene(
                    toId,
                    {
                        index:
                            Number.isInteger(
                                detail.toIndex
                            )
                                ? detail.toIndex
                                : undefined,

                        previous:
                            fromId ||
                            null,

                        source:
                            "navigation"
                    }
                );
            }
        }

        /* --------------------------------------------------------------------
         * QUIZ EVENTS
         * ----------------------------------------------------------------- */

        handleQuizProgress(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const updates =
                {};

            this.copyNumber(
                updates,
                "quiz.currentQuestion",
                detail.currentQuestion
            );

            this.copyNumber(
                updates,
                "quiz.totalQuestions",
                detail.totalQuestions
            );

            this.copyNumber(
                updates,
                "quiz.score",
                detail.score
            );

            this.copyNumber(
                updates,
                "quiz.attempts",
                detail.attempts
            );

            this.copyNumber(
                updates,
                "quiz.correct",
                detail.correct
            );

            this.copyNumber(
                updates,
                "quiz.wrong",
                detail.wrong
            );

            this.setMany(
                updates,
                {
                    source:
                        "quiz"
                }
            );
        }

        handleQuizCompleted(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const updates = {
                "quiz.completed":
                    true
            };

            this.copyNumber(
                updates,
                "quiz.score",
                detail.score
            );

            this.copyNumber(
                updates,
                "quiz.correct",
                detail.correct
            );

            this.copyNumber(
                updates,
                "quiz.attempts",
                detail.attempts
            );

            this.setMany(
                updates,
                {
                    source:
                        "quiz"
                }
            );
        }

        /* --------------------------------------------------------------------
         * GIFT EVENTS
         * ----------------------------------------------------------------- */

        handleGiftsProgress(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const updates =
                {};

            this.copyNumber(
                updates,
                "gifts.total",
                detail.total
            );

            this.copyNumber(
                updates,
                "gifts.opened",
                detail.opened
            );

            this.setMany(
                updates,
                {
                    source:
                        "gifts"
                }
            );
        }

        handleGiftsCompleted(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const updates = {
                "gifts.completed":
                    true
            };

            this.copyNumber(
                updates,
                "gifts.total",
                detail.total
            );

            this.copyNumber(
                updates,
                "gifts.opened",
                detail.opened
            );

            this.setMany(
                updates,
                {
                    source:
                        "gifts"
                }
            );
        }

        /* --------------------------------------------------------------------
         * CAKE EVENTS
         * ----------------------------------------------------------------- */

        handleCakeCompleted(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const updates = {
                "cake.completed":
                    true,

                "cake.blowing":
                    false
            };

            this.copyNumber(
                updates,
                "cake.candlesLit",
                detail.candlesLit
            );

            this.copyNumber(
                updates,
                "cake.totalCandles",
                detail.totalCandles
            );

            this.setMany(
                updates,
                {
                    source:
                        "cake"
                }
            );
        }

        /* --------------------------------------------------------------------
         * LETTER EVENTS
         * ----------------------------------------------------------------- */

        handleLetterProgress(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const updates =
                {};

            this.copyNumber(
                updates,
                "letter.currentPage",
                detail.currentPage
            );

            this.copyNumber(
                updates,
                "letter.totalPages",
                detail.totalPages
            );

            this.copyNumber(
                updates,
                "letter.progress",
                detail.progress
            );

            this.setMany(
                updates,
                {
                    source:
                        "letter"
                }
            );
        }

        handleLetterCompleted(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const updates = {
                "letter.completed":
                    true
            };

            this.copyNumber(
                updates,
                "letter.currentPage",
                detail.currentPage
            );

            this.copyNumber(
                updates,
                "letter.totalPages",
                detail.totalPages
            );

            updates[
                "letter.progress"
            ] =
                100;

            this.setMany(
                updates,
                {
                    source:
                        "letter"
                }
            );
        }

        /* --------------------------------------------------------------------
         * COPY NUMBER
         * ----------------------------------------------------------------- */

        copyNumber(
            updates,
            path,
            value
        ) {
            if (
                Number.isFinite(
                    Number(value)
                )
            ) {
                updates[path] =
                    Number(value);
            }
        }

        /* --------------------------------------------------------------------
         * SET SINGLE VALUE
         * ----------------------------------------------------------------- */

        set(
            path,
            value,
            options = {}
        ) {
            if (
                this.destroyed
            ) {
                return false;
            }

            const normalizedPath =
                String(
                    path || ""
                ).trim();

            if (
                !normalizedPath
            ) {
                return false;
            }

            const previous =
                this.get(
                    normalizedPath
                );

            if (
                Object.is(
                    previous,
                    value
                )
            ) {
                this.touch();

                return true;
            }

            const changed =
                this.setByPath(
                    normalizedPath,
                    value
                );

            if (!changed) {
                return false;
            }

            this.touch();

            this.recordChange(
                normalizedPath,
                previous,
                value,
                options.source ||
                    "api"
            );

            return true;
        }

        /* --------------------------------------------------------------------
         * SET MANY
         * ----------------------------------------------------------------- */

        setMany(
            updates,
            options = {}
        ) {
            if (
                !isObject(
                    updates
                )
            ) {
                return false;
            }

            this.updateDepth +=
                1;

            let changed =
                false;

            try {
                Object.entries(
                    updates
                ).forEach(
                    (
                        [
                            path,
                            value
                        ]
                    ) => {
                        const previous =
                            this.get(
                                path
                            );

                        if (
                            Object.is(
                                previous,
                                value
                            )
                        ) {
                            return;
                        }

                        if (
                            this.setByPath(
                                path,
                                value
                            )
                        ) {
                            changed =
                                true;

                            this.pendingChanges.push(
                                {
                                    path,

                                    previous,

                                    value,

                                    source:
                                        options.source ||
                                        "api"
                                }
                            );
                        }
                    }
                );
            } finally {
                this.updateDepth -=
                    1;
            }

            if (
                changed
            ) {
                this.touch();

                if (
                    this.updateDepth ===
                    0
                ) {
                    this.flushChanges();
                }
            }

            return changed;
        }

        /* --------------------------------------------------------------------
         * SET BY PATH
         * ----------------------------------------------------------------- */

        setByPath(
            path,
            value
        ) {
            const parts =
                String(
                    path
                )
                    .split(".")
                    .map(
                        (
                            part
                        ) =>
                            part.trim()
                    )
                    .filter(
                        Boolean
                    );

            if (
                !parts.length
            ) {
                return false;
            }

            let target =
                this.state;

            for (
                let index = 0;
                index <
                    parts.length -
                        1;
                index +=
                    1
            ) {
                const part =
                    parts[index];

                if (
                    !isObject(
                        target[part]
                    ) &&
                    !Array.isArray(
                        target[part]
                    )
                ) {
                    target[part] =
                        {};
                }

                target =
                    target[part];
            }

            const finalKey =
                parts[
                    parts.length -
                        1
                ];

            target[finalKey] =
                deepClone(
                    value
                );

            return true;
        }

        /* --------------------------------------------------------------------
         * GET
         * ----------------------------------------------------------------- */

        get(
            path,
            fallback = null
        ) {
            const parts =
                String(
                    path || ""
                )
                    .split(".")
                    .map(
                        (
                            part
                        ) =>
                            part.trim()
                    )
                    .filter(
                        Boolean
                    );

            if (
                !parts.length
            ) {
                return fallback;
            }

            let current =
                this.state;

            for (
                const part of
                    parts
            ) {
                if (
                    current ===
                        null ||
                    current ===
                        undefined ||
                    !(
                        Object.prototype
                            .hasOwnProperty.call(
                                current,
                                part
                            )
                    )
                ) {
                    return fallback;
                }

                current =
                    current[part];
            }

            return current;
        }

        /* --------------------------------------------------------------------
         * SCENE API
         * ----------------------------------------------------------------- */

        setScene(
            sceneId,
            options = {}
        ) {
            const id =
                String(
                    sceneId || ""
                )
                    .replace(
                        /^#/,
                        ""
                    )
                    .trim();

            if (
                !id
            ) {
                return false;
            }

            const previous =
                this.state.scene
                    .current;

            const index =
                Number.isInteger(
                    options.index
                )
                    ? options.index
                    : this.state.scene
                          .index;

            this.state.scene.previous =
                options.previous ??
                previous;

            this.state.scene.current =
                id;

            this.state.scene.index =
                index;

            if (
                index >= 0
            ) {
                this.state.scene
                    .highestIndex =
                    Math.max(
                        this.state.scene
                            .highestIndex,
                        index
                    );
            }

            if (
                !this.state.scene
                    .visited.includes(
                        id
                    )
            ) {
                this.state.scene
                    .visited.push(
                        id
                    );
            }

            this.touch();

            const detail = {
                manager:
                    this,

                current:
                    id,

                previous,

                index,

                source:
                    options.source ||
                    "api"
            };

            this.emit(
                EVENTS.sceneChanged,
                detail
            );

            this.emit(
                EVENTS.changed,
                {
                    ...detail,

                    state:
                        this.getState()
                }
            );

            this.persist();

            return true;
        }

        /* --------------------------------------------------------------------
         * QUIZ API
         * ----------------------------------------------------------------- */

        setQuizState(
            values = {},
            options = {}
        ) {
            return this.setMany(
                this.prefixValues(
                    "quiz",
                    values
                ),
                {
                    source:
                        options.source ||
                        "quiz-api"
                }
            );
        }

        /* --------------------------------------------------------------------
         * GIFTS API
         * ----------------------------------------------------------------- */

        setGiftsState(
            values = {},
            options = {}
        ) {
            return this.setMany(
                this.prefixValues(
                    "gifts",
                    values
                ),
                {
                    source:
                        options.source ||
                        "gifts-api"
                }
            );
        }

        /* --------------------------------------------------------------------
         * CAKE API
         * ----------------------------------------------------------------- */

        setCakeState(
            values = {},
            options = {}
        ) {
            return this.setMany(
                this.prefixValues(
                    "cake",
                    values
                ),
                {
                    source:
                        options.source ||
                        "cake-api"
                }
            );
        }

        /* --------------------------------------------------------------------
         * LETTER API
         * ----------------------------------------------------------------- */

        setLetterState(
            values = {},
            options = {}
        ) {
            return this.setMany(
                this.prefixValues(
                    "letter",
                    values
                ),
                {
                    source:
                        options.source ||
                        "letter-api"
                }
            );
        }

        /* --------------------------------------------------------------------
         * CELEBRATION API
         * ----------------------------------------------------------------- */

        setCelebrationState(
            values = {},
            options = {}
        ) {
            const result =
                this.setMany(
                    this.prefixValues(
                        "celebration",
                        values
                    ),
                    {
                        source:
                            options.source ||
                            "celebration-api"
                    }
                );

            this.recalculateCelebrationProgress();

            return result;
        }

        /* --------------------------------------------------------------------
         * PREFIX VALUES
         * ----------------------------------------------------------------- */

        prefixValues(
            prefix,
            values
        ) {
            if (
                !isObject(
                    values
                )
            ) {
                return {};
            }

            const result =
                {};

            Object.entries(
                values
            ).forEach(
                (
                    [
                        key,
                        value
                    ]
                ) => {
                    result[
                        `${prefix}.${key}`
                    ] =
                        value;
                }
            );

            return result;
        }

        /* --------------------------------------------------------------------
         * CELEBRATION PROGRESS
         * ----------------------------------------------------------------- */

        recalculateCelebrationProgress() {
            const milestones = [
                "quiz",
                "gifts",
                "cake",
                "letter"
            ];

            const completed =
                milestones.filter(
                    (
                        milestone
                    ) =>
                        Boolean(
                            this.state
                                .celebration[
                                milestone
                            ]
                        ) ||
                        Boolean(
                            this.state[
                                milestone
                            ]?.completed
                        )
                ).length;

            const total =
                milestones.length;

            const progress =
                total > 0
                    ? Math.round(
                          (
                              completed /
                              total
                          ) *
                          100
                      )
                    : 0;

            this.state.celebration
                .progress =
                progress;

            if (
                progress >=
                    100 &&
                !this.state
                    .celebration
                    .completed
            ) {
                this.state.celebration
                    .completed =
                    true;
            }

            this.persist();
        }

        /* --------------------------------------------------------------------
         * UI STATE
         * ----------------------------------------------------------------- */

        setLoading(
            loading,
            options = {}
        ) {
            return this.set(
                "ui.loading",
                Boolean(
                    loading
                ),
                {
                    source:
                        options.source ||
                        "ui"
                }
            );
        }

        setMuted(
            muted,
            options = {}
        ) {
            return this.set(
                "ui.muted",
                Boolean(
                    muted
                ),
                {
                    source:
                        options.source ||
                        "audio"
                }
            );
        }

        setModal(
            modalId,
            open,
            options = {}
        ) {
            this.setMany(
                {
                    "ui.modalOpen":
                        Boolean(
                            open
                        ),

                    "ui.activeModal":
                        open
                            ? modalId
                            : null
                },
                {
                    source:
                        options.source ||
                        "modal"
                }
            );

            return true;
        }

        setMenuOpen(
            open,
            options = {}
        ) {
            return this.set(
                "ui.menuOpen",
                Boolean(
                    open
                ),
                {
                    source:
                        options.source ||
                        "menu"
                }
            );
        }

        /* --------------------------------------------------------------------
         * ACTIVITY
         * ----------------------------------------------------------------- */

        touch() {
            this.state.session
                .lastActivityAt =
                now();

            this.state.session
                .interactionCount +=
                1;

            this.state.app
                .lastUpdatedAt =
                now();
        }

        /* --------------------------------------------------------------------
         * CHANGE RECORDING
         * ----------------------------------------------------------------- */

        recordChange(
            path,
            previous,
            value,
            source
        ) {
            this.pendingChanges.push(
                {
                    path,
                    previous,
                    value,
                    source
                }
            );

            if (
                this.updateDepth ===
                0
            ) {
                this.flushChanges();
            }
        }

        /* --------------------------------------------------------------------
         * FLUSH CHANGES
         * ----------------------------------------------------------------- */

        flushChanges() {
            if (
                !this.pendingChanges
                    .length
            ) {
                return;
            }

            const changes =
                [
                    ...this.pendingChanges
                ];

            this.pendingChanges =
                [];

            const grouped =
                this.groupChanges(
                    changes
                );

            this.lastChange =
                {
                    timestamp:
                        now(),

                    changes
                };

            changes.forEach(
                (
                    change
                ) => {
                    this.emitSpecificChange(
                        change
                    );
                }
            );

            this.emit(
                EVENTS.changed,
                {
                    manager:
                        this,

                    changes,

                    grouped,

                    state:
                        this.getState()
                }
            );

            this.persist();
        }

        /* --------------------------------------------------------------------
         * GROUP CHANGES
         * ----------------------------------------------------------------- */

        groupChanges(
            changes
        ) {
            const grouped = {
                scene: [],
                quiz: [],
                gifts: [],
                cake: [],
                letter: [],
                celebration: [],
                ui: [],
                app: [],
                session: [],
                other: []
            };

            changes.forEach(
                (
                    change
                ) => {
                    const root =
                        change.path.split(
                            "."
                        )[0];

                    if (
                        Object.prototype
                            .hasOwnProperty.call(
                                grouped,
                                root
                            )
                    ) {
                        grouped[
                            root
                        ].push(
                            change
                        );
                    } else {
                        grouped.other.push(
                            change
                        );
                    }
                }
            );

            return grouped;
        }

        /* --------------------------------------------------------------------
         * SPECIFIC EVENTS
         * ----------------------------------------------------------------- */

        emitSpecificChange(
            change
        ) {
            const root =
                change.path.split(
                    "."
                )[0];

            switch (
                root
            ) {
                case "scene":
                    this.emit(
                        EVENTS.sceneChanged,
                        {
                            manager:
                                this,

                            change
                        }
                    );
                    break;

                case "quiz":
                    this.emit(
                        EVENTS.quizChanged,
                        {
                            manager:
                                this,

                            change
                        }
                    );
                    break;

                case "gifts":
                    this.emit(
                        EVENTS.giftsChanged,
                        {
                            manager:
                                this,

                            change
                        }
                    );
                    break;

                case "cake":
                    this.emit(
                        EVENTS.cakeChanged,
                        {
                            manager:
                                this,

                            change
                        }
                    );
                    break;

                case "letter":
                    this.emit(
                        EVENTS.letterChanged,
                        {
                            manager:
                                this,

                            change
                        }
                    );
                    break;

                case "celebration":
                    this.emit(
                        EVENTS.celebrationChanged,
                        {
                            manager:
                                this,

                            change
                        }
                    );
                    break;

                default:
                    break;
            }

            this.notifySubscribers(
                change
            );
        }

        /* --------------------------------------------------------------------
         * EVENT EMITTER
         * ----------------------------------------------------------------- */

        emit(
            eventName,
            detail = {}
        ) {
            if (
                !this.options
                    .emitEvents
            ) {
                return;
            }

            dispatch(
                eventName,
                detail
            );
        }

        /* --------------------------------------------------------------------
         * SUBSCRIPTIONS
         * ----------------------------------------------------------------- */

        subscribe(
            callback
        ) {
            if (
                typeof callback !==
                "function"
            ) {
                return () => {};
            }

            this.subscribers.add(
                callback
            );

            return () => {
                this.subscribers.delete(
                    callback
                );
            };
        }

        notifySubscribers(
            change
        ) {
            this.subscribers.forEach(
                (
                    callback
                ) => {
                    try {
                        callback(
                            change,
                            this.getState()
                        );
                    } catch (
                        error
                    ) {
                        console.error(
                            "[SehrishState] " +
                            "Subscriber failed:",
                            error
                        );
                    }
                }
            );
        }

        /* --------------------------------------------------------------------
         * PERSISTENCE
         * ----------------------------------------------------------------- */

        persist() {
            if (
                !this.options
                    .persist
            ) {
                return;
            }

            const storage =
                window.SehrishStorage;

            if (
                storage &&
                typeof storage.setJSON ===
                    "function"
            ) {
                storage.setJSON(
                    this.options
                        .storageKey,
                    this.state
                );

                return;
            }

            try {
                localStorage.setItem(
                    `sehrish-birthday:${this.options.storageKey}`,
                    JSON.stringify(
                        this.state
                    )
                );
            } catch {
                /*
                 * Ignore storage failures.
                 */
            }
        }

        /* --------------------------------------------------------------------
         * LOAD
         * ----------------------------------------------------------------- */

        load() {
            let saved =
                null;

            const storage =
                window.SehrishStorage;

            if (
                storage &&
                typeof storage.getJSON ===
                    "function"
            ) {
                saved =
                    storage.getJSON(
                        this.options
                            .storageKey,
                        null
                    );
            } else {
                try {
                    const raw =
                        localStorage.getItem(
                            `sehrish-birthday:${this.options.storageKey}`
                        );

                    if (
                        raw
                    ) {
                        saved =
                            JSON.parse(
                                raw
                            );
                    }
                } catch {
                    saved =
                        null;
                }
            }

            if (
                isObject(
                    saved
                )
            ) {
                this.state =
                    mergeDeep(
                        DEFAULT_STATE,
                        saved
                    );
            }
        }

        /* --------------------------------------------------------------------
         * SNAPSHOT
         * ----------------------------------------------------------------- */

        snapshot() {
            return deepClone(
                this.state
            );
        }

        /* --------------------------------------------------------------------
         * RESTORE SNAPSHOT
         * ----------------------------------------------------------------- */

        restore(
            snapshot,
            options = {}
        ) {
            if (
                !isObject(
                    snapshot
                )
            ) {
                return false;
            }

            const previous =
                this.snapshot();

            this.state =
                mergeDeep(
                    DEFAULT_STATE,
                    snapshot
                );

            this.touch();

            this.emit(
                EVENTS.changed,
                {
                    manager:
                        this,

                    reason:
                        "restore",

                    previous,

                    current:
                        this.getState(),

                    source:
                        options.source ||
                        "restore"
                }
            );

            this.persist();

            return true;
        }

        /* --------------------------------------------------------------------
         * RESET
         * ----------------------------------------------------------------- */

        reset(
            options = {}
        ) {
            const previous =
                this.snapshot();

            this.state =
                deepClone(
                    DEFAULT_STATE
                );

            this.state.app
                .initialized =
                true;

            this.state.app.ready =
                true;

            this.state.session
                .startedAt =
                now();

            this.state.session
                .lastActivityAt =
                now();

            this.updateEnvironmentState();

            if (
                options.clearStorage !==
                false
            ) {
                const storage =
                    window
                        .SehrishStorage;

                if (
                    storage &&
                    typeof storage.remove ===
                        "function"
                ) {
                    storage.remove(
                        this.options
                            .storageKey
                    );
                } else {
                    try {
                        localStorage.removeItem(
                            `sehrish-birthday:${this.options.storageKey}`
                        );
                    } catch {
                        /*
                         * Ignore storage errors.
                         */
                    }
                }
            }

            this.emit(
                EVENTS.reset,
                {
                    manager:
                        this,

                    previous,

                    current:
                        this.getState()
                }
            );

            this.persist();

            return true;
        }

        /* --------------------------------------------------------------------
         * ENVIRONMENT STATE
         * ----------------------------------------------------------------- */

        updateEnvironmentState() {
            try {
                this.state.ui
                    .reducedMotion =
                    window
                        .matchMedia(
                            "(prefers-reduced-motion: reduce)"
                        )
                        .matches;
            } catch {
                this.state.ui
                    .reducedMotion =
                    false;
            }
        }

        /* --------------------------------------------------------------------
         * COMPLETION HELPERS
         * ----------------------------------------------------------------- */

        isQuizCompleted() {
            return Boolean(
                this.state.quiz
                    .completed
            );
        }

        areGiftsCompleted() {
            return Boolean(
                this.state.gifts
                    .completed
            );
        }

        isCakeCompleted() {
            return Boolean(
                this.state.cake
                    .completed
            );
        }

        isLetterCompleted() {
            return Boolean(
                this.state.letter
                    .completed
            );
        }

        isCelebrationCompleted() {
            return Boolean(
                this.state.celebration
                    .completed
            );
        }

        getOverallProgress() {
            const items = [
                this.isQuizCompleted(),
                this.areGiftsCompleted(),
                this.isCakeCompleted(),
                this.isLetterCompleted()
            ];

            const completed =
                items.filter(
                    Boolean
                ).length;

            return Math.round(
                (
                    completed /
                    items.length
                ) *
                100
            );
        }

        /* --------------------------------------------------------------------
         * STATE VALIDATION
         * ----------------------------------------------------------------- */

        validate() {
            const issues =
                [];

            if (
                !isObject(
                    this.state
                )
            ) {
                issues.push(
                    "Root state is invalid."
                );

                return issues;
            }

            if (
                !isObject(
                    this.state.scene
                )
            ) {
                issues.push(
                    "Scene state is invalid."
                );
            }

            if (
                !isObject(
                    this.state.quiz
                )
            ) {
                issues.push(
                    "Quiz state is invalid."
                );
            }

            if (
                !isObject(
                    this.state.gifts
                )
            ) {
                issues.push(
                    "Gift state is invalid."
                );
            }

            if (
                !isObject(
                    this.state.cake
                )
            ) {
                issues.push(
                    "Cake state is invalid."
                );
            }

            if (
                !isObject(
                    this.state.letter
                )
            ) {
                issues.push(
                    "Letter state is invalid."
                );
            }

            if (
                !Array.isArray(
                    this.state.scene
                        .visited
                )
            ) {
                issues.push(
                    "Visited scene list is invalid."
                );
            }

            return issues;
        }

        /* --------------------------------------------------------------------
         * GET STATE
         * ----------------------------------------------------------------- */

        getState() {
            return this.snapshot();
        }

        /* --------------------------------------------------------------------
         * GET STATE SUMMARY
         * ----------------------------------------------------------------- */

        getSummary() {
            return {
                currentScene:
                    this.state.scene
                        .current,

                sceneProgress:
                    this.state.scene
                        .visited.length,

                quizCompleted:
                    this.isQuizCompleted(),

                giftsCompleted:
                    this.areGiftsCompleted(),

                cakeCompleted:
                    this.isCakeCompleted(),

                letterCompleted:
                    this.isLetterCompleted(),

                celebrationProgress:
                    this.getOverallProgress(),

                celebrationCompleted:
                    this.isCelebrationCompleted(),

                interactionCount:
                    this.state.session
                        .interactionCount
            };
        }

        /* --------------------------------------------------------------------
         * REFRESH
         * ----------------------------------------------------------------- */

        refresh() {
            this.load();

            this.updateEnvironmentState();

            this.recalculateCelebrationProgress();

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

            this.subscribers.clear();

            this.pendingChanges =
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

        init(
            options = {}
        ) {
            if (
                !manager
            ) {
                manager =
                    new BirthdayStateManager(
                        options
                    );
            }

            return manager.init(
                options
            );
        },

        getManager() {
            if (
                !manager
            ) {
                manager =
                    new BirthdayStateManager();

                manager.init();
            }

            return manager;
        },

        get(
            path,
            fallback = null
        ) {
            return this
                .getManager()
                .get(
                    path,
                    fallback
                );
        },

        set(
            path,
            value,
            options = {}
        ) {
            return this
                .getManager()
                .set(
                    path,
                    value,
                    options
                );
        },

        setMany(
            values,
            options = {}
        ) {
            return this
                .getManager()
                .setMany(
                    values,
                    options
                );
        },

        setScene(
            sceneId,
            options = {}
        ) {
            return this
                .getManager()
                .setScene(
                    sceneId,
                    options
                );
        },

        setQuizState(
            values,
            options = {}
        ) {
            return this
                .getManager()
                .setQuizState(
                    values,
                    options
                );
        },

        setGiftsState(
            values,
            options = {}
        ) {
            return this
                .getManager()
                .setGiftsState(
                    values,
                    options
                );
        },

        setCakeState(
            values,
            options = {}
        ) {
            return this
                .getManager()
                .setCakeState(
                    values,
                    options
                );
        },

        setLetterState(
            values,
            options = {}
        ) {
            return this
                .getManager()
                .setLetterState(
                    values,
                    options
                );
        },

        setCelebrationState(
            values,
            options = {}
        ) {
            return this
                .getManager()
                .setCelebrationState(
                    values,
                    options
                );
        },

        setLoading(
            loading,
            options = {}
        ) {
            return this
                .getManager()
                .setLoading(
                    loading,
                    options
                );
        },

        setMuted(
            muted,
            options = {}
        ) {
            return this
                .getManager()
                .setMuted(
                    muted,
                    options
                );
        },

        setModal(
            modalId,
            open,
            options = {}
        ) {
            return this
                .getManager()
                .setModal(
                    modalId,
                    open,
                    options
                );
        },

        setMenuOpen(
            open,
            options = {}
        ) {
            return this
                .getManager()
                .setMenuOpen(
                    open,
                    options
                );
        },

        subscribe(
            callback
        ) {
            return this
                .getManager()
                .subscribe(
                    callback
                );
        },

        snapshot() {
            return this
                .getManager()
                .snapshot();
        },

        restore(
            snapshot,
            options = {}
        ) {
            return this
                .getManager()
                .restore(
                    snapshot,
                    options
                );
        },

        reset(
            options = {}
        ) {
            return this
                .getManager()
                .reset(
                    options
                );
        },

        validate() {
            return this
                .getManager()
                .validate();
        },

        getSummary() {
            return this
                .getManager()
                .getSummary();
        },

        getOverallProgress() {
            return this
                .getManager()
                .getOverallProgress();
        },

        isQuizCompleted() {
            return this
                .getManager()
                .isQuizCompleted();
        },

        areGiftsCompleted() {
            return this
                .getManager()
                .areGiftsCompleted();
        },

        isCakeCompleted() {
            return this
                .getManager()
                .isCakeCompleted();
        },

        isLetterCompleted() {
            return this
                .getManager()
                .isLetterCompleted();
        },

        isCelebrationCompleted() {
            return this
                .getManager()
                .isCelebrationCompleted();
        },

        persist() {
            return this
                .getManager()
                .persist();
        },

        refresh() {
            return this
                .getManager()
                .refresh();
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

    window.BirthdayStateManager =
        BirthdayStateManager;

    window.SehrishState =
        api;

    window.SehrishBirthdayState =
        api;

    /* ------------------------------------------------------------------------
     * AUTO BOOT
     * --------------------------------------------------------------------- */

    const boot = () => {
        try {
            api.init();
        } catch (
            error
        ) {
            console.error(
                "[SehrishState] " +
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

    console.info(
        `[SehrishState] ` +
        `State module v${VERSION} loaded.`
    );
})();