import React, { useMemo, useEffect, useCallback, useState } from "react";
import { useFormState } from "./dynamicForm/useFormState";
import { useVisibility } from "./dynamicForm/visibility";
import { evaluateShowIf } from "./dynamicForm/evaluateShowIf";
import { useValidation } from "./dynamicForm/useValidation";
import { useStepNavigation } from "./dynamicForm/useStepNavigation";
import { FieldRenderer } from "./dynamicForm/fieldRenderer";
import { preloadFieldTypes } from "./dynamicForm/fieldRegistry";
import { handleSubmitActions } from "./dynamicForm/handleSubmitActions";

export default function DynamicForm({
    formId,
    schema: schemaProp,
    onSubmit,
    handlerRegistry,
    countyList,
    initialValues,
    review = false,
    submitActions = [],
    actionDeps = {},
}) {
    const schema = useMemo(() => {
        if (!schemaProp) return {};
        if (schemaProp.fields) return schemaProp;
        if (schemaProp.schema?.fields) return schemaProp.schema;
        if (schemaProp.data?.fields) return schemaProp.data;
        return {};
    }, [schemaProp]);

    const fields = useMemo(
        () => (Array.isArray(schema.fields) ? schema.fields : []),
        [schema.fields]
    );

    const steps = useMemo(() => {
        if (Array.isArray(schema.steps) && schema.steps.length) return schema.steps;

        return [
            {
                id: "auto",
                title: schema?.properties?.[0]?.title ?? "Form",
                fieldNames: fields.map((f) => f.name),
                submitButtons: [],
            },
        ];
    }, [schema.steps, schema.properties, fields]);

    const isMultiStep = steps.length > 1;

    const fieldMap = useMemo(
        () => Object.fromEntries(fields.map((f) => [f.name, f])),
        [fields]
    );

    useEffect(() => {
        if (fields.length) preloadFieldTypes(fields.map((f) => f.type));
    }, [fields]);

    const { values, errors, setErrors, updateValue } = useFormState(fields, initialValues);
    const nav = useStepNavigation(steps);

    const currentStep =
        nav?.currentStep ??
        steps?.[0] ?? {
            id: "auto",
            title: "Form",
            fieldNames: [],
            submitButtons: [],
        };

    const currentFields = useMemo(() => {
    const names = Array.isArray(currentStep.fieldNames) ? currentStep.fieldNames : [];
        return names.map((n) => fieldMap[n]).filter(Boolean);
    }, [currentStep.fieldNames, fieldMap]);

    const visibilityContext = useMemo(
        () => ({
            ...values,
            "__system.review": !!review,
        }),
        [values, review]
    );

    const visibility = useVisibility(currentFields, visibilityContext);

    const { validateFields } = useValidation(
        currentFields,
        fieldMap,
        visibility,
        values,
        setErrors
    );

    const stepButtonsRaw = useMemo(() => {
        const custom = Array.isArray(currentStep.submitButtons) ? currentStep.submitButtons : [];
        if (!isMultiStep) return custom;

        const auto = [];
        const stepIndex =
            typeof nav?.stepIndex === "number"
                ? nav.stepIndex
                : steps.findIndex((s) => s?.id === currentStep.id);

        const isFirst = stepIndex <= 0;
        const isLast = stepIndex >= steps.length - 1;

        const customIntentSet = new Set(
            custom.map((b) => String(b?.intent || "").toLowerCase())
        );

        if (!isFirst && !customIntentSet.has("back") && !customIntentSet.has("prev")) {
            auto.push({
                id: "__back",
                label: "Back",
                intent: "back",
                validate: "none",
                navigate: "prev",
                primary: false,
            });
        }

        if (!isLast && !customIntentSet.has("next")) {
            auto.push({
                id: "__next",
                label: "Next",
                intent: "next",
                validate: "step",
                navigate: "next",
                primary: true,
            });
        }

        return [...custom, ...auto];
    }, [isMultiStep, currentStep, nav?.stepIndex, steps]);

    const stepButtons = useMemo(() => {
        return stepButtonsRaw.filter((btn) => {
            if (!btn) return false;
            if (!btn.showIf) return true;

            try {
                return evaluateShowIf(btn.showIf, visibilityContext) === true;
            } catch (e) {
                console.warn("Button showIf evaluation failed:", btn, e);
                return true;
            }
        });
    }, [stepButtonsRaw, visibilityContext]);

    const [submitting, setSubmitting] = useState(false);
    const [activeSubmitId, setActiveSubmitId] = useState(null);

    const registry = useMemo(() => {
        if (!handlerRegistry || typeof handlerRegistry !== "object") return {};
        if (handlerRegistry.handlers && typeof handlerRegistry.handlers === "object") {
            return handlerRegistry.handlers;
        }
        return handlerRegistry;
    }, [handlerRegistry]);

    const getHandlerName = useCallback(
        (btn) => btn?.handler || btn?.action || btn?.handlerName || null,
        []
    );

    const handleSubmitIntent = useCallback(
        (btn) => async (e) => {
            e.preventDefault();

            if (submitting) return;

            setSubmitting(true);
            setActiveSubmitId(btn?.id ?? null);

            try {
                const intent = String(btn?.intent || "submit").toLowerCase();
                const validateMode = String(
                    btn?.validate ?? (intent === "next" ? "step" : "all")
                ).toLowerCase();

                let fieldNames = [];

                if (validateMode === "step") {
                    fieldNames = Array.isArray(currentStep.fieldNames)
                        ? currentStep.fieldNames
                        : [];
                } else if (validateMode === "all") {
                    fieldNames = fields.map((f) => f.name);
                    if (btn?.validateVisibleOnly === true) {
                        fieldNames = fieldNames.filter((n) => visibility[n] !== false);
                    }
                }

                if (fieldNames.length) {
                    const validationErrors = await validateFields(fieldNames);
                    if (Object.keys(validationErrors).length) return;
                }

                const ctx = {
                    values,
                    formId,
                    stepId: currentStep.id,
                    intent,
                    button: btn,
                    setErrors,
                };

                const allActions = [
                    ...(Array.isArray(submitActions) ? submitActions : []),
                    ...(Array.isArray(btn?.actions) ? btn.actions : []),
                ];

                const ok = await handleSubmitActions(allActions, ctx, actionDeps);
                if (ok === false) return;

                const handlerName = getHandlerName(btn);

                if (handlerName) {
                    const fn = registry?.[handlerName];
                    if (typeof fn !== "function") {
                        console.error(`No handler registered for "${handlerName}"`, {
                            handlerName,
                            registeredHandlers: Object.keys(registry || {}),
                            button: btn,
                        });
                        return;
                    }
                    await fn(ctx);
                }

                if (typeof onSubmit === "function") {
                    await onSubmit(values, intent, ctx);
                }

                if (btn?.navigate === "next" || intent === "next") nav?.next?.();
                else if (btn?.navigate === "prev" || intent === "back") nav?.prev?.();
            } finally {
                setSubmitting(false);
                setActiveSubmitId(null);
            }
        },
        [
            submitting,
            validateFields,
            nav,
            fields,
            values,
            formId,
            submitActions,
            onSubmit,
            setErrors,
            actionDeps,
            visibility,
            registry,
            getHandlerName,
            currentStep,
        ]
    );

    if (!nav?.currentStep) {
        return <div style={{ padding: 0 }}>Form not ready</div>;
    }

    var formWidth = "700px";
    if (formId == 2) {
        formWidth = "100%";
    }

    return (
        <div style={{ padding: 0 }}>
            <div
                style={{
                    width: formWidth,
                    margin: "0 auto",
                    padding: "0",
                    background: "#fff",
                    borderRadius: 12,
                }}
            >
                {currentStep.title && (
                    <h2>
                        {currentStep.title}
                        {review ? " - Review" : ""}
                    </h2>
                )}

                <form noValidate>
                    {currentFields.map((field) => (
                        <FieldRenderer
                            key={field.name}
                            field={field}
                            value={values[field.name]}
                            errors={errors[field.name]}
                            visible={visibility[field.name] !== false}
                            onUpdate={updateValue}
                            countyList={countyList}
                            review={review}
                        />
                    ))}

                    <div
                        style={{
                            marginTop: 0,
                            display: "flex",
                            gap: 16,
                            justifyContent: "center",
                            flexWrap: "wrap",
                        }}
                    >

                        {stepButtons.length > 0 &&
                            stepButtons.map((btn) => (
                                <button
                                    key={btn.id}
                                    type="button"
                                    onClick={handleSubmitIntent(btn)}
                                    disabled={submitting || btn.disabled}
                                >
                                    {submitting && activeSubmitId === btn.id
                                        ? "Working…"
                                        : btn.label}
                                </button>
                            ))}

                    </div>
                </form>
            </div>
        </div>
    );
}