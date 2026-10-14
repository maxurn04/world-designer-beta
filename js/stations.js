/* ==============================================================
   STATIONS, UPGRADES, PIDS & INTERMODAL SYSTEM
   ============================================================== */

let allStations = [];
let currentSelectedStation = null;
let currentStationPopup = null;
currentStationTab = 'resumen';
currentSidePanelType = null;



/* ==============================================================
   NUEVA MECÃƒÂNICA: ESTACIONES INTERMODALES (METRO + BUS)
   ============================================================== */

function hudUpgradeIntermodal(stId) {
    let st = allStations.find(s => s.id === stId);
    if (!st) return;

    if (st.isIntermodal) {
        showStatusToast(currentLang === 'es' ? 'Ã¢â€žÂ¹Ã¯Â¸Â Esta estaciÃƒÂ³n ya opera como nodo Intermodal.' : 'Ã¢â€žÂ¹Ã¯Â¸Â This station is already an active Intermodal hub.');
        return;
    }

    const INTERMODAL_CONVERT_COST = 15000000; // $15,000,000
    if (money < INTERMODAL_CONVERT_COST) {
        showStatusToast(
            currentLang === 'es'
                ? 'Ã¢Å¡Â Ã¯Â¸Â Fondos insuficientes para obras de intermodalidad ($15.000.000 requeridos).'
                : 'Ã¢Å¡Â Ã¯Â¸Â Insufficient funds for intermodal conversion ($15,000,000 required).',
            false,
            'var(--danger-pastel)'
        );
        return;
    }

    money -= INTERMODAL_CONVERT_COST;
    updateMoneyDisplay();

    st.isIntermodal = true;
    st.maxCapacity = (st.maxCapacity || 100) + 250;
    st.attrMultiplier = (st.attrMultiplier || 1.0) * 1.5;
    st.intermodalDailyMaint = 450000; // Cara de mantener

    if (typeof playAudioMetroChime === 'function') playAudioMetroChime();
    updateStationBadge(st);

    if (currentSidePanelType === 'station') openSideStationPanel(st);
    let standalone = document.getElementById('station-hud-panel');
    if (standalone && standalone.style.display === 'block') openStandaloneStationPanel(st);
    if (typeof renderDensityMapFilter === 'function' && typeof isDensityFilterActive !== 'undefined' && isDensityFilterActive) {
        renderDensityMapFilter();
    }

    showStatusToast(
        currentLang === 'es'
            ? ('🏢 ¡' + st.name + ' convertida con éxito en Estación Intermodal! Habilitada para Metro y Buses.')
            : ('🏢 ' + st.name + ' successfully upgraded to Intermodal Hub! Enabled for Metro & Buses.'),
        false,
        'var(--accent)'
    );
}

function isStationIntermodal(st) {
    return !!(st && st.isIntermodal);
}

        function adjustStationPanelHeight() {
            let sidePanel = document.getElementById('thud-side-panel');
            let transportHud = document.getElementById('transport-hud-panel');
            let navbar = document.getElementById('navbar');

            // Bottom boundary of navbar (top hard ceiling for station cards and tabs)
            let navBottom = 72; // default: 60px navbar + 12px safe clearance
            if (navbar && navbar.style.display !== 'none') {
                let nRect = navbar.getBoundingClientRect();
                if (nRect.bottom > 0) {
                    navBottom = Math.ceil(nRect.bottom) + 12;
                }
            }

            if (sidePanel && transportHud) {
                let tRect = transportHud.getBoundingClientRect();
                let availableHeight = window.innerHeight - navBottom - 420;
                if (tRect.top > 0) {
                    availableHeight = tRect.top - 12 - navBottom;
                }
                let maxAvailableHeight = Math.max(160, Math.floor(availableHeight));
                sidePanel.style.maxHeight = maxAvailableHeight + 'px';

                let headerRow = sidePanel.querySelector('.st-header-row');
                let headerHeight = headerRow ? headerRow.offsetHeight + 10 : 44;
                let containerMaxHeight = Math.max(110, maxAvailableHeight - headerHeight - 24);

                let scrollContainers = sidePanel.querySelectorAll('.st-content-scroll-container');
                scrollContainers.forEach(el => {
                    el.style.maxHeight = containerMaxHeight + 'px';
                });
            }

            let standalone = document.getElementById('station-hud-panel');
            if (standalone && standalone.style.display === 'block') {
                let maxStandaloneHeight = Math.max(200, Math.floor(window.innerHeight - 30 - navBottom));
                standalone.style.maxHeight = maxStandaloneHeight + 'px';
                let sHeader = standalone.querySelector('.st-header-row');
                let sHeaderH = sHeader ? sHeader.offsetHeight + 10 : 44;
                let sScroll = standalone.querySelector('.st-content-scroll-container');
                if (sScroll) {
                    sScroll.style.maxHeight = Math.max(130, maxStandaloneHeight - sHeaderH - 24) + 'px';
                }
            }
        }

        window.addEventListener('resize', adjustStationPanelHeight);

        function switchStationTab(tabName) {
            currentStationTab = tabName;
            let rBtn = document.getElementById('st-tab-btn-resumen');
            let mBtn = document.getElementById('st-tab-btn-mejoras');
            let rPane = document.getElementById('st-tab-pane-resumen');
            let mPane = document.getElementById('st-tab-pane-mejoras');
            if (rBtn) rBtn.classList.toggle('active', tabName === 'resumen');
            if (mBtn) mBtn.classList.toggle('active', tabName === 'mejoras');
            if (rPane) rPane.classList.toggle('active', tabName === 'resumen');
            if (mPane) mPane.classList.toggle('active', tabName === 'mejoras');
            adjustStationPanelHeight();
        }

        function buildStationMenuHTML(st, isLateral = false) {
            let iconEmoji = st.type === 'metro' ? 'ðŸš‡' : 'ðŸšŒ';
            let lineTag = st.lines.length > 0 
                ? st.lines.map(lId => {
                    let line = transportLines[st.type].find(x => x.id === lId);
                    return line ? line.name : '';
                }).filter(Boolean).join(', ')
                : tr('stIsolated');

            let attractionVal = getStationAttraction(st);
            let monthlyRev = Math.floor(st.revenueThisMonth || 0);

            let searchIconSVG = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
                    <circle cx="10" cy="10" r="7"></circle>
                    <path d="M15.5 15.5L21 21" stroke-width="3.5"></path>
                </svg>
            `;

            let expLabel = tr('stExpCommon');
            if (st.expressType === 'red') expLabel = tr('stExpRed');
            else if (st.expressType === 'green') expLabel = tr('stExpGreen');

            let turnstileActive = !!st.hasTurnstiles;
            let elevatorActive = !!st.hasElevator;
            let currentCap = st.maxCapacity || (100 + ((st.level || 1) - 1) * 50);
            let nextPlatformCost = (st.level || 1) >= 5 ? 0 : (st.level || 1) * 3500000;

            let pidsBoxHtml = st.type === 'metro' ? `
                <div id="station-pids-box-${st.id}" class="station-pids-wrapper">
                    ${renderStationPidsHTML(st)}
                </div>
            ` : '';

            let upgradesHtml = `
                <div class="st-upgrades-section-title">
                    <span>ðŸ› ï¸ ${currentLang === 'es' ? 'Mejoras y AmpliaciÃ³n de EstaciÃ³n' : 'Station Upgrades & Expansion'}</span>
                </div>
                <div class="st-upgrades-grid-v2">
                    <div class="st-upg-card intermodal-upgrade-card ${st.isIntermodal ? 'active-bought' : ''}" onclick="hudUpgradeIntermodal('${st.id}')">
                        <div class="st-upg-icon">Ã°Å¸ÂÂ¢</div>
                        <div class="st-upg-info">
                            <div class="st-upg-name">
                                ${currentLang === 'es' ? 'Transformar a EstaciÃƒÂ³n Intermodal' : 'Upgrade to Intermodal Hub'}
                                ${st.isIntermodal ? '<span class="st-upg-lvl" style="color:var(--accent);">Ã¢Å“â€œ Bimodal</span>' : ''}
                            </div>
                            <div class="st-upg-desc">
                                ${currentLang === 'es' 
                                    ? 'Habilita conexiÃƒÂ³n de andenes subterrÃƒÂ¡neos y terminal de micros. +250 Capacidad, transbordo bimodal masivo. Ã¢Å¡Â Ã¯Â¸Â Mayor costo de mantenimiento diario (-.000/dÃƒÂ­a).' 
                                    : 'Integrates Subway platforms and Bus terminal. +250 Capacity, bimodal transfers. Ã¢Å¡Â Ã¯Â¸Â Higher daily maintenance fee (-,000/day).'}
                            </div>
                            <div class="st-upg-cost" style="color:${st.isIntermodal ? 'var(--info-pastel)' : 'var(--accent)'}; font-weight:bold;">
                                ${st.isIntermodal ? (currentLang === 'es' ? 'Ã¢Å“â€œ Operando como Intermodal' : 'Ã¢Å“â€œ Active Intermodal') : '.0M'}
                            </div>
                        </div>
                    </div>
                    <div class="st-upg-card ${(st.level || 1) >= 5 ? 'maxed' : ''}" onclick="hudUpgradePlatformSize('${st.id}')">
                        <div class="st-upg-icon">ðŸ“</div>
                        <div class="st-upg-info">
                            <div class="st-upg-name">${currentLang === 'es' ? 'AndÃ©n Extendido' : 'Platform Extension'} <span class="st-upg-lvl">Lv.${st.level || 1}/5</span></div>
                            <div class="st-upg-desc">${currentLang === 'es' ? `Capacidad: ${currentCap} pax (+50)` : `Capacity: ${currentCap} pax (+50)`}</div>
                            <div class="st-upg-cost">${(st.level || 1) >= 5 ? (currentLang === 'es' ? 'âœ“ Nivel MÃ¡ximo' : 'âœ“ Max Level') : `$${(nextPlatformCost/1000000).toFixed(1)}M`}</div>
                        </div>
                    </div>

                    <div class="st-upg-card ${turnstileActive ? 'active-bought' : ''}" onclick="hudUpgradeTurnstiles('${st.id}')">
                        <div class="st-upg-icon">âš¡</div>
                        <div class="st-upg-info">
                            <div class="st-upg-name">${currentLang === 'es' ? 'Torniquetes RÃ¡pidos' : 'High-Speed Gates'}</div>
                            <div class="st-upg-desc">${currentLang === 'es' ? '+20% flujo entrada' : '+20% entry intake'}</div>
                            <div class="st-upg-cost">${turnstileActive ? (currentLang === 'es' ? 'âœ“ Instalado' : 'âœ“ Installed') : '$4.0M'}</div>
                        </div>
                    </div>

                    <div class="st-upg-card ${elevatorActive ? 'active-bought' : ''}" onclick="hudUpgradeElevator('${st.id}')">
                        <div class="st-upg-icon">ðŸ›—</div>
                        <div class="st-upg-info">
                            <div class="st-upg-name">${currentLang === 'es' ? 'Ascensor Accesible' : 'Universal Elevator'}</div>
                            <div class="st-upg-desc">${currentLang === 'es' ? '+25% atracciÃ³n â€¢ +4% felicidad' : '+25% attraction â€¢ +4% happiness'}</div>
                            <div class="st-upg-cost">${elevatorActive ? (currentLang === 'es' ? 'âœ“ Habilitado' : 'âœ“ Enabled') : '$5.0M'}</div>
                        </div>
                    </div>

                    <div class="st-upg-card ${st.revMultiplier > 1 ? 'active-bought' : ''}" onclick="hudUpgradeRevenue('${st.id}')">
                        <div class="st-upg-icon">ðŸª</div>
                        <div class="st-upg-info">
                            <div class="st-upg-name">${currentLang === 'es' ? 'Locales Comerciales' : 'Retail Stores'}</div>
                            <div class="st-upg-desc">${currentLang === 'es' ? '+25% recaudaciÃ³n por boleto' : '+25% fare revenue'}</div>
                            <div class="st-upg-cost">${st.revMultiplier > 1 ? (currentLang === 'es' ? 'âœ“ Activo' : 'âœ“ Active') : '$4.0M'}</div>
                        </div>
                    </div>

                    <div class="st-upg-card ${st.attrMultiplier > 1 ? 'active-bought' : ''}" onclick="hudUpgradeAttraction('${st.id}')">
                        <div class="st-upg-icon">ðŸ“¢</div>
                        <div class="st-upg-info">
                            <div class="st-upg-name">${currentLang === 'es' ? 'CampaÃ±a AtracciÃ³n' : 'Marketing Campaign'}</div>
                            <div class="st-upg-desc">${currentLang === 'es' ? '+50% atracciÃ³n de zona' : '+50% zone ridership'}</div>
                            <div class="st-upg-cost">${st.attrMultiplier > 1 ? (currentLang === 'es' ? 'âœ“ Activo' : 'âœ“ Active') : '$2.5M'}</div>
                        </div>
                    </div>
                </div>
            `;

            let isResumen = (currentStationTab === 'resumen');
            let isMejoras = (currentStationTab === 'mejoras');

            let tabButtonsHtml = `
                <div class="st-tabs-rail">
                    <button id="st-tab-btn-resumen" class="st-tab-btn ${isResumen ? 'active' : ''}" onclick="switchStationTab('resumen')" title="${currentLang === 'es' ? 'Resumen general de estaciÃ³n' : 'Station Overview'}">
                        ðŸ“‹ <span>${currentLang === 'es' ? 'Resumen' : 'Overview'}</span>
                    </button>
                    <button id="st-tab-btn-mejoras" class="st-tab-btn ${isMejoras ? 'active' : ''}" onclick="switchStationTab('mejoras')" title="${currentLang === 'es' ? 'Mejoras y ampliaciÃ³n' : 'Upgrades'}">
                        ðŸ› ï¸ <span>${currentLang === 'es' ? 'Mejoras' : 'Upgrades'}</span>
                    </button>
                </div>
            `;

            return `
                ${tabButtonsHtml}
                ${st.isIntermodal ? `<div class="intermodal-banner">🏢 ${currentLang === "es" ? "NODO INTERMODAL ACTIVO (METRO + BUS)" : "ACTIVE INTERMODAL HUB (METRO + BUS)"}</div>` : ""}


                <div class="st-header-row">
                    <span class="st-name-tag" onclick="hudEditStationName('${st.id}')" title="Click to rename">
                        ${iconEmoji} ${st.name} âœï¸
                    </span>
                    <div style="display:flex; gap:4px; align-items:center;">
                        <button class="st-btn-icon" onclick="panToStation('${st.id}');" title="Center camera">${searchIconSVG}</button>
                        <button class="st-btn-icon" onclick="${isLateral ? 'closeSidePanel()' : 'closeStationHUD()'}" title="Close">âœ–</button>
                    </div>
                </div>

                <div class="st-content-scroll-container">
                    <!-- PANE 1: RESUMEN -->
                    <div id="st-tab-pane-resumen" class="st-tab-pane ${isResumen ? 'active' : ''}">
                        <div class="st-stats-row">
                            <div class="st-stat-box">
                                <span class="st-stat-label">${tr('stLevel')}</span>
                                <span class="st-stat-val">${st.level || 1}</span>
                            </div>
                            <div class="st-stat-box">
                                <span class="st-stat-label">${tr('stLines')}</span>
                                <span class="st-stat-val" style="color:var(--accent);">${lineTag}</span>
                            </div>
                            <div class="st-stat-box">
                                <span class="st-stat-label">${tr('stDensity')}</span>
                                <span class="st-stat-val" style="color:#ffb300;">${st.densityScore || 100} <span style="font-size:0.6rem; color:#888;">h/ha</span></span>
                            </div>
                            <div class="st-stat-box">
                                <span class="st-stat-label">${tr('stAttraction')}</span>
                                <span class="st-stat-val">${attractionVal} <span style="font-size:0.65rem; color:#888;">/200</span></span>
                            </div>
                        </div>

                        ${pidsBoxHtml}
                        ${st.isIntermodal ? `<div class="intermodal-maint-alert"><b>⚠️ ${currentLang === "es" ? "Costo Operacional Elevado" : "High Operational Cost"}:</b> -$${(st.intermodalDailyMaint || 450000).toLocaleString()}/día (${currentLang === "es" ? "Terminales y andenes bimodales" : "Bimodal terminals and concourses"})</div>` : ""}






                        <div class="st-mid-grid">
                            <div class="st-actions-col">
                                <button class="st-btn-action" onclick="hudActionConnect('${st.id}')">${tr('stBtnConnect')}</button>
                                <button class="st-btn-action" onclick="hudActionMove('${st.id}')">${tr('stBtnMove')}</button>
                                <button class="st-btn-action danger" onclick="hudActionDemolish('${st.id}')">${tr('stBtnDemolish')}</button>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:5px;">
                                ${st.type === 'metro' ? `
                                    <button class="st-btn-action" onclick="hudActionToggleCurves('${st.id}')">${tr('stBtnCurves')}</button>
                                    <button class="st-btn-action" onclick="cycleStationExpressType('${st.id}')" title="Toggle Express Mode">${expLabel}</button>
                                ` : ''}
                                <div class="st-revenue-box" style="${st.type === 'bus' ? 'flex:1; justify-content:center;' : ''}">
                                    <span class="st-stat-label">${tr('stMonthProfit')}</span>
                                    <span style="font-size:1.05rem; font-weight:900; color:var(--success-pastel); margin-top:3px;">
                                        +$${monthlyRev.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PANE 2: MEJORAS -->
                    <div id="st-tab-pane-mejoras" class="st-tab-pane ${isMejoras ? 'active' : ''}">
                        ${upgradesHtml}
                    </div>
                </div>
            `;
        }

        function cycleStationExpressType(stId) {
            let st = allStations.find(s => s.id === stId);
            if (!st || st.type !== 'metro') return;

            if (!st.expressType || st.expressType === 'common') st.expressType = 'red';
            else if (st.expressType === 'red') st.expressType = 'green';
            else st.expressType = 'common';

            updateStationBadge(st);
            if (currentSidePanelType === 'station') openSideStationPanel(st);
            let standalone = document.getElementById('station-hud-panel');
            if (standalone && standalone.style.display === 'block') openStandaloneStationPanel(st);
            if (activeLineId) renderLineDetailContent();

            let typeName = st.expressType === 'red' ? 'Red Route Stop (ðŸ”´)' : (st.expressType === 'green' ? 'Green Route Stop (ðŸŸ¢)' : 'Common Stop (âšª)');
            showStatusToast(`ðŸš‡ ${st.name} configured as ${typeName}.`);
        }

        function openSideStationPanel(st) {
            if (currentSelectedStation && currentSelectedStation.id !== st.id) {
                currentStationTab = 'resumen';
            }
            currentSidePanelType = 'station';
            currentSelectedStation = st;

            let sidePanel = document.getElementById('thud-side-panel');
            let contentEl = document.getElementById('side-panel-content');
            let btn = document.getElementById('btn-line-upgrade-wide');
            let arrow = document.getElementById('upgrade-arrow-icon');

            if (btn) btn.classList.remove('active');
            if (arrow) arrow.innerText = 'â–¼';

            contentEl.innerHTML = buildStationMenuHTML(st, true);
            sidePanel.classList.add('active');
            if (typeof L !== 'undefined' && L.DomEvent) {
                L.DomEvent.disableScrollPropagation(sidePanel);
            }
            adjustStationPanelHeight();
        }

        function openStandaloneStationPanel(st) {
            if (currentSelectedStation && currentSelectedStation.id !== st.id) {
                currentStationTab = 'resumen';
            }
            currentSelectedStation = st;
            closeSidePanel();

            let panel = document.getElementById('station-hud-panel');
            let container = document.getElementById('station-standalone-content');
            container.innerHTML = buildStationMenuHTML(st, false);
            panel.style.display = 'block';
            if (typeof L !== 'undefined' && L.DomEvent) {
                L.DomEvent.disableScrollPropagation(panel);
            }
            adjustStationPanelHeight();
        }

        function closeSidePanel() {
            currentSidePanelType = null;
            let sidePanel = document.getElementById('thud-side-panel');
            let btn = document.getElementById('btn-line-upgrade-wide');
            let arrow = document.getElementById('upgrade-arrow-icon');

            if (sidePanel) sidePanel.classList.remove('active');
            if (btn) btn.classList.remove('active');
            if (arrow) arrow.innerText = 'â–¼';
        }

        function closeStationHUD() {
            let panel = document.getElementById('station-hud-panel');
            if (panel) panel.style.display = 'none';
        }

        function closeStationPopup() {
            if (currentStationPopup) {
                try {
                    currentStationPopup.remove();
                } catch(e) {}
                currentStationPopup = null;
            }
            if (map) {
                try {
                    map.closePopup();
                } catch(e) {}
            }
        }

        function popupActionConnect(stId) {
            closeStationPopup();
            hudActionConnect(stId);
        }

        function popupActionRename(stId) {
            hudEditStationName(stId);
        }

        function popupActionMove(stId) {
            closeStationPopup();
            hudActionMove(stId);
        }

        function popupActionDemolish(stId) {
            closeStationPopup();
            hudActionDemolish(stId);
        }

        function popupActionFullView(stId) {
            closeStationPopup();
            openFullStationView(stId);
        }

        function openFullStationView(stId) {
            let st = allStations.find(s => s.id === stId);
            if (!st) return;
            closeStationPopup();

            if (st.lines && st.lines.length > 0) {
                let targetLineId = st.lines[0];
                openTransportPanel(st.type);
                selectLineAndOpenDetail(targetLineId);
                openSideStationPanel(st);
            } else {
                closeTransportHUD();
                openStandaloneStationPanel(st);
            }
        }


        function updateStationBadge(st) {
            let badgeEl = document.getElementById(`badge-${st.id}`);
            let dotEl = document.getElementById(`dot-${st.id}`);
            if (!badgeEl) return;

            let html = '';

            if (st.lines.length === 0) {
                let total = Object.values(st.passengersByLine).reduce((a,b)=>a+b, 0);
                badgeEl.innerHTML = `ðŸ‘¤ ${total}`;
                return;
            }

            if (st.lines.length === 1) {
                let singleLineId = st.lines[0];
                let l = transportLines[st.type].find(x => x.id === singleLineId);
                let lineCount = (st.passengersByLine[singleLineId] || 0) + (st.passengersByLine['default'] || 0);
                st.passengersByLine[singleLineId] = lineCount;
                delete st.passengersByLine['default'];

                if (l) {
                    html = `<div class="line-badge-pill" style="background:${l.color};"><span>${lineCount}</span></div>`;
                }
            } else {
                if (st.lines.length >= 2) {
                    html += `<div class="line-badge-pill combo-hub-pill" title="${currentLang === 'es' ? 'CombinaciÃ³n MultilÃ­nea' : 'Interchange Hub'}"><span>ðŸ”„</span></div>`;
                }
                st.lines.forEach(lId => {
                    let l = transportLines[st.type].find(x => x.id === lId);
                    if (l) {
                        let count = st.passengersByLine[lId] || 0;
                        html += `<div class="line-badge-pill" style="background:${l.color};"><span>${count}</span></div>`;
                    }
                });

                let unassigned = st.passengersByLine['default'] || 0;
                if (unassigned > 0) {
                    let perLine = Math.floor(unassigned / st.lines.length);
                    st.lines.forEach(lId => {
                        st.passengersByLine[lId] = (st.passengersByLine[lId] || 0) + perLine;
                    });
                    delete st.passengersByLine['default'];
                    return updateStationBadge(st);
                }
            }


            if (st.isIntermodal) { html = `<div class="line-badge-pill intermodal-badge-pill" title="${currentLang === "es" ? "Estación Intermodal (Metro + Bus)" : "Intermodal Hub (Metro + Bus)"}"><span>🏢 INTERMODAL</span></div>` + html; }

            badgeEl.innerHTML = html;

            if (dotEl) {
                dotEl.classList.toggle('combo-station', st.lines.length >= 2);
                dotEl.classList.toggle('red-stop', st.expressType === 'red');
                dotEl.classList.toggle('green-stop', st.expressType === 'green');
                dotEl.classList.toggle('intermodal-station-dot', !!st.isIntermodal);
            }
        }

        function handleStationClick(stObj) {
            if (currentMode === 'connecting') {
                if (connectSourceStation && connectSourceStation.id !== stObj.id) {
                    completeStationConnection(connectSourceStation, stObj, selectedLineForConnect);
                }
                return;
            }

            currentSelectedStation = stObj;
            let iconEmoji = stObj.type === 'metro' ? 'ðŸš‡' : 'ðŸšŒ';
            let totalPass = Object.values(stObj.passengersByLine || {}).reduce((a, b) => a + b, 0);

            let linesInfo = stObj.lines.length > 0
                ? stObj.lines.map(lId => {
                    let l = transportLines[stObj.type].find(x => x.id === lId);
                    return l ? `<span style="color:${l.color}; font-weight:bold;">â— ${l.name}</span>` : '';
                }).join(' ')
                : `<span style="color:#888;">(${tr('stIsolated')})</span>`;

            currentStationPopup = L.popup({
                autoClose: true,
                closeOnClick: true,
                closeButton: true,
                minWidth: 230,
                offset: [0, -16],
                className: 'custom-station-popup'
            })
            .setLatLng(stObj.latlng)
            .setContent(`
                <div style="text-align:center; padding:4px 18px 2px 4px;">
                    <div style="margin-bottom:4px;">
                        <b style="color:var(--accent); font-size:0.95rem;">${iconEmoji} ${stObj.name}</b>
                    </div>
                    <span style="font-size:0.75rem; color:#aaa;">Level ${stObj.level} â€¢ ${totalPass} pax waiting</span><br>
                    <div style="font-size:0.75rem; margin:4px 0;">${linesInfo}</div>
                    <hr style="border-color:#1f1f2a; margin:6px 0;">

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:6px;">
                        <button class="action-btn" style="padding:5px; font-size:0.72rem; margin:0;" onclick="popupActionConnect('${stObj.id}')">${tr('stBtnConnect')}</button>
                        <button class="action-btn" style="padding:5px; font-size:0.72rem; margin:0;" onclick="popupActionRename('${stObj.id}')">âœï¸ Rename</button>
                        <button class="action-btn" style="padding:5px; font-size:0.72rem; margin:0;" onclick="popupActionMove('${stObj.id}')">${tr('stBtnMove')}</button>
                        <button class="action-btn danger" style="padding:5px; font-size:0.72rem; margin:0;" onclick="popupActionDemolish('${stObj.id}')">${tr('stBtnDemolish')}</button>
                    </div>

                    <button class="action-btn" style="padding:6px; font-size:0.75rem; margin:0; background:rgba(255,204,0,0.15); color:var(--accent);" onclick="popupActionFullView('${stObj.id}')">${tr('stFullView')}</button>
                </div>
            `)
            .openOn(map);
        }


        function hudEditStationName(stId) {
            let targetSt = stId ? allStations.find(s => s.id === stId) : currentSelectedStation;
            if (!targetSt) return;
            currentSelectedStation = targetSt;
            let nuevoNombre = prompt(tr('stRenamePrompt'), targetSt.name);
            if (nuevoNombre && nuevoNombre.trim() !== "") {
                targetSt.name = nuevoNombre.trim();
                if (activeLineId) renderLineDetailContent();
                if (currentSidePanelType === 'station') openSideStationPanel(targetSt);
                let standalone = document.getElementById('station-hud-panel');
                if (standalone && standalone.style.display === 'block') openStandaloneStationPanel(targetSt);
                showStatusToast(tr('toastRenamed', {name: targetSt.name}), false, 'var(--success-pastel)');
            }
        }


        function hudActionConnect(stId) {
            let targetSt = stId ? allStations.find(s => s.id === stId) : currentSelectedStation;
            if (!targetSt) return;
            currentSelectedStation = targetSt;
            openLineSelectorModal(targetSt.id);
        }

        function hudActionMove(stId) {
            let targetSt = stId ? allStations.find(s => s.id === stId) : currentSelectedStation;
            if (!targetSt) return;
            currentSelectedStation = targetSt;
            startMoveStation(targetSt.id);
            closeStationHUD();
            closeSidePanel();
            closeStationPopup();
            showStatusToast("â†” Click on the map to relocate station.", false);
        }

        function hudActionDemolish(stId) {
            let targetSt = stId ? allStations.find(s => s.id === stId) : currentSelectedStation;
            if (!targetSt) return;
            currentSelectedStation = targetSt;
            let refundVal = Math.floor((targetSt.type === 'metro' ? 4500000 : 1200000) * 0.5);
            demolishStation(targetSt.id, refundVal);
            closeStationHUD();
            closeSidePanel();
            closeStationPopup();
            showStatusToast(tr('toastDemolished', {refund: refundVal.toLocaleString()}), false);
        }

        function getStationAttraction(st) {
            if (!st) return 50;
            let pointData = null;
            if (st.latlng) {
                pointData = (typeof getPointDensityAndAttraction === 'function') ? getPointDensityAndAttraction(st.latlng) : null;
                if (pointData) st.densityScore = pointData.density;
            } else if (st.densityScore) {
                pointData = { density: st.densityScore, attraction: Math.round(st.densityScore / 1.85) };
            }

            let dCenter = st.latlng ? st.latlng.distanceTo(L.latLng(-33.445, -70.655)) : 9999;
            let dLaPintana = st.latlng ? st.latlng.distanceTo(L.latLng(-33.585, -70.635)) : 9999;
            let baseAttr = pointData ? pointData.attraction : 50;
            if (!pointData) {
                if (dCenter < 2200 || dLaPintana < 1800) baseAttr = 160;
            }

            let multiplier = (st.attrMultiplier || 1.0);
            if (st.hasElevator) multiplier += 0.25;
            if (st.hasTurnstiles) multiplier += 0.20;
            if (st.level > 1) multiplier += (st.level - 1) * 0.08;
            return Math.min(200, Math.max(10, Math.round(baseAttr * multiplier)));
        }

        function hudUpgradePlatformSize(stId) {
            let targetSt = stId ? allStations.find(s => s.id === stId) : currentSelectedStation;
            if (!targetSt) return;
            currentSelectedStation = targetSt;
            targetSt.level = targetSt.level || 1;
            if (targetSt.level >= 5) {
                showStatusToast(currentLang === 'es' ? 'â„¹ï¸ AndÃ©n en nivel mÃ¡ximo (Lv.5)' : 'â„¹ï¸ Platform already at max level (Lv.5)', false, 'var(--accent)');
                return;
            }
            let cost = targetSt.level * 3500000;
            if (money < cost) {
                showStatusToast(currentLang === 'es' ? `âš ï¸ Fondos insuficientes ($${cost.toLocaleString()} requeridos).` : `âš ï¸ Insufficient funds ($${cost.toLocaleString()} required).`, false, 'var(--danger-pastel)');
                return;
            }
            money -= cost;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);
            targetSt.level += 1;
            targetSt.maxCapacity = 100 + ((targetSt.level - 1) * 50);

            playAudioMetroChime();
            updateStationBadge(targetSt);
            if (currentSidePanelType === 'station') openSideStationPanel(targetSt);
            let standalone = document.getElementById('station-hud-panel');
            if (standalone && standalone.style.display === 'block') openStandaloneStationPanel(targetSt);
            showStatusToast(currentLang === 'es' ? `â­ Â¡AndÃ©n ampliado a Nivel ${targetSt.level}! Capacidad: ${targetSt.maxCapacity} pax` : `â­ Platform extended to Level ${targetSt.level}! Capacity: ${targetSt.maxCapacity} pax`, false, 'var(--success-pastel)');
        }
        function hudUpgradeSize(stId) { hudUpgradePlatformSize(stId); }

        function hudUpgradeTurnstiles(stId) {
            let targetSt = stId ? allStations.find(s => s.id === stId) : currentSelectedStation;
            if (!targetSt) return;
            currentSelectedStation = targetSt;
            if (targetSt.hasTurnstiles) return;
            let cost = 4000000;
            if (money < cost) {
                showStatusToast(currentLang === 'es' ? 'âš ï¸ Fondos insuficientes ($4,000,000 requeridos).' : 'âš ï¸ Insufficient funds ($4,000,000 required).', false, 'var(--danger-pastel)');
                return;
            }
            money -= cost;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);
            targetSt.hasTurnstiles = true;
            targetSt.revMultiplier = Math.max(targetSt.revMultiplier || 1.0, 1.20);

            playAudioMetroChime();
            updateStationBadge(targetSt);
            if (currentSidePanelType === 'station') openSideStationPanel(targetSt);
            let standalone = document.getElementById('station-hud-panel');
            if (standalone && standalone.style.display === 'block') openStandaloneStationPanel(targetSt);
            showStatusToast(currentLang === 'es' ? 'âš¡ Â¡Torniquetes bidireccionales de alta velocidad instalados! +20% flujo de pasajeros.' : 'âš¡ High-speed bi-directional turnstiles installed! +20% passenger flow.', false, 'var(--success-pastel)');
        }

        function hudUpgradeElevator(stId) {
            let targetSt = stId ? allStations.find(s => s.id === stId) : currentSelectedStation;
            if (!targetSt) return;
            currentSelectedStation = targetSt;
            if (targetSt.hasElevator) return;
            let cost = 5000000;
            if (money < cost) {
                showStatusToast(currentLang === 'es' ? 'âš ï¸ Fondos insuficientes ($5,000,000 requeridos).' : 'âš ï¸ Insufficient funds ($5,000,000 required).', false, 'var(--danger-pastel)');
                return;
            }
            money -= cost;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);
            targetSt.hasElevator = true;
            citizenHappiness = Math.min(100, citizenHappiness + 4);

            playAudioMetroChime();
            updateStationBadge(targetSt);
            if (currentSidePanelType === 'station') openSideStationPanel(targetSt);
            let standalone = document.getElementById('station-hud-panel');
            if (standalone && standalone.style.display === 'block') openStandaloneStationPanel(targetSt);
            showStatusToast(currentLang === 'es' ? 'ðŸ›— Â¡Ascensores de accesibilidad universal habilitados! +25% atracciÃ³n y +4% felicidad.' : 'ðŸ›— Universal accessibility elevators installed! +25% attraction & +4% happiness.', false, 'var(--success-pastel)');
        }

        function hudUpgradeRevenue(stId) {
            let targetSt = stId ? allStations.find(s => s.id === stId) : currentSelectedStation;
            if (!targetSt || targetSt.revMultiplier > 1.25) return;
            currentSelectedStation = targetSt;
            let cost = 4000000;
            if (money < cost) { showStatusToast("âš ï¸ Insufficient funds ($4,000,000).", false, 'var(--danger-pastel)'); return; }
            money -= cost;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);
            targetSt.revMultiplier = (targetSt.revMultiplier || 1.0) + 0.25;
            playAudioMetroChime();
            if (currentSidePanelType === 'station') openSideStationPanel(targetSt);
            let standalone = document.getElementById('station-hud-panel');
            if (standalone && standalone.style.display === 'block') openStandaloneStationPanel(targetSt);
            showStatusToast(currentLang === 'es' ? "ðŸ’° Â¡Locales comerciales instalados! +25% recaudaciÃ³n por boleto." : "ðŸ’° Retail stores added! Increased fare revenue.", false, 'var(--success-pastel)');
        }

        function hudUpgradeAttraction(stId) {
            let targetSt = stId ? allStations.find(s => s.id === stId) : currentSelectedStation;
            if (!targetSt || targetSt.attrMultiplier > 1.4) return;
            currentSelectedStation = targetSt;
            let cost = 2500000;
            if (money < cost) { showStatusToast("âš ï¸ Insufficient funds ($2,500,000).", false, 'var(--danger-pastel)'); return; }
            money -= cost;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);
            targetSt.attrMultiplier = (targetSt.attrMultiplier || 1.0) * 1.5;
            playAudioMetroChime();
            if (currentSidePanelType === 'station') openSideStationPanel(targetSt);
            let standalone = document.getElementById('station-hud-panel');
            if (standalone && standalone.style.display === 'block') openStandaloneStationPanel(targetSt);
            showStatusToast(currentLang === 'es' ? "ðŸ“¢ Â¡CampaÃ±a de atracciÃ³n activa! +50% atracciÃ³n de la zona." : "ðŸ“¢ Marketing campaign active! +50% ridership attraction.", false, 'var(--success-pastel)');
        }


        function getStationPidsData(st) {
            if (!st || st.type !== 'metro' || !st.lines || st.lines.length === 0) return [];
            let pidsList = [];

            st.lines.forEach(lineId => {
                let net = transportLines.metro.find(x => x.id === lineId);
                if (!net || !net.stations || net.stations.length === 0) return;

                // Support all track coordinate properties used across versions
                let track = net.routeCoords || net.curvedTrackCoords || net.trackCoordinates || (net.polyline ? net.polyline.getLatLngs() : []);
                let dists = net.trackDists || net.segmentDistances || [];
                let totalD = net.totalDistance || 0;

                // Fallback calculate track metrics if not cached
                if ((totalD === 0 || dists.length === 0) && track && track.length >= 2) {
                    totalD = 0;
                    dists = [];
                    for (let i = 0; i < track.length - 1; i++) {
                        let segD = L.latLng(track[i]).distanceTo(L.latLng(track[i+1]));
                        dists.push(segD);
                        totalD += segD;
                    }
                }
                if (totalD === 0 || !track || track.length < 2) return;

                let stM = 0;
                let bestDist = Infinity;
                let accum = 0;
                for (let i = 0; i < track.length; i++) {
                    let pt = L.latLng(track[i]);
                    let d = pt.distanceTo(st.latlng);
                    if (d < bestDist) {
                        bestDist = d;
                        stM = accum;
                    }
                    if (i < dists.length) accum += dists[i];
                }

                let speedKmh = BASE_METRO_SPEED + (net.bonusSpeedKmh || 0);
                let speedMps = (speedKmh * 1000) / 3600;

                let activeTrains = (net.trainDataList || []).filter(t => t.state !== 'depot' && t.state !== 'waiting_dispatch');

                let oncomingTrain = null;
                let minEta = Infinity;

                activeTrains.forEach(t => {
                    let distToSt = Infinity;
                    if (t.dir === 1) {
                        if (t.meter <= stM) {
                            distToSt = stM - t.meter;
                        } else {
                            distToSt = (totalD - t.meter) + (totalD - stM);
                        }
                    } else {
                        if (t.meter >= stM) {
                            distToSt = t.meter - stM;
                        } else {
                            distToSt = t.meter + stM;
                        }
                    }

                    let etaSec = distToSt / speedMps;
                    if (t.state === 'stopped' && t.lastStoppedStationId === st.id) {
                        etaSec = 0;
                    }

                    if (etaSec < minEta) {
                        minEta = etaSec;
                        oncomingTrain = t;
                    }
                });

                let terminusName = '';
                if (oncomingTrain) {
                    let destSt = oncomingTrain.dir === 1 ? net.stations[net.stations.length - 1] : net.stations[0];
                    terminusName = destSt ? destSt.name : net.stations[net.stations.length - 1].name;
                } else {
                    terminusName = net.stations[net.stations.length - 1].name;
                }

                pidsList.push({
                    lineId: net.id,
                    lineName: net.name,
                    lineColor: net.color,
                    terminus: terminusName,
                    train: oncomingTrain,
                    etaSec: minEta,
                    expressActive: !!net.expressActive,
                    serviceType: oncomingTrain ? oncomingTrain.serviceType : 'common'
                });
            });

            return pidsList;
        }

        function renderStationPidsHTML(st) {
            if (!st || st.type !== 'metro') return '';
            let pids = getStationPidsData(st);
            let maxCap = st.maxCapacity || (100 + ((st.level || 1) - 1) * 50);
            let curPax = Object.values(st.passengersByLine || {}).reduce((a, b) => a + b, 0);
            let occPct = Math.min(100, Math.round((curPax / maxCap) * 100));

            let meterColor = occPct > 80 ? 'var(--danger-pastel)' : (occPct > 50 ? 'var(--accent)' : 'var(--success-pastel)');

            let rowsHtml = '';
            if (pids.length === 0) {
                rowsHtml = `<div class="pids-no-trains">${currentLang === 'es' ? 'Sin lÃ­neas de metro asignadas' : 'No metro lines connected'}</div>`;
            } else {
                pids.forEach(p => {
                    let etaText = '';
                    let isAtPlatform = false;
                    if (p.etaSec === Infinity || !p.train) {
                        etaText = currentLang === 'es' ? '--:-- min' : '--:-- min';
                    } else if (p.etaSec <= 5 && p.train.state === 'stopped') {
                        etaText = currentLang === 'es' ? 'EN ANDÃ‰N' : 'AT PLATFORM';
                        isAtPlatform = true;
                    } else if (p.etaSec <= 25) {
                        etaText = currentLang === 'es' ? 'ARRIBANDO' : 'ARRIVING';
                    } else {
                        let m = Math.floor(p.etaSec / 60);
                        let s = Math.floor(p.etaSec % 60);
                        etaText = `${m}:${s < 10 ? '0' : ''}${s} min`;
                    }

                    let badgeRouteHtml = '';
                    if (p.expressActive) {
                        if (p.serviceType === 'red') badgeRouteHtml = `<span class="pids-route-pill red">${currentLang === 'es' ? 'ðŸ”´ Ruta Roja' : 'ðŸ”´ Red Route'}</span>`;
                        else if (p.serviceType === 'green') badgeRouteHtml = `<span class="pids-route-pill green">${currentLang === 'es' ? 'ðŸŸ¢ Ruta Verde' : 'ðŸŸ¢ Green Route'}</span>`;
                        else badgeRouteHtml = `<span class="pids-route-pill common">${currentLang === 'es' ? 'ðŸ”´ðŸŸ¢ ComÃºn' : 'ðŸ”´ðŸŸ¢ Common'}</span>`;
                    }

                    rowsHtml += `
                        <div class="pids-line-row">
                            <div class="pids-left-info">
                                <span class="pids-line-tag" style="background:${p.lineColor};">${p.lineName}</span>
                                <span class="pids-dest-text">âž” ${p.terminus}</span>
                                ${badgeRouteHtml}
                            </div>
                            <div class="pids-right-eta ${isAtPlatform ? 'at-platform' : ''}">
                                ${etaText}
                            </div>
                        </div>
                    `;
                });
            }

            let isInterchange = st.lines && st.lines.length >= 2;
            let comboBanner = isInterchange ? `
                <div class="pids-interchange-banner">
                    <span class="pids-combo-icon">ðŸ”„</span>
                    <span>${currentLang === 'es' ? 'EstaciÃ³n Intermodal de CombinaciÃ³n MultilÃ­nea' : 'Multi-Line Metro Transfer Hub'}</span>
                </div>
            ` : '';

            let clockStr = document.getElementById('ui-clock-time') ? document.getElementById('ui-clock-time').innerText : '12:00';

            return `
                ${comboBanner}
                <div class="pids-display-frame">
                    <div class="pids-top-bar">
                        <div class="pids-live-led"><span class="pids-led-dot"></span> PIDS DIGITAL</div>
                        <div class="pids-sys-title">${currentLang === 'es' ? 'PRÃ“XIMO TREN' : 'NEXT TRAIN'}</div>
                        <div class="pids-clock-text">${clockStr}</div>
                    </div>
                    <div class="pids-lines-container">
                        ${rowsHtml}
                    </div>
                    <div class="pids-occupancy-section">
                        <div class="pids-occ-label">
                            <span>${currentLang === 'es' ? 'OcupaciÃ³n AndÃ©n:' : 'Platform Load:'} <b style="color:${meterColor};">${curPax} / ${maxCap} pax (${occPct}%)</b></span>
                            <span style="font-size:0.7rem; color:#aaa;">${occPct >= 85 ? (currentLang === 'es' ? 'âš ï¸ Alta Demanda' : 'âš ï¸ Overcrowded') : (currentLang === 'es' ? 'âœ“ Flujo Normal' : 'âœ“ Normal Flow')}</span>
                        </div>
                        <div class="pids-occ-bar-track">
                            <div class="pids-occ-bar-fill" style="width:${occPct}%; background:${meterColor};"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        function updateActiveStationPids(st) {
            if (!st || st.type !== 'metro') return;
            let box = document.getElementById(`station-pids-box-${st.id}`);
            if (box) {
                box.innerHTML = renderStationPidsHTML(st);
            }
        }



/* ==============================================================
   MAP INTERACTION, STATION PLACEMENT & GHOST PREVIEW
   ============================================================== */

let ghostMarker = L.circleMarker([0, 0], {
    radius: 9,
    color: 'var(--accent)',
    weight: 2,
    opacity: 0,
    fillOpacity: 0,
    interactive: false
}).addTo(map);

let ghostLine = L.polyline([], {
    color: '#fff',
    weight: 4,
    dashArray: '10, 10',
    opacity: 0,
    interactive: false
}).addTo(map);

function getSnappedStation(latlng, snapDist = 45) {
    let closest = null;
    let minDist = snapDist;
    allStations.forEach(st => {
        let d = latlng.distanceTo(st.latlng);
        if (d < minDist) {
            minDist = d;
            closest = st;
        }
    });
    return closest;
}

map.on('mousemove', (e) => {
    if (typeof isGamePaused !== 'undefined' && isGamePaused) return;
    if (currentMode !== 'build' && currentMode !== 'edit_station' && currentMode !== 'connecting') return;

    let snappedSt = (currentMode === 'connecting') ? getSnappedStation(e.latlng) : null;
    let targetLatLng = snappedSt ? snappedSt.latlng : e.latlng;

    ghostMarker.setLatLng(targetLatLng);
    ghostMarker.setStyle({ color: 'var(--accent)', opacity: 0.8, fillOpacity: 0.4 });

    if (currentMode === 'connecting' && connectSourceStation && selectedLineForConnect) {
        ghostLine.setLatLngs([connectSourceStation.latlng, targetLatLng]);
        ghostLine.setStyle({ color: selectedLineForConnect.color, opacity: 0.8 });
    } else {
        ghostLine.setStyle({ opacity: 0 });
    }
});

map.on('click', async (e) => {
    if (typeof isGamePaused !== 'undefined' && isGamePaused) return;

    if (e.originalEvent && e.originalEvent._stationHandled) {
        return;
    }

    if (currentMode === 'connecting') {
        let clickedStation = getSnappedStation(e.latlng);
        if (clickedStation && connectSourceStation && clickedStation.id !== connectSourceStation.id) {
            completeStationConnection(connectSourceStation, clickedStation, selectedLineForConnect);
        } else {
            cancelBuild();
        }
        return;
    }

    if (currentMode === 'idle') {
        closeStationPopup();
        if (typeof curveHandlesLayer !== 'undefined') curveHandlesLayer.clearLayers();

        // If Road Hierarchy & Demand Filter is active, click inspects street/zone density
        if (typeof isDensityFilterActive !== 'undefined' && isDensityFilterActive) {
            if (typeof isPointInActiveZone === 'function' && isPointInActiveZone(e.latlng)) {
                inspectDensityPoint(e.latlng);
                return;
            }
        }

        if (typeof isPointInActiveZone === 'function' && !isPointInActiveZone(e.latlng) && currentLevel < 10) {
            if (typeof handleBlockedZoneClick === 'function') handleBlockedZoneClick(e);
        }
        return;
    }

    let targetLatLng = e.latlng;

    if (typeof isPointInActiveZone === 'function' && !isPointInActiveZone(targetLatLng)) {
        let nextLvl = ZONES[currentLevel];
        showStatusToast(
            `âš ï¸ <b>${tr('blockedTitle')}</b> â€” ${tr('blockedNext', {name: nextLvl ? nextLvl.name : ''})}`,
            false,
            'var(--danger-pastel)'
        );
        return;
    }

    if (currentMode === 'edit_station') {
        if (!stationToEditObj) { cancelBuild(); return; }
        stationToEditObj.latlng = targetLatLng;
        stationToEditObj.marker.setLatLng(targetLatLng);
        let pData = (typeof getPointDensityAndAttraction === 'function') ? getPointDensityAndAttraction(targetLatLng) : null;
        stationToEditObj.densityScore = pData ? pData.density : Math.max(5, 100 - (targetLatLng.distanceTo(SANTIAGO_CENTER) / 150)); 

        await rebuildLinesPolylines();
        cancelBuild();
        showStatusToast("âœ“ EstaciÃ³n reubicada.", false, 'var(--success-pastel)');
        return;
    }

    if (currentMode === 'build') {
        // Minimum distance check between metro stations ("asi no se puede colocar otra al lado")
        if (activeTransportType === 'metro') {
            let nearbyMetro = allStations.find(s => s.type === 'metro' && targetLatLng.distanceTo(s.latlng) < 280);
            if (nearbyMetro) {
                showStatusToast(
                    currentLang === 'es'
                        ? `âš ï¸ Ãrea ya cubierta por ${nearbyMetro.name}. Distancia mÃ­nima de 280m entre estaciones requerida para evitar canibalizar demanda.`
                        : `âš ï¸ Area already covered by ${nearbyMetro.name}. Stations must be at least 280m apart to avoid demand cannibalization.`,
                    false,
                    'var(--danger-pastel)'
                );
                return;
            }
        }

        let cost = activeTransportType === 'metro' ? 4500000 : 1200000;
        if (money < cost) {
            showStatusToast(`âš ï¸ Fondos insuficientes ($${cost.toLocaleString()} requeridos).`, false, 'var(--danger-pastel)');
            return;
        }

        money -= cost;
        updateMoneyDisplay();

        let stId = 'st_' + Date.now();
        let defaultName = (activeTransportType === 'metro' ? 'EstaciÃ³n ' : 'Parada ') + (allStations.length + 1);

        let stationIcon = L.divIcon({
            className: 'station-composite-wrapper',
            html: `
                <div class="station-badge-group" id="badge-${stId}">ðŸ‘¤ 0</div>
                <div class="station-white-dot" id="dot-${stId}"></div>
            `,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
        });

        let marker = L.marker(targetLatLng, {
            icon: stationIcon,
            interactive: true,
            zIndexOffset: 2500
        }).addTo(map);

        let newStation = {
            id: stId,
            name: defaultName,
            type: activeTransportType,
            latlng: targetLatLng,
            marker: marker,
            passengersByLine: {},
            level: 1,
            revMultiplier: 1.0,
            attrMultiplier: 1.0,
            revenueThisMonth: 0,
            expressType: 'common',
            lines: [],
            densityScore: ((typeof getPointDensityAndAttraction === 'function') ? getPointDensityAndAttraction(targetLatLng).density : Math.max(5, 100 - (targetLatLng.distanceTo(SANTIAGO_CENTER) / 150)))
        };

        marker.on('click', (ev) => {
            if (ev && ev.originalEvent) {
                ev.originalEvent._stationHandled = true;
                L.DomEvent.stopPropagation(ev.originalEvent);
            }
            handleStationClick(newStation);
        });

        allStations.push(newStation);
        if (typeof isDensityFilterActive !== 'undefined' && isDensityFilterActive && typeof renderDensityMapFilter === 'function') {
            renderDensityMapFilter();
        }
        cancelBuild();
        if (typeof checkLevelProgression === 'function') checkLevelProgression();
        showStatusToast(`âœ“ EstaciÃ³n construida con Ã©xito. Haz clic en ella para conectarla a una lÃ­nea.`, false, 'var(--success-pastel)');
    }
});
