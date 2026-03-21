import React, { memo, useCallback } from "react";
import AdvancedTable from "../components/patterns/AdvancedTable";
//import Checkbox from "../elements/Checkbox";
import Dropdown from "../components/elements/Dropdown";
import Input from "../components/elements/Input";
//import MultiCheck from "../components/CheckboxGroup";
//import MultiRadio from "../components/RadioGroup";
//import Radio from "../elements/Radio";
import ToggleSwitch from "../components/elements/ToggleSwitch";

export const FieldRenderer = memo(function FieldRenderer({
    field,
    value,
    errors,
    visible,
    onUpdate,
    countyList,
    review = false,
}) {
    if (!field) return null;

    const {
        name,
        type,
        label,
        placeholder,
        validation,
        multiline,
        rows,
        readOnly: fieldReadOnly,
        disabled: fieldDisabled,
        editableInReview,
        columns,
        displaySearch,
        displayPagination,
        displayExport,
        selectableRows,
    } = field;

    if (visible === false && type !== "ToggleSwitch") return null;

    const asBool = (v) =>
        v === true || v === "true" || v === "True" || v === 1 || v === "1";

    const isRequired = !!validation?.required;
    const allowEditInReview =
        editableInReview === true || name === "qqReviewComments";
    const readOnly =
        (review === true && !allowEditInReview) || fieldReadOnly === true;

    const disabled = fieldDisabled === true;
    const locked = readOnly || disabled;

    const normalizeBoolean = (v) => {
        if (typeof v === "boolean") return v;
        if (typeof v === "number") return v !== 0;
        if (typeof v === "string") {
            const s = v.trim().toLowerCase();
            if (["true", "1", "yes", "y", "on"].includes(s)) return true;
            if (["false", "0", "no", "n", "off", ""].includes(s)) return false;
        }
        return Boolean(v);
    };

    const handleAnyUpdate = useCallback(
        (...args) => {
            if (locked) return;

            const first = args[0];

            if (first && first.target) {
                const t = first.target;

                if (t.type === "checkbox") {
                    onUpdate(name, !!t.checked);
                    return;
                }

                onUpdate(name, t.value);
                return;
            }

            if (args.length === 1) {
                const next = first;

                if (type === "ToggleSwitch") {
                    onUpdate(name, normalizeBoolean(next));
                    return;
                }

                onUpdate(name, next);
                return;
            }

            const next = args[1];

            if (type === "ToggleSwitch") {
                onUpdate(name, normalizeBoolean(next));
                return;
            }

            onUpdate(name, next);
        },
        [locked, name, onUpdate, type]
    );

    switch (type) {
        case "Text":
        case "Email":
        case "Number":
        case "Password":
        case "Tel":
        case "Search":
        case "URL":
            return (
                <Input
                    id={name}
                    name={name}
                    type={type}
                    label={label}
                    placeholder={placeholder || ""}
                    value={value ?? ""}
                    isRequired={isRequired}
                    errorMessages={Array.isArray(errors) ? errors : errors ? [String(errors)] : []}
                    multiline={asBool(multiline)}
                    rows={rows || 4}
                    disabled={disabled}
                    readOnly={readOnly}
                    onUpdate={handleAnyUpdate}
                />
            );

        case "Dropdown":
            return (
                <Dropdown
                    id={name}
                    name={name}
                    label={label}
                    value={value ?? ""}
                    items={countyList || []}
                    errorMessage={Array.isArray(errors) ? (errors[0] || "") : (errors || "")}
                    readOnly={readOnly}
                    disabled={disabled}
                    onUpdate={handleAnyUpdate}
                />
            );

        case "ToggleSwitch":
            return (
                <div className={`toggle-field-wrapper ${visible ? "is-visible" : "is-hidden"}`}>
                    <ToggleSwitch
                        id={name}
                        name={name}
                        label={label}
                        checked={normalizeBoolean(value)}
                        disabled={locked}
                        onUpdate={handleAnyUpdate}
                    />
                </div>
            );

        case "SectionText":
            return (
                <div style={{ marginBottom: 24 }}>
                    <i>{label}</i>
                </div>
            );

        case "AdvancedTable": {
            const safeColumns = Array.isArray(field.columns) ? field.columns : [];
            const hasRowsData = Array.isArray(field.rowsData) && field.rowsData.length > 0;
            const safeData = hasRowsData ? field.rowsData : Array.isArray(value) ? value : [];
            return (
                <AdvancedTable
                    title={label || ""}
                    isStriped={true}
                    data={safeData}
                    dataType={safeColumns}
                    displaySearch={false}
                    displayPagination={field.displayPagination !== false}
                    displayExport={false}
                    selectableRows={field.selectableRows === true}
                    onSelectedRowsChange={
                        field.selectableRows === true && field.selectionFieldName
                            ? (selection) => {
                                onUpdate(
                                    field.selectionFieldName,
                                    selection?.selectedRows ?? []
                                );
                            }
                            : undefined
                    }
                />
            );
        }

        default:
            console.warn(`Unknown field type: ${type}`, field);
            return null;
    }
});