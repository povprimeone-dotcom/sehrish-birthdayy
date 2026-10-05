/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/accessibility.js
 * Version: 1.0.0
 *
 * Production-ready accessibility controller.
 *
 * Responsibilities:
 * - Keyboard accessibility
 * - Focus management
 * - Focus-visible support
 * - ARIA state synchronization
 * - Screen-reader announcements
 * - Skip navigation support
 * - Reduced-motion detection
 * - Modal accessibility integration
 * - Scene accessibility integration
 * - Dynamic DOM accessibility observation
 * - Interactive element normalization
 * - Accessibility state API
 *
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * MODULE CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const SELECTORS = Object.freeze({
        scene:
            "[data-scene]",

        modal:
            "[data-modal]",

        buttonLike:
            "[data-action], " +
            "[data-click], " +
            "[data-interactive], " +
            "[role=\"button\"]",

        navigation:
            "[data-nav], " +
            "[data-nav-target], " +
            "[data-scene-target], " +
            "[data-go-to-scene]",

        skip:
            "[data-skip-to-content]",

        live:
            "[data-live-region]",

        heading:
            "h1, h2, h3, h4, h5, h6"
    });

    const EVENTS = Object.freeze({
        ready:
            "sehrish:accessibility:ready",

        focus:
            "sehrish:accessibility:focus",

        announce:
            "sehrish:accessibility:announce",

        reducedMotion:
            "sehrish:accessibility:reduced-motion",

        stateChange:
            "sehrish:accessibility:state-change"
    });

    const DEFAULTS = Object.freeze({
        enabled: true,

        keyboardNavigation:
            true,

        focusVisible:
            true,

        autoAria:
            true,

        autoTabIndex:
            true,

        liveAnnouncements:
            true,

        skipLink:
            true,

        observeDynamicContent:
            true,

        respectReducedMotion:
            true,

        announcementDuration:
            2500
    });

    /* ------------------------------------------------------------------------
     * UTILITY FUNCTIONS
     * --------------------------------------------------------------------- */

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
            /*
             * CustomEvent is supported in all
             * modern browsers. Ignore unexpected
             * failures so accessibility logic does
             * not break the application.
             */
        }
    };

    const isHTMLElement = (
        value
    ) => {
        return (
            value instanceof
            HTMLElement
        );
    };

    const isVisible = (
        element
    ) => {
        if (
            !isHTMLElement(
                element
            )
        ) {
            return false;
        }

        if (
            element.hidden
        ) {
            return false;
        }

        if (
            element.getAttribute(
                "aria-hidden"
            ) === "true"
        ) {
            return false;
        }

        const style =
            window.getComputedStyle(
                element
            );

        return (
            style.display !==
                "none" &&
            style.visibility !==
                "hidden"
        );
    };

    const isDisabled = (
        element
    ) => {
        if (
            !isHTMLElement(
                element
            )
        ) {
            return true;
        }

        return (
            element.disabled ===
                true ||
            element.hasAttribute(
                "disabled"
            ) ||
            element.getAttribute(
                "aria-disabled"
            ) === "true"
        );
    };

    const isNaturallyInteractive =
        (
            element
        ) => {
            if (
                !isHTMLElement(
                    element
                )
            ) {
                return false;
            }

            const tag =
                element.tagName.toLowerCase();

            return [
                "a",
                "button",
                "input",
                "select",
                "textarea",
                "summary"
            ].includes(
                tag
            );
        };

    /* ------------------------------------------------------------------------
     * ACCESSIBILITY MANAGER
     * --------------------------------------------------------------------- */

    class BirthdayAccessibilityManager {
        constructor(
            options = {}
        ) {
            this.options = {
                ...DEFAULTS,
                ...options
            };

            this.initialized =
                false;

            this.destroyed =
                false;

            this.keyboardMode =
                false;

            this.pointerMode =
                false;

            this.reducedMotion =
                false;

            this.liveRegion =
                null;

            this.skipLink =
                null;

            this.observer =
                null;

            this.listeners = [];

            this.liveTimer =
                null;

            this.lastFocusedElement =
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

            if (
                !this.options.enabled
            ) {
                return this;
            }

            this.detectPreferences();

            this.createLiveRegion();

            if (
                this.options.skipLink
            ) {
                this.createSkipLink();
            }

            this.normalizeDocument();

            this.bindEvents();

            if (
                this.options
                    .observeDynamicContent
            ) {
                this.startObserver();
            }

            this.initialized =
                true;

            dispatch(
                EVENTS.ready,
                {
                    manager:
                        this,

                    reducedMotion:
                        this.reducedMotion
                }
            );

            return this;
        }

        /* --------------------------------------------------------------------
         * PREFERENCE DETECTION
         * ----------------------------------------------------------------- */

        detectPreferences() {
            if (
                this.options
                    .respectReducedMotion
            ) {
                try {
                    this.reducedMotion =
                        window
                            .matchMedia(
                                "(prefers-reduced-motion: reduce)"
                            )
                            .matches;
                } catch {
                    this.reducedMotion =
                        false;
                }
            }

            document.documentElement.classList.toggle(
                "reduced-motion",
                this.reducedMotion
            );

            document.documentElement.dataset.reducedMotion =
                this.reducedMotion
                    ? "true"
                    : "false";

            dispatch(
                EVENTS.reducedMotion,
                {
                    reducedMotion:
                        this.reducedMotion
                }
            );
        }

        /* --------------------------------------------------------------------
         * LIVE REGION
         * ----------------------------------------------------------------- */

        createLiveRegion() {
            if (
                !this.options
                    .liveAnnouncements
            ) {
                return;
            }

            const existing =
                document.getElementById(
                    "sehrish-live-region"
                );

            if (existing) {
                this.liveRegion =
                    existing;

                return;
            }

            const region =
                document.createElement(
                    "div"
                );

            region.id =
                "sehrish-live-region";

            region.setAttribute(
                "role",
                "status"
            );

            region.setAttribute(
                "aria-live",
                "polite"
            );

            region.setAttribute(
                "aria-atomic",
                "true"
            );

            region.textContent =
                "";

            region.style.position =
                "fixed";

            region.style.width =
                "1px";

            region.style.height =
                "1px";

            region.style.padding =
                "0";

            region.style.margin =
                "-1px";

            region.style.overflow =
                "hidden";

            region.style.clip =
                "rect(0 0 0 0)";

            region.style.whiteSpace =
                "nowrap";

            region.style.border =
                "0";

            document.body.appendChild(
                region
            );

            this.liveRegion =
                region;
        }

        /* --------------------------------------------------------------------
         * ANNOUNCEMENTS
         * ----------------------------------------------------------------- */

        announce(
            message,
            options = {}
        ) {
            if (
                !this.options
                    .liveAnnouncements
            ) {
                return;
            }

            if (
                !this.liveRegion
            ) {
                this.createLiveRegion();
            }

            if (
                !this.liveRegion
            ) {
                return;
            }

            const text =
                String(
                    message ||
                        ""
                ).trim();

            if (!text) {
                return;
            }

            this.liveRegion.textContent =
                "";

            window.setTimeout(
                () => {
                    if (
                        this.liveRegion
                    ) {
                        this.liveRegion.textContent =
                            text;
                    }
                },
                20
            );

            if (
                this.liveTimer
            ) {
                window.clearTimeout(
                    this.liveTimer
                );
            }

            const duration =
                Number.isFinite(
                    options.duration
                )
                    ? Math.max(
                          0,
                          options.duration
                      )
                    : this.options
                          .announcementDuration;

            this.liveTimer =
                window.setTimeout(
                    () => {
                        if (
                            this.liveRegion
                        ) {
                            this.liveRegion.textContent =
                                "";
                        }

                        this.liveTimer =
                            null;
                    },
                    duration
                );

            dispatch(
                EVENTS.announce,
                {
                    manager:
                        this,

                    message:
                        text
                }
            );
        }

        /* --------------------------------------------------------------------
         * SKIP LINK
         * ----------------------------------------------------------------- */

        createSkipLink() {
            const existing =
                document.querySelector(
                    SELECTORS.skip
                );

            if (existing) {
                this.skipLink =
                    existing;

                return;
            }

            const firstMain =
                document.querySelector(
                    "main"
                );

            const firstScene =
                document.querySelector(
                    SELECTORS.scene
                );

            const target =
                firstMain ||
                firstScene;

            if (!target) {
                return;
            }

            if (!target.id) {
                target.id =
                    "birthday-main-content";
            }

            const link =
                document.createElement(
                    "a"
                );

            link.href =
                `#${target.id}`;

            link.textContent =
                "Skip to main content";

            link.dataset.skipToContent =
                target.id;

            link.className =
                "sehrish-skip-link";

            document.body.prepend(
                link
            );

            this.skipLink =
                link;
        }

        /* --------------------------------------------------------------------
         * DOCUMENT NORMALIZATION
         * ----------------------------------------------------------------- */

        normalizeDocument() {
            if (
                this.options.autoAria
            ) {
                this.normalizeScenes();

                this.normalizeModals();

                this.normalizeNavigation();

                this.normalizeInteractiveElements();
            }

            if (
                this.options
                    .autoTabIndex
            ) {
                this.normalizeFocusableContainers();
            }

            if (
                this.options.focusVisible
            ) {
                document.documentElement.classList.add(
                    "accessibility-focus-enabled"
                );
            }

            this.applyReducedMotionState();
        }

        /* --------------------------------------------------------------------
         * SCENES
         * ----------------------------------------------------------------- */

        normalizeScenes() {
            document
                .querySelectorAll(
                    SELECTORS.scene
                )
                .forEach(
                    (
                        scene,
                        index
                    ) => {
                        if (
                            !scene.hasAttribute(
                                "role"
                            )
                        ) {
                            scene.setAttribute(
                                "role",
                                "region"
                            );
                        }

                        if (
                            !scene.hasAttribute(
                                "tabindex"
                            )
                        ) {
                            scene.setAttribute(
                                "tabindex",
                                "-1"
                            );
                        }

                        if (
                            !scene.hasAttribute(
                                "aria-hidden"
                            )
                        ) {
                            const active =
                                scene.classList.contains(
                                    "scene-active"
                                ) ||
                                scene.classList.contains(
                                    "is-active"
                                );

                            scene.setAttribute(
                                "aria-hidden",
                                active
                                    ? "false"
                                    : "true"
                            );
                        }

                        if (
                            !scene.dataset
                                .sceneTitle
                        ) {
                            const heading =
                                scene.querySelector(
                                    SELECTORS.heading
                                );

                            if (
                                heading
                            ) {
                                scene.dataset.sceneTitle =
                                    heading.textContent
                                        .trim();
                            } else if (
                                !scene.getAttribute(
                                    "aria-label"
                                )
                            ) {
                                scene.setAttribute(
                                    "aria-label",
                                    `Birthday section ${index + 1}`
                                );
                            }
                        }
                    }
                );
        }

        /* --------------------------------------------------------------------
         * MODALS
         * ----------------------------------------------------------------- */

        normalizeModals() {
            document
                .querySelectorAll(
                    SELECTORS.modal
                )
                .forEach(
                    (
                        modal,
                        index
                    ) => {
                        if (
                            !modal.hasAttribute(
                                "role"
                            )
                        ) {
                            modal.setAttribute(
                                "role",
                                "dialog"
                            );
                        }

                        modal.setAttribute(
                            "aria-modal",
                            "true"
                        );

                        if (
                            !modal.hasAttribute(
                                "aria-hidden"
                            )
                        ) {
                            modal.setAttribute(
                                "aria-hidden",
                                modal.hidden
                                    ? "true"
                                    : "false"
                            );
                        }

                        if (
                            !modal.hasAttribute(
                                "tabindex"
                            )
                        ) {
                            modal.setAttribute(
                                "tabindex",
                                "-1"
                            );
                        }

                        const title =
                            modal.querySelector(
                                "[data-modal-title], " +
                                ".modal-title, " +
                                "h1, h2, h3"
                            );

                        if (
                            title
                        ) {
                            if (
                                !title.id
                            ) {
                                title.id =
                                    `modal-title-${index + 1}`;
                            }

                            if (
                                !modal.hasAttribute(
                                    "aria-labelledby"
                                )
                            ) {
                                modal.setAttribute(
                                    "aria-labelledby",
                                    title.id
                                );
                            }
                        }
                    }
                );
        }

        /* --------------------------------------------------------------------
         * NAVIGATION
         * ----------------------------------------------------------------- */

        normalizeNavigation() {
            document
                .querySelectorAll(
                    SELECTORS.navigation
                )
                .forEach(
                    (
                        element
                    ) => {
                        const action =
                            element.dataset
                                .nav;

                        if (
                            action ===
                                "next" ||
                            action ===
                                "prev" ||
                            action ===
                                "previous"
                        ) {
                            if (
                                !element.getAttribute(
                                    "aria-label"
                                )
                            ) {
                                if (
                                    action ===
                                    "next"
                                ) {
                                    element.setAttribute(
                                        "aria-label",
                                        "Next screen"
                                    );
                                } else {
                                    element.setAttribute(
                                        "aria-label",
                                        "Previous screen"
                                    );
                                }
                            }
                        }

                        if (
                            !isNaturallyInteractive(
                                element
                            ) &&
                            element.getAttribute(
                                "role"
                            ) ===
                                "button"
                        ) {
                            if (
                                !element.hasAttribute(
                                    "tabindex"
                                )
                            ) {
                                element.setAttribute(
                                    "tabindex",
                                    "0"
                                );
                            }
                        }
                    }
                );
        }

        /* --------------------------------------------------------------------
         * INTERACTIVE ELEMENTS
         * ----------------------------------------------------------------- */

        normalizeInteractiveElements() {
            document
                .querySelectorAll(
                    SELECTORS.buttonLike
                )
                .forEach(
                    (
                        element
                    ) => {
                        if (
                            isNaturallyInteractive(
                                element
                            )
                        ) {
                            return;
                        }

                        if (
                            !element.hasAttribute(
                                "role"
                            )
                        ) {
                            element.setAttribute(
                                "role",
                                "button"
                            );
                        }

                        if (
                            !element.hasAttribute(
                                "tabindex"
                            )
                        ) {
                            element.setAttribute(
                                "tabindex",
                                "0"
                            );
                        }

                        if (
                            !element.hasAttribute(
                                "aria-label"
                            )
                        ) {
                            const text =
                                element.textContent
                                    .trim();

                            if (
                                text
                            ) {
                                element.setAttribute(
                                    "aria-label",
                                    text
                                );
                            }
                        }
                    }
                );
        }

        /* --------------------------------------------------------------------
         * FOCUSABLE CONTAINERS
         * ----------------------------------------------------------------- */

        normalizeFocusableContainers() {
            document
                .querySelectorAll(
                    "[data-focus-container]"
                )
                .forEach(
                    (
                        element
                    ) => {
                        if (
                            !element.hasAttribute(
                                "tabindex"
                            )
                        ) {
                            element.setAttribute(
                                "tabindex",
                                "-1"
                            );
                        }
                    }
                );
        }

        /* --------------------------------------------------------------------
         * EVENTS
         * ----------------------------------------------------------------- */

        bindEvents() {
            this.addListener(
                document,
                "keydown",
                (
                    event
                ) =>
                    this.handleKeydown(
                        event
                    )
            );

            this.addListener(
                document,
                "pointerdown",
                () => {
                    this.pointerMode =
                        true;

                    this.keyboardMode =
                        false;
                },
                {
                    passive:
                        true
                }
            );

            this.addListener(
                document,
                "focusin",
                (
                    event
                ) =>
                    this.handleFocusIn(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:navigation:change",
                (
                    event
                ) =>
                    this.handleSceneChange(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:navigation:after-change",
                (
                    event
                ) =>
                    this.handleSceneAfterChange(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:modal:opened",
                (
                    event
                ) =>
                    this.handleModalOpened(
                        event
                    )
            );

            this.addListener(
                window,
                "sehrish:modal:closed",
                (
                    event
                ) =>
                    this.handleModalClosed(
                        event
                    )
            );

            this.addListener(
                window,
                "resize",
                () =>
                    this.refreshReducedMotion(),
                {
                    passive:
                        true
                }
            );

            try {
                const motionQuery =
                    window.matchMedia(
                        "(prefers-reduced-motion: reduce)"
                    );

                if (
                    motionQuery.addEventListener
                ) {
                    motionQuery.addEventListener(
                        "change",
                        () =>
                            this.refreshReducedMotion()
                    );
                } else if (
                    motionQuery.addListener
                ) {
                    motionQuery.addListener(
                        () =>
                            this.refreshReducedMotion()
                    );
                }

                this.motionQuery =
                    motionQuery;
            } catch {
                this.motionQuery =
                    null;
            }
        }

        addListener(
            target,
            eventName,
            handler,
            options = false
        ) {
            target.addEventListener(
                eventName,
                handler,
                options
            );

            this.listeners.push({
                target,
                eventName,
                handler,
                options
            });
        }

        /* --------------------------------------------------------------------
         * KEYBOARD
         * ----------------------------------------------------------------- */

        handleKeydown(
            event
        ) {
            this.keyboardMode =
                true;

            this.pointerMode =
                false;

            document.documentElement.classList.add(
                "keyboard-navigation"
            );

            document.documentElement.classList.remove(
                "pointer-navigation"
            );

            if (
                event.key ===
                "Enter"
            ) {
                this.handleEnter(
                    event
                );
            }

            if (
                event.key ===
                " "
            ) {
                this.handleSpace(
                    event
                );
            }

            dispatch(
                EVENTS.stateChange,
                {
                    keyboardMode:
                        true
                }
            );
        }

        /* --------------------------------------------------------------------
         * ENTER
         * ----------------------------------------------------------------- */

        handleEnter(
            event
        ) {
            const target =
                event.target;

            if (
                !isHTMLElement(
                    target
                )
            ) {
                return;
            }

            if (
                target.getAttribute(
                    "role"
                ) !== "button"
            ) {
                return;
            }

            if (
                target.tagName.toLowerCase() ===
                "button"
            ) {
                return;
            }

            if (
                isDisabled(
                    target
                )
            ) {
                return;
            }

            event.preventDefault();

            target.click();
        }

        /* --------------------------------------------------------------------
         * SPACE
         * ----------------------------------------------------------------- */

        handleSpace(
            event
        ) {
            const target =
                event.target;

            if (
                !isHTMLElement(
                    target
                )
            ) {
                return;
            }

            if (
                target.getAttribute(
                    "role"
                ) !== "button"
            ) {
                return;
            }

            if (
                target.tagName.toLowerCase() ===
                "button"
            ) {
                return;
            }

            if (
                isDisabled(
                    target
                )
            ) {
                return;
            }

            event.preventDefault();

            target.click();
        }

        /* --------------------------------------------------------------------
         * FOCUS
         * ----------------------------------------------------------------- */

        handleFocusIn(
            event
        ) {
            const target =
                event.target;

            if (
                !isHTMLElement(
                    target
                )
            ) {
                return;
            }

            this.lastFocusedElement =
                target;

            target.classList.add(
                "accessibility-focused"
            );

            dispatch(
                EVENTS.focus,
                {
                    manager:
                        this,

                    element:
                        target
                }
            );
        }

        /* --------------------------------------------------------------------
         * SCENE CHANGE
         * ----------------------------------------------------------------- */

        handleSceneChange(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const target =
                detail.toScene ||
                detail.scene;

            const element =
                target?.element ||
                (
                    target instanceof
                    HTMLElement
                        ? target
                        : null
                );

            if (
                element
            ) {
                this.updateSceneAccessibility(
                    element
                );
            }
        }

        handleSceneAfterChange(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const scene =
                detail.toScene ||
                detail.scene;

            const element =
                scene?.element;

            if (
                !element
            ) {
                return;
            }

            const title =
                scene.title ||
                element.dataset
                    .sceneTitle;

            if (
                title
            ) {
                this.announce(
                    `Opened ${title}`
                );
            }

            this.focusScene(
                element
            );
        }

        /* --------------------------------------------------------------------
         * MODAL OPEN
         * ----------------------------------------------------------------- */

        handleModalOpened(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const modal =
                detail.modal;

            const element =
                modal?.element ||
                (
                    modal instanceof
                    HTMLElement
                        ? modal
                        : null
                );

            if (
                !element
            ) {
                return;
            }

            element.setAttribute(
                "aria-hidden",
                "false"
            );

            element.setAttribute(
                "aria-modal",
                "true"
            );
        }

        /* --------------------------------------------------------------------
         * MODAL CLOSE
         * ----------------------------------------------------------------- */

        handleModalClosed(
            event
        ) {
            const detail =
                event.detail ||
                {};

            const modal =
                detail.modal;

            const element =
                modal?.element ||
                (
                    modal instanceof
                    HTMLElement
                        ? modal
                        : null
                );

            if (
                !element
            ) {
                return;
            }

            element.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        /* --------------------------------------------------------------------
         * SCENE ACCESSIBILITY
         * ----------------------------------------------------------------- */

        updateSceneAccessibility(
            activeElement
        ) {
            document
                .querySelectorAll(
                    SELECTORS.scene
                )
                .forEach(
                    (
                        scene
                    ) => {
                        const active =
                            scene ===
                            activeElement;

                        scene.setAttribute(
                            "aria-hidden",
                            active
                                ? "false"
                                : "true"
                        );

                        if (
                            active
                        ) {
                            scene.removeAttribute(
                                "inert"
                            );
                        } else {
                            scene.setAttribute(
                                "inert",
                                ""
                            );
                        }
                    }
                );
        }

        /* --------------------------------------------------------------------
         * FOCUS SCENE
         * ----------------------------------------------------------------- */

        focusScene(
            element
        ) {
            if (
                !element ||
                !isVisible(
                    element
                )
            ) {
                return;
            }

            if (
                this.options
                    .focusVisible &&
                !this.keyboardMode
            ) {
                return;
            }

            try {
                element.focus({
                    preventScroll:
                        true
                });
            } catch {
                try {
                    element.focus();
                } catch {
                    /* Ignore focus failures. */
                }
            }
        }

        /* --------------------------------------------------------------------
         * REDUCED MOTION
         * ----------------------------------------------------------------- */

        refreshReducedMotion() {
            let reduced =
                false;

            if (
                this.options
                    .respectReducedMotion
            ) {
                try {
                    reduced =
                        window
                            .matchMedia(
                                "(prefers-reduced-motion: reduce)"
                            )
                            .matches;
                } catch {
                    reduced =
                        false;
                }
            }

            if (
                reduced ===
                this.reducedMotion
            ) {
                return;
            }

            this.reducedMotion =
                reduced;

            this.applyReducedMotionState();

            dispatch(
                EVENTS.reducedMotion,
                {
                    manager:
                        this,

                    reducedMotion:
                        reduced
                }
            );
        }

        applyReducedMotionState() {
            document.documentElement.classList.toggle(
                "reduced-motion",
                this.reducedMotion
            );

            document.documentElement.dataset.reducedMotion =
                this.reducedMotion
                    ? "true"
                    : "false";
        }

        /* --------------------------------------------------------------------
         * DYNAMIC CONTENT OBSERVER
         * ----------------------------------------------------------------- */

        startObserver() {
            if (
                !(
                    "MutationObserver" in
                    window
                )
            ) {
                return;
            }

            this.observer =
                new MutationObserver(
                    (
                        mutations
                    ) => {
                        let shouldRefresh =
                            false;

                        mutations.forEach(
                            (
                                mutation
                            ) => {
                                if (
                                    mutation.type ===
                                    "childList"
                                ) {
                                    if (
                                        mutation.addedNodes
                                            .length
                                    ) {
                                        shouldRefresh =
                                            true;
                                    }
                                }

                                if (
                                    mutation.type ===
                                    "attributes"
                                ) {
                                    if (
                                        [
                                            "role",
                                            "tabindex",
                                            "aria-hidden",
                                            "aria-label",
                                            "data-scene",
                                            "data-modal"
                                        ].includes(
                                            mutation.attributeName
                                        )
                                    ) {
                                        shouldRefresh =
                                            true;
                                    }
                                }
                            }
                        );

                        if (
                            shouldRefresh
                        ) {
                            this.normalizeDocument();
                        }
                    }
                );

            this.observer.observe(
                document.body,
                {
                    subtree:
                        true,

                    childList:
                        true,

                    attributes:
                        true,

                    attributeFilter: [
                        "role",
                        "tabindex",
                        "aria-hidden",
                        "aria-label",
                        "data-scene",
                        "data-modal"
                    ]
                }
            );
        }

        /* --------------------------------------------------------------------
         * ACCESSIBILITY CHECK
         * ----------------------------------------------------------------- */

        audit() {
            const issues =
                [];

            document
                .querySelectorAll(
                    "button, a, input, select, textarea"
                )
                .forEach(
                    (
                        element
                    ) => {
                        if (
                            !isVisible(
                                element
                            )
                        ) {
                            return;
                        }

                        if (
                            element.tagName.toLowerCase() ===
                            "button"
                        ) {
                            if (
                                !element.textContent.trim() &&
                                !element.getAttribute(
                                    "aria-label"
                                ) &&
                                !element.getAttribute(
                                    "aria-labelledby"
                                )
                            ) {
                                issues.push({
                                    type:
                                        "empty-button",
                                    element
                                });
                            }
                        }

                        if (
                            element.tagName.toLowerCase() ===
                            "a"
                        ) {
                            if (
                                !element.textContent.trim() &&
                                !element.getAttribute(
                                    "aria-label"
                                ) &&
                                !element.getAttribute(
                                    "aria-labelledby"
                                )
                            ) {
                                issues.push({
                                    type:
                                        "empty-link",
                                    element
                                });
                            }
                        }
                    }
                );

            document
                .querySelectorAll(
                    "img"
                )
                .forEach(
                    (
                        image
                    ) => {
                        if (
                            image.hasAttribute(
                                "aria-hidden"
                            )
                        ) {
                            return;
                        }

                        if (
                            !image.hasAttribute(
                                "alt"
                            )
                        ) {
                            issues.push({
                                type:
                                    "image-missing-alt",
                                element:
                                    image
                            });
                        }
                    }
                );

            return issues;
        }

        /* --------------------------------------------------------------------
         * STATE
         * ----------------------------------------------------------------- */

        getState() {
            return {
                version:
                    VERSION,

                initialized:
                    this.initialized,

                keyboardMode:
                    this.keyboardMode,

                pointerMode:
                    this.pointerMode,

                reducedMotion:
                    this.reducedMotion,

                liveRegion:
                    Boolean(
                        this.liveRegion
                    ),

                skipLink:
                    Boolean(
                        this.skipLink
                    ),

                observedDynamicContent:
                    Boolean(
                        this.observer
                    ),

                auditIssues:
                    this.audit()
                        .length
            };
        }

        /* --------------------------------------------------------------------
         * REFRESH
         * ----------------------------------------------------------------- */

        refresh() {
            this.detectPreferences();

            this.normalizeDocument();

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

            if (
                this.liveTimer
            ) {
                window.clearTimeout(
                    this.liveTimer
                );

                this.liveTimer =
                    null;
            }

            if (
                this.observer
            ) {
                this.observer.disconnect();

                this.observer =
                    null;
            }

            this.listeners.forEach(
                ({
                    target,
                    eventName,
                    handler,
                    options
                }) => {
                    target.removeEventListener(
                        eventName,
                        handler,
                        options
                    );
                }
            );

            this.listeners =
                [];

            if (
                this.skipLink &&
                this.skipLink.dataset
                    .skipToContent
            ) {
                this.skipLink.remove();
            }

            if (
                this.liveRegion &&
                this.liveRegion.id ===
                    "sehrish-live-region"
            ) {
                this.liveRegion.remove();
            }

            document.documentElement.classList.remove(
                "keyboard-navigation",
                "pointer-navigation",
                "reduced-motion",
                "accessibility-focus-enabled"
            );

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
            if (!manager) {
                manager =
                    new BirthdayAccessibilityManager(
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
                    new BirthdayAccessibilityManager();

                manager.init();
            }

            return manager;
        },

        announce(
            message,
            options = {}
        ) {
            return this.getManager()
                .announce(
                    message,
                    options
                );
        },

        refresh() {
            return this.getManager()
                .refresh();
        },

        audit() {
            return this.getManager()
                .audit();
        },

        getState() {
            return this.getManager()
                .getState();
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

    window.BirthdayAccessibilityManager =
        BirthdayAccessibilityManager;

    window.SehrishAccessibility =
        api;

    window.SehrishBirthdayAccessibility =
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
                "[SehrishAccessibility] " +
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

    /* ------------------------------------------------------------------------
     * APP READY INTEGRATION
     * --------------------------------------------------------------------- */

    window.addEventListener(
        "sehrish:app:ready",
        () => {
            if (
                manager &&
                manager.initialized
            ) {
                manager.refresh();
            }
        }
    );

    console.info(
        `[SehrishAccessibility] ` +
        `Accessibility module v${VERSION} loaded.`
    );
})();