(() => {
    "use strict";

    /* ================================================================
       SCENE 14 — CAKE CUTTER V3
       ------------------------------------------------
       FIXED HORIZONTAL CUT
       • Mouse + touch
       • No up/down movement
       • Straight left → right motion
       • Full cake crossing required
       • Smooth cut line
       • No accidental 2–3 sec auto cut
       ================================================================ */

    const scene = document.getElementById("scene-14");
    const game = document.getElementById("cake-game");
    const cake = document.getElementById("birthday-cake");
    const cutter = document.getElementById("cake-cutter");
    const cutLine = document.getElementById("cake-cut-line");

    const leftPiece =
        document.getElementById("cake-piece-left");

    const rightPiece =
        document.getElementById("cake-piece-right");

    const instruction =
        document.getElementById("cake-instruction");

    const success =
        document.getElementById("cake-success");

    const successTitle =
        success?.querySelector("h2");

    if (
        !scene ||
        !game ||
        !cake ||
        !cutter ||
        !cutLine ||
        !leftPiece ||
        !rightPiece
    ) {
        return;
    }

    /* ================================================================
       SETTINGS
       ================================================================ */

    const START_POSITION = 8;

    /*
     * Cutter ko cake ke left side se start karwana hai.
     * Completion tabhi hogi jab blade cake ke right edge ko
     * completely cross kar de.
     */
    const START_X_PERCENT = START_POSITION;

    const MIN_CUT_PROGRESS = 0;
    const COMPLETE_PROGRESS = 1;

    let dragging = false;
    let completed = false;
    let activePointerId = null;

    let pointerStartX = 0;
    let cutterStartX = 0;

    let hasEnteredCake = false;

    /* ================================================================
       BASIC HELPERS
       ================================================================ */

    function clamp(value, min, max) {
        return Math.min(
            Math.max(value, min),
            max
        );
    }

    function getGameRect() {
        return game.getBoundingClientRect();
    }

    function getCakeRect() {
        return cake.getBoundingClientRect();
    }

    function setInstruction(text) {
        if (instruction) {
            instruction.textContent = text;
        }
    }

    /* ================================================================
       CUTTER POSITION
       ------------------------------------------------
       IMPORTANT:
       Y POSITION KABHI POINTER SE CHANGE NAHI HOGI.
       Knife sirf X-axis par chalega.
       ================================================================ */

    function setCutterX(x) {
        const gameRect =
            getGameRect();

        const cutterWidth =
            cutter.getBoundingClientRect().width;

        const minX =
            gameRect.width * 0.05;

        const maxX =
            gameRect.width -
            gameRect.width * 0.03 -
            cutterWidth / 2;

        const nextX =
            clamp(
                x,
                minX,
                maxX
            );

        cutter.style.left =
            `${nextX}px`;

        return nextX;
    }

    function resetCutter() {
        cutter.style.transition =
            "none";

        cutter.style.left =
            `${START_X_PERCENT}%`;

        cutter.classList.remove(
            "is-dragging",
            "is-over-cake",
            "is-near-end",
            "is-complete"
        );

        cutter.style.setProperty(
            "--cut-progress",
            "0"
        );

        cutter.setAttribute(
            "aria-valuenow",
            "0"
        );
    }

    /* ================================================================
       UPDATE CUT POSITION
       ================================================================ */

    function updateCutFromPointer(clientX) {
        const gameRect =
            getGameRect();

        const cakeRect =
            getCakeRect();

        const cakeLeft =
            cakeRect.left;

        const cakeRight =
            cakeRect.right;

        const cakeWidth =
            cakeRight -
            cakeLeft;

        /*
         * Pointer ki X ko cake ke andar 0 → 1 progress me convert.
         */
        const rawProgress =
            (
                clientX -
                cakeLeft
            ) /
            cakeWidth;

        const progress =
            clamp(
                rawProgress,
                MIN_CUT_PROGRESS,
                COMPLETE_PROGRESS
            );

        cutter.style.setProperty(
            "--cut-progress",
            String(progress)
        );

        cutter.setAttribute(
            "aria-valuenow",
            String(
                Math.round(
                    progress * 100
                )
            )
        );

        /*
         * Cake ke andar enter karne ke baad hi
         * cut line show hogi.
         */
        if (
            clientX >= cakeLeft &&
            clientX <= cakeRight
        ) {
            hasEnteredCake = true;

            cutter.classList.add(
                "is-over-cake"
            );

            cake.classList.add(
                "is-cutting"
            );

            cutLine.classList.add(
                "is-visible"
            );

            /*
             * Cut line EXACTLY knife position par.
             */
            const localPercent =
                (
                    (
                        clientX -
                        cakeRect.left
                    ) /
                    cakeWidth
                ) * 100;

            cutLine.style.left =
                `${clamp(
                    localPercent,
                    0,
                    100
                )}%`;

            /*
             * Knife right side ke paas.
             */
            if (
                progress >= 0.84
            ) {
                cutter.classList.add(
                    "is-near-end"
                );
            } else {
                cutter.classList.remove(
                    "is-near-end"
                );
            }

            /*
             * User ko live instruction.
             */
            setInstruction(
                progress > 0.45
                    ? "Bas thodaaa aur right le jaooo... 🔪💗"
                    : "Cake ke across seedha drag karooo 🎂"
            );
        }

        /*
         * Completion ONLY after full cake crossing.
         *
         * Cake ke bahar right side me thoda sa
         * extra movement required hai.
         */
        if (
            hasEnteredCake &&
            clientX >= cakeRight + 8
        ) {
            finishCut();
        }
    }

    /* ================================================================
       POINTER DOWN
       ================================================================ */

    function onPointerDown(event) {
        if (completed) {
            return;
        }

        dragging = true;

        activePointerId =
            event.pointerId;

        pointerStartX =
            event.clientX;

        const gameRect =
            getGameRect();

        const cutterRect =
            cutter.getBoundingClientRect();

        /*
         * Cutter ka center.
         */
        cutterStartX =
            cutterRect.left -
            gameRect.left +
            cutterRect.width / 2;

        /*
         * IMPORTANT:
         * Knife ki vertical position fixed rahegi.
         */
        cutter.style.top =
            "";

        cutter.classList.add(
            "is-dragging"
        );

        cutter.style.transition =
            "none";

        setInstruction(
            "Ab seedha right drag karooo 🔪➡️"
        );

        /*
         * Browser ko batata hai ki
         * pointer ko cutter hi control karega.
         */
        try {
            cutter.setPointerCapture(
                activePointerId
            );
        } catch (_) {}

        event.preventDefault();
    }

    /* ================================================================
       POINTER MOVE
       ================================================================ */

    function onPointerMove(event) {
        if (
            !dragging ||
            completed ||
            event.pointerId !==
                activePointerId
        ) {
            return;
        }

        /*
         * ONLY X DELTA.
         *
         * Y coordinate bilkul ignore.
         */
        const deltaX =
            event.clientX -
            pointerStartX;

        const nextX =
            cutterStartX +
            deltaX;

        setCutterX(nextX);

        updateCutFromPointer(
            event.clientX
        );

        event.preventDefault();
    }

    /* ================================================================
       POINTER UP
       ================================================================ */

    function onPointerUp(event) {
        if (
            event.pointerId !==
            activePointerId
        ) {
            return;
        }

        dragging = false;

        cutter.classList.remove(
            "is-dragging"
        );

        activePointerId = null;

        /*
         * Agar cake completely cross nahi hua,
         * cutter softly starting position par return.
         */
        if (!completed) {

            cutter.style.transition =
                "left 320ms cubic-bezier(.22,1,.36,1)";

            cutter.style.left =
                `${START_X_PERCENT}%`;

            cutLine.classList.remove(
                "is-visible"
            );

            cake.classList.remove(
                "is-cutting"
            );

            hasEnteredCake = false;

            setInstruction(
                "Cutter ko cake ke across seedha drag karooo 🎂🔪"
            );
        }

        event.preventDefault();
    }

    /* ================================================================
       POINTER CANCEL
       ================================================================ */

    function onPointerCancel(event) {
        onPointerUp(event);
    }

    /* ================================================================
       FINISH CUT
       ================================================================ */

    function finishCut() {
        if (completed) {
            return;
        }

        completed = true;
        dragging = false;

        game.dataset.cakeState =
            "cutting";

        cutter.classList.remove(
            "is-dragging"
        );

        cutter.classList.add(
            "is-complete"
        );

        /*
         * Final straight cut line
         * cake ke exact centre me.
         */
        cutLine.classList.add(
            "is-final"
        );

        cutLine.style.left =
            "50%";

        /*
         * Cutter cake ke centre par
         * smoothly settle karega.
         */
        cutter.style.transition =
            "left 420ms cubic-bezier(.22,1,.36,1)";

        cutter.style.left =
            "50%";

        setInstruction(
            "Yaaaayyy... cake cut ho gayaaaa! 🎂✨"
        );

        /*
         * Cake cutting state.
         * CSS isi state se actual split animation
         * start karegi.
         */
        game.classList.add(
            "is-cut"
        );

        /*
         * Cake pieces ko CSS animate karne ka
         * time diya ja raha hai.
         */
        window.setTimeout(
            () => {
                game.classList.add(
                    "is-cutting-complete"
                );
            },
            520
        );

        /*
         * Celebration.
         */
        window.setTimeout(
            () => {
                startCelebration();
            },
            1100
        );

        /*
         * Success card.
         */
        window.setTimeout(
            () => {
                showSuccess();
            },
            1700
        );
    }

    /* ================================================================
       CELEBRATION
       ================================================================ */

    function startCelebration() {

        game.classList.add(
            "is-celebrating"
        );

        game.dataset.cakeState =
            "celebrating";

        const background =
            scene.querySelector(
                ".scene-14__background"
            );

        if (!background) {
            return;
        }

        let layer =
            background.querySelector(
                ".cake-celebration-layer"
            );

        if (!layer) {

            layer =
                document.createElement(
                    "div"
                );

            layer.className =
                "cake-celebration-layer";

            layer.setAttribute(
                "aria-hidden",
                "true"
            );

            background.appendChild(
                layer
            );
        }

        /*
         * Confetti.
         */
        const shapes = [
            "✦",
            "✧",
            "♡",
            "•",
            "✿"
        ];

        for (
            let i = 0;
            i < 70;
            i++
        ) {

            const piece =
                document.createElement(
                    "span"
                );

            piece.className =
                "cake-confetti-piece";

            piece.textContent =
                shapes[
                    i %
                    shapes.length
                ];

            piece.style.left =
                `${Math.random() * 100}%`;

            piece.style.top =
                `${25 + Math.random() * 30}%`;

            piece.style.setProperty(
                "--x",
                `${(
                    Math.random() -
                    0.5
                ) * 320}px`
            );

            piece.style.setProperty(
                "--y",
                `${120 + Math.random() * 360}px`
            );

            piece.style.setProperty(
                "--r",
                `${(
                    Math.random() -
                    0.5
                ) * 900}deg`
            );

            piece.style.setProperty(
                "--d",
                `${800 + Math.random() * 900}ms`
            );

            piece.style.setProperty(
                "--delay",
                `${Math.random() * 200}ms`
            );

            layer.appendChild(
                piece
            );
        }

        /*
         * Multiple sky bursts.
         */
        [
            [18, 25],
            [50, 17],
            [81, 26],
            [65, 39]
        ].forEach(
            ([x, y], index) => {

                const burst =
                    document.createElement(
                        "div"
                    );

                burst.className =
                    "cake-firework";

                burst.style.left =
                    `${x}%`;

                burst.style.top =
                    `${y}%`;

                burst.style.setProperty(
                    "--delay",
                    `${index * 180}ms`
                );

                for (
                    let i = 0;
                    i < 22;
                    i++
                ) {

                    const dot =
                        document.createElement(
                            "i"
                        );

                    dot.style.setProperty(
                        "--angle",
                        `${(
                            360 / 22
                        ) * i}deg`
                    );

                    dot.style.setProperty(
                        "--distance",
                        `${45 + Math.random() * 55}px`
                    );

                    dot.style.setProperty(
                        "--delay",
                        `${index * 180}ms`
                    );

                    burst.appendChild(
                        dot
                    );
                }

                layer.appendChild(
                    burst
                );
            }
        );
    }

    /* ================================================================
       SUCCESS
       ================================================================ */

    function showSuccess() {

        if (instruction) {
            instruction.hidden =
                true;
        }

        if (successTitle) {
            successTitle.textContent =
                "Yaaaayyy! Chapter 17 Begins! ✨🎂";
        }

        if (success) {
            success.hidden =
                false;

            success.setAttribute(
                "aria-hidden",
                "false"
            );
        }
    }

    /* ================================================================
       RESET
       ================================================================ */

    function resetScene() {

        dragging = false;
        completed = false;

        activePointerId = null;

        hasEnteredCake = false;

        game.dataset.cakeState =
            "ready";

        game.classList.remove(
            "is-cut",
            "is-cutting-complete",
            "is-celebrating"
        );

        cake.classList.remove(
            "is-cutting",
            "is-hidden"
        );

        cutLine.classList.remove(
            "is-visible",
            "is-final"
        );

        leftPiece.classList.remove(
            "is-ready"
        );

        rightPiece.classList.remove(
            "is-ready"
        );

        cutter.classList.remove(
            "is-complete",
            "is-over-cake",
            "is-dragging"
        );

        if (instruction) {
            instruction.hidden =
                false;

            instruction.textContent =
                "Cutter ko cake ke across seedha drag karooo 🎂🔪";
        }

        if (success) {
            success.hidden =
                true;

            success.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        const layer =
            scene.querySelector(
                ".cake-celebration-layer"
            );

        layer?.remove();

        resetCutter();
    }

    /* ================================================================
       EVENTS
       ================================================================ */

    cutter.addEventListener(
        "pointerdown",
        onPointerDown,
        {
            passive: false
        }
    );

    cutter.addEventListener(
        "pointermove",
        onPointerMove,
        {
            passive: false
        }
    );

    cutter.addEventListener(
        "pointerup",
        onPointerUp,
        {
            passive: false
        }
    );

    cutter.addEventListener(
        "pointercancel",
        onPointerCancel,
        {
            passive: false
        }
    );

    /*
     * Scene dobara open hone par reset.
     */
    const observer =
        new MutationObserver(
            () => {

                const visible =
                    scene.getAttribute(
                        "aria-hidden"
                    ) === "false";

                if (visible) {
                    /*
                     * Sirf tab reset karo
                     * jab already completed state nahi hai.
                     */
                    if (
                        !completed
                    ) {
                        resetScene();
                    }
                }
            }
        );

    observer.observe(
        scene,
        {
            attributes: true,
            attributeFilter: [
                "aria-hidden"
            ]
        }
    );

    resetScene();

})();