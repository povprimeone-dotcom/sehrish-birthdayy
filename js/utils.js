/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/utils.js
 * Version: 1.0.0
 *
 * Production-ready shared utility library.
 *
 * Responsibilities:
 * - Common DOM utilities
 * - String / number / boolean normalization
 * - Timing helpers
 * - Randomization helpers
 * - Device / viewport helpers
 * - Animation helpers
 * - Safe JSON helpers
 * - Event helpers
 * - CSS variable helpers
 * - ID generation
 * - Promise utilities
 *
 * This module contains reusable helpers only.
 * It does not own application state or navigation.
 *
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const EVENTS = Object.freeze({
        ready:
            "sehrish:utils:ready"
    });

    /* ------------------------------------------------------------------------
     * TYPE HELPERS
     * --------------------------------------------------------------------- */

    const isObject = (value) => {
        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    };

    const isPlainObject = (value) => {
        if (
            !isObject(value)
        ) {
            return false;
        }

        const prototype =
            Object.getPrototypeOf(
                value
            );

        return (
            prototype ===
                Object.prototype ||
            prototype === null
        );
    };

    const isString = (value) => {
        return (
            typeof value === "string"
        );
    };

    const isNumber = (value) => {
        return (
            typeof value === "number" &&
            Number.isFinite(value)
        );
    };

    const isFunction = (value) => {
        return (
            typeof value === "function"
        );
    };

    const isElement = (value) => {
        return (
            value instanceof Element
        );
    };

    const isHTMLElement = (value) => {
        return (
            value instanceof HTMLElement
        );
    };

    const isNode = (value) => {
        return (
            value instanceof Node
        );
    };

    /* ------------------------------------------------------------------------
     * STRING HELPERS
     * --------------------------------------------------------------------- */

    const toString = (
        value,
        fallback = ""
    ) => {
        if (
            value === null ||
            value === undefined
        ) {
            return fallback;
        }

        return String(value);
    };

    const cleanString = (
        value,
        fallback = ""
    ) => {
        const result =
            toString(
                value,
                fallback
            ).trim();

        return result || fallback;
    };

    const normalizeId = (
        value,
        fallback = ""
    ) => {
        const normalized =
            cleanString(
                value,
                fallback
            )
                .replace(
                    /^#/,
                    ""
                )
                .replace(
                    /\s+/g,
                    "-"
                )
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    "-"
                )
                .replace(
                    /-+/g,
                    "-"
                )
                .replace(
                    /^-|-$/g,
                    ""
                )
                .toLowerCase();

        return (
            normalized ||
            fallback
        );
    };

    const toKebabCase = (
        value
    ) => {
        return cleanString(
            value
        )
            .replace(
                /([a-z0-9])([A-Z])/g,
                "$1-$2"
            )
            .replace(
                /[\s_]+/g,
                "-"
            )
            .replace(
                /-+/g,
                "-"
            )
            .toLowerCase();
    };

    const toCamelCase = (
        value
    ) => {
        const normalized =
            toKebabCase(
                value
            );

        return normalized.replace(
            /-([a-z0-9])/g,
            (
                _match,
                character
            ) =>
                character.toUpperCase()
        );
    };

    const toPascalCase = (
        value
    ) => {
        const camel =
            toCamelCase(
                value
            );

        if (
            !camel
        ) {
            return "";
        }

        return (
            camel.charAt(0)
                .toUpperCase() +
            camel.slice(1)
        );
    };

    const capitalize = (
        value
    ) => {
        const string =
            cleanString(
                value
            );

        if (
            !string
        ) {
            return "";
        }

        return (
            string.charAt(0)
                .toUpperCase() +
            string.slice(1)
        );
    };

    const truncate = (
        value,
        maxLength,
        suffix = "..."
    ) => {
        const string =
            toString(
                value
            );

        const length =
            Number(
                maxLength
            );

        if (
            !Number.isFinite(
                length
            ) ||
            length <= 0
        ) {
            return "";
        }

        if (
            string.length <=
            length
        ) {
            return string;
        }

        const safeSuffix =
            toString(
                suffix
            );

        if (
            safeSuffix.length >=
            length
        ) {
            return string.slice(
                0,
                length
            );
        }

        return (
            string.slice(
                0,
                length -
                    safeSuffix.length
            ) +
            safeSuffix
        );
    };

    /* ------------------------------------------------------------------------
     * BOOLEAN HELPERS
     * --------------------------------------------------------------------- */

    const toBoolean = (
        value,
        fallback = false
    ) => {
        if (
            typeof value ===
            "boolean"
        ) {
            return value;
        }

        if (
            value === null ||
            value === undefined
        ) {
            return fallback;
        }

        const normalized =
            String(
                value
            )
                .trim()
                .toLowerCase();

        if (
            [
                "true",
                "1",
                "yes",
                "y",
                "on"
            ].includes(
                normalized
            )
        ) {
            return true;
        }

        if (
            [
                "false",
                "0",
                "no",
                "n",
                "off"
            ].includes(
                normalized
            )
        ) {
            return false;
        }

        return fallback;
    };

    /* ------------------------------------------------------------------------
     * NUMBER HELPERS
     * --------------------------------------------------------------------- */

    const toNumber = (
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

    const toInteger = (
        value,
        fallback = 0
    ) => {
        const number =
            Number(value);

        return Number.isFinite(
            number
        )
            ? Math.round(
                  number
              )
            : fallback;
    };

    const clamp = (
        value,
        min,
        max
    ) => {
        const number =
            toNumber(
                value,
                min
            );

        const lower =
            Math.min(
                min,
                max
            );

        const upper =
            Math.max(
                min,
                max
            );

        return Math.min(
            Math.max(
                number,
                lower
            ),
            upper
        );
    };

    const lerp = (
        start,
        end,
        amount
    ) => {
        return (
            start +
            (
                end -
                start
            ) *
                clamp(
                    amount,
                    0,
                    1
                )
        );
    };

    const inverseLerp = (
        start,
        end,
        value
    ) => {
        if (
            start ===
            end
        ) {
            return 0;
        }

        return clamp(
            (
                value -
                start
            ) /
                (
                    end -
                    start
                ),
            0,
            1
        );
    };

    const mapRange = (
        value,
        inputMin,
        inputMax,
        outputMin,
        outputMax
    ) => {
        const amount =
            inverseLerp(
                inputMin,
                inputMax,
                value
            );

        return lerp(
            outputMin,
            outputMax,
            amount
        );
    };

    /* ------------------------------------------------------------------------
     * RANDOM HELPERS
     * --------------------------------------------------------------------- */

    const random = (
        min = 0,
        max = 1
    ) => {
        return (
            Math.random() *
                (
                    max -
                    min
                ) +
            min
        );
    };

    const randomInteger = (
        min = 0,
        max = 1
    ) => {
        const lower =
            Math.ceil(
                Math.min(
                    min,
                    max
                )
            );

        const upper =
            Math.floor(
                Math.max(
                    min,
                    max
                )
            );

        return Math.floor(
            random(
                lower,
                upper + 1
            )
        );
    };

    const randomBoolean = (
        probability = 0.5
    ) => {
        return (
            Math.random() <
            clamp(
                probability,
                0,
                1
            )
        );
    };

    const randomItem = (
        array,
        fallback = null
    ) => {
        if (
            !Array.isArray(
                array
            ) ||
            array.length ===
                0
        ) {
            return fallback;
        }

        return array[
            randomInteger(
                0,
                array.length - 1
            )
        ];
    };

    /* ------------------------------------------------------------------------
     * ARRAY HELPERS
     * --------------------------------------------------------------------- */

    const unique = (
        array
    ) => {
        if (
            !Array.isArray(
                array
            )
        ) {
            return [];
        }

        return [
            ...new Set(
                array
            )
        ];
    };

    const chunk = (
        array,
        size
    ) => {
        if (
            !Array.isArray(
                array
            )
        ) {
            return [];
        }

        const chunkSize =
            Math.max(
                1,
                toInteger(
                    size,
                    1
                )
            );

        const result =
            [];

        for (
            let index = 0;
            index <
            array.length;
            index +=
                chunkSize
        ) {
            result.push(
                array.slice(
                    index,
                    index +
                        chunkSize
                )
            );
        }

        return result;
    };

    const shuffle = (
        array
    ) => {
        if (
            !Array.isArray(
                array
            )
        ) {
            return [];
        }

        const result = [
            ...array
        ];

        for (
            let index =
                result.length -
                1;
            index > 0;
            index -=
                1
        ) {
            const target =
                randomInteger(
                    0,
                    index
                );

            [
                result[index],
                result[target]
            ] = [
                result[target],
                result[index]
            ];
        }

        return result;
    };

    const removeItem = (
        array,
        item
    ) => {
        if (
            !Array.isArray(
                array
            )
        ) {
            return false;
        }

        const index =
            array.indexOf(
                item
            );

        if (
            index === -1
        ) {
            return false;
        }

        array.splice(
            index,
            1
        );

        return true;
    };

    /* ------------------------------------------------------------------------
     * OBJECT HELPERS
     * --------------------------------------------------------------------- */

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
                /*
                 * Fall through to JSON clone.
                 */
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

    const merge = (
        ...objects
    ) => {
        const result =
            {};

        const assignObject =
            (
                target,
                source
            ) => {
                if (
                    !isPlainObject(
                        source
                    )
                ) {
                    return;
                }

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
                            isPlainObject(
                                value
                            )
                        ) {
                            if (
                                !isPlainObject(
                                    target[key]
                                )
                            ) {
                                target[key] =
                                    {};
                            }

                            assignObject(
                                target[key],
                                value
                            );
                        } else {
                            target[key] =
                                value;
                        }
                    }
                );
            };

        objects.forEach(
            (
                object
            ) => {
                assignObject(
                    result,
                    object
                );
            }
        );

        return result;
    };

    const pick = (
        object,
        keys
    ) => {
        if (
            !isObject(
                object
            ) ||
            !Array.isArray(
                keys
            )
        ) {
            return {};
        }

        const result =
            {};

        keys.forEach(
            (
                key
            ) => {
                if (
                    Object.prototype
                        .hasOwnProperty.call(
                            object,
                            key
                        )
                ) {
                    result[key] =
                        object[key];
                }
            }
        );

        return result;
    };

    /* ------------------------------------------------------------------------
     * SAFE JSON
     * --------------------------------------------------------------------- */

    const parseJSON = (
        value,
        fallback = null
    ) => {
        if (
            typeof value !==
            "string"
        ) {
            return fallback;
        }

        try {
            return JSON.parse(
                value
            );
        } catch {
            return fallback;
        }
    };

    const stringifyJSON = (
        value,
        fallback = null
    ) => {
        try {
            return JSON.stringify(
                value
            );
        } catch {
            return fallback;
        }
    };

    /* ------------------------------------------------------------------------
     * DOM SELECTORS
     * --------------------------------------------------------------------- */

    const qs = (
        selector,
        parent = document
    ) => {
        if (
            !parent ||
            !selector
        ) {
            return null;
        }

        try {
            return parent.querySelector(
                selector
            );
        } catch {
            return null;
        }
    };

    const qsa = (
        selector,
        parent = document
    ) => {
        if (
            !parent ||
            !selector
        ) {
            return [];
        }

        try {
            return Array.from(
                parent.querySelectorAll(
                    selector
                )
            );
        } catch {
            return [];
        }
    };

    const byId = (
        id
    ) => {
        if (
            !id
        ) {
            return null;
        }

        return document.getElementById(
            String(id)
        );
    };

    const closest = (
        element,
        selector
    ) => {
        if (
            !isElement(
                element
            ) ||
            !selector
        ) {
            return null;
        }

        try {
            return element.closest(
                selector
            );
        } catch {
            return null;
        }
    };

    /* ------------------------------------------------------------------------
     * DOM STATE
     * --------------------------------------------------------------------- */

    const show = (
        element
    ) => {
        if (
            !isHTMLElement(
                element
            )
        ) {
            return false;
        }

        element.hidden =
            false;

        element.removeAttribute(
            "hidden"
        );

        return true;
    };

    const hide = (
        element
    ) => {
        if (
            !isHTMLElement(
                element
            )
        ) {
            return false;
        }

        element.hidden =
            true;

        return true;
    };

    const toggle = (
        element,
        force
    ) => {
        if (
            !isHTMLElement(
                element
            )
        ) {
            return false;
        }

        if (
            typeof force ===
            "boolean"
        ) {
            element.hidden =
                !force;

            return force;
        }

        element.hidden =
            !element.hidden;

        return !element.hidden;
    };

    const setDisabled = (
        element,
        disabled
    ) => {
        if (
            !isHTMLElement(
                element
            )
        ) {
            return false;
        }

        const state =
            Boolean(
                disabled
            );

        if (
            "disabled" in
            element
        ) {
            element.disabled =
                state;
        }

        element.setAttribute(
            "aria-disabled",
            String(
                state
            )
        );

        if (
            state
        ) {
            element.classList.add(
                "is-disabled"
            );
        } else {
            element.classList.remove(
                "is-disabled"
            );
        }

        return true;
    };

    /* ------------------------------------------------------------------------
     * CLASS HELPERS
     * --------------------------------------------------------------------- */

    const addClasses = (
        element,
        ...classes
    ) => {
        if (
            !isElement(
                element
            )
        ) {
            return false;
        }

        const normalized =
            classes
                .flatMap(
                    (
                        value
                    ) =>
                        String(
                            value
                        )
                            .split(
                                /\s+/
                            )
                    )
                .filter(Boolean);

        element.classList.add(
            ...normalized
        );

        return true;
    };

    const removeClasses = (
        element,
        ...classes
    ) => {
        if (
            !isElement(
                element
            )
        ) {
            return false;
        }

        const normalized =
            classes
                .flatMap(
                    (
                        value
                    ) =>
                        String(
                            value
                        )
                            .split(
                                /\s+/
                            )
                    )
                .filter(Boolean);

        element.classList.remove(
            ...normalized
        );

        return true;
    };

    const toggleClass = (
        element,
        className,
        force
    ) => {
        if (
            !isElement(
                element
            ) ||
            !className
        ) {
            return false;
        }

        return element.classList.toggle(
            className,
            force
        );
    };

    /* ------------------------------------------------------------------------
     * ATTRIBUTE HELPERS
     * --------------------------------------------------------------------- */

    const getAttribute = (
        element,
        name,
        fallback = null
    ) => {
        if (
            !isElement(
                element
            ) ||
            !name
        ) {
            return fallback;
        }

        const value =
            element.getAttribute(
                name
            );

        return value ===
            null
            ? fallback
            : value;
    };

    const setAttribute = (
        element,
        name,
        value
    ) => {
        if (
            !isElement(
                element
            ) ||
            !name
        ) {
            return false;
        }

        element.setAttribute(
            name,
            String(
                value
            )
        );

        return true;
    };

    const setBooleanAttribute = (
        element,
        name,
        value
    ) => {
        if (
            !isElement(
                element
            ) ||
            !name
        ) {
            return false;
        }

        if (
            value
        ) {
            element.setAttribute(
                name,
                "true"
            );
        } else {
            element.setAttribute(
                name,
                "false"
            );
        }

        return true;
    };

    /* ------------------------------------------------------------------------
     * CSS VARIABLE HELPERS
     * --------------------------------------------------------------------- */

    const setCssVariable = (
        name,
        value,
        element =
            document.documentElement
    ) => {
        if (
            !isHTMLElement(
                element
            ) ||
            !name
        ) {
            return false;
        }

        const property =
            String(name).startsWith(
                "--"
            )
                ? String(name)
                : `--${name}`;

        element.style.setProperty(
            property,
            String(
                value
            )
        );

        return true;
    };

    const getCssVariable = (
        name,
        element =
            document.documentElement
    ) => {
        if (
            !isHTMLElement(
                element
            ) ||
            !name
        ) {
            return "";
        }

        const property =
            String(name).startsWith(
                "--"
            )
                ? String(name)
                : `--${name}`;

        return window
            .getComputedStyle(
                element
            )
            .getPropertyValue(
                property
            )
            .trim();
    };

    /* ------------------------------------------------------------------------
     * TIMING HELPERS
     * --------------------------------------------------------------------- */

    const delay = (
        milliseconds = 0
    ) => {
        const duration =
            Math.max(
                0,
                toNumber(
                    milliseconds,
                    0
                )
            );

        return new Promise(
            (
                resolve
            ) => {
                window.setTimeout(
                    resolve,
                    duration
                );
            }
        );
    };

    const nextFrame = () => {
        return new Promise(
            (
                resolve
            ) => {
                requestAnimationFrame(
                    () => {
                        resolve();
                    }
                );
            }
        );
    };

    const twoFrames = async () => {
        await nextFrame();
        await nextFrame();
    };

    const raf = (
        callback
    ) => {
        if (
            !isFunction(
                callback
            )
        ) {
            return null;
        }

        return requestAnimationFrame(
            callback
        );
    };

    const cancelRaf = (
        id
    ) => {
        if (
            id === null ||
            id === undefined
        ) {
            return;
        }

        cancelAnimationFrame(
            id
        );
    };

    /* ------------------------------------------------------------------------
     * DEBOUNCE
     * --------------------------------------------------------------------- */

    const debounce = (
        callback,
        waitTime = 100
    ) => {
        if (
            !isFunction(
                callback
            )
        ) {
            throw new TypeError(
                "debounce callback must be a function."
            );
        }

        let timer =
            null;

        const debounced =
            function (
                ...args
            ) {
                if (
                    timer !==
                    null
                ) {
                    window.clearTimeout(
                        timer
                    );
                }

                timer =
                    window.setTimeout(
                        () => {
                            timer =
                                null;

                            callback.apply(
                                this,
                                args
                            );
                        },
                        Math.max(
                            0,
                            toNumber(
                                waitTime,
                                100
                            )
                        )
                    );
            };

        debounced.cancel =
            () => {
                if (
                    timer !==
                    null
                ) {
                    window.clearTimeout(
                        timer
                    );

                    timer =
                        null;
                }
            };

        debounced.flush =
            (
                ...args
            ) => {
                debounced.cancel();

                callback.apply(
                    this,
                    args
                );
            };

        return debounced;
    };

    /* ------------------------------------------------------------------------
     * THROTTLE
     * --------------------------------------------------------------------- */

    const throttle = (
        callback,
        interval = 100
    ) => {
        if (
            !isFunction(
                callback
            )
        ) {
            throw new TypeError(
                "throttle callback must be a function."
            );
        }

        let lastTime =
            0;

        let timer =
            null;

        let lastArgs =
            null;

        let lastThis =
            null;

        const invoke =
            () => {
                lastTime =
                    Date.now();

                timer =
                    null;

                callback.apply(
                    lastThis,
                    lastArgs
                );

                lastArgs =
                    null;

                lastThis =
                    null;
            };

        const throttled =
            function (
                ...args
            ) {
                const current =
                    Date.now();

                const remaining =
                    Math.max(
                        0,
                        interval -
                            (
                                current -
                                lastTime
                            )
                    );

                lastArgs =
                    args;

                lastThis =
                    this;

                if (
                    remaining ===
                    0
                ) {
                    invoke();
                } else if (
                    timer ===
                    null
                ) {
                    timer =
                        window.setTimeout(
                            invoke,
                            remaining
                        );
                }
            };

        throttled.cancel =
            () => {
                if (
                    timer !==
                    null
                ) {
                    window.clearTimeout(
                        timer
                    );

                    timer =
                        null;
                }

                lastArgs =
                    null;

                lastThis =
                    null;
            };

        return throttled;
    };

    /* ------------------------------------------------------------------------
     * TIMEOUT PROMISE
     * --------------------------------------------------------------------- */

    const timeoutPromise = (
        promise,
        milliseconds,
        fallback = null
    ) => {
        const duration =
            Math.max(
                0,
                toNumber(
                    milliseconds,
                    0
                )
            );

        if (
            duration ===
            0
        ) {
            return Promise.resolve(
                promise
            );
        }

        return Promise.race([
            Promise.resolve(
                promise
            ),

            delay(
                duration
            ).then(
                () =>
                    fallback
            )
        ]);
    };

    /* ------------------------------------------------------------------------
     * EVENT HELPERS
     * --------------------------------------------------------------------- */

    const dispatchEvent = (
        target,
        eventName,
        detail = {},
        options = {}
    ) => {
        if (
            !target ||
            !eventName
        ) {
            return false;
        }

        try {
            const event =
                new CustomEvent(
                    eventName,
                    {
                        bubbles:
                            options
                                .bubbles !==
                            false,

                        cancelable:
                            options
                                .cancelable ===
                            true,

                        composed:
                            options
                                .composed ===
                            true,

                        detail
                    }
                );

            return target.dispatchEvent(
                event
            );
        } catch {
            return false;
        }
    };

    const dispatchWindowEvent = (
        eventName,
        detail = {},
        options = {}
    ) => {
        return dispatchEvent(
            window,
            eventName,
            detail,
            options
        );
    };

    /* ------------------------------------------------------------------------
     * ID GENERATION
     * --------------------------------------------------------------------- */

    const generateId = (
        prefix = "id"
    ) => {
        const safePrefix =
            normalizeId(
                prefix,
                "id"
            );

        const timestamp =
            Date.now().toString(
                36
            );

        const randomPart =
            Math.random()
                .toString(36)
                .slice(
                    2,
                    10
                );

        return (
            `${safePrefix}-${timestamp}-${randomPart}`
        );
    };

    /* ------------------------------------------------------------------------
     * DEVICE HELPERS
     * --------------------------------------------------------------------- */

    const isTouchDevice = () => {
        return (
            "ontouchstart" in
                window ||
            (
                Number(
                    navigator
                        .maxTouchPoints
                ) > 0
            )
        );
    };

    const getDeviceMemory = (
        fallback = null
    ) => {
        const memory =
            Number(
                navigator
                    .deviceMemory
            );

        return Number.isFinite(
            memory
        )
            ? memory
            : fallback;
    };

    const getCpuCores = (
        fallback = null
    ) => {
        const cores =
            Number(
                navigator
                    .hardwareConcurrency
            );

        return Number.isFinite(
            cores
        )
            ? cores
            : fallback;
    };

    const isMobileViewport = (
        maxWidth = 600
    ) => {
        return (
            window.innerWidth <=
            maxWidth
        );
    };

    const isTabletViewport = (
        minWidth = 601,
        maxWidth = 1024
    ) => {
        return (
            window.innerWidth >=
                minWidth &&
            window.innerWidth <=
                maxWidth
        );
    };

    const isDesktopViewport = (
        minWidth = 1025
    ) => {
        return (
            window.innerWidth >=
            minWidth
        );
    };

    /* ------------------------------------------------------------------------
     * VIEWPORT HELPERS
     * --------------------------------------------------------------------- */

    const getViewport = () => {
        return {
            width:
                window.innerWidth ||
                document.documentElement
                    .clientWidth ||
                0,

            height:
                window.innerHeight ||
                document.documentElement
                    .clientHeight ||
                0,

            ratio:
                (
                    window.innerHeight
                )
                    ? (
                          window.innerWidth /
                          window.innerHeight
                      )
                    : 0,

            pixelRatio:
                Math.min(
                    window
                        .devicePixelRatio ||
                        1,
                    2
                )
        };
    };

    const getOrientation = () => {
        const viewport =
            getViewport();

        if (
            viewport.width ===
            viewport.height
        ) {
            return "square";
        }

        return viewport.width >
            viewport.height
            ? "landscape"
            : "portrait";
    };

    /* ------------------------------------------------------------------------
     * MOTION HELPERS
     * --------------------------------------------------------------------- */

    const prefersReducedMotion =
        () => {
            try {
                return window
                    .matchMedia(
                        "(prefers-reduced-motion: reduce)"
                    )
                    .matches;
            } catch {
                return false;
            }
        };

    const getAnimationDuration = (
        duration,
        respectReducedMotion = true
    ) => {
        if (
            respectReducedMotion &&
            prefersReducedMotion()
        ) {
            return 0;
        }

        return Math.max(
            0,
            toNumber(
                duration,
                0
            )
        );
    };

    /* ------------------------------------------------------------------------
     * FOCUS HELPERS
     * --------------------------------------------------------------------- */

    const getFocusableElements = (
        container = document
    ) => {
        if (
            !container
        ) {
            return [];
        }

        const selector =
            [
                "a[href]",
                "button:not([disabled])",
                "input:not([disabled]):not([type=\"hidden\"])",
                "select:not([disabled])",
                "textarea:not([disabled])",
                "[tabindex]:not([tabindex=\"-1\"])",
                "[contenteditable=\"true\"]"
            ].join(",");

        try {
            return Array.from(
                container.querySelectorAll(
                    selector
                )
            ).filter(
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

                    if (
                        element.hidden
                    ) {
                        return false;
                    }

                    if (
                        element.getAttribute(
                            "aria-hidden"
                        ) ===
                        "true"
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
                }
            );
        } catch {
            return [];
        }
    };

    const focusElement = (
        element,
        options = {}
    ) => {
        if (
            !isHTMLElement(
                element
            )
        ) {
            return false;
        }

        try {
            element.focus({
                preventScroll:
                    options
                        .preventScroll !==
                    false
            });

            return true;
        } catch {
            try {
                element.focus();

                return true;
            } catch {
                return false;
            }
        }
    };

    /* ------------------------------------------------------------------------
     * SCROLL HELPERS
     * --------------------------------------------------------------------- */

    const scrollToElement = (
        element,
        options = {}
    ) => {
        if (
            !isHTMLElement(
                element
            )
        ) {
            return false;
        }

        try {
            element.scrollIntoView({
                behavior:
                    options.behavior ||
                    (
                        prefersReducedMotion()
                            ? "auto"
                            : "smooth"
                    ),

                block:
                    options.block ||
                    "center",

                inline:
                    options.inline ||
                    "nearest"
            });

            return true;
        } catch {
            return false;
        }
    };

    const scrollToTop = (
        options = {}
    ) => {
        try {
            window.scrollTo({
                top:
                    0,

                left:
                    0,

                behavior:
                    options.behavior ||
                    (
                        prefersReducedMotion()
                            ? "auto"
                            : "smooth"
                    )
            });

            return true;
        } catch {
            return false;
        }
    };

    /* ------------------------------------------------------------------------
     * COLOR / STYLE HELPERS
     * --------------------------------------------------------------------- */

    const withAlpha = (
        color,
        alpha
    ) => {
        const value =
            cleanString(
                color
            );

        const opacity =
            clamp(
                alpha,
                0,
                1
            );

        if (
            !value
        ) {
            return "";
        }

        if (
            value.startsWith(
                "rgb("
            )
        ) {
            return value.replace(
                /^rgb\((.*?)\)$/i,
                `rgba($1, ${opacity})`
            );
        }

        if (
            value.startsWith(
                "rgba("
            )
        ) {
            return value.replace(
                /^rgba\((.*?),\s*[\d.]+\)$/i,
                `rgba($1, ${opacity})`
            );
        }

        if (
            /^#[0-9a-f]{6}$/i.test(
                value
            )
        ) {
            const r =
                parseInt(
                    value.slice(
                        1,
                        3
                    ),
                    16
                );

            const g =
                parseInt(
                    value.slice(
                        3,
                        5
                    ),
                    16
                );

            const b =
                parseInt(
                    value.slice(
                        5,
                        7
                    ),
                    16
                );

            return (
                `rgba(${r}, ${g}, ${b}, ${opacity})`
            );
        }

        if (
            /^#[0-9a-f]{3}$/i.test(
                value
            )
        ) {
            const r =
                parseInt(
                    value.charAt(1) +
                        value.charAt(1),
                    16
                );

            const g =
                parseInt(
                    value.charAt(2) +
                        value.charAt(2),
                    16
                );

            const b =
                parseInt(
                    value.charAt(3) +
                        value.charAt(3),
                    16
                );

            return (
                `rgba(${r}, ${g}, ${b}, ${opacity})`
            );
        }

        return value;
    };

    /* ------------------------------------------------------------------------
     * DATE HELPERS
     * --------------------------------------------------------------------- */

    const isValidDate = (
        value
    ) => {
        const date =
            value instanceof Date
                ? value
                : new Date(
                      value
                  );

        return !Number.isNaN(
            date.getTime()
        );
    };

    const toDate = (
        value,
        fallback = null
    ) => {
        const date =
            value instanceof Date
                ? new Date(
                      value.getTime()
                  )
                : new Date(
                      value
                  );

        return isValidDate(
            date
        )
            ? date
            : fallback;
    };

    const padNumber = (
        value,
        digits = 2
    ) => {
        return String(
            Math.trunc(
                toNumber(
                    value,
                    0
                )
            )
        ).padStart(
            digits,
            "0"
        );
    };

    const formatTime = (
        totalSeconds
    ) => {
        const seconds =
            Math.max(
                0,
                toInteger(
                    totalSeconds,
                    0
                )
            );

        const hours =
            Math.floor(
                seconds / 3600
            );

        const minutes =
            Math.floor(
                (
                    seconds %
                    3600
                ) /
                    60
            );

        const remainingSeconds =
            seconds %
            60;

        return {
            hours,
            minutes,
            seconds:
                remainingSeconds,

            formatted:
                `${padNumber(
                    hours
                )}:${padNumber(
                    minutes
                )}:${padNumber(
                    remainingSeconds
                )}`
        };
    };

    /* ------------------------------------------------------------------------
     * MEDIA HELPERS
     * --------------------------------------------------------------------- */

    const getMediaAspectRatio = (
        media
    ) => {
        if (
            !media
        ) {
            return 0;
        }

        const width =
            Number(
                media.videoWidth ||
                    media.naturalWidth ||
                    media.width
            );

        const height =
            Number(
                media.videoHeight ||
                    media.naturalHeight ||
                    media.height
            );

        if (
            !Number.isFinite(
                width
            ) ||
            !Number.isFinite(
                height
            ) ||
            width <= 0 ||
            height <= 0
        ) {
            return 0;
        }

        return (
            width /
            height
        );
    };

    const classifyAspectRatio = (
        ratio
    ) => {
        const value =
            Number(ratio);

        if (
            !Number.isFinite(
                value
            ) ||
            value <= 0
        ) {
            return {
                ratio:
                    0,

                type:
                    "unknown",

                orientation:
                    "unknown",

                isLandscape:
                    false,

                isPortrait:
                    false,

                isSquare:
                    false,

                isYouTube:
                    false,

                isReel:
                    false
            };
        }

        const square =
            value >=
                0.9 &&
            value <=
                1.1;

        const portrait =
            value <
            0.9;

        const landscape =
            value >
            1.1;

        return {
            ratio:
                value,

            type:
                square
                    ? "square"
                    : portrait
                      ? "portrait"
                      : "landscape",

            orientation:
                square
                    ? "square"
                    : portrait
                      ? "portrait"
                      : "landscape",

            isLandscape:
                landscape,

            isPortrait:
                portrait,

            isSquare:
                square,

            isYouTube:
                value >=
                    1.6 &&
                value <=
                    1.85,

            isReel:
                value >=
                    0.5 &&
                value <=
                    0.67
        };
    };

    /* ------------------------------------------------------------------------
     * CLIPBOARD HELPERS
     * --------------------------------------------------------------------- */

    const copyText = async (
        text
    ) => {
        const value =
            toString(
                text
            );

        if (
            !value
        ) {
            return false;
        }

        if (
            navigator.clipboard &&
            isFunction(
                navigator.clipboard
                    .writeText
            )
        ) {
            try {
                await navigator.clipboard.writeText(
                    value
                );

                return true;
            } catch {
                /*
                 * Fall through to the
                 * legacy method.
                 */
            }
        }

        const textarea =
            document.createElement(
                "textarea"
            );

        textarea.value =
            value;

        textarea.setAttribute(
            "readonly",
            ""
        );

        textarea.style.position =
            "fixed";

        textarea.style.opacity =
            "0";

        textarea.style.pointerEvents =
            "none";

        document.body.appendChild(
            textarea
        );

        textarea.select();

        let successful =
            false;

        try {
            successful =
                document.execCommand(
                    "copy"
                );
        } catch {
            successful =
                false;
        }

        textarea.remove();

        return successful;
    };

    /* ------------------------------------------------------------------------
     * SHARE HELPERS
     * --------------------------------------------------------------------- */

    const share = async (
        data = {}
    ) => {
        if (
            !navigator.share
        ) {
            return {
                supported:
                    false,

                shared:
                    false
            };
        }

        try {
            await navigator.share(
                data
            );

            return {
                supported:
                    true,

                shared:
                    true
            };
        } catch (
            error
        ) {
            return {
                supported:
                    true,

                shared:
                    false,

                cancelled:
                    error?.name ===
                    "AbortError",

                error
            };
        }
    };

    /* ------------------------------------------------------------------------
     * SAFE URL HELPERS
     * --------------------------------------------------------------------- */

    const isSafeUrl = (
        value
    ) => {
        const url =
            toString(
                value
            ).trim();

        if (
            !url
        ) {
            return false;
        }

        if (
            url.startsWith(
                "#"
            )
        ) {
            return true;
        }

        try {
            const parsed =
                new URL(
                    url,
                    window.location
                        .href
                );

            return [
                "http:",
                "https:",
                "mailto:",
                "tel:"
            ].includes(
                parsed.protocol
            );
        } catch {
            return false;
        }
    };

    /* ------------------------------------------------------------------------
     * EVENT LISTENER HELPERS
     * --------------------------------------------------------------------- */

    const once = (
        target,
        eventName,
        handler,
        options = {}
    ) => {
        if (
            !target ||
            !isFunction(
                handler
            )
        ) {
            return () => {};
        }

        const wrapped =
            (
                event
            ) => {
                try {
                    handler(
                        event
                    );
                } finally {
                    target.removeEventListener(
                        eventName,
                        wrapped,
                        options
                    );
                }
            };

        target.addEventListener(
            eventName,
            wrapped,
            options
        );

        return () => {
            target.removeEventListener(
                eventName,
                wrapped,
                options
            );
        };
    };

    /* ------------------------------------------------------------------------
     * MEDIA QUERY HELPER
     * --------------------------------------------------------------------- */

    const mediaQuery = (
        query
    ) => {
        try {
            return window.matchMedia(
                query
            );
        } catch {
            return null;
        }
    };

    /* ------------------------------------------------------------------------
     * NETWORK / ONLINE STATUS
     * --------------------------------------------------------------------- */

    const isOnline = () => {
        return navigator.onLine !==
            false;
    };

    /* ------------------------------------------------------------------------
     * SAFE ERROR HANDLER
     * --------------------------------------------------------------------- */

    const safeCall = (
        callback,
        fallback = null,
        ...args
    ) => {
        if (
            !isFunction(
                callback
            )
        ) {
            return fallback;
        }

        try {
            return callback(
                ...args
            );
        } catch (
            error
        ) {
            console.warn(
                "[SehrishUtils] " +
                "Callback execution failed.",
                error
            );

            return fallback;
        }
    };

    /* ------------------------------------------------------------------------
     * PUBLIC API
     * --------------------------------------------------------------------- */

    const api = Object.freeze({
        VERSION,

        /* Types */
        isObject,
        isPlainObject,
        isString,
        isNumber,
        isFunction,
        isElement,
        isHTMLElement,
        isNode,

        /* Strings */
        toString,
        cleanString,
        normalizeId,
        toKebabCase,
        toCamelCase,
        toPascalCase,
        capitalize,
        truncate,

        /* Booleans */
        toBoolean,

        /* Numbers */
        toNumber,
        toInteger,
        clamp,
        lerp,
        inverseLerp,
        mapRange,

        /* Random */
        random,
        randomInteger,
        randomBoolean,
        randomItem,

        /* Arrays */
        unique,
        chunk,
        shuffle,
        removeItem,

        /* Objects */
        deepClone,
        merge,
        pick,

        /* JSON */
        parseJSON,
        stringifyJSON,

        /* DOM */
        qs,
        qsa,
        byId,
        closest,

        show,
        hide,
        toggle,
        setDisabled,

        /* Classes */
        addClasses,
        removeClasses,
        toggleClass,

        /* Attributes */
        getAttribute,
        setAttribute,
        setBooleanAttribute,

        /* CSS */
        setCssVariable,
        getCssVariable,

        /* Timing */
        delay,
        nextFrame,
        twoFrames,
        raf,
        cancelRaf,
        debounce,
        throttle,
        timeoutPromise,

        /* Events */
        dispatchEvent,
        dispatchWindowEvent,
        once,

        /* IDs */
        generateId,

        /* Device */
        isTouchDevice,
        getDeviceMemory,
        getCpuCores,
        isMobileViewport,
        isTabletViewport,
        isDesktopViewport,

        /* Viewport */
        getViewport,
        getOrientation,

        /* Motion */
        prefersReducedMotion,
        getAnimationDuration,

        /* Focus */
        getFocusableElements,
        focusElement,

        /* Scroll */
        scrollToElement,
        scrollToTop,

        /* Style */
        withAlpha,

        /* Dates */
        isValidDate,
        toDate,
        padNumber,
        formatTime,

        /* Media */
        getMediaAspectRatio,
        classifyAspectRatio,

        /* Clipboard */
        copyText,

        /* Share */
        share,

        /* URL */
        isSafeUrl,

        /* Media query */
        mediaQuery,

        /* Network */
        isOnline,

        /* Errors */
        safeCall
    });

    /* ------------------------------------------------------------------------
     * GLOBAL EXPORTS
     * --------------------------------------------------------------------- */

    window.SehrishUtils =
        api;

    window.SehrishBirthdayUtils =
        api;

    window.BirthdayUtils =
        api;

    /* ------------------------------------------------------------------------
     * READY EVENT
     * --------------------------------------------------------------------- */

    const boot = () => {
        dispatchWindowEvent(
            EVENTS.ready,
            {
                version:
                    VERSION,

                utilityCount:
                    Object.keys(
                        api
                    ).length
            }
        );

        console.info(
            `[SehrishUtils] ` +
            `Utilities module v${VERSION} loaded.`
        );
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
})();