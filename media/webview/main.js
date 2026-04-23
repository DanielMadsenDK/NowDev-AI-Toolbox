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

    document.getElementById('initFluentProject').addEventListener('click', () => {
        vscode.postMessage({ command: 'initFluentProject' });
    });

    // ── SDK tab ───────────────────────────────────────────────────

    document.getElementById('rescanAuthAliases').addEventListener('click', () => {
        vscode.postMessage({ command: 'rescanAuthAliases' });
    });
    document.getElementById('sdkAuthAdd').addEventListener('click', () => {
        vscode.postMessage({ command: 'sdkAuthAdd' });
    });

    // Command help (?) buttons
    document.querySelectorAll('.sdk-help-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            vscode.postMessage({ command: 'sdkCommandHelp', cmd: btn.dataset.cmd });
        });
    });

    // Options gear toggle
    document.querySelectorAll('.sdk-opts-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var optsId = btn.dataset.opts;
            var optsEl = document.getElementById(optsId);
            if (!optsEl) { return; }
            var isOpen = optsEl.classList.contains('open');
            optsEl.classList.toggle('open', !isOpen);
            btn.textContent = isOpen ? '\u2699' : '\u2715';
            btn.title = isOpen ? 'Show options' : 'Hide options';
        });
    });

    // Run buttons
    document.querySelectorAll('.sdk-run-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var cmd = btn.dataset.cmd;
            var auth = document.getElementById('sdkCmdAuth') ? document.getElementById('sdkCmdAuth').value : '';
            var args = { auth: auth };
            if (cmd === 'build') {
                args.frozenKeys = !!(document.getElementById('buildFrozenKeys') && document.getElementById('buildFrozenKeys').checked);
            } else if (cmd === 'install') {
                args.reinstall = !!(document.getElementById('installReinstall') && document.getElementById('installReinstall').checked);
                args.openBrowser = !!(document.getElementById('installOpenBrowser') && document.getElementById('installOpenBrowser').checked);
            } else if (cmd === 'transform') {
                args.preview = !!(document.getElementById('transformPreview') && document.getElementById('transformPreview').checked);
            } else if (cmd === 'dependencies') {
                args.mode = document.getElementById('depsMode') ? document.getElementById('depsMode').value : 'all';
            } else if (cmd === 'download') {
                args.incremental = !(document.getElementById('downloadIncremental') && !document.getElementById('downloadIncremental').checked);
            }
            vscode.postMessage({ command: 'sdkCommand', cmd: cmd, args: args });
        });
    });

    document.getElementById('runExplain').addEventListener('click', function () {
        var api = document.getElementById('explainApiInput').value.trim();
        if (!api) { return; }
        vscode.postMessage({ command: 'sdkExplain', api: api });
    });
    document.getElementById('explainApiInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            var api = e.target.value.trim();
            if (!api) { return; }
            vscode.postMessage({ command: 'sdkExplain', api: api });
        }
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
                if (msg.sdkStatus) { updateSdkStatus(msg.sdkStatus); }
                break;
            case 'updateAgents':
                renderAgentTree(msg.tree);
                break;
            case 'updateArtifacts':
                renderArtifacts(msg.artifacts, msg.sessionActive);
                break;
            case 'updateSdkData':
                renderAuthAliases(msg.authAliases);
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
        const initSection = document.getElementById('initFluentSection');
        const initHr = document.getElementById('initFluentHr');
        if (!fluentApp) {
            section.style.display = 'none';
            hr.style.display = 'none';
            initSection.style.display = '';
            initHr.style.display = '';
            return;
        }
        section.style.display = '';
        hr.style.display = '';
        initSection.style.display = 'none';
        initHr.style.display = 'none';
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
            // manual = user force-enabled a tool that wasn't auto-detected
            const statusClass = t.available ? 'installed' : (t.manualOverride ? 'manual' : 'missing');
            const checked = t.enabled ? 'checked' : '';
            let tooltip = t.available ? 'Enable/disable for agents' : (t.manualOverride ? 'Manually enabled — not auto-detected' : 'Not installed — toggle to manually enable');
            html += '<div class="tool-row">';
            html += '  <span class="tool-status ' + statusClass + '" title="' + esc(tooltip) + '"></span>';
            html += '  <div class="tool-info">';
            html += '    <span class="tool-name">' + esc(t.label) + '</span>';
            if (t.available && t.version) {
                html += '    <span class="tool-version">v' + esc(t.version) + '</span>';
            }
            if (t.manualOverride) {
                html += '    <div class="tool-desc">' + esc(t.description) + '</div>';
                html += '    <div class="tool-note">Not auto-detected \u2014 manually enabled</div>';
            } else if (!t.available) {
                html += '    <div class="tool-impact">' + esc(t.impact) + '</div>';
            } else {
                html += '    <div class="tool-desc">' + esc(t.description) + '</div>';
            }
            html += '  </div>';
            html += '  <label class="tool-toggle" title="' + esc(tooltip) + '">';
            html += '    <input type="checkbox" data-tool="' + esc(key) + '" ' + checked + '>';
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
                    children.classList.remove('collapsed');
                    chevron.textContent = '\u25BC';
                } else {
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

    let _currentArtifactFilter = 'active'; // default to showing active (non-done) artifacts
    let _lastArtifacts = [];
    let _lastSessionActive = false;

    function renderArtifacts(artifacts, sessionActive) {
        _lastArtifacts = artifacts || [];
        _lastSessionActive = sessionActive;
        _renderArtifactsFiltered();
    }

    function _renderArtifactsFiltered() {
        const container = document.getElementById('artifactsView');
        if (!container) return;

        const artifacts = _lastArtifacts;
        const sessionActive = _lastSessionActive;

        if (!sessionActive || !artifacts || artifacts.length === 0) {
            container.innerHTML =
                '<div class="empty-state">' +
                '  <p>No active development session</p>' +
                '  <p class="hint">Start one by asking <strong>@NowDev-AI</strong> in Copilot Chat.</p>' +
                '</div>';
            return;
        }

        // Counts
        const doneCount = artifacts.filter(a => isDone(a.status)).length;
        const inProgressCount = artifacts.filter(a => isInProgress(a.status)).length;
        const total = artifacts.length;
        const activeCount = total - doneCount;

        // Filter bar
        let html = '<div class="artifact-filters">';
        html += '<button class="artifact-filter-btn' + (_currentArtifactFilter === 'active' ? ' active' : '') + '" data-filter="active">Active (' + activeCount + ')</button>';
        html += '<button class="artifact-filter-btn' + (_currentArtifactFilter === 'all' ? ' active' : '') + '" data-filter="all">All (' + total + ')</button>';
        html += '<button class="artifact-filter-btn' + (_currentArtifactFilter === 'done' ? ' active' : '') + '" data-filter="done">Done (' + doneCount + ')</button>';
        html += '</div>';

        // Summary
        let summaryParts = [total + ' artifact' + (total !== 1 ? 's' : '')];
        if (doneCount > 0) summaryParts.push(doneCount + ' done');
        if (inProgressCount > 0) summaryParts.push(inProgressCount + ' in progress');
        const remaining = total - doneCount - inProgressCount;
        if (remaining > 0) summaryParts.push(remaining + ' other');
        html += '<div class="artifacts-summary"><strong>' + summaryParts.join(' &middot; ') + '</strong></div>';

        // Filter artifacts
        var filtered = artifacts;
        if (_currentArtifactFilter === 'active') {
            filtered = artifacts.filter(function (a) { return !isDone(a.status); });
        } else if (_currentArtifactFilter === 'done') {
            filtered = artifacts.filter(function (a) { return isDone(a.status); });
        }

        if (filtered.length === 0) {
            html += '<div class="empty-state"><p>' +
                (_currentArtifactFilter === 'active' ? 'All artifacts are done!' : 'No matching artifacts.') +
                '</p></div>';
        }

        for (const a of filtered) {
            var aIsDone = isDone(a.status);
            var dotClass = aIsDone ? 'done' : isInProgress(a.status) ? 'progress' : isError(a.status) ? 'error' : 'unknown';
            var statusLabel = esc(a.status.replace(/[\u2705\uD83C\uDFD7\uFE0F\u274C]/gu, '').trim() || a.status);

            html += '<div class="artifact-card' + (aIsDone ? ' is-done' : '') + '">';
            html += '<div class="artifact-card-header">';
            html += '<span class="artifact-status"><span class="status-dot ' + dotClass + '"></span>' + statusLabel + '</span>';
            if (a.agent) html += '<span class="artifact-agent">' + esc(a.agent) + '</span>';
            html += '</div>';
            html += '<div class="artifact-card-name">' + esc(a.name) + '</div>';
            if (a.file) html += '<div class="artifact-card-file">' + esc(a.file) + '</div>';
            html += '<div class="artifact-card-type">' + esc(a.type) + '</div>';

            if ((a.exports && a.exports !== '-' && a.exports !== '\u2014') || (a.dependsOn && a.dependsOn !== '-' && a.dependsOn !== '\u2014')) {
                html += '<div class="artifact-card-details">';
                if (a.exports && a.exports !== '-' && a.exports !== '\u2014') {
                    html += '<span class="artifact-detail"><span class="detail-label">Exports:</span> ' + esc(a.exports) + '</span>';
                }
                if (a.dependsOn && a.dependsOn !== '-' && a.dependsOn !== '\u2014') {
                    html += '<span class="artifact-detail"><span class="detail-label">Depends on:</span> ' + esc(a.dependsOn) + '</span>';
                }
                html += '</div>';
            }
            html += '</div>';
        }
        container.innerHTML = html;

        // Bind filter buttons
        container.querySelectorAll('.artifact-filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                _currentArtifactFilter = btn.dataset.filter;
                _renderArtifactsFiltered();
            });
        });
    }

    function isDone(s) { return /done|complete|\u2705/i.test(s); }
    function isInProgress(s) { return /progress|building|\uD83C\uDFD7/i.test(s); }
    function isError(s) { return /error|fail|\u274C/i.test(s); }

    // ── Auth Aliases rendering ─────────────────────────────────────

    function renderAuthAliases(aliases) {
        var list = document.getElementById('authAliasesList');
        var authSelect = document.getElementById('sdkCmdAuth');
        if (!list) { return; }

        if (!aliases || aliases.length === 0) {
            list.innerHTML = '<div class="field-desc" style="font-style:italic;">No aliases found. Use the <strong>Add&hellip;</strong> button or run <code>now-sdk auth --add</code>.</div>';
            if (authSelect) { authSelect.innerHTML = '<option value="">(SDK default)</option>'; }
            return;
        }

        // Rebuild auth select options, preserving current selection
        if (authSelect) {
            var current = authSelect.value;
            authSelect.innerHTML = '<option value="">(SDK default)</option>' +
                aliases.map(function (a) {
                    return '<option value="' + esc(a.alias) + '"' + (a.alias === current ? ' selected' : '') + '>' + esc(a.alias) + '</option>';
                }).join('');
        }

        list.innerHTML = aliases.map(function (a) {
            var defaultBadge = a.isDefault ? '<span class="auth-alias-default-badge">default</span>' : '';
            var setDefaultBtn = !a.isDefault
                ? '<button class="fix-btn" data-action="setDefault" data-alias="' + esc(a.alias) + '" title="Set as SDK default">Default</button>'
                : '';
            return '<div class="auth-alias-row">' +
                '<div class="auth-alias-info">' +
                '<div><span class="auth-alias-name">' + esc(a.alias) + '</span>' + defaultBadge + '</div>' +
                '<div class="auth-alias-host">' + esc(a.host) + '</div>' +
                '</div>' +
                '<span class="auth-alias-type">' + esc(a.type || '?') + '</span>' +
                '<div class="auth-alias-actions">' +
                setDefaultBtn +
                '<button class="fix-btn auth-alias-delete" data-action="remove" data-alias="' + esc(a.alias) + '" title="Delete alias">Delete</button>' +
                '</div>' +
                '</div>';
        }).join('');

        list.querySelectorAll('[data-action="setDefault"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                vscode.postMessage({ command: 'sdkAuthSetDefault', alias: btn.dataset.alias });
            });
        });
        list.querySelectorAll('[data-action="remove"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                vscode.postMessage({ command: 'sdkAuthRemove', alias: btn.dataset.alias });
            });
        });
    }

    // ── SDK command status ─────────────────────────────────────────

    function updateSdkStatus(sdkStatus) {
        var cmds = ['build', 'install', 'transform', 'dependencies', 'download', 'clean', 'pack'];
        cmds.forEach(function (cmd) {
            var el = document.getElementById('sdkStatus-' + cmd);
            if (!el) { return; }
            var s = sdkStatus[cmd];
            if (!s) {
                el.textContent = '';
                el.className = 'sdk-cmd-status';
                return;
            }
            var timeAgo = formatTimeAgo(new Date(s.timestamp));
            el.textContent = (s.ok ? '\u2713 ' : '\u2717 ') + s.message + ' \u2014 ' + timeAgo;
            el.className = 'sdk-cmd-status ' + (s.ok ? 'ok' : 'fail');
        });
    }

    function formatTimeAgo(date) {
        var seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 5) { return 'just now'; }
        if (seconds < 60) { return seconds + 's ago'; }
        if (seconds < 3600) { return Math.floor(seconds / 60) + 'm ago'; }
        return Math.floor(seconds / 3600) + 'h ago';
    }

    // ── Utility ────────────────────────────────────────────────────

    function esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
