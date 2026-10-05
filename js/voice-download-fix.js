/*
 * SEHRISH BIRTHDAY WEBSITE
 * Voice-note Download Fix — Stable
 *
 * PURPOSE:
 * - Birthday voice note: download after completion
 * - Final voice note: download after completion
 * - Download appears beside Replay
 * - Download hides again when replay/play starts
 *
 * IMPORTANT:
 * - Does NOT use MutationObserver
 * - Does NOT modify Gifts
 * - Does NOT take over voice playback
 */

(() => {
    "use strict";

    const CONFIG = Object.freeze([
        {
            playerSelector: "#birthday-voice-player",
            audioSelector: "#birthday-note-audio",
            replaySelector: "#birthday-voice-replay",
            buttonId: "birthday-voice-download",
            filename: "birthday-note.mp3",
            label: "Download"
        },
        {
            playerSelector: "#final-voice-player",
            audioSelector: "#final-note-audio",
            replaySelector: "#final-voice-replay",
            buttonId: "final-voice-download",
            filename: "final-note.mp3",
            label: "Download"
        }
    ]);

    const STYLE_ID = "sehrish-voice-download-stable-styles";

    function installStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");

        style.id = STYLE_ID;

        style.textContent = `
            .sehrish-voice-download-button {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 7px !important;

                width: auto !important;
                min-width: 112px !important;
                height: 46px !important;
                min-height: 46px !important;

                padding: 0 15px !important;

                border: 0 !important;
                border-radius: 999px !important;

                background: rgba(255, 250, 252, 0.96) !important;
                color: #76586a !important;

                font-family: "Nunito", sans-serif !important;
                font-size: 13px !important;
                font-weight: 700 !important;

                cursor: pointer !important;

                box-shadow:
                    0 8px 22px rgba(100, 65, 87, 0.14),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;

                transition:
                    transform 160ms ease,
                    box-shadow 160ms ease !important;

                white-space: nowrap !important;
                z-index: 5 !important;
            }

            .sehrish-voice-download-button[hidden] {
                display: none !important;
            }

            .sehrish-voice-download-button:hover {
                transform: translateY(-2px) scale(1.02) !important;

                box-shadow:
                    0 11px 25px rgba(100, 65, 87, 0.17),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
            }

            .sehrish-voice-download-button:active {
                transform: translateY(0) scale(0.97) !important;
            }

            .sehrish-voice-download-button__icon {
                font-size: 20px !important;
                line-height: 1 !important;
            }

            .sehrish-voice-download-button__label {
                line-height: 1 !important;
            }

            @media (max-width: 520px) {
                .sehrish-voice-download-button {
                    min-width: 104px !important;
                    height: 44px !important;
                    min-height: 44px !important;
                    padding: 0 13px !important;
                    gap: 6px !important;
                    font-size: 13px !important;
                }

                .sehrish-voice-download-button__icon {
                    font-size: 19px !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function getSource(audio) {
        if (!audio) {
            return "";
        }

        return (
            audio.currentSrc ||
            audio.src ||
            audio.getAttribute("src") ||
            ""
        );
    }

    function hideDownload(button) {
        if (!button) {
            return;
        }

        button.hidden = true;
        button.setAttribute("aria-hidden", "true");
    }

    function showDownload(button) {
        if (!button) {
            return;
        }

        button.hidden = false;
        button.setAttribute("aria-hidden", "false");
    }

    function performDownload(audio, filename, button) {
        const source = getSource(audio);

        if (!source) {
            console.warn(
                "[VoiceDownloadFix] Audio source not found."
            );
            return;
        }

        const anchor = document.createElement("a");

        anchor.href = source;
        anchor.download = filename;
        anchor.rel = "noopener";
        anchor.style.display = "none";

        document.body.appendChild(anchor);

        try {
            anchor.click();
        } catch (error) {
            console.warn(
                "[VoiceDownloadFix] Download click failed:",
                error
            );
        }

        anchor.remove();

        if (button) {
            const label = button.querySelector(
                ".sehrish-voice-download-button__label"
            );

            if (label) {
                const oldText = label.textContent;

                label.textContent = "Downloaded ✓";

                window.setTimeout(() => {
                    label.textContent = oldText || "Download";
                }, 1400);
            }
        }
    }

    function createDownloadButton(config, player, audio) {
        const controls = player.querySelector(
            ".voice-player__controls, .final-voice-player__controls"
        );

        if (!controls) {
            return null;
        }

        let button = document.getElementById(config.buttonId);

        if (!button) {
            button = document.createElement("button");

            button.type = "button";
            button.id = config.buttonId;

            button.className =
                "sehrish-voice-download-button";

            button.setAttribute(
                "aria-label",
                config.label
            );

            button.title = "Download";

            button.hidden = true;

            button.innerHTML = `
                <span
                    class="sehrish-voice-download-button__icon"
                    aria-hidden="true"
                >
                    ↓
                </span>

                <span
                    class="sehrish-voice-download-button__label"
                >
                    Download
                </span>
            `;
        }

        button.dataset.voiceDownloadStable = "true";
        button.dataset.filename = config.filename;

        /*
         * Keep Download immediately after Replay.
         */
        const replay = controls.querySelector(
            config.replaySelector
        );

        if (replay) {
            if (button.parentElement !== controls) {
                replay.insertAdjacentElement(
                    "afterend",
                    button
                );
            } else if (
                replay.nextElementSibling !== button
            ) {
                replay.insertAdjacentElement(
                    "afterend",
                    button
                );
            }
        } else if (button.parentElement !== controls) {
            controls.appendChild(button);
        }

        /*
         * Avoid duplicate click listeners.
         */
        if (
            button.dataset.downloadListenerBound !== "true"
        ) {
            button.dataset.downloadListenerBound = "true";

            button.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();

                /*
                 * Download is allowed only after the audio
                 * has genuinely finished.
                 */
                if (!audio.ended) {
                    return;
                }

                performDownload(
                    audio,
                    config.filename,
                    button
                );
            });
        }

        return button;
    }

    function setupPlayer(config) {
        const player = document.querySelector(
            config.playerSelector
        );

        const audio = document.querySelector(
            config.audioSelector
        );

        if (!player || !audio) {
            return false;
        }

        const button = createDownloadButton(
            config,
            player,
            audio
        );

        if (!button) {
            return false;
        }

        /*
         * Already bound?
         */
        if (
            audio.dataset.voiceDownloadEventsBound === "true"
        ) {
            if (audio.ended) {
                showDownload(button);
            } else {
                hideDownload(button);
            }

            return true;
        }

        audio.dataset.voiceDownloadEventsBound = "true";

        /*
         * Initial state.
         */
        hideDownload(button);

        /*
         * Fresh playback starts:
         * hide Download immediately.
         */
        const hide = () => {
            hideDownload(button);
        };

        audio.addEventListener("play", hide);
        audio.addEventListener("playing", hide);
        audio.addEventListener("seeking", hide);
        audio.addEventListener("emptied", hide);
        audio.addEventListener("loadstart", hide);

        /*
         * Pause before completion:
         * Download stays hidden.
         */
        audio.addEventListener("pause", () => {
            if (audio.ended) {
                showDownload(button);
            } else {
                hideDownload(button);
            }
        });

        /*
         * THIS IS THE IMPORTANT PART:
         * Audio completely finished -> Download appears.
         */
        audio.addEventListener("ended", () => {
            showDownload(button);
        });

        /*
         * Replay button:
         * hide Download immediately.
         */
        const replay = player.querySelector(
            config.replaySelector
        );

        if (replay) {
            replay.addEventListener("click", () => {
                hideDownload(button);

                window.setTimeout(() => {
                    if (audio.ended) {
                        hideDownload(button);
                    }
                }, 50);
            });
        }

        /*
         * Safety sync.
         */
        if (audio.ended) {
            showDownload(button);
        }

        return true;
    }

    function setupAll() {
        installStyles();

        CONFIG.forEach((config) => {
            setupPlayer(config);
        });
    }

    function init() {
        setupAll();

        /*
         * A few lightweight retries only.
         * No MutationObserver and no continuous loop.
         */
        window.setTimeout(setupAll, 100);
        window.setTimeout(setupAll, 400);
        window.setTimeout(setupAll, 800);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );
    } else {
        init();
    }
})();