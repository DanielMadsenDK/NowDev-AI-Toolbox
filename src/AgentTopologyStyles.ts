import { getSharedPanelStyles } from './SharedPanelStyles';

export function css(): string {
    return `
${getSharedPanelStyles()}

/* ── Topology-specific layout ─────────────────────────────────────── */

body {
    padding: 0;
    max-width: none;
}

.page {
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--nd-sp-6) var(--nd-sp-5) calc(var(--nd-sp-6) * 1.5);
}

.page-header {
    text-align: center;
    margin-bottom: calc(var(--nd-sp-6) * 1.25);
}

.page-logo { margin-bottom: var(--nd-sp-3); }
.page-logo svg {
    filter: drop-shadow(0 4px 14px rgba(129, 181, 161, 0.22));
}

.page-title {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 var(--nd-sp-2);
    color: var(--nd-fg);
    letter-spacing: -0.4px;
}

.page-subtitle {
    margin: 0 0 var(--nd-sp-3);
    color: var(--nd-fg-mute);
    font-size: 12.5px;
}

.stats {
    display: inline-flex;
    gap: var(--nd-sp-4);
    background: var(--nd-bg-elevated);
    border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-pill);
    padding: var(--nd-sp-1) var(--nd-sp-4);
}

.stat {
    font-size: 11.5px;
    color: var(--nd-fg-mute);
}
.stat strong { color: var(--nd-fg); }
.stat-warn strong { color: var(--nd-warning); }

/* ─── Topology layout ────────────────────────── */

.topology {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
}

.tier-label-row {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--nd-fg-mute);
    text-align: center;
    margin: var(--nd-sp-1) 0 var(--nd-sp-3);
    text-transform: uppercase;
}

.connector-v {
    width: 1px;
    height: 36px;
    background: var(--nd-border);
    margin: var(--nd-sp-1) 0;
}

/* ─── Tiers ──────────────────────────────────── */

.tier {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--nd-sp-3);
    width: 100%;
}

/* ─── Tier 1 card (orchestrator) ─────────────── */

.card-orchestrator {
    background: linear-gradient(135deg,
        rgba(129,181,161,0.18) 0%,
        rgba(90,138,120,0.22) 100%);
    border: 1px solid rgba(168,212,196,0.50);
    border-radius: var(--nd-r-lg);
    padding: var(--nd-sp-6) calc(var(--nd-sp-6) * 1.2);
    text-align: center;
    min-width: 280px;
    max-width: 420px;
    cursor: default;
    transition: box-shadow 0.18s ease, border-color 0.18s ease;
}

.card-orchestrator:hover {
    box-shadow: 0 6px 28px rgba(129,181,161,0.28);
    border-color: var(--nd-accent-hi);
}

.card-icon {
    font-size: 26px;
    margin-bottom: var(--nd-sp-3);
    color: var(--nd-accent-hi);
}

.card-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: var(--nd-sp-2);
    color: var(--nd-fg);
}

.card-desc {
    font-size: 11.5px;
    color: var(--nd-fg-mute);
    line-height: 1.5;
    margin: 0 auto var(--nd-sp-3);
    max-width: 320px;
}

.card-tags {
    display: flex;
    gap: var(--nd-sp-2);
    justify-content: center;
    flex-wrap: wrap;
}

/* Unified mint-family role tags — single product family, subtle role hue */
.tag {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--nd-r-pill);
    letter-spacing: 0.4px;
    background: rgba(129,181,161,0.10);
    color: var(--nd-accent-hi);
    border: 1px solid rgba(129,181,161,0.32);
    text-transform: capitalize;
}
.tag-orchestrator { background: rgba(168,212,196,0.20); color: #c5e6d8; border-color: rgba(168,212,196,0.55); }
.tag-coordinator  { background: rgba(129,181,161,0.16); color: #a8d4c4; border-color: rgba(129,181,161,0.45); }
.tag-developer    { background: rgba(129,181,161,0.10); color: #b8dcc8; border-color: rgba(129,181,161,0.32); }
.tag-reviewer     { background: rgba(90,138,120,0.18); color: #9ec8b6; border-color: rgba(90,138,120,0.45); }
.tag-release      { background: rgba(205,220,57,0.10); color: #d8e26e; border-color: rgba(205,220,57,0.32); }
.tag-support      { background: rgba(148,163,184,0.10); color: #cbd5e1; border-color: rgba(148,163,184,0.30); }
.tag-planning     { background: rgba(129,181,161,0.10); color: #a8d4c4; border-color: rgba(129,181,161,0.30); }
.tag-delegation   { background: rgba(168,212,196,0.12); color: #b8dcc8; border-color: rgba(168,212,196,0.35); }
.tag-architecture { background: rgba(129,181,161,0.12); color: #a8d4c4; border-color: rgba(129,181,161,0.35); }
.tag-unknown      { background: var(--nd-bg-code); color: var(--nd-fg-mute); border-color: var(--nd-border); }

/* ─── Tier 2 cards ───────────────────────────── */

.card-tier2 {
    border-radius: var(--nd-r-md);
    border: 1px solid var(--nd-border);
    padding: var(--nd-sp-4) calc(var(--nd-sp-4) + 2px);
    min-width: 140px;
    max-width: 190px;
    text-align: center;
    background: var(--nd-bg-elevated);
    cursor: default;
    transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.card-tier2:hover {
    box-shadow: 0 4px 18px rgba(0,0,0,0.30);
    transform: translateY(-1px);
}

/* All role borders share the mint family with subtle saturation steps */
.card-role-orchestrator { border-left: 3px solid rgba(168,212,196,0.55); }
.card-role-coordinator  { border-left: 3px solid rgba(129,181,161,0.50); }
.card-role-coordinator:hover { border-color: var(--nd-accent); }
.card-role-developer    { border-left: 3px solid rgba(129,181,161,0.40); }
.card-role-developer:hover { border-color: var(--nd-accent); }
.card-role-reviewer     { border-left: 3px solid rgba(90,138,120,0.55); }
.card-role-reviewer:hover { border-color: var(--nd-accent); }
.card-role-release      { border-left: 3px solid rgba(205,220,57,0.45); }
.card-role-release:hover { border-color: rgba(205,220,57,0.7); }
.card-role-support      { border-left: 3px solid rgba(148,163,184,0.40); }
.card-role-support:hover { border-color: rgba(148,163,184,0.65); }
.card-role-unknown      { border-left: 3px solid var(--nd-border); }

.card-icon-sm {
    font-size: 18px;
    margin-bottom: var(--nd-sp-2);
    color: var(--nd-accent-hi);
    opacity: 0.85;
}

.card-name-sm {
    font-size: 12.5px;
    font-weight: 600;
    margin-bottom: var(--nd-sp-1);
    color: var(--nd-fg);
}

.card-sub {
    font-size: 10.5px;
    color: var(--nd-fg-mute);
    line-height: 1.4;
}

/* ─── Tier 3 groups ──────────────────────────── */

.tier-3 {
    gap: var(--nd-sp-5);
    align-items: flex-start;
}

.t3-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--nd-sp-3);
}

.t3-group-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--nd-fg-mute);
    letter-spacing: 1px;
    text-transform: uppercase;
    text-align: center;
}

.t3-group-cards {
    display: flex;
    flex-wrap: wrap;
    gap: var(--nd-sp-3);
    justify-content: center;
}

/* ─── Tier 3 cards ───────────────────────────── */

.card-tier3 {
    border-radius: var(--nd-r-md);
    border: 1px solid var(--nd-border);
    padding: var(--nd-sp-3) var(--nd-sp-3);
    min-width: 120px;
    max-width: 160px;
    text-align: center;
    background: var(--nd-bg-elevated);
    cursor: default;
    transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.card-tier3:hover {
    box-shadow: 0 3px 14px rgba(0,0,0,0.28);
    transform: translateY(-1px);
}

.card-tier3 .card-icon-sm { font-size: 15px; margin-bottom: var(--nd-sp-1); }
.card-tier3 .card-name-sm { font-size: 11.5px; }
.card-tier3 .card-sub { font-size: 10px; }

/* Nested depth-4+ cards inside a tier-3 card */
.t3-nested {
    display: flex;
    flex-wrap: wrap;
    gap: var(--nd-sp-2);
    justify-content: center;
    margin-top: var(--nd-sp-3);
}
`;
}
