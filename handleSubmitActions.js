/**
 * handleSubmitActions()
 * supports:
 *  - calling an injected API function OR fetch if url is provided.
 *  - navigation via injected navigate (react-router) or window.location fallback
 *  - toast notifications via injected toast adapter
 *
 * ctx includes:
 *  values, intent, formId, stepId, setErrors (optional), and can be mutated by actions using assignTo
 */
export async function handleSubmitActions(actions = [], ctx = {}, deps = {}) {
    const list = Array.isArray(actions) ? actions : [];
    if (!list.length) return true;

    const {
        api = {},
        toast,
        navigate,
        fetchImpl,
        onError, // optional global error hook (err, action, ctx)
    } = deps;

    const fetchFn = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
    const toastAdapter = normalizeToast(toast);

    for (let i = 0; i < list.length; i++) {
        const action = list[i];
        if (!action || typeof action !== "object") continue;

        try {
            const result = await runOne(action, ctx, {
                api,
                toast: toastAdapter,
                navigate,
                fetchFn,
            });

            if (result && result.ok === false) return false;
        } catch (err) {
            try {
                onError?.(err, action, ctx);
            } catch {
                // ignore onError failures
            }

            const policy = String(action.onError || "stop").toLowerCase(); // stop | continue
            const userMessage =
                action.errorMessage ||
                err?.message ||
                "An unexpected error occurred while processing this action.";

            toastAdapter.error(userMessage);

            if (ctx?.setErrors && err?.fieldErrors && typeof err.fieldErrors === "object") {
                ctx.setErrors(err.fieldErrors);
            }

            if (policy === "continue") continue;
            return false;
        }
    }

    return true;
}

async function runOne(action, ctx, { api, toast, navigate, fetchFn }) {
    const type = String(action.type || "").toLowerCase();

    switch (type) {
        case "api":
            return await runApiAction(action, ctx, { api, fetchFn });

        case "toast":
            return runToastAction(action, ctx, { toast });

        case "navigate":
            return runNavigateAction(action, ctx, { navigate });

        case "confirm":
            return runConfirmAction(action, ctx);

        case "delay":
            return runDelayAction(action);

        default:
            // Unknown actions are ignored
            return { ok: true };
    }
}

async function runApiAction(action, ctx, { api, fetchFn }) {
    if (action.name) {
        const fn = api?.[action.name];
        if (typeof fn !== "function") {
            throw new Error(`API action "${action.name}" not registered.`);
        }

        const params = expandTemplate(action.params, ctx);
        const data = await fn(params, ctx);

        if (action.assignTo && typeof action.assignTo === "string") {
            ctx[action.assignTo] = data;
        }

        return { ok: true, data };
    }

    const url = expandTemplate(action.url, ctx);
    if (!url) throw new Error(`API action requires "name" or "url".`);
    if (!fetchFn) throw new Error(`No fetch implementation available.`);

    const method = String(action.method || "POST").toUpperCase();
    const headers = { "Content-Type": "application/json", ...(action.headers || {}) };

    const bodyObj =
        action.body !== undefined ? expandTemplate(action.body, ctx) : ctx?.values ?? {};

    const res = await fetchFn(url, {
        method,
        headers,
        body: method === "GET" ? undefined : JSON.stringify(bodyObj),
        credentials: action.credentials || "same-origin",
    });

    const contentType = res.headers?.get?.("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

    if (!res.ok) {
        const err = new Error(payload?.message || `Request failed (${res.status})`);
        if (payload?.fieldErrors) err.fieldErrors = payload.fieldErrors;
        err.status = res.status;
        err.payload = payload;
        throw err;
    }

    if (action.assignTo && typeof action.assignTo === "string") {
        ctx[action.assignTo] = payload;
    }

    return { ok: true, data: payload };
}

function runToastAction(action, ctx, { toast }) {
    const level = String(action.level || "info").toLowerCase(); // success|error|info|warn
    const msg = expandTemplate(action.message || "", ctx);
    if (!msg) return { ok: true };

    if (level === "success") toast.success(msg);
    else if (level === "error") toast.error(msg);
    else if (level === "warn" || level === "warning") toast.warn(msg);
    else toast.info(msg);

    return { ok: true };
}

function runNavigateAction(action, ctx, { navigate }) {
    const to = expandTemplate(action.to || action.url || "", ctx);
    if (!to) return { ok: true };

    if (typeof navigate === "function") {
        navigate(to, action.options || {});
        return { ok: true };
    }

    if (typeof window !== "undefined") {
        if (action.replace) window.location.replace(to);
        else window.location.assign(to);
    }

    return { ok: true };
}

function runConfirmAction(action, ctx) {
    const message = expandTemplate(action.message || "Are you sure you want to continue?", ctx);
    const ok = typeof window !== "undefined" ? window.confirm(message) : true;
    if (!ok) return { ok: false };
    return { ok: true };
}

function runDelayAction(action) {
    const ms = Number(action.ms ?? 0);
    if (!ms || ms <= 0) return { ok: true };
    return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), ms));
}

function normalizeToast(toast) {
    const noop = () => { };

    if (typeof toast === "function") {
        return {
            success: (m) => toast(m, { level: "success" }),
            error: (m) => toast(m, { level: "error" }),
            info: (m) => toast(m, { level: "info" }),
            warn: (m) => toast(m, { level: "warn" }),
        };
    }

    if (toast && typeof toast === "object") {
        return {
            success: toast.success || toast.info || noop,
            error: toast.error || toast.info || noop,
            info: toast.info || noop,
            warn: toast.warn || toast.warning || toast.info || noop,
        };
    }

    return {
        success: (m) => console.log(m),
        error: (m) => console.error(m),
        info: (m) => console.info(m),
        warn: (m) => console.warn(m),
    };
}

function expandTemplate(input, ctx) {
    if (input == null) return input;

    if (typeof input === "string") {
        return input.replace(/\{\{\s*([.\w]+)\s*\}\}/g, (_, path) => {
            const v = getPath(ctx, path);
            return v == null ? "" : String(v);
        });
    }

    if (Array.isArray(input)) {
        return input.map((x) => expandTemplate(x, ctx));
    }

    if (typeof input === "object") {
        const out = {};
        for (const [k, v] of Object.entries(input)) {
            out[k] = expandTemplate(v, ctx);
        }
        return out;
    }

    return input;
}

function getPath(obj, path) {
    if (!obj || !path) return undefined;
    return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}