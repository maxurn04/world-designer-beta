/* ==============================================================
   SAVE & LOAD SYSTEM (LOCALSTORAGE QUICK-SAVE & JSON BACKUPS)
   ============================================================== */

function openSaveModal() {
    playAudioClick();
    updateSaveModalUI();
    let modal = document.getElementById('save-modal');
    if (modal) modal.style.display = 'block';
}

function closeSaveModal() {
    playAudioClick();
    let modal = document.getElementById('save-modal');
    if (modal) modal.style.display = 'none';
}

function updateSaveModalUI() {
    let lastBadge = document.getElementById('save-last-timestamp');
    let loadBtn = document.getElementById('btn-load-quicksave');
    let savedStr = localStorage.getItem(SAVE_LOCALSTORAGE_KEY);

    if (savedStr) {
        try {
            let parsed = JSON.parse(savedStr);
            if (lastBadge) {
                let dateStr = parsed.saveDateFormatted || new Date(parsed.timestamp).toLocaleString();
                let lvl = parsed.currentLevel || 1;
                let fundsStr = formatFixedCurrency(parsed.money || 0);
                lastBadge.innerHTML = `<span style="color:#3fb950;">✓ ${currentLang === 'es' ? 'Guardado disponible' : 'Save available'}:</span> ${dateStr} (Lvl ${lvl}, ${fundsStr})`;
            }
            if (loadBtn) loadBtn.disabled = false;
        } catch(e) {
            if (lastBadge) lastBadge.innerText = currentLang === 'es' ? 'Error al leer guardado local.' : 'Local save read error.';
        }
    } else {
        if (lastBadge) lastBadge.innerText = currentLang === 'es' ? 'Sin guardado rápido previo.' : 'No quick-save recorded yet.';
        if (loadBtn) loadBtn.disabled = true;
    }
}

function serializeGameState() {
    return {
        saveVersion: "2.1",
        timestamp: Date.now(),
        saveDateFormatted: new Date().toLocaleString(),
        money: money,
        currentLevel: currentLevel,
        citizenHappiness: citizenHappiness,
        evasionRate: evasionRate,
        simDayOfMonth: simDayOfMonth,
        simMonthIndex: simMonthIndex,
        simDayIndex: simDayIndex,
        simHour: simHour,
        simMinute: simMinute,
        currentWeather: currentWeather,
        techUpgrades: { ...techUpgrades },
        settings: {
            lang: currentLang,
            resolution: currentResolution,
            densityPresetIndex: currentVehiclePresetIndex,
            uiScale: currentUiScale,
            soundMuted: isAudioMuted,
            dayNightActive: cfgDayNightCycleActive
        },
        stations: allStations.map(s => ({
            id: s.id,
            name: s.name,
            type: s.type,
            lat: s.latlng.lat,
            lng: s.latlng.lng,
            level: s.level || 1, isIntermodal: !!s.isIntermodal, intermodalDailyMaint: s.intermodalDailyMaint || 450000,
            maxCapacity: s.maxCapacity || (100 + ((s.level || 1) - 1) * 50),
            hasTurnstiles: !!s.hasTurnstiles,
            hasElevator: !!s.hasElevator,
            expressType: s.expressType || 'common',
            revMultiplier: s.revMultiplier || 1.0,
            attrMultiplier: s.attrMultiplier || 1.0,
            densityScore: s.densityScore || 50,
            revenueThisMonth: s.revenueThisMonth || 0,
            lines: [...(s.lines || [])]
        })),
        lines: {
            metro: (transportLines.metro || []).map(l => serializeLineData(l)),
            bus: (transportLines.bus || []).map(l => serializeLineData(l))
        }
    };
}

function serializeLineData(l) {
    return {
        id: l.id,
        type: l.type,
        name: l.name,
        color: l.color,
        count: l.count || 0,
        freq: l.freq || 1,
        expressActive: !!l.expressActive,
        bonusSpeedKmh: l.bonusSpeedKmh || 0,
        bonusCapacity: l.bonusCapacity || 0,
        stations: (l.stations || []).map(s => s.id),
        controlPoints: l.controlPoints || {},
        schedules: (l.type === 'metro' ? (l.trainDataList || []) : (l.busDataList || [])).map(v => ({
            id: v.id,
            schedule: v.schedule ? [...v.schedule] : Array(24).fill('active'),
            health: v.health !== undefined ? v.health : 100
        }))
    };
}

function saveGameToLocalStorage(isAutoSave = false) {
    try {
        let state = serializeGameState();
        localStorage.setItem(SAVE_LOCALSTORAGE_KEY, JSON.stringify(state));
        if (!isAutoSave) {
            playAudioClick();
            updateSaveModalUI();
            showStatusToast(currentLang === 'es' ? '💾 ¡Partida guardada en tu navegador!' : '💾 Game saved to browser storage!', false, 'var(--success-pastel)');
        }
        return true;
    } catch(e) {
        console.error("Save error:", e);
        showStatusToast("⚠️� Save error: " + e.message, false, 'var(--danger-pastel)');
        return false;
    }
}

function loadGameFromLocalStorage() {
    let savedStr = localStorage.getItem(SAVE_LOCALSTORAGE_KEY);
    if (!savedStr) {
        showStatusToast(currentLang === 'es' ? '⚠️� No hay partida guardada' : '⚠️� No save found', false, 'var(--danger-pastel)');
        return;
    }
    try {
        let data = JSON.parse(savedStr);
        restoreGameState(data);
        closeSaveModal();
    } catch(e) {
        showStatusToast("⚠️� Load error: " + e.message, false, 'var(--danger-pastel)');
    }
}

function exportSaveFile() {
    playAudioClick();
    try {
        let state = serializeGameState();
        let json = JSON.stringify(state, null, 2);
        let blob = new Blob([json], { type: 'application/json' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `santiago_transit_save_lvl${state.currentLevel}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatusToast(currentLang === 'es' ? '⬇️� Archivo de guardado descargado' : '⬇️� Save file downloaded', false, 'var(--success-pastel)');
    } catch(e) {
        showStatusToast("⚠️� Export error: " + e.message, false, 'var(--danger-pastel)');
    }
}

function importSaveFile(inputEl) {
    if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
    let file = inputEl.files[0];
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let parsed = JSON.parse(e.target.result);
            restoreGameState(parsed);
            closeSaveModal();
        } catch(err) {
            showStatusToast("⚠️� Invalid JSON: " + err.message, false, 'var(--danger-pastel)');
        }
    };
    reader.readAsText(file);
    inputEl.value = '';
}

async function restoreGameState(data) {
    if (!data || !data.saveVersion) {
        showStatusToast(currentLang === 'es' ? '⚠️� Archivo de guardado no compatible' : '⚠️� Incompatible save file', false, 'var(--danger-pastel)');
        return false;
    }

    try {
        isGamePaused = true;
        closeVehicleTracker();

        // 1. Remove existing markers & lines
        allStations.forEach(s => {
            if (s.marker) map.removeLayer(s.marker);
        });
        allStations = [];

        ['metro', 'bus'].forEach(t => {
            (transportLines[t] || []).forEach(l => {
                if (l.markers) {
                    l.markers.forEach(m => {
                        if (Array.isArray(m)) m.forEach(wm => map.removeLayer(wm));
                        else map.removeLayer(m);
                    });
                }
                if (l.polyline) {
                    l.layer.removeLayer(l.polyline);
                    map.removeLayer(l.polyline);
                }
                if (l.layer) map.removeLayer(l.layer);
            });
            transportLines[t] = [];
        });

        // 2. Restore variables
        money = data.money ?? 100000000;
        currentLevel = data.currentLevel || 1;
        citizenHappiness = data.citizenHappiness ?? 100;
        evasionRate = data.evasionRate ?? 0.15;
        simDayOfMonth = data.simDayOfMonth || 1;
        simMonthIndex = data.simMonthIndex || 0;
        simDayIndex = data.simDayIndex || 0;
        simHour = data.simHour || 8;
        simMinute = data.simMinute || 0;
        currentWeather = data.currentWeather || 'clear';

        if (data.techUpgrades) {
            techUpgrades = { ...data.techUpgrades };
        }

        // 3. Rebuild stations
        let stationsById = new Map();
        if (Array.isArray(data.stations)) {
            data.stations.forEach(stData => {
                let targetLatLng = L.latLng(stData.lat, stData.lng);
                let stationIcon = L.divIcon({
                    className: 'station-badge-wrapper',
                    html: `
                        <div class="station-icon-marker" id="badge-${stData.id}">
                            <div class="line-pills-container" id="pills-${stData.id}"></div>
                        </div>
                        <div class="station-label-text" id="label-${stData.id}">${stData.name}</div>
                        <div class="station-white-dot" id="dot-${stData.id}"></div>
                    `,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0]
                });

                let marker = L.marker(targetLatLng, {
                    icon: stationIcon,
                    interactive: true,
                    zIndexOffset: 2500
                }).addTo(map);

                let stObj = {
                    id: stData.id,
                    name: stData.name,
                    type: stData.type,
                    latlng: targetLatLng,
                    marker: marker,
                    passengersByLine: {},
                    level: stData.level || 1, isIntermodal: !!stData.isIntermodal, intermodalDailyMaint: stData.intermodalDailyMaint || 450000,
                    maxCapacity: stData.maxCapacity || (100 + ((stData.level || 1) - 1) * 50),
                    hasTurnstiles: !!stData.hasTurnstiles,
                    hasElevator: !!stData.hasElevator,
                    revMultiplier: stData.revMultiplier || 1.0,
                    attrMultiplier: stData.attrMultiplier || 1.0,
                    revenueThisMonth: stData.revenueThisMonth || 0,
                    expressType: stData.expressType || 'common',
                    lines: [...(stData.lines || [])],
                    densityScore: (stData.densityScore && stData.densityScore <= 10.0)
                        ? Number(stData.densityScore.toFixed(1))
                        : ((typeof getPointDensityAndAttraction === 'function')
                            ? getPointDensityAndAttraction(targetLatLng).density
                            : Math.max(1.0, Number((7.0 - (targetLatLng.distanceTo(SANTIAGO_CENTER) / 2500)).toFixed(1))))
                };

                marker.on('click', (ev) => {
                    if (ev && ev.originalEvent) {
                        ev.originalEvent._stationHandled = true;
                        L.DomEvent.stopPropagation(ev.originalEvent);
                    }
                    handleStationClick(stObj);
                });

                allStations.push(stObj);
                stationsById.set(stObj.id, stObj);
            });
        }

        // 4. Rebuild lines
        if (data.lines) {
            for (let t of ['metro', 'bus']) {
                let savedLines = data.lines[t] || [];
                for (let lData of savedLines) {
                    let layer = L.layerGroup().addTo(map);
                    let lineStations = (lData.stations || []).map(sId => stationsById.get(sId)).filter(Boolean);

                    let newLine = {
                        id: lData.id,
                        type: lData.type || t,
                        name: lData.name,
                        color: lData.color,
                        count: 0,
                        freq: lData.freq || 1,
                        stations: lineStations,
                        controlPoints: lData.controlPoints || {},
                        routeCoords: [],
                        segments: [],
                        layer: layer,
                        markers: [],
                        polyline: null,
                        dailyEarningsCurrent: 0,
                        dailyEarningsLast: 0,
                        expressActive: !!lData.expressActive,
                        bonusSpeedKmh: lData.bonusSpeedKmh || 0,
                        bonusCapacity: lData.bonusCapacity || 0
                    };

                    if (t === 'metro') newLine.trainDataList = [];
                    else newLine.busDataList = [];

                    transportLines[t].push(newLine);
                }
            }
        }

        // Polyline reconstruction
        await rebuildLinesPolylines();

        // 5. Restore vehicles & schedules
        if (data.lines) {
            for (let t of ['metro', 'bus']) {
                let savedLines = data.lines[t] || [];
                for (let lData of savedLines) {
                    let line = transportLines[t].find(x => x.id === lData.id);
                    if (!line) continue;

                    let targetCount = lData.count || 0;
                    if (targetCount > 0 && line.stations.length >= 2) {
                        for (let c = 0; c < targetCount; c++) {
                            modifyFleet(t, line.id, 1, true); // true = free restore without fee
                        }
                        let vehList = t === 'metro' ? line.trainDataList : line.busDataList;
                        if (vehList && lData.schedules) {
                            lData.schedules.forEach((sch, idx) => {
                                if (vehList[idx]) {
                                    if (sch.schedule) vehList[idx].schedule = [...sch.schedule];
                                    if (sch.health !== undefined) vehList[idx].health = sch.health;
                                }
                            });
                        }
                    }
                }
            }
        }

        // 6. Refresh UI & systems
        syncZoneGeometries();
        updateClockDisplay();
        updateMoneyDisplay();
        updateTariffUI();
        allStations.forEach(s => updateStationBadge(s));
        updateDayNightAtmosphere();
        applyWeatherAtmosphere(currentWeather);
        checkLevelProgression();

        isGamePaused = false;
        playAudioMetroChime();
        showStatusToast(currentLang === 'es' ? '✓ ¡Partida cargada exitosamente!' : '✓ Game loaded successfully!', false, 'var(--success-pastel)');
        return true;
    } catch (err) {
        console.error("Error loading game:", err);
        isGamePaused = false;
        showStatusToast("⚠️� Load Error: " + err.message, false, 'var(--danger-pastel)');
        return false;
    }
}

