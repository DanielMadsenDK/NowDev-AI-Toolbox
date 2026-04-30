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
        vscode.postMessage({ command: 'tabActivated', tab: tabId });
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

    document.getElementById('rescanMcp').addEventListener('click', () => {
        vscode.postMessage({ command: 'rescanMcp' });
    });

    // ── Setup tab: DevOps integration ──────────────────────────────
    document.getElementById('devopsEnabled').addEventListener('change', function () {
        var enabled = this.checked;
        document.getElementById('devopsConfig').style.display = enabled ? '' : 'none';
        vscode.postMessage({ command: 'updateDevopsEnabled', enabled: enabled });
    });

    document.getElementById('devopsMcpServer').addEventListener('change', function () {
        vscode.postMessage({ command: 'updateDevopsMcp', server: this.value });
    });

    document.getElementById('browseDevopsFile').addEventListener('click', function () {
        vscode.postMessage({ command: 'browseDevopsInstructionsFile' });
    });
    document.getElementById('clearDevopsFile').addEventListener('click', function () {
        vscode.postMessage({ command: 'clearDevopsInstructions' });
    });

    document.getElementById('resyncAgents').addEventListener('click', () => {
        vscode.postMessage({ command: 'resyncAgents' });
    });

    document.getElementById('showAgentTopology').addEventListener('click', () => {
        vscode.postMessage({ command: 'showAgentTopology' });
    });

    // ── SDK tab ───────────────────────────────────────────────────

    // ── Setup tab: connection test ─────────────────────────────────
    document.getElementById('testConnection').addEventListener('click', () => {
        vscode.postMessage({ command: 'checkConnection' });
    });

    // ── SDK tab: install info + check changes ──────────────────────
    document.getElementById('installInfoBtn').addEventListener('click', () => {
        var auth = document.getElementById('sdkCmdAuth') ? document.getElementById('sdkCmdAuth').value : '';
        vscode.postMessage({ command: 'sdkInstallInfo', auth: auth });
    });
    document.getElementById('checkChangesBtn').addEventListener('click', () => {
        var auth = document.getElementById('sdkCmdAuth') ? document.getElementById('sdkCmdAuth').value : '';
        vscode.postMessage({ command: 'sdkCheckChanges', auth: auth });
    });

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
                updateMcpServers(msg.mcpServers, msg.selectedMcp);
                updateMcpDocSources(msg.mcpDocSources, msg.mcpServers);
                updateDevopsSection(msg.devopsConfig, msg.mcpServers);
                break;
            case 'updateAgents':
                renderAgentCards(msg.manifests, msg.overrides);
                break;
            case 'updateArtifacts':
                renderArtifacts(msg.artifacts, msg.sessionActive);
                break;
            case 'updateSdkData':
                renderAuthAliases(msg.authAliases);
                break;
            case 'updateConnectionStatus':
                renderConnectionStatus(msg.state);
                break;
            case 'updateInstallInfo':
                renderInstallInfo(msg.state);
                break;
            case 'updateCheckChanges':
                renderCheckChanges(msg.state);
                break;
            case 'updateDevopsConfig':
                updateDevopsSection(msg.devopsConfig, null);
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

    // ── Agent card rendering ───────────────────────────────────────

    function renderAgentCards(manifests, overrides) {
        var container = document.getElementById('agentCards');
        if (!container) { return; }
        if (!manifests || manifests.length === 0) {
            container.innerHTML = '<div class="field-desc" style="font-style:italic;padding:8px 0;">Loading agent registry…</div>';
            return;
        }

        // User-invocable agents first, then sub-agents; alphabetical within each group
        var sorted = manifests.slice().sort(function (a, b) {
            if (a.userInvocable !== b.userInvocable) { return a.userInvocable ? -1 : 1; }
            return a.name.localeCompare(b.name);
        });

        var html = '';
        for (var i = 0; i < sorted.length; i++) {
            var m = sorted[i];
            var override = (overrides && overrides[m.name]) || { enabled: true, disabledTools: [] };
            var agentEnabled = override.enabled !== false;
            var disabledSet = {};
            if (override.disabledTools) {
                override.disabledTools.forEach(function (t) { disabledSet[t] = true; });
            }
            var enabledCount = m.baseTools.filter(function (t) { return !disabledSet[t]; }).length;

            var cardClass = 'agent-card' + (agentEnabled ? '' : ' agent-disabled');
            html += '<div class="' + cardClass + '" data-agent-name="' + esc(m.name) + '">';

            // Header row
            html += '<div class="agent-card-header">';
            html += '<div class="agent-card-title-row">';
            html += '<button class="agent-chevron" data-target="at-' + esc(m.name) + '" title="Show/hide tools">&#9654;</button>';
            html += '<div class="agent-card-info">';
            html += '<span class="agent-card-name">' + esc(m.shortName || m.name) + '</span>';
            html += '<span class="agent-card-badge ' + (m.userInvocable ? 'picker' : 'sub-agent') + '">';
            html += m.userInvocable ? 'picker' : 'sub-agent';
            html += '</span>';
            html += '</div>';
            // Enable/disable toggle — all agents except the orchestrator (NowDev AI Agent)
            if (m.name !== 'NowDev AI Agent') {
                html += '<label class="tool-toggle" title="Enable/disable agent">';
                html += '<input type="checkbox" class="agent-enable-cb" data-agent="' + esc(m.name) + '"' + (agentEnabled ? ' checked' : '') + '>';
                html += '<span class="slider"></span>';
                html += '</label>';
            }
            html += '</div>'; // agent-card-title-row
            html += '<div class="agent-card-tool-count">' + enabledCount + ' / ' + m.baseTools.length + ' tools enabled</div>';
            html += '</div>'; // agent-card-header

            // Collapsible tools section — hidden by default via CSS class
            html += '<div class="agent-card-tools" id="at-' + esc(m.name) + '">';
            for (var j = 0; j < m.baseTools.length; j++) {
                var tool = m.baseTools[j];
                var toolOn = !disabledSet[tool];
                html += '<label class="agent-tool-row">';
                html += '<input type="checkbox" class="agent-tool-cb" data-agent="' + esc(m.name) + '" data-tool="' + esc(tool) + '"' + (toolOn ? ' checked' : '') + '>';
                html += '<span class="agent-tool-name">' + esc(tool) + '</span>';
                html += '</label>';
            }
            html += '</div>'; // agent-card-tools

            html += '</div>'; // agent-card
        }

        container.innerHTML = html;

        // Bind chevron toggles
        container.querySelectorAll('.agent-chevron').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var targetId = btn.getAttribute('data-target');
                var target = document.getElementById(targetId);
                if (!target) { return; }
                var expanded = target.classList.contains('expanded');
                target.classList.toggle('expanded', !expanded);
                btn.innerHTML = !expanded ? '&#9660;' : '&#9654;';
            });
        });

        // Bind agent enable/disable toggles
        container.querySelectorAll('.agent-enable-cb').forEach(function (cb) {
            cb.addEventListener('change', function () {
                vscode.postMessage({ command: 'toggleAgent', name: cb.getAttribute('data-agent'), enabled: cb.checked });
            });
        });

        // Bind per-tool toggles
        container.querySelectorAll('.agent-tool-cb').forEach(function (cb) {
            cb.addEventListener('change', function () {
                vscode.postMessage({ command: 'toggleAgentTool', agentName: cb.getAttribute('data-agent'), toolName: cb.getAttribute('data-tool'), enabled: cb.checked });
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

    // ── DevOps Integration rendering ───────────────────────────────

    function updateDevopsSection(devopsConfig, servers) {
        var cfg = devopsConfig || { enabled: false, mcpServer: '', customInstructions: '' };

        var enabledCb = document.getElementById('devopsEnabled');
        var configDiv = document.getElementById('devopsConfig');
        var serverSel = document.getElementById('devopsMcpServer');

        if (!enabledCb || !configDiv) { return; }

        enabledCb.checked = !!cfg.enabled;
        configDiv.style.display = cfg.enabled ? '' : 'none';

        // Populate MCP server dropdown
        if (serverSel) {
            var currentServer = cfg.mcpServer || '';
            var opts = '<option value="">(select a server)</option>';
            var allServers = servers || [];
            allServers.forEach(function (s) {
                var sel = s.name === currentServer ? ' selected' : '';
                opts += '<option value="' + esc(s.name) + '"' + sel + '>' + esc(s.name) + '</option>';
            });
            // If configured server is not in the list, still show it as selected
            if (currentServer && !allServers.find(function (s) { return s.name === currentServer; })) {
                opts += '<option value="' + esc(currentServer) + '" selected>' + esc(currentServer) + ' (not found)</option>';
            }
            serverSel.innerHTML = opts;
        }

        // Show/hide the instructions file indicator
        var hasInstructions = !!(cfg.customInstructions && cfg.customInstructions.trim());
        var filePathEl = document.getElementById('devopsFilePath');
        var clearBtn   = document.getElementById('clearDevopsFile');
        if (filePathEl) {
            filePathEl.style.display = hasInstructions ? '' : 'none';
            filePathEl.textContent   = hasInstructions ? 'Custom instructions loaded (' + cfg.customInstructions.trim().length + ' chars)' : '';
        }
        if (clearBtn) { clearBtn.style.display = hasInstructions ? '' : 'none'; }
    }

    // ── MCP Integrations rendering ─────────────────────────────────

    function updateMcpServers(servers, selectedMcp) {
        var list = document.getElementById('mcpServersList');
        if (!list) { return; }

        if (!servers || servers.length === 0) {
            list.innerHTML =
                '<div class="field-desc" style="font-style:italic;">' +
                'No MCP servers detected. Add servers via the Extensions view ' +
                '<code>@mcp</code> or in <code>.vscode/mcp.json</code>.' +
                '</div>';
            return;
        }

        var selected = selectedMcp || [];
        var html = servers.map(function (s) {
            var checked = selected.indexOf(s.name) >= 0 ? 'checked' : '';
            var sourceLabel = s.source === 'file' ? 'mcp.json' : 'settings';
            var sourceBadge = '<span class="auth-alias-default-badge">' + esc(sourceLabel) + '</span>';
            var typeHint = s.type ? ' <span class="tool-version">' + esc(s.type) + '</span>' : '';
            return '<div class="tool-row">' +
                '  <div class="tool-info">' +
                '    <span class="tool-name">' + esc(s.name) + '</span>' + typeHint + ' ' + sourceBadge +
                '  </div>' +
                '  <label class="tool-toggle" title="Include in agent tools">' +
                '    <input type="checkbox" data-mcp="' + esc(s.name) + '" ' + checked + '>' +
                '    <span class="slider"></span>' +
                '  </label>' +
                '</div>';
        }).join('');

        list.innerHTML = html;

        list.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                vscode.postMessage({ command: 'toggleMcp', name: cb.dataset.mcp, enabled: cb.checked });
            });
        });
    }

    // ── MCP Documentation Sources rendering ────────────────────────

    var docSourceDebounce = {};
    function updateMcpDocSources(docSources, servers) {
        var container = document.getElementById('mcpDocSourcesList');
        if (!container) { return; }
        if (!docSources) { container.innerHTML = ''; return; }

        var serverOptions = '<option value="">(none \u2014 use built-in skills)</option>';
        if (servers && servers.length > 0) {
            serverOptions += servers.map(function (s) {
                return '<option value="' + esc(s.name) + '">' + esc(s.name) + '</option>';
            }).join('');
        }

        var slots = [
            { key: 'classicScripting', label: 'Classic Scripting', desc: 'Business Rule, Script Include, Client Script, Classic Reviewer' },
            { key: 'fluentSdk',        label: 'Fluent SDK',         desc: 'All Fluent specialists, AI Studio, NowAssist, ATF, Pipeline' },
            { key: 'general',          label: 'General docs',       desc: 'Refinement, Orchestrator, Debugger, Assistant' },
        ];

        var html = slots.map(function (slot) {
            var src = docSources[slot.key] || {};
            var server = src.server || '';
            var hint = src.libraryHint || '';
            var hasServer = server !== '';
            var serverLabel = hasServer
                ? esc(server)
                : '<span style="color:var(--vscode-descriptionForeground);font-style:italic;">built-in skills</span>';
            var hintPart = (hasServer && hint)
                ? ' \u00b7 <code style="font-size:10px;">' + esc(hint) + '</code>'
                : '';
            var opts = serverOptions.replace(
                'value="' + esc(server) + '"',
                'value="' + esc(server) + '" selected'
            );
            var panelId = 'mcp-doc-panel-' + slot.key;
            var gearId  = 'mcp-doc-gear-'  + slot.key;
            return (
                '<div class="mcp-doc-source-row" data-slot="' + slot.key + '">' +
                '  <div class="mcp-doc-source-info">' +
                '    <div class="mcp-doc-source-label">' + esc(slot.label) + '</div>' +
                '    <div class="mcp-doc-source-server" id="mcp-doc-summary-' + slot.key + '">' + serverLabel + hintPart + '</div>' +
                '  </div>' +
                '  <button class="mcp-doc-source-gear" id="' + gearId + '" title="Configure">\u2699</button>' +
                '</div>' +
                '<div class="mcp-doc-source-panel" id="' + panelId + '">' +
                '  <div class="field-desc" style="margin-bottom:6px;">' + esc(slot.desc) + '</div>' +
                '  <div class="field-row">' +
                '    <label>Server</label>' +
                '    <select class="mcp-doc-server-select" data-slot="' + slot.key + '">' + opts + '</select>' +
                '  </div>' +
                '  <div class="field-row">' +
                '    <label>Hint</label>' +
                '    <input type="text" class="mcp-doc-hint-input" data-slot="' + slot.key + '"' +
                '      value="' + esc(hint) + '" placeholder="e.g. /websites/servicenow"' +
                (hasServer ? '' : ' disabled') + '>' +
                '  </div>' +
                '</div>'
            );
        }).join('');

        container.innerHTML = html;

        // Gear toggle — opens/closes the config panel
        container.querySelectorAll('.mcp-doc-source-gear').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var slot = btn.id.replace('mcp-doc-gear-', '');
                var panel = document.getElementById('mcp-doc-panel-' + slot);
                if (!panel) { return; }
                var isOpen = panel.classList.contains('open');
                panel.classList.toggle('open', !isOpen);
                btn.classList.toggle('open', !isOpen);
                btn.textContent = isOpen ? '\u2699' : '\u2715';
                btn.title = isOpen ? 'Configure' : 'Close';
            });
        });

        // Server dropdown — update summary and enable/disable hint field
        container.querySelectorAll('.mcp-doc-server-select').forEach(function (sel) {
            sel.addEventListener('change', function () {
                var slot = sel.dataset.slot;
                var hintInput = container.querySelector('.mcp-doc-hint-input[data-slot="' + slot + '"]');
                if (hintInput) { hintInput.disabled = sel.value === ''; }
                _refreshDocSummary(slot, sel.value, hintInput ? hintInput.value : '');
                vscode.postMessage({ command: 'updateMcpDocSource', slot: slot, field: 'server', value: sel.value });
            });
        });

        // Hint input — debounced save
        container.querySelectorAll('.mcp-doc-hint-input').forEach(function (inp) {
            inp.addEventListener('input', function () {
                var slot = inp.dataset.slot;
                var sel = container.querySelector('.mcp-doc-server-select[data-slot="' + slot + '"]');
                _refreshDocSummary(slot, sel ? sel.value : '', inp.value);
                clearTimeout(docSourceDebounce[slot]);
                docSourceDebounce[slot] = setTimeout(function () {
                    vscode.postMessage({ command: 'updateMcpDocSource', slot: slot, field: 'libraryHint', value: inp.value.trim() });
                }, 600);
            });
        });
    }

    function _refreshDocSummary(slot, server, hint) {
        var el = document.getElementById('mcp-doc-summary-' + slot);
        if (!el) { return; }
        if (!server) {
            el.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-style:italic;">built-in skills</span>';
        } else {
            var hintPart = hint ? ' \u00b7 <code style="font-size:10px;">' + esc(hint) + '</code>' : '';
            el.innerHTML = esc(server) + hintPart;
        }
    }

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

    // ── Connection status rendering ────────────────────────────────

    function renderConnectionStatus(state) {
        var el = document.getElementById('connectionStatus');
        if (!el) { return; }
        if (!state) { el.style.display = 'none'; return; }
        el.style.display = 'block';
        if (state.checking) {
            el.className = 'connection-status checking';
            el.innerHTML = '<span class="conn-dot"></span><span>Checking&hellip;</span>';
            return;
        }
        if (state.reachable) {
            var code = state.statusCode || '';
            var ms = state.responseTime ? state.responseTime + 'ms' : '';
            var detail = [code ? 'HTTP ' + code : '', ms].filter(Boolean).join(' · ');
            el.className = 'connection-status reachable';
            el.innerHTML = '<span class="conn-dot"></span><span>Reachable' + (detail ? ' <span class="conn-detail">' + esc(detail) + '</span>' : '') + '</span>';
        } else {
            el.className = 'connection-status unreachable';
            el.innerHTML = '<span class="conn-dot"></span><span>Unreachable' + (state.error ? ' <span class="conn-detail">' + esc(state.error) + '</span>' : '') + '</span>';
        }
    }

    // ── Install info rendering ─────────────────────────────────────

    function renderInstallInfo(state) {
        var panel = document.getElementById('installInfoPanel');
        if (!panel) { return; }
        if (!state) { panel.style.display = 'none'; return; }
        panel.style.display = 'block';
        if (state.loading) {
            panel.className = 'install-info-panel';
            panel.innerHTML = '<span class="install-info-loading">Fetching deployment status&hellip;</span>';
            return;
        }
        var timeAgo = state.timestamp ? formatTimeAgo(new Date(state.timestamp)) : '';
        var statusIcon = state.ok ? '✓' : '✗';
        var cls = state.ok ? 'install-info-panel ok' : 'install-info-panel fail';
        panel.className = cls;
        var lines = state.output ? state.output.split('\n').slice(0, 12) : [];
        var bodyHtml = lines.length > 0
            ? '<pre class="install-info-output">' + esc(lines.join('\n')) + '</pre>'
            : '<span class="install-info-empty">No deployment info available.</span>';
        panel.innerHTML =
            '<div class="install-info-header">' +
            '  <span class="install-info-icon">' + statusIcon + '</span>' +
            '  <span class="install-info-label">' + (state.ok ? 'Deployment status' : 'Could not fetch status') + '</span>' +
            (timeAgo ? '  <span class="install-info-time">' + esc(timeAgo) + '</span>' : '') +
            '</div>' +
            bodyHtml;
    }

    // ── Check changes rendering ────────────────────────────────────

    function renderCheckChanges(state) {
        var el = document.getElementById('checkChangesStatus');
        if (!el) { return; }
        if (!state) { el.style.display = 'none'; return; }
        el.style.display = 'block';
        if (state.checking) {
            el.className = 'changes-status checking';
            el.innerHTML = '<span class="changes-dot"></span><span>Checking for changes&hellip;</span>';
            return;
        }
        var timeAgo = state.timestamp ? formatTimeAgo(new Date(state.timestamp)) : '';
        if (!state.ok) {
            el.className = 'changes-status fail';
            el.innerHTML = '<span class="changes-dot"></span><span>Check failed' +
                (state.error ? ': <span class="changes-detail">' + esc(state.error) + '</span>' : '') +
                (timeAgo ? ' — ' + esc(timeAgo) : '') + '</span>';
            return;
        }
        if (state.count === 0) {
            el.className = 'changes-status synced';
            el.innerHTML = '<span class="changes-dot"></span><span>Up to date' +
                (timeAgo ? ' <span class="changes-detail">' + esc(timeAgo) + '</span>' : '') + '</span>';
        } else {
            el.className = 'changes-status has-changes';
            el.innerHTML = '<span class="changes-dot"></span><span>' + state.count + ' change' + (state.count !== 1 ? 's' : '') + ' on instance' +
                (timeAgo ? ' <span class="changes-detail">' + esc(timeAgo) + '</span>' : '') +
                ' — run Transform to sync</span>';
        }
    }

    // ── Utility ────────────────────────────────────────────────────

    function esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
