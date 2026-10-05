/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/scenes.js
 * Version: 1.0.0
 *
 * Production-ready scene registry and lifecycle controller.
 *
 * Responsibilities:
 * - Register and normalize birthday website scenes
 * - Store scene metadata
 * - Manage scene lifecycle
 * - Track entered / completed scenes
 * - Handle optional scene requirements
 * - Coordinate scene enter / leave hooks
 * - Provide scene-level locking
 * - Provide scene-level completion API
 * - Persist scene completion state
 * - Dispatch application-wide scene events
 * - Integrate safely with SehrishNavigation
 *
 * This file does NOT replace navigation.js.
 * navigation.js decides which scene is active.
 * scenes.js manages what each scene means and its lifecycle/state.
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * MODULE CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const STORAGE_KEY =
        "sehrish-birthday-scenes-v1";

    const SELECTORS = Object.freeze({
        scene:
            "[data-scene]",

        completion:
            "[data-scene-complete]",

        requirement:
            "[data-scene-requirement]",

        progress:
            "[data-scene-progress], " +
            "[data-scenes-progress]",

        state:
            "[data-overall-scene-state], " +
            "[data-scenes-state], " +
            ".scene-state-display"
    });

    const EVENTS = Object.freeze({
        ready:
            "sehrish:scenes:ready",

        registered:
            "sehrish:scene:registered",

        entered:
            "sehrish:scene:entered",

        left:
            "sehrish:scene:left",

        completed:
            "sehrish:scene:completed",

        reopened:
            "sehrish:scene:reopened",

        locked:
            "sehrish:scene:locked",

        unlocked:
            "sehrish:scene:unlocked",

        stateChanged:
            "sehrish:scene:state-changed"
    });

    /* ------------------------------------------------------------------------
     * UTILITY FUNCTIONS
     * --------------------------------------------------------------------- */

    const normalizeId = (value) => {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .trim()
            .replace(/^#/, "")
            .replace(/\s+/g, "-")
            .toLowerCase();
    };

    const parseBoolean = (
        value,
        fallback = false
    ) => {
        if (
            value === null ||
            value === undefined
        ) {
            return fallback;
        }

        if (
            typeof value === "boolean"
        ) {
            return value;
        }

        const normalized =
            String(value)
                .trim()
                .toLowerCase();

        if (
            normalized === "true" ||
            normalized === "1" ||
            normalized === "yes" ||
            normalized === "on"
        ) {
            return true;
        }

        if (
            normalized === "false" ||
            normalized === "0" ||
            normalized === "no" ||
            normalized === "off"
        ) {
            return false;
        }

        return fallback;
    };

    const parseNumber = (
        value,
        fallback = 0
    ) => {
        const number =
            Number(value);

        return Number.isFinite(
            number
        )
            ? number
            : fallback;
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
        } catch (error) {
            console.warn(
                "[SehrishScenes] " +
                "Event dispatch failed.",
                error
            );
        }
    };

    /* ------------------------------------------------------------------------
     * SCENE RECORD
     * --------------------------------------------------------------------- */

    class BirthdayScene {
        constructor(
            element,
            index
        ) {
            this.element =
                element;

            this.index =
                index;

            this.id =
                normalizeId(
                    element.dataset.scene ||
                    element.id ||
                    `scene-${index + 1}`
                );

            this.title =
                element.dataset.sceneTitle ||
                element.getAttribute(
                    "aria-label"
                ) ||
                this.id;

            this.description =
                element.dataset.sceneDescription ||
                "";

            this.type =
                element.dataset.sceneType ||
                "content";

            this.order =
                parseNumber(
                    element.dataset.sceneOrder,
                    index
                );

            this.optional =
                parseBoolean(
                    element.dataset.sceneOptional,
                    false
                );

            this.autoComplete =
                parseBoolean(
                    element.dataset.sceneAutoComplete,
                    false
                );

            this.persistCompletion =
                !parseBoolean(
                    element.dataset
                        .sceneNoPersist,
                    false
                );

            this.entered =
                false;

            this.completed =
                false;

            this.locked =
                false;

            this.enterCount =
                0;

            this.leaveCount =
                0;

            this.lastEnteredAt =
                null;

            this.lastLeftAt =
                null;

            this.completedAt =
                null;

            this.requirements =
                this.parseRequirements();

            this.metadata =
                this.parseMetadata();
        }

        parseRequirements() {
            const raw =
                this.element.dataset
                    .sceneRequirements;

            if (!raw) {
                return [];
            }

            return raw
                .split(",")
                .map(
                    (item) =>
                        normalizeId(item)
                )
                .filter(Boolean);
        }

        parseMetadata() {
            return {
                id:
                    this.id,

                title:
                    this.title,

                description:
                    this.description,

                type:
                    this.type,

                order:
                    this.order,

                optional:
                    this.optional,

                autoComplete:
                    this.autoComplete
            };
        }

        canEnter(
            manager
        ) {
            if (this.locked) {
                return false;
            }

            if (
                !this.requirements.length
            ) {
                return true;
            }

            return this.requirements.every(
                (requiredId) => {
                    const requiredScene =
                        manager.get(
                            requiredId
                        );

                    return (
                        requiredScene &&
                        requiredScene.completed
                    );
                }
            );
        }

        markEntered() {
            this.entered = true;
            this.enterCount += 1;
            this.lastEnteredAt =
                Date.now();

            this.element.dataset.sceneState =
                "entered";

            this.element.classList.add(
                "scene-has-been-entered"
            );
        }

        markLeft() {
            this.leaveCount += 1;
            this.lastLeftAt =
                Date.now();

            if (
                this.completed
            ) {
                this.element.dataset.sceneState =
                    "completed";
            } else {
                this.element.dataset.sceneState =
                    "visited";
            }
        }

        markCompleted() {
            this.completed = true;
            this.completedAt =
                Date.now();

            this.element.dataset.sceneCompleted =
                "true";

            this.element.dataset.sceneState =
                "completed";

            this.element.classList.add(
                "scene-completed"
            );
        }

        reopen() {
            this.completed = false;
            this.completedAt = null;

            this.element.dataset.sceneCompleted =
                "false";

            this.element.dataset.sceneState =
                this.entered
                    ? "entered"
                    : "unvisited";

            this.element.classList.remove(
                "scene-completed"
            );
        }

        lock() {
            this.locked = true;

            this.element.dataset.sceneLocked =
                "true";

            this.element.classList.add(
                "scene-locked"
            );
        }

        unlock() {
            this.locked = false;

            this.element.dataset.sceneLocked =
                "false";

            this.element.classList.remove(
                "scene-locked"
            );
        }

        toJSON() {
            return {
                id:
                    this.id,

                title:
                    this.title,

                description:
                    this.description,

                type:
                    this.type,

                index:
                    this.index,

                order:
                    this.order,

                optional:
                    this.optional,

                entered:
                    this.entered,

                completed:
                    this.completed,

                locked:
                    this.locked,

                enterCount:
                    this.enterCount,

                leaveCount:
                    this.leaveCount,

                lastEnteredAt:
                    this.lastEnteredAt,

                lastLeftAt:
                    this.lastLeftAt,

                completedAt:
                    this.completedAt
            };
        }
    }

    /* ------------------------------------------------------------------------
     * SCENE MANAGER
     * --------------------------------------------------------------------- */

    class BirthdayScenesManager {
        constructor(
            options = {}
        ) {
            this.options = {
                persist:
                    true,

                storageKey:
                    STORAGE_KEY,

                autoDiscover:
                    true,

                ...options
            };

            this.scenes = [];
            this.sceneMap =
                new Map();

            this.currentSceneId =
                null;

            this.previousSceneId =
                null;

            this.initialized =
                false;

            this.destroyed =
                false;

            this.listeners = [];

            this.bound =
                false;

            this.state = {
                entered: [],
                completed: [],
                currentScene: null
            };
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

            if (
                this.options
                    .autoDiscover
            ) {
                this.discover();
            }

            this.loadState();

            this.restoreSceneState();

            this.bindEvents();

            this.initialized =
                true;

            this.updateUI();

            dispatch(
                EVENTS.ready,
                {
                    manager:
                        this,

                    total:
                        this.scenes.length
                }
            );

            return this;
        }

        /* --------------------------------------------------------------------
         * DISCOVER SCENES
         * ----------------------------------------------------------------- */

        discover() {
            this.scenes = [];
            this.sceneMap.clear();

            const elements =
                document.querySelectorAll(
                    SELECTORS.scene
                );

            elements.forEach(
                (element) => {
                    const scene =
                        new BirthdayScene(
                            element,
                            this.scenes.length
                        );

                    if (
                        !scene.id
                    ) {
                        return;
                    }

                    if (
                        this.sceneMap.has(
                            scene.id
                        )
                    ) {
                        console.warn(
                            `[SehrishScenes] ` +
                            `Duplicate scene "${scene.id}" ignored.`
                        );

                        return;
                    }

                    this.scenes.push(
                        scene
                    );

                    this.sceneMap.set(
                        scene.id,
                        scene
                    );

                    dispatch(
                        EVENTS.registered,
                        {
                            manager:
                                this,

                            scene
                        }
                    );
                }
            );

            this.scenes.sort(
                (
                    first,
                    second
                ) => {
                    if (
                        first.order !==
                        second.order
                    ) {
                        return (
                            first.order -
                            second.order
                        );
                    }

                    return (
                        first.index -
                        second.index
                    );
                }
            );

            this.scenes.forEach(
                (
                    scene,
                    index
                ) => {
                    scene.index =
                        index;

                    scene.element.dataset.sceneIndex =
                        String(
                            index
                        );
                }
            );

            return this.scenes;
        }

        /* --------------------------------------------------------------------
         * EVENT BINDING
         * ----------------------------------------------------------------- */

        bindEvents() {
            if (
                this.bound
            ) {
                return;
            }

            this.addListener(
                document,
                "click",
                (event) =>
                    this.handleCompletionClick(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:navigation:change",
                (event) =>
                    this.handleNavigationChange(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:scene:enter",
                (event) =>
                    this.handleExternalEnter(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:scene:leave",
                (event) =>
                    this.handleExternalLeave(
                        event
                    )
            );

            this.bound =
                true;
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
         * NAVIGATION INTEGRATION
         * ----------------------------------------------------------------- */

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

            let targetId =
                null;

            if (
                typeof toScene ===
                "string"
            ) {
                targetId =
                    normalizeId(
                        toScene
                    );
            } else if (
                toScene?.id
            ) {
                targetId =
                    normalizeId(
                        toScene.id
                    );
            }

            if (
                targetId
            ) {
                const scene =
                    this.get(
                        targetId
                    );

                if (scene) {
                    if (
                        !this.canEnter(
                            targetId
                        )
                    ) {
                        dispatch(
                            EVENTS.locked,
                            {
                                manager:
                                    this,

                                scene,

                                reason:
                                    "requirements"
                            }
                        );

                        return;
                    }

                    this.enter(
                        targetId,
                        {
                            source:
                                "navigation"
                        }
                    );
                }
            }

            let previousId =
                null;

            if (
                typeof fromScene ===
                "string"
            ) {
                previousId =
                    normalizeId(
                        fromScene
                    );
            } else if (
                fromScene?.id
            ) {
                previousId =
                    normalizeId(
                        fromScene.id
                    );
            }

            if (
                previousId &&
                previousId !==
                    targetId
            ) {
                this.leave(
                    previousId,
                    {
                        source:
                            "navigation"
                    }
                );
            }
        }

        handleExternalEnter(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const scene =
                detail.scene;

            const id =
                normalizeId(
                    typeof scene ===
                        "string"
                        ? scene
                        : scene?.id
                );

            if (id) {
                this.enter(
                    id,
                    {
                        source:
                            "external-event"
                    }
                );
            }
        }

        handleExternalLeave(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const scene =
                detail.scene;

            const id =
                normalizeId(
                    typeof scene ===
                        "string"
                        ? scene
                        : scene?.id
                );

            if (id) {
                this.leave(
                    id,
                    {
                        source:
                            "external-event"
                    }
                );
            }
        }

        /* --------------------------------------------------------------------
         * COMPLETION BUTTONS
         * ----------------------------------------------------------------- */

        handleCompletionClick(
            event
        ) {
            if (
                !(
                    event.target instanceof
                    Element
                )
            ) {
                return;
            }

            const button =
                event.target.closest(
                    SELECTORS.completion
                );

            if (!button) {
                return;
            }

            const rawId =
                button.dataset.sceneComplete;

            const id =
                normalizeId(
                    rawId ||
                    this.getCurrentSceneId()
                );

            if (!id) {
                return;
            }

            event.preventDefault();

            this.complete(
                id,
                {
                    source:
                        "completion-control"
                }
            );
        }

        /* --------------------------------------------------------------------
         * ENTER SCENE
         * ----------------------------------------------------------------- */

        enter(
            sceneId,
            options = {}
        ) {
            const scene =
                this.get(
                    sceneId
                );

            if (!scene) {
                return false;
            }

            if (
                !this.canEnter(
                    scene.id
                )
            ) {
                dispatch(
                    EVENTS.locked,
                    {
                        manager:
                            this,

                        scene,

                        reason:
                            "requirements"
                    }
                );

                return false;
            }

            if (
                this.currentSceneId ===
                scene.id
            ) {
                return true;
            }

            const previous =
                this.currentSceneId
                    ? this.get(
                          this.currentSceneId
                      )
                    : null;

            this.previousSceneId =
                this.currentSceneId;

            this.currentSceneId =
                scene.id;

            this.state.currentScene =
                scene.id;

            scene.markEntered();

            this.addUnique(
                this.state.entered,
                scene.id
            );

            this.updateSceneClasses(
                scene
            );

            if (
                scene.autoComplete
            ) {
                this.complete(
                    scene.id,
                    {
                        source:
                            "auto-complete"
                    }
                );
            }

            dispatch(
                EVENTS.entered,
                {
                    manager:
                        this,

                    scene,

                    previous,

                    source:
                        options.source ||
                        "api"
                }
            );

            dispatch(
                EVENTS.stateChanged,
                {
                    manager:
                        this,

                    scene,

                    reason:
                        "entered"
                }
            );

            this.persistState();
            this.updateUI();

            return true;
        }

        /* --------------------------------------------------------------------
         * LEAVE SCENE
         * ----------------------------------------------------------------- */

        leave(
            sceneId,
            options = {}
        ) {
            const scene =
                this.get(
                    sceneId
                );

            if (!scene) {
                return false;
            }

            scene.markLeft();

            this.updateSceneClasses(
                scene
            );

            dispatch(
                EVENTS.left,
                {
                    manager:
                        this,

                    scene,

                    next:
                        this.currentSceneId,

                    source:
                        options.source ||
                        "api"
                }
            );

            dispatch(
                EVENTS.stateChanged,
                {
                    manager:
                        this,

                    scene,

                    reason:
                        "left"
                }
            );

            this.persistState();

            return true;
        }

        /* --------------------------------------------------------------------
         * COMPLETE SCENE
         * ----------------------------------------------------------------- */

        complete(
            sceneId,
            options = {}
        ) {
            const scene =
                this.get(
                    sceneId
                );

            if (!scene) {
                return false;
            }

            if (
                scene.locked
            ) {
                return false;
            }

            if (
                scene.completed
            ) {
                return true;
            }

            if (
                !scene.entered &&
                !scene.optional
            ) {
                scene.markEntered();

                this.addUnique(
                    this.state.entered,
                    scene.id
                );
            }

            scene.markCompleted();

            this.addUnique(
                this.state.completed,
                scene.id
            );

            this.updateSceneClasses(
                scene
            );

            dispatch(
                EVENTS.completed,
                {
                    manager:
                        this,

                    scene,

                    source:
                        options.source ||
                        "api"
                }
            );

            dispatch(
                EVENTS.stateChanged,
                {
                    manager:
                        this,

                    scene,

                    reason:
                        "completed"
                }
            );

            this.persistState();
            this.updateUI();

            return true;
        }

        /* --------------------------------------------------------------------
         * REOPEN SCENE
         * ----------------------------------------------------------------- */

        reopen(
            sceneId
        ) {
            const scene =
                this.get(
                    sceneId
                );

            if (!scene) {
                return false;
            }

            scene.reopen();

            this.state.completed =
                this.state.completed.filter(
                    (id) =>
                        id !== scene.id
                );

            dispatch(
                EVENTS.reopened,
                {
                    manager:
                        this,

                    scene
                }
            );

            dispatch(
                EVENTS.stateChanged,
                {
                    manager:
                        this,

                    scene,

                    reason:
                        "reopened"
                }
            );

            this.persistState();
            this.updateUI();

            return true;
        }

        /* --------------------------------------------------------------------
         * LOCK / UNLOCK
         * ----------------------------------------------------------------- */

        lock(
            sceneId
        ) {
            const scene =
                this.get(
                    sceneId
                );

            if (!scene) {
                return false;
            }

            scene.lock();

            dispatch(
                EVENTS.locked,
                {
                    manager:
                        this,

                    scene,

                    reason:
                        "manual"
                }
            );

            this.updateUI();

            return true;
        }

        unlock(
            sceneId
        ) {
            const scene =
                this.get(
                    sceneId
                );

            if (!scene) {
                return false;
            }

            scene.unlock();

            dispatch(
                EVENTS.unlocked,
                {
                    manager:
                        this,

                    scene,

                    reason:
                        "manual"
                }
            );

            this.updateUI();

            return true;
        }

        /* --------------------------------------------------------------------
         * REQUIREMENT CHECKING
         * ----------------------------------------------------------------- */

        canEnter(
            sceneId
        ) {
            const scene =
                this.get(
                    sceneId
                );

            if (!scene) {
                return false;
            }

            return scene.canEnter(
                this
            );
        }

        getMissingRequirements(
            sceneId
        ) {
            const scene =
                this.get(
                    sceneId
                );

            if (!scene) {
                return [];
            }

            return scene.requirements.filter(
                (requiredId) => {
                    const required =
                        this.get(
                            requiredId
                        );

                    return (
                        !required ||
                        !required.completed
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * SCENE CLASS MANAGEMENT
         * ----------------------------------------------------------------- */

        updateSceneClasses(
            scene
        ) {
            if (
                !scene?.element
            ) {
                return;
            }

            scene.element.classList.toggle(
                "scene-current",
                scene.id ===
                    this.currentSceneId
            );

            scene.element.classList.toggle(
                "scene-completed",
                scene.completed
            );

            scene.element.classList.toggle(
                "scene-visited",
                scene.entered
            );

            scene.element.classList.toggle(
                "scene-locked",
                scene.locked
            );

            scene.element.dataset.sceneState =
                scene.completed
                    ? "completed"
                    : scene.entered
                      ? "visited"
                      : "unvisited";
        }

        updateAllSceneClasses() {
            this.scenes.forEach(
                (scene) => {
                    this.updateSceneClasses(
                        scene
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * UI
         * ----------------------------------------------------------------- */

        updateUI() {
            this.updateAllSceneClasses();

            const total =
                this.getRequiredSceneCount();

            const completed =
                this.getCompletedRequiredCount();

            const percentage =
                total > 0
                    ? Math.round(
                          (completed /
                              total) *
                              100
                      )
                    : 0;

            document
                .querySelectorAll(
                    SELECTORS.progress
                )
                .forEach(
                    (element) => {
                        if (
                            element instanceof
                            HTMLProgressElement
                        ) {
                            element.max =
                                total;

                            element.value =
                                completed;
                        } else {
                            element.style.setProperty(
                                "--scene-completion",
                                `${percentage}%`
                            );

                            element.dataset.progress =
                                String(
                                    percentage
                                );

                            element.setAttribute(
                                "aria-valuemin",
                                "0"
                            );

                            element.setAttribute(
                                "aria-valuemax",
                                "100"
                            );

                            element.setAttribute(
                                "aria-valuenow",
                                String(
                                    percentage
                                )
                            );
                        }
                    }
                );

            document
                .querySelectorAll(
                    SELECTORS.state
                )
                .forEach(
                    (element) => {
                        element.textContent =
                            this.getOverallState();
                    }
                );
        }

        /* --------------------------------------------------------------------
         * STATE HELPERS
         * ----------------------------------------------------------------- */

        getOverallState() {
            const total =
                this.getRequiredSceneCount();

            const completed =
                this.getCompletedRequiredCount();

            if (
                total === 0
            ) {
                return "not-started";
            }

            if (
                completed === 0
            ) {
                return "started";
            }

            if (
                completed >= total
            ) {
                return "completed";
            }

            return "in-progress";
        }

        getRequiredSceneCount() {
            return this.scenes.filter(
                (scene) =>
                    !scene.optional
            ).length;
        }

        getCompletedRequiredCount() {
            return this.scenes.filter(
                (scene) =>
                    !scene.optional &&
                    scene.completed
            ).length;
        }

        getCompletedCount() {
            return this.scenes.filter(
                (scene) =>
                    scene.completed
            ).length;
        }

        getEnteredCount() {
            return this.scenes.filter(
                (scene) =>
                    scene.entered
            ).length;
        }

        getCompletionPercent() {
            const total =
                this.getRequiredSceneCount();

            if (
                total === 0
            ) {
                return 0;
            }

            return Math.round(
                (this.getCompletedRequiredCount() /
                    total) *
                    100
            );
        }

        /* --------------------------------------------------------------------
         * LOOKUPS
         * ----------------------------------------------------------------- */

        get(
            sceneId
        ) {
            return (
                this.sceneMap.get(
                    normalizeId(
                        sceneId
                    )
                ) ||
                null
            );
        }

        has(
            sceneId
        ) {
            return Boolean(
                this.get(
                    sceneId
                )
            );
        }

        getCurrentScene() {
            return this.get(
                this.currentSceneId
            );
        }

        getCurrentSceneId() {
            return (
                this.currentSceneId ||
                null
            );
        }

        getPreviousScene() {
            return this.get(
                this.previousSceneId
            );
        }

        getAll() {
            return [
                ...this.scenes
            ];
        }

        /* --------------------------------------------------------------------
         * PERSISTENCE
         * ----------------------------------------------------------------- */

        persistState() {
            if (
                !this.options
                    .persist
            ) {
                return;
            }

            try {
                const payload = {
                    version:
                        VERSION,

                    currentScene:
                        this.currentSceneId,

                    entered:
                        [
                            ...this.state
                                .entered
                        ],

                    completed:
                        [
                            ...this.state
                                .completed
                        ]
                };

                localStorage.setItem(
                    this.options
                        .storageKey,
                    JSON.stringify(
                        payload
                    )
                );
            } catch {
                /*
                 * Storage might be unavailable
                 * because of browser privacy
                 * restrictions.
                 */
            }
        }

        loadState() {
            if (
                !this.options
                    .persist
            ) {
                return;
            }

            try {
                const raw =
                    localStorage.getItem(
                        this.options
                            .storageKey
                    );

                if (!raw) {
                    return;
                }

                const parsed =
                    JSON.parse(
                        raw
                    );

                if (
                    !parsed ||
                    typeof parsed !==
                        "object"
                ) {
                    return;
                }

                this.state = {
                    currentScene:
                        typeof parsed.currentScene ===
                        "string"
                            ? parsed.currentScene
                            : null,

                    entered:
                        Array.isArray(
                            parsed.entered
                        )
                            ? parsed.entered
                            : [],

                    completed:
                        Array.isArray(
                            parsed.completed
                        )
                            ? parsed.completed
                            : []
                };
            } catch {
                this.state = {
                    currentScene:
                        null,

                    entered: [],

                    completed: []
                };
            }
        }

        restoreSceneState() {
            this.scenes.forEach(
                (scene) => {
                    if (
                        this.state.entered.includes(
                            scene.id
                        )
                    ) {
                        scene.entered =
                            true;

                        scene.enterCount =
                            1;
                    }

                    if (
                        this.state.completed.includes(
                            scene.id
                        )
                    ) {
                        scene.completed =
                            true;

                        scene.completedAt =
                            Date.now();
                    }

                    this.updateSceneClasses(
                        scene
                    );
                }
            );

            if (
                this.state.currentScene &&
                this.has(
                    this.state.currentScene
                )
            ) {
                this.currentSceneId =
                    this.state.currentScene;
            }
        }

        resetProgress() {
            this.state = {
                currentScene:
                    null,

                entered: [],

                completed: []
            };

            this.currentSceneId =
                null;

            this.previousSceneId =
                null;

            this.scenes.forEach(
                (scene) => {
                    scene.entered =
                        false;

                    scene.completed =
                        false;

                    scene.locked =
                        false;

                    scene.enterCount =
                        0;

                    scene.leaveCount =
                        0;

                    scene.lastEnteredAt =
                        null;

                    scene.lastLeftAt =
                        null;

                    scene.completedAt =
                        null;

                    scene.element.classList.remove(
                        "scene-current",
                        "scene-completed",
                        "scene-visited",
                        "scene-locked"
                    );

                    scene.element.dataset.sceneState =
                        "unvisited";

                    scene.element.dataset.sceneCompleted =
                        "false";

                    scene.element.dataset.sceneLocked =
                        "false";
                }
            );

            if (
                this.options
                    .persist
            ) {
                try {
                    localStorage.removeItem(
                        this.options
                            .storageKey
                    );
                } catch {
                    /*
                     * Ignore storage failures.
                     */
                }
            }

            this.updateUI();

            dispatch(
                EVENTS.stateChanged,
                {
                    manager:
                        this,

                    reason:
                        "reset"
                }
            );
        }

        /* --------------------------------------------------------------------
         * UNIQUE ARRAY HELPER
         * ----------------------------------------------------------------- */

        addUnique(
            array,
            value
        ) {
            if (
                !array.includes(
                    value
                )
            ) {
                array.push(
                    value
                );
            }
        }

        /* --------------------------------------------------------------------
         * STATE SNAPSHOT
         * ----------------------------------------------------------------- */

        getState() {
            return {
                version:
                    VERSION,

                initialized:
                    this.initialized,

                currentScene:
                    this.currentSceneId,

                previousScene:
                    this.previousSceneId,

                totalScenes:
                    this.scenes.length,

                enteredCount:
                    this.getEnteredCount(),

                completedCount:
                    this.getCompletedCount(),

                requiredScenes:
                    this.getRequiredSceneCount(),

                completedRequired:
                    this.getCompletedRequiredCount(),

                completionPercent:
                    this.getCompletionPercent(),

                overallState:
                    this.getOverallState(),

                enteredScenes:
                    [
                        ...this.state
                            .entered
                    ],

                completedScenes:
                    [
                        ...this.state
                            .completed
                    ]
            };
        }

        /* --------------------------------------------------------------------
         * REFRESH
         * ----------------------------------------------------------------- */

        refresh() {
            const currentId =
                this.currentSceneId;

            this.discover();
            this.restoreSceneState();

            if (
                currentId &&
                this.has(
                    currentId
                )
            ) {
                this.currentSceneId =
                    currentId;
            }

            this.updateUI();

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

            this.listeners = [];

            this.scenes.forEach(
                (scene) => {
                    scene.element.classList.remove(
                        "scene-current",
                        "scene-completed",
                        "scene-visited",
                        "scene-locked",
                        "scene-has-been-entered"
                    );
                }
            );

            this.scenes = [];
            this.sceneMap.clear();

            this.currentSceneId =
                null;

            this.previousSceneId =
                null;

            this.initialized =
                false;

            this.bound =
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
                    new BirthdayScenesManager(
                        options
                    );
            }

            return manager.init(
                options
            );
        },

        getManager() {
            if (!manager) {
                manager =
                    new BirthdayScenesManager();

                manager.init();
            }

            return manager;
        },

        get(
            sceneId
        ) {
            return this.getManager().get(
                sceneId
            );
        },

        has(
            sceneId
        ) {
            return this.getManager().has(
                sceneId
            );
        },

        getAll() {
            return this.getManager()
                .getAll();
        },

        getCurrentScene() {
            return this.getManager()
                .getCurrentScene();
        },

        getCurrentSceneId() {
            return this.getManager()
                .getCurrentSceneId();
        },

        getPreviousScene() {
            return this.getManager()
                .getPreviousScene();
        },

        enter(
            sceneId,
            options = {}
        ) {
            return this.getManager()
                .enter(
                    sceneId,
                    options
                );
        },

        leave(
            sceneId,
            options = {}
        ) {
            return this.getManager()
                .leave(
                    sceneId,
                    options
                );
        },

        complete(
            sceneId,
            options = {}
        ) {
            return this.getManager()
                .complete(
                    sceneId,
                    options
                );
        },

        reopen(
            sceneId
        ) {
            return this.getManager()
                .reopen(
                    sceneId
                );
        },

        lock(
            sceneId
        ) {
            return this.getManager()
                .lock(
                    sceneId
                );
        },

        unlock(
            sceneId
        ) {
            return this.getManager()
                .unlock(
                    sceneId
                );
        },

        canEnter(
            sceneId
        ) {
            return this.getManager()
                .canEnter(
                    sceneId
                );
        },

        getMissingRequirements(
            sceneId
        ) {
            return this.getManager()
                .getMissingRequirements(
                    sceneId
                );
        },

        getCompletionPercent() {
            return this.getManager()
                .getCompletionPercent();
        },

        getOverallState() {
            return this.getManager()
                .getOverallState();
        },

        getState() {
            return this.getManager()
                .getState();
        },

        resetProgress() {
            return this.getManager()
                .resetProgress();
        },

        refresh() {
            return this.getManager()
                .refresh();
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

    window.BirthdayScene =
        BirthdayScene;

    window.BirthdayScenesManager =
        BirthdayScenesManager;

    window.SehrishScenes =
        api;

    window.SehrishBirthdayScenes =
        api;

    /* ------------------------------------------------------------------------
     * AUTOMATIC BOOT
     * --------------------------------------------------------------------- */

    const boot = () => {
        if (
            document.querySelector(
                SELECTORS.scene
            )
        ) {
            api.init();
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

    console.info(
        `[SehrishScenes] ` +
        `Scene module v${VERSION} loaded.`
    );
})();