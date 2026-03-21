import React from "react";

/* Need renderer because there is no SectionText component. */
export default function SectionText({ field }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <i>{field.label}</i>
        </div>
    );
}
