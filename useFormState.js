import { useEffect, useMemo, useState, useCallback, useRef } from "react";

function defaultForField(f) {
    if (!f) return "";

    if (f.defaultValue !== undefined) return f.defaultValue;

    switch (String(f.type || "").toLowerCase()) {
        case "toggleswitch":
            return false;
        case "advancedtable":
            return [];
        default:
            return "";
    }
}

function isEffectivelyEmpty(value) {
    if (value == null) return true;
    if (typeof value === "string") return value === "";
    if (Array.isArray(value)) return value.length === 0;
    return false;
}

/**
 * useFormState(fields, initialValues)
 *
 * Rules:
 * - User-entered values win once a field has been touched.
 * - Untouched fields can still hydrate from incoming initialValues.
 * - Empty default values (like [] for AdvancedTable) do NOT block later initialValues.
 * - If neither exists, fall back to schema/type defaults.
 */
export function useFormState(fields = [], initialValues = {}) {
    const safeFields = Array.isArray(fields) ? fields : [];
    const touchedRef = useRef({});

    const initialKey = useMemo(
        () => JSON.stringify(initialValues ?? {}),
        [initialValues]
    );

    const buildInitial = useCallback(
        (prev) => {
            const next = {};

            for (const f of safeFields) {
                const name = f?.name;
                if (!name) continue;

                const hasPrev =
                    prev != null &&
                    Object.prototype.hasOwnProperty.call(prev, name);

                const hasInitial =
                    initialValues != null &&
                    Object.prototype.hasOwnProperty.call(initialValues, name);

                const isTouched = touchedRef.current[name] === true;
                const prevValue = hasPrev ? prev[name] : undefined;
                const initialValue = hasInitial ? initialValues[name] : undefined;

                if (isTouched && hasPrev) {
                    next[name] = prevValue;
                    continue;
                }

                if (hasInitial) {
                    // Allow incoming initialValues to replace empty untouched defaults
                    if (!hasPrev || isEffectivelyEmpty(prevValue)) {
                        next[name] = initialValue;
                    } else {
                        next[name] = prevValue;
                    }
                    continue;
                }

                if (hasPrev) {
                    next[name] = prevValue;
                    continue;
                }

                next[name] = defaultForField(f);
            }

            return next;
        },
        [safeFields, initialKey]
    );

    const [values, setValues] = useState(() => buildInitial(undefined));
    const [errors, setErrors] = useState({});

    useEffect(() => {
        setValues((prev) => buildInitial(prev));
        setErrors({});
    }, [buildInitial]);

    const updateValue = useCallback((name, value) => {
        if (!name) return;

        touchedRef.current[name] = true;

        setValues((prev) => {
            if (Object.is(prev[name], value)) return prev;
            return { ...prev, [name]: value };
        });
    }, []);

    return { values, errors, setErrors, updateValue };
}