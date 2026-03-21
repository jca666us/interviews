/*
*** useStepNavigation()
***  Automatic prev/next buttons.
***  Custom prev/next button when a submit button is defined with intent of "next" or "prev".
*/
import { useMemo, useState, useCallback } from "react";

export function useStepNavigation(steps = []) {
    const safeSteps = Array.isArray(steps) ? steps : [];
    const [stepIndex, setStepIndex] = useState(0);

    const idToIndex = useMemo(() => {
        const m = new Map();
        for (let i = 0; i < safeSteps.length; i++) {
            const id = safeSteps[i]?.id;
            if (id) m.set(String(id), i);
        }
        return m;
    }, [safeSteps]);

    const goToIndex = useCallback((idx) => {
        const max = Math.max(0, safeSteps.length - 1);
        const next = Math.max(0, Math.min(Number(idx) || 0, max));
        setStepIndex(next);
    }, [safeSteps.length]);

    const goToStepId = useCallback((stepId) => {
        const idx = idToIndex.get(String(stepId ?? ""));
        if (typeof idx === "number") setStepIndex(idx);
    }, [idToIndex]);

    const next = useCallback(() => setStepIndex(i => Math.min(i + 1, safeSteps.length - 1)), [safeSteps.length]);
    const prev = useCallback(() => setStepIndex(i => Math.max(i - 1, 0)), []);

    return {
        stepIndex,
        currentStep: safeSteps[stepIndex] || { fieldNames: [], title: "" },
        isFirstStep: stepIndex === 0,
        isLastStep: stepIndex === safeSteps.length - 1,
        next,
        prev,
        goToIndex,
        goToStepId,
    };
}