import { useCallback } from "react";

export function useValidation(fields, fieldMap, visibility, values, setErrors) {
    const validateFields = useCallback(
        async (fieldNames = []) => {
            const newErrors = {};

            console.log("[validateFields] fieldNames:", fieldNames);

            const isEmpty = (v) => {
                if (v === null || v === undefined) return true;

                if (typeof v === "string") return v.trim() === "";
                if (typeof v === "number") return Number.isNaN(v);

                if (Array.isArray(v)) return v.length === 0;

                if (typeof v === "object") {
                    if ("value" in v) return isEmpty(v.value);
                    return Object.keys(v).length === 0;
                }

                return false;
            };

            fieldNames.forEach((name) => {

                const field = fieldMap[name];
                if (!field) return;

                console.log("[validateFields] checking:", name, "value:", values[name], "visible:", visibility?.[name], "required:", fieldMap[name]?.validation?.required);

                // Skip hidden fields
                if (visibility?.[name] === false) return;

                // Skip section text fields
                if (field.type === "SectionText") return;

                const value = values?.[name];
                const validation = field.validation;
                if (!validation) return;

                const errors = [];

                if (validation.required) {
                    if (isEmpty(value)) {
                        errors.push(validation.requiredMessage || "This field is required.");
                    }
                }

                if (
                    validation.minLength &&
                    typeof value === "string" &&
                    value.length < validation.minLength
                ) {
                    errors.push(
                        validation.minLengthMessage ||
                        `Must be at least ${validation.minLength} characters.`
                    );
                }

                if (validation.pattern && typeof value === "string" && value.trim() !== "") {
                    const flags = validation.patternFlags || "";
                    const regex = new RegExp(validation.pattern, flags);
                    if (!regex.test(value)) {
                        errors.push(validation.patternMessage || "Invalid format.");
                    }
                }

                if (field.type === "AdvancedTable" && validation.minRows) {
                    if (!Array.isArray(value) || value.length < validation.minRows) {
                        errors.push(
                            validation.requiredMessage ||
                            `At least ${validation.minRows} row(s) required.`
                        );
                    }
                }

                if (errors.length) newErrors[name] = errors;
            });

            setErrors(newErrors);
            console.log("newErrors keys:", Object.keys(newErrors));
            return newErrors;
        },
        [fieldMap, visibility, values, setErrors]
    );

    return { validateFields };
}