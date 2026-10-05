/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/modal.js
 * Version: 1.0.0
 *
 * Production-ready modal / popup controller.
 *
 * Responsibilities:
 * - Open and close modal dialogs
 * - Multiple modal support
 * - Backdrop handling
 * - Escape-key closing
 * - Focus management
 * - Focus trapping
 * - Accessibility attributes
 * - Dynamic modal content
 * - Modal animations
 * - Scroll locking
 * - Nested-safe state tracking
 * - Custom lifecycle events
 * - Integration with the birthday website modules
 *
 * Supported HTML:
 *
 * <button data-modal-open="gift-modal">Open</button>
 *
 * <div
 *     id="gift-modal"
 *     class="birthday-modal"
 *     data-modal
 *     role="dialog"
 *     aria-modal="true"
 * >
 *     <button data-modal-close>Close</button>
 * </div>
 *
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const DEFAULTS = Object.freeze({
        closeOnBackdrop: true,
        closeOnEscape: true,
        trapFocus: true,
        restoreFocus: true,
        lockBodyScroll: true,
        animationDuration: 280,
        stackModals: false,
        preventDuplicateOpen: true
    });

    const SELECTORS = Object.freeze({
        modal:
            "[data-modal]",

        open:
            "[data-modal-open]",

        close:
            "[data-modal-close], " +
            "[data-modal-dismiss]",

        backdrop:
            "[data-modal-backdrop]",

        focusable:
            [
                "a[href]",
                "button:not([disabled])",
                "input:not([disabled]):not([type=\"hidden\"])",
                "select:not([disabled])",
                "textarea:not([disabled])",
                "[tabindex]:not([tabindex=\"-1\"])",
                "[contenteditable=\"true\"]"
            ].join(",")
    });

    const EVENTS = Object.freeze({
        ready:
            "sehrish:modal:ready",

        beforeOpen:
            "sehrish:modal:before-open",

        opened:
            "sehrish:modal:opened",

        beforeClose:
            "sehrish:modal:before-close",

        closed:
            "sehrish:modal:closed",

        rejected:
            "sehrish:modal:rejected"
    });

    /* ------------------------------------------------------------------------
     * UTILITIES
     * --------------------------------------------------------------------- */

    const normalizeId = (
        value
    ) => {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .trim()
            .replace(/^#/, "");
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

    const prefersReducedMotion =
        () => {
            try {
                return window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches;
            } catch {
                return false;
            }
        };

    const delay = (
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

    /* ------------------------------------------------------------------------
     * MODAL RECORD
     * --------------------------------------------------------------------- */

    class ModalRecord {
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
                    element.id ||
                    element.dataset.modalId ||
                    `modal-${index + 1}`
                );

            this.title =
                element.dataset.modalTitle ||
                "";

            this.opened =
                false;

            this.openCount =
                0;

            this.lastOpenedAt =
                null;

            this.lastClosedAt =
                null;

            this.previousFocusedElement =
                null;

            this.triggerElement =
                null;

            this.originalAriaHidden =
                element.getAttribute(
                    "aria-hidden"
                );

            this.originalTabIndex =
                element.getAttribute(
                    "tabindex"
                );
        }

        setOpened() {
            this.opened = true;

            this.openCount += 1;

            this.lastOpenedAt =
                Date.now();
        }

        setClosed() {
            this.opened = false;

            this.lastClosedAt =
                Date.now();
        }

        getState() {
            return {
                id:
                    this.id,

                title:
                    this.title,

                opened:
                    this.opened,

                openCount:
                    this.openCount,

                lastOpenedAt:
                    this.lastOpenedAt,

                lastClosedAt:
                    this.lastClosedAt
            };
        }
    }

    /* ------------------------------------------------------------------------
     * MODAL MANAGER
     * --------------------------------------------------------------------- */

    class BirthdayModalManager {
        constructor(
            options = {}
        ) {
            this.options = {
                ...DEFAULTS,
                ...options
            };

            this.modals = [];

            this.modalMap =
                new Map();

            this.activeModal =
                null;

            this.modalStack =
                [];

            this.initialized =
                false;

            this.destroyed =
                false;

            this.listeners = [];

            this.originalBodyOverflow =
                "";

            this.originalBodyPaddingRight =
                "";

            this.scrollLocked =
                false;
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

            this.discoverModals();

            this.prepareModals();

            this.bindEvents();

            this.initialized =
                true;

            dispatch(
                EVENTS.ready,
                {
                    manager:
                        this,

                    count:
                        this.modals.length
                }
            );

            return this;
        }

        /* --------------------------------------------------------------------
         * DISCOVER MODALS
         * ----------------------------------------------------------------- */

        discoverModals() {
            this.modals = [];

            this.modalMap.clear();

            const elements =
                document.querySelectorAll(
                    SELECTORS.modal
                );

            elements.forEach(
                (
                    element,
                    index
                ) => {
                    const modal =
                        new ModalRecord(
                            element,
                            index
                        );

                    if (
                        this.modalMap.has(
                            modal.id
                        )
                    ) {
                        console.warn(
                            `[SehrishModal] ` +
                            `Duplicate modal ID "${modal.id}" ignored.`
                        );

                        return;
                    }

                    this.modals.push(
                        modal
                    );

                    this.modalMap.set(
                        modal.id,
                        modal
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * PREPARE MODALS
         * ----------------------------------------------------------------- */

        prepareModals() {
            this.modals.forEach(
                (modal) => {
                    const element =
                        modal.element;

                    element.classList.add(
                        "birthday-modal-ready"
                    );

                    element.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                    element.setAttribute(
                        "aria-modal",
                        "true"
                    );

                    if (
                        !element.hasAttribute(
                            "role"
                        )
                    ) {
                        element.setAttribute(
                            "role",
                            "dialog"
                        );
                    }

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

                    element.hidden =
                        true;

                    this.prepareModalLabel(
                        modal
                    );
                }
            );
        }

        /* --------------------------------------------------------------------
         * ACCESSIBILITY LABEL
         * ----------------------------------------------------------------- */

        prepareModalLabel(
            modal
        ) {
            const element =
                modal.element;

            const title =
                element.querySelector(
                    "[data-modal-title], " +
                    ".modal-title, " +
                    "h1, h2, h3"
                );

            if (
                title &&
                !title.id
            ) {
                title.id =
                    `${modal.id}-title`;
            }

            if (
                title &&
                !element.hasAttribute(
                    "aria-labelledby"
                )
            ) {
                element.setAttribute(
                    "aria-labelledby",
                    title.id
                );

                return;
            }

            const description =
                element.querySelector(
                    "[data-modal-description], " +
                    ".modal-description"
                );

            if (
                description &&
                !description.id
            ) {
                description.id =
                    `${modal.id}-description`;
            }

            if (
                description &&
                !element.hasAttribute(
                    "aria-describedby"
                )
            ) {
                element.setAttribute(
                    "aria-describedby",
                    description.id
                );
            }
        }

        /* --------------------------------------------------------------------
         * EVENT BINDING
         * ----------------------------------------------------------------- */

        bindEvents() {
            if (
                this.listeners.length
            ) {
                return;
            }

            this.addListener(
                document,
                "click",
                (event) =>
                    this.handleClick(
                        event
                    )
            );

            this.addListener(
                document,
                "keydown",
                (event) =>
                    this.handleKeydown(
                        event
                    )
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
         * CLICK HANDLING
         * ----------------------------------------------------------------- */

        handleClick(
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

            const openTrigger =
                event.target.closest(
                    SELECTORS.open
                );

            if (openTrigger) {
                event.preventDefault();

                const modalId =
                    openTrigger.dataset
                        .modalOpen;

                void this.open(
                    modalId,
                    {
                        trigger:
                            openTrigger,
                        source:
                            "trigger"
                    }
                );

                return;
            }

            const closeTrigger =
                event.target.closest(
                    SELECTORS.close
                );

            if (closeTrigger) {
                event.preventDefault();

                const modal =
                    closeTrigger.closest(
                        SELECTORS.modal
                    );

                const modalId =
                    modal?.id ||
                    this.activeModal?.id;

                if (modalId) {
                    void this.close(
                        modalId,
                        {
                            source:
                                "close-control"
                        }
                    );
                }

                return;
            }

            const modal =
                event.target.closest(
                    SELECTORS.modal
                );

            if (
                !modal ||
                !this.options
                    .closeOnBackdrop
            ) {
                return;
            }

            if (
                event.target ===
                modal
            ) {
                void this.close(
                    modal.id,
                    {
                        source:
                            "backdrop"
                    }
                );
            }
        }

        /* --------------------------------------------------------------------
         * KEYBOARD
         * ----------------------------------------------------------------- */

        handleKeydown(
            event
        ) {
            if (
                !this.activeModal
            ) {
                return;
            }

            if (
                event.key ===
                "Escape"
            ) {
                if (
                    !this.options
                        .closeOnEscape
                ) {
                    return;
                }

                event.preventDefault();

                void this.close(
                    this.activeModal.id,
                    {
                        source:
                            "escape"
                    }
                );

                return;
            }

            if (
                event.key ===
                "Tab" &&
                this.options.trapFocus
            ) {
                this.trapFocus(
                    event
                );
            }
        }

        /* --------------------------------------------------------------------
         * OPEN MODAL
         * ----------------------------------------------------------------- */

        async open(
            modalId,
            options = {}
        ) {
            if (
                !this.initialized ||
                this.destroyed
            ) {
                return false;
            }

            const id =
                normalizeId(
                    modalId
                );

            const modal =
                this.get(
                    id
                );

            if (!modal) {
                return this.reject(
                    "modal-not-found",
                    {
                        modalId:
                            id
                    }
                );
            }

            if (
                modal.opened &&
                this.options
                    .preventDuplicateOpen
            ) {
                return true;
            }

            if (
                this.activeModal &&
                this.activeModal !==
                    modal &&
                !this.options
                    .stackModals
            ) {
                await this.close(
                    this.activeModal.id,
                    {
                        source:
                            "switch"
                    }
                );
            }

            const detail = {
                manager:
                    this,

                modal,

                trigger:
                    options.trigger ||
                    null,

                source:
                    options.source ||
                    "api"
            };

            const beforeEvent =
                new CustomEvent(
                    EVENTS.beforeOpen,
                    {
                        cancelable:
                            true,

                        detail
                    }
                );

            const allowed =
                window.dispatchEvent(
                    beforeEvent
                );

            if (
                !allowed
            ) {
                return this.reject(
                    "before-open-blocked",
                    detail
                );
            }

            modal.previousFocusedElement =
                document.activeElement;

            modal.triggerElement =
                options.trigger ||
                document.activeElement;

            if (
                this.options
                    .stackModals
            ) {
                this.modalStack.push(
                    modal
                );
            } else {
                this.modalStack = [
                    modal
                ];
            }

            this.activeModal =
                modal;

            if (
                this.options
                    .lockBodyScroll
            ) {
                this.lockBodyScroll();
            }

            this.setModalVisible(
                modal,
                true
            );

            modal.setOpened();

            this.updateBodyState();

            await this.runAnimation(
                modal.element,
                "open"
            );

            if (
                this.activeModal ===
                modal
            ) {
                this.focusInitialElement(
                    modal
                );
            }

            dispatch(
                EVENTS.opened,
                detail
            );

            return true;
        }

        /* --------------------------------------------------------------------
         * CLOSE MODAL
         * ----------------------------------------------------------------- */

        async close(
            modalId = null,
            options = {}
        ) {
            const modal =
                modalId
                    ? this.get(
                          modalId
                      )
                    : this.activeModal;

            if (!modal) {
                return false;
            }

            if (
                !modal.opened
            ) {
                return true;
            }

            const detail = {
                manager:
                    this,

                modal,

                source:
                    options.source ||
                    "api"
            };

            const beforeEvent =
                new CustomEvent(
                    EVENTS.beforeClose,
                    {
                        cancelable:
                            true,

                        detail
                    }
                );

            const allowed =
                window.dispatchEvent(
                    beforeEvent
                );

            if (
                !allowed
            ) {
                return this.reject(
                    "before-close-blocked",
                    detail
                );
            }

            await this.runAnimation(
                modal.element,
                "close"
            );

            this.setModalVisible(
                modal,
                false
            );

            modal.setClosed();

            this.removeFromStack(
                modal
            );

            if (
                this.options
                    .stackModals &&
                this.modalStack.length
            ) {
                this.activeModal =
                    this.modalStack[
                        this.modalStack.length -
                            1
                    ];

                this.setModalVisible(
                    this.activeModal,
                    true
                );

                await this.runAnimation(
                    this.activeModal.element,
                    "open"
                );
            } else {
                this.activeModal =
                    null;
            }

            if (
                !this.activeModal
            ) {
                this.unlockBodyScroll();
            }

            this.updateBodyState();

            if (
                this.options
                    .restoreFocus
            ) {
                this.restoreFocus(
                    modal
                );
            }

            dispatch(
                EVENTS.closed,
                detail
            );

            return true;
        }

        /* --------------------------------------------------------------------
         * CLOSE ALL
         * ----------------------------------------------------------------- */

        async closeAll(
            options = {}
        ) {
            const opened =
                this.modals.filter(
                    (
                        modal
                    ) =>
                        modal.opened
                );

            for (
                const modal of
                    opened
            ) {
                await this.close(
                    modal.id,
                    options
                );
            }

            return true;
        }

        /* --------------------------------------------------------------------
         * VISIBILITY
         * ----------------------------------------------------------------- */

        setModalVisible(
            modal,
            visible
        ) {
            const element =
                modal.element;

            if (visible) {
                element.hidden =
                    false;

                element.classList.add(
                    "modal-open"
                );

                element.setAttribute(
                    "aria-hidden",
                    "false"
                );

                element.removeAttribute(
                    "inert"
                );

                element.dataset.modalState =
                    "open";

                document.body?.classList.add(
                    "modal-is-open"
                );
            } else {
                element.hidden =
                    true;

                element.classList.remove(
                    "modal-open"
                );

                element.setAttribute(
                    "aria-hidden",
                    "true"
                );

                element.setAttribute(
                    "inert",
                    ""
                );

                element.dataset.modalState =
                    "closed";
            }
        }

        /* --------------------------------------------------------------------
         * ANIMATION
         * ----------------------------------------------------------------- */

        async runAnimation(
            element,
            action
        ) {
            if (
                !element ||
                prefersReducedMotion()
            ) {
                return;
            }

            const className =
                action === "open"
                    ? "modal-entering"
                    : "modal-leaving";

            const activeClass =
                action === "open"
                    ? "modal-visible"
                    : "modal-closing";

            element.classList.remove(
                "modal-entering",
                "modal-leaving",
                "modal-visible",
                "modal-closing"
            );

            element.classList.add(
                className
            );

            void element
                .offsetWidth;

            element.classList.add(
                activeClass
            );

            await delay(
                this.getAnimationDuration(
                    element
                )
            );

            element.classList.remove(
                className,
                activeClass
            );
        }

        getAnimationDuration(
            element
        ) {
            const value =
                Number(
                    element?.dataset
                        ?.modalDuration
                );

            if (
                Number.isFinite(
                    value
                )
            ) {
                return Math.max(
                    0,
                    value
                );
            }

            return this.options
                .animationDuration;
        }

        /* --------------------------------------------------------------------
         * FOCUS MANAGEMENT
         * ----------------------------------------------------------------- */

        focusInitialElement(
            modal
        ) {
            const element =
                modal.element;

            const explicit =
                element.querySelector(
                    "[data-modal-autofocus]"
                );

            if (
                explicit &&
                this.isFocusable(
                    explicit
                )
            ) {
                explicit.focus();

                return;
            }

            const closeButton =
                element.querySelector(
                    SELECTORS.close
                );

            if (
                closeButton &&
                this.isFocusable(
                    closeButton
                )
            ) {
                closeButton.focus();

                return;
            }

            const focusable =
                this.getFocusableElements(
                    element
                );

            if (
                focusable.length
            ) {
                focusable[0].focus();

                return;
            }

            try {
                element.focus({
                    preventScroll:
                        true
                });
            } catch {
                element.focus();
            }
        }

        restoreFocus(
            modal
        ) {
            const target =
                modal.triggerElement ||
                modal.previousFocusedElement;

            if (
                target &&
                target instanceof
                    HTMLElement &&
                document.contains(
                    target
                )
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
                                /* Ignore. */
                            }
                        }
                    },
                    0
                );
            }
        }

        getFocusableElements(
            container
        ) {
            return Array.from(
                container.querySelectorAll(
                    SELECTORS.focusable
                )
            ).filter(
                (element) =>
                    this.isFocusable(
                        element
                    )
            );
        }

        isFocusable(
            element
        ) {
            if (
                !(
                    element instanceof
                    HTMLElement
                )
            ) {
                return false;
            }

            if (
                element.hidden ||
                element.hasAttribute(
                    "disabled"
                ) ||
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

            if (
                style.display ===
                    "none" ||
                style.visibility ===
                    "hidden"
            ) {
                return false;
            }

            return true;
        }

        trapFocus(
            event
        ) {
            if (
                !this.activeModal
            ) {
                return;
            }

            const focusable =
                this.getFocusableElements(
                    this.activeModal
                        .element
                );

            if (
                !focusable.length
            ) {
                event.preventDefault();

                this.activeModal
                    .element
                    .focus();

                return;
            }

            const first =
                focusable[0];

            const last =
                focusable[
                    focusable.length -
                        1
                ];

            if (
                event.shiftKey
            ) {
                if (
                    document.activeElement ===
                    first
                ) {
                    event.preventDefault();

                    last.focus();
                }
            } else if (
                document.activeElement ===
                last
            ) {
                event.preventDefault();

                first.focus();
            }
        }

        /* --------------------------------------------------------------------
         * BODY SCROLL LOCK
         * ----------------------------------------------------------------- */

        lockBodyScroll() {
            if (
                this.scrollLocked
            ) {
                return;
            }

            const body =
                document.body;

            if (!body) {
                return;
            }

            this.originalBodyOverflow =
                body.style.overflow;

            this.originalBodyPaddingRight =
                body.style
                    .paddingRight;

            const scrollbarWidth =
                window.innerWidth -
                document.documentElement
                    .clientWidth;

            body.style.overflow =
                "hidden";

            if (
                scrollbarWidth > 0
            ) {
                const currentPadding =
                    parseFloat(
                        window
                            .getComputedStyle(
                                body
                            )
                            .paddingRight
                    ) || 0;

                body.style.paddingRight =
                    `${currentPadding +
                        scrollbarWidth}px`;
            }

            this.scrollLocked =
                true;
        }

        unlockBodyScroll() {
            if (
                !this.scrollLocked
            ) {
                return;
            }

            const body =
                document.body;

            if (!body) {
                return;
            }

            body.style.overflow =
                this.originalBodyOverflow;

            body.style.paddingRight =
                this.originalBodyPaddingRight;

            this.scrollLocked =
                false;
        }

        /* --------------------------------------------------------------------
         * BODY STATE
         * ----------------------------------------------------------------- */

        updateBodyState() {
            if (!document.body) {
                return;
            }

            document.body.classList.toggle(
                "modal-is-open",
                Boolean(
                    this.activeModal
                )
            );

            document.body.dataset.activeModal =
                this.activeModal?.id ||
                "";
        }

        /* --------------------------------------------------------------------
         * STACK
         * ----------------------------------------------------------------- */

        removeFromStack(
            modal
        ) {
            this.modalStack =
                this.modalStack.filter(
                    (item) =>
                        item !== modal
                );
        }

        /* --------------------------------------------------------------------
         * LOOKUPS
         * ----------------------------------------------------------------- */

        get(
            modalId
        ) {
            return (
                this.modalMap.get(
                    normalizeId(
                        modalId
                    )
                ) ||
                null
            );
        }

        has(
            modalId
        ) {
            return Boolean(
                this.get(
                    modalId
                )
            );
        }

        getActiveModal() {
            return (
                this.activeModal ||
                null
            );
        }

        getActiveModalId() {
            return (
                this.activeModal
                    ?.id ||
                null
            );
        }

        getAll() {
            return [
                ...this.modals
            ];
        }

        getOpenModals() {
            return this.modals.filter(
                (
                    modal
                ) => modal.opened
            );
        }

        /* --------------------------------------------------------------------
         * DYNAMIC CONTENT
         * ----------------------------------------------------------------- */

        setContent(
            modalId,
            content
        ) {
            const modal =
                this.get(
                    modalId
                );

            if (!modal) {
                return false;
            }

            const contentTarget =
                modal.element.querySelector(
                    "[data-modal-content]"
                );

            if (!contentTarget) {
                return false;
            }

            if (
                content instanceof
                Node
            ) {
                contentTarget.replaceChildren(
                    content
                );
            } else {
                contentTarget.innerHTML =
                    String(
                        content
                    );
            }

            this.prepareModalLabel(
                modal
            );

            return true;
        }

        setTitle(
            modalId,
            title
        ) {
            const modal =
                this.get(
                    modalId
                );

            if (!modal) {
                return false;
            }

            const titleElement =
                modal.element.querySelector(
                    "[data-modal-title], " +
                    ".modal-title"
                );

            if (!titleElement) {
                return false;
            }

            titleElement.textContent =
                String(
                    title ?? ""
                );

            return true;
        }

        /* --------------------------------------------------------------------
         * REJECT
         * ----------------------------------------------------------------- */

        reject(
            reason,
            detail = {}
        ) {
            dispatch(
                EVENTS.rejected,
                {
                    manager:
                        this,

                    reason,

                    ...detail
                }
            );

            return false;
        }

        /* --------------------------------------------------------------------
         * REFRESH
         * ----------------------------------------------------------------- */

        refresh() {
            const activeId =
                this.getActiveModalId();

            this.discoverModals();

            this.prepareModals();

            if (
                activeId &&
                this.has(
                    activeId
                )
            ) {
                const modal =
                    this.get(
                        activeId
                    );

                this.activeModal =
                    modal;

                this.setModalVisible(
                    modal,
                    true
                );
            }

            return this;
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

                activeModal:
                    this.getActiveModalId(),

                openCount:
                    this.getOpenModals()
                        .length,

                stackSize:
                    this.modalStack
                        .length,

                bodyScrollLocked:
                    this.scrollLocked,

                modals:
                    this.modals.map(
                        (
                            modal
                        ) =>
                            modal.getState()
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

            const openModals =
                this.getOpenModals();

            openModals.forEach(
                (
                    modal
                ) => {
                    this.setModalVisible(
                        modal,
                        false
                    );
                }
            );

            this.unlockBodyScroll();

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

            this.modals =
                [];

            this.modalMap.clear();

            this.modalStack =
                [];

            this.activeModal =
                null;

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
                    new BirthdayModalManager(
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
                    new BirthdayModalManager();

                manager.init();
            }

            return manager;
        },

        open(
            modalId,
            options = {}
        ) {
            return this.getManager()
                .open(
                    modalId,
                    options
                );
        },

        close(
            modalId = null,
            options = {}
        ) {
            return this.getManager()
                .close(
                    modalId,
                    options
                );
        },

        closeAll(
            options = {}
        ) {
            return this.getManager()
                .closeAll(
                    options
                );
        },

        get(
            modalId
        ) {
            return this.getManager()
                .get(
                    modalId
                );
        },

        has(
            modalId
        ) {
            return this.getManager()
                .has(
                    modalId
                );
        },

        getActiveModal() {
            return this.getManager()
                .getActiveModal();
        },

        getActiveModalId() {
            return this.getManager()
                .getActiveModalId();
        },

        getOpenModals() {
            return this.getManager()
                .getOpenModals();
        },

        setContent(
            modalId,
            content
        ) {
            return this.getManager()
                .setContent(
                    modalId,
                    content
                );
        },

        setTitle(
            modalId,
            title
        ) {
            return this.getManager()
                .setTitle(
                    modalId,
                    title
                );
        },

        refresh() {
            return this.getManager()
                .refresh();
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

    window.BirthdayModalManager =
        BirthdayModalManager;

    window.ModalRecord =
        ModalRecord;

    window.SehrishModal =
        api;

    window.SehrishBirthdayModal =
        api;

    /* ------------------------------------------------------------------------
     * AUTO BOOT
     * --------------------------------------------------------------------- */

    const boot = () => {
        try {
            api.init();
        } catch (error) {
            console.error(
                "[SehrishModal] " +
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
     * OPTIONAL CROSS-MODULE HELPERS
     * --------------------------------------------------------------------- */

    window.addEventListener(
        "sehrish:modal:request-open",
        (event) => {
            const detail =
                event.detail ||
                {};

            if (
                detail.modal
            ) {
                void api.open(
                    detail.modal,
                    {
                        source:
                            "event"
                    }
                );
            }
        }
    );

    window.addEventListener(
        "sehrish:modal:request-close",
        (event) => {
            const detail =
                event.detail ||
                {};

            void api.close(
                detail.modal ||
                    null,
                {
                    source:
                        "event"
                }
            );
        }
    );

    console.info(
        `[SehrishModal] ` +
        `Modal module v${VERSION} loaded.`
    );
})();