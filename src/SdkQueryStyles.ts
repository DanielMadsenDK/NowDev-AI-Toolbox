export function panelStyles(): string {
    return `
/* ── Header bar ───────────────────────────────────────────────────── */
.qr-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: var(--nd-sp-3);
    gap: var(--nd-sp-4);
}
.view-toggle {
    display: flex;
    gap: var(--nd-sp-1);
    flex-shrink: 0;
    padding-top: 2px;
}
.nd-btn.active-view {
    background: rgba(129,181,161,0.12);
    border-color: var(--nd-accent);
    color: var(--nd-accent-hi);
}

/* ── Query info pill ───────────────────────────────────────────────── */
.query-info {
    font-family: var(--nd-font-mono);
    font-size: 11px;
    color: var(--nd-fg-mute);
    margin-bottom: var(--nd-sp-4);
    padding: 5px var(--nd-sp-3);
    background: var(--nd-bg-soft);
    border-left: 2px solid var(--nd-border-strong);
    border-radius: 0 var(--nd-r-sm) var(--nd-r-sm) 0;
}

/* ── Table container ───────────────────────────────────────────────── */
.table-wrap {
    overflow-x: auto;
    border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-md);
    margin-bottom: var(--nd-sp-3);
    box-shadow: var(--nd-shadow-1);
}
table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

/* ── Header ─────────────────────────────────────────────────────────── */
thead {
    position: sticky;
    top: 0;
    z-index: 2;
}
thead tr {
    background: rgba(129,181,161,0.07);
    border-bottom: 2px solid var(--nd-border);
}
th {
    padding: 10px var(--nd-sp-4);
    text-align: left;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--nd-fg-mute);
    white-space: nowrap;
    background: rgba(129,181,161,0.07);
    border-right: 1px solid var(--nd-border-soft);
    transition: background 0.12s, color 0.12s;
}
th:last-child { border-right: none; }

/* ── Body rows — zebra striping ─────────────────────────────────────── */
tbody tr {
    transition: background 0.08s;
}
tbody tr:nth-child(even) td {
    background: rgba(255,255,255,0.028);
}
tbody tr:hover td {
    background: rgba(129,181,161,0.075) !important;
}

/* ── Cells ──────────────────────────────────────────────────────────── */
td {
    padding: 7px var(--nd-sp-4);
    border-bottom: 1px solid var(--nd-border-soft);
    border-right: 1px solid rgba(255,255,255,0.04);
    font-family: var(--nd-font-mono);
    font-size: 11.5px;
    color: var(--nd-fg-strong);
    max-width: 340px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
td:last-child { border-right: none; }
tbody tr:last-child td { border-bottom: none; }

/* Empty cell — visually quiet */
td:empty::after { content: '—'; color: var(--nd-fg-mute); opacity: 0.4; }

/* ── Pagination bar ─────────────────────────────────────────────────── */
.pagination {
    display: flex;
    align-items: center;
    gap: var(--nd-sp-2);
    margin-top: var(--nd-sp-3);
    margin-bottom: var(--nd-sp-5);
}
.page-hint {
    font-size: 11px;
    color: var(--nd-fg-mute);
    font-family: var(--nd-font-mono);
    margin-left: var(--nd-sp-1);
}
`;
}
