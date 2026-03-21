/*
 ** evaluateShowIf.js
 **
 ** Supports:
 ** - boolean
 ** - single rule: { field, operator, value }
 ** - OR shorthand: [ ... ]          => OR
 ** - { any: [ ... ] }               => OR
 ** - { all: [ ... ] }               => AND
 **
 ** Supports values stored as either:
 ** - nested: { __system: { review: true } }
 ** - flat:   { "__system.review": true }
 */

function normalize(value) {
    if (typeof value === "boolean") return value;

    if (typeof value === "string") {
        const s = value.trim().toLowerCase();
        if (s === "true") return true;
        if (s === "false") return false;
    }

    return value;
}

function getByPath(obj, path) {
    if (!obj || !path) return undefined;

    const key = String(path);

    // Support flat keys like values["__system.review"]
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
    }

    // Support nested keys like values.__system.review
    return key.split(".").reduce((acc, part) => {
        if (acc == null) return undefined;
        return acc[part];
    }, obj);
}

function evaluateCondition(condition, values) {
    if (!condition || typeof condition !== "object") return false;

    const actual = normalize(getByPath(values, condition.field));
    const expected = normalize(condition.value);
    const operator = String(condition.operator || "eq").toLowerCase();

    switch (operator) {
        case "eq":
        case "equals":
        case "==":
            return actual === expected;

        case "neq":
        case "notequals":
        case "!=":
            return actual !== expected;

        case "gt":
            return actual > expected;

        case "gte":
            return actual >= expected;

        case "lt":
            return actual < expected;

        case "lte":
            return actual <= expected;

        case "in":
            return Array.isArray(expected) && expected.includes(actual);

        case "notin":
            return Array.isArray(expected) && !expected.includes(actual);

        case "exists":
            return actual !== undefined && actual !== null;

        case "notexists":
            return actual === undefined || actual === null;

        case "truthy":
            return !!actual === true;

        case "falsy":
            return !!actual === false;

        default:
            console.warn("[evaluateShowIf] Unknown operator:", operator, condition);
            return false;
    }
}

export function evaluateShowIf(showIf, values = {}) {
    if (showIf == null) return true;

    // literal boolean
    if (typeof showIf === "boolean") {
        return showIf;
    }

    // OR shorthand: [rule1, rule2]
    if (Array.isArray(showIf)) {
        return showIf.some((rule) => evaluateShowIf(rule, values));
    }

    if (typeof showIf !== "object") {
        console.warn("[evaluateShowIf] Invalid showIf:", showIf);
        return false;
    }

    // Explicit OR
    if (Array.isArray(showIf.any)) {
        return showIf.any.some((rule) => evaluateShowIf(rule, values));
    }

    // Explicit AND
    if (Array.isArray(showIf.all)) {
        return showIf.all.every((rule) => evaluateShowIf(rule, values));
    }

    // Single condition
    if (showIf.field) {
        return evaluateCondition(showIf, values);
    }

    console.warn("[evaluateShowIf] Unrecognized showIf structure:", showIf);
    return false;
}