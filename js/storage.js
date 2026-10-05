/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/storage.js
 * Version: 1.0.0
 *
 * Production-ready centralized client-side storage manager.
 *
 * Responsibilities:
 * - localStorage abstraction
 * - sessionStorage abstraction
 * - Namespaced storage keys
 * - JSON serialization / deserialization
 * - Safe storage access
 * - TTL-based temporary values
 * - Data removal
 * - Namespace clearing
 * - Full application reset
 * - Export / import
 * - Storage event synchronization
 * - Storage availability detection
 * - Cross-module storage events
 *
 * ========================================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------------------------
     * CONSTANTS
     * --------------------------------------------------------------------- */

    const VERSION = "1.0.0";

    const DEFAULTS = Object.freeze({
        namespace:
            "sehrish-birthday",

        version:
            "v1",

        storage:
            "local",

        autoMigrate:
            false,

        emitEvents:
            true
    });

    const STORAGE_TYPES = Object.freeze({
        local:
            "local",

        session:
            "session"
    });

    const EVENTS = Object.freeze({
        ready:
            "sehrish:storage:ready",

        set:
            "sehrish:storage:set",

        remove:
            "sehrish:storage:remove",

        clear:
            "sehrish:storage:clear",

        import:
            "sehrish:storage:import",

        reset:
            "sehrish:storage:reset",

        externalChange:
            "sehrish:storage:external-change"
    });

    /* ------------------------------------------------------------------------
     * UTILITY FUNCTIONS
     * --------------------------------------------------------------------- */

    const isObject = (
        value
    ) => {
        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    };

    const safeJsonParse = (
        value,
        fallback = null
    ) => {
        if (
            typeof value !== "string"
        ) {
            return fallback;
        }

        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    };

    const safeJsonStringify = (
        value,
        fallback = null
    ) => {
        try {
            return JSON.stringify(value);
        } catch {
            return fallback;
        }
    };

    const normalizeKey = (
        value
    ) => {
        return String(
            value ?? ""
        )
            .trim()
            .replace(/[^a-zA-Z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase();
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
            /*
             * Storage should never break the app
             * because a CustomEvent could not be
             * dispatched.
             */
        }
    };

    /* ------------------------------------------------------------------------
     * STORAGE RECORD
     * --------------------------------------------------------------------- */

    class StorageRecord {
        constructor(
            key,
            value,
            options = {}
        ) {
            this.key =
                key;

            this.value =
                value;

            this.createdAt =
                options.createdAt ||
                Date.now();

            this.updatedAt =
                Date.now();

            this.expiresAt =
                Number.isFinite(
                    options.expiresAt
                )
                    ? options.expiresAt
                    : null;

            this.version =
                options.version ||
                VERSION;
        }

        isExpired() {
            if (
                this.expiresAt === null
            ) {
                return false;
            }

            return (
                Date.now() >=
                this.expiresAt
            );
        }

        toJSON() {
            return {
                key:
                    this.key,

                value:
                    this.value,

                createdAt:
                    this.createdAt,

                updatedAt:
                    this.updatedAt,

                expiresAt:
                    this.expiresAt,

                version:
                    this.version
            };
        }
    }

    /* ------------------------------------------------------------------------
     * STORAGE MANAGER
     * --------------------------------------------------------------------- */

    class BirthdayStorageManager {
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

            this.available =
                false;

            this.listeners =
                [];

            this.prefix =
                this.buildPrefix();

            this.backend =
                null;

            this.backendType =
                this.options.storage;

            this.memoryFallback =
                new Map();

            this.storageEventHandler =
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

            this.prefix =
                this.buildPrefix();

            this.resolveBackend();

            this.bindEvents();

            this.initialized =
                true;

            if (
                this.options.emitEvents
            ) {
                dispatch(
                    EVENTS.ready,
                    {
                        manager:
                            this,

                        available:
                            this.available,

                        backend:
                            this.backendType,

                        prefix:
                            this.prefix
                    }
                );
            }

            return this;
        }

        /* --------------------------------------------------------------------
         * PREFIX
         * ----------------------------------------------------------------- */

        buildPrefix() {
            const namespace =
                normalizeKey(
                    this.options.namespace
                );

            const version =
                normalizeKey(
                    this.options.version
                );

            return `${namespace}:${version}:`;
        }

        /* --------------------------------------------------------------------
         * BACKEND
         * ----------------------------------------------------------------- */

        resolveBackend() {
            this.backend =
                null;

            this.available =
                false;

            const preferred =
                this.options.storage ===
                STORAGE_TYPES.session
                    ? "sessionStorage"
                    : "localStorage";

            try {
                const candidate =
                    window[
                        preferred
                    ];

                const testKey =
                    `${this.prefix}__availability_test__`;

                candidate.setItem(
                    testKey,
                    "ok"
                );

                candidate.removeItem(
                    testKey
                );

                this.backend =
                    candidate;

                this.available =
                    true;
            } catch {
                this.backend =
                    null;

                this.available =
                    false;
            }

            return this.available;
        }

        /* --------------------------------------------------------------------
         * EVENT BINDING
         * ----------------------------------------------------------------- */

        bindEvents() {
            this.storageEventHandler =
                (
                    event
                ) => {
                    this.handleExternalChange(
                        event
                    );
                };

            window.addEventListener(
                "storage",
                this.storageEventHandler
            );
        }

        /* --------------------------------------------------------------------
         * KEY
         * ----------------------------------------------------------------- */

        makeKey(
            key
        ) {
            const normalized =
                normalizeKey(
                    key
                );

            if (
                !normalized
            ) {
                throw new Error(
                    "[SehrishStorage] " +
                    "Storage key cannot be empty."
                );
            }

            return (
                this.prefix +
                normalized
            );
        }

        /* --------------------------------------------------------------------
         * SET VALUE
         * ----------------------------------------------------------------- */

        set(
            key,
            value,
            options = {}
        ) {
            const fullKey =
                this.makeKey(
                    key
                );

            const record =
                new StorageRecord(
                    fullKey,
                    value,
                    {
                        expiresAt:
                            this.getExpiry(
                                options
                            )
                    }
                );

            const serialized =
                safeJsonStringify(
                    record.toJSON()
                );

            if (
                serialized === null
            ) {
                return false;
            }

            let saved =
                false;

            if (
                this.backend
            ) {
                try {
                    this.backend.setItem(
                        fullKey,
                        serialized
                    );

                    saved =
                        true;
                } catch (
                    error
                ) {
                    console.warn(
                        "[SehrishStorage] " +
                        "Primary storage failed. " +
                        "Using memory fallback.",
                        error
                    );
                }
            }

            if (!saved) {
                this.memoryFallback.set(
                    fullKey,
                    serialized
                );

                saved =
                    true;
            }

            if (
                this.options.emitEvents
            ) {
                dispatch(
                    EVENTS.set,
                    {
                        manager:
                            this,

                        key,

                        fullKey,

                        value
                    }
                );
            }

            return saved;
        }

        /* --------------------------------------------------------------------
         * GET EXPIRY
         * ----------------------------------------------------------------- */

        getExpiry(
            options
        ) {
            if (
                Number.isFinite(
                    options.expiresAt
                )
            ) {
                return Math.max(
                    Date.now(),
                    options.expiresAt
                );
            }

            if (
                Number.isFinite(
                    options.ttl
                ) &&
                options.ttl > 0
            ) {
                return (
                    Date.now() +
                    options.ttl
                );
            }

            return null;
        }

        /* --------------------------------------------------------------------
         * GET VALUE
         * ----------------------------------------------------------------- */

        get(
            key,
            fallback = null
        ) {
            const fullKey =
                this.makeKey(
                    key
                );

            let raw =
                null;

            if (
                this.backend
            ) {
                try {
                    raw =
                        this.backend.getItem(
                            fullKey
                        );
                } catch {
                    raw =
                        null;
                }
            }

            if (
                raw === null
            ) {
                raw =
                    this.memoryFallback.get(
                        fullKey
                    ) ||
                    null;
            }

            if (
                raw === null
            ) {
                return fallback;
            }

            const record =
                safeJsonParse(
                    raw,
                    null
                );

            if (
                !record
            ) {
                return fallback;
            }

            if (
                Number.isFinite(
                    record.expiresAt
                ) &&
                Date.now() >=
                    record.expiresAt
            ) {
                this.remove(
                    key
                );

                return fallback;
            }

            return (
                "value" in
                record
                    ? record.value
                    : fallback
            );
        }

        /* --------------------------------------------------------------------
         * GET RECORD
         * ----------------------------------------------------------------- */

        getRecord(
            key
        ) {
            const fullKey =
                this.makeKey(
                    key
                );

            let raw =
                null;

            if (
                this.backend
            ) {
                try {
                    raw =
                        this.backend.getItem(
                            fullKey
                        );
                } catch {
                    raw =
                        null;
                }
            }

            if (
                raw === null
            ) {
                raw =
                    this.memoryFallback.get(
                        fullKey
                    ) ||
                    null;
            }

            if (
                raw === null
            ) {
                return null;
            }

            const record =
                safeJsonParse(
                    raw,
                    null
                );

            if (
                !record
            ) {
                return null;
            }

            if (
                Number.isFinite(
                    record.expiresAt
                ) &&
                Date.now() >=
                    record.expiresAt
            ) {
                this.remove(
                    key
                );

                return null;
            }

            return record;
        }

        /* --------------------------------------------------------------------
         * HAS VALUE
         * ----------------------------------------------------------------- */

        has(
            key
        ) {
            return (
                this.getRecord(
                    key
                ) !== null
            );
        }

        /* --------------------------------------------------------------------
         * REMOVE
         * ----------------------------------------------------------------- */

        remove(
            key
        ) {
            const fullKey =
                this.makeKey(
                    key
                );

            let removed =
                false;

            if (
                this.backend
            ) {
                try {
                    const existed =
                        this.backend.getItem(
                            fullKey
                        ) !== null;

                    this.backend.removeItem(
                        fullKey
                    );

                    removed =
                        existed;
                } catch {
                    removed =
                        false;
                }
            }

            if (
                this.memoryFallback.has(
                    fullKey
                )
            ) {
                this.memoryFallback.delete(
                    fullKey
                );

                removed =
                    true;
            }

            if (
                removed &&
                this.options.emitEvents
            ) {
                dispatch(
                    EVENTS.remove,
                    {
                        manager:
                            this,

                        key,

                        fullKey
                    }
                );
            }

            return removed;
        }

        /* --------------------------------------------------------------------
         * CLEAR NAMESPACE
         * ----------------------------------------------------------------- */

        clear() {
            const keys =
                this.getKeys();

            keys.forEach(
                (
                    key
                ) => {
                    if (
                        this.backend
                    ) {
                        try {
                            this.backend.removeItem(
                                key
                            );
                        } catch {
                            /*
                             * Ignore individual key
                             * removal errors.
                             */
                        }
                    }

                    this.memoryFallback.delete(
                        key
                    );
                }
            );

            if (
                this.options.emitEvents
            ) {
                dispatch(
                    EVENTS.clear,
                    {
                        manager:
                            this,

                        count:
                            keys.length
                    }
                );
            }

            return keys.length;
        }

        /* --------------------------------------------------------------------
         * GET KEYS
         * ----------------------------------------------------------------- */

        getKeys() {
            const keys =
                new Set();

            if (
                this.backend
            ) {
                try {
                    for (
                        let index = 0;
                        index <
                            this.backend
                                .length;
                        index +=
                            1
                    ) {
                        const key =
                            this.backend.key(
                                index
                            );

                        if (
                            key &&
                            key.startsWith(
                                this.prefix
                            )
                        ) {
                            keys.add(
                                key
                            );
                        }
                    }
                } catch {
                    /*
                     * Ignore enumeration failures.
                     */
                }
            }

            this.memoryFallback.forEach(
                (
                    _value,
                    key
                ) => {
                    if (
                        key.startsWith(
                            this.prefix
                        )
                    ) {
                        keys.add(
                            key
                        );
                    }
                }
            );

            return [
                ...keys
            ];
        }

        /* --------------------------------------------------------------------
         * GET USER KEYS
         * ----------------------------------------------------------------- */

        getUserKeys() {
            return this.getKeys().map(
                (
                    key
                ) =>
                    key.slice(
                        this.prefix.length
                    )
            );
        }

        /* --------------------------------------------------------------------
         * SET JSON
         * ----------------------------------------------------------------- */

        setJSON(
            key,
            value,
            options = {}
        ) {
            return this.set(
                key,
                value,
                options
            );
        }

        /* --------------------------------------------------------------------
         * GET JSON
         * ----------------------------------------------------------------- */

        getJSON(
            key,
            fallback = null
        ) {
            return this.get(
                key,
                fallback
            );
        }

        /* --------------------------------------------------------------------
         * UPDATE OBJECT
         * ----------------------------------------------------------------- */

        updateObject(
            key,
            updater,
            options = {}
        ) {
            if (
                typeof updater !==
                "function"
            ) {
                return false;
            }

            const current =
                this.get(
                    key,
                    {}
                );

            const safeCurrent =
                isObject(
                    current
                )
                    ? current
                    : {};

            let updated;

            try {
                updated =
                    updater(
                        {
                            ...safeCurrent
                        }
                    );
            } catch (
                error
            ) {
                console.error(
                    "[SehrishStorage] " +
                    "Object updater failed.",
                    error
                );

                return false;
            }

            if (
                !isObject(
                    updated
                )
            ) {
                return false;
            }

            return this.set(
                key,
                updated,
                options
            );
        }

        /* --------------------------------------------------------------------
         * SESSION STORAGE VALUE
         * ----------------------------------------------------------------- */

        setSession(
            key,
            value,
            options = {}
        ) {
            return this.runWithBackend(
                STORAGE_TYPES.session,
                (
                    backend
                ) =>
                    this.writeToBackend(
                        backend,
                        key,
                        value,
                        options
                    )
            );
        }

        /* --------------------------------------------------------------------
         * SESSION GET
         * ----------------------------------------------------------------- */

        getSession(
            key,
            fallback = null
        ) {
            return this.runWithBackend(
                STORAGE_TYPES.session,
                (
                    backend
                ) =>
                    this.readFromBackend(
                        backend,
                        key,
                        fallback
                    ),
                fallback
            );
        }

        /* --------------------------------------------------------------------
         * SESSION REMOVE
         * ----------------------------------------------------------------- */

        removeSession(
            key
        ) {
            return this.runWithBackend(
                STORAGE_TYPES.session,
                (
                    backend
                ) => {
                    const fullKey =
                        this.makeKey(
                            `session-${key}`
                        );

                    try {
                        backend.removeItem(
                            fullKey
                        );

                        return true;
                    } catch {
                        return false;
                    }
                },
                false
            );
        }

        /* --------------------------------------------------------------------
         * BACKEND HELPER
         * ----------------------------------------------------------------- */

        runWithBackend(
            type,
            callback,
            fallback = false
        ) {
            const backendName =
                type ===
                STORAGE_TYPES.session
                    ? "sessionStorage"
                    : "localStorage";

            try {
                const backend =
                    window[
                        backendName
                    ];

                return callback(
                    backend
                );
            } catch {
                return fallback;
            }
        }

        /* --------------------------------------------------------------------
         * WRITE RAW BACKEND
         * ----------------------------------------------------------------- */

        writeToBackend(
            backend,
            key,
            value,
            options
        ) {
            const fullKey =
                this.makeKey(
                    `session-${key}`
                );

            const record =
                new StorageRecord(
                    fullKey,
                    value,
                    {
                        expiresAt:
                            this.getExpiry(
                                options
                            )
                    }
                );

            const serialized =
                safeJsonStringify(
                    record.toJSON()
                );

            if (
                serialized === null
            ) {
                return false;
            }

            try {
                backend.setItem(
                    fullKey,
                    serialized
                );

                return true;
            } catch {
                return false;
            }
        }

        /* --------------------------------------------------------------------
         * READ RAW BACKEND
         * ----------------------------------------------------------------- */

        readFromBackend(
            backend,
            key,
            fallback
        ) {
            const fullKey =
                this.makeKey(
                    `session-${key}`
                );

            try {
                const raw =
                    backend.getItem(
                        fullKey
                    );

                if (
                    raw === null
                ) {
                    return fallback;
                }

                const record =
                    safeJsonParse(
                        raw,
                        null
                    );

                if (
                    !record
                ) {
                    return fallback;
                }

                if (
                    Number.isFinite(
                        record.expiresAt
                    ) &&
                    Date.now() >=
                        record.expiresAt
                ) {
                    backend.removeItem(
                        fullKey
                    );

                    return fallback;
                }

                return record.value;
            } catch {
                return fallback;
            }
        }

        /* --------------------------------------------------------------------
         * EXPORT
         * ----------------------------------------------------------------- */

        exportData(
            options = {}
        ) {
            const includeMetadata =
                options.includeMetadata !==
                false;

            const data = {};

            this.getUserKeys().forEach(
                (
                    key
                ) => {
                    const record =
                        this.getRecord(
                            key
                        );

                    if (
                        !record
                    ) {
                        return;
                    }

                    data[key] =
                        includeMetadata
                            ? record
                            : record.value;
                }
            );

            return {
                version:
                    VERSION,

                namespace:
                    this.options
                        .namespace,

                storage:
                    this.backendType,

                exportedAt:
                    Date.now(),

                data
            };
        }

        /* --------------------------------------------------------------------
         * IMPORT
         * ----------------------------------------------------------------- */

        importData(
            payload,
            options = {}
        ) {
            if (
                !payload ||
                typeof payload !==
                    "object"
            ) {
                return false;
            }

            const data =
                isObject(
                    payload.data
                )
                    ? payload.data
                    : null;

            if (
                !data
            ) {
                return false;
            }

            const replace =
                options.replace ===
                true;

            if (
                replace
            ) {
                this.clear();
            }

            let imported =
                0;

            Object.entries(
                data
            ).forEach(
                (
                    [
                        key,
                        value
                    ]
                ) => {
                    let actualValue =
                        value;

                    let storageOptions =
                        {};

                    if (
                        isObject(
                            value
                        ) &&
                        Object.prototype
                            .hasOwnProperty.call(
                                value,
                                "value"
                            )
                    ) {
                        actualValue =
                            value.value;

                        if (
                            Number.isFinite(
                                value.expiresAt
                            )
                        ) {
                            storageOptions =
                                {
                                    expiresAt:
                                        value.expiresAt
                                };
                        }
                    }

                    if (
                        this.set(
                            key,
                            actualValue,
                            storageOptions
                        )
                    ) {
                        imported +=
                            1;
                    }
                }
            );

            if (
                this.options.emitEvents
            ) {
                dispatch(
                    EVENTS.import,
                    {
                        manager:
                            this,

                        imported
                    }
                );
            }

            return imported;
        }

        /* --------------------------------------------------------------------
         * APPLICATION RESET
         * ----------------------------------------------------------------- */

        resetApplicationData() {
            const removed =
                this.clear();

            const knownPrefixes = [
                "sehrish-birthday:",
                "sehrish_birthday:"
            ];

            knownPrefixes.forEach(
                (
                    prefix
                ) => {
                    if (
                        this.backend
                    ) {
                        try {
                            const keys =
                                [];

                            for (
                                let index =
                                    0;
                                index <
                                    this.backend
                                        .length;
                                index +=
                                    1
                            ) {
                                const key =
                                    this.backend.key(
                                        index
                                    );

                                if (
                                    key &&
                                    key.startsWith(
                                        prefix
                                    )
                                ) {
                                    keys.push(
                                        key
                                    );
                                }
                            }

                            keys.forEach(
                                (
                                    key
                                ) => {
                                    try {
                                        this.backend.removeItem(
                                            key
                                        );
                                    } catch {
                                        /*
                                         * Ignore cleanup
                                         * errors.
                                         */
                                    }
                                }
                            );
                        } catch {
                            /*
                             * Ignore enumeration
                             * failures.
                             */
                        }
                    }
                }
            );

            this.memoryFallback.clear();

            if (
                this.options.emitEvents
            ) {
                dispatch(
                    EVENTS.reset,
                    {
                        manager:
                            this,

                        removed
                    }
                );
            }

            return removed;
        }

        /* --------------------------------------------------------------------
         * EXTERNAL STORAGE CHANGE
         * ----------------------------------------------------------------- */

        handleExternalChange(
            event
        ) {
            if (
                !event.key ||
                !event.key.startsWith(
                    this.prefix
                )
            ) {
                return;
            }

            if (
                this.options.emitEvents
            ) {
                dispatch(
                    EVENTS.externalChange,
                    {
                        manager:
                            this,

                        key:
                            event.key.slice(
                                this.prefix
                                    .length
                            ),

                        oldValue:
                            safeJsonParse(
                                event.oldValue,
                                null
                            ),

                        newValue:
                            safeJsonParse(
                                event.newValue,
                                null
                            )
                    }
                );
            }
        }

        /* --------------------------------------------------------------------
         * STORAGE SIZE
         * ----------------------------------------------------------------- */

        getSizeEstimate() {
            let total =
                0;

            this.getKeys().forEach(
                (
                    key
                ) => {
                    let value =
                        "";

                    if (
                        this.backend
                    ) {
                        try {
                            value =
                                this.backend.getItem(
                                    key
                                ) ||
                                "";
                        } catch {
                            value =
                                "";
                        }
                    }

                    if (
                        !value
                    ) {
                        value =
                            this.memoryFallback.get(
                                key
                            ) ||
                            "";
                    }

                    total +=
                        String(
                            key
                        ).length;

                    total +=
                        String(
                            value
                        ).length;
                }
            );

            return {
                characters:
                    total,

                approximateBytes:
                    total * 2,

                approximateKilobytes:
                    (
                        total * 2
                    ) /
                    1024
            };
        }

        /* --------------------------------------------------------------------
         * AVAILABILITY
         * ----------------------------------------------------------------- */

        isAvailable() {
            return this.available;
        }

        /* --------------------------------------------------------------------
         * GET STATE
         * ----------------------------------------------------------------- */

        getState() {
            return {
                version:
                    VERSION,

                initialized:
                    this.initialized,

                destroyed:
                    this.destroyed,

                available:
                    this.available,

                backend:
                    this.backendType,

                prefix:
                    this.prefix,

                keyCount:
                    this.getKeys()
                        .length,

                storageSize:
                    this.getSizeEstimate()
            };
        }

        /* --------------------------------------------------------------------
         * REFRESH
         * ----------------------------------------------------------------- */

        refresh() {
            this.resolveBackend();

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
                this.storageEventHandler
            ) {
                window.removeEventListener(
                    "storage",
                    this.storageEventHandler
                );

                this.storageEventHandler =
                    null;
            }

            this.listeners =
                [];

            this.memoryFallback.clear();

            this.backend =
                null;

            this.available =
                false;

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
                    new BirthdayStorageManager(
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
                    new BirthdayStorageManager();

                manager.init();
            }

            return manager;
        },

        set(
            key,
            value,
            options = {}
        ) {
            return this
                .getManager()
                .set(
                    key,
                    value,
                    options
                );
        },

        get(
            key,
            fallback = null
        ) {
            return this
                .getManager()
                .get(
                    key,
                    fallback
                );
        },

        getRecord(
            key
        ) {
            return this
                .getManager()
                .getRecord(
                    key
                );
        },

        has(
            key
        ) {
            return this
                .getManager()
                .has(
                    key
                );
        },

        remove(
            key
        ) {
            return this
                .getManager()
                .remove(
                    key
                );
        },

        clear() {
            return this
                .getManager()
                .clear();
        },

        getKeys() {
            return this
                .getManager()
                .getUserKeys();
        },

        setJSON(
            key,
            value,
            options = {}
        ) {
            return this
                .getManager()
                .setJSON(
                    key,
                    value,
                    options
                );
        },

        getJSON(
            key,
            fallback = null
        ) {
            return this
                .getManager()
                .getJSON(
                    key,
                    fallback
                );
        },

        updateObject(
            key,
            updater,
            options = {}
        ) {
            return this
                .getManager()
                .updateObject(
                    key,
                    updater,
                    options
                );
        },

        setSession(
            key,
            value,
            options = {}
        ) {
            return this
                .getManager()
                .setSession(
                    key,
                    value,
                    options
                );
        },

        getSession(
            key,
            fallback = null
        ) {
            return this
                .getManager()
                .getSession(
                    key,
                    fallback
                );
        },

        removeSession(
            key
        ) {
            return this
                .getManager()
                .removeSession(
                    key
                );
        },

        exportData(
            options = {}
        ) {
            return this
                .getManager()
                .exportData(
                    options
                );
        },

        importData(
            payload,
            options = {}
        ) {
            return this
                .getManager()
                .importData(
                    payload,
                    options
                );
        },

        resetApplicationData() {
            return this
                .getManager()
                .resetApplicationData();
        },

        getSizeEstimate() {
            return this
                .getManager()
                .getSizeEstimate();
        },

        isAvailable() {
            return this
                .getManager()
                .isAvailable();
        },

        refresh() {
            return this
                .getManager()
                .refresh();
        },

        getState() {
            return this
                .getManager()
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

    window.StorageRecord =
        StorageRecord;

    window.BirthdayStorageManager =
        BirthdayStorageManager;

    window.SehrishStorage =
        api;

    window.SehrishBirthdayStorage =
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
                "[SehrishStorage] " +
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
     * MODULE READY INTEGRATION
     * --------------------------------------------------------------------- */

    window.addEventListener(
        "sehrish:app:ready",
        () => {
            if (
                manager
            ) {
                manager.refresh();
            }
        }
    );

    console.info(
        `[SehrishStorage] ` +
        `Storage module v${VERSION} loaded.`
    );
})();