import { useMemo } from "react";
import { evaluateShowIf } from "./evaluateShowIf";

export function useVisibility(fields = [], values = {}) {
    return useMemo(() => {
        const safeFields = Array.isArray(fields) ? fields : [];
        const visibility = {};

        console.log("[useVisibility] values:", values);

        for (const field of safeFields) {
            const name = field?.name;
            if (!name) continue;

            const result = field?.showIf
                ? evaluateShowIf(field.showIf, values) === true
                : true;

            visibility[name] = result;

            console.log("[useVisibility] field:", name, {
                showIf: field?.showIf,
                result,
            });
        }

        console.log("[useVisibility] visibility map:", visibility);
        return visibility;
    }, [fields, values]);
}