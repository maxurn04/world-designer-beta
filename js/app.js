/* ==============================================================
   APPLICATION CONTROLLER, CALENDAR, SETTINGS & LIFECYCLE
   ============================================================== */

        // ==========================================
        // SETTINGS MODAL OPEN & CLOSE CONTROLS
        // ==========================================
        function openSettingsModal() {
            playAudioClick();
            let sm = document.getElementById('settings-modal');
            if (sm) sm.style.display = 'block';

            let langSel = document.getElementById('setting-language');
            if (langSel) langSel.value = currentLang;

            let resSel = document.getElementById('setting-resolution');
            if (resSel) resSel.value = currentResolution.toString();

            let uiSel = document.getElementById('setting-ui-scale');
            if (uiSel) uiSel.value = (currentUiScale * 100).toString();

            let slider = document.getElementById('setting-vehicles-slider');
            if (slider) slider.value = currentVehiclePresetIndex;

            let sndSlider = document.getElementById('setting-sound-volume');
            if (sndSlider) sndSlider.value = Math.round(masterVolume * 100);

            let muteBtn = document.getElementById('btn-setting-mute');
            if (muteBtn) muteBtn.innerText = isAudioMuted ? '🔇' : '🔊';
        }

        function closeSettingsModal() {
            playAudioClick();
            let sm = document.getElementById('settings-modal');
            if (sm) sm.style.display = 'none';
        }



        function changeLanguage(lang) {
            currentLang = lang;
            document.getElementById('setting-language').value = lang;
            applyAllTranslations();
        }

        const VEHICLE_DENSITY_PRESETS = [250, 750, 1500, 2500, 4500];
        let currentVehiclePresetIndex = 2; // Default 1500

        function updateMaxCarsTarget() {
            let baseCap = VEHICLE_DENSITY_PRESETS[currentVehiclePresetIndex];
            // Scale target car count as map unlocks: Level 1 (2 communes) starts at 20% of base, scaling to 100% at Level 10 (all RM)
            let territoryProgress = Math.min(1.0, Math.max(0, (currentLevel - 1) / 9));
            let sizeFactor = 0.20 + (0.80 * territoryProgress);
            MAX_CARS = Math.max(20, Math.round(baseCap * sizeFactor));

            let valEl = document.getElementById('ui-vehicle-val');
            if (valEl) {
                valEl.innerText = `${baseCap} (${MAX_CARS} on map)`;
            }

            // Prune excess cars if setting was lowered
            while (trafficCars.length > MAX_CARS) {
                let car = trafficCars.pop();
                if (car && car.marker) map.removeLayer(car.marker);
            }
        }

        function changeVehicleDensityIndex(idx) {
            currentVehiclePresetIndex = parseInt(idx);
            if (isNaN(currentVehiclePresetIndex) || currentVehiclePresetIndex < 0) currentVehiclePresetIndex = 0;
            if (currentVehiclePresetIndex > 4) currentVehiclePresetIndex = 4;
            updateMaxCarsTarget();
        }

        function setVehicleSlider(idx) {
            let slider = document.getElementById('setting-vehicles-slider');
            if (slider) slider.value = idx;
            changeVehicleDensityIndex(idx);
        }

        function changeResolution(res) {
            currentResolution = parseInt(res) || 100;
            let container = document.getElementById('map-container');
            container.classList.remove('res-75', 'res-50');

            if (currentResolution === 75) {
                container.classList.add('res-75');
            } else if (currentResolution === 50) {
                container.classList.add('res-50');
            }

            // Resolution lowers map/border visual detail without touching vehicle counts
            if (typeof renderActiveZones === 'function') {
                renderActiveZones();
            }
        }

        function changeUiScale(scaleVal) {
            currentUiScale = parseFloat(scaleVal) || 1.0;
            document.documentElement.style.setProperty('--ui-scale', currentUiScale);
        }


        function toggleCalendarModal() {
            let modal = document.getElementById('calendar-modal');
            if (modal.style.display === 'flex' || modal.style.display === 'block') {
                modal.style.display = 'none';
            } else {
                modal.style.display = 'flex';
                selectedCalendarDay = simDayOfMonth;
                viewMonthIndex = simMonthIndex;
                switchFolderTab('cal');
            }
        }

        function navCalendarMonth(delta) {
            viewMonthIndex = (viewMonthIndex + delta + 12) % 12;
            renderCalendarGrid();
            if (viewMonthIndex === simMonthIndex) {
                selectCalendarDay(selectedCalendarDay || simDayOfMonth);
            } else {
                selectCalendarDay(1);
            }
        }

        function renderWeekdayHeaders() {
            let row = document.getElementById('cal-weekdays-row');
            if (!row) return;
            let days = currentLang === 'es' ? CAL_WEEKDAYS.es : CAL_WEEKDAYS.en;
            row.innerHTML = days.map((d, i) => `
                <div class="cal-weekday-cell ${i === 6 ? 'sunday' : ''}">${d}</div>
            `).join('');
        }

        function renderCalendarGrid() {
            renderWeekdayHeaders();

            let prevMonthIdx = (viewMonthIndex - 1 + 12) % 12;
            let nextMonthIdx = (viewMonthIndex + 1) % 12;

            let prevShort = (currentLang === 'es' ? MONTH_NAMES.es[prevMonthIdx] : MONTH_NAMES.en[prevMonthIdx]).slice(0, 3).toUpperCase();
            let nextShort = (currentLang === 'es' ? MONTH_NAMES.es[nextMonthIdx] : MONTH_NAMES.en[nextMonthIdx]).slice(0, 3).toUpperCase();
            let curTitle = currentLang === 'es' ? MONTH_NAMES.es[viewMonthIndex] : MONTH_NAMES.en[viewMonthIndex];

            let prevBtn = document.getElementById('cal-prev-month-btn');
            let nextBtn = document.getElementById('cal-next-month-btn');
            let titleEl = document.getElementById('cal-month-name');

            if (prevBtn) prevBtn.innerText = `‹ ${prevShort}`;
            if (nextBtn) nextBtn.innerText = `${nextShort} ›`;
            if (titleEl) titleEl.innerText = curTitle;

            let grid = document.getElementById('calendar-grid-container');
            if (!grid) return;

            let isCurrentMonth = (viewMonthIndex === simMonthIndex);

            let html = '';
            for (let d = 1; d <= 31; d++) {
                let isCurrent = isCurrentMonth && (d === simDayOfMonth);
                let isSelected = (d === selectedCalendarDay);
                let evt = isCurrentMonth ? MONTH_EVENTS[d] : null;
                let hasEvent = !!evt;

                let weekdayCol = (d - 1) % 7; 
                let isSunday = (weekdayCol === 6);

                let eventClass = '';
                if (hasEvent) {
                    eventClass = evt.type === 'positive' ? 'has-event-good' : 'has-event-bad';
                }

                let weatherInfo = DAILY_WEATHER[d] || { type: 'clear', temp: 24, icon: '☀️' };
                let weatherClass = '';
                if (weatherInfo.type === 'hot' || weatherInfo.type === 'heatwave') weatherClass = 'weather-cell-hot';
                else if (weatherInfo.type === 'rain' || weatherInfo.type === 'storm') weatherClass = 'weather-cell-rain';

                html += `
                    <div class="cal-day-cell ${isSunday ? 'sunday' : ''} ${isCurrent ? 'current-day' : ''} ${isSelected ? 'selected-day' : ''} ${eventClass} ${weatherClass}" onclick="selectCalendarDay(${d})">
                        <span class="cal-day-number">${d}</span>
                        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; padding:0 2px;">
                            <span class="cal-weather-badge ${weatherInfo.type}">${weatherInfo.icon}${weatherInfo.temp}°</span>
                            ${hasEvent ? `<span class="cal-day-badge">${evt.icon}</span>` : `<span style="height:12px;"></span>`}
                        </div>
                    </div>
                `;
            }
            grid.innerHTML = html;
        }

        function selectCalendarDay(day) {
            selectedCalendarDay = day;

            let cells = document.querySelectorAll('.cal-day-cell');
            cells.forEach((cell, idx) => {
                if (idx + 1 === day) cell.classList.add('selected-day');
                else cell.classList.remove('selected-day');
            });

            let isCurrentMonth = (viewMonthIndex === simMonthIndex);
            let dayTag = document.getElementById('cal-panel-day-tag');
            let badgeEl = document.getElementById('cal-panel-status-badge');
            let bodyEl = document.getElementById('cal-panel-body');

            if (!dayTag || !bodyEl) return;

            let weekdayIdx = (day - 1) % 7;
            let weekdayName = currentLang === 'es' ? FULL_DAYS_ES[(weekdayIdx + 1) % 7] : FULL_DAYS_EN[(weekdayIdx + 1) % 7];
            let monthName = currentLang === 'es' ? MONTH_NAMES.es[viewMonthIndex] : MONTH_NAMES.en[viewMonthIndex];

            dayTag.innerText = currentLang === 'es' 
                ? `Día ${day} • ${weekdayName}`
                : `Day ${day} • ${weekdayName}`;

            playAudioClick();

            let wData = DAILY_WEATHER[day] || { type: 'clear', temp: 24, icon: '☀️', nameEn: 'Clear', nameEs: 'Despejado' };
            let wName = currentLang === 'es' ? wData.nameEs : wData.nameEn;
            let weatherStripHtml = `<div class="cal-panel-weather-tag">${wData.icon} ${wName} • ${wData.temp}°C</div>`;

            let isToday = isCurrentMonth && (day === simDayOfMonth);
            let evt = isCurrentMonth ? MONTH_EVENTS[day] : null;

            if (badgeEl) {
                if (isToday) {
                    badgeEl.className = 'cal-panel-badge today';
                    badgeEl.innerText = currentLang === 'es' ? 'Hoy' : 'Today';
                } else if (evt) {
                    badgeEl.className = `cal-panel-badge ${evt.type === 'positive' ? 'good' : 'bad'}`;
                    badgeEl.innerText = evt.type === 'positive' 
                        ? (currentLang === 'es' ? 'Favorable' : 'Positive') 
                        : (currentLang === 'es' ? 'Desafío' : 'Adverse');
                } else {
                    badgeEl.className = 'cal-panel-badge';
                    badgeEl.innerText = currentLang === 'es' ? 'Ordinario' : 'Regular';
                }
            }

            if (evt) {
                let title = currentLang === 'es' ? evt.titleEs : evt.titleEn;
                let desc = currentLang === 'es' ? evt.descEs : evt.descEn;
                let effects = currentLang === 'es' ? evt.effectsEs : evt.effectsEn;

                let effectsListHtml = (effects || []).map(eff => `
                    <div class="cal-panel-effect-item ${eff.type}">
                        <span>${eff.type === 'good' ? '▲' : '▼'}</span>
                        <span>${eff.text}</span>
                    </div>
                `).join('');

                bodyEl.innerHTML = `
                    ${weatherStripHtml}
                    <div class="cal-panel-evt-title">
                        <span>${evt.icon}</span>
                        <span>${title}</span>
                    </div>
                    <div class="cal-panel-desc">${desc}</div>
                    <div class="cal-panel-effects-box">
                        <div class="cal-panel-effects-title">${currentLang === 'es' ? 'Impacto Operacional & Demanda' : 'Operational & Demand Impacts'}</div>
                        ${effectsListHtml}
                    </div>
                `;
            } else {
                let noEvtTitle = currentLang === 'es' ? 'Operación Normal' : 'Standard Transit Operations';
                let noEvtDesc = !isCurrentMonth
                    ? (currentLang === 'es' 
                        ? `Viendo el mes de ${monthName}. La simulación activa está en ${MONTH_NAMES.es[simMonthIndex]}.`
                        : `Viewing ${monthName}. Active simulation is running in ${MONTH_NAMES.en[simMonthIndex]}.`)
                    : (currentLang === 'es'
                        ? 'Jornada regular de transporte metropolitano. Los flujos de pasajeros y tarifas responden a las curvas estándar de demanda sin alteraciones climáticas ni eventos extraordinarios.'
                        : 'Standard metropolitan transit operations. Passenger flows follow routine demand curves with no severe disruptions or special bonuses.');

                bodyEl.innerHTML = `
                    ${weatherStripHtml}
                    <div class="cal-panel-evt-title" style="color:#aaa;">
                        <span>📋</span>
                        <span>${noEvtTitle}</span>
                    </div>
                    <div class="cal-panel-desc">${noEvtDesc}</div>
                    <div class="cal-panel-effects-box" style="border-style:dashed;">
                        <div class="cal-panel-effects-title" style="color:#666;">${currentLang === 'es' ? 'Condiciones de Rutina' : 'Routine Conditions'}</div>
                        <div class="cal-panel-effect-item info">
                            <span>•</span>
                            <span>${currentLang === 'es' ? 'Tarifas y frecuencias operan a escala normal' : 'Fares and frequencies running at nominal scale'}</span>
                        </div>
                    </div>
                `;
            }
        }

        let currentFolderTab = 'cal';
        let viewMonthIndex = 0; // Starts at January

        function switchFolderTab(tab) {
            currentFolderTab = tab;

            let btnCal = document.getElementById('btn-folder-cal');
            let btnMetro = document.getElementById('btn-folder-metro');
            let btnBus = document.getElementById('btn-folder-bus');

            if (btnCal) btnCal.classList.toggle('active', tab === 'cal');
            if (btnMetro) btnMetro.classList.toggle('active', tab === 'metro');
            if (btnBus) btnBus.classList.toggle('active', tab === 'bus');

            let paneCal = document.getElementById('tab-folder-calendar');
            let paneMetro = document.getElementById('tab-folder-metro');
            let paneBus = document.getElementById('tab-folder-bus');

            if (paneCal) paneCal.classList.remove('active');
            if (paneMetro) paneMetro.classList.remove('active');
            if (paneBus) paneBus.classList.remove('active');

            playAudioClick();
            if (tab === 'cal') {
                if (paneCal) paneCal.classList.add('active');
                renderCalendarGrid();
                selectCalendarDay(selectedCalendarDay || simDayOfMonth);
            } else if (tab === 'metro') {
                if (paneMetro) paneMetro.classList.add('active');
                playAudioMetroChime();
                updateMetroSummaryCards();
                populateRegimeLineSelectorForMode('metro');
                renderRegimeTableForMode('metro');
            } else if (tab === 'bus') {
                if (paneBus) paneBus.classList.add('active');
                playAudioBusBell();
                updateBusSummaryCards();
                populateRegimeLineSelectorForMode('bus');
                renderRegimeTableForMode('bus');
            }
        }

        function setRegimeBrush(brush) {
            currentRegimeBrush = brush;
            ['active', 'maint', 'disabled'].forEach(b => {
                let elMetro = document.getElementById(`brush-btn-metro-${b}`);
                if (elMetro) elMetro.classList.toggle('active', (b === 'maint' ? 'maintenance' : b) === brush);
                let elBus = document.getElementById(`brush-btn-bus-${b}`);
                if (elBus) elBus.classList.toggle('active', (b === 'maint' ? 'maintenance' : b) === brush);
            });
        }

        function populateRegimeLineSelectorForMode(mode) {
            let selId = mode === 'metro' ? 'regime-metro-line-select' : 'regime-bus-line-select';
            let sel = document.getElementById(selId);
            if (!sel) return;
            let lines = transportLines[mode] || [];

            if (lines.length === 0) {
                sel.innerHTML = `<option value="">(${currentLang === 'es' ? 'Sin líneas creadas' : tr('thudNoLines')})</option>`;
            } else {
                let prevVal = sel.value;
                sel.innerHTML = lines.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
                if (prevVal && lines.some(l => l.id === prevVal)) {
                    sel.value = prevVal;
                }
            }
        }

        function renderRegimeTableForMode(mode) {
            let selId = mode === 'metro' ? 'regime-metro-line-select' : 'regime-bus-line-select';
            let tableId = mode === 'metro' ? 'regime-table-metro-body' : 'regime-table-bus-body';
            let sel = document.getElementById(selId);
            let container = document.getElementById(tableId);
            if (!container) return;

            let lineId = sel ? sel.value : null;
            let l = (transportLines[mode] || []).find(x => x.id === lineId);

            if (!l) {
                let emptyMsg = mode === 'metro'
                    ? (currentLang === 'es' ? 'Crea una línea de Metro para regular sus horarios.' : 'Create a Subway line to regulate schedules.')
                    : (currentLang === 'es' ? 'Crea un recorrido de Bus para regular sus horarios.' : 'Create a Bus route to regulate schedules.');
                container.innerHTML = `<tr><td style="color:#777; padding:20px;">${emptyMsg}</td></tr>`;
                return;
            }

            let vehicles = mode === 'metro' ? l.trainDataList : l.busDataList;
            if (!vehicles || vehicles.length === 0) {
                let noVehMsg = mode === 'metro'
                    ? (currentLang === 'es' ? 'Sin trenes asignados aún. Añade trenes en el menú de la línea.' : 'No trains added yet. Add trains in the line details menu.')
                    : (currentLang === 'es' ? 'Sin buses asignados aún. Añade buses en el menú del recorrido.' : 'No buses added yet. Add buses in the route details menu.');
                container.innerHTML = `<tr><td style="color:#777; padding:20px;">${noVehMsg}</td></tr>`;
                return;
            }

            let headerHtml = `<tr><th style="padding:4px 8px; text-align:left; color:#888;">${currentLang === 'es' ? 'Unidad' : 'Unit'}</th>`;
            for (let h = 0; h < 24; h++) {
                let isCurrent = (h === simHour);
                headerHtml += `<th class="regime-th-hour ${isCurrent ? 'current-h' : ''}" data-hour="${h}">${h}h</th>`;
            }
            headerHtml += '</tr>';

            let rowsHtml = vehicles.map((v, idx) => {
                let vName = mode === 'metro'
                    ? (currentLang === 'es' ? `Convoy ${idx + 1}` : `Train ${idx + 1}`)
                    : (currentLang === 'es' ? `Bus ${idx + 1}` : `Bus ${idx + 1}`);
                let healthPct = Math.round(v.health || 100);
                let healthColor = healthPct > 60 ? 'var(--success-pastel)' : (healthPct > 30 ? 'var(--accent)' : 'var(--danger-pastel)');

                let blocksHtml = '';
                for (let h = 0; h < 24; h++) {
                    let state = (v.schedule && v.schedule[h]) || 'active';
                    let isCurCol = (h === simHour) ? 'current-col' : '';
                    blocksHtml += `
                        <td class="regime-cell-block ${state} ${isCurCol}" 
                            id="cell-${v.id}-${h}" 
                            onclick="paintRegimeBlock('${mode}', '${l.id}', '${v.id}', ${h})">
                        </td>
                    `;
                }

                return `
                    <tr>
                        <td style="padding:4px 8px; text-align:left; white-space:nowrap;">
                            <div style="font-weight:bold; color:#fff; font-size:0.75rem;">${vName}</div>
                            <div class="health-mini-bar" title="${healthPct}% durabilidad">
                                <div class="health-mini-fill" style="width:${healthPct}%; background:${healthColor};"></div>
                            </div>
                        </td>
                        ${blocksHtml}
                    </tr>
                `;
            }).join('');

            container.innerHTML = headerHtml + rowsHtml;
        }

        function setAllRegimeForSelectedLine(mode, brush) {
            let selId = mode === 'metro' ? 'regime-metro-line-select' : 'regime-bus-line-select';
            let sel = document.getElementById(selId);
            if (!sel || !sel.value) return;
            let l = (transportLines[mode] || []).find(x => x.id === sel.value);
            if (!l) return;
            let vehicles = mode === 'metro' ? l.trainDataList : l.busDataList;
            if (!vehicles) return;
            vehicles.forEach(v => {
                if (!v.schedule) v.schedule = {};
                for (let h = 0; h < 24; h++) {
                    v.schedule[h] = brush;
                }
            });
            renderRegimeTableForMode(mode);
            if (currentFolderTab === 'metro') updateMetroSummaryCards();
            if (currentFolderTab === 'bus') updateBusSummaryCards();
        }

        function paintRegimeBlock(mode, lineId, vehicleId, hour) {
            let l = (transportLines[mode] || []).find(x => x.id === lineId);
            if (!l) return;
            let list = mode === 'metro' ? l.trainDataList : l.busDataList;
            let v = list.find(x => x.id === vehicleId);
            if (!v) return;

            if (!v.schedule) v.schedule = {};
            v.schedule[hour] = currentRegimeBrush;
            let cell = document.getElementById(`cell-${v.id}-${hour}`);
            if (cell) {
                cell.className = `regime-cell-block ${currentRegimeBrush} ${(hour === simHour) ? 'current-col' : ''}`;
            }
            if (currentFolderTab === 'metro') updateMetroSummaryCards();
            if (currentFolderTab === 'bus') updateBusSummaryCards();
        }

        function updateRegimeCurrentHourHighlight() {
            document.querySelectorAll('.regime-th-hour').forEach(th => {
                let h = parseInt(th.getAttribute('data-hour'));
                th.classList.toggle('current-h', h === simHour);
            });
            document.querySelectorAll('.regime-cell-block').forEach(c => {
                let parts = c.id.split('-');
                let h = parseInt(parts[parts.length - 1]);
                c.classList.toggle('current-col', h === simHour);
            });
        }

        function updateMetroSummaryCards() {
            let metroLines = transportLines.metro || [];
            let totalTrains = 0;

            metroLines.forEach(l => {
                totalTrains += (l.trainDataList || []).length;
            });

            let badgeEl = document.getElementById('metro-total-trains-badge');
            if (badgeEl) {
                badgeEl.innerText = `${totalTrains} ${currentLang === 'es' ? 'Trenes' : 'Trains'}`;
            }

            let listEl = document.getElementById('metro-lines-fleet-list');
            if (listEl) {
                if (metroLines.length === 0) {
                    listEl.innerHTML = `<div class="folder-empty-hint">${currentLang === 'es' ? 'No hay líneas de Metro construidas aún. Traza líneas y estaciones en el menú Construir.' : 'No Subway lines built yet. Build lines and stations in Build menu.'}</div>`;
                } else {
                    listEl.innerHTML = metroLines.map(l => {
                        let count = (l.trainDataList || []).length;
                        let act = (l.trainDataList || []).filter(t => ((t.schedule && t.schedule[simHour]) || 'active') === 'active').length;
                        let mnt = (l.trainDataList || []).filter(t => ((t.schedule && t.schedule[simHour]) || 'active') === 'maintenance').length;
                        return `
                            <div class="fleet-line-item">
                                <span class="fleet-line-dot" style="background:${l.color || '#ffcc00'};"></span>
                                <span class="fleet-line-name">${l.name}</span>
                                <span class="fleet-line-count">${count} ${currentLang === 'es' ? 'trenes' : 'trains'}</span>
                                <span class="fleet-line-status">(${act} ${currentLang === 'es' ? 'en servicio' : 'active'}${mnt > 0 ? `, ${mnt} mant.` : ''})</span>
                            </div>
                        `;
                    }).join('');
                }
            }

            // Financial Balance Metro
            let mStations = allStations.filter(s => s.type === 'metro').length;
            let rev = Math.floor(statsRecord.metroRev);
            let exp = statsRecord.metroExp || Math.round(mStations * 120000 * (currentEventFleetExpMultiplier || 1.0));
            let balance = rev - exp;
            let isSurplus = balance >= 0;

            let finStatusBadge = document.getElementById('metro-balance-status-badge');
            if (finStatusBadge) {
                finStatusBadge.className = `folder-card-badge ${isSurplus ? 'good' : 'bad'}`;
                finStatusBadge.innerText = isSurplus ? (currentLang === 'es' ? 'Superávit' : 'Surplus') : (currentLang === 'es' ? 'Déficit' : 'Deficit');
            }

            let finBody = document.getElementById('metro-finance-body');
            if (finBody) {
                let revLabel = currentLang === 'es' ? 'Ingresos Tarifas Metro' : 'Subway Passenger Fares';
                let expLabel = currentLang === 'es' ? 'Costos Operativos & Vías' : 'Subway Operating Costs';
                let balLabel = isSurplus ? (currentLang === 'es' ? 'Superávit Total' : 'Total Surplus') : (currentLang === 'es' ? 'Déficit Total' : 'Total Deficit');

                finBody.innerHTML = `
                    <div class="fin-stat-row">
                        <span class="fin-stat-lbl">📈 ${revLabel}:</span>
                        <span class="fin-stat-val good">+ $${rev.toLocaleString()}</span>
                    </div>
                    <div class="fin-stat-row">
                        <span class="fin-stat-lbl">📉 ${expLabel}:</span>
                        <span class="fin-stat-val bad">- $${exp.toLocaleString()}</span>
                    </div>
                    <div class="fin-stat-divider"></div>
                    <div class="fin-stat-row fin-stat-total">
                        <span class="fin-stat-lbl"><b>${balLabel}:</b></span>
                        <span class="fin-stat-val ${isSurplus ? 'good' : 'bad'}"><b>${isSurplus ? '+' : '-'} $${Math.abs(balance).toLocaleString()}</b></span>
                    </div>
                `;
            }
        }

        function updateBusSummaryCards() {
            let busRoutes = transportLines.bus || [];
            let totalBuses = 0;

            busRoutes.forEach(l => {
                totalBuses += (l.busDataList || []).length;
            });

            let badgeEl = document.getElementById('bus-total-buses-badge');
            if (badgeEl) {
                badgeEl.innerText = `${totalBuses} ${currentLang === 'es' ? 'Buses' : 'Buses'}`;
            }

            let listEl = document.getElementById('bus-lines-fleet-list');
            if (listEl) {
                if (busRoutes.length === 0) {
                    listEl.innerHTML = `<div class="folder-empty-hint">${currentLang === 'es' ? 'No hay recorridos de Buses construidos aún. Crea recorridos y paraderos en las calles.' : 'No Bus routes built yet. Build bus routes and stops along streets.'}</div>`;
                } else {
                    listEl.innerHTML = busRoutes.map(r => {
                        let count = (r.busDataList || []).length;
                        let act = (r.busDataList || []).filter(b => ((b.schedule && b.schedule[simHour]) || 'active') === 'active').length;
                        let mnt = (r.busDataList || []).filter(b => ((b.schedule && b.schedule[simHour]) || 'active') === 'maintenance').length;
                        return `
                            <div class="fleet-line-item">
                                <span class="fleet-line-dot" style="background:${r.color || '#00e676'};"></span>
                                <span class="fleet-line-name">${r.name}</span>
                                <span class="fleet-line-count">${count} ${currentLang === 'es' ? 'buses' : 'buses'}</span>
                                <span class="fleet-line-status">(${act} ${currentLang === 'es' ? 'en servicio' : 'active'}${mnt > 0 ? `, ${mnt} mant.` : ''})</span>
                            </div>
                        `;
                    }).join('');
                }
            }

            // Financial Balance Bus
            let bStations = allStations.filter(s => s.type === 'bus').length;
            let rev = Math.floor(statsRecord.busRev);
            let exp = statsRecord.busExp || Math.round(bStations * 45000 * (currentEventBusExpMultiplier || 1.0) * (currentEventFleetExpMultiplier || 1.0));
            let balance = rev - exp;
            let isSurplus = balance >= 0;

            let finStatusBadge = document.getElementById('bus-balance-status-badge');
            if (finStatusBadge) {
                finStatusBadge.className = `folder-card-badge ${isSurplus ? 'good' : 'bad'}`;
                finStatusBadge.innerText = isSurplus ? (currentLang === 'es' ? 'Superávit' : 'Surplus') : (currentLang === 'es' ? 'Déficit' : 'Deficit');
            }

            let finBody = document.getElementById('bus-finance-body');
            if (finBody) {
                let revLabel = currentLang === 'es' ? 'Ingresos Tarifas Buses' : 'Bus Passenger Fares';
                let expLabel = currentLang === 'es' ? 'Costos Combustible & Flota' : 'Bus Operating Costs';
                let balLabel = isSurplus ? (currentLang === 'es' ? 'Superávit Total' : 'Total Surplus') : (currentLang === 'es' ? 'Déficit Total' : 'Total Deficit');

                finBody.innerHTML = `
                    <div class="fin-stat-row">
                        <span class="fin-stat-lbl">📈 ${revLabel}:</span>
                        <span class="fin-stat-val good">+ $${rev.toLocaleString()}</span>
                    </div>
                    <div class="fin-stat-row">
                        <span class="fin-stat-lbl">📉 ${expLabel}:</span>
                        <span class="fin-stat-val bad">- $${exp.toLocaleString()}</span>
                    </div>
                    <div class="fin-stat-divider"></div>
                    <div class="fin-stat-row fin-stat-total">
                        <span class="fin-stat-lbl"><b>${balLabel}:</b></span>
                        <span class="fin-stat-val ${isSurplus ? 'good' : 'bad'}"><b>${isSurplus ? '+' : '-'} $${Math.abs(balance).toLocaleString()}</b></span>
                    </div>
                `;
            }
        }


        async function iniciarCiudad() {
            document.getElementById('start-screen').style.display = 'none';
            document.getElementById('navbar').style.display = 'flex';

            map.invalidateSize();
            map.setMaxBounds([[-33.85, -71.10], [-33.05, -70.20]]);
            map.setMinZoom(11);
            map.flyTo([-33.4380, -70.6350], 13.5, { duration: 1.2 });

            updateClockDisplay();
            updateTariffUI();
            document.getElementById('ui-money').innerText = formatFixedCurrency(money);

            syncZoneGeometries();
            updateMaxCarsTarget();

            let initialCars = Math.min(MAX_CARS, 350);
            for(let i = 0; i < initialCars; i++) spawnCar();

            lastTime = performance.now();
            requestAnimationFrame(animationEngine);

            setInterval(async () => {
                if (isGamePaused) return;

                simMinute += 15;
                if (simMinute >= 60) {
                    simMinute = 0;
                    simHour += 1;
                    if (simHour >= 24) {
                        simHour = 0;
                        simDayIndex = (simDayIndex + 1) % 7;
                        simDayOfMonth += 1;
                        if (simDayOfMonth > 31) {
                            simDayOfMonth = 1;
                            simMonthIndex = (simMonthIndex + 1) % 12;
                            allStations.forEach(s => s.revenueThisMonth = 0);
                        }

                        
                        saveGameToLocalStorage(true); // Auto-save on daily rollover
                        let curW = DAILY_WEATHER[simDayOfMonth] || { type: 'clear' };
                        applyWeatherAtmosphere(curW.type);

                        // Random chance (35%) to trigger one of the 8 dynamic mini-events if no major event today
                        if (!MONTH_EVENTS[simDayOfMonth] && Math.random() < 0.35) {
                            triggerRandomMiniEvent();
                        }

                        ['metro', 'bus'].forEach(t => {
                            transportLines[t].forEach(l => {
                                l.dailyEarningsLast = l.dailyEarningsCurrent;
                                l.dailyEarningsCurrent = 0;
                            });
                        });
                        if (activeLineId) renderLineDetailContent();

                        // Reset previous daily modifiers & apply new event with real in-game impact
                        resetDailyEventModifiers();
                        applyDailyEvent(simDayOfMonth);
                    }
                }
                updateClockDisplay();

                let spawnBudget = 30;
                while (trafficCars.length < MAX_CARS && spawnBudget-- > 0) spawnCar();

                let totalWaiting = 0;
                allStations.forEach(st => {
                    totalWaiting += Object.values(st.passengersByLine).reduce((a,b)=>a+b, 0);
                });

                if (totalWaiting > 150) citizenHappiness = Math.max(15, citizenHappiness - 8);
                else if (totalWaiting > 80) citizenHappiness = Math.max(25, citizenHappiness - 4);
                else citizenHappiness = Math.min(100, citizenHappiness + 5);

                let hapEl = document.getElementById('ui-happiness');
                hapEl.innerText = `${citizenHappiness}% ${citizenHappiness >= 80 ? '😊' : (citizenHappiness <= 30 ? '😡' : '😐')}`;
                if (citizenHappiness >= 90) hapEl.style.color = "var(--success-pastel)";
                else if (citizenHappiness <= 30) hapEl.style.color = "var(--danger-pastel)";
                else hapEl.style.color = "var(--accent)";

                let happyMultiplier = citizenHappiness >= 90 ? 1.2 : (citizenHappiness <= 30 ? 0.6 : 1.0);

                let mStations = allStations.filter(s => s.type === 'metro').length;
                let bStations = allStations.filter(s => s.type === 'bus').length;

                statsRecord.metroExp = Math.round(mStations * 120000 * (currentEventFleetExpMultiplier || 1.0));
                statsRecord.busExp = Math.round(bStations * 45000 * (currentEventBusExpMultiplier || 1.0) * (currentEventFleetExpMultiplier || 1.0));
                let intermodalCount = allStations.filter(s => s.isIntermodal).length; statsRecord.intermodalExp = Math.round(intermodalCount * 450000 * (currentEventFleetExpMultiplier || 1.0)); let totalExpenses = statsRecord.metroExp + statsRecord.busExp + statsRecord.intermodalExp;

                let rawRevenue = statsRecord.metroRev + statsRecord.busRev;
                let adjustedRevenue = Math.floor(rawRevenue * happyMultiplier);
                let totalIncome = Math.floor(statsRecord.passInc + adjustedRevenue);
                let netFlow = totalIncome - totalExpenses;

                money += netFlow;
                document.getElementById('ui-money').innerText = formatFixedCurrency(money);

                let flowEl = document.getElementById('ui-flow');
                if (netFlow > 0) {
                    flowEl.innerText = `+ $${netFlow.toLocaleString()}`;
                    flowEl.className = "flow-val pos";
                } else if (netFlow < 0) {
                    flowEl.innerText = `- $${Math.abs(netFlow).toLocaleString()}`;
                    flowEl.className = "flow-val neg";
                } else {
                    flowEl.innerText = `$0`;
                    flowEl.className = "flow-val zero";
                }

                updateFinancialModalContent(totalIncome, totalExpenses);
                statsRecord.passInc = 0; statsRecord.metroRev = 0; statsRecord.busRev = 0;

                checkLevelProgression();
            }, 15000);
        }

        function openPauseMenu() {
            isGamePaused = true;
            document.getElementById('pause-modal').style.display = 'block';
        }

        function resumeGame() {
            isGamePaused = false;
            document.getElementById('pause-modal').style.display = 'none';
        }

        function restartGame() {
            if (confirm("Are you sure you want to restart the current game?")) location.reload();
        }

        function exitGame() {
            if (confirm("Return to title screen?")) location.reload();
        }


        document.getElementById('file-input').addEventListener('change', function(e) {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];
            const statusEl = document.getElementById('upload-status');
            statusEl.innerHTML = `<span style="color:var(--accent);">Loading ${file.name}...</span>`;

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    procesarGeoJSON(parsed);
                    statusEl.innerHTML = `<span style="color:var(--success-pastel); font-weight:bold;">${tr('fileLoaded', {count: realStreetsData.all.length})}</span>`;
                    document.getElementById('btn-stgo').style.background = 'var(--accent)';
                    document.getElementById('btn-stgo').style.color = '#000';
                } catch(err) {
                    statusEl.innerHTML = `<span style="color:var(--danger-pastel);">Error reading JSON: ${err.message}</span>`;
                }
            };
            reader.readAsText(file);
        });


// Keyboard Shortcuts & Global Window listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (typeof isDensityFilterActive !== 'undefined' && isDensityFilterActive) {
            closeDensityInspector();
        }
        if (typeof cancelBuild === 'function') cancelBuild();
        if (typeof closeStationHUD === 'function') closeStationHUD();
        if (typeof closeSidePanel === 'function') closeSidePanel();
        if (typeof closeTransportHUD === 'function') closeTransportHUD();
        if (typeof closeSchematicModal === 'function') closeSchematicModal();
        let techModal = document.getElementById('tech-modal');
        if (techModal && techModal.style.display === 'block') techModal.style.display = 'none';
        let saveModal = document.getElementById('save-modal');
        if (saveModal && saveModal.style.display === 'block') saveModal.style.display = 'none';
    }
});
