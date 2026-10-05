/**
 * Sehrish Birthday Website
 * ------------------------------------------------------------
 * File: js/init.js
 * Version: 1.0.0
 *
 * Purpose:
 * - Application bootstrap and startup orchestration
 * - Safe initialization of all birthday website modules
 * - Dependency-aware startup
 * - Initial scene selection and synchronization
 * - Preloader coordination
 * - Global lifecycle events
 * - Runtime error isolation
 * - Graceful degradation when optional modules are unavailable
 * - Debug and diagnostic APIs
 *
 * Expected global modules:
 *   SehrishStorage
 *   SehrishState
 *   SehrishTheme
 *   SehrishResponsive
 *   SehrishPerformance
 *   SehrishAccessibility
 *   SehrishNotifications
 *   SehrishEffects
 *   SehrishParticles
 *   SehrishNavigation
 *   SehrishScenes
 *   SehrishCelebration
 *   SehrishPreloader
 *
 * This file intentionally does not own business logic.
 * It orchestrates existing modules.
 *
 * @author Sehrish Birthday Website
 * @version 1.0.0
 */

(() => {
    'use strict';

    /**
     * ------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------
     */

    const APP_NAME = 'Sehrish Birthday Website';
    const APP_VERSION = '1.0.0';

    const SELECTORS = Object.freeze({
        app: '#app',
        preloader: '#preloader',
        scenes: '[data-scene]',
        initialScene: '[data-initial-scene="true"]'
    });

    const EVENTS = Object.freeze({
        READY: 'sehrish:app-ready',
        INIT_START: 'sehrish:init-start',
        INIT_PROGRESS: 'sehrish:init-progress',
        INIT_COMPLETE: 'sehrish:init-complete',
        INIT_ERROR: 'sehrish:init-error',
        APP_VISIBLE: 'sehrish:app-visible',
        APP_HIDDEN: 'sehrish:app-hidden',
        BEFORE_UNLOAD: 'sehrish:before-unload'
    });

    const TIMINGS = Object.freeze({
        DOM_READY_TIMEOUT: 10000,
        MODULE_WAIT_TIMEOUT: 5000,
        STARTUP_RETRY_DELAY: 80,
        INITIAL_REVEAL_DELAY: 80,
        POST_READY_DELAY: 120
    });

    const MODULE_DEFINITIONS = Object.freeze([
        {
            key: 'storage',
            global: 'SehrishStorage',
            required: false,
            label: 'Storage'
        },
        {
            key: 'state',
            global: 'SehrishState',
            required: false,
            label: 'State'
        },
        {
            key: 'theme',
            global: 'SehrishTheme',
            required: false,
            label: 'Theme'
        },
        {
            key: 'responsive',
            global: 'SehrishResponsive',
            required: false,
            label: 'Responsive'
        },
        {
            key: 'performance',
            global: 'SehrishPerformance',
            required: false,
            label: 'Performance'
        },
        {
            key: 'accessibility',
            global: 'SehrishAccessibility',
            required: false,
            label: 'Accessibility'
        },
        {
            key: 'notifications',
            global: 'SehrishNotifications',
            required: false,
            label: 'Notifications'
        },
        {
            key: 'effects',
            global: 'SehrishEffects',
            required: false,
            label: 'Effects'
        },
        {
            key: 'particles',
            global: 'SehrishParticles',
            required: false,
            label: 'Particles'
        },
        {
            key: 'scenes',
            global: 'SehrishScenes',
            required: false,
            label: 'Scenes'
        },
        {
            key: 'navigation',
            global: 'SehrishNavigation',
            required: false,
            label: 'Navigation'
        },
        {
            key: 'celebration',
            global: 'SehrishCelebration',
            required: false,
            label: 'Celebration'
        },
        {
            key: 'preloader',
            global: 'SehrishPreloader',
            required: false,
            label: 'Preloader'
        }
    ]);

    /**
     * ------------------------------------------------------------
     * Runtime state
     * ------------------------------------------------------------
     */

    const runtime = {
        started: false,
        ready: false,
        failed: false,
        initializing: false,
        destroyed: false,

        startTime: null,
        readyTime: null,

        progress: 0,

        initializedModules: [],
        missingModules: [],
        failedModules: [],

        initialScene: null,

        errors: [],

        listenersBound: false,

        startupPromise: null
    };

    /**
     * ------------------------------------------------------------
     * Utility helpers
     * ------------------------------------------------------------
     */

    const isObject = (value) => (
        value !== null &&
        typeof value === 'object'
    );

    const safeNumber = (value, fallback = 0) => {
        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    };

    const clamp = (value, min = 0, max = 1) => {
        return Math.min(
            max,
            Math.max(
                min,
                safeNumber(value, min)
            )
        );
    };

    const delay = (ms) => {
        return new Promise((resolve) => {
            window.setTimeout(resolve, ms);
        });
    };

    const now = () => {
        return Date.now();
    };

    const dispatch = (eventName, detail = {}) => {
        try {
            window.dispatchEvent(
                new CustomEvent(eventName, {
                    detail: {
                        timestamp: now(),
                        ...detail
                    }
                })
            );
        } catch (error) {
            console.warn(
                `[${APP_NAME}] Event dispatch failed:`,
                eventName,
                error
            );
        }
    };

    const reportError = (
        source,
        error,
        fatal = false
    ) => {
        const normalizedError = error instanceof Error
            ? error
            : new Error(String(error));

        const record = {
            source,
            message: normalizedError.message,
            name: normalizedError.name,
            stack: normalizedError.stack || null,
            fatal,
            timestamp: now()
        };

        runtime.errors.push(record);

        if (fatal) {
            runtime.failed = true;
        }

        dispatch(EVENTS.INIT_ERROR, record);

        console.error(
            `[${APP_NAME}] ${fatal ? 'Fatal' : 'Non-fatal'} initialization error in ${source}:`,
            normalizedError
        );

        return record;
    };

    const getElement = (selector) => {
        try {
            return document.querySelector(selector);
        } catch (error) {
            reportError(
                'getElement',
                error,
                false
            );

            return null;
        }
    };

    const getElements = (selector) => {
        try {
            return Array.from(
                document.querySelectorAll(selector)
            );
        } catch (error) {
            reportError(
                'getElements',
                error,
                false
            );

            return [];
        }
    };

    const getGlobal = (globalName) => {
        try {
            return window[globalName] || null;
        } catch (error) {
            reportError(
                `getGlobal:${globalName}`,
                error,
                false
            );

            return null;
        }
    };

    const hasMethod = (
        object,
        methodName
    ) => {
        return Boolean(
            object &&
            typeof object[methodName] === 'function'
        );
    };

    const waitForGlobal = async (
        globalName,
        timeout = TIMINGS.MODULE_WAIT_TIMEOUT
    ) => {
        const startedAt = now();

        while ((now() - startedAt) < timeout) {
            const module = getGlobal(globalName);

            if (module) {
                return module;
            }

            await delay(
                TIMINGS.STARTUP_RETRY_DELAY
            );
        }

        return null;
    };

    /**
     * ------------------------------------------------------------
     * App DOM setup
     * ------------------------------------------------------------
     */

    const prepareAppDOM = () => {
        const app = getElement(
            SELECTORS.app
        );

        if (!app) {
            reportError(
                'prepareAppDOM',
                new Error(
                    `Required app root "${SELECTORS.app}" was not found.`
                ),
                true
            );

            return null;
        }

        app.setAttribute(
            'data-app-name',
            APP_NAME
        );

        app.setAttribute(
            'data-app-version',
            APP_VERSION
        );

        app.setAttribute(
            'data-app-status',
            'initializing'
        );

        app.classList.add(
            'app-initializing'
        );

        document.documentElement.classList.add(
            'birthday-app-readying'
        );

        return app;
    };

    /**
     * ------------------------------------------------------------
     * Progress handling
     * ------------------------------------------------------------
     */

    const updateProgress = (
        progress,
        currentModule = null
    ) => {
        runtime.progress = clamp(
            progress,
            0,
            1
        );

        dispatch(EVENTS.INIT_PROGRESS, {
            progress: runtime.progress,
            percentage: Math.round(
                runtime.progress * 100
            ),
            module: currentModule
        });

        const preloader = getGlobal(
            'SehrishPreloader'
        );

        try {
            if (
                preloader &&
                hasMethod(preloader, 'setProgress')
            ) {
                preloader.setProgress(
                    runtime.progress,
                    currentModule
                );

                return;
            }

            if (
                preloader &&
                hasMethod(preloader, 'updateProgress')
            ) {
                preloader.updateProgress(
                    runtime.progress,
                    currentModule
                );
            }
        } catch (error) {
            reportError(
                'updateProgress',
                error,
                false
            );
        }
    };

    /**
     * ------------------------------------------------------------
     * Module initialization
     * ------------------------------------------------------------
     */

    const initializeModule = async (
        definition
    ) => {
        const {
            key,
            global,
            required,
            label
        } = definition;

        const module = await waitForGlobal(
            global
        );

        if (!module) {
            runtime.missingModules.push({
                key,
                global,
                label,
                required
            });

            if (required) {
                reportError(
                    `module:${key}`,
                    new Error(
                        `Required module "${global}" is unavailable.`
                    ),
                    true
                );
            }

            return {
                key,
                module: null,
                status: 'missing'
            };
        }

        try {
            if (
                hasMethod(module, 'init')
            ) {
                await Promise.resolve(
                    module.init()
                );
            } else if (
                hasMethod(module, 'initialize')
            ) {
                await Promise.resolve(
                    module.initialize()
                );
            }

            runtime.initializedModules.push(
                key
            );

            return {
                key,
                module,
                status: 'initialized'
            };
        } catch (error) {
            runtime.failedModules.push({
                key,
                global,
                label
            });

            reportError(
                `module:${key}`,
                error,
                required
            );

            return {
                key,
                module,
                status: 'failed'
            };
        }
    };

    const initializeCoreModules = async () => {
        const total = MODULE_DEFINITIONS.length;

        let completed = 0;

        for (const definition of MODULE_DEFINITIONS) {
            const result = await initializeModule(
                definition
            );

            completed += 1;

            updateProgress(
                completed / total,
                definition.label
            );

            if (
                result.status === 'failed' &&
                definition.required
            ) {
                return false;
            }
        }

        return true;
    };

    /**
     * ------------------------------------------------------------
     * Runtime synchronization
     * ------------------------------------------------------------
     */

    const synchronizeState = () => {
        const state = getGlobal(
            'SehrishState'
        );

        if (!state) {
            return;
        }

        try {
            if (hasMethod(state, 'initialize')) {
                state.initialize();
            }

            if (hasMethod(state, 'load')) {
                state.load();
            }

            if (hasMethod(state, 'set')) {
                state.set(
                    'app.status',
                    'ready'
                );
            }

            if (hasMethod(state, 'setMany')) {
                state.setMany({
                    'app.name': APP_NAME,
                    'app.version': APP_VERSION,
                    'app.startedAt': runtime.startTime
                });
            }
        } catch (error) {
            reportError(
                'synchronizeState',
                error,
                false
            );
        }
    };

    const synchronizeTheme = () => {
        const theme = getGlobal(
            'SehrishTheme'
        );

        if (!theme) {
            return;
        }

        try {
            if (hasMethod(theme, 'apply')) {
                theme.apply();
            }

            if (hasMethod(theme, 'sync')) {
                theme.sync();
            }

            if (hasMethod(theme, 'refresh')) {
                theme.refresh();
            }
        } catch (error) {
            reportError(
                'synchronizeTheme',
                error,
                false
            );
        }
    };

    const synchronizeResponsive = () => {
        const responsive = getGlobal(
            'SehrishResponsive'
        );

        if (!responsive) {
            return;
        }

        try {
            if (
                hasMethod(
                    responsive,
                    'update'
                )
            ) {
                responsive.update();
            }

            if (
                hasMethod(
                    responsive,
                    'refresh'
                )
            ) {
                responsive.refresh();
            }
        } catch (error) {
            reportError(
                'synchronizeResponsive',
                error,
                false
            );
        }
    };

    const synchronizePerformance = () => {
        const performanceManager = getGlobal(
            'SehrishPerformance'
        );

        if (!performanceManager) {
            return;
        }

        try {
            if (
                hasMethod(
                    performanceManager,
                    'refresh'
                )
            ) {
                performanceManager.refresh();
            }

            if (
                hasMethod(
                    performanceManager,
                    'evaluate'
                )
            ) {
                performanceManager.evaluate();
            }
        } catch (error) {
            reportError(
                'synchronizePerformance',
                error,
                false
            );
        }
    };

    /**
     * ------------------------------------------------------------
     * Scene detection
     * ------------------------------------------------------------
     */

    const resolveInitialScene = () => {
        const navigation = getGlobal(
            'SehrishNavigation'
        );

        const sceneManager = getGlobal(
            'SehrishScenes'
        );

        let scene = null;

        try {
            if (
                navigation &&
                hasMethod(
                    navigation,
                    'getCurrentScene'
                )
            ) {
                scene =
                    navigation.getCurrentScene();
            }
        } catch (error) {
            reportError(
                'resolveInitialScene:navigation',
                error,
                false
            );
        }

        if (!scene) {
            try {
                if (
                    sceneManager &&
                    hasMethod(
                        sceneManager,
                        'getInitialScene'
                    )
                ) {
                    scene =
                        sceneManager.getInitialScene();
                }
            } catch (error) {
                reportError(
                    'resolveInitialScene:sceneManager',
                    error,
                    false
                );
            }
        }

        if (!scene) {
            const explicitScene = getElement(
                SELECTORS.initialScene
            );

            if (explicitScene) {
                scene =
                    explicitScene.getAttribute(
                        'data-scene'
                    );
            }
        }

        if (!scene) {
            const scenes = getElements(
                SELECTORS.scenes
            );

            if (scenes.length > 0) {
                scene =
                    scenes[0].getAttribute(
                        'data-scene'
                    );
            }
        }

        runtime.initialScene =
            scene || null;

        return runtime.initialScene;
    };

    const activateInitialScene = async () => {
        const navigation = getGlobal(
            'SehrishNavigation'
        );

        const sceneManager = getGlobal(
            'SehrishScenes'
        );

        const scene = resolveInitialScene();

        if (!scene) {
            return;
        }

        try {
            if (
                navigation &&
                hasMethod(
                    navigation,
                    'goTo'
                )
            ) {
                await Promise.resolve(
                    navigation.goTo(
                        scene,
                        {
                            replaceHistory: true,
                            silent: true
                        }
                    )
                );

                return;
            }

            if (
                navigation &&
                hasMethod(
                    navigation,
                    'navigateTo'
                )
            ) {
                await Promise.resolve(
                    navigation.navigateTo(
                        scene,
                        {
                            replaceHistory: true,
                            silent: true
                        }
                    )
                );

                return;
            }

            if (
                sceneManager &&
                hasMethod(
                    sceneManager,
                    'enter'
                )
            ) {
                await Promise.resolve(
                    sceneManager.enter(
                        scene
                    )
                );
            }
        } catch (error) {
            reportError(
                'activateInitialScene',
                error,
                false
            );
        }
    };

    /**
     * ------------------------------------------------------------
     * Visual startup
     * ------------------------------------------------------------
     */

    const revealApplication = async () => {
        const app = getElement(
            SELECTORS.app
        );

        if (!app) {
            return;
        }

        await delay(
            TIMINGS.INITIAL_REVEAL_DELAY
        );

        app.classList.remove(
            'app-initializing'
        );

        app.classList.add(
            'app-ready'
        );

        app.setAttribute(
            'data-app-status',
            'ready'
        );

        document.documentElement.classList.remove(
            'birthday-app-readying'
        );

        document.documentElement.classList.add(
            'birthday-app-ready'
        );

        dispatch(
            EVENTS.APP_VISIBLE
        );
    };

    /**
     * ------------------------------------------------------------
     * Preloader coordination
     * ------------------------------------------------------------
     */

    const finishPreloader = async () => {
        const preloader = getGlobal(
            'SehrishPreloader'
        );

        if (!preloader) {
            return;
        }

        try {
            if (
                hasMethod(
                    preloader,
                    'complete'
                )
            ) {
                await Promise.resolve(
                    preloader.complete()
                );

                return;
            }

            if (
                hasMethod(
                    preloader,
                    'hide'
                )
            ) {
                await Promise.resolve(
                    preloader.hide()
                );

                return;
            }

            if (
                hasMethod(
                    preloader,
                    'finish'
                )
            ) {
                await Promise.resolve(
                    preloader.finish()
                );
            }
        } catch (error) {
            reportError(
                'finishPreloader',
                error,
                false
            );
        }
    };

    /**
     * ------------------------------------------------------------
     * Global lifecycle listeners
     * ------------------------------------------------------------
     */

    const handleVisibilityChange = () => {
        const hidden =
            document.visibilityState === 'hidden';

        const performanceManager =
            getGlobal(
                'SehrishPerformance'
            );

        const particles =
            getGlobal(
                'SehrishParticles'
            );

        try {
            if (hidden) {
                dispatch(
                    EVENTS.APP_HIDDEN
                );

                if (
                    performanceManager &&
                    hasMethod(
                        performanceManager,
                        'pause'
                    )
                ) {
                    performanceManager.pause();
                }

                if (
                    particles &&
                    hasMethod(
                        particles,
                        'pause'
                    )
                ) {
                    particles.pause();
                }

                return;
            }

            dispatch(
                EVENTS.APP_VISIBLE
            );

            if (
                performanceManager &&
                hasMethod(
                    performanceManager,
                    'resume'
                )
            ) {
                performanceManager.resume();
            }

            if (
                particles &&
                hasMethod(
                    particles,
                    'resume'
                )
            ) {
                particles.resume();
            }
        } catch (error) {
            reportError(
                'handleVisibilityChange',
                error,
                false
            );
        }
    };

    const handleBeforeUnload = () => {
        dispatch(
            EVENTS.BEFORE_UNLOAD
        );

        const state = getGlobal(
            'SehrishState'
        );

        try {
            if (
                state &&
                hasMethod(
                    state,
                    'persist'
                )
            ) {
                state.persist();
            }

            if (
                state &&
                hasMethod(
                    state,
                    'save'
                )
            ) {
                state.save();
            }
        } catch (error) {
            reportError(
                'handleBeforeUnload',
                error,
                false
            );
        }
    };

    const bindLifecycleEvents = () => {
        if (runtime.listenersBound) {
            return;
        }

        document.addEventListener(
            'visibilitychange',
            handleVisibilityChange,
            {
                passive: true
            }
        );

        window.addEventListener(
            'beforeunload',
            handleBeforeUnload,
            {
                passive: true
            }
        );

        runtime.listenersBound = true;
    };

    /**
     * ------------------------------------------------------------
     * Public readiness hooks
     * ------------------------------------------------------------
     */

    const announceReady = () => {
        runtime.ready = true;
        runtime.readyTime = now();

        const app = getElement(
            SELECTORS.app
        );

        if (app) {
            app.setAttribute(
                'data-app-ready',
                'true'
            );
        }

        dispatch(
            EVENTS.READY,
            {
                appName: APP_NAME,
                version: APP_VERSION,
                initialScene:
                    runtime.initialScene,
                initializedModules: [
                    ...runtime.initializedModules
                ],
                missingModules: [
                    ...runtime.missingModules
                ],
                failedModules: [
                    ...runtime.failedModules
                ],
                startupDuration:
                    runtime.readyTime -
                    runtime.startTime
            }
        );

        dispatch(
            EVENTS.INIT_COMPLETE,
            {
                success: !runtime.failed
            }
        );

        try {
            window.dispatchEvent(
                new Event(
                    'SehrishAppReady'
                )
            );
        } catch (error) {
            reportError(
                'announceReady',
                error,
                false
            );
        }
    };

    /**
     * ------------------------------------------------------------
     * Diagnostics
     * ------------------------------------------------------------
     */

    const getStatus = () => {
        return {
            name: APP_NAME,
            version: APP_VERSION,

            started:
                runtime.started,

            ready:
                runtime.ready,

            failed:
                runtime.failed,

            initializing:
                runtime.initializing,

            destroyed:
                runtime.destroyed,

            progress:
                runtime.progress,

            initialScene:
                runtime.initialScene,

            startTime:
                runtime.startTime,

            readyTime:
                runtime.readyTime,

            startupDuration:
                runtime.readyTime &&
                runtime.startTime
                    ? runtime.readyTime -
                      runtime.startTime
                    : null,

            initializedModules: [
                ...runtime.initializedModules
            ],

            missingModules: [
                ...runtime.missingModules
            ],

            failedModules: [
                ...runtime.failedModules
            ],

            errors: [
                ...runtime.errors
            ]
        };
    };

    /**
     * ------------------------------------------------------------
     * Main bootstrap
     * ------------------------------------------------------------
     */

    const initialize = async () => {
        if (runtime.ready) {
            return getStatus();
        }

        if (runtime.initializing) {
            return runtime.startupPromise;
        }

        runtime.initializing = true;
        runtime.started = true;
        runtime.failed = false;
        runtime.destroyed = false;
        runtime.startTime = now();

        dispatch(
            EVENTS.INIT_START,
            {
                appName: APP_NAME,
                version: APP_VERSION
            }
        );

        runtime.startupPromise = (
            async () => {
                try {
                    prepareAppDOM();

                    bindLifecycleEvents();

                    updateProgress(
                        0,
                        'Preparing application'
                    );

                    await delay(20);

                    const modulesReady =
                        await initializeCoreModules();

                    if (!modulesReady) {
                        runtime.failed = true;

                        const app =
                            getElement(
                                SELECTORS.app
                            );

                        if (app) {
                            app.setAttribute(
                                'data-app-status',
                                'error'
                            );

                            app.classList.add(
                                'app-error'
                            );
                        }

                        await finishPreloader();

                        return getStatus();
                    }

                    updateProgress(
                        0.92,
                        'Synchronizing application'
                    );

                    synchronizeState();
                    synchronizeTheme();
                    synchronizeResponsive();
                    synchronizePerformance();

                    await activateInitialScene();

                    updateProgress(
                        0.97,
                        'Starting visual experience'
                    );

                    await revealApplication();

                    updateProgress(
                        1,
                        'Ready'
                    );

                    await finishPreloader();

                    await delay(
                        TIMINGS.POST_READY_DELAY
                    );

                    announceReady();

                    return getStatus();
                } catch (error) {
                    reportError(
                        'initialize',
                        error,
                        true
                    );

                    await finishPreloader();

                    const app =
                        getElement(
                            SELECTORS.app
                        );

                    if (app) {
                        app.setAttribute(
                            'data-app-status',
                            'error'
                        );

                        app.classList.add(
                            'app-error'
                        );
                    }

                    return getStatus();
                } finally {
                    runtime.initializing =
                        false;
                }
            }
        )();

        return runtime.startupPromise;
    };

    /**
     * ------------------------------------------------------------
     * Destroy / cleanup
     * ------------------------------------------------------------
     */

    const destroy = () => {
        if (runtime.destroyed) {
            return;
        }

        try {
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            );

            window.removeEventListener(
                'beforeunload',
                handleBeforeUnload
            );
        } catch (error) {
            reportError(
                'destroy',
                error,
                false
            );
        }

        runtime.listenersBound = false;
        runtime.destroyed = true;
        runtime.initializing = false;
    };

    /**
     * ------------------------------------------------------------
     * Public API
     * ------------------------------------------------------------
     */

    const API = Object.freeze({
        init: initialize,
        initialize,
        destroy,

        getStatus,

        getVersion: () => APP_VERSION,

        getName: () => APP_NAME,

        isReady: () => runtime.ready,

        isFailed: () => runtime.failed,

        getProgress: () => runtime.progress,

        getInitialScene: () =>
            runtime.initialScene,

        getInitializedModules: () => [
            ...runtime.initializedModules
        ],

        getMissingModules: () => [
            ...runtime.missingModules
        ],

        getFailedModules: () => [
            ...runtime.failedModules
        ],

        getErrors: () => [
            ...runtime.errors
        ],

        events: EVENTS
    });

    /**
     * ------------------------------------------------------------
     * Global exports
     * ------------------------------------------------------------
     */

    window.SehrishInit = API;
    window.SehrishApp = API;
    window.SehrishBirthdayApp = API;

    /**
     * ------------------------------------------------------------
     * Automatic startup
     * ------------------------------------------------------------
     */

    const startWhenReady = () => {
        initialize().catch((error) => {
            reportError(
                'automatic-startup',
                error,
                true
            );
        });
    };

    if (
        document.readyState === 'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            startWhenReady,
            {
                once: true,
                passive: true
            }
        );
    } else {
        startWhenReady();
    }

    /**
     * ------------------------------------------------------------
     * Global safety handlers
     * ------------------------------------------------------------
     */

    window.addEventListener(
        'error',
        (event) => {
            if (!event.error) {
                return;
            }

            reportError(
                'window.error',
                event.error,
                false
            );
        }
    );

    window.addEventListener(
        'unhandledrejection',
        (event) => {
            const reason =
                event.reason instanceof Error
                    ? event.reason
                    : new Error(
                        String(
                            event.reason ||
                            'Unhandled promise rejection.'
                        )
                    );

            reportError(
                'window.unhandledrejection',
                reason,
                false
            );
        }
    );

})();