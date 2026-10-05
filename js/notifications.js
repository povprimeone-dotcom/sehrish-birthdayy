/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/notifications.js
 * Version: 1.0.0
 *
 * Production-ready notification / toast manager.
 *
 * Responsibilities:
 * - Toast notifications
 * - Success / info / warning / error states
 * - Notification queue
 * - Multiple simultaneous notifications
 * - Auto-dismiss
 * - Manual close
 * - Progress indicator
 * - Accessibility / aria-live
 * - Keyboard support
 * - Reduced-motion support
 * - Custom notification events
 * - Cross-module integration
 * - Public API
 *
 * No external library required.
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const DEFAULTS = Object.freeze({
        enabled: true,

        position: "top-right",

        duration: 3200,

        maxVisible: 4,

        pauseOnHover: true,

        pauseOnFocus: true,

        closeButton: true,

        progressBar: true,

        animationDuration: 320,

        stackSpacing: 12,

        newestOnTop: true,

        queueWhenFull: true,

        respectReducedMotion: true,

        allowHtml: false
    });

    const TYPES = Object.freeze({
        success: "success",
        info: "info",
        warning: "warning",
        error: "error"
    });

    const EVENTS = Object.freeze({
        ready:
            "sehrish:notifications:ready",

        shown:
            "sehrish:notification:shown",

        closed:
            "sehrish:notification:closed",

        queued:
            "sehrish:notification:queued",

        cleared:
            "sehrish:notifications:cleared"
    });

    const SELECTORS = Object.freeze({
        root:
            "[data-notifications-root]",

        toast:
            "[data-notification]",

        close:
            "[data-notification-close]"
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
            Math.max(value, min),
            max
        );
    };

    const normalizeType = (
        type
    ) => {
        const normalized =
            String(
                type ||
                    TYPES.info
            )
                .trim()
                .toLowerCase();

        return Object.values(
            TYPES
        ).includes(
            normalized
        )
            ? normalized
            : TYPES.info;
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
            /* Ignore event failures. */
        }
    };

    const createId = () => {
        return (
            "notification-" +
            Date.now().toString(36) +
            "-" +
            Math.random()
                .toString(36)
                .slice(2, 9)
        );
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

    /* ------------------------------------------------------------------------
     * NOTIFICATION MODEL
     * --------------------------------------------------------------------- */

    class BirthdayNotification {
        constructor(
            options = {}
        ) {
            this.id =
                options.id ||
                createId();

            this.type =
                normalizeType(
                    options.type
                );

            this.title =
                String(
                    options.title ||
                        ""
                );

            this.message =
                String(
                    options.message ||
                        ""
                );

            this.duration =
                Number.isFinite(
                    options.duration
                )
                    ? Math.max(
                          0,
                          options.duration
                      )
                    : 3200;

            this.persistent =
                options.persistent ===
                true;

            this.closeable =
                options.closeable !==
                false;

            this.createdAt =
                Date.now();

            this.shownAt =
                null;

            this.closedAt =
                null;

            this.element =
                null;

            this.timer =
                null;

            this.remaining =
                this.duration;

            this.paused =
                false;

            this.pauseStartedAt =
                null;

            this.closed =
                false;

            this.shown =
                false;

            this.metadata = {
                source:
                    options.source ||
                    "api",

                icon:
                    options.icon ||
                    null,

                actionText:
                    options.actionText ||
                    null,

                action:
                    typeof options.action ===
                    "function"
                        ? options.action
                        : null
            };
        }

        markShown() {
            this.shown =
                true;

            this.shownAt =
                Date.now();
        }

        markClosed() {
            this.closed =
                true;

            this.closedAt =
                Date.now();
        }

        getState() {
            return {
                id:
                    this.id,

                type:
                    this.type,

                title:
                    this.title,

                message:
                    this.message,

                duration:
                    this.duration,

                remaining:
                    this.remaining,

                persistent:
                    this.persistent,

                shown:
                    this.shown,

                closed:
                    this.closed,

                createdAt:
                    this.createdAt,

                shownAt:
                    this.shownAt,

                closedAt:
                    this.closedAt,

                source:
                    this.metadata
                        .source
            };
        }
    }

    /* ------------------------------------------------------------------------
     * NOTIFICATION MANAGER
     * --------------------------------------------------------------------- */

    class BirthdayNotificationManager {
        constructor(
            options = {}
        ) {
            this.options = {
                ...DEFAULTS,
                ...options
            };

            this.root =
                null;

            this.queue =
                [];

            this.visible =
                [];

            this.history =
                [];

            this.initialized =
                false;

            this.destroyed =
                false;

            this.listeners =
                [];

            this.counter =
                0;
        }

        /* --------------------------------------------------------------------
         * INITIALIZE
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

            this.createRoot();

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
         * CREATE ROOT
         * ----------------------------------------------------------------- */

        createRoot() {
            const existing =
                document.querySelector(
                    SELECTORS.root
                );

            if (existing) {
                this.root =
                    existing;
            } else {
                this.root =
                    document.createElement(
                        "div"
                    );

                this.root.dataset
                    .notificationsRoot =
                    "true";

                document.body.appendChild(
                    this.root
                );
            }

            this.root.classList.add(
                "birthday-notifications",
                `notifications-${this.options.position}`
            );

            this.root.setAttribute(
                "aria-live",
                "polite"
            );

            this.root.setAttribute(
                "aria-atomic",
                "false"
            );

            this.root.setAttribute(
                "role",
                "region"
            );

            this.root.setAttribute(
                "aria-label",
                "Birthday notifications"
            );

            this.root.style.setProperty(
                "--notification-gap",
                `${this.options.stackSpacing}px`
            );

            this.root.style.position =
                "fixed";

            this.root.style.zIndex =
                "10000";

            this.root.style.pointerEvents =
                "none";

            if (
                this.options.position ===
                "top-left"
            ) {
                this.root.style.top =
                    "20px";

                this.root.style.left =
                    "20px";

                this.root.style.right =
                    "auto";
            } else if (
                this.options.position ===
                "bottom-left"
            ) {
                this.root.style.bottom =
                    "20px";

                this.root.style.left =
                    "20px";

                this.root.style.right =
                    "auto";

                this.root.style.top =
                    "auto";
            } else if (
                this.options.position ===
                "bottom-right"
            ) {
                this.root.style.bottom =
                    "20px";

                this.root.style.right =
                    "20px";

                this.root.style.left =
                    "auto";

                this.root.style.top =
                    "auto";
            } else if (
                this.options.position ===
                "bottom-center"
            ) {
                this.root.style.bottom =
                    "20px";

                this.root.style.left =
                    "50%";

                this.root.style.transform =
                    "translateX(-50%)";

                this.root.style.top =
                    "auto";

                this.root.style.right =
                    "auto";
            } else {
                this.root.style.top =
                    "20px";

                this.root.style.right =
                    "20px";

                this.root.style.left =
                    "auto";

                this.root.style.bottom =
                    "auto";
            }
        }

        /* --------------------------------------------------------------------
         * EVENT BINDING
         * ----------------------------------------------------------------- */

        bindEvents() {
            this.addListener(
                this.root,
                "click",
                (event) =>
                    this.handleClick(
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
         * SHOW
         * ----------------------------------------------------------------- */

        show(
            options = {}
        ) {
            if (
                !this.initialized ||
                this.destroyed ||
                !this.options.enabled
            ) {
                return null;
            }

            const notification =
                new BirthdayNotification(
                    {
                        ...options,

                        duration:
                            Number.isFinite(
                                options.duration
                            )
                                ? options.duration
                                : this.options
                                      .duration
                    }
                );

            if (
                this.visible.length >=
                this.options.maxVisible
            ) {
                if (
                    this.options
                        .queueWhenFull
                ) {
                    this.queue.push(
                        notification
                    );

                    dispatch(
                        EVENTS.queued,
                        {
                            manager:
                                this,

                            notification
                        }
                    );

                    return notification
                        .id;
                }

                const oldest =
                    this.options
                        .newestOnTop
                        ? this.visible[
                              this.visible.length -
                                  1
                          ]
                        : this.visible[0];

                if (oldest) {
                    void this.close(
                        oldest.id,
                        "limit"
                    );
                }
            }

            this.render(
                notification
            );

            return notification
                .id;
        }

        /* --------------------------------------------------------------------
         * SUCCESS
         * ----------------------------------------------------------------- */

        success(
            message,
            options = {}
        ) {
            return this.show({
                ...options,

                type:
                    TYPES.success,

                message
            });
        }

        /* --------------------------------------------------------------------
         * INFO
         * ----------------------------------------------------------------- */

        info(
            message,
            options = {}
        ) {
            return this.show({
                ...options,

                type:
                    TYPES.info,

                message
            });
        }

        /* --------------------------------------------------------------------
         * WARNING
         * ----------------------------------------------------------------- */

        warning(
            message,
            options = {}
        ) {
            return this.show({
                ...options,

                type:
                    TYPES.warning,

                message
            });
        }

        /* --------------------------------------------------------------------
         * ERROR
         * ----------------------------------------------------------------- */

        error(
            message,
            options = {}
        ) {
            return this.show({
                ...options,

                type:
                    TYPES.error,

                message
            });
        }

        /* --------------------------------------------------------------------
         * RENDER NOTIFICATION
         * ----------------------------------------------------------------- */

        render(
            notification
        ) {
            const element =
                document.createElement(
                    "article"
                );

            element.dataset
                .notification =
                "true";

            element.dataset
                .notificationId =
                notification.id;

            element.dataset
                .notificationType =
                notification.type;

            element.className =
                [
                    "birthday-notification",
                    `notification-${notification.type}`
                ].join(" ");

            element.setAttribute(
                "role",
                notification.type ===
                    TYPES.error
                    ? "alert"
                    : "status"
            );

            element.setAttribute(
                "tabindex",
                "0"
            );

            /* Main content wrapper. */
            const content =
                document.createElement(
                    "div"
                );

            content.className =
                "notification-content";

            /* Icon. */
            const icon =
                document.createElement(
                    "div"
                );

            icon.className =
                "notification-icon";

            icon.setAttribute(
                "aria-hidden",
                "true"
            );

            icon.textContent =
                notification.metadata
                    .icon ||
                this.getDefaultIcon(
                    notification.type
                );

            content.appendChild(
                icon
            );

            /* Text wrapper. */
            const text =
                document.createElement(
                    "div"
                );

            text.className =
                "notification-text";

            if (
                notification.title
            ) {
                const title =
                    document.createElement(
                        "div"
                    );

                title.className =
                    "notification-title";

                title.textContent =
                    notification.title;

                text.appendChild(
                    title
                );
            }

            const message =
                document.createElement(
                    "div"
                );

            message.className =
                "notification-message";

            if (
                this.options
                    .allowHtml
            ) {
                message.innerHTML =
                    notification.message;
            } else {
                message.textContent =
                    notification.message;
            }

            text.appendChild(
                message
            );

            content.appendChild(
                text
            );

            /* Optional action. */
            if (
                notification.metadata
                    .actionText &&
                notification.metadata
                    .action
            ) {
                const action =
                    document.createElement(
                        "button"
                    );

                action.type =
                    "button";

                action.className =
                    "notification-action";

                action.textContent =
                    notification
                        .metadata
                        .actionText;

                action.addEventListener(
                    "click",
                    (event) => {
                        event.stopPropagation();

                        try {
                            notification
                                .metadata
                                .action();
                        } catch (
                            error
                        ) {
                            console.error(
                                "[SehrishNotifications] " +
                                "Notification action failed:",
                                error
                            );
                        }
                    }
                );

                text.appendChild(
                    action
                );
            }

            element.appendChild(
                content
            );

            /* Close button. */
            if (
                this.options
                    .closeButton &&
                notification.closeable
            ) {
                const closeButton =
                    document.createElement(
                        "button"
                    );

                closeButton.type =
                    "button";

                closeButton.className =
                    "notification-close";

                closeButton.dataset
                    .notificationClose =
                    "true";

                closeButton.setAttribute(
                    "aria-label",
                    "Close notification"
                );

                closeButton.innerHTML =
                    "&times;";

                element.appendChild(
                    closeButton
                );
            }

            /* Progress bar. */
            if (
                this.options
                    .progressBar &&
                !notification.persistent &&
                notification.duration >
                    0
            ) {
                const progress =
                    document.createElement(
                        "div"
                    );

                progress.className =
                    "notification-progress";

                const progressBar =
                    document.createElement(
                        "div"
                    );

                progressBar.className =
                    "notification-progress-bar";

                progress.appendChild(
                    progressBar
                );

                element.appendChild(
                    progress
                );

                notification.progressBar =
                    progressBar;
            }

            notification.element =
                element;

            if (
                this.options
                    .newestOnTop
            ) {
                this.root.prepend(
                    element
                );

                this.visible.unshift(
                    notification
                );
            } else {
                this.root.appendChild(
                    element
                );

                this.visible.push(
                    notification
                );
            }

            notification.markShown();

            element.style.pointerEvents =
                "auto";

            this.prepareAnimation(
                notification,
                "enter"
            );

            this.startTimer(
                notification
            );

            this.history.push(
                notification
            );

            dispatch(
                EVENTS.shown,
                {
                    manager:
                        this,

                    notification
                }
            );

            return notification.id;
        }

        /* --------------------------------------------------------------------
         * DEFAULT ICON
         * ----------------------------------------------------------------- */

        getDefaultIcon(
            type
        ) {
            switch (
                type
            ) {
                case TYPES.success:
                    return "✓";

                case TYPES.warning:
                    return "⚠";

                case TYPES.error:
                    return "!";

                case TYPES.info:
                default:
                    return "i";
            }
        }

        /* --------------------------------------------------------------------
         * ANIMATION
         * ----------------------------------------------------------------- */

        prepareAnimation(
            notification,
            mode
        ) {
            const element =
                notification.element;

            if (!element) {
                return;
            }

            if (
                this.options
                    .respectReducedMotion &&
                prefersReducedMotion()
            ) {
                return;
            }

            const className =
                mode === "enter"
                    ? "notification-enter"
                    : "notification-leave";

            element.classList.add(
                className
            );

            requestAnimationFrame(
                () => {
                    element.classList.add(
                        "notification-visible"
                    );
                }
            );

            if (
                mode === "leave"
            ) {
                window.setTimeout(
                    () => {
                        element.classList.remove(
                            className,
                            "notification-visible"
                        );
                    },
                    this.options
                        .animationDuration
                );
            }
        }

        /* --------------------------------------------------------------------
         * START TIMER
         * ----------------------------------------------------------------- */

        startTimer(
            notification
        ) {
            if (
                notification.persistent ||
                notification.duration <=
                    0
            ) {
                return;
            }

            notification.remaining =
                notification.duration;

            const startedAt =
                Date.now();

            notification.timer =
                {
                    startedAt,

                    timeout:
                        window.setTimeout(
                            () => {
                                void this.close(
                                    notification.id,
                                    "timeout"
                                );
                            },
                            notification.duration
                        )
                };

            if (
                notification.progressBar
            ) {
                notification.progressBar.style.width =
                    "100%";

                notification.progressBar.style.transition =
                    `width ${notification.duration}ms linear`;

                requestAnimationFrame(
                    () => {
                        notification.progressBar.style.width =
                            "0%";
                    }
                );
            }
        }

        /* --------------------------------------------------------------------
         * PAUSE
         * ----------------------------------------------------------------- */

        pause(
            notificationId
        ) {
            const notification =
                this.get(
                    notificationId
                );

            if (
                !notification ||
                notification.paused ||
                !notification.timer
            ) {
                return false;
            }

            notification.paused =
                true;

            notification.pauseStartedAt =
                Date.now();

            window.clearTimeout(
                notification.timer
                    .timeout
            );

            const elapsed =
                Date.now() -
                notification.timer
                    .startedAt;

            notification.remaining =
                clamp(
                    notification.duration -
                        elapsed,
                    0,
                    notification.duration
                );

            if (
                notification.progressBar
            ) {
                const computed =
                    window.getComputedStyle(
                        notification
                            .progressBar
                    );

                notification.progressBar.style.transition =
                    "none";

                notification.progressBar.style.width =
                    computed.width;
            }

            return true;
        }

        /* --------------------------------------------------------------------
         * RESUME
         * ----------------------------------------------------------------- */

        resume(
            notificationId
        ) {
            const notification =
                this.get(
                    notificationId
                );

            if (
                !notification ||
                !notification.paused
            ) {
                return false;
            }

            notification.paused =
                false;

            if (
                notification.remaining <=
                0
            ) {
                void this.close(
                    notification.id,
                    "timeout"
                );

                return false;
            }

            const remaining =
                notification.remaining;

            notification.timer =
                {
                    startedAt:
                        Date.now(),

                    timeout:
                        window.setTimeout(
                            () => {
                                void this.close(
                                    notification.id,
                                    "timeout"
                                );
                            },
                            remaining
                        )
                };

            if (
                notification.progressBar
            ) {
                notification.progressBar.style.transition =
                    "none";

                requestAnimationFrame(
                    () => {
                        notification.progressBar.style.transition =
                            `width ${remaining}ms linear`;

                        notification.progressBar.style.width =
                            "0%";
                    }
                );
            }

            return true;
        }

        /* --------------------------------------------------------------------
         * CLICK HANDLER
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

            const closeButton =
                event.target.closest(
                    SELECTORS.close
                );

            if (
                closeButton
            ) {
                const notification =
                    closeButton.closest(
                        SELECTORS.toast
                    );

                const id =
                    notification?.dataset
                        ?.notificationId;

                if (id) {
                    event.preventDefault();

                    void this.close(
                        id,
                        "manual"
                    );
                }

                return;
            }

            const toast =
                event.target.closest(
                    SELECTORS.toast
                );

            if (!toast) {
                return;
            }

            const id =
                toast.dataset
                    .notificationId;

            const notification =
                this.get(
                    id
                );

            if (!notification) {
                return;
            }

            if (
                this.options
                    .pauseOnHover
            ) {
                this.pause(
                    id
                );

                window.setTimeout(
                    () => {
                        if (
                            !notification.closed
                        ) {
                            this.resume(
                                id
                            );
                        }
                    },
                    1800
                );
            }
        }

        /* --------------------------------------------------------------------
         * CLOSE
         * ----------------------------------------------------------------- */

        async close(
            notificationId,
            reason = "manual"
        ) {
            const notification =
                this.get(
                    notificationId
                );

            if (
                !notification ||
                notification.closed
            ) {
                return false;
            }

            if (
                notification.timer
            ) {
                window.clearTimeout(
                    notification.timer
                        .timeout
                );

                notification.timer =
                    null;
            }

            const element =
                notification.element;

            notification.markClosed();

            if (
                element
            ) {
                if (
                    !(
                        this.options
                            .respectReducedMotion &&
                        prefersReducedMotion()
                    )
                ) {
                    element.classList.remove(
                        "notification-visible",
                        "notification-enter"
                    );

                    element.classList.add(
                        "notification-leave"
                    );

                    await wait(
                        this.options
                            .animationDuration
                    );
                }

                element.remove();
            }

            this.visible =
                this.visible.filter(
                    (
                        item
                    ) =>
                        item.id !==
                        notification.id
                );

            dispatch(
                EVENTS.closed,
                {
                    manager:
                        this,

                    notification,

                    reason
                }
            );

            this.showNextQueued();

            return true;
        }

        /* --------------------------------------------------------------------
         * SHOW QUEUED
         * ----------------------------------------------------------------- */

        showNextQueued() {
            if (
                !this.queue.length
            ) {
                return;
            }

            if (
                this.visible.length >=
                this.options.maxVisible
            ) {
                return;
            }

            const notification =
                this.queue.shift();

            if (
                notification
            ) {
                this.render(
                    notification
                );
            }
        }

        /* --------------------------------------------------------------------
         * CLEAR
         * ----------------------------------------------------------------- */

        async clear(
            reason = "clear"
        ) {
            const current =
                [
                    ...this.visible
                ];

            this.queue =
                [];

            for (
                const notification of
                    current
            ) {
                await this.close(
                    notification.id,
                    reason
                );
            }

            dispatch(
                EVENTS.cleared,
                {
                    manager:
                        this,

                    reason
                }
            );
        }

        /* --------------------------------------------------------------------
         * GET
         * ----------------------------------------------------------------- */

        get(
            notificationId
        ) {
            return (
                this.visible.find(
                    (
                        notification
                    ) =>
                        notification.id ===
                        notificationId
                ) ||
                this.queue.find(
                    (
                        notification
                    ) =>
                        notification.id ===
                        notificationId
                ) ||
                this.history.find(
                    (
                        notification
                    ) =>
                        notification.id ===
                        notificationId
                ) ||
                null
            );
        }

        /* --------------------------------------------------------------------
         * GET VISIBLE
         * ----------------------------------------------------------------- */

        getVisible() {
            return [
                ...this.visible
            ];
        }

        /* --------------------------------------------------------------------
         * GET QUEUE
         * ----------------------------------------------------------------- */

        getQueue() {
            return [
                ...this.queue
            ];
        }

        /* --------------------------------------------------------------------
         * GET HISTORY
         * ----------------------------------------------------------------- */

        getHistory() {
            return [
                ...this.history
            ];
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

                enabled:
                    this.options.enabled,

                visibleCount:
                    this.visible.length,

                queueCount:
                    this.queue.length,

                historyCount:
                    this.history.length,

                visible:
                    this.visible.map(
                        (
                            notification
                        ) =>
                            notification
                                .getState()
                    ),

                queue:
                    this.queue.map(
                        (
                            notification
                        ) =>
                            notification
                                .getState()
                    )
            };
        }

        /* --------------------------------------------------------------------
         * ENABLE
         * ----------------------------------------------------------------- */

        enable() {
            this.options.enabled =
                true;

            return this;
        }

        /* --------------------------------------------------------------------
         * DISABLE
         * ----------------------------------------------------------------- */

        disable(
            clear = false
        ) {
            this.options.enabled =
                false;

            if (
                clear
            ) {
                void this.clear(
                    "disabled"
                );
            }

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

            this.visible.forEach(
                (
                    notification
                ) => {
                    if (
                        notification.timer
                    ) {
                        window.clearTimeout(
                            notification.timer
                                .timeout
                        );
                    }

                    notification.element?.remove();
                }
            );

            this.queue =
                [];

            this.visible =
                [];

            if (
                this.root &&
                this.root.dataset
                    .notificationsRoot ===
                    "true"
            ) {
                this.root.remove();
            }

            this.root =
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
                    new BirthdayNotificationManager(
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
                    new BirthdayNotificationManager();

                manager.init();
            }

            return manager;
        },

        show(
            options = {}
        ) {
            return this.getManager()
                .show(
                    options
                );
        },

        success(
            message,
            options = {}
        ) {
            return this.getManager()
                .success(
                    message,
                    options
                );
        },

        info(
            message,
            options = {}
        ) {
            return this.getManager()
                .info(
                    message,
                    options
                );
        },

        warning(
            message,
            options = {}
        ) {
            return this.getManager()
                .warning(
                    message,
                    options
                );
        },

        error(
            message,
            options = {}
        ) {
            return this.getManager()
                .error(
                    message,
                    options
                );
        },

        close(
            notificationId,
            reason = "manual"
        ) {
            return this.getManager()
                .close(
                    notificationId,
                    reason
                );
        },

        clear(
            reason = "clear"
        ) {
            return this.getManager()
                .clear(
                    reason
                );
        },

        pause(
            notificationId
        ) {
            return this.getManager()
                .pause(
                    notificationId
                );
        },

        resume(
            notificationId
        ) {
            return this.getManager()
                .resume(
                    notificationId
                );
        },

        getVisible() {
            return this.getManager()
                .getVisible();
        },

        getQueue() {
            return this.getManager()
                .getQueue();
        },

        getHistory() {
            return this.getManager()
                .getHistory();
        },

        getState() {
            return this.getManager()
                .getState();
        },

        enable() {
            return this.getManager()
                .enable();
        },

        disable(
            clear = false
        ) {
            return this.getManager()
                .disable(
                    clear
                );
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

    window.BirthdayNotification =
        BirthdayNotification;

    window.BirthdayNotificationManager =
        BirthdayNotificationManager;

    window.SehrishNotifications =
        api;

    window.SehrishBirthdayNotifications =
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
                "[SehrishNotifications] " +
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
     * CROSS-MODULE INTEGRATION
     * --------------------------------------------------------------------- */

    window.addEventListener(
        "sehrish:quiz:answer-correct",
        () => {
            api.success(
                "Correct answer! 💖",
                {
                    duration:
                        1800
                }
            );
        }
    );

    window.addEventListener(
        "sehrish:quiz:answer-wrong",
        () => {
            api.info(
                "Almost! Try again ✨",
                {
                    duration:
                        1800
                }
            );
        }
    );

    window.addEventListener(
        "sehrish:gifts:gift-opened",
        () => {
            api.success(
                "Gift opened! 🎁",
                {
                    duration:
                        1800
                }
            );
        }
    );

    window.addEventListener(
        "sehrish:letter:completed",
        () => {
            api.success(
                "Your letter is complete! 💌",
                {
                    duration:
                        2600
                }
            );
        }
    );

    window.addEventListener(
        "sehrish:cake:completed",
        () => {
            api.success(
                "Birthday cake completed! 🎂",
                {
                    duration:
                        2500
                }
            );
        }
    );

    console.info(
        `[SehrishNotifications] ` +
        `Notification module v${VERSION} loaded.`
    );
})();