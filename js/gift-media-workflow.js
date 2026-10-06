(() => {
    "use strict";

    /**
     * ========================================================================
     * SEHRISH BIRTHDAY — GIFT MEDIA WORKFLOW V13
     * ========================================================================
     * Design rule:
     * - gifts.js owns gift opening, animation, state and completion.
     * - this file only presents the already-revealed video and adds media UX.
     * - no click-capture takeover of gift opening.
     * - no MutationObserver on the gift area.
     * - no manual mutation of the gift manager during first open.
     *
     * Additional responsibilities preserved from the previous workflow:
     * - Q1 reel download control.
     * - voice-note replay/download UI synchronization.
     * - final photo viewer.
     * - final-photo scratch-card interaction.
     * ========================================================================
     */

    const GIFT_MEDIA = Object.freeze({
        rootSelector: "#birthday-gifts",
        giftSelector: "[data-gift][data-gift-id]",
        revealSelector: "[data-gift-reveal], .gift-reveal",
        videoSelector: "video.gift-video",
        overlayId: "sbg-gift-media-v13-overlay",
        bodyClass: "sbg-gift-media-v13-open",
        hiddenOriginalClass: "sbg-gift-original-media-hidden",
        closeClass: "sbg-gift-media-v13-close",
        downloadClass: "sbg-gift-media-v14-download",
        stylesId: "sbg-gift-media-v13-styles"
    });

    let activeGiftId = null;
    let giftMediaBridgeBound = false;

    function getGiftRoot() {
        return document.querySelector(GIFT_MEDIA.rootSelector);
    }

    function getGiftElement(giftId) {
        const root = getGiftRoot();
        if (!root || !giftId || typeof CSS === "undefined" || typeof CSS.escape !== "function") {
            return null;
        }
        return root.querySelector(
            `${GIFT_MEDIA.giftSelector}[data-gift-id="${CSS.escape(String(giftId))}"]`
        );
    }

    function getGiftManager() {
        try {
            if (window.SehrishGifts && typeof window.SehrishGifts.manager === "function") {
                return window.SehrishGifts.manager();
            }
        } catch (error) {
            console.warn("[GiftMediaV11] Gift manager unavailable:", error);
        }
        return null;
    }

    function getManagedGift(giftId) {
        const manager = getGiftManager();
        if (!manager?.gifts || !giftId) {
            return null;
        }
        return manager.gifts.find((gift) => String(gift.id) === String(giftId)) || null;
    }

    function getGiftReveal(giftElement) {
        return giftElement?.querySelector?.(GIFT_MEDIA.revealSelector) || null;
    }

    function getGiftVideo(giftElement) {
        return getGiftReveal(giftElement)?.querySelector?.(GIFT_MEDIA.videoSelector) || null;
    }

    function getGiftMediaSource(giftElement, video) {
        return (
            video?.currentSrc ||
            video?.getAttribute?.("src") ||
            giftElement?.dataset?.giftMedia ||
            ""
        );
    }

    function installGiftMediaV11Styles() {
        if (document.getElementById(GIFT_MEDIA.stylesId)) {
            return;
        }

        const style = document.createElement("style");
        style.id = GIFT_MEDIA.stylesId;
        style.textContent = `
            .sbg-gift-media-v14-portal {
                position: fixed !important;
                inset: 0 !important;
                z-index: 2147483647 !important;
                width: 100vw !important;
                height: 100vh !important;
                height: 100dvh !important;
                max-width: none !important;
                max-height: none !important;
                margin: 0 !important;
                padding: max(12px, env(safe-area-inset-top))
                         max(12px, env(safe-area-inset-right))
                         max(12px, env(safe-area-inset-bottom))
                         max(12px, env(safe-area-inset-left));
                box-sizing: border-box;
                display: flex !important;
                flex-direction: column !important;
                align-items: stretch !important;
                justify-content: stretch !important;
                background: rgba(255, 248, 252, 0.985);
                overflow: hidden !important;
                isolation: isolate;
                pointer-events: auto;
            }

            .sbg-gift-media-v14-portal[hidden] {
                display: none !important;
            }

            .sbg-gift-media-v14-portal__video-frame {
                position: relative;
                flex: 1 1 auto;
                min-height: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                display: grid !important;
                place-items: center !important;
                padding: 56px 4px 18px !important;
                margin: 0 !important;
                overflow: hidden !important;
                background: transparent !important;
                box-shadow: none !important;
                pointer-events: auto;
            }

            .sbg-gift-media-v14-portal video.gift-video {
                display: block !important;
                width: auto !important;
                height: auto !important;
                max-width: min(94vw, 1180px) !important;
                max-height: calc(100dvh - 150px) !important;
                object-fit: contain !important;
                object-position: center center !important;
                margin: 0 auto !important;
                border-radius: 20px !important;
                background: #171217;
                box-shadow: 0 24px 70px rgba(63, 41, 55, 0.24);
                pointer-events: auto;
            }

            .sbg-gift-media-v14-controls {
                flex: 0 0 auto;
                min-height: 62px;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 10px;
                padding: 8px 8px max(8px, env(safe-area-inset-bottom));
                box-sizing: border-box;
                z-index: 3;
            }

            .${GIFT_MEDIA.closeClass},
            .${GIFT_MEDIA.downloadClass} {
                position: static !important;
                flex: 0 0 auto;
                min-height: 44px;
                border: 1px solid rgba(125, 91, 112, 0.15);
                border-radius: 999px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0 16px;
                background: rgba(255, 250, 252, 0.98);
                color: #684d60;
                box-shadow: 0 10px 26px rgba(83, 56, 72, 0.14);
                font: 900 14px/1 "Nunito", sans-serif;
                cursor: pointer;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                pointer-events: auto !important;
                touch-action: manipulation;
            }

            .${GIFT_MEDIA.closeClass} {
                width: 48px;
                padding: 0;
                border-radius: 50%;
                font-size: 27px;
            }

            .${GIFT_MEDIA.downloadClass} {
                min-width: 118px;
                gap: 7px;
                background: linear-gradient(135deg, rgba(255,241,248,.98), rgba(239,226,255,.98));
            }

            .${GIFT_MEDIA.closeClass}:hover,
            .${GIFT_MEDIA.downloadClass}:hover {
                transform: translateY(-2px);
            }

            .${GIFT_MEDIA.closeClass}:focus-visible,
            .${GIFT_MEDIA.downloadClass}:focus-visible {
                outline: 3px solid rgba(221, 144, 180, 0.34);
                outline-offset: 3px;
            }

            .${GIFT_MEDIA.hiddenOriginalClass} {
                display: none !important;
                visibility: hidden !important;
                pointer-events: none !important;
                opacity: 0 !important;
            }

            body.${GIFT_MEDIA.bodyClass} {
                overflow: hidden !important;
            }

            @media (max-width: 700px) {
                .sbg-gift-media-v14-portal {
                    padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom)) 8px;
                }

                .sbg-gift-media-v14-portal__video-frame {
                    width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    flex: 1 1 auto !important;
                    padding: 48px 0 10px !important;
                }

                .sbg-gift-media-v14-portal video.gift-video {
                    max-width: 96vw !important;
                    max-height: calc(100dvh - 132px) !important;
                    border-radius: 16px !important;
                }

                .${GIFT_MEDIA.closeClass} {
                    width: 44px;
                    height: 44px;
                    font-size: 25px;
                }

                .${GIFT_MEDIA.downloadClass} {
                    min-width: 100px;
                    height: 43px;
                    padding: 0 13px;
                    font-size: 13px;
                }
            }

            @media (max-width: 420px) {
                .sbg-gift-media-v14-portal video.gift-video {
                    max-width: 94vw !important;
                    max-height: calc(100dvh - 128px) !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function safePause(video) {
        if (!video) return;
        try {
            video.pause();
            video.currentTime = 0;
        } catch {
            // Ignore media cleanup failures.
        }
    }

    function cleanupLegacyGiftControls(root = getGiftRoot()) {
        if (!root) return;
        root.querySelectorAll(
            '.gift-media-close, .gift-media-download, [data-gift-media-action="close"], [data-gift-media-action="download"]'
        ).forEach((node) => node.remove());
    }

    function hideAllOriginalGiftReveals(root = getGiftRoot()) {
        if (!root) return;
        cleanupLegacyGiftControls(root);
        root.querySelectorAll(GIFT_MEDIA.revealSelector).forEach((reveal) => {
            reveal.classList.add(GIFT_MEDIA.hiddenOriginalClass);
            reveal.setAttribute("aria-hidden", "true");
        });
    }

    function ensureGiftPortal() {
        let portal = document.getElementById(GIFT_MEDIA.overlayId);
        if (portal) {
            return portal;
        }

        portal = document.createElement("div");
        portal.id = GIFT_MEDIA.overlayId;
        portal.className = "sbg-gift-media-v14-portal";
        portal.hidden = true;
        portal.setAttribute("aria-hidden", "true");
        portal.setAttribute("role", "dialog");
        portal.setAttribute("aria-modal", "true");
        portal.setAttribute("aria-label", "Birthday gift video");

        const frame = document.createElement("div");
        frame.className = "sbg-gift-media-v11-portal__video-frame";

        const controls = document.createElement("div");
        controls.className = "sbg-gift-media-v14-controls";

        const close = document.createElement("button");
        close.type = "button";
        close.className = GIFT_MEDIA.closeClass;
        close.setAttribute("aria-label", "Close gift video");
        close.textContent = "×";

       const download = document.createElement("a");
       download.className = GIFT_MEDIA.downloadClass;
       download.setAttribute("aria-label", "Download gift video");
       download.title = "Download";
       download.download = "birthday-gift-video.mp4";
       download.innerHTML = `
            <span aria-hidden="true">↓</span>
            <span>Download</span>
       `;

        close.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            void closeGiftMedia();
        });

        download.addEventListener("click", (event) => {
            const portalNow = document.getElementById(GIFT_MEDIA.overlayId);
            const videoNow = getPortalVideo(portalNow);

            const source = activeGiftId
                ? getGiftMediaSource(
                    getGiftElement(activeGiftId),
                    videoNow
                )
                : videoNow?.currentSrc ||
                  videoNow?.src ||
                  "";

            if (!source) {
                event.preventDefault();
                return;
            }

            download.href = source;
        });

        controls.appendChild(close);
        controls.appendChild(download);
        portal.appendChild(frame);
        portal.appendChild(controls);

        document.body.appendChild(portal);
        return portal;
    }

    function getPortalVideo(portal) {
        return portal?.querySelector?.("video.sbg-gift-media-v11-video") || null;
    }

    function presentGiftMedia(giftId) {
        const giftElement = getGiftElement(giftId);
        if (!giftElement) {
            return false;
        }

        hideAllOriginalGiftReveals(getGiftRoot());

        const sourceVideo = getGiftVideo(giftElement);
        const source = getGiftMediaSource(giftElement, sourceVideo);
        if (!source) {
            console.warn("[GiftMediaV11] Missing gift video source:", giftId);
            return false;
        }

        installGiftMediaV11Styles();
        const portal = ensureGiftPortal();
        const frame = portal.querySelector(".sbg-gift-media-v11-portal__video-frame");
        if (!frame) {
            return false;
        }

        const oldVideo = getPortalVideo(portal);
        safePause(oldVideo);
        oldVideo?.remove();

        const video = document.createElement("video");
        video.className = "gift-video sbg-gift-media-v11-video";
        video.src = source;
        video.preload = "metadata";
        video.controls = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.setAttribute("aria-label", "Birthday gift video");

        frame.appendChild(video);

        const originalReveal = getGiftReveal(giftElement);
        originalReveal?.classList.add(GIFT_MEDIA.hiddenOriginalClass);
        if (sourceVideo) {
            safePause(sourceVideo);
        }

        activeGiftId = String(giftId);

        /* Keep the media layer truly viewport-bound even if a parent stylesheet
         * introduces a containing block or unexpected sizing rule. */
        portal.style.setProperty("position", "fixed", "important");
        portal.style.setProperty("inset", "0", "important");
        portal.style.setProperty("width", "100vw", "important");
        portal.style.setProperty("height", "100dvh", "important");
        portal.style.setProperty("max-width", "none", "important");
        portal.style.setProperty("max-height", "none", "important");

        portal.hidden = false;
        portal.setAttribute("aria-hidden", "false");
        document.body.classList.add(GIFT_MEDIA.bodyClass);

        video.addEventListener(
    "canplaythrough",
    () => {
        try {
            video.play()?.catch?.(() => {
                // Native controls remain available if autoplay is blocked.
            });
        } catch {
            // Browser media policy is non-fatal.
        }
    },
    { once: true }
);

video.load();

        return true;
    }

    async function resetGiftToClosedVisual(giftId) {
        const giftElement = getGiftElement(giftId);
        const managedGift = getManagedGift(giftId);
        const manager = getGiftManager();

        if (giftElement) {
            const reveal = getGiftReveal(giftElement);
            reveal?.classList.remove(GIFT_MEDIA.hiddenOriginalClass);
        }

        if (managedGift) {
            /*
             * Keep countedOnce=true and openedCount unchanged. This makes the
             * card visually close again without losing the fact that this gift
             * has already contributed to the 3-gift progress.
             */
            managedGift.opened = false;
            managedGift.revealed = false;
            managedGift.opening = false;
            managedGift.closing = false;
            managedGift.lastInteraction = Date.now();

            if (manager) {
                manager.selectedGiftId = null;
                if (typeof manager.updateGiftElement === "function") {
                    manager.updateGiftElement(managedGift);
                }
                if (typeof manager.updateUI === "function") {
                    manager.updateUI();
                }
            }
        }

        const portal = document.getElementById(GIFT_MEDIA.overlayId);
        portal?.setAttribute("aria-hidden", "true");
        if (portal) {
            portal.hidden = true;
        }

        document.body.classList.remove(GIFT_MEDIA.bodyClass);
        activeGiftId = null;
    }

    async function closeGiftMedia() {
        if (!activeGiftId) {
            return;
        }

        const giftId = String(activeGiftId);
        const portal = document.getElementById(GIFT_MEDIA.overlayId);
        const video = getPortalVideo(portal);
        safePause(video);

        /* Hide the portal immediately: X must always feel instant. */
        if (portal) {
            portal.hidden = true;
            portal.setAttribute("aria-hidden", "true");
        }
        document.body.classList.remove(GIFT_MEDIA.bodyClass);
        activeGiftId = null;

        const manager = getGiftManager();
        const managedGift = getManagedGift(giftId);

        try {
            if (manager && typeof manager.closeGift === "function") {
                await manager.closeGift(giftId);
            }
        } catch (error) {
            console.warn("[GiftMediaV13] Manager close failed:", error);
        }

        if (managedGift && manager) {
            managedGift.opened = false;
            managedGift.revealed = false;
            managedGift.opening = false;
            managedGift.closing = false;
            manager.selectedGiftId = null;

            if (typeof manager.updateGiftElement === "function") {
                manager.updateGiftElement(managedGift);
            }
            if (typeof manager.updateUI === "function") {
                manager.updateUI();
            }
        }

        hideAllOriginalGiftReveals(getGiftRoot());
    }

    async function downloadMedia(url, filename, button) {
        if (!url) {
            return;
        }

        const originalHTML = button?.innerHTML || "↓";
        if (button) {
            button.disabled = true;
            button.setAttribute("aria-busy", "true");
        }

        try {
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = filename || "birthday-gift-video.mp4";
            anchor.rel = "noopener";
            anchor.style.display = "none";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
        } catch (error) {
            console.warn("[GiftMediaV11] Blob download failed; browser fallback used.", error);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = filename || "birthday-gift-video.mp4";
            anchor.rel = "noopener";
            anchor.style.display = "none";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = originalHTML;
                button.removeAttribute("aria-busy");
            }
        }
    }

    function handleGiftRevealed(event) {
        const gift = event?.detail?.gift;
        const giftId = gift?.id || event?.detail?.id;
        if (!giftId) {
            return;
        }

        /*
         * IMPORTANT:
         * This handler does not move, resize, or make the original reveal
         * element fullscreen. A fresh portal is mounted directly under body.
         * That completely avoids transformed/contained scene frames clipping
         * a position:fixed child.
         */
        requestAnimationFrame(() => {
            presentGiftMedia(String(giftId));
        });
    }

    function bindGiftMediaControls() {
        const root = getGiftRoot();
        if (!root || giftMediaBridgeBound) {
            return;
        }

        giftMediaBridgeBound = true;
        installGiftMediaV11Styles();

        document.addEventListener("gift:revealed", handleGiftRevealed);

        document.addEventListener(
            "click",
            (event) => {
                const target = event.target;
                if (!(target instanceof Element)) {
                    return;
                }

                const openButton = target.closest(
                    '.gift-open[data-gift-action="open"]'
                );

                if (openButton && root.contains(openButton) && activeGiftId) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    return;
                }
            },
            true
        );

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && activeGiftId) {
                event.preventDefault();
                void closeGiftMedia();
            }
        });
    }

    /* ======================================================================
     * VOICE NOTE REPLAY + DOWNLOAD WORKFLOW V6
     * ======================================================================
     * Exact requested interaction:
     *
     * BEFORE the voice note finishes:
     *     ▶ Play / Ⅱ Pause
     *
     * AFTER the voice note finishes:
     *     ↻ Replay | ↓ Download
     *
     * The download button is deliberately NOT a floating button at the edge
     * of the browser window. It belongs to the same control row as Replay,
     * immediately beside it, so the relationship is obvious.
     *
     * The same rule is applied to both voice-note players:
     *     - Scene 5: birthday-note.mp3
     *     - Final scene: final-note.mp3
     *
     * The existing voice-controls.js remains responsible for play/pause and
     * replay behavior. This module observes the audio state and the Replay
     * button's hidden/visible state, then synchronizes the matching download
     * button without taking ownership of playback.
     */

    const VOICE_DOWNLOAD_CONFIG = Object.freeze([
        {
            playerSelector: '#birthday-voice-player',
            audioSelector: '#birthday-note-audio',
            replaySelector: '#birthday-voice-replay',
            buttonId: 'birthday-voice-download',
            fileName: 'birthday-note.mp3',
            ariaLabel: 'Download birthday voice note'
        },
        {
            playerSelector: '#final-voice-player',
            audioSelector: '#final-note-audio',
            replaySelector: '#final-voice-replay',
            buttonId: 'final-voice-download',
            fileName: 'final-note.mp3',
            ariaLabel: 'Download final voice note'
        }
    ]);

    let voiceDownloadEventsBound = false;
    let voiceDownloadObserver = null;
    let voiceAudioEventsBound = new WeakSet();
    let voiceDownloadRefreshTimer = null;

    function removeLegacyFloatingVoiceDownloads() {
        /*
         * Older iterations created a generic #voice-media-download button.
         * Remove every copy so an old injected button can never appear in the
         * bottom-left corner together with the new inline control.
         */
        document
            .querySelectorAll('#voice-media-download')
            .forEach((node) => node.remove());

        document
            .querySelectorAll('.voice-media-download--inline:not([data-voice-download-v6="true"])')
            .forEach((node) => node.remove());
    }

    function installVoiceDownloadStyles() {
        if (document.getElementById('gift-media-voice-download-styles-v6')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'gift-media-voice-download-styles-v6';
        style.textContent = `
            /* ==============================================================
               Voice-note media control row V6
               ==============================================================

               The button is deliberately a sibling of Replay. It is hidden
               until the audio has finished, so the finished state reads:

                   ↻ Replay   |   ↓ Download

               with the same cute scrapbook styling as the other controls.
            */
            .voice-player__controls,
            .final-voice-player__controls {
                position: relative !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex-wrap: wrap !important;
                gap: 9px !important;
                min-height: 54px !important;
            }

            /* --------------------------------------------------------------
               PLAYBACK POSITIONING
               --------------------------------------------------------------
               While the note is playing, the main Play/Pause button stays
               visually centered. Replay/Download remain hidden.
               After the audio ends, the primary button returns to normal
               flex flow on the left and Replay + Download appear beside it.
            */
            .voice-media-v6-playing .voice-player__controls,
            .voice-media-v6-playing .final-voice-player__controls {
                min-height: 58px !important;
            }

            .voice-media-v6-playing
            .voice-control-button--primary {
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                margin: 0 !important;
                transform: translate(-50%, -50%) !important;
                z-index: 4 !important;
            }

            .voice-media-v6-playing
            .voice-control-button--primary:hover {
                transform: translate(-50%, -52%) scale(1.025) !important;
            }

            .voice-media-v6-playing
            .voice-control-button--primary:active {
                transform: translate(-50%, -50%) scale(0.965) !important;
            }

            .voice-media-v6-finished
            .voice-control-button--primary,
            .voice-media-v6-finished
            .voice-control-button--primary:hover,
            .voice-media-v6-finished
            .voice-control-button--primary:active {
                position: relative !important;
                left: auto !important;
                top: auto !important;
                z-index: 2 !important;
                transform: none !important;
            }

            /* Keep the main control visibly correct during playback even if
               another stylesheet changes the player state classes. */
            .voice-media-v6-playing
            .voice-control-button__play {
                display: none !important;
            }

            .voice-media-v6-playing
            .voice-control-button__pause {
                display: inline !important;
                visibility: visible !important;
                opacity: 1 !important;
            }

            .voice-media-v6-finished
            .voice-control-button__pause {
                display: none !important;
            }

            .voice-media-v6-finished
            .voice-control-button__play {
                display: inline !important;
            }

            .voice-control-button--download-v6 {
                position: relative !important;
                width: auto !important;
                min-width: 112px !important;
                height: 46px !important;
                min-height: 46px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 7px !important;
                flex: 0 0 auto !important;
                margin: 0 !important;
                padding: 0 15px !important;
                border: 1px solid rgba(130, 94, 112, 0.14) !important;
                border-radius: 999px !important;
                background:
                    linear-gradient(
                        135deg,
                        rgba(255, 241, 248, 0.98),
                        rgba(239, 226, 255, 0.98)
                    ) !important;
                color: #6b4d63 !important;
                box-shadow:
                    0 8px 20px rgba(100, 65, 87, 0.13),
                    inset 0 1px 0 rgba(255, 255, 255, 0.78) !important;
                font-family: "Nunito", sans-serif !important;
                font-size: 14px !important;
                font-weight: 900 !important;
                line-height: 1 !important;
                letter-spacing: 0.01em !important;
                cursor: pointer !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
                transform: translateY(4px) scale(0.97) !important;
                transition:
                    opacity 180ms ease,
                    visibility 180ms ease,
                    transform 180ms ease,
                    box-shadow 180ms ease !important;
                -webkit-tap-highlight-color: transparent !important;
                white-space: nowrap !important;
            }

            .voice-control-button--download-v6.is-visible {
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
                transform: translateY(0) scale(1) !important;
            }

            .voice-control-button--download-v6:hover {
                transform: translateY(-2px) scale(1.025) !important;
                box-shadow:
                    0 11px 25px rgba(100, 65, 87, 0.17),
                    inset 0 1px 0 rgba(255, 255, 255, 0.84) !important;
            }

            .voice-control-button--download-v6:active {
                transform: translateY(0) scale(0.965) !important;
            }

            .voice-control-button--download-v6:disabled {
                opacity: 0.72 !important;
                cursor: wait !important;
            }

            .voice-control-button--download-v6 .media-download-button__icon {
                display: inline-grid !important;
                place-items: center !important;
                width: 25px !important;
                height: 25px !important;
                flex: 0 0 25px !important;
                color: currentColor !important;
                font-family: "Nunito", sans-serif !important;
                font-size: 24px !important;
                font-weight: 1000 !important;
                line-height: 0.82 !important;
                transform: translateY(-1px) !important;
            }

            .voice-control-button--download-v6 .media-download-button__label {
                display: inline-block !important;
                color: currentColor !important;
                font-family: "Nunito", sans-serif !important;
                font-size: 14px !important;
                font-weight: 950 !important;
                line-height: 1 !important;
                letter-spacing: 0.01em !important;
            }

            /* A finished voice note keeps Replay and Download together. */
            .voice-player__controls .voice-control-button--download-v6,
            .final-voice-player__controls .voice-control-button--download-v6 {
                order: 30 !important;
            }

            /* Do not let the media button become viewport-fixed. */
            .voice-control-button--download-v6,
            .voice-control-button--download-v6.is-visible {
                position: relative !important;
                left: auto !important;
                right: auto !important;
                top: auto !important;
                bottom: auto !important;
                z-index: 2 !important;
            }

            @media (max-width: 520px) {
                .voice-control-button--download-v6 {
                    min-width: 104px !important;
                    height: 44px !important;
                    min-height: 44px !important;
                    padding: 0 13px !important;
                    gap: 6px !important;
                    font-size: 13px !important;
                }

                .voice-control-button--download-v6 .media-download-button__icon {
                    width: 23px !important;
                    height: 23px !important;
                    flex-basis: 23px !important;
                    font-size: 22px !important;
                }

                .voice-control-button--download-v6 .media-download-button__label {
                    font-size: 13px !important;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .voice-control-button--download-v6 {
                    transition: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function getVoiceConfigForPlayer(player) {
        if (!player) {
            return null;
        }

        return VOICE_DOWNLOAD_CONFIG.find((config) =>
            player.matches(config.playerSelector)
        ) || null;
    }

    function getVoiceDownloadButton(config, player) {
        if (!config || !player) {
            return null;
        }

        const controls = player.querySelector(
            '.voice-player__controls, .final-voice-player__controls'
        );

        if (!controls) {
            return null;
        }

        let button = controls.querySelector(
            `#${CSS.escape(config.buttonId)}`
        );

        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.id = config.buttonId;
            button.className = 'voice-control-button voice-control-button--download-v6';
            button.dataset.voiceDownloadV6 = 'true';
            button.dataset.voiceDownloadAudio = config.audioSelector;
            button.dataset.voiceDownloadFilename = config.fileName;
            button.title = 'Download';
            button.setAttribute('aria-label', config.ariaLabel);
            button.hidden = true;
            button.innerHTML = `
                <span class="media-download-button__icon" aria-hidden="true">↓</span>
                <span class="media-download-button__label">Download</span>
            `;
        }

        if (button.parentElement !== controls) {
            controls.appendChild(button);
        }

        const replay = controls.querySelector(config.replaySelector);

        /*
         * Keep Download immediately beside Replay. If Replay is hidden before
         * completion, Download is hidden too, so the finished state appears
         * as one intentional pair instead of a stray button.
         */
        if (replay) {
            if (replay.nextElementSibling !== button) {
                replay.insertAdjacentElement('afterend', button);
            }
        } else if (button.parentElement !== controls) {
            controls.appendChild(button);
        }

        return button;
    }

    function getVoicePlayerState(config) {
        if (!config) {
            return null;
        }

        const player = document.querySelector(config.playerSelector);
        const audio = document.querySelector(config.audioSelector);
        const replay = player?.querySelector(config.replaySelector) || null;
        const button = player
            ? getVoiceDownloadButton(config, player)
            : null;

        if (!player || !audio || !button) {
            return null;
        }

        return {
            config,
            player,
            audio,
            replay,
            button
        };
    }

    function voiceAudioHasFinished(state) {
        if (!state?.audio) {
            return false;
        }

        const audio = state.audio;

        /* HTMLMediaElement.ended is the primary and most reliable signal. */
        if (audio.ended) {
            return true;
        }

        /*
         * The replay control is managed by voice-controls.js. When that
         * module unhides Replay after completion, use it as a second signal.
         */
        if (state.replay && !state.replay.hidden) {
            return true;
        }

        return false;
    }

    function setVoiceDownloadVisibility(state, visible) {
        if (!state?.button) {
            return;
        }

        const { button } = state;
        const shouldShow = Boolean(visible);

        button.hidden = !shouldShow;
        button.classList.toggle(
            'is-visible',
            shouldShow
        );

        if (shouldShow) {
            button.setAttribute(
                'aria-hidden',
                'false'
            );
        } else {
            button.setAttribute(
                'aria-hidden',
                'true'
            );
        }
    }

    function syncVoiceControlLayout(state) {
        if (!state?.player || !state?.audio) {
            return;
        }

        const { player, audio } = state;
        const isFinished = Boolean(audio.ended);
        const isPlaying = Boolean(
            !isFinished &&
            (audio.paused === false || player.classList.contains('is-playing'))
        );

        player.classList.toggle(
            'voice-media-v6-playing',
            isPlaying
        );

        player.classList.toggle(
            'voice-media-v6-finished',
            isFinished
        );

        const primary = player.querySelector(
            '.voice-control-button--primary'
        );

        if (primary) {
            primary.setAttribute(
                'data-voice-layout-state',
                isPlaying ? 'playing' : (isFinished ? 'finished' : 'ready')
            );
        }
    }

    function syncVoiceDownloadForState(state) {
        if (!state) {
            return;
        }

        syncVoiceControlLayout(state);

        const audio = state.audio;
        const replay = state.replay;

        if (!audio) {
            setVoiceDownloadVisibility(state, false);
            return;
        }

        const hasSource = Boolean(
            audio.currentSrc ||
            audio.src ||
            audio.getAttribute('src')
        );

        if (!hasSource) {
            setVoiceDownloadVisibility(state, false);
            return;
        }

        const finished = voiceAudioHasFinished(state);
        const replayVisible = Boolean(
            replay &&
            !replay.hidden &&
            replay.offsetParent !== null
        );

        /*
         * The requested rule is strict: Download accompanies Replay only when
         * the note has finished. During playback or a fresh replay it is hidden.
         */
        setVoiceDownloadVisibility(
            state,
            finished || replayVisible
        );
    }

    function syncAllVoiceDownloads() {
        VOICE_DOWNLOAD_CONFIG.forEach((config) => {
            const state = getVoicePlayerState(config);
            if (state) {
                syncVoiceDownloadForState(state);
            }
        });
    }

    function scheduleVoiceDownloadRefresh() {
        if (voiceDownloadRefreshTimer) {
            window.clearTimeout(voiceDownloadRefreshTimer);
        }

        voiceDownloadRefreshTimer = window.setTimeout(() => {
            voiceDownloadRefreshTimer = null;
            syncAllVoiceDownloads();
        }, 35);
    }

    function bindVoiceAudioEvents(state) {
        if (!state?.audio) {
            return;
        }

        const audio = state.audio;

        if (voiceAudioEventsBound.has(audio)) {
            return;
        }

        voiceAudioEventsBound.add(audio);

        const hideImmediately = () => {
            state.player.classList.add('voice-media-v6-playing');
            state.player.classList.remove('voice-media-v6-finished');
            setVoiceDownloadVisibility(state, false);
            scheduleVoiceDownloadRefresh();
        };

        const showAfterEnd = () => {
            state.player.classList.remove('voice-media-v6-playing');
            state.player.classList.add('voice-media-v6-finished');
            /*
             * First sync immediately, then sync again after voice-controls.js
             * has had a tick to reveal its Replay button.
             */
            setVoiceDownloadVisibility(state, true);
            scheduleVoiceDownloadRefresh();
            window.setTimeout(
                () => syncVoiceDownloadForState(state),
                70
            );
        };

        audio.addEventListener('play', hideImmediately);
        audio.addEventListener('playing', hideImmediately);
        audio.addEventListener('seeking', hideImmediately);
        audio.addEventListener('loadstart', hideImmediately);
        audio.addEventListener('emptied', hideImmediately);

        audio.addEventListener('pause', () => {
            if (audio.ended) {
                showAfterEnd();
                return;
            }

            hideImmediately();
        });

        audio.addEventListener('ended', showAfterEnd);
        audio.addEventListener('loadedmetadata', scheduleVoiceDownloadRefresh);
        audio.addEventListener('loadeddata', scheduleVoiceDownloadRefresh);
        audio.addEventListener('canplay', scheduleVoiceDownloadRefresh);
        audio.addEventListener('seeked', scheduleVoiceDownloadRefresh);
        audio.addEventListener('timeupdate', () => {
            if (audio.ended) {
                showAfterEnd();
            }
        });
    }

    function setupVoiceDownloads() {
        removeLegacyFloatingVoiceDownloads();
        installVoiceDownloadStyles();

        VOICE_DOWNLOAD_CONFIG.forEach((config) => {
            const state = getVoicePlayerState(config);
            if (!state) {
                return;
            }

            bindVoiceAudioEvents(state);
            syncVoiceDownloadForState(state);
        });

        if (!voiceDownloadEventsBound) {
            voiceDownloadEventsBound = true;

            document.addEventListener('click', (event) => {
                const target = event.target;
                const button = target instanceof Element
                    ? target.closest('.voice-control-button--download-v6')
                    : null;

                if (!button) {
                    return;
                }

                event.preventDefault();
                event.stopImmediatePropagation();

                const audioSelector =
                    button.dataset.voiceDownloadAudio || '';
                const filename =
                    button.dataset.voiceDownloadFilename ||
                    'birthday-voice-note.mp3';

                if (!audioSelector) {
                    return;
                }

                const audio = document.querySelector(audioSelector);

                if (!audio) {
                    console.warn(
                        '[GiftMedia] Voice download audio element not found:',
                        audioSelector
                    );
                    return;
                }

                if (!audio.ended) {
                    /*
                     * Do not allow a hidden/pre-completion button to download.
                     * This also protects against stale DOM state after replay.
                     */
                    return;
                }

                const source =
                    audio.currentSrc ||
                    audio.src ||
                    audio.getAttribute('src');

                if (!source) {
                    console.warn(
                        '[GiftMedia] Voice audio has no source.'
                    );
                    return;
                }

                void downloadMedia(
                    source,
                    filename,
                    button
                );
            }, true);

            /*
             * Any Play/Replay click immediately hides Download. If the player
             * later reaches the end, the audio `ended` event shows it again.
             */
            document.addEventListener('click', (event) => {
                const target = event.target;
                const replay = target instanceof Element
                    ? target.closest(
                        '#birthday-voice-replay, #final-voice-replay, [data-action="replay-audio"]'
                    )
                    : null;

                const play = target instanceof Element
                    ? target.closest(
                        '#birthday-voice-play, #final-voice-play, [data-action="play-audio"]'
                    )
                    : null;

                if (replay || play) {
                    window.setTimeout(() => {
                        const player = (replay || play)?.closest(
                            '.voice-player, .final-voice-player'
                        );

                        if (!player) {
                            syncAllVoiceDownloads();
                            return;
                        }

                        const config = getVoiceConfigForPlayer(player);
                        const state = getVoicePlayerState(config);

                        if (state) {
                            setVoiceDownloadVisibility(state, false);
                            window.setTimeout(
                                () => syncVoiceDownloadForState(state),
                                60
                            );
                        }
                    }, 0);
                }
            }, true);

            document.addEventListener('click', (event) => {
                if (event.target.closest?.('[data-nav]')) {
                    scheduleVoiceDownloadRefresh();
                    window.setTimeout(
                        syncAllVoiceDownloads,
                        120
                    );
                    window.setTimeout(
                        syncAllVoiceDownloads,
                        260
                    );
                }
            }, true);

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    removeLegacyFloatingVoiceDownloads();
                    scheduleVoiceDownloadRefresh();
                }
            });
        }

        /*
         * IMPORTANT STABILITY RULE:
         *
         * Do NOT observe document.body for class/hidden/aria-hidden changes.
         * `syncVoiceDownloadForState()` intentionally writes those attributes
         * while it synchronizes the player UI. A body-wide MutationObserver
         * would therefore wake itself again after every synchronization and
         * can produce an endless refresh loop, which is exactly the kind of
         * main-thread lock that causes Chrome's "Page Unresponsive" dialog.
         *
         * Voice state is already covered by: graph audio events (`play`,
         * `playing`, `pause`, `ended`, `timeupdate`, metadata events), the
         * explicit Play/Replay click hook, scene navigation hooks, and the
         * initial delayed synchronization passes below. No global observer is
         * needed.
         */
        voiceDownloadObserver = null;

        /*
         * One final pass after all existing modules have initialized. This is
         * useful because voice-controls.js may reveal Replay during its own
         * startup after our initial DOM query.
         */
        window.setTimeout(
            syncAllVoiceDownloads,
            90
        );
        window.setTimeout(
            syncAllVoiceDownloads,
            220
        );
        window.setTimeout(
            syncAllVoiceDownloads,
            420
        );
    }

    function createPhotoViewer() {
        let viewer = document.getElementById("final-photo-viewer");

        if (viewer) {
            return viewer;
        }

        viewer = document.createElement("div");
        viewer.id = "final-photo-viewer";
        viewer.className = "media-photo-viewer";
        viewer.setAttribute("aria-hidden", "true");
        viewer.hidden = true;

        viewer.innerHTML = `
            <div class="media-photo-viewer__backdrop" data-photo-viewer-close></div>

            <div
                class="media-photo-viewer__dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Photo preview"
            >
                <button
                    type="button"
                    class="media-photo-viewer__close"
                    data-photo-viewer-close
                    aria-label="Close photo"
                >
                    ×
                </button>

                <img
                    class="media-photo-viewer__image"
                    alt="Birthday memory photo"
                    draggable="false"
                >

                <button
                    type="button"
                    class="media-photo-viewer__download"
                    data-photo-viewer-download
                    aria-label="Download photo"
                    title="Download"
                >
                    <span class="media-download-button__icon" aria-hidden="true">↓</span>
                    <span class="media-download-button__label">Download</span>
                </button>
            </div>
        `;

        document.body.appendChild(viewer);
        return viewer;
    }

    function openPhotoViewer(image) {
        const viewer = createPhotoViewer();
        const target = viewer.querySelector(".media-photo-viewer__image");

        if (!target || !image) {
            return;
        }

        target.src = image.currentSrc || image.src;
        target.alt = image.alt || "Birthday memory photo";
        viewer.hidden = false;
        viewer.setAttribute("aria-hidden", "false");
        document.body.classList.add("media-photo-viewer-open");

        window.setTimeout(() => {
            viewer
                .querySelector(".media-photo-viewer__close")
                ?.focus();
        }, 0);
    }

    function closePhotoViewer() {
        const viewer = document.getElementById("final-photo-viewer");

        if (!viewer) {
            return;
        }

        viewer.hidden = true;
        viewer.setAttribute("aria-hidden", "true");
        document.body.classList.remove("media-photo-viewer-open");
    }

    function setupFinalPhotoViewer() {
        const photos = document.querySelectorAll(
            ".final-memory-photo img"
        );

        if (!photos.length) {
            return;
        }

        createPhotoViewer();

        photos.forEach((image) => {
            const article = image.closest(".final-memory-photo");

            if (!article || article.dataset.photoViewerBound === "true") {
                return;
            }

            article.dataset.photoViewerBound = "true";
            article.setAttribute("tabindex", "0");
            article.setAttribute("role", "button");
            article.setAttribute("aria-label", "Open photo");

            article.addEventListener("click", (event) => {
                event.preventDefault();
                openPhotoViewer(image);
            });

            article.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openPhotoViewer(image);
                }
            });
        });
    }

    function setupPhotoViewerEvents() {
        document.addEventListener(
            "click",
            (event) => {
                const close = event.target.closest(
                    "[data-photo-viewer-close]"
                );

                if (close) {
                    event.preventDefault();
                    closePhotoViewer();
                    return;
                }

                const download = event.target.closest(
                    "[data-photo-viewer-download]"
                );

                if (download) {
                    event.preventDefault();

                    const viewer = document.getElementById(
                        "final-photo-viewer"
                    );
                    const image = viewer?.querySelector(
                        ".media-photo-viewer__image"
                    );

                    if (image?.src) {
                        const extension =
                            image.src.match(/\.(jpe?g|png|webp)(?:$|\?)/i)?.[1] ||
                            "jpg";

                        void downloadMedia(
                            image.currentSrc || image.src,
                            `birthday-photo.${extension}`,
                            download
                        );
                    }
                }
            },
            true
        );

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closePhotoViewer();
            }
        });
    }

    function installStyles() {
        if (document.getElementById("gift-media-workflow-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "gift-media-workflow-styles";
        style.textContent = `
            .gift-media-reveal-ready {
                position: relative;
            }

            .gift-media-close {
                position: absolute;
                z-index: 30;
                width: 46px;
                height: 46px;
                display: grid;
                place-items: center;
                border: 1px solid rgba(130, 94, 112, 0.16);
                border-radius: 50%;
                background: rgba(255, 250, 252, 0.96);
                color: #76586a;
                box-shadow: 0 8px 22px rgba(100, 65, 87, 0.16);
                font: 900 26px/1 "Nunito", sans-serif;
                cursor: pointer;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }

            .gift-media-download,
            .media-download-button {
                position: absolute;
                z-index: 30;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                min-width: 108px;
                height: 44px;
                padding: 0 14px;
                border: 1px solid rgba(130, 94, 112, 0.14);
                border-radius: 999px;
                background: linear-gradient(135deg, rgba(255,241,248,0.97), rgba(239,226,255,0.97));
                color: #6b4d63;
                box-shadow:
                    0 8px 22px rgba(100, 65, 87, 0.14),
                    inset 0 1px 0 rgba(255,255,255,0.78);
                font: 900 14px/1 "Nunito", sans-serif;
                cursor: pointer;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                white-space: nowrap;
            }

            .gift-media-close {
                top: 12px;
                left: 12px;
            }

            .gift-media-download {
                top: 12px;
                right: 12px;
            }

            .media-download-button--q1 {
                top: 14px;
                right: 14px;
            }

            .gift-media-close:hover,
            .gift-media-download:hover,
            .media-download-button:hover {
                transform: translateY(-2px) scale(1.025);
                box-shadow:
                    0 11px 25px rgba(100, 65, 87, 0.18),
                    inset 0 1px 0 rgba(255,255,255,0.84);
            }

            .gift-media-close:disabled,
            .gift-media-download:disabled,
            .media-download-button:disabled {
                opacity: 0.65;
                cursor: wait;
            }

            #quiz-reel-stage .quiz-reel-stage__visual {
                position: relative;
            }

            .media-photo-viewer {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: grid;
                place-items: center;
                padding: 20px;
            }

            .media-photo-viewer[hidden] {
                display: none;
            }

            .media-photo-viewer__backdrop {
                position: absolute;
                inset: 0;
                background: rgba(54, 38, 49, 0.56);
                backdrop-filter: blur(10px);
            }

            .media-photo-viewer__dialog {
                position: relative;
                z-index: 1;
                width: min(94vw, 900px);
                height: min(90vh, 900px);
                display: grid;
                place-items: center;
                padding: 64px 18px 58px;
                border-radius: 28px;
                background: rgba(255, 249, 252, 0.97);
                box-shadow: 0 24px 70px rgba(40, 25, 37, 0.26);
            }

            .media-photo-viewer__image {
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                object-fit: contain;
                border-radius: 18px;
                box-shadow: 0 14px 38px rgba(72, 51, 64, 0.18);
            }

            .media-photo-viewer__close {
                position: absolute;
                z-index: 2;
                top: 14px;
                left: 14px;
                width: 46px;
                height: 46px;
                display: grid;
                place-items: center;
                border: 1px solid rgba(130, 94, 112, 0.16);
                border-radius: 50%;
                background: rgba(255, 250, 252, 0.96);
                color: #76586a;
                box-shadow: 0 8px 22px rgba(100, 65, 87, 0.15);
                font: 900 26px/1 "Nunito", sans-serif;
                cursor: pointer;
            }

            .media-photo-viewer__download {
                position: absolute;
                z-index: 2;
                top: 14px;
                right: 14px;
                min-width: 108px;
                height: 44px;
                padding: 0 14px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                border: 1px solid rgba(130, 94, 112, 0.14);
                border-radius: 999px;
                background: linear-gradient(135deg, rgba(255,241,248,0.97), rgba(239,226,255,0.97));
                color: #6b4d63;
                box-shadow:
                    0 8px 22px rgba(100, 65, 87, 0.14),
                    inset 0 1px 0 rgba(255,255,255,0.78);
                font: 900 14px/1 "Nunito", sans-serif;
                cursor: pointer;
                white-space: nowrap;
            }

            @media (max-width: 700px) {
                .gift-media-download,
                .media-download-button,
                .media-photo-viewer__download {
                    min-width: 98px;
                    height: 42px;
                    padding: 0 12px;
                    gap: 6px;
                    font-size: 13px;
                }

                .gift-media-direct-reveal {
                    padding-top: 64px !important;
                    padding-bottom: 70px !important;
                }

                .gift-media-direct-reveal video {
                    width: 94vw !important;
                    max-width: 94vw !important;
                    max-height: 76vh !important;
                    border-radius: 18px;
                }
            }

            body.media-photo-viewer-open {
                overflow: hidden;
            }

            @media (max-width: 560px) {
                .gift-media-close,
                .gift-media-download,
                .media-download-button {
                    width: 40px;
                    height: 40px;
                }

                .media-photo-viewer {
                    padding: 10px;
                }

                .media-photo-viewer__dialog {
                    width: 96vw;
                    height: 92vh;
                    border-radius: 22px;
                    padding: 56px 10px 54px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* ====================================================================== */
    /* FINAL PHOTO SCRATCH-CARD REVEAL V2                                    */
    /* ====================================================================== */
    /*
     * The final-photo page contains four real photos. This feature keeps each
     * photo hidden behind an erasable pastel scratch layer until the visitor
     * taps the card and then scratches across it.
     *
     * Design goals
     * ------------
     * 1. Preserve the original JPGs exactly.
     * 2. Reveal only the areas physically scratched by the pointer/finger.
     * 3. Keep the existing photo viewer available after full reveal.
     * 4. Keep the existing download workflow intact.
     * 5. Work with mouse, touch, and keyboard.
     * 6. Avoid external libraries.
     * 7. Avoid autoplay of any media.
     * 8. Survive mobile rotation and desktop resizing.
     * 9. Avoid interfering with gift opening, quiz, navigation, and audio.
     * 10. Keep all styling scoped to birthday-scratch-v2 classes.
     *
     * Interaction
     * -----------
     * First tap on a locked card:
     *     arm the card and show a tiny instruction.
     *
     * Second interaction:
     *     press/hold and drag over the card.
     *
     * During the drag:
     *     the canvas is erased at the pointer path using destination-out.
     *     the original photo underneath becomes visible exactly there.
     *
     * Completion:
     *     when enough coating has been erased, the remaining coating fades away
     *     and the photo becomes fully unlocked.
     *
     * After completion:
     *     the existing photo viewer receives normal click events again.
     *
     * The module is intentionally self-contained. The gift bridge at the top of this file owns only media presentation.
     * gifts.js remains the sole owner of gift opening state and animation.
     */

    const SCRATCH_V2 = Object.freeze({
        frameSelector: "#final-memory-frame",
        cardSelector: ".final-memory-photo",
        innerSelector: ".final-memory-photo__inner",
        imageSelector: ".final-memory-photo__inner img",
        stageClass: "birthday-scratch-v2-stage",
        canvasClass: "birthday-scratch-v2-canvas",
        overlayClass: "birthday-scratch-v2-overlay",
        promptClass: "birthday-scratch-v2-prompt",
        helperClass: "birthday-scratch-v2-helper",
        statusClass: "birthday-scratch-v2-status",
        shineClass: "birthday-scratch-v2-shine",
        burstClass: "birthday-scratch-v2-burst",
        armedClass: "birthday-scratch-v2-armed",
        revealedClass: "birthday-scratch-v2-revealed",
        lockedAttribute: "data-scratch-v2-locked",
        armedAttribute: "data-scratch-v2-armed",
        revealedAttribute: "data-scratch-v2-revealed",
        progressAttribute: "data-scratch-v2-progress",
        storagePrefix: "sehrish-birthday:scratch-v2:",
        revealThreshold: 0.60,
        progressSampleMax: 72,
        progressInterval: 85,
        desktopBrushRadius: 34,
        touchBrushRadius: 30,
        minimumPointDistance: 4,
        resizeDelay: 120,
        pointerCapture: true,
        persistUnlockedSession: true,
        burstCount: 18,
        burstDuration: 1100,
        maxHistoryPoints: 18000,
        initialPrompt: "",
        armedPrompt: "",
        helperText: "",
        lockedStatus: "",
        revealedStatus: "",
        successText: ""
    });

    const scratchV2Controllers = new Map();
    let scratchV2StylesAdded = false;
    let scratchV2GlobalBound = false;
    let scratchV2ResizeTimer = null;
    let scratchV2MutationObserver = null;

    function scratchV2Debug(...args) {
        if (window.console && typeof window.console.debug === "function") {
            window.console.debug("[GiftMedia][ScratchV2]", ...args);
        }
    }

    function scratchV2Warn(...args) {
        if (window.console && typeof window.console.warn === "function") {
            window.console.warn("[GiftMedia][ScratchV2]", ...args);
        }
    }

    function scratchV2Clamp(value, minimum, maximum) {
        return Math.min(Math.max(value, minimum), maximum);
    }

    function scratchV2Number(value, fallback = 0) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    }

    function scratchV2Ratio(value) {
        return scratchV2Clamp(scratchV2Number(value), 0, 1);
    }

    function scratchV2Distance(a, b) {
        if (!a || !b) {
            return Infinity;
        }
        return Math.hypot(
            scratchV2Number(a.x) - scratchV2Number(b.x),
            scratchV2Number(a.y) - scratchV2Number(b.y)
        );
    }

    function scratchV2GetFrame() {
        return document.querySelector(SCRATCH_V2.frameSelector);
    }

    function scratchV2GetCards() {
        const frame = scratchV2GetFrame();
        return frame ? Array.from(frame.querySelectorAll(SCRATCH_V2.cardSelector)) : [];
    }

    function scratchV2GetCardIndex(card) {
        if (!card) {
            return "";
        }
        return String(
            card.dataset.photoIndex ||
            card.className.match(/final-memory-photo--(\d+)/)?.[1] ||
            ""
        );
    }

    function scratchV2GetController(card) {
        return card ? scratchV2Controllers.get(card) || null : null;
    }

    function scratchV2SetController(card, controller) {
        if (card && controller) {
            scratchV2Controllers.set(card, controller);
        }
    }

    function scratchV2GetImage(card) {
        return card ? card.querySelector(SCRATCH_V2.imageSelector) : null;
    }

    function scratchV2GetInner(card) {
        return card ? card.querySelector(SCRATCH_V2.innerSelector) : null;
    }

    function scratchV2GetStage(card) {
        return card ? card.querySelector(`.${SCRATCH_V2.stageClass}`) : null;
    }

    function scratchV2GetCanvas(card) {
        return card ? card.querySelector(`.${SCRATCH_V2.canvasClass}`) : null;
    }

    function scratchV2GetOverlay(card) {
        return card ? card.querySelector(`.${SCRATCH_V2.overlayClass}`) : null;
    }

    function scratchV2IsRevealed(card) {
        return card?.getAttribute(SCRATCH_V2.revealedAttribute) === "true";
    }

    function scratchV2IsArmed(card) {
        return card?.getAttribute(SCRATCH_V2.armedAttribute) === "true";
    }

    function scratchV2SetArmed(card, armed) {
        if (!card) {
            return;
        }
        card.setAttribute(SCRATCH_V2.armedAttribute, armed ? "true" : "false");
        card.classList.toggle(SCRATCH_V2.armedClass, Boolean(armed));
    }

    function scratchV2SetRevealed(card, revealed) {
        if (!card) {
            return;
        }
        card.setAttribute(SCRATCH_V2.revealedAttribute, revealed ? "true" : "false");
        card.setAttribute(SCRATCH_V2.lockedAttribute, revealed ? "false" : "true");
        card.classList.toggle(SCRATCH_V2.revealedClass, Boolean(revealed));
    }

    function scratchV2SetProgress(card, ratio) {
        if (!card) {
            return;
        }
        const normalized = scratchV2Ratio(ratio);
        card.setAttribute(
            SCRATCH_V2.progressAttribute,
            String(Math.round(normalized * 100))
        );
        card.style.setProperty("--scratch-v2-progress", String(normalized));
        const status = card.querySelector(`.${SCRATCH_V2.statusClass}`);
        if (status && !scratchV2IsRevealed(card)) {
            status.textContent = normalized > 0
                ? `${Math.round(normalized * 100)}% revealed ✨`
                : SCRATCH_V2.lockedStatus;
        }
    }

    function scratchV2SetPrompt(card, text) {
        const prompt = card?.querySelector(`.${SCRATCH_V2.promptClass}`);
        if (prompt) {
            prompt.textContent = text;
        }
    }

    function scratchV2StorageKey(index) {
        return `${SCRATCH_V2.storagePrefix}${String(index)}`;
    }

    function scratchV2ReadStoredState(index) {
        if (!SCRATCH_V2.persistUnlockedSession || !index) {
            return null;
        }
        try {
            const raw = sessionStorage.getItem(scratchV2StorageKey(index));
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            scratchV2Warn("Could not read scratch session state:", error);
            return null;
        }
    }

    function scratchV2WriteStoredState(index, revealed) {
        if (!SCRATCH_V2.persistUnlockedSession || !index) {
            return;
        }
        try {
            sessionStorage.setItem(
                scratchV2StorageKey(index),
                JSON.stringify({
                    revealed: Boolean(revealed),
                    time: Date.now()
                })
            );
        } catch (error) {
            scratchV2Warn("Could not save scratch session state:", error);
        }
    }

    function scratchV2ClearStoredState(index) {
        if (!SCRATCH_V2.persistUnlockedSession || !index) {
            return;
        }
        try {
            sessionStorage.removeItem(scratchV2StorageKey(index));
        } catch (error) {
            scratchV2Warn("Could not clear scratch session state:", error);
        }
    }

    function scratchV2PointFromEvent(canvas, event) {
        if (!canvas || !event) {
            return null;
        }
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            return null;
        }
        return {
            x: scratchV2Clamp(
                (event.clientX - rect.left) * (canvas.width / rect.width),
                0,
                canvas.width
            ),
            y: scratchV2Clamp(
                (event.clientY - rect.top) * (canvas.height / rect.height),
                0,
                canvas.height
            )
        };
    }

    function scratchV2LogicalPoint(controller, point) {
        if (!controller || !point) {
            return null;
        }
        const dpr = controller.dpr || 1;
        return {
            x: point.x / dpr,
            y: point.y / dpr
        };
    }

    function scratchV2BrushRadius(controller) {
        if (!controller) {
            return SCRATCH_V2.desktopBrushRadius;
        }
        return controller.touchLike
            ? SCRATCH_V2.touchBrushRadius
            : SCRATCH_V2.desktopBrushRadius;
    }

    function scratchV2CreateStage(card) {
        const inner = scratchV2GetInner(card);
        if (!inner) {
            return null;
        }
        const existing = scratchV2GetStage(card);
        if (existing) {
            return existing;
        }

        const stage = document.createElement("div");
        stage.className = SCRATCH_V2.stageClass;
        stage.setAttribute("aria-hidden", "true");

        const canvas = document.createElement("canvas");
        canvas.className = SCRATCH_V2.canvasClass;
        canvas.setAttribute("aria-hidden", "true");
        canvas.tabIndex = -1;
        canvas.draggable = false;

        const overlay = document.createElement("div");
        overlay.className = SCRATCH_V2.overlayClass;
        overlay.setAttribute("aria-hidden", "true");

        const shine = document.createElement("span");
        shine.className = SCRATCH_V2.shineClass;
        shine.textContent = "✦";

        const prompt = document.createElement("span");
        prompt.className = SCRATCH_V2.promptClass;
        prompt.textContent = SCRATCH_V2.initialPrompt;

        const helper = document.createElement("span");
        helper.className = SCRATCH_V2.helperClass;
        helper.textContent = SCRATCH_V2.helperText;

        const status = document.createElement("span");
        status.className = SCRATCH_V2.statusClass;
        status.textContent = SCRATCH_V2.lockedStatus;

        overlay.appendChild(shine);
        overlay.appendChild(prompt);
        overlay.appendChild(helper);
        overlay.appendChild(status);
        stage.appendChild(canvas);
        stage.appendChild(overlay);
        inner.appendChild(stage);

        return stage;
    }

    function scratchV2FitStageToImage(controller) {
        if (!controller?.stage || !controller?.image || !controller?.inner) {
            return false;
        }

        const innerRect = controller.inner.getBoundingClientRect();
        const imageRect = controller.image.getBoundingClientRect();
        if (!innerRect.width || !innerRect.height || !imageRect.width || !imageRect.height) {
            return false;
        }

        const left = imageRect.left - innerRect.left;
        const top = imageRect.top - innerRect.top;
        const width = imageRect.width;
        const height = imageRect.height;

        controller.stage.style.left = `${left}px`;
        controller.stage.style.top = `${top}px`;
        controller.stage.style.width = `${width}px`;
        controller.stage.style.height = `${height}px`;
        controller.stage.style.borderRadius = getComputedStyle(controller.image).borderRadius;

        controller.cssWidth = Math.max(1, Math.round(width));
        controller.cssHeight = Math.max(1, Math.round(height));
        controller.dpr = scratchV2Clamp(window.devicePixelRatio || 1, 1, 3);
        controller.canvas.width = Math.max(1, Math.round(controller.cssWidth * controller.dpr));
        controller.canvas.height = Math.max(1, Math.round(controller.cssHeight * controller.dpr));
        controller.canvas.style.width = `${controller.cssWidth}px`;
        controller.canvas.style.height = `${controller.cssHeight}px`;
        controller.ctx = controller.canvas.getContext("2d", { willReadFrequently: true });

        if (!controller.ctx) {
            return false;
        }

        controller.logicalWidth = controller.cssWidth;
        controller.logicalHeight = controller.cssHeight;
        controller.ctx.setTransform(controller.dpr, 0, 0, controller.dpr, 0, 0);

        return true;
    }

    function scratchV2RoundedRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }

    function scratchV2Star(ctx, x, y, outerRadius, innerRadius) {
        const points = 5;
        ctx.beginPath();
        for (let index = 0; index < points * 2; index += 1) {
            const angle = -Math.PI / 2 + index * Math.PI / points;
            const radius = index % 2 === 0 ? outerRadius : innerRadius;
            const pointX = x + Math.cos(angle) * radius;
            const pointY = y + Math.sin(angle) * radius;
            if (index === 0) {
                ctx.moveTo(pointX, pointY);
            } else {
                ctx.lineTo(pointX, pointY);
            }
        }
        ctx.closePath();
        ctx.fill();
    }

    function scratchV2Heart(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.45);
        ctx.bezierCurveTo(
            x - size * 0.90,
            y - size * 0.02,
            x - size * 0.56,
            y - size * 0.72,
            x,
            y - size * 0.18
        );
        ctx.bezierCurveTo(
            x + size * 0.56,
            y - size * 0.72,
            x + size * 0.90,
            y - size * 0.02,
            x,
            y + size * 0.45
        );
        ctx.closePath();
        ctx.fill();
    }

    function scratchV2PaintCover(controller) {
        if (!controller?.ctx) {
            return;
        }

        const ctx = controller.ctx;
        const width = controller.logicalWidth;
        const height = controller.logicalHeight;
        const randomSeed = String(controller.photoIndex || "0");

        let state = 2166136261;
        for (let index = 0; index < randomSeed.length; index += 1) {
            state ^= randomSeed.charCodeAt(index);
            state = Math.imul(state, 16777619);
        }
        const random = () => {
            state = Math.imul(state + 0x6d2b79f5, 1);
            let value = state;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };

        ctx.save();
        ctx.setTransform(controller.dpr, 0, 0, controller.dpr, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, width, height);

        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgba(255, 196, 220, 0.99)");
        gradient.addColorStop(0.48, "rgba(225, 207, 249, 0.99)");
        gradient.addColorStop(1, "rgba(255, 224, 237, 0.99)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "rgba(255,255,255,0.20)";
        scratchV2RoundedRect(
            ctx,
            width * 0.035,
            height * 0.045,
            width * 0.93,
            height * 0.91,
            Math.min(width, height) * 0.055
        );
        ctx.fill();

        const dots = Math.max(30, Math.min(140, Math.round((width * height) / 6000)));
        for (let index = 0; index < dots; index += 1) {
            const x = random() * width;
            const y = random() * height;
            const radius = 0.8 + random() * 2.4;
            ctx.beginPath();
            ctx.fillStyle = index % 3 === 0
                ? "rgba(255,255,255,0.54)"
                : "rgba(255,240,248,0.38)";
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        const decorations = 10;
        for (let index = 0; index < decorations; index += 1) {
            const x = width * (0.08 + random() * 0.84);
            const y = height * (0.08 + random() * 0.84);
            ctx.save();
            if (index % 2 === 0) {
                ctx.fillStyle = "rgba(255,255,255,0.62)";
                scratchV2Star(
                    ctx,
                    x,
                    y,
                    Math.max(4, Math.min(width, height) * 0.028),
                    Math.max(2, Math.min(width, height) * 0.012)
                );
            } else {
                ctx.fillStyle = "rgba(255,255,255,0.45)";
                scratchV2Heart(
                    ctx,
                    x,
                    y,
                    Math.max(5, Math.min(width, height) * 0.034)
                );
            }
            ctx.restore();
        }

        const shine = ctx.createLinearGradient(width * 0.12, 0, width * 0.88, height);
        shine.addColorStop(0, "rgba(255,255,255,0)");
        shine.addColorStop(0.5, "rgba(255,255,255,0.18)");
        shine.addColorStop(0.58, "rgba(255,255,255,0)");
        shine.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shine;
        ctx.fillRect(0, 0, width, height);

        ctx.restore();
    }

    function scratchV2ClearCanvas(controller) {
        if (!controller?.ctx) {
            return;
        }
        const ctx = controller.ctx;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, controller.canvas.width, controller.canvas.height);
        ctx.restore();
    }

    function scratchV2EraseCircle(controller, x, y, radius) {
        if (!controller?.ctx) {
            return;
        }
        const ctx = controller.ctx;
        ctx.save();
        ctx.setTransform(controller.dpr, 0, 0, controller.dpr, 0, 0);
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function scratchV2EraseSegment(controller, from, to, radius) {
        if (!from || !to) {
            return;
        }
        const distance = scratchV2Distance(from, to);
        const spacing = Math.max(1, radius * 0.38);
        const steps = Math.max(1, Math.ceil(distance / spacing));
        for (let index = 0; index <= steps; index += 1) {
            const t = index / steps;
            scratchV2EraseCircle(
                controller,
                from.x + (to.x - from.x) * t,
                from.y + (to.y - from.y) * t,
                radius
            );
        }
    }

    function scratchV2ErasePointPath(controller, points, radius) {
        if (!controller || !Array.isArray(points) || !points.length) {
            return;
        }
        let previous = null;
        for (const point of points) {
            if (!previous) {
                scratchV2EraseCircle(controller, point.x, point.y, radius);
            } else {
                scratchV2EraseSegment(controller, previous, point, radius);
            }
            previous = point;
        }
    }

    function scratchV2Progress(controller, force = false) {
        if (!controller || scratchV2IsRevealed(controller.card)) {
            return;
        }

        const now = performance.now();
        if (!force && now - controller.lastProgressCheck < SCRATCH_V2.progressInterval) {
            return;
        }
        controller.lastProgressCheck = now;

        if (!controller.ctx) {
            return;
        }

        const width = controller.canvas.width;
        const height = controller.canvas.height;
        if (!width || !height) {
            return;
        }

        const maxSamples = SCRATCH_V2.progressSampleMax;
        const longest = Math.max(width, height);
        const scale = Math.min(1, maxSamples / longest);
        const sampleWidth = Math.max(1, Math.floor(width * scale));
        const sampleHeight = Math.max(1, Math.floor(height * scale));

        let imageData;
        try {
            imageData = controller.ctx.getImageData(0, 0, width, height);
        } catch (error) {
            scratchV2Warn("getImageData failed:", error);
            return;
        }

        const data = imageData.data;
        let clear = 0;
        let total = 0;

        for (let sampleY = 0; sampleY < sampleHeight; sampleY += 1) {
            const y = Math.min(height - 1, Math.floor(sampleY / sampleHeight * height));
            for (let sampleX = 0; sampleX < sampleWidth; sampleX += 1) {
                const x = Math.min(width - 1, Math.floor(sampleX / sampleWidth * width));
                const alphaIndex = (y * width + x) * 4 + 3;
                if (data[alphaIndex] < 40) {
                    clear += 1;
                }
                total += 1;
            }
        }

        const measured = total ? clear / total : 0;
        const monotonic = Math.max(controller.lastProgress, measured);
        controller.lastProgress = scratchV2Ratio(monotonic);
        scratchV2SetProgress(controller.card, controller.lastProgress);

        if (controller.lastProgress >= SCRATCH_V2.revealThreshold) {
            void scratchV2Reveal(controller, "threshold");
        }
    }

    function scratchV2Arm(controller) {
        if (!controller || scratchV2IsRevealed(controller.card)) {
            return;
        }
        scratchV2SetArmed(controller.card, true);
        scratchV2SetPrompt(controller.card, SCRATCH_V2.armedPrompt);
        const status = controller.card.querySelector(`.${SCRATCH_V2.statusClass}`);
        if (status) {
            status.textContent = "Ready ✨";
        }
        controller.card.animate(
            [
                { transform: "translateY(0)" },
                { transform: "translateY(-2px)" },
                { transform: "translateY(0)" }
            ],
            {
                duration: 240,
                easing: "ease-out"
            }
        );
    }

    function scratchV2Start(controller, event) {
        if (!controller || scratchV2IsRevealed(controller.card)) {
            return;
        }
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }
        if (!scratchV2IsArmed(controller.card)) {
            event.preventDefault();
            event.stopPropagation();
            scratchV2Arm(controller);
            return;
        }

        const point = scratchV2PointFromEvent(controller.canvas, event);
        if (!point) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        controller.isScratching = true;
        controller.pointerId = event.pointerId;
        controller.currentStroke = {
            radius: controller.brushRadius,
            points: [scratchV2LogicalPoint(controller, point)]
        };

        scratchV2EraseCircle(
            controller,
            point.x / controller.dpr,
            point.y / controller.dpr,
            controller.brushRadius
        );

        try {
            if (SCRATCH_V2.pointerCapture) {
                controller.canvas.setPointerCapture(event.pointerId);
            }
        } catch (error) {
            scratchV2Debug("Pointer capture unavailable:", error);
        }

        scratchV2Progress(controller, true);
    }

    function scratchV2Move(controller, event) {
        if (!controller?.isScratching) {
            return;
        }
        if (controller.pointerId !== event.pointerId) {
            return;
        }

        const rawPoint = scratchV2PointFromEvent(controller.canvas, event);
        if (!rawPoint) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const point = scratchV2LogicalPoint(controller, rawPoint);
        const previous = controller.lastPoint || controller.currentStroke.points.at(-1) || point;

        if (scratchV2Distance(previous, point) < SCRATCH_V2.minimumPointDistance) {
            return;
        }

        scratchV2EraseSegment(
            controller,
            previous,
            point,
            controller.brushRadius
        );

        controller.currentStroke.points.push(point);
        controller.lastPoint = point;

        if (controller.currentStroke.points.length > SCRATCH_V2.maxHistoryPoints) {
            controller.currentStroke.points.shift();
        }

        scratchV2Progress(controller, false);
    }

    function scratchV2FinishStroke(controller, event = null) {
        if (!controller?.isScratching) {
            return;
        }

        if (event && controller.pointerId !== event.pointerId) {
            return;
        }

        if (controller.currentStroke?.points?.length) {
            controller.strokes.push(controller.currentStroke);
        }

        controller.currentStroke = null;
        controller.lastPoint = null;
        controller.isScratching = false;

        if (event) {
            try {
                if (controller.canvas.hasPointerCapture?.(event.pointerId)) {
                    controller.canvas.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
                scratchV2Debug("Pointer release unavailable:", error);
            }
        }

        controller.pointerId = null;
        scratchV2Progress(controller, true);
    }

    function scratchV2Cancel(controller, event) {
        scratchV2FinishStroke(controller, event);
    }

    function scratchV2CreateBurst(controller) {
        const stage = controller?.stage;
        if (!stage) {
            return;
        }

        stage.querySelectorAll(`.${SCRATCH_V2.burstClass}`).forEach((node) => node.remove());

        for (let index = 0; index < SCRATCH_V2.burstCount; index += 1) {
            const particle = document.createElement("span");
            particle.className = SCRATCH_V2.burstClass;
            particle.textContent = index % 3 === 0 ? "♡" : "✦";
            particle.style.left = `${10 + Math.random() * 80}%`;
            particle.style.top = `${12 + Math.random() * 76}%`;
            particle.style.setProperty("--scratch-delay", `${Math.round(Math.random() * 180)}ms`);
            particle.style.setProperty("--scratch-size", `${12 + Math.round(Math.random() * 13)}px`);
            stage.appendChild(particle);
            window.setTimeout(() => particle.remove(), SCRATCH_V2.burstDuration + 250);
        }
    }

    async function scratchV2Reveal(controller, reason = "manual") {
        if (!controller) {
            return false;
        }
        if (controller.revealPromise) {
            return controller.revealPromise;
        }
        if (scratchV2IsRevealed(controller.card)) {
            return true;
        }

        controller.revealPromise = (async () => {
            scratchV2SetRevealed(controller.card, true);
            scratchV2SetArmed(controller.card, false);
            scratchV2SetProgress(controller.card, 1);
            controller.card.setAttribute("data-scratch-v2-reason", reason);
            controller.canvas.style.pointerEvents = "none";

            const prompt = controller.card.querySelector(`.${SCRATCH_V2.promptClass}`);
            const status = controller.card.querySelector(`.${SCRATCH_V2.statusClass}`);
            if (prompt) {
                prompt.textContent = SCRATCH_V2.successText;
            }
            if (status) {
                status.textContent = SCRATCH_V2.revealedStatus;
            }

            scratchV2CreateBurst(controller);

            const overlay = scratchV2GetOverlay(controller.card);
            if (overlay) {
                overlay.style.pointerEvents = "none";
                overlay.animate(
                    [
                        { opacity: 1, transform: "scale(1)" },
                        { opacity: 0, transform: "scale(1.025)" }
                    ],
                    {
                        duration: 430,
                        easing: "cubic-bezier(.2,.8,.2,1)",
                        fill: "forwards"
                    }
                );
                window.setTimeout(() => {
                    overlay.hidden = true;
                }, 450);
            }

            controller.stage.classList.add("birthday-scratch-v2-complete");
            scratchV2WriteStoredState(controller.photoIndex, true);

            await new Promise((resolve) => window.setTimeout(resolve, 470));
            controller.revealed = true;
            return true;
        })().catch((error) => {
            scratchV2Warn("Scratch reveal failed:", error);
            scratchV2SetRevealed(controller.card, false);
            return false;
        }).finally(() => {
            controller.revealPromise = null;
        });

        return controller.revealPromise;
    }

    function scratchV2RestoreStoredReveal(controller) {
        const stored = scratchV2ReadStoredState(controller.photoIndex);
        if (!stored?.revealed) {
            return;
        }

        scratchV2SetRevealed(controller.card, true);
        scratchV2SetArmed(controller.card, false);
        scratchV2SetProgress(controller.card, 1);
        controller.revealed = true;
        controller.restored = true;
        controller.canvas.style.pointerEvents = "none";

        const overlay = scratchV2GetOverlay(controller.card);
        if (overlay) {
            overlay.hidden = true;
            overlay.style.opacity = "0";
            overlay.style.pointerEvents = "none";
        }
        scratchV2Debug("Restored unlocked photo:", controller.photoIndex);
    }

    function scratchV2RepaintFromHistory(controller) {
        if (!controller) {
            return;
        }
        scratchV2PaintCover(controller);
        if (controller.strokes.length) {
            for (const stroke of controller.strokes) {
                scratchV2ErasePointPath(controller, stroke.points, stroke.radius);
            }
        }
        scratchV2Progress(controller, true);
    }

    function scratchV2Resize(controller) {
        if (!controller) {
            return;
        }

        const revealed = scratchV2IsRevealed(controller.card);
        const strokes = controller.strokes.slice();
        const previousProgress = controller.lastProgress;

        if (!scratchV2FitStageToImage(controller)) {
            return;
        }

        if (revealed) {
            scratchV2ClearCanvas(controller);
            return;
        }

        controller.strokes = strokes;
        controller.lastProgress = previousProgress;
        scratchV2RepaintFromHistory(controller);
    }

    function scratchV2ScheduleResize(controller) {
        if (!controller) {
            return;
        }
        if (controller.resizeTimer) {
            window.clearTimeout(controller.resizeTimer);
        }
        controller.resizeTimer = window.setTimeout(() => {
            controller.resizeTimer = null;
            scratchV2Resize(controller);
        }, SCRATCH_V2.resizeDelay);
    }

    function scratchV2BindCardEvents(controller) {
        if (!controller || controller.bound) {
            return;
        }

        const { card, canvas } = controller;

        canvas.addEventListener("pointerdown", (event) => {
            scratchV2Start(controller, event);
        }, { passive: false });

        canvas.addEventListener("pointermove", (event) => {
            scratchV2Move(controller, event);
        }, { passive: false });

        canvas.addEventListener("pointerup", (event) => {
            scratchV2FinishStroke(controller, event);
        }, { passive: false });

        canvas.addEventListener("pointercancel", (event) => {
            scratchV2Cancel(controller, event);
        }, { passive: false });

        canvas.addEventListener("lostpointercapture", () => {
            if (controller.isScratching) {
                scratchV2FinishStroke(controller);
            }
        });

        card.addEventListener("click", (event) => {
            if (scratchV2IsRevealed(card)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            scratchV2Arm(controller);
        }, true);

        card.addEventListener("keydown", (event) => {
            if (scratchV2IsRevealed(card)) {
                return;
            }
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (!scratchV2IsArmed(card)) {
                scratchV2Arm(controller);
                return;
            }
            controller.keyboardSteps += 1;
            const progress = scratchV2Ratio(
                controller.keyboardSteps / 7
            );
            scratchV2SetProgress(card, progress);
            if (progress >= 1) {
                void scratchV2Reveal(controller, "keyboard");
            }
        }, true);

        controller.bound = true;
    }

    function scratchV2InstallController(card) {
        if (!card) {
            return null;
        }

        const existing = scratchV2GetController(card);
        if (existing) {
            return existing;
        }

        const image = scratchV2GetImage(card);
        const inner = scratchV2GetInner(card);
        if (!image || !inner) {
            return null;
        }

        if (getComputedStyle(inner).position === "static") {
            inner.style.position = "relative";
        }

        const stage = scratchV2CreateStage(card);
        const canvas = scratchV2GetCanvas(card);
        if (!stage || !canvas) {
            return null;
        }

        const controller = {
            card,
            image,
            inner,
            stage,
            canvas,
            ctx: null,
            photoIndex: scratchV2GetCardIndex(card),
            dpr: 1,
            cssWidth: 0,
            cssHeight: 0,
            logicalWidth: 0,
            logicalHeight: 0,
            touchLike: window.matchMedia?.("(pointer: coarse)").matches || false,
            brushRadius: 0,
            strokes: [],
            currentStroke: null,
            lastPoint: null,
            lastProgress: 0,
            lastProgressCheck: 0,
            isScratching: false,
            pointerId: null,
            keyboardSteps: 0,
            revealPromise: null,
            resizeTimer: null,
            bound: false,
            revealed: false,
            restored: false
        };

        controller.brushRadius = scratchV2BrushRadius(controller);
        scratchV2SetController(card, controller);

        if (!scratchV2FitStageToImage(controller)) {
            scratchV2Debug("Waiting for photo layout:", controller.photoIndex);
        }

        scratchV2PaintCover(controller);
        scratchV2SetArmed(card, false);
        scratchV2SetRevealed(card, false);
        scratchV2SetProgress(card, 0);
        scratchV2BindCardEvents(controller);
        scratchV2RestoreStoredReveal(controller);

        const onImageLoad = () => {
            scratchV2ScheduleResize(controller);
        };

        if (!image.complete) {
            image.addEventListener("load", onImageLoad, { once: true });
            image.addEventListener("error", () => {
                scratchV2Warn("Could not load final photo:", image.src);
            }, { once: true });
        }

        return controller;
    }

    function scratchV2InitializeCards() {
        return scratchV2GetCards()
            .map((card) => scratchV2InstallController(card))
            .filter(Boolean);
    }

    function scratchV2Refresh() {
        scratchV2GetCards().forEach((card) => {
            const controller = scratchV2GetController(card) || scratchV2InstallController(card);
            if (controller) {
                scratchV2ScheduleResize(controller);
            }
        });
    }

    function scratchV2ResetCard(controller) {
        if (!controller) {
            return;
        }
        controller.strokes = [];
        controller.currentStroke = null;
        controller.lastPoint = null;
        controller.lastProgress = 0;
        controller.lastProgressCheck = 0;
        controller.keyboardSteps = 0;
        controller.isScratching = false;
        controller.pointerId = null;
        controller.revealed = false;
        controller.restored = false;
        scratchV2SetRevealed(controller.card, false);
        scratchV2SetArmed(controller.card, false);
        scratchV2SetProgress(controller.card, 0);
        const overlay = scratchV2GetOverlay(controller.card);
        if (overlay) {
            overlay.hidden = false;
            overlay.style.opacity = "1";
            overlay.style.pointerEvents = "none";
            overlay.style.transform = "scale(1)";
        }
        controller.canvas.style.pointerEvents = "auto";
        scratchV2ClearStoredState(controller.photoIndex);
        scratchV2PaintCover(controller);
        scratchV2SetPrompt(controller.card, SCRATCH_V2.initialPrompt);
        const status = controller.card.querySelector(`.${SCRATCH_V2.statusClass}`);
        if (status) {
            status.textContent = SCRATCH_V2.lockedStatus;
        }
    }

    function scratchV2ResetAll() {
        scratchV2Controllers.forEach((controller) => {
            scratchV2ResetCard(controller);
        });
    }

    function scratchV2RevealAll() {
        return Promise.all(
            Array.from(scratchV2Controllers.values()).map((controller) =>
                scratchV2Reveal(controller, "api")
            )
        );
    }

    function scratchV2GetState() {
        return Array.from(scratchV2Controllers.values()).map((controller) => ({
            photoIndex: controller.photoIndex,
            armed: scratchV2IsArmed(controller.card),
            revealed: scratchV2IsRevealed(controller.card),
            progress: scratchV2Ratio(controller.lastProgress),
            strokes: controller.strokes.length
        }));
    }

    function scratchV2InstallStyles() {
        if (scratchV2StylesAdded) {
            return;
        }
        scratchV2StylesAdded = true;

        const style = document.createElement("style");
        style.id = "gift-media-scratch-v2-styles";
        style.textContent = `
            .${SCRATCH_V2.stageClass} {
                position: absolute;
                z-index: 30;
                overflow: hidden;
                border-radius: inherit;
                isolation: isolate;
                pointer-events: auto;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
                -webkit-touch-callout: none;
                -webkit-tap-highlight-color: transparent;
            }

            .${SCRATCH_V2.canvasClass} {
                position: absolute;
                inset: 0;
                display: block;
                width: 100%;
                height: 100%;
                z-index: 2;
                cursor: grab;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
                -webkit-touch-callout: none;
            }

            .${SCRATCH_V2.canvasClass}:active {
                cursor: grabbing;
            }

            .${SCRATCH_V2.overlayClass} {
                position: absolute;
                inset: 0;
                z-index: 3;
                display: grid;
                place-items: center;
                align-content: center;
                gap: 4px;
                padding: 16px;
                text-align: center;
                border-radius: inherit;
                pointer-events: none;
                color: #704e66;
                font-family: "Nunito", sans-serif;
                background: transparent;
            }

            .${SCRATCH_V2.promptClass} {
                display: block;
                max-width: 92%;
                font-family: "Baloo 2", sans-serif;
                font-size: clamp(16px, 3vw, 24px);
                font-weight: 800;
                line-height: 1.05;
                text-shadow: 0 2px 10px rgba(255,255,255,0.86);
            }

            .${SCRATCH_V2.helperClass} {
                display: block;
                max-width: 88%;
                font-size: clamp(10px, 1.7vw, 13px);
                font-weight: 700;
                line-height: 1.18;
                opacity: 0.82;
            }

            .${SCRATCH_V2.statusClass} {
                display: block;
                min-height: 1.15em;
                font-size: clamp(9px, 1.6vw, 12px);
                font-weight: 700;
                opacity: 0.76;
            }

            .${SCRATCH_V2.shineClass} {
                position: absolute;
                top: 10%;
                right: 12%;
                font-size: clamp(18px, 4vw, 34px);
                opacity: 0.78;
                animation: birthdayScratchV2Float 2.2s ease-in-out infinite;
            }

            .${SCRATCH_V2.stageClass}::after {
                content: "";
                position: absolute;
                inset: 3%;
                z-index: 1;
                border: 1px solid rgba(255,255,255,0.45);
                border-radius: inherit;
                pointer-events: none;
            }

            .${SCRATCH_V2.armedClass} {
                box-shadow:
                    0 0 0 2px rgba(255,185,218,0.22),
                    0 14px 34px rgba(86,61,78,0.16);
            }

            .${SCRATCH_V2.revealedClass} .${SCRATCH_V2.stageClass} {
                pointer-events: none;
            }

            .birthday-scratch-v2-complete {
                pointer-events: none;
            }

            .birthday-scratch-v2-stage.birthday-scratch-v2-complete
            .birthday-scratch-v2-canvas,
            .birthday-scratch-v2-stage.birthday-scratch-v2-complete
            .birthday-scratch-v2-overlay,
            .birthday-scratch-v2-stage.birthday-scratch-v2-complete
            .birthday-scratch-v2-shine {
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }

            .birthday-scratch-v2-stage.birthday-scratch-v2-complete::after {
                opacity: 0 !important;
                visibility: hidden !important;
            }

            .final-memory-photo:has(
    .birthday-scratch-v2-stage.birthday-scratch-v2-complete
) img {
    opacity: 1 !important;
    visibility: visible !important;
}

.final-memory-photo:has(
    .birthday-scratch-v2-stage.birthday-scratch-v2-complete
)::before,

.final-memory-photo:has(
    .birthday-scratch-v2-stage.birthday-scratch-v2-complete
)::after,

.final-memory-photo:has(
    .birthday-scratch-v2-stage.birthday-scratch-v2-complete
)
.final-memory-photo__inner::after {
    content: none !important;
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
}

            .${SCRATCH_V2.burstClass} {
                position: absolute;
                z-index: 40;
                left: 50%;
                top: 50%;
                width: max(18px, var(--scratch-size, 18px));
                height: max(18px, var(--scratch-size, 18px));
                margin-left: calc(max(18px, var(--scratch-size, 18px)) / -2);
                margin-top: calc(max(18px, var(--scratch-size, 18px)) / -2);
                display: grid;
                place-items: center;
                color: #fff;
                font-size: var(--scratch-size, 18px);
                line-height: 1;
                pointer-events: none;
                text-shadow: 0 2px 8px rgba(93,67,83,0.28);
                animation:
                    birthdayScratchV2Burst
                    1.1s
                    cubic-bezier(.2,.75,.2,1)
                    var(--scratch-delay, 0ms)
                    forwards;
            }

            @keyframes birthdayScratchV2Float {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-5px) rotate(4deg); }
            }

            @keyframes birthdayScratchV2Burst {
                0% {
                    opacity: 0;
                    transform: translate3d(0, 8px, 0) scale(0.55) rotate(-10deg);
                }
                18% {
                    opacity: 1;
                    transform: translate3d(0, 0, 0) scale(1) rotate(5deg);
                }
                100% {
                    opacity: 0;
                    transform: translate3d(0, -26px, 0) scale(0.68) rotate(10deg);
                }
            }

            @media (max-width: 700px) {
                .${SCRATCH_V2.overlayClass} {
                    padding: 10px;
                    gap: 3px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .${SCRATCH_V2.shineClass},
                .${SCRATCH_V2.burstClass} {
                    animation: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function scratchV2InstallGlobalEvents() {
        if (scratchV2GlobalBound) {
            return;
        }
        scratchV2GlobalBound = true;

        document.addEventListener("click", (event) => {
            const card = event.target?.closest?.(SCRATCH_V2.cardSelector);
            if (!card) {
                return;
            }
            const controller = scratchV2GetController(card);
            if (!controller) {
                return;
            }
            if (scratchV2IsRevealed(card)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            scratchV2Arm(controller);
        }, true);

        window.addEventListener("resize", () => {
            if (scratchV2ResizeTimer) {
                window.clearTimeout(scratchV2ResizeTimer);
            }
            scratchV2ResizeTimer = window.setTimeout(() => {
                scratchV2ResizeTimer = null;
                scratchV2Refresh();
            }, SCRATCH_V2.resizeDelay);
        }, { passive: true });

        window.addEventListener("orientationchange", () => {
            scratchV2Refresh();
        }, { passive: true });

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState !== "visible") {
                scratchV2Controllers.forEach((controller) => {
                    if (controller.isScratching) {
                        scratchV2FinishStroke(controller);
                    }
                });
            }
        });

        window.addEventListener("pageshow", () => {
            scratchV2Refresh();
        });
    }

    function scratchV2ObserveDom() {
        if (scratchV2MutationObserver || typeof MutationObserver !== "function") {
            return;
        }
        const frame = scratchV2GetFrame();
        if (!frame) {
            return;
        }
        scratchV2MutationObserver = new MutationObserver(() => {
            scratchV2GetCards().forEach((card) => {
                if (!scratchV2GetController(card)) {
                    scratchV2InstallController(card);
                }
            });
        });
        scratchV2MutationObserver.observe(frame, {
            childList: true,
            subtree: true
        });
    }

    function scratchV2ExposeApi() {
        window.SehrishBirthdayScratchV2 = {
            version: "2.0.0",
            config: SCRATCH_V2,
            state: scratchV2GetState,
            refresh: scratchV2Refresh,
            revealAll: scratchV2RevealAll,
            resetAll: scratchV2ResetAll
        };
    }

    function scratchV2Setup() {
        const frame = scratchV2GetFrame();
        if (!frame) {
            return false;
        }

        scratchV2InstallStyles();
        scratchV2InitializeCards();
        scratchV2InstallGlobalEvents();
        scratchV2ObserveDom();
        scratchV2ExposeApi();
        frame.dataset.scratchV2Ready = "true";
        scratchV2Debug("Scratch-card final photo workflow ready:", scratchV2GetState());
        return true;
    }

    /*
     * Maintenance reference — this section documents the implementation in
     * plain language so a future edit can be made without rediscovering the
     * entire interaction model from minified-looking statements.
     *
     * PHOTO LAYER ORDER
     * -----------------
     * Layer 1: the supplied JPG image.
     * Layer 2: the scratch canvas positioned directly over that image.
     * Layer 3: the readable HTML prompt and status text.
     * Layer 4: temporary sparkle particles after reveal.
     *
     * The important part is that the JPG never changes. The only thing erased
     * is the canvas that sits above it.
     *
     * POINTER MODEL
     * -------------
     * Pointer events are used instead of separate touch and mouse handlers.
     * This gives Chrome desktop and mobile a single interaction path.
     * pointerdown begins a stroke; pointermove extends it; pointerup finishes
     * it; pointercancel/lostpointercapture safely ends the current stroke.
     *
     * FIRST-TAP MODEL
     * ---------------
     * A locked card must be intentionally selected first. This prevents an
     * accidental click from immediately causing a large scratch mark. After
     * the first tap the card becomes visually armed and the next press starts
     * scratching.
     *
     * EXISTING VIEWER COMPATIBILITY
     * -----------------------------
     * The existing viewer can keep its normal click behavior after unlock.
     * While the photo is locked, this module prevents the older click handler
     * from opening the viewer. Once data-scratch-v2-revealed becomes true,
     * this module returns without canceling the click, so the existing viewer
     * remains in charge.
     *
     * PROGRESS MEASUREMENT
     * --------------------
     * The scratch canvas uses destination-out. Transparent pixels represent
     * areas that have already been scratched. Progress is estimated by taking
     * a coarse sample of the alpha channel. The sample grid is deliberately
     * small enough for normal phone hardware while still reacting quickly.
     *
     * REVEAL THRESHOLD
     * ----------------
     * The threshold is 60 percent. The visitor does not need to perfectly clean
     * the card. Once enough of it has been scratched away, the rest disappears
     * with a small fade. This preserves the tactile feeling without making the
     * user scrub tiny corners for too long.
     *
     * RESIZE SAFETY
     * -------------
     * Canvas elements are cleared whenever their pixel dimensions change. To
     * avoid losing the user's progress, the module keeps stroke history in
     * memory and replays it after a resize or orientation change.
     *
     * SESSION STATE
     * -------------
     * Only the completed/unlocked state is stored in sessionStorage. The full
     * stroke history is not persisted because that would be unnecessarily large
     * for a small birthday microsite. Leaving the page and starting a new tab or
     * session therefore has a predictable, lightweight footprint.
     *
     * IMAGE LOADING
     * -------------
     * The final photos use lazy loading in the HTML. If an image has not been
     * laid out yet, the controller waits for its load event and then resizes the
     * scratch stage so that the overlay matches the image dimensions.
     *
     * POINTER CAPTURE
     * ---------------
     * Pointer capture keeps a scratch stroke continuous even if a finger moves
     * just outside the edge of the card. If capture is unsupported, the feature
     * still works using normal pointer events.
     *
     * TOUCH SCROLLING
     * ---------------
     * touch-action:none is limited to the scratch stage. The surrounding page
     * remains normally scrollable where the site's design allows it.
     *
     * RIGHT CLICK
     * -----------
     * Secondary mouse buttons are ignored. This avoids turning a context-menu
     * gesture into an accidental scratch.
     *
     * KEYBOARD FALLBACK
     * -----------------
     * A keyboard user can press Enter or Space once to arm the card and then
     * repeat the action several times to unlock it. This is intentionally slower
     * than scratching because there is no meaningful two-dimensional scratch path
     * available from a standard keyboard.
     *
     * VISUAL LANGUAGE
     * ---------------
     * The coating stays inside the site's soft pink/lavender/baby-pink world.
     * No external branding, product marks, or technical file names are shown.
     *
     * PHOTO NUMBERING
     * ---------------
     * The internal photo index is read only from the existing data-photo-index
     * attribute. It is not rendered as a visible label, so the page keeps its
     * clean scrapbook appearance.
     *
     * DOWNLOADS
     * ---------
     * This scratch layer does not add a second download control. Once unlocked,
     * the established full-screen photo viewer and its download button remain
     * the single source of truth for photo downloads.
     *
     * FAILURE ISOLATION
     * -----------------
     * Errors are caught locally where browser capabilities can fail: storage,
     * pointer capture, image loading, and canvas pixel reads. A scratch failure
     * should not stop gifts.js, scenes.js, audio.js, quiz.js, or navigation from
     * running.
     *
     * NO AUTOPLAY
     * -----------
     * The scratch module never starts audio or video. This is a visual interaction
     * only, which keeps the current birthday site's media behavior predictable.
     *
     * NO SOURCE IMAGE MODIFICATION
     * ----------------------------
     * Because the real image remains below the canvas, the original JPG files are
     * never rewritten, compressed, cropped, or permanently edited.
     *
     * FRAME ALIGNMENT
     * ---------------
     * The stage is positioned using the image's bounding rectangle relative to
     * the .final-memory-photo__inner container. This is important because the
     * scrapbook cards can be rotated, padded, or shadowed while the picture
     * itself remains a normal HTML image.
     *
     * RETRY/REINITIALIZATION
     * ----------------------
     * The controller map prevents duplicate setup on the same article. The DOM
     * observer supports future dynamic replacement of final-memory articles.
     * Calling setup again is therefore safe.
     *
     * REDUCED MOTION
     * --------------
     * Decorative floating sparkle and success-burst animations are disabled by
     * the standard prefers-reduced-motion media query, while the core scratch
     * mechanic remains fully functional.
     *
     * TEST CHECKLIST
     * --------------
     * 1. Open scene 15.
     * 2. Confirm four photo cards are visible.
     * 3. Confirm each photo is initially hidden.
     * 4. Tap photo one once.
     * 5. Confirm the prompt changes to the scratch instruction.
     * 6. Press and drag across photo one.
     * 7. Confirm only the path area reveals the photo beneath.
     * 8. Continue scratching until the automatic reveal completes.
     * 9. Tap the now-visible photo.
     * 10. Confirm the existing photo viewer opens.
     * 11. Confirm the existing X close control remains available.
     * 12. Confirm the existing download arrow remains available.
     * 13. Close the viewer and verify scene 15 is intact.
     * 14. Repeat the same flow for photos two, three, and four.
     * 15. Rotate a phone during a partial scratch and ensure progress remains.
     * 16. Resize the desktop browser and ensure the overlay stays aligned.
     * 17. Navigate away and back to ensure revealed state persists only for the
     *     current browser session when sessionStorage is available.
     *
     * TROUBLESHOOTING NOTES
     * --------------------
     * If the user sees a blank overlay:
     * - inspect whether the JPG itself loaded;
     * - inspect the browser console for a canvas security exception;
     * - verify the page is served over http://localhost or http://127.0.0.1;
     * - verify the image path is correct.
     *
     * If scratching moves the page instead of erasing:
     * - verify the stage and canvas both have touch-action:none;
     * - verify the pointer events are not being canceled by another overlay.
     *
     * If the photo viewer opens before scratching:
     * - the global capture handler is being bypassed;
     * - verify this workflow loads after the photo HTML exists;
     * - verify the photo article still matches .final-memory-photo.
     *
     * If only one photo works:
     * - inspect data-photo-index values;
     * - inspect the controller state API at
     *   window.SehrishBirthdayScratchV2.state();
     * - confirm all four image nodes are inside #final-memory-frame.
     *
     * If the session state should be cleared during development:
     * - call window.SehrishBirthdayScratchV2.resetAll();
     * - then hard refresh the page.
     */
    function init() {
        installStyles();
        hideAllOriginalGiftReveals();
        bindGiftMediaControls();
        // setupP01Download();
        setupFinalPhotoViewer();
        setupVoiceDownloads();
        scratchV2Setup();
        setupPhotoViewerEvents();

        console.log("[GiftMedia] Gift/media workflow initialized — V14 centered viewport portal.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
