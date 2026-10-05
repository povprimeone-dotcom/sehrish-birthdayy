'use strict';

/**
 * ============================================================================
 * SEHRISH BIRTHDAY EXPERIENCE
 * ============================================================================
 * File    : js/quiz.js
 * Purpose : Page 9 — Personal Birthday Quiz only.
 *
 * IMPORTANT PROJECT RULES
 * - Exactly 4 questions.
 * - Wrong answer stays on the same question.
 * - Wrong option ONLY shakes.
 * - Wrong reaction is EXACTLY:
 *     Oii bacchiii 😂 ye tere seee na ho payegaaa!
 * - Correct answers move forward.
 * - Q1 correct answer shows and auto-plays q1-reel.mp4 first.
 * - Q1 reel has "Chalooo, Ab Q2 ✨".
 * - Q2/Q3/Q4 correct answers show a short correct-answer reaction.
 * - Q4 success shows Yaaaayyy! / You Passedddd! 🎀✨.
 * - Q4 success button goes to Page 10 / Balloon Game.
 * - Internal quiz Back:
 *     Q2 → Q1
 *     Q3 → Q2
 *     Q4 → Q3
 * - The normal scene Back button is NEVER touched.
 * - No audio asset is hard-coded by this file.
 */

const QUIZ_DATA = Object.freeze([
    {
        number: 1,
        text: `Heyyy babyy Girllll...<br>sach sach bataooo,<br>Tum mujhse kitnaa pyar karti ho?👀`,
        options: [
            'Bilkul bhi nahiiii 😭',
            'Bohot hiiii jadaaaa 😂',
            'Bas thodaaa saa 😌'
        ],
        correct: 1
    },
    {
        number: 2,
        text: `Tumhe kya lagta hai, tumhari kaunsi cute aadat sabse jaaadaaa mujhe pasand haiii? 👀😂`,
        options: [
            'Bacchaaa 😭🎀',
            'Babyyy Boyyy 😂',
            'Kaahduuusss 😤😂'
        ],
        correct: 3
    },
    {
        number: 3,
        text: `Sach sach bataooo... tum ho kyaaa? 👀😂`,
        options: [
            'Masoom bacchiii 😇',
            'Chudail 👻😂',
            'Dono ka combo 💀😂'
        ],
        correct: 2
    },
    {
        number: 4,
        text: `Last oneee... soch samajh ke answer denaaa 👀😂<br><br>Ab tak ka ye surprise tumhe kaisa lag raha hai?`,
        options: [
            'Boringgg 😴',
            'Thodaaa cuteee 🌸',
            'Kaafi acchaaa 👀✨',
            'Yaarrr, expected se bhi zyadaaa 😂🎀'
        ],
        correct: 4
    }
]);

const WRONG_MESSAGE =
    'Oii bacchiii 😂 ye tere seee na ho payegaaa!';

const QUIZ_ROOT_SELECTOR =
    '#quiz-container, [data-quiz], .birthday-quiz';

const QUIZ_SCENE_SELECTOR =
    '[data-scene-name="personal-quiz"], #scene-9, #scene-10';

class BirthdayQuizManager {
    constructor() {
        this.root = null;
        this.scene = null;
        this.questions = [];
        this.currentQuestion = 1;
        this.started = false;
        this.completed = false;
        this.q1Solved = false;
        this._bound = false;
        this._styleInjected = false;
        this._timers = new Set();
    }

    init() {
        if (this._bound && this.root) {
            return this;
        }

        this.scene =
            document.querySelector(QUIZ_SCENE_SELECTOR);

        this.root =
            this.scene?.querySelector(QUIZ_ROOT_SELECTOR)
            || document.querySelector(QUIZ_ROOT_SELECTOR);

        if (!this.root) {
            return this;
        }

        this.injectStyles();
        this.prepareQuestions();
        this.bind();

        this.started = true;
        this.completed = false;

        this.showQuestion(1, {
            preserveQ1: false
        });

        return this;
    }

    prepareQuestions() {
        this.questions = QUIZ_DATA.map((data) => {
            const element =
                this.root.querySelector(
                    `#quiz-question-${data.number}`
                )
                || this.root.querySelector(
                    `[data-question="${data.number}"]`
                );

            if (!element) {
                return {
                    ...data,
                    element: null
                };
            }

            element.dataset.question =
                String(data.number);

            element.dataset.correctAnswer =
                String(data.correct);

            const textElement =
                element.querySelector(
                    '.quiz-question__text, [data-quiz-text]'
                );

            if (textElement) {
                textElement.innerHTML = data.text;
            }

            let options = Array.from(
                element.querySelectorAll('.quiz-option')
            );

            let optionList =
                element.querySelector('.quiz-options');

            if (!optionList) {
                optionList =
                    document.createElement('div');

                optionList.className =
                    'quiz-options';

                optionList.setAttribute(
                    'role',
                    'group'
                );

                element.appendChild(optionList);
            }

            while (
                options.length <
                data.options.length
            ) {
                const button =
                    document.createElement('button');

                button.type = 'button';

                button.className =
                    'quiz-option';

                button.innerHTML = `
                    <span class="quiz-option__number"></span>
                    <span class="quiz-option__text"></span>
                `;

                optionList.appendChild(button);
                options.push(button);
            }

            options.forEach((button, index) => {
                const active =
                    index < data.options.length;

                button.hidden = !active;

                if (!active) {
                    return;
                }

                button.type = 'button';

                button.dataset.quizAnswer =
                    String(index + 1);

                button.dataset.correct =
                    String(
                        index + 1 === data.correct
                    );

                button.disabled = false;

                button.removeAttribute(
                    'aria-disabled'
                );

                button.setAttribute(
                    'aria-pressed',
                    'false'
                );

                button.dataset.answerState =
                    'idle';

                const numberElement =
                    button.querySelector(
                        '.quiz-option__number'
                    );

                if (numberElement) {
                    numberElement.textContent =
                        String(index + 1);
                }

                const textNode =
                    button.querySelector(
                        '.quiz-option__text'
                    );

                if (textNode) {
                    textNode.textContent =
                        data.options[index];
                } else {
                    button.textContent =
                        data.options[index];
                }

                button.classList.remove(
                    'is-wrong',
                    'is-correct',
                    'quiz-option--wrong',
                    'quiz-option--correct',
                    'quiz-option-selected',
                    'quiz-option-disabled'
                );
            });

            element.hidden =
                data.number !== 1;

            element.setAttribute(
                'aria-hidden',
                data.number === 1
                    ? 'false'
                    : 'true'
            );

            element.classList.toggle(
                'is-current',
                data.number === 1
            );

            this.addInternalBackButton(
                element,
                data.number
            );

            return {
                ...data,
                element
            };
        });
    }

    addInternalBackButton(
        questionElement,
        questionNumber
    ) {
        const existing =
            questionElement.querySelector(
                ':scope > .quiz-internal-back'
            );

        if (questionNumber === 1) {
            existing?.remove();
            return;
        }

        if (existing) {
            existing.dataset.fromQuestion =
                String(questionNumber);

            return;
        }

        const button =
            document.createElement('button');

        button.type = 'button';

        button.className =
            'quiz-internal-back';

        button.dataset.quizInternalBack =
            'true';

        button.dataset.fromQuestion =
            String(questionNumber);

        button.setAttribute(
            'aria-label',
            `Back to question ${questionNumber - 1}`
        );

        button.textContent = '← Back';

        questionElement.insertBefore(
            button,
            questionElement.firstChild
        );
    }

    bind() {
        if (this._bound) {
            return;
        }

        this._bound = true;

        /*
         * Direct capture listeners are intentional.
         * They make this quiz the only owner of quiz-option clicks
         * and prevent older generic handlers from adding unwanted
         * feedback UI.
         */
        this.questions.forEach((question) => {
            if (!question.element) {
                return;
            }

            question.element
                .querySelectorAll('.quiz-option')
                .forEach((button) => {
                    if (
                        button.dataset.quizBound ===
                        'true'
                    ) {
                        return;
                    }

                    button.dataset.quizBound =
                        'true';

                    button.addEventListener(
                        'click',
                        (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            event.stopImmediatePropagation();

                            const answer =
                                Number(
                                    button.dataset.quizAnswer
                                );

                            this.answer(answer);
                        },
                        true
                    );
                });
        });

        this.root.addEventListener(
            'click',
            (event) => {
                const target =
                    event.target instanceof Element
                        ? event.target
                        : null;

                if (!target) {
                    return;
                }

                const internalBack =
                    target.closest(
                        '.quiz-internal-back'
                    );

                if (
                    internalBack &&
                    this.root.contains(internalBack)
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    const from =
                        Number(
                            internalBack.dataset.fromQuestion
                        );

                    this.previous(from - 1);

                    return;
                }

                const continueButton =
                    target.closest(
                        '[data-action="continue-after-reel"]'
                    );

                if (
                    continueButton &&
                    this.root.contains(continueButton)
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    this.continueAfterReel();
                }
            },
            true
        );
    }

    answer(answerNumber) {
        if (
            !this.started ||
            this.completed
        ) {
            return false;
        }

        const question =
            this.questions.find(
                (item) =>
                    item.number ===
                    this.currentQuestion
            );

        if (!question?.element) {
            return false;
        }

        const buttons =
            Array.from(
                question.element.querySelectorAll(
                    '.quiz-option'
                )
            );

        const button =
            buttons.find(
                (item) =>
                    Number(
                        item.dataset.quizAnswer
                    ) === answerNumber
            );

        if (!button) {
            return false;
        }

        if (button.disabled) {
            return false;
        }

        const correct =
            answerNumber === question.correct;

        if (!correct) {
            this.handleWrong(
                button,
                question.element
            );

            return false;
        }

        this.handleCorrect(
            button,
            question.element
        );

        return true;
    }

    handleWrong(
        button,
        questionElement
    ) {
        this.clearWrongStates();

        /*
         * Wrong answer:
         * Do NOT show a popup/message.
         * Only the clicked wrong button shakes.
         */
        button.classList.remove(
            'is-wrong',
            'quiz-option--wrong'
        );

        void button.offsetWidth;

        button.classList.add(
            'quiz-option--wrong'
        );

        button.setAttribute(
            'aria-pressed',
            'true'
        );

        button.dataset.answerState =
            'wrong';

        const timer =
            window.setTimeout(() => {
                button.classList.remove(
                    'quiz-option--wrong'
                );

                this._timers.delete(timer);
            }, 520);

        this._timers.add(timer);
    }

    handleCorrect(
        button,
        questionElement
    ) {
        this.hideWrongMessage(
            questionElement
        );

        const buttons =
            Array.from(
                questionElement.querySelectorAll(
                    '.quiz-option'
                )
            );

        buttons.forEach((item) => {
            item.disabled = true;

            item.setAttribute(
                'aria-disabled',
                'true'
            );
        });

        button.classList.remove(
            'is-wrong',
            'quiz-option--wrong'
        );

        button.classList.add(
            'quiz-option--correct'
        );

        button.setAttribute(
            'aria-pressed',
            'true'
        );

        button.dataset.answerState =
            'correct';

        const current =
            this.currentQuestion;

        /*
         * Q1 keeps the existing special reel flow.
         */
        if (current === 1) {
            const timer =
                window.setTimeout(() => {
                    this._timers.delete(
                        timer
                    );

                    this.q1Solved = true;

                    this.showQ1Reel();
                }, 420);

            this._timers.add(timer);

            return;
        }

        /*
         * Q2, Q3 and Q4 clearly confirm
         * the correct answer first.
         */
        this.showCorrectMessage(
            questionElement
        );

        const timer =
            window.setTimeout(() => {
                this._timers.delete(
                    timer
                );

                if (
                    current <
                    QUIZ_DATA.length
                ) {
                    this.showQuestion(
                        current + 1,
                        {
                            preserveQ1: true
                        }
                    );

                    return;
                }

                this.showQuizSuccess();
            }, 2400);

        this._timers.add(timer);
    }

    showQ1Reel() {
        const stage =
            this.root.querySelector(
                '#quiz-reel-stage, .quiz-reel-stage'
            );

        if (!stage) {
            this.showQuestion(
                2,
                {
                    preserveQ1: true
                }
            );

            return;
        }

        this.hideAllQuestions();

        const q1 =
            this.questions.find(
                (item) => item.number === 1
            );

        if (q1?.element) {
            q1.element.hidden = false;

            q1.element.setAttribute(
                'aria-hidden',
                'false'
            );

            q1.element.classList.add(
                'is-current'
            );

            q1.element
                .querySelectorAll(
                    '.quiz-option'
                )
                .forEach((button) => {
                    button.disabled = true;

                    button.setAttribute(
                        'aria-disabled',
                        'true'
                    );

                    if (
                        Number(
                            button.dataset.quizAnswer
                        ) === q1.correct
                    ) {
                        button.classList.add(
                            'quiz-option--correct'
                        );
                    }
                });

            this.hideWrongMessage(
                q1.element
            );
        }

        stage.hidden = false;

        stage.setAttribute(
            'aria-hidden',
            'false'
        );

        stage.classList.add(
            'is-visible'
        );

        const after =
            stage.querySelector(
                '.quiz-reel-stage__after'
            );

        if (after) {
            after.hidden = false;

            after.classList.add(
                'is-visible'
            );
        }

        const status =
            stage.querySelector(
                '#q1-reel-status'
            );

        if (status) {
            status.textContent = '✨';
        }

        const video =
            stage.querySelector(
                '#q1-reel-video, video.q1-reel-video'
            );

        if (video) {
            try {
                video.currentTime = 0;
                video.muted = false;

                const playResult =
                    video.play();

                if (playResult?.catch) {
                    playResult.catch(() => {
                        /*
                         * Browser autoplay policies may block playback.
                         * Native video controls remain available.
                         */
                    });
                }
            } catch {
                // Native controls remain available.
            }
        }
    }

    continueAfterReel() {
        this.q1Solved = true;

        this.showQuestion(
            2,
            {
                preserveQ1: true
            }
        );
    }

    showQuestion(
        number,
        options = {}
    ) {
        const targetNumber =
            Number(number);

        if (
            !Number.isInteger(
                targetNumber
            ) ||
            targetNumber < 1 ||
            targetNumber > QUIZ_DATA.length
        ) {
            return false;
        }

        this.currentQuestion =
            targetNumber;

        this.completed = false;

        const stage =
            this.root.querySelector(
                '#quiz-reel-stage, .quiz-reel-stage'
            );

        if (stage) {
            stage.hidden = true;

            stage.setAttribute(
                'aria-hidden',
                'true'
            );

            stage.classList.remove(
                'is-visible'
            );

            const after =
                stage.querySelector(
                    '.quiz-reel-stage__after'
                );

            if (after) {
                after.hidden = true;

                after.classList.remove(
                    'is-visible'
                );
            }
        }

        this.hideWrongMessageFromAllQuestions();

        this.hideCorrectMessageFromAllQuestions();

        this.hideSuccess();

        this.questions.forEach(
            (question) => {
                if (question.element) {
                    question.element.classList.remove(
                        'quiz-question--success'
                    );

                    question.element
                        .querySelector(
                            '.quiz-question__card'
                        )
                        ?.removeAttribute(
                            'hidden'
                        );

                    question.element
                        .querySelector(
                            '.quiz-options'
                        )
                        ?.removeAttribute(
                            'hidden'
                        );

                    question.element
                        .querySelector(
                            '.quiz-feedback'
                        )
                        ?.removeAttribute(
                            'hidden'
                        );
                }

                const active =
                    question.number ===
                    targetNumber;

                if (!question.element) {
                    return;
                }

                question.element.hidden =
                    !active;

                question.element.setAttribute(
                    'aria-hidden',
                    active
                        ? 'false'
                        : 'true'
                );

                question.element.classList.toggle(
                    'is-current',
                    active
                );

                if (!active) {
                    return;
                }

                const answeredBefore =
                    question.number === 1
                        ? Boolean(
                            options.preserveQ1 &&
                            this.q1Solved
                        )
                        : false;

                question.element
                    .querySelectorAll(
                        '.quiz-option'
                    )
                    .forEach((button) => {
                        button.disabled =
                            answeredBefore;

                        button.setAttribute(
                            'aria-disabled',
                            String(
                                answeredBefore
                            )
                        );

                        button.setAttribute(
                            'aria-pressed',
                            'false'
                        );

                        button.dataset.answerState =
                            'idle';

                        button.classList.remove(
                            'is-wrong',
                            'is-correct',
                            'quiz-option--wrong',
                            'quiz-option--correct',
                            'quiz-option-selected',
                            'quiz-option-disabled'
                        );

                        if (
                            answeredBefore &&
                            Number(
                                button.dataset.quizAnswer
                            ) === question.correct
                        ) {
                            button.classList.add(
                                'quiz-option--correct'
                            );

                            button.setAttribute(
                                'aria-pressed',
                                'true'
                            );

                            button.dataset.answerState =
                                'correct';
                        }
                    });
            }
        );

        this.updateProgress();

        return true;
    }

    previous(number) {
        const target =
            Number(number);

        if (
            !Number.isInteger(target) ||
            target < 1 ||
            target >= this.currentQuestion
        ) {
            return false;
        }

        if (
            target === 1 &&
            this.q1Solved
        ) {
            this.showQuestion(
                1,
                {
                    preserveQ1: true
                }
            );
        } else {
            this.showQuestion(
                target,
                {
                    preserveQ1: true
                }
            );
        }

        return true;
    }

    showQuizSuccess() {
        this.currentQuestion = 4;
        this.completed = true;

        this.hideAllQuestions();

        this.hideWrongMessageFromAllQuestions();

        this.hideCorrectMessageFromAllQuestions();

        const q4 =
            this.questions.find(
                (question) =>
                    question.number === 4
            );

        /*
         * IMPORTANT:
         * #quiz-success lives INSIDE Q4.
         * Therefore Q4 itself must remain visible.
         */
        if (q4?.element) {
            q4.element.hidden = false;

            q4.element.setAttribute(
                'aria-hidden',
                'false'
            );

            q4.element.classList.add(
                'is-current',
                'quiz-question--success'
            );

            q4.element
                .querySelector(
                    '.quiz-question__card'
                )
                ?.setAttribute(
                    'hidden',
                    ''
                );

            q4.element
                .querySelector(
                    '.quiz-options'
                )
                ?.setAttribute(
                    'hidden',
                    ''
                );

            q4.element
                .querySelector(
                    '.quiz-feedback'
                )
                ?.setAttribute(
                    'hidden',
                    ''
                );
        }

        const success =
            this.root.querySelector(
                '#quiz-success, .quiz-success'
            );

        if (!success) {
            console.warn(
                '[Quiz] #quiz-success element not found.'
            );

            return;
        }

        success.hidden = false;

        success.removeAttribute(
            'hidden'
        );

        success.setAttribute(
            'aria-hidden',
            'false'
        );

        success.classList.add(
            'is-visible'
        );

        success.style.setProperty(
            'display',
            'block',
            'important'
        );

        success.style.setProperty(
            'visibility',
            'visible',
            'important'
        );

        success.style.setProperty(
            'opacity',
            '1',
            'important'
        );

        success.style.setProperty(
            'pointer-events',
            'auto',
            'important'
        );

        const nextButton =
            success.querySelector(
                '[data-action="next-scene"], [data-nav="next"]'
            );

        if (nextButton) {
            const balloonScene =
                document.querySelector(
                    '[data-scene-name="balloon-game"]'
                );

            nextButton.dataset.targetScene =
                balloonScene?.dataset.scene ||
                '10';
        }

        this.updateProgress();
    }

    hideAllQuestions() {
        this.questions.forEach(
            (question) => {
                if (!question.element) {
                    return;
                }

                question.element.hidden =
                    true;

                question.element.setAttribute(
                    'aria-hidden',
                    'true'
                );

                question.element.classList.remove(
                    'is-current'
                );
            }
        );
    }

    hideSuccess() {
        const success =
            this.root.querySelector(
                '#quiz-success, .quiz-success'
            );

        if (!success) {
            return;
        }

        success.hidden = true;

        success.setAttribute(
            'aria-hidden',
            'true'
        );

        success.classList.remove(
            'is-visible'
        );
    }

    showCorrectMessage(
        questionElement
    ) {
        if (!questionElement) {
            return;
        }

        let message =
            questionElement.querySelector(
                ':scope > .quiz-inline-correct'
            );

        if (!message) {
            message =
                document.createElement(
                    'div'
                );

            message.className =
                'quiz-inline-correct';

            message.setAttribute(
                'role',
                'status'
            );

            message.setAttribute(
                'aria-live',
                'polite'
            );

            const options =
                questionElement.querySelector(
                    '.quiz-options'
                );

            if (options) {
                options.insertAdjacentElement(
                    'afterend',
                    message
                );
            } else {
                questionElement.appendChild(
                    message
                );
            }
        }

        message.textContent =
            'Yessss! Sahi answerrr! 🎀✨';

        message.hidden = false;

        message.classList.add(
            'is-visible'
        );
    }

    hideCorrectMessage(
        questionElement
    ) {
        if (!questionElement) {
            return;
        }

        const message =
            questionElement.querySelector(
                ':scope > .quiz-inline-correct'
            );

        if (!message) {
            return;
        }

        message.hidden = true;

        message.classList.remove(
            'is-visible'
        );
    }

    hideCorrectMessageFromAllQuestions() {
        this.questions.forEach(
            (question) => {
                this.hideCorrectMessage(
                    question.element
                );
            }
        );
    }

    hideWrongMessage(
        questionElement
    ) {

        let message =
            questionElement.querySelector(
                ':scope > .quiz-inline-reaction'
            );

        if (!message) {
            message =
                document.createElement(
                    'div'
                );

            message.className =
                'quiz-inline-reaction';

            message.setAttribute(
                'role',
                'status'
            );

            message.setAttribute(
                'aria-live',
                'polite'
            );

            const options =
                questionElement.querySelector(
                    '.quiz-options'
                );

            if (options) {
                options.insertAdjacentElement(
                    'afterend',
                    message
                );
            } else {
                questionElement.appendChild(
                    message
                );
            }
        }

        message.textContent =
            WRONG_MESSAGE;

        message.hidden = false;

        message.classList.add(
            'is-visible'
        );

        window.clearTimeout(
            Number(
                message.dataset.hideTimer
            ) || 0
        );

        const timer =
            window.setTimeout(() => {
                message.hidden = true;

                message.classList.remove(
                    'is-visible'
                );

                message.dataset.hideTimer =
                    '';
            }, 1800);

        message.dataset.hideTimer =
            String(timer);
    }

    hideWrongMessage(
        questionElement
    ) {
        if (!questionElement) {
            return;
        }

        const message =
            questionElement.querySelector(
                ':scope > .quiz-inline-reaction'
            );

        if (!message) {
            return;
        }

        window.clearTimeout(
            Number(
                message.dataset.hideTimer
            ) || 0
        );

        message.hidden = true;

        message.classList.remove(
            'is-visible'
        );

        message.dataset.hideTimer =
            '';
    }

    hideWrongMessageFromAllQuestions() {
        this.questions.forEach(
            (question) => {
                this.hideWrongMessage(
                    question.element
                );
            }
        );

        this.clearWrongStates();
    }

    clearWrongStates() {
        this.root
            ?.querySelectorAll(
                '.quiz-option--wrong, .is-wrong'
            )
            .forEach((button) => {
                button.classList.remove(
                    'quiz-option--wrong',
                    'is-wrong'
                );
            });
    }

    updateProgress() {
        const current =
            this.completed
                ? 4
                : this.currentQuestion;

        const currentElements =
            this.root.querySelectorAll(
                '#quiz-progress-current, .quiz-progress__current'
            );

        currentElements.forEach(
            (element) => {
                element.textContent =
                    String(current);
            }
        );

        const progress =
            this.root.querySelector(
                '.quiz-progress'
            );

        if (progress) {
            progress.setAttribute(
                'aria-label',
                `Question ${current} of 4`
            );
        }

        const container =
            this.root;

        if (container) {
            container.dataset.currentQuestion =
                String(current);

            container.dataset.quizState =
                this.completed
                    ? 'complete'
                    : 'question';
        }
    }

    injectStyles() {
        if (this._styleInjected) {
            return;
        }

        this._styleInjected = true;

        const style =
            document.createElement(
                'style'
            );

        style.id =
            'quiz-page9-fix-styles';

        style.textContent = `
            #quiz-container .quiz-feedback,
            #quiz-container [data-quiz-feedback],
            #quiz-container .quiz-status,
            #quiz-container [data-quiz-status],
            #quiz-container .quiz-result,
            #quiz-container [data-quiz-result] {
                display: none !important;
                visibility: hidden !important;
            }

            #quiz-container.quiz-feedback-visible,
            #quiz-container.quiz-wrong,
            #quiz-container.quiz-correct,
            #quiz-container.quiz-locked,
            #quiz-container.quiz-transitioning {
                /* old generic state classes are harmless */
            }

            #quiz-container .quiz-option--wrong {
                animation:
                    quizPage9WrongShake
                    520ms
                    ease
                    both !important;
            }

            #quiz-container .quiz-inline-correct {
                display: block !important;
                margin: 12px 0 0 !important;
                text-align: center !important;
                font-weight: 900 !important;
                font-size: 1rem !important;
                line-height: 1.35 !important;
                color: #28a745 !important;
                min-height: 1.4em;

                opacity: 0;
                visibility: hidden;
                transform: scale(0.9);

                transition:
                    opacity 180ms ease,
                    visibility 180ms ease,
                    transform 180ms ease;
            }

            #quiz-container .quiz-inline-correct.is-visible {
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: scale(1) !important;
                color: #28a745 !important;
            }

            #quiz-container .quiz-option--correct {
                animation:
                    quizPage9CorrectPop
                    420ms
                    ease
                    both !important;
            }

            #quiz-container .quiz-inline-reaction {
                margin: 10px 0 0;
                text-align: center;
                font-weight: 800;
                font-size: 0.9rem;
                line-height: 1.35;
                color: #e74c3c !important;
                min-height: 1.4em;
                opacity: 0;
                transform: translateY(-2px);
                transition:
                    opacity 180ms ease,
                    transform 180ms ease;
            }

            #quiz-container
            .quiz-inline-reaction.is-visible {
                opacity: 1;
                transform: translateY(0);
            }

            #quiz-container .quiz-inline-correct {
                margin: 12px 0 0;
                text-align: center;
                font-weight: 900;
                font-size: 1rem;
                line-height: 1.35;
                color: #28a745 !important;
                min-height: 1.4em;
                opacity: 0;
                transform: scale(0.9);
                transition:
                    opacity 180ms ease,
                    transform 180ms ease;
            }

            #quiz-container
            .quiz-inline-correct.is-visible {
                opacity: 1;
                transform: scale(1);
            }

            #quiz-container .quiz-question--success {
                display: block !important;
            }

            #quiz-container
            .quiz-question--success
            > .quiz-question__card[hidden],

            #quiz-container
            .quiz-question--success
            > .quiz-options[hidden],

            #quiz-container
            .quiz-question--success
            > .quiz-feedback[hidden] {
                display: none !important;
            }

            #quiz-container
            .quiz-question--success
            > .quiz-success {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }

            #quiz-container .quiz-internal-back {
                appearance: none;
                border: 0;
                background: transparent;
                color: var(--brown-300, #8d6f77);
                font: inherit;
                font-weight: 800;
                padding: 4px 0 9px;
                cursor: pointer;
                align-self: flex-start;
            }

            #quiz-container
            .quiz-internal-back:hover {
                text-decoration: underline;
            }

            #quiz-container
            .quiz-internal-back:focus-visible {
                outline: 2px solid currentColor;
                outline-offset: 3px;
                border-radius: 8px;
            }

            @keyframes quizPage9WrongShake {
                0%, 100% {
                    transform: translateX(0);
                }

                20% {
                    transform: translateX(-7px);
                }

                40% {
                    transform: translateX(7px);
                }

                60% {
                    transform: translateX(-5px);
                }

                80% {
                    transform: translateX(5px);
                }
            }

            @keyframes quizPage9CorrectPop {
                0% {
                    transform: scale(1);
                }

                45% {
                    transform: scale(1.035);
                }

                100% {
                    transform: scale(1);
                }
            }

            @media (prefers-reduced-motion: reduce) {
                #quiz-container .quiz-option--wrong,
                #quiz-container .quiz-option--correct {
                    animation-duration:
                        1ms !important;
                }

                #quiz-container
                .quiz-inline-reaction,

                #quiz-container
                .quiz-inline-correct {
                    transition: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    start() {
        if (!this.root) {
            this.init();
        }

        if (!this.root) {
            return false;
        }

        this.started = true;
        this.completed = false;
        this.q1Solved = false;
        this.currentQuestion = 1;

        this.showQuestion(
            1,
            {
                preserveQ1: false
            }
        );

        return true;
    }

    restart() {
        return this.start();
    }

    reset() {
        this.started = false;
        this.completed = false;
        this.q1Solved = false;
        this.currentQuestion = 1;

        this._timers.forEach(
            (timer) => {
                window.clearTimeout(timer);
            }
        );

        this._timers.clear();

        if (this.root) {
            this.hideWrongMessageFromAllQuestions();
            this.hideCorrectMessageFromAllQuestions();
            this.hideSuccess();

            this.showQuestion(
                1,
                {
                    preserveQ1: false
                }
            );
        }

        return true;
    }

    next() {
        if (
            this.currentQuestion >= 4
        ) {
            return false;
        }

        return this.showQuestion(
            this.currentQuestion + 1,
            {
                preserveQ1: true
            }
        );
    }

    state() {
        return {
            started: this.started,
            completed: this.completed,
            currentQuestion:
                this.currentQuestion,
            totalQuestions: 4,
            q1Solved:
                this.q1Solved
        };
    }

    answerIndex(index) {
        return this.answer(
            Number(index) + 1
        );
    }

    on() {
        /*
         * Kept for compatibility with older code.
         * Page 9 does not need an external event bus.
         */
        return () => {};
    }
}

let birthdayQuizManager = null;

function getBirthdayQuizManager() {
    if (!birthdayQuizManager) {
        birthdayQuizManager =
            new BirthdayQuizManager();
    }

    return birthdayQuizManager;
}

function initializeBirthdayQuiz() {
    try {
        getBirthdayQuizManager().init();
    } catch (error) {
        console.error(
            '[Quiz] Initialization failed:',
            error
        );
    }
}

/* Public compatibility names. */
window.QuizManager =
    getBirthdayQuizManager();

window.BirthdayQuiz =
    getBirthdayQuizManager();

window.quizManager =
    getBirthdayQuizManager();

window.Quiz =
    getBirthdayQuizManager();

window.SehrishQuiz =
    Object.freeze({
        init() {
            return getBirthdayQuizManager()
                .init();
        },

        start() {
            return getBirthdayQuizManager()
                .start();
        },

        restart() {
            return getBirthdayQuizManager()
                .restart();
        },

        reset() {
            return getBirthdayQuizManager()
                .reset();
        },

        answer(index) {
            return getBirthdayQuizManager()
                .answerIndex(index);
        },

        next() {
            return getBirthdayQuizManager()
                .next();
        },

        previous() {
            const manager =
                getBirthdayQuizManager();

            return manager.previous(
                manager.currentQuestion - 1
            );
        },

        state() {
            return getBirthdayQuizManager()
                .state();
        },

        continue() {
            return getBirthdayQuizManager()
                .continueAfterReel();
        },

        manager() {
            return getBirthdayQuizManager();
        }
    });

if (
    document.readyState ===
    'loading'
) {
    document.addEventListener(
        'DOMContentLoaded',
        initializeBirthdayQuiz,
        {
            once: true
        }
    );
} else {
    initializeBirthdayQuiz();
}

window.SBQuizDebug =
    Object.freeze({
        state: () =>
            getBirthdayQuizManager()
                .state(),

        answer: (index) =>
            getBirthdayQuizManager()
                .answerIndex(index),

        next: () =>
            getBirthdayQuizManager()
                .next(),

        previous: () => {
            const manager =
                getBirthdayQuizManager();

            return manager.previous(
                manager.currentQuestion - 1
            );
        },

        restart: () =>
            getBirthdayQuizManager()
                .restart(),

        reset: () =>
            getBirthdayQuizManager()
                .reset()
    });