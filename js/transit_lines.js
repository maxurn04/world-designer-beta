/* ==============================================================
   TRANSIT LINES, FLEET, ROUTING & SCHEMATIC MAP
   ============================================================== */

const transportLines = { metro: [], bus: [] };
let activeTransportType = 'metro';
let activeLineId = null;
let currentMode = 'idle'; 
let connectSourceStation = null;
let selectedLineForConnect = null;

const BASE_METRO_SPEED = 94.88;
const BASE_BUS_SPEED = 60.5;

        function openTransportPanel(type) {
            cancelBuild();
            closeStationHUD();
            closeSidePanel();

            activeTransportType = type;
            activeLineId = null;

            let panel = document.getElementById('transport-hud-panel');
            panel.style.display = 'block';

            document.getElementById('transport-hud-title').innerText = type === 'metro' ? tr('thudSubwayTitle') : tr('thudBusTitle');
            document.getElementById('thud-bus-extra-fields').style.display = type === 'bus' ? 'block' : 'none';
            document.getElementById('thud-new-name').placeholder = type === 'metro' ? 'E.g.: Line 1' : 'E.g.: Route 210';

            backToLinesList();
            renderTransportHUDTable();
        }

        function closeTransportHUD() {
            document.getElementById('transport-hud-panel').style.display = 'none';
            closeSidePanel();
            cancelBuild();
        }

        function switchTransportTab(tab) {
            document.querySelectorAll('#thud-general-container .hud-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#thud-general-container .hud-content').forEach(c => c.classList.remove('active'));

            let btn = document.getElementById(`thud-tab-btn-${tab}`); if (btn) btn.classList.add('active');
            let content = document.getElementById(`thud-tab-${tab}`); if (content) content.classList.add('active');
        }

        function renderTransportHUDTable() {
            let tbody = document.getElementById('transport-hud-table');
            let lines = transportLines[activeTransportType];
            let buildBtn = document.getElementById('thud-btn-build-general');

            if (lines.length === 0) {
                tbody.innerHTML = `<tr><td style='color:#777; text-align:center;'>${tr('thudNoLines')}</td></tr>`;
            } else {
                tbody.innerHTML = lines.map(l => `
                    <tr class="line-row ${l.id === activeLineId ? 'active' : ''}" onclick="selectLineAndOpenDetail('${l.id}')">
                        <td><span class="color-dot" style="background:${l.color};"></span> <b>${l.name}</b></td>
                        <td style="text-align:right; color:#888;">${l.stations.length} st. ❯</td>
                    </tr>
                `).join('');
            }

            buildBtn.style.display = 'block';
            buildBtn.innerText = activeTransportType === 'metro' ? tr('thudBuildSubway') : tr('thudBuildBus');
        }

        function getLineMaxFleet(l) {
            if (l.type === 'metro') {
                if (l.stations.length < 2) return 0;
                return Math.max(1, 1 + Math.floor((l.stations.length - 2) / 2));
            } else {
                if (l.stations.length < 2) return 0;
                return Math.max(2, l.stations.length * 2);
            }
        }

        function getNextFleetRequirement(l) {
            let currentMax = getLineMaxFleet(l);
            if (l.type === 'metro') {
                if (l.stations.length < 2) return 2;
                return (currentMax * 2) + 2;
            } else {
                return l.stations.length + 1;
            }
        }

        function selectLineAndOpenDetail(id) {
            activeLineId = id;
            closeSidePanel();
            document.getElementById('thud-general-container').style.display = 'none';
            document.getElementById('thud-line-detail-view').style.display = 'block';

            renderLineDetailContent();
        }

        function backToLinesList() {
            closeSidePanel();
            document.getElementById('thud-line-detail-view').style.display = 'none';
            document.getElementById('thud-general-container').style.display = 'block';
            switchTransportTab('lines');
            renderTransportHUDTable();
        }

        function getShortStationName(name) {
            if (!name) return "ST";
            let mNum = name.match(/^(?:Station|Estaci[oó]n|Stop|Parada)\s*(\d+)$/i);
            if (mNum) return `S${mNum[1]}`;
            let mWord = name.match(/^(?:Station|Estaci[oó]n|Stop|Parada)\s+(.+)$/i);
            if (mWord) {
                let rest = mWord[1].trim();
                return `S. ${rest.substring(0, 6)}${rest.length > 6 ? '.' : ''}`;
            }
            if (name.length > 9) return name.substring(0, 8) + '.';
            return name;
        }

        function toggleActiveLineExpress() {
            let l = transportLines[activeTransportType].find(x => x.id === activeLineId);
            if (!l || l.type !== 'metro') return;
            l.expressActive = !l.expressActive;
            renderLineDetailContent();
            showStatusToast(`🚇 Express service in ${l.name}: ${l.expressActive ? 'Activated for Rush Hour' : 'Deactivated'}`);
        }

        function renderLineDetailContent() {
            let l = transportLines[activeTransportType].find(x => x.id === activeLineId);
            if (!l) return;

            let titleEl = document.getElementById('ldetail-title');
            titleEl.innerText = l.name.toUpperCase();
            titleEl.style.color = l.color;

            let typeLabel = document.getElementById('ldetail-type-label');
            typeLabel.innerText = l.type === 'metro' ? tr('detailSubway') : tr('detailBus');

            let currentFleet = l.type === 'metro' 
                ? (l.trainDataList ? l.trainDataList.length : 0)
                : (l.busDataList ? l.busDataList.length : 0);
            let maxFleet = getLineMaxFleet(l);
            let nextReq = getNextFleetRequirement(l);

            document.getElementById('ldetail-fleet-count').innerText = `${currentFleet} / ${maxFleet}`;

            if (l.stations.length < 2) {
                document.getElementById('ldetail-unlock-text').innerText = tr('detailReqMin');
            } else {
                let unitName = l.type === 'metro' ? 'convoy' : 'bus';
                document.getElementById('ldetail-unlock-text').innerText = tr('detailUnlockReq', {req: nextReq, curr: l.stations.length});
            }

            let dailyAmount = l.dailyEarningsLast > 0 ? l.dailyEarningsLast : l.dailyEarningsCurrent;
            document.getElementById('ldetail-daily-val').innerText = `+$${Math.floor(dailyAmount).toLocaleString()}`;
            document.getElementById('ldetail-daily-sub').innerText = l.dailyEarningsLast > 0 
                ? tr('detailYesterday', {amt: Math.floor(l.dailyEarningsLast).toLocaleString()})
                : tr('detailToday', {amt: Math.floor(l.dailyEarningsCurrent).toLocaleString()});

            document.getElementById('ldetail-st-count').innerText = l.stations.length;

            let expBtn = document.getElementById('btn-line-express');
            if (l.type === 'metro') {
                expBtn.style.display = 'flex';
                expBtn.classList.toggle('active', !!l.expressActive);
                document.getElementById('lbl-express-status').innerHTML = l.expressActive 
                    ? `<span style="color:var(--danger-pastel)">${tr('expressActiveTag')}</span>`
                    : `<span>${tr('expressInactiveTag')}</span>`;
            } else {
                expBtn.style.display = 'none';
            }

            let nodesContainer = document.getElementById('schematic-nodes-container');

            if (l.stations.length === 0) {
                nodesContainer.innerHTML = `<div style="color:#666; font-size:0.75rem; text-align:center; padding:10px; width:100%;">${tr('schematicNoStationsConnected')}</div>`;
            } else {
                let nStations = l.stations.length;
                let circleSize = nStations > 8 ? 10 : (nStations > 5 ? 12 : 14);
                let labelFontSize = nStations > 8 ? '0.55rem' : (nStations > 5 ? '0.6rem' : '0.65rem');
                let paxFontSize = nStations > 8 ? '0.52rem' : (nStations > 5 ? '0.56rem' : '0.6rem');

                let html = '';
                l.stations.forEach((st, idx) => {
                    let shortName = getShortStationName(st.name);
                    let paxCount = Object.values(st.passengersByLine || {}).reduce((a, b) => a + b, 0);

                    let expClass = '';
                    if (st.expressType === 'red') expClass = 'red-route';
                    else if (st.expressType === 'green') expClass = 'green-route';

                    html += `
                        <div class="schematic-station-node" onclick="onSchematicStationClick('${st.id}')" title="${st.name}">
                            <span class="schematic-node-label" style="font-size:${labelFontSize};">${shortName}</span>
                            <div class="schematic-node-circle ${expClass}" style="width:${circleSize}px; height:${circleSize}px; border-color:${l.color};"></div>
                            <span class="schematic-node-pax" style="font-size:${paxFontSize};">👤 ${paxCount}</span>
                        </div>
                    `;

                    if (idx < l.stations.length - 1) {
                        html += `<div class="schematic-segment-bar" style="background-color:${l.color};"></div>`;
                    }
                });
                nodesContainer.innerHTML = html;
            }
            if (currentSidePanelType) adjustStationPanelHeight();
        }

        function onSchematicStationClick(stId) {
            let st = allStations.find(s => s.id === stId);
            if (!st) return;

            map.flyTo(st.latlng, 16, { duration: 0.8 });
            openSideStationPanel(st);
        }

        function modifyActiveLineFleet(delta) {
            if (!activeLineId) return;
            let l = transportLines[activeTransportType].find(x => x.id === activeLineId);
            if (!l) return;

            if (delta > 0) {
                let currentFleet = l.type === 'metro' 
                    ? (l.trainDataList ? l.trainDataList.length : 0)
                    : (l.busDataList ? l.busDataList.length : 0);
                let maxFleet = getLineMaxFleet(l);

                if (currentFleet >= maxFleet) {
                    let nextReq = getNextFleetRequirement(l);
                    showStatusToast(`⚠ Fleet limit reached (${currentFleet}/${maxFleet}). Build ${nextReq} stations to enable another vehicle.`, false, 'var(--danger-pastel)');
                    return;
                }
            }

            modifyFleet(activeTransportType, activeLineId, delta);
            renderLineDetailContent();
        }


        function toggleSideUpgradesPanel() {
            if (currentSidePanelType === 'upgrades') {
                closeSidePanel();
            } else {
                openSideUpgradesPanel();
            }
        }

        function openSideUpgradesPanel() {
            currentSidePanelType = 'upgrades';
            let l = transportLines[activeTransportType].find(x => x.id === activeLineId);
            if (!l) return;

            let sidePanel = document.getElementById('thud-side-panel');
            let contentEl = document.getElementById('side-panel-content');
            let btn = document.getElementById('btn-line-upgrade-wide');
            let arrow = document.getElementById('upgrade-arrow-icon');

            if (btn) btn.classList.add('active');
            if (arrow) arrow.innerText = '▲';

            let upgradesHtml = '';
            if (l.type === 'metro') {
                let currentBonusSpd = l.bonusSpeedKmh || 0;
                let currentBonusCap = l.bonusCapacity || 0;
                let trainCapTotal = (10 + currentBonusCap) * 3;

                upgradesHtml = `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222230; padding-bottom:6px; margin-bottom:10px;">
                        <span style="font-size:0.85rem; font-weight:900; color:var(--accent); letter-spacing:1px;">${tr('btnUpgrades')}</span>
                        <button class="st-btn-icon" onclick="closeSidePanel()">✖</button>
                    </div>

                    <div class="st-stat-box" style="margin-bottom:8px; padding:8px; text-align:left;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <span class="st-stat-label">${tr('upgSpeedSubway')}</span>
                            <span style="font-size:0.85rem; font-weight:bold; color:var(--accent);">+${currentBonusSpd} / +20 km/h</span>
                        </div>
                        <div style="font-size:0.68rem; color:#888; margin-bottom:6px;">${tr('upgSpeedSubwayDesc')}</div>
                        <button class="action-btn" onclick="buyLineSpeedUpgrade()" ${currentBonusSpd >= 20 ? 'disabled style="opacity:0.5;"' : ''}>
                            ${currentBonusSpd >= 20 ? tr('upgMaxLevel') : tr('upgBtnSpeedSubway')}
                        </button>
                    </div>

                    <div class="st-stat-box" style="padding:8px; text-align:left;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <span class="st-stat-label">${tr('upgCapSubway')}</span>
                            <span style="font-size:0.85rem; font-weight:bold; color:var(--accent);">${10 + currentBonusCap} / 15 Pax</span>
                        </div>
                        <div style="font-size:0.68rem; color:#888; margin-bottom:6px;">${tr('upgCapSubwayDesc', {total: trainCapTotal})}</div>
                        <button class="action-btn" onclick="buyLineCapacityUpgrade()" ${currentBonusCap >= 5 ? 'disabled style="opacity:0.5;"' : ''}>
                            ${currentBonusCap >= 5 ? tr('upgMaxLevel') : tr('upgBtnCapSubway')}
                        </button>
                    </div>
                `;
            } else {
                let currentSpdBonus = l.bonusSpeedKmh || 0;
                let currentBonusCap = l.bonusCapacity || 0;

                upgradesHtml = `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222230; padding-bottom:6px; margin-bottom:10px;">
                        <span style="font-size:0.85rem; font-weight:900; color:var(--accent); letter-spacing:1px;">${tr('btnUpgrades')}</span>
                        <button class="st-btn-icon" onclick="closeSidePanel()">✖</button>
                    </div>

                    <div class="st-stat-box" style="margin-bottom:8px; padding:8px; text-align:left;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <span class="st-stat-label">${tr('upgSpeedBus')}</span>
                            <span style="font-size:0.85rem; font-weight:bold; color:var(--accent);">${currentSpdBonus > 0 ? '+15 km/h' : 'Standard'}</span>
                        </div>
                        <div style="font-size:0.68rem; color:#888; margin-bottom:6px;">${tr('upgSpeedBusDesc')}</div>
                        <button class="action-btn" onclick="buyLineBusSpeedUpgrade()" ${currentSpdBonus > 0 ? 'disabled style="opacity:0.5;"' : ''}>
                            ${currentSpdBonus > 0 ? tr('upgMaxLevel') : tr('upgBtnSpeedBus')}
                        </button>
                    </div>

                    <div class="st-stat-box" style="padding:8px; text-align:left;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <span class="st-stat-label">${tr('upgCapBus')}</span>
                            <span style="font-size:0.85rem; font-weight:bold; color:var(--accent);">${15 + currentBonusCap} / 25 Pax</span>
                        </div>
                        <div style="font-size:0.68rem; color:#888; margin-bottom:6px;">${tr('upgCapBusDesc')}</div>
                        <button class="action-btn" onclick="buyLineBusCapacityUpgrade()" ${currentBonusCap >= 10 ? 'disabled style="opacity:0.5;"' : ''}>
                            ${currentBonusCap >= 10 ? tr('upgMaxLevel') : tr('upgBtnCapBus')}
                        </button>
                    </div>
                `;
            }

            contentEl.innerHTML = upgradesHtml;
            sidePanel.classList.add('active');
            adjustStationPanelHeight();
        }



        function buyLineSpeedUpgrade() {
            let l = transportLines[activeTransportType].find(x => x.id === activeLineId);
            if (!l) return;
            l.bonusSpeedKmh = l.bonusSpeedKmh || 0;
            if (l.bonusSpeedKmh >= 20) return;
            if (money < 15000000) { showStatusToast("⚠️ Insufficient funds ($15,000,000 required).", false, 'var(--danger-pastel)'); return; }

            money -= 15000000;
            l.bonusSpeedKmh += 5;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);
            openSideUpgradesPanel();
            showStatusToast(`⚡ Line speed for ${l.name} increased to +${l.bonusSpeedKmh} km/h.`, false, 'var(--success-pastel)');
        }

        function buyLineCapacityUpgrade() {
            let l = transportLines[activeTransportType].find(x => x.id === activeLineId);
            if (!l) return;
            l.bonusCapacity = l.bonusCapacity || 0;
            if (l.bonusCapacity >= 5) return;
            if (money < 10000000) { showStatusToast("⚠️ Insufficient funds ($10,000,000 required).", false, 'var(--danger-pastel)'); return; }

            money -= 10000000;
            l.bonusCapacity += 1;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);
            openSideUpgradesPanel();
            showStatusToast(`📦 Capacity for ${l.name} increased to ${10 + l.bonusCapacity} pax/car.`, false, 'var(--success-pastel)');
        }

        function buyLineBusSpeedUpgrade() {
            let l = transportLines[activeTransportType].find(x => x.id === activeLineId);
            if (!l || (l.bonusSpeedKmh || 0) > 0) return;
            if (money < 8000000) { showStatusToast("⚠️ Insufficient funds ($8,000,000 required).", false, 'var(--danger-pastel)'); return; }

            money -= 8000000;
            l.bonusSpeedKmh = 15;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);
            openSideUpgradesPanel();
            showStatusToast(`🚌 Dedicated bus lane enabled for ${l.name}.`, false, 'var(--success-pastel)');
        }

        function buyLineBusCapacityUpgrade() {
            let l = transportLines[activeTransportType].find(x => x.id === activeLineId);
            if (!l) return;
            l.bonusCapacity = l.bonusCapacity || 0;
            if (l.bonusCapacity >= 10) return;
            if (money < 6000000) { showStatusToast("⚠️ Insufficient funds ($6,000,000 required).", false, 'var(--danger-pastel)'); return; }

            money -= 6000000;
            l.bonusCapacity += 2;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);
            openSideUpgradesPanel();
            showStatusToast(`📦 Capacity for ${l.name} increased to ${15 + l.bonusCapacity} pax/bus.`, false, 'var(--success-pastel)');
        }

        function saveNewLineFromHUD() {
            let nameInput = document.getElementById('thud-new-name');
            let colorInput = document.getElementById('thud-new-color');
            let type = activeTransportType;

            let name = nameInput.value || (type === 'metro' ? `Line ${transportLines[type].length + 1}` : `Route ${transportLines[type].length + 1}`);
            let color = colorInput.value;
            let freq = type === 'bus' ? parseInt(document.getElementById('thud-bus-freq').value) || 6 : 1;

            let id = Date.now().toString();
            transportLines[type].push({ 
                id: id, type: type, name: name, color: color, count: 0, freq: freq, 
                stations: [], controlPoints: {}, routeCoords: [], segments: [], layer: L.layerGroup().addTo(map), 
                markers: [], polyline: null, trainDataList: [], busDataList: [],
                bonusSpeedKmh: 0, bonusCapacity: 0, dailyEarningsCurrent: 0, dailyEarningsLast: 0,
                expressActive: false
            });

            nameInput.value = '';
            selectLineAndOpenDetail(id);
            checkLevelProgression();
            showStatusToast(`✓ ${name} created successfully.`, false, 'var(--success-pastel)');
        }


        function isLineTerminalClear(net, trainLengthM) {
            if (!net.trainDataList || net.trainDataList.length === 0) return true;
            let totalD = net.totalDistance || 1000;
            let minSafeDist = Math.min(Math.max(trainLengthM * 2.5, 95), totalD * 0.45);

            for (let other of net.trainDataList) {
                if (other.state === 'waiting_dispatch' || other.state === 'depot') continue;
                if (other.dir === 1 && other.meter < minSafeDist) return false;
                if (other.state === 'stopped' && other.lastStoppedStationId === net.stations[0].id) return false;
                if (other.dir === -1 && other.meter < minSafeDist * 1.3) return false;
            }
            return true;
        }

        function modifyFleet(type, lineId, delta, isFree = false) {
            let l = transportLines[type].find(x => x.id === lineId);
            if (!l) return;

            if (l.stations.length < 2) {
                showStatusToast(tr('detailReqMin'), false, 'var(--danger-pastel)');
                return;
            }

            if (type === 'metro') {
                if (!l.trainDataList) l.trainDataList = [];
                if (delta > 0) {
                    let cost = isFree ? 0 : 8500000;
                    if (!isFree && money < cost) { showStatusToast(`⚠️ Insufficient funds for convoy (${cost.toLocaleString()}).`, false, 'var(--danger-pastel)'); return; }
                    if (!isFree) {
                        money -= cost;
                        document.getElementById('ui-money').innerText = formatFixedCurrency(money);
                    }

                    let k = l.trainDataList.length;

                    let wagonsMarkers = [];
                    for(let w = 0; w < 3; w++) {
                        let icon = L.divIcon({
                            className: 'metro-single-wagon-wrapper',
                            html: `<div class="metro-wagon-body" id="wagon-${l.id}-${k}-${w}" style="border-color:${l.color};"></div>`,
                            iconSize: [18, 7], 
                            iconAnchor: [9, 3.5]
                        });
                        let startPos = (l.routeCoords && l.routeCoords.length > 0) ? l.routeCoords[0] : l.stations[0].latlng;
                        let wm = L.marker(startPos, { icon: icon, zIndexOffset: 3000 }).addTo(map);
                        let el = wm.getElement();
                        if (el) el.style.opacity = '0';
                        wagonsMarkers.push(wm);
                    }

                    let initSched = Array(24).fill('active');
                    for (let h = 0; h < 5; h++) initSched[h] = 'maintenance';

                    let trainObj = {
                        id: 'train_' + Date.now() + '_' + k,
                        meter: 0, 
                        dir: 1, 
                        state: 'waiting_dispatch',
                        wait: 0,
                        speed: BASE_METRO_SPEED,
                        health: 100,
                        schedule: initSched,
                        retiring: false,
                        serviceType: (k % 2 === 0) ? 'red' : 'green',
                        wagonsPassengers: [0, 0, 0], 
                        marker: wagonsMarkers[0],
                        lastStoppedStationId: null,
                        cooldownStation: 0
                    };

                    wagonsMarkers.forEach(wm => {
                        wm.on('click', (ev) => { L.DomEvent.stopPropagation(ev); trackVehicle(trainObj, l, 'metro'); openTrainInspector(l, trainObj); });
                    });

                    l.markers.push(wagonsMarkers);
                    l.trainDataList.push(trainObj);

                    if (isLineTerminalClear(l, 45)) {
                        showStatusToast(`✓ Convoy entered service at ${l.stations[0].name}. Boarding passengers...`, false, 'var(--success-pastel)');
                    } else {
                        showStatusToast(`⏳ Convoy in depot: waiting for platform clear at ${l.stations[0].name}...`, false, l.color);
                    }
                } else if (delta < 0 && l.trainDataList.length > 0) {
                    let removeIdx = l.trainDataList.findIndex(tr => tr.state === 'waiting_dispatch' || tr.state === 'depot');
                    if (removeIdx === -1) removeIdx = l.trainDataList.length - 1;

                    let removedMarkers = l.markers.splice(removeIdx, 1)[0];
                    if (removedMarkers) removedMarkers.forEach(m => map.removeLayer(m));
                    l.trainDataList.splice(removeIdx, 1);

                    money += 4000000;
                    document.getElementById('ui-money').innerText = formatFixedCurrency(money);
                    showStatusToast(`✓ Convoy retired (+ $4,000,000 refunded).`);
                }
            } else {
                if (delta > 0) {
                    let cost = isFree ? 0 : 2500000;
                    if (!isFree && money < cost) { showStatusToast(`⚠️ Insufficient funds (${cost.toLocaleString()}).`, false, 'var(--danger-pastel)'); return; }
                    if (!isFree) {
                        money -= cost;
                        document.getElementById('ui-money').innerText = formatFixedCurrency(money);
                    }

                    let k = l.busDataList ? l.busDataList.length : 0;
                    let initialProgress = (k * 0.25) % 0.8 + 0.05;

                    let icon = L.divIcon({
                        className: 'bus-single-vehicle-wrapper',
                        html: `<div class="bus-wagon-body" id="bus-${l.id}-${k}" style="border-color:${l.color};"></div>`,
                        iconSize: [18, 7], 
                        iconAnchor: [9, 3.5]
                    });

                    let spawnPt = (l.routeCoords && l.routeCoords.length > 0) ? l.routeCoords[0] : l.stations[0].latlng;
                    let bm = L.marker(spawnPt, { icon: icon, zIndexOffset: 2400 }).addTo(map);

                    let initSched = Array(24).fill('active');
                    for (let h = 0; h < 5; h++) initSched[h] = 'maintenance';

                    let busObj = {
                        id: 'bus_' + Date.now() + '_' + k,
                        progress: initialProgress, dir: 1, state: 'moving', wait: 0, speed: BASE_BUS_SPEED,
                        health: 100, schedule: initSched, retiring: false,
                        passengers: 0, marker: bm, lastStoppedStationId: null, cooldownStation: 0
                    };
                    bm.on('click', (ev) => { L.DomEvent.stopPropagation(ev); trackVehicle(busObj, l, 'bus'); openBusInspector(l, busObj); });

                    l.markers.push(bm);
                    if (!l.busDataList) l.busDataList = [];
                    l.busDataList.push(busObj);
                    l.count = l.busDataList.length;

                    showStatusToast(`✓ Bus added to ${l.name}.`, false, 'var(--success-pastel)');
                } else if (delta < 0 && l.busDataList && l.busDataList.length > 0) {
                    let b = l.busDataList.pop();
                    if (b && b.marker) map.removeLayer(b.marker);
                    l.markers.pop();
                    l.count = l.busDataList.length;

                    money += 1200000;
                    document.getElementById('ui-money').innerText = formatFixedCurrency(money);
                    showStatusToast(`✓ Bus retired (+ $1,200,000 refunded).`);
                }
            }

            if (activeLineId) renderLineDetailContent();
        }


        function hudActionToggleCurves(stId) {
            let targetSt = stId ? allStations.find(s => s.id === stId) : currentSelectedStation;
            if (!targetSt) return;
            currentSelectedStation = targetSt;
            curveHandlesLayer.clearLayers();

            let associatedMetroLines = targetSt.lines
                .map(lId => transportLines.metro.find(x => x.id === lId))
                .filter(Boolean);

            if (associatedMetroLines.length === 0) {
                showStatusToast("⚠️ Station has no connected subway tracks.");
                return;
            }

            associatedMetroLines.forEach(line => {
                for (let i = 0; i < line.stations.length - 1; i++) {
                    let stA = line.stations[i];
                    let stB = line.stations[i+1];
                    let segKey = `${stA.id}_${stB.id}`;

                    let midPoint = line.controlPoints[segKey] || line.controlPoints[`${stB.id}_${stA.id}`] || [
                        (stA.latlng.lat + stB.latlng.lat) / 2,
                        (stA.latlng.lng + stB.latlng.lng) / 2
                    ];

                    let handle = L.circleMarker(midPoint, {
                        radius: 8,
                        color: line.color,
                        fillColor: '#fff',
                        fillOpacity: 0.9,
                        weight: 2
                    }).addTo(curveHandlesLayer);

                    handle.on('mousedown', () => {
                        map.dragging.disable();
                        const onMouseMove = (ev) => {
                            handle.setLatLng(ev.latlng);
                            line.controlPoints[segKey] = [ev.latlng.lat, ev.latlng.lng];
                            rebuildLinesPolylines();
                        };
                        const onMouseUp = () => {
                            map.off('mousemove', onMouseMove);
                            map.off('mouseup', onMouseUp);
                            map.dragging.enable();
                        };
                        map.on('mousemove', onMouseMove);
                        map.on('mouseup', onMouseUp);
                    });
                }
            });

            showStatusToast("〰️ Drag central handles to curve track segments.");
        }


        function openLineSelectorModal(stId) {
            let st = allStations.find(s => s.id === stId);
            if (!st) return;
            let availableLines = (st.isIntermodal)
                ? [...(transportLines.metro || []), ...(transportLines.bus || [])]
                : (transportLines[st.type] || []);

            if (availableLines.length === 0) {
                showStatusToast(`⚠️ No lines available for ${st.type}. Create one first.`, false, 'var(--danger-pastel)');
                return;
            }

            connectSourceStation = st;
            let listEl = document.getElementById('line-selector-list');
            listEl.innerHTML = availableLines.map(l => `
                <div class="line-select-option" onclick="chooseLineAndStartConnect('${l.id}')">
                    <span class="color-dot" style="background:${l.color}"></span> ${l.name}
                </div>
            `).join('');

            document.getElementById('line-selector-modal').style.display = 'block';
        }

        function chooseLineAndStartConnect(lineId) {
            let m = document.getElementById('line-selector-modal'); if (m) m.style.display = 'none';
            let allLines = [...(transportLines.metro || []), ...(transportLines.bus || [])]; selectedLineForConnect = allLines.find(l => l.id === lineId);
            currentMode = 'connecting';
            if (window.map && typeof window.map.setCameraMode2D === 'function') window.map.setCameraMode2D();
            showStatusToast(tr('toastConnecting', {name: selectedLineForConnect.name}), true, selectedLineForConnect.color);
        }

        function cancelConnectModal() {
            let m = document.getElementById('line-selector-modal'); if (m) m.style.display = 'none';
            cancelBuild();
        }

        function insertStationInBestOrder(stationsArray, newStation) {
            if (stationsArray.length < 2) {
                stationsArray.push(newStation);
                return;
            }

            let dStart = newStation.latlng.distanceTo(stationsArray[0].latlng);
            let dEnd = newStation.latlng.distanceTo(stationsArray[stationsArray.length - 1].latlng);

            let bestIndex = -1;
            let minDetour = Infinity;

            for (let i = 0; i < stationsArray.length - 1; i++) {
                let directDist = stationsArray[i].latlng.distanceTo(stationsArray[i+1].latlng);
                let detourDist = stationsArray[i].latlng.distanceTo(newStation.latlng) + newStation.latlng.distanceTo(stationsArray[i+1].latlng);
                let detourIncrease = detourDist - directDist;

                if (detourIncrease < minDetour) {
                    minDetour = detourIncrease;
                    bestIndex = i + 1;
                }
            }

            if (minDetour < Math.min(dStart, dEnd) * 1.2 && bestIndex !== -1) {
                stationsArray.splice(bestIndex, 0, newStation);
            } else if (dStart < dEnd) {
                stationsArray.unshift(newStation);
            } else {
                stationsArray.push(newStation);
            }
        }

        async function fetchDrivingRoadRoute(p1, p2) {
            const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_KEY}&start=${p1.lng},${p1.lat}&end=${p2.lng},${p2.lat}`;
            try {
                let res = await fetch(url);
                let data = await res.json();
                if (data.features && data.features[0].geometry) {
                    return data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
                }
            } catch(e) {}
            return [[p1.lat, p1.lng], [p2.lat, p2.lng]];
        }

        function generateBezierCurve(p0, pControl, p1, steps = 18) {
            if (typeof cfgSmoothCurves !== 'undefined' && !cfgSmoothCurves) return [p0, p1];
            let points = [];
            points.push([p0[0], p0[1]]);
            for (let t = (1 / steps); t < 1; t += 1 / steps) {
                let lat = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * pControl[0] + t * t * p1[0];
                let lng = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * pControl[1] + t * t * p1[1];
                points.push([lat, lng]);
            }
            points.push([p1[0], p1[1]]); 
            return points;
        }

        async function completeStationConnection(st1, st2, targetLine) {
            if (!targetLine) return;

            let distanceMeters = st1.latlng.distanceTo(st2.latlng);
            let cost = targetLine.type === 'metro' 
                ? Math.floor(distanceMeters * 35000) 
                : Math.floor(distanceMeters * 4000);

            if (money < cost) {
                showStatusToast(`⚠️ Insufficient funds for track laying ($${cost.toLocaleString()} required).`, false, 'var(--danger-pastel)');
                cancelBuild();
                return;
            }

            money -= cost;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);

            if (!targetLine.stations.some(s => s.id === st1.id)) insertStationInBestOrder(targetLine.stations, st1);
            if (!targetLine.stations.some(s => s.id === st2.id)) insertStationInBestOrder(targetLine.stations, st2);

            if (!st1.lines.includes(targetLine.id)) st1.lines.push(targetLine.id);
            if (!st2.lines.includes(targetLine.id)) st2.lines.push(targetLine.id);

            updateStationBadge(st1);
            updateStationBadge(st2);

            await rebuildLinesPolylines();
            cancelBuild();
            renderTransportHUDTable();
            if (activeLineId) renderLineDetailContent();
            checkLevelProgression();
            showStatusToast(tr('toastLinked', {name: targetLine.name}), false, 'var(--success-pastel)');
        }

        function startMoveStation(stId) {
            stationToEditObj = allStations.find(s => s.id === stId);
            currentMode = 'edit_station';
        }

        function demolishStation(stId, refund) {
            let idx = allStations.findIndex(s => s.id === stId);
            if (idx === -1) return;
            let st = allStations[idx];

            money += refund;
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);

            map.removeLayer(st.marker);
            allStations.splice(idx, 1);

            ['metro', 'bus'].forEach(t => {
                transportLines[t].forEach(line => {
                    line.stations = line.stations.filter(s => s.id !== stId);
                });
            });

            rebuildLinesPolylines();
            renderTransportHUDTable();
            if (activeLineId) renderLineDetailContent();
            if (isDensityFilterActive) renderDensityMapFilter();
        }

        function computeTrackMetrics(coords) {
            let dists = [];
            let total = 0;
            for (let i = 0; i < coords.length - 1; i++) {
                let d = L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
                dists.push(d);
                total += d;
            }
            return { dists, total };
        }

        async function rebuildLinesPolylines() {
            for (let t of ['metro', 'bus']) {
                for (let line of transportLines[t]) {
                    if (!map.hasLayer(line.layer)) {
                        line.layer.addTo(map);
                    }

                    if (line.polyline) {
                        line.layer.removeLayer(line.polyline);
                        map.removeLayer(line.polyline);
                    }

                    if (line.stations.length > 1) {
                        if (t === 'metro') {
                            let curvedTrack = [];
                            for (let i = 0; i < line.stations.length - 1; i++) {
                                let stA = line.stations[i];
                                let stB = line.stations[i+1];
                                let segKey = `${stA.id}_${stB.id}`;

                                let p0 = [stA.latlng.lat, stA.latlng.lng];
                                let p1 = [stB.latlng.lat, stB.latlng.lng];
                                let pCtrl = line.controlPoints[segKey] || line.controlPoints[`${stB.id}_${stA.id}`] || [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];

                                let segmentBezier = generateBezierCurve(p0, pCtrl, p1);
                                if (i > 0) segmentBezier.shift();
                                curvedTrack.push(...segmentBezier);
                            }

                            line.routeCoords = curvedTrack;
                            let metrics = computeTrackMetrics(curvedTrack);
                            line.trackDists = metrics.dists;
                            line.totalDistance = metrics.total;

                            line.polyline = L.polyline(curvedTrack, {
                                color: line.color,
                                weight: 6,
                                opacity: 0.95,
                                interactive: false
                            }).addTo(line.layer);

                            line.polyline.bringToBack();
                        } else {
                            let fullRoadRoute = [];
                            for (let i = 0; i < line.stations.length - 1; i++) {
                                let roadLeg = await fetchDrivingRoadRoute(line.stations[i].latlng, line.stations[i+1].latlng);
                                if (i > 0) roadLeg.shift();
                                fullRoadRoute.push(...roadLeg);
                            }
                            line.routeCoords = fullRoadRoute;
                            let metrics = computeTrackMetrics(fullRoadRoute);
                            line.trackDists = metrics.dists;
                            line.totalDistance = metrics.total;

                            line.polyline = L.polyline(fullRoadRoute, {
                                color: line.color,
                                weight: 5,
                                dashArray: '6, 8',
                                opacity: 0.95,
                                interactive: false
                            }).addTo(line.layer);

                            line.polyline.bringToBack();
                        }
                    } else {
                        line.routeCoords = [];
                        line.trackDists = [];
                        line.totalDistance = 0;
                    }
                }
            }
        }

        function cancelBuild() {
            currentMode = 'idle';
            if (window.map && typeof window.map.setCameraMode3D === 'function') window.map.setCameraMode3D();
            connectSourceStation = null;
            selectedLineForConnect = null;
            dismissStatusToast();
            let m = document.getElementById('line-selector-modal'); if (m) m.style.display = 'none';
            let thudBuildBtn = document.getElementById('thud-btn-build-general');
            if (thudBuildBtn) {
                thudBuildBtn.classList.remove('active');
                thudBuildBtn.innerText = activeTransportType === 'metro' ? tr('thudBuildSubway') : tr('thudBuildBus');
            }
            ghostMarker.setStyle({ opacity: 0 }); 
            ghostLine.setStyle({ opacity: 0 });
        }


        function openSchematicModal() {
            let modal = document.getElementById('schematic-modal');
            modal.style.display = 'flex';
            renderSchematicMetroMap();
        }

        function closeSchematicModal() {
            document.getElementById('schematic-modal').style.display = 'none';
        }

        function renderSchematicMetroMap() {
            let svg = document.getElementById('schematic-svg');
            svg.innerHTML = '';

            let metroLines = transportLines.metro.filter(l => l.stations.length > 0);
            if (metroLines.length === 0) {
                svg.innerHTML = `<text x="50%" y="50%" fill="#777" font-size="16" text-anchor="middle">${tr('schematicEmpty')}</text>`;
                return;
            }

            let lats = allStations.map(s => s.latlng.lat);
            let lngs = allStations.map(s => s.latlng.lng);
            let minLat = Math.min(...lats), maxLat = Math.max(...lats);
            let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

            let padding = 90;
            let svgW = 1200, svgH = 750;
            svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);

            function toOctoCanvas(latlng) {
                let normX = (latlng.lng - minLng) / (maxLng - minLng || 1);
                let normY = (maxLat - latlng.lat) / (maxLat - minLat || 1);
                let rawX = padding + normX * (svgW - padding * 2);
                let rawY = padding + normY * (svgH - padding * 2);

                return {
                    x: Math.round(rawX / 20) * 20,
                    y: Math.round(rawY / 20) * 20
                };
            }

            metroLines.forEach(line => {
                if (line.stations.length < 2) return;
                let pathData = "";

                for (let i = 0; i < line.stations.length - 1; i++) {
                    let p1 = toOctoCanvas(line.stations[i].latlng);
                    let p2 = toOctoCanvas(line.stations[i+1].latlng);

                    if (i === 0) pathData += `M ${p1.x} ${p1.y} `;

                    let dx = p2.x - p1.x;
                    let dy = p2.y - p1.y;

                    if (Math.abs(dx) !== Math.abs(dy) && dx !== 0 && dy !== 0) {
                        let midX = Math.abs(dx) > Math.abs(dy) ? p1.x + (dx - Math.sign(dx) * Math.abs(dy)) : p1.x;
                        let midY = Math.abs(dx) > Math.abs(dy) ? p1.y : p1.y + (dy - Math.sign(dy) * Math.abs(dx));
                        pathData += `L ${midX} ${midY} L ${p2.x} ${p2.y} `;
                    } else {
                        pathData += `L ${p2.x} ${p2.y} `;
                    }
                }

                let pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
                pathEl.setAttribute("d", pathData);
                pathEl.setAttribute("stroke", line.color);
                pathEl.setAttribute("stroke-width", "8");
                pathEl.setAttribute("fill", "none");
                pathEl.setAttribute("stroke-linecap", "round");
                pathEl.setAttribute("stroke-linejoin", "round");
                svg.appendChild(pathEl);
            });

            allStations.forEach(st => {
                if (st.type !== 'metro') return;
                let pt = toOctoCanvas(st.latlng);
                let isCombo = st.lines.length >= 2;

                let stationNode = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                stationNode.setAttribute("cx", pt.x);
                stationNode.setAttribute("cy", pt.y);
                stationNode.setAttribute("r", isCombo ? "7" : "5");

                let fillColor = "#ffffff";
                if (st.expressType === 'red') fillColor = "#ff3344";
                else if (st.expressType === 'green') fillColor = "#00dd66";

                stationNode.setAttribute("fill", fillColor);
                stationNode.setAttribute("stroke", isCombo ? "var(--accent)" : "#111115");
                stationNode.setAttribute("stroke-width", isCombo ? "3" : "2");
                svg.appendChild(stationNode);

                let label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                label.setAttribute("x", pt.x + 10);
                label.setAttribute("y", pt.y + 4);
                label.setAttribute("fill", "#ffffff");
                label.setAttribute("font-size", isCombo ? "12" : "10");
                label.setAttribute("font-weight", isCombo ? "bold" : "normal");
                label.setAttribute("transform", `rotate(-30, ${pt.x + 10}, ${pt.y + 4})`);
                label.textContent = st.name;
                svg.appendChild(label);
            });
        }

