/* ============================================================================
 * SEHRISH BIRTHDAY WEBSITE
 * File: js/q1-quiz-fix.js
 *
 * PAGE 9 ONLY
 *
 * Handles ONLY:
 * - Q1 correct -> Q1 reel
 * - Q1 wrong -> clicked option only shakes
 * - Reel -> Q2
 * - Q2/Q3/Q4 correct -> next question
 * - Q2/Q3/Q4 wrong -> clicked option only shakes
 * - Internal quiz back buttons:
 *      Q2 -> Q1
 *      Q3 -> Q2
 *      Q4 -> Q3
 *
 * IMPORTANT:
 * - Normal Scene Back button is NOT changed.
 * - No other scene is changed.
 * - Existing question text is NOT changed.
 * - Existing quiz.js is prevented from handling Q1-Q4 option clicks.
 * ========================================================================== */

(() => {
    "use strict";

    const CONFIG = Object.freeze({
        sceneSelector:
            "#scene-9",

        containerSelector:
            "#quiz-container",

        reelSelector:
            "#quiz-reel-stage",

        reelVideoSelector:
            "#q1-reel-video",

        reelContinueSelector:
            '[data-action="continue-after-reel"]',

        progressSelector:
            "#quiz-progress-current",

        successSelector:
            "#quiz-success",

        wrongMessage:
            "Oii bacchiii 😂 ye tere seee na ho payegaaa!",

        answers: Object.freeze({
            "1": "1",
            "2": "3",
            "3": "2",
            "4": "4"
        })
    });

    let initialized = false;

    let currentPart = "question";

    let currentQuestion = 1;

    let clickLocked = false;

    /* ------------------------------------------------------------------------
     * HELPERS
     * --------------------------------------------------------------------- */

    function $(selector) {
        return document.querySelector(selector);
    }

    function getScene() {
        return $(CONFIG.sceneSelector);
    }

    function getContainer() {
        return $(CONFIG.containerSelector);
    }

    function getQuestion(number) {
        return $(`#quiz-question-${number}`);
    }

    function getFeedback(number) {
        return $(`#quiz-feedback-${number}`);
    }

    function getReel() {
        return $(CONFIG.reelSelector);
    }

    function getVideo() {
        return $(CONFIG.reelVideoSelector);
    }

    function getSuccess() {
        return $(CONFIG.successSelector);
    }

    function setProgress(number) {
        const progress = $(CONFIG.progressSelector);

        if (progress) {
            progress.textContent = String(number);
        }
    }

    function setQuizState(value) {
        const container = getContainer();

        if (!container) {
            return;
        }

        container.dataset.currentQuestion =
            String(value);

        container.dataset.quizState =
            value === "reel"
                ? "reel"
                : "question";
    }

    function clearFeedback(number) {
        const feedback =
            getFeedback(number);

        if (feedback) {
            feedback.textContent = "";
        }
    }

    function clearAllFeedback() {
        for (let i = 1; i <= 4; i += 1) {
            clearFeedback(i);
        }
    }

    function resetButtonState(button) {
        if (!(button instanceof HTMLElement)) {
            return;
        }

        button.classList.remove(
            "is-wrong",
            "is-correct",
            "is-locked"
        );

        if (button instanceof HTMLButtonElement) {
            button.disabled = false;
        }
    }

    function resetQuestionButtons(question) {
        if (!question) {
            return;
        }

        question
            .querySelectorAll(".quiz-option")
            .forEach(resetButtonState);
    }

    function resetAllQuestionButtons() {
        for (let i = 1; i <= 4; i += 1) {
            resetQuestionButtons(
                getQuestion(i)
            );
        }
    }

    /* ------------------------------------------------------------------------
     * VISIBILITY
     * --------------------------------------------------------------------- */

    function hideAllQuestions() {
        for (let i = 1; i <= 4; i += 1) {
            const question =
                getQuestion(i);

            if (!question) {
                continue;
            }

            question.hidden = true;

            question.classList.remove(
                "is-current"
            );

            question.setAttribute(
                "aria-hidden",
                "true"
            );
        }
    }

    function hideSuccess() {
        const success = getSuccess();

        if (!success) {
            return;
        }

        success.hidden = true;

        success.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function hideReel() {
        const reel = getReel();
        const video = getVideo();

        if (video) {
            try {
                video.pause();
            } catch {
                /* non-fatal */
            }

            try {
                video.currentTime = 0;
            } catch {
                /* non-fatal */
            }
        }

        if (!reel) {
            return;
        }

        reel.hidden = true;

        reel.classList.remove(
            "is-visible"
        );

        reel.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function showQuestion(number) {
        const question =
            getQuestion(number);

        if (!question) {
            return false;
        }

        hideReel();
        hideSuccess();
        hideAllQuestions();

        clearAllFeedback();
        resetAllQuestionButtons();

        question.hidden = false;

        question.setAttribute(
            "aria-hidden",
            "false"
        );

        question.classList.add(
            "is-current"
        );

        currentPart = "question";
        currentQuestion = number;
        clickLocked = false;

        setProgress(number);
        setQuizState(number);

        syncInternalBackButtons();

        return true;
    }

    /* ------------------------------------------------------------------------
     * WRONG ANSWER
     * --------------------------------------------------------------------- */

    function showWrong(number) {
        const feedback =
            getFeedback(number);

        if (feedback) {
            feedback.textContent =
                CONFIG.wrongMessage;
        }
    }

    function shakeOnly(button) {
        if (!(button instanceof HTMLElement)) {
            return;
        }

        /*
         * Only the clicked option receives the class.
         */
        button.classList.remove(
            "is-wrong"
        );

        /*
         * Restart animation every time.
         */
        void button.offsetWidth;

        button.classList.add(
            "is-wrong"
        );

        window.setTimeout(() => {
            button.classList.remove(
                "is-wrong"
            );
        }, 500);
    }

    /* ------------------------------------------------------------------------
     * Q1 REEL
     * --------------------------------------------------------------------- */

    function showQ1Reel() {
        const reel = getReel();
        const video = getVideo();

        if (!reel || !video) {
            console.warn(
                "[Q1Fix] Q1 reel stage/video not found."
            );
            return;
        }

        hideAllQuestions();
        hideSuccess();
        clearAllFeedback();

        reel.hidden = false;

        reel.setAttribute(
            "aria-hidden",
            "false"
        );

        reel.classList.add(
            "is-visible"
        );

        currentPart = "reel";
        currentQuestion = 1;
        clickLocked = false;

        setQuizState("reel");

        try {
            video.pause();
        } catch {
            /* non-fatal */
        }

        try {
            video.currentTime = 0;
        } catch {
            /* non-fatal */
        }

        /*
         * The click on Q1 is already a user gesture,
         * so start the reel immediately.
         */
        const playPromise =
            video.play();

        if (
            playPromise &&
            typeof playPromise.catch ===
                "function"
        ) {
            playPromise.catch(
                (error) => {
                    console.warn(
                        "[Q1Fix] Reel playback was blocked:",
                        error
                    );
                }
            );
        }
    }

    /* ------------------------------------------------------------------------
     * Q4 SUCCESS
     * --------------------------------------------------------------------- */

    function showSuccess() {
        const question =
            getQuestion(4);

        const success =
            getSuccess();

        if (!question || !success) {
            return;
        }

        hideReel();
        hideAllQuestions();

        question.hidden = false;

        question.setAttribute(
            "aria-hidden",
            "false"
        );

        question.classList.add(
            "is-current"
        );

        const card =
            question.querySelector(
                ".quiz-question__card"
            );

        const options =
            question.querySelector(
                ".quiz-options"
            );

        const feedback =
            getFeedback(4);

        if (card) {
            card.hidden = true;
        }

        if (options) {
            options.hidden = true;
        }

        if (feedback) {
            feedback.hidden = true;
        }

        success.hidden = false;

        success.setAttribute(
            "aria-hidden",
            "false"
        );

        currentPart = "success";
        currentQuestion = 4;
        clickLocked = false;

        setProgress(4);
        setQuizState("success");

        syncInternalBackButtons();
    }

    function restoreQuestionFour() {
        const question =
            getQuestion(4);

        const success =
            getSuccess();

        if (!question) {
            return;
        }

        const card =
            question.querySelector(
                ".quiz-question__card"
            );

        const options =
            question.querySelector(
                ".quiz-options"
            );

        const feedback =
            getFeedback(4);

        if (card) {
            card.hidden = false;
        }

        if (options) {
            options.hidden = false;
        }

        if (feedback) {
            feedback.hidden = false;
        }

        if (success) {
            success.hidden = true;

            success.setAttribute(
                "aria-hidden",
                "true"
            );
        }
    }

    /* ------------------------------------------------------------------------
     * NEXT QUESTION
     * --------------------------------------------------------------------- */

    function goNextFromQuestion(number) {
        if (number === 1) {
            showQ1Reel();
            return;
        }

        if (number === 2) {
            window.setTimeout(() => {
                showQuestion(3);
            }, 300);

            return;
        }

        if (number === 3) {
            window.setTimeout(() => {
                showQuestion(4);
            }, 300);

            return;
        }

        if (number === 4) {
            window.setTimeout(() => {
                showSuccess();
            }, 300);
        }
    }

    /* ------------------------------------------------------------------------
     * OPTION CLICK
     * --------------------------------------------------------------------- */

    function handleOptionClick(event) {
        const target =
            event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const option =
            target.closest(
                ".quiz-option"
            );

        if (!(option instanceof HTMLButtonElement)) {
            return;
        }

        const scene =
            getScene();

        if (!scene || !scene.contains(option)) {
            return;
        }

        const question =
            option.closest(
                ".quiz-question"
            );

        if (!question) {
            return;
        }

        const number =
            question.dataset.question;

        if (
            !number ||
            !CONFIG.answers[number]
        ) {
            return;
        }

        /*
         * CRITICAL:
         * Stop the existing generic quiz handler.
         * This prevents the extra UI/state change.
         */
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (clickLocked) {
            return;
        }

        const selected =
            option.dataset.quizAnswer || "";

        const correct =
            CONFIG.answers[number];

        /*
         * WRONG
         */
        if (selected !== correct) {
            showWrong(number);
            shakeOnly(option);
            return;
        }

        /*
         * CORRECT
         */
        clickLocked = true;

        clearFeedback(number);

        option.classList.remove(
            "is-wrong"
        );

        option.classList.add(
            "is-correct"
        );

        goNextFromQuestion(
            Number(number)
        );
    }

    /* ------------------------------------------------------------------------
     * REEL CONTINUE
     * --------------------------------------------------------------------- */

    function handleReelContinue(event) {
        const target =
            event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const button =
            target.closest(
                CONFIG.reelContinueSelector
            );

        if (!(button instanceof HTMLElement)) {
            return;
        }

        const reel =
            getReel();

        if (!reel || reel.hidden) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        showQuestion(2);
    }

    /* ------------------------------------------------------------------------
     * INTERNAL QUIZ BACK BUTTONS
     * --------------------------------------------------------------------- */

    function createInternalBackButton(
        question
    ) {
        if (!question) {
            return null;
        }

        let button =
            question.querySelector(
                ".quiz-internal-back"
            );

        if (button) {
            return button;
        }

        button =
            document.createElement(
                "button"
            );

        button.type = "button";

        button.className =
            "quiz-internal-back";

        button.textContent =
            "← Back";

        button.setAttribute(
            "aria-label",
            "Previous quiz question"
        );

        button.dataset.quizInternalBack =
            "true";

        question.prepend(button);

        return button;
    }

    function installInternalBackStyles() {
        if (
            document.getElementById(
                "q1-quiz-fix-styles"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "q1-quiz-fix-styles";

        style.textContent = `
            #scene-9 .quiz-internal-back {
                display: inline-flex;
                align-items: center;
                justify-content: center;

                align-self: flex-start;

                width: auto;
                min-width: 72px;
                min-height: 32px;

                margin: 0 0 5px 0;
                padding: 5px 11px;

                border: 0;
                border-radius: 999px;

                background: rgba(255, 255, 255, 0.82);

                color: var(--brown-400);

                font-size: 0.72rem;
                font-weight: 800;

                cursor: pointer;

                box-shadow:
                    0 6px 14px rgba(100, 65, 87, 0.08);

                transition:
                    transform 180ms ease,
                    box-shadow 180ms ease;
            }

            #scene-9 .quiz-internal-back:hover {
                transform: translateY(-1px);

                box-shadow:
                    0 8px 16px rgba(100, 65, 87, 0.11);
            }

            #scene-9 .quiz-internal-back:active {
                transform: scale(0.98);
            }

            #scene-9 .quiz-internal-back:focus-visible {
                outline:
                    2px solid rgba(203, 178, 242, 0.75);

                outline-offset: 2px;
            }

            #scene-9 .quiz-internal-back {
                position: relative;
                z-index: 5;
            }
        `;

        document.head.appendChild(
            style
        );
    }

    function syncInternalBackButtons() {
        const q2 =
            getQuestion(2);

        const q3 =
            getQuestion(3);

        const q4 =
            getQuestion(4);

        /*
         * Only Q2/Q3/Q4 get an internal quiz back button.
         *
         * The normal Scene Back button remains untouched.
         */
        const q2Button =
            createInternalBackButton(
                q2
            );

        const q3Button =
            createInternalBackButton(
                q3
            );

        const q4Button =
            createInternalBackButton(
                q4
            );

        if (q2Button) {
            q2Button.dataset.previousQuestion =
                "1";
        }

        if (q3Button) {
            q3Button.dataset.previousQuestion =
                "2";
        }

        if (q4Button) {
            q4Button.dataset.previousQuestion =
                "3";
        }

        /*
         * Show only while that question is active.
         */
        [q2Button, q3Button, q4Button]
            .filter(Boolean)
            .forEach((button) => {
                const question =
                    button.closest(
                        ".quiz-question"
                    );

                const number =
                    question?.dataset.question;

                button.hidden =
                    !(
                        currentPart ===
                            "question" &&
                        String(currentQuestion) ===
                            String(number)
                    );
            });

        /*
         * During success state, Q4's internal Back
         * should remain available.
         */
        if (
            q4Button &&
            currentPart === "success"
        ) {
            q4Button.hidden = false;
        }
    }

    function handleInternalBack(event) {
        const target =
            event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const button =
            target.closest(
                ".quiz-internal-back"
            );

        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        const question =
            button.closest(
                ".quiz-question"
            );

        if (!question) {
            return;
        }

        const previous =
            Number(
                button.dataset.previousQuestion
            );

        if (
            !Number.isFinite(previous) ||
            previous < 1 ||
            previous > 3
        ) {
            return;
        }

        /*
         * This is the quiz-internal Back.
         * The normal scene Back is not affected.
         */
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        clickLocked = false;

        if (previous === 3) {
            restoreQuestionFour();
        }

        showQuestion(previous);
    }

    /* ------------------------------------------------------------------------
     * INIT
     * --------------------------------------------------------------------- */

    function initialize() {
        if (initialized) {
            return;
        }

        initialized = true;

        installInternalBackStyles();
        syncInternalBackButtons();

        /*
         * Capture-phase handlers run before the generic quiz handler.
         */
        document.addEventListener(
            "click",
            handleInternalBack,
            true
        );

        document.addEventListener(
            "click",
            handleOptionClick,
            true
        );

        document.addEventListener(
            "click",
            handleReelContinue,
            true
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );
    } else {
        initialize();
    }

})();