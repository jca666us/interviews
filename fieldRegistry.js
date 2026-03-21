import { lazy } from "react";

/*
*** load() is the actual dynamic import function (preloader uses this).
 */
const registry = {

    Input: {
        load: () => import("../components/elements/Input"),
    },
    Dropdown: {
        load: () => import("../components/elements/Dropdown"),
    },
    ToggleSwitch: {
        load: () => import("../components/elements/ToggleSwitch"),
    },
    SectionText: {
        load: () => import("./renderers/SectionText.jsx"),
    },

    AdvancedTable: {
        load: () => import("../components/patterns/AdvancedTable"),
    }
};

export const FieldRegistry = {
    Text: lazy(registry.Input.load),
    Email: lazy(registry.Input.load),
    Number: lazy(registry.Input.load),
    Password: lazy(registry.Input.load),
    Tel: lazy(registry.Input.load),
    Dropdown: lazy(registry.Dropdown.load),
    ToggleSwitch: lazy(registry.ToggleSwitch.load),
    SectionText: lazy(registry.SectionText.load),
    AdvancedTable: lazy(registry.AdvancedTable.load),
};

/*
 *** Preloads only what is needed for the current form.
 *** This is called once from DynamicForm (once per schema).
 */
export function preloadFieldTypes(types) {
    const unique = new Set(types);

    // Map field types to the underlying loader we want to preload.
    const loaders = [];
    unique.forEach((t) => {
        if (["Text", "Email", "Number", "Password", "Tel"].includes(t)) {
            loaders.push(registry.Input.load);
            return;
        }
        if (registry[t]?.load) loaders.push(registry[t].load);
    });

    // De-dupe loader functions.
    const deduped = Array.from(new Set(loaders));
    return Promise.allSettled(deduped.map((fn) => fn()));
}
