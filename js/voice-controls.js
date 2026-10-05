(() => {
    "use strict";

    const AUDIO_MAP = Object.freeze({
        "birthday-note": "birthday-note-audio",
        "final-note": "final-note-audio"
    });

    const SELECTORS = Object.freeze({
        playButtons:
            '[data-action="play-audio"][data-audio-id]',

        replayButtons:
            '[data-action="replay-audio"][data-audio-id]'
    });

    const boundButtons = new WeakSet();
    const boundAudios = new WeakSet();

    function getAudio(audioId) {
        if (!audioId) {
            return null;
        }

        const elementId = AUDIO_MAP[audioId];

        if (!elementId) {
            return null;
        }

        const audio = document.getElementById(elementId);

        return audio instanceof HTMLAudioElement
            ? audio
            : null;
    }

    function getPlayer(button) {
        return (
            button.closest(
                ".voice-player, .final-voice-player"
            ) || document
        );
    }

    function getStatusElement(audioId, player) {
        const idMap = {
            "birthday-note": "birthday-voice-status",
            "final-note": "final-voice-status"
        };

        const statusId = idMap[audioId];

        if (!statusId) {
            return null;
        }

        return (
            player.querySelector(`#${statusId}`) ||
            document.getElementById(statusId)
        );
    }

    function setButtonState(
        button,
        isPlaying
    ) {
        if (!button) {
            return;
        }

        button.classList.toggle(
            "is-playing",
            isPlaying
        );

        button.setAttribute(
            "aria-pressed",
            String(isPlaying)
        );

        const playIcon = button.querySelector(
            ".voice-control-button__play"
        );

        const pauseIcon = button.querySelector(
            ".voice-control-button__pause"
        );

        if (playIcon) {
            playIcon.hidden = isPlaying;
        }

        if (pauseIcon) {
            pauseIcon.hidden = !isPlaying;
        }

        button.setAttribute(
            "aria-label",
            isPlaying ? "Pause voice note" : "Play voice note"
        );
    }

    function setReplayVisibility(
        audioId,
        visible
    ) {
        const replayButtons = document.querySelectorAll(
            `${SELECTORS.replayButtons}[data-audio-id="${audioId}"]`
        );

        replayButtons.forEach((button) => {
            button.hidden = !visible;
        });
    }

    function setStatus(
        audioId,
        message,
        player
    ) {
        const status = getStatusElement(
            audioId,
            player
        );

        if (!status) {
            return;
        }

        status.textContent = message;
    }

    function resetControls(
        audioId
    ) {
        const playButtons = document.querySelectorAll(
            `${SELECTORS.playButtons}[data-audio-id="${audioId}"]`
        );

        playButtons.forEach((button) => {
            setButtonState(button, false);

            if (audioId === "birthday-note") {
                button.setAttribute(
                    "aria-label",
                    "Play voice note"
                );
            }

            if (audioId === "final-note") {
                button.setAttribute(
                    "aria-label",
                    "Play final voice note"
                );
            }
        });
    }

    function pauseOtherAudios(
        exceptAudio
    ) {
        document
            .querySelectorAll("audio.app-audio")
            .forEach((audio) => {
                if (
                    audio !== exceptAudio &&
                    !audio.paused
                ) {
                    audio.pause();
                }
            });
    }

    async function playAudio(
        audioId,
        button
    ) {
        const audio = getAudio(audioId);

        if (!audio) {
            console.warn(
                "[SehrishVoice] Audio element not found:",
                audioId
            );
            return;
        }

        pauseOtherAudios(audio);

        const player = getPlayer(button);

        try {
            await audio.play();

            setButtonState(button, true);

            setStatus(
                audioId,
                "Playing... 🎧✨",
                player
            );

            setReplayVisibility(
                audioId,
                false
            );
        } catch (error) {
            console.error(
                "[SehrishVoice] Play failed:",
                error
            );

            setButtonState(button, false);

            setStatus(
                audioId,
                "Oii... voice note play nahi ho paayi 😭",
                player
            );
        }
    }

    function pauseAudio(
        audioId,
        button
    ) {
        const audio = getAudio(audioId);

        if (!audio) {
            return;
        }

        audio.pause();

        setButtonState(
            button,
            false
        );

        setStatus(
            audioId,
            "Paused... tap to continue ✨",
            getPlayer(button)
        );
    }

    async function replayAudio(
        audioId,
        button
    ) {
        const audio = getAudio(audioId);

        if (!audio) {
            return;
        }

        pauseOtherAudios(audio);

        const player = getPlayer(button);

        try {
            audio.currentTime = 0;

            await audio.play();

            const playButton =
                player.querySelector(
                    `${SELECTORS.playButtons}[data-audio-id="${audioId}"]`
                ) ||
                document.querySelector(
                    `${SELECTORS.playButtons}[data-audio-id="${audioId}"]`
                );

            if (playButton) {
                setButtonState(
                    playButton,
                    true
                );
            }

            setReplayVisibility(
                audioId,
                false
            );

            setStatus(
                audioId,
                "Playing again... 🎧✨",
                player
            );
        } catch (error) {
            console.error(
                "[SehrishVoice] Replay failed:",
                error
            );
        }
    }

    function bindPlayButton(
        button
    ) {
        if (
            !(button instanceof HTMLButtonElement) ||
            boundButtons.has(button)
        ) {
            return;
        }

        boundButtons.add(button);

        button.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                const audioId =
                    button.dataset.audioId;

                const audio =
                    getAudio(audioId);

                if (!audio) {
                    return;
                }

                if (audio.paused) {
                    void playAudio(
                        audioId,
                        button
                    );
                } else {
                    pauseAudio(
                        audioId,
                        button
                    );
                }
            }
        );

        setButtonState(
            button,
            false
        );
    }

    function bindReplayButton(
        button
    ) {
        if (
            !(button instanceof HTMLButtonElement) ||
            boundButtons.has(button)
        ) {
            return;
        }

        boundButtons.add(button);

        button.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                void replayAudio(
                    button.dataset.audioId,
                    button
                );
            }
        );
    }

    function bindAudio(
        audio
    ) {
        if (
            !(audio instanceof HTMLAudioElement) ||
            boundAudios.has(audio)
        ) {
            return;
        }

        boundAudios.add(audio);

        const audioId = Object.keys(
            AUDIO_MAP
        ).find(
            (key) =>
                AUDIO_MAP[key] === audio.id
        );

        if (!audioId) {
            return;
        }

        audio.addEventListener(
            "play",
            () => {
                const playButtons =
                    document.querySelectorAll(
                        `${SELECTORS.playButtons}[data-audio-id="${audioId}"]`
                    );

                playButtons.forEach(
                    (button) => {
                        setButtonState(
                            button,
                            true
                        );
                    }
                );

                setReplayVisibility(
                    audioId,
                    false
                );
            }
        );

        audio.addEventListener(
            "pause",
            () => {
                if (audio.ended) {
                    return;
                }

                resetControls(
                    audioId
                );
            }
        );

        audio.addEventListener(
            "ended",
            () => {
                resetControls(
                    audioId
                );

                setReplayVisibility(
                    audioId,
                    true
                );

                const status =
                    getStatusElement(
                        audioId,
                        document
                    );

                if (status) {
                    status.textContent =
                        audioId ===
                        "birthday-note"
                            ? "Voice note finished ✨"
                            : "Final voice note finished 🤍";
                }
            }
        );

        audio.addEventListener(
            "error",
            () => {
                resetControls(
                    audioId
                );

                console.error(
                    "[SehrishVoice] Audio error:",
                    audioId,
                    audio.error
                );
            }
        );
    }

    function init() {
        document
            .querySelectorAll(
                SELECTORS.playButtons
            )
            .forEach(bindPlayButton);

        document
            .querySelectorAll(
                SELECTORS.replayButtons
            )
            .forEach(bindReplayButton);

        document
            .querySelectorAll(
                "audio.app-audio"
            )
            .forEach(bindAudio);

        console.log(
            "[SehrishVoice] Voice controls initialized."
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );
    } else {
        init();
    }

    window.SehrishVoiceControls =
        Object.freeze({
            init,
            playAudio,
            pauseAudio,
            replayAudio
        });
})();