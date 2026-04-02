// NowDev AI Toolbox — Sidebar Webview Script
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    // ── Tab switching ──────────────────────────────────────────────
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    function activateTab(tabId) {
        tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        tabContents.forEach(c => c.classList.toggle('active', c.id === 'tab-' + tabId));
        vscode.setState({ activeTab: tabId });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });

    // Restore last active tab (or default to 'setup')
    const saved = vscode.getState();
    activateTab((saved && saved.activeTab) || 'setup');

    // ── Setup tab: buttons ─────────────────────────────────────────
    document.getElementById('openChat').addEventListener('click', () => {
        vscode.postMessage({ command: 'openCopilotChat' });
    });
    document.getElementById('openSettings').addEventListener('click', () => {
        vscode.postMessage({ command: 'openSettings' });
    });
    document.getElementById('fixAll').addEventListener('click', () => {
        vscode.postMessage({ command: 'fixAllSettings' });
    });

    document.querySelectorAll('#checks .check-row .fix-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.closest('.check-row').dataset.key;
            vscode.postMessage({ command: 'fixSetting', key });
        });
    });

    // ── Setup tab: config inputs with debounce ─────────────────────
    let debounceTimers = {};
    function debounceUpdate(key, value) {
        clearTimeout(debounceTimers[key]);
        debounceTimers[key] = setTimeout(() => {
            vscode.postMessage({ command: 'updateConfig', key, value });
        }, 600);
    }

    document.getElementById('instanceUrl').addEventListener('input', (e) => {
        debounceUpdate('instanceUrl', e.target.value.trim());
    });
    document.getElementById('devStyle').addEventListener('change', (e) => {
        vscode.postMessage({ command: 'updateConfig', key: 'preferredDevelopmentStyle', value: e.target.value });
    });

    // ── Setup tab: file picker ─────────────────────────────────────
    document.getElementById('browseFile').addEventListener('click', () => {
        vscode.postMessage({ command: 'browseFile' });
    });
    document.getElementById('clearFile').addEventListener('click', () => {
        vscode.postMessage({ command: 'clearInstructionsFile' });
    });

    // ── Tools tab: rescan ──────────────────────────────────────────
    document.getElementById('rescanTools').addEventListener('click', () => {
        vscode.postMessage({ command: 'rescanTools' });
    });

    // ── Message handler ────────────────────────────────────────────
    window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.command) {
            case 'updateStatus':
                updateChecks(msg.checks);
                updateSettings(msg.settings);
                updateFluentApp(msg.fluentApp);
                updateEnvironment(msg.environment);
                break;
            case 'updateAgents':
                renderAgentTree(msg.tree);
                break;
            case 'updateArtifacts':
                renderArtifacts(msg.artifacts, msg.sessionActive);
                break;
        }
    });

    // ── Update helpers ─────────────────────────────────────────────

    function updateChecks(checks) {
        let allOk = true;
        document.querySelectorAll('#checks .check-row').forEach(row => {
            const key = row.dataset.key;
            const ok = checks[key];
            const icon = row.querySelector('.check-icon');
            const btn = row.querySelector('.fix-btn');
            if (ok) {
                icon.className = 'check-icon ok';
                icon.innerHTML = '\u2713';
                btn.style.display = 'none';
            } else {
                icon.className = 'check-icon fail';
                icon.innerHTML = '\u2717';
                btn.style.display = '';
                allOk = false;
            }
        });
        document.getElementById('allGood').style.display = allOk ? 'block' : 'none';
        document.getElementById('fixAll').style.display = allOk ? 'none' : '';
    }

    function updateSettings(settings) {
        const urlInput = document.getElementById('instanceUrl');
        const styleSelect = document.getElementById('devStyle');
        if (document.activeElement !== urlInput) {
            urlInput.value = settings.instanceUrl || '';
        }
        if (document.activeElement !== styleSelect) {
            styleSelect.value = settings.preferredStyle || 'auto';
        }
        const filePathEl = document.getElementById('filePath');
        const clearBtn = document.getElementById('clearFile');
        if (settings.customInstructionsFile) {
            filePathEl.textContent = settings.customInstructionsFile;
            filePathEl.style.display = 'block';
            clearBtn.style.display = '';
        } else {
            filePathEl.style.display = 'none';
            clearBtn.style.display = 'none';
        }
    }

    function updateFluentApp(fluentApp) {
        const section = document.getElementById('fluentAppSection');
        const hr = document.getElementById('fluentAppHr');
        const info = document.getElementById('fluentAppInfo');
        if (!fluentApp) {
            section.style.display = 'none';
            hr.style.display = 'none';
            return;
        }
        section.style.display = '';
        hr.style.display = '';
        const rows = [
            { key: 'Name', value: fluentApp.name },
            { key: 'Scope', value: fluentApp.scope },
            { key: 'Scope ID', value: fluentApp.scopeId },
        ];
        if (fluentApp.numericScopeId) {
            rows.push({ key: 'Numeric ID', value: fluentApp.numericScopeId });
            rows.push({ key: 'URL Prefix', value: '/x/' + fluentApp.numericScopeId });
        }
        info.innerHTML = rows.map(r =>
            '<div class="app-info-row"><span class="app-info-key">' + esc(r.key) + '</span><span class="app-info-value">' + esc(r.value) + '</span></div>'
        ).join('');
    }

    function updateEnvironment(env) {
        const summary = document.getElementById('envSummary');
        const list = document.getElementById('toolsList');
        if (!env) {
            summary.innerHTML = '<em>Environment scan not yet available.</em>';
            list.innerHTML = '';
            return;
        }
        summary.innerHTML = '<strong>OS:</strong> ' + esc(env.os) + ' (' + esc(env.arch) + ') &nbsp; <strong>Shell:</strong> ' + esc(env.shell);
        let html = '';
        const tools = env.tools || {};
        const keys = Object.keys(tools);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const t = tools[key];
            const statusClass = t.available ? 'installed' : 'missing';
            const checked = t.enabled ? 'checked' : '';
            const disabled = !t.available ? 'disabled' : '';
            html += '<div class="tool-row">';
            html += '  <span class="tool-status ' + statusClass + '"></span>';
            html += '  <div class="tool-info">';
            html += '    <span class="tool-name">' + esc(t.label) + '</span>';
            if (t.available && t.version) {
                html += '    <span class="tool-version">v' + esc(t.version) + '</span>';
            }
            if (!t.available) {
                html += '    <div class="tool-impact">' + esc(t.impact) + '</div>';
            } else {
                html += '    <div class="tool-desc">' + esc(t.description) + '</div>';
            }
            html += '  </div>';
            html += '  <label class="tool-toggle" title="' + (t.available ? 'Enable/disable for agents' : 'Not installed') + '">';
            html += '    <input type="checkbox" data-tool="' + esc(key) + '" ' + checked + ' ' + disabled + '>';
            html += '    <span class="slider"></span>';
            html += '  </label>';
            html += '</div>';
        }
        list.innerHTML = html;

        list.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                vscode.postMessage({ command: 'toggleTool', key: cb.dataset.tool, enabled: cb.checked });
            });
        });
    }

    // ── Agent tree rendering ───────────────────────────────────────

    function renderAgentTree(rootNode) {
        const container = document.getElementById('agentTree');
        if (!container || !rootNode) return;
        container.innerHTML = buildAgentNode(rootNode, 0);
        bindTreeEvents(container);
    }

    function buildAgentNode(node, level) {
        const hasChildren = node.children && node.children.length > 0;
        const chevronClass = hasChildren ? '' : ' leaf';
        const chevronIcon = hasChildren ? '\u25B6' : '';
        const collapsed = level > 0 ? ' collapsed' : '';

        let html = '<div class="agent-node level-' + level + '">';
        html += '<div class="agent-row" data-id="' + esc(node.id) + '">';
        html += '  <span class="agent-chevron' + chevronClass + '">' + chevronIcon + '</span>';
        html += '  <span class="agent-name">' + esc(node.shortName) + '</span>';
        html += '  <span class="agent-badge ' + esc(node.role) + '">' + esc(node.role) + '</span>';
        html += '</div>';
        if (node.description) {
            html += '<div class="agent-desc">' + esc(node.description) + '</div>';
        }
        if (hasChildren) {
            html += '<div class="agent-children' + collapsed + '">';
            for (const child of node.children) {
                html += buildAgentNode(child, level + 1);
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    function bindTreeEvents(container) {
        container.querySelectorAll('.agent-chevron:not(.leaf)').forEach(chevron => {
            chevron.addEventListener('click', () => {
                const node = chevron.closest('.agent-node');
                const children = node.querySelector(':scope > .agent-children');
                if (!children) return;
                const isCollapsed = children.classList.contains('collapsed');
                if (isCollapsed) {
                    children.style.maxHeight = children.scrollHeight + 'px';
                    children.classList.remove('collapsed');
                    chevron.textContent = '\u25BC';
                } else {
                    children.style.maxHeight = children.scrollHeight + 'px';
                    // Force reflow then collapse
                    children.offsetHeight;
                    children.classList.add('collapsed');
                    chevron.textContent = '\u25B6';
                }
            });
        });

        container.querySelectorAll('.agent-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('agent-chevron')) return;
                const desc = row.nextElementSibling;
                if (desc && desc.classList.contains('agent-desc')) {
                    desc.style.display = desc.style.display === 'block' ? 'none' : 'block';
                }
            });
        });
    }

    // ── Artifact registry rendering ────────────────────────────────

    function renderArtifacts(artifacts, sessionActive) {
        const container = document.getElementById('artifactsView');
        if (!container) return;

        if (!sessionActive || !artifacts || artifacts.length === 0) {
            container.innerHTML =
                '<div class="empty-state">' +
                '  <p>No active development session</p>' +
                '  <p class="hint">Start one by asking <strong>@NowDev-AI</strong> in Copilot Chat.</p>' +
                '</div>';
            return;
        }

        // Summary
        const done = artifacts.filter(a => isDone(a.status)).length;
        const inProgress = artifacts.filter(a => isInProgress(a.status)).length;
        const total = artifacts.length;
        let summaryParts = [total + ' artifact' + (total !== 1 ? 's' : '')];
        if (done > 0) summaryParts.push(done + ' done');
        if (inProgress > 0) summaryParts.push(inProgress + ' in progress');
        const remaining = total - done - inProgress;
        if (remaining > 0) summaryParts.push(remaining + ' other');

        let html = '<div class="artifacts-summary"><strong>' + summaryParts.join(' &middot; ') + '</strong></div>';

        html += '<table class="artifacts-table">';
        html += '<thead><tr><th>Artifact</th><th>Type</th><th>Status</th></tr></thead>';
        html += '<tbody>';
        for (const a of artifacts) {
            const dotClass = isDone(a.status) ? 'done' : isInProgress(a.status) ? 'progress' : isError(a.status) ? 'error' : 'unknown';
            const statusLabel = esc(a.status.replace(/[\u2705\uD83C\uDFD7\uFE0F\u274C]/gu, '').trim() || a.status);
            html += '<tr>';
            html += '<td><strong>' + esc(a.name) + '</strong>';
            if (a.file) html += '<br><span style="font-size:10px;color:var(--vscode-descriptionForeground);">' + esc(a.file) + '</span>';
            html += '</td>';
            html += '<td>' + esc(a.type) + '</td>';
            html += '<td><span class="artifact-status"><span class="status-dot ' + dotClass + '"></span>' + statusLabel + '</span></td>';
            html += '</tr>';
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function isDone(s) { return /done|complete|\u2705/i.test(s); }
    function isInProgress(s) { return /progress|building|\uD83C\uDFD7/i.test(s); }
    function isError(s) { return /error|fail|\u274C/i.test(s); }

    // ── Utility ────────────────────────────────────────────────────

    function esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
