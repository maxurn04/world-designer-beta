/* ==============================================================
   ECONOMY, TARIFFS, TECH TREE & FINANCES
   ============================================================== */

let money = 100000000;
let statsRecord = { passInc: 0, metroRev: 0, busRev: 0, metroExp: 0, busExp: 0, intermodalExp: 0 };
let evasionRate = 0.15;
let fareSubPeak = 830;
let fareSubOff = 750;
let fareBusFlat = 730;


        

        function resetDailyEventModifiers() {
            evasionRate = 0.06;
            currentEventSpeedFactor = 1.0;
            currentEventBusExpMultiplier = 1.0;
            currentEventFleetExpMultiplier = 1.0;
            currentEventDemandBoost = 1.0;
            currentEventOffPeakBoost = 1.0;
            currentWeather = 'clear';
        }

        function applyDailyEvent(day) {
            let evt = MONTH_EVENTS[day];
            if (!evt) return;

            if (evt.id === 'rain_winter') {
                currentWeather = 'rain';
                currentEventSpeedFactor = 0.65;
                currentEventDemandBoost = 1.4;
                showStatusToast(currentLang === 'es' 
                    ? 'ðŸŒ§ï¸ Â¡Lluvia Invernal! TrÃ¡fico en calles -35%, demanda del Metro +40%.' 
                    : 'ðŸŒ§ï¸ Winter Rainstorm! Street traffic -35%, subway demand +40%.', false, 'var(--danger-pastel)');
            } else if (evt.id === 'subsidy') {
                money += 15000000;
                citizenHappiness = Math.min(100, citizenHappiness + 5);
                document.getElementById('ui-money').innerText = formatFixedCurrency(money);
                showStatusToast(currentLang === 'es'
                    ? 'âš¡ Â¡Subsidio Estatal! +$15.000.000 a fondos pÃºblicos y aprobaciÃ³n +5%.'
                    : 'âš¡ State Transit Subsidy! +$15,000,000 public funds & approval +5%.', false, 'var(--success-pastel)');
            } else if (evt.id === 'concert') {
                currentEventDemandBoost = 2.5;
                citizenHappiness = Math.min(100, citizenHappiness + 4);
                showStatusToast(currentLang === 'es'
                    ? 'ðŸŽµ Â¡Mega Concierto Parque O\'Higgins! Demanda de pasajeros +150% (2.5x).'
                    : 'ðŸŽµ Massive Concert! Passenger arrival surge +150% (2.5x).', false, 'var(--success-pastel)');
            } else if (evt.id === 'roadworks') {
                currentEventSpeedFactor = 0.60;
                currentEventBusExpMultiplier = 1.25;
                showStatusToast(currentLang === 'es'
                    ? 'ðŸš§ Â¡Obras Viales! TrÃ¡fico ralentizado 40% y gastos de buses +25%.'
                    : 'ðŸš§ Roadworks! Traffic slowed 40% & bus operating expenses +25%.', false, 'var(--danger-pastel)');
            } else if (evt.id === 'match') {
                currentEventDemandBoost = 3.0;
                showStatusToast(currentLang === 'es'
                    ? 'âš½ Â¡SuperclÃ¡sico de FÃºtbol! Afluencia de pasajeros triplicada (3.0x).'
                    : 'âš½ Soccer Derby! Stadium rush triples passenger influx (3.0x).', false, 'var(--success-pastel)');
            } else if (evt.id === 'strike') {
                currentEventDemandBoost = 1.8;
                citizenHappiness = Math.min(100, citizenHappiness + 4);
                showStatusToast(currentLang === 'es'
                    ? 'ðŸ“¢ Â¡Paro de Transporte Privado! Demanda de transporte pÃºblico +80%.'
                    : 'ðŸ“¢ Private Transit Strike! Public transit demand +80% all day.', false, 'var(--success-pastel)');
            } else if (evt.id === 'storm') {
                currentWeather = 'rain';
                currentEventSpeedFactor = 0.50;
                currentEventDemandBoost = 1.6;
                money = Math.max(0, money - 6000000);
                document.getElementById('ui-money').innerText = formatFixedCurrency(money);
                showStatusToast(currentLang === 'es'
                    ? 'â›ˆï¸ Â¡Alerta de Temporal! Reparaciones -$6.000.000 y velocidad reducida a la mitad.'
                    : 'â›ˆï¸ Storm & Flood Alert! Emergency repairs -$6,000,000, speed halved.', false, 'var(--danger-pastel)');
            } else if (evt.id === 'car_free') {
                currentEventDemandBoost = 2.2;
                citizenHappiness = Math.min(100, citizenHappiness + 8);
                showStatusToast(currentLang === 'es'
                    ? 'ðŸŒ³ Â¡DÃ­a Sin Auto en Santiago! AprobaciÃ³n +8% y viajes en Metro y Bus duplicados.'
                    : 'ðŸŒ³ Santiago Car-Free Day! Approval +8% and public ridership doubled (2.2x).', false, 'var(--success-pastel)');
            } else if (evt.id === 'festival') {
                currentEventOffPeakBoost = 1.8;
                citizenHappiness = Math.min(100, citizenHappiness + 5);
                showStatusToast(currentLang === 'es'
                    ? 'ðŸŽª Â¡Feria Costumbrista! Afluencia en horario valle +80% y bienestar +5%.'
                    : 'ðŸŽª Cultural Food Fair! Off-peak ridership +80% and approval +5%.', false, 'var(--success-pastel)');
            } else if (evt.id === 'heatwave') {
                currentEventFleetExpMultiplier = 1.35;
                citizenHappiness = Math.max(10, citizenHappiness - 5);
                showStatusToast(currentLang === 'es'
                    ? 'ðŸ”¥ Â¡Ola de Calor Extremo (38Â°C)! Consumo de aire acondicionado +35%, confort -5%.'
                    : 'ðŸ”¥ Extreme Heatwave! AC cooling power expenses +35%, comfort -5%.', false, 'var(--danger-pastel)');
            } else if (evt.id === 'evasion_crisis') {
                evasionRate = 0.22;
                showStatusToast(currentLang === 'es'
                    ? 'ðŸ“‰ Â¡Jornada de Alta EvasiÃ³n! Tasa de evasiÃ³n se dispara al 22% hoy.'
                    : 'ðŸ“‰ High Fare Evasion Day! Evasion spikes to 22% cutting ticket income.', false, 'var(--danger-pastel)');
            } else if (evt.id === 'award') {
                money += 20000000;
                citizenHappiness = 100;
                document.getElementById('ui-money').innerText = formatFixedCurrency(money);
                showStatusToast(currentLang === 'es'
                    ? 'ðŸ† Â¡Premio a la Excelencia del Transporte! SubvenciÃ³n +$20.000.000 y 100% aprobaciÃ³n.'
                    : 'ðŸ† Transit Excellence Award! +$20,000,000 grant and 100% approval.', false, 'var(--success-pastel)');
            }

            let modal = document.getElementById('calendar-modal');
            if (modal && modal.style.display === 'block') {
                renderCalendarGrid();
                selectCalendarDay(day);
            }
        }

        let tariffConfig = {
            metroPeak: 840,
            metroOff: 750,
            busFlat: 730,
            bipIntegrated: true
        };
        evasionRate = 0.06;

        function formatFixedCurrency(amount) {
            let sign = amount < 0 ? "-" : "";
            let abs = Math.abs(Math.floor(amount));
            let s = abs.toString().padStart(9, '0');
            let formatted = s.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
            return `${sign}$0.${formatted}`;
        }

        function updateClockDisplay() {
            let period = simHour >= 12 ? "PM" : "AM";
            let displayHour = simHour % 12;
            if (displayHour === 0) displayHour = 12;
            let displayMinute = simMinute < 10 ? "0" + simMinute : simMinute;

            document.getElementById('ui-clock-time').innerText = `${displayHour}:${displayMinute} ${period}`;
            let dayName = currentLang === 'es' ? DAYS_OF_WEEK_ES[simDayIndex] : DAYS_OF_WEEK_EN[simDayIndex];
            document.getElementById('ui-clock-day').innerText = `${dayName} ${simDayOfMonth} ðŸ“…`;
            updateDayNightAtmosphere();
            updateLiveDynamicWeather();

            let regEl = document.getElementById('ui-regime-text');
            if (isRushHour()) {
                regEl.innerText = tr('regimePeak');
                regEl.style.color = "var(--danger-pastel)";
            } else if (isNightLowHour()) {
                regEl.innerText = tr('regimeLow');
                regEl.style.color = "#7788aa";
            } else {
                regEl.innerText = tr('regimeOffPeak');
                regEl.style.color = "var(--accent)";
            }

            let weatherEl = document.getElementById('ui-weather-sub');
            weatherEl.innerText = currentWeather === 'rain' ? tr('weatherRain') : tr('weatherSunny');
            weatherEl.style.color = currentWeather === 'rain' ? "var(--danger-pastel)" : "#888";

            updateRegimeCurrentHourHighlight();
        }

        function isRushHour() {
            let isWeekday = simDayIndex >= 1 && simDayIndex <= 5;
            if (!isWeekday) return false;
            return (simHour >= 8 && simHour < 10) || (simHour >= 18 && simHour < 21);
        }

        function isNightLowHour() {
            return simHour >= 22 || simHour < 6;
        }

        function showStatusToast(message, isPersistent = false, borderColor = 'var(--accent)') {
            let bar = document.getElementById('status-toast-bar');
            let text = document.getElementById('status-toast-text');
            let btn = document.getElementById('status-toast-action');

            if (toastTimeout) clearTimeout(toastTimeout);

            bar.style.borderColor = borderColor;
            text.innerHTML = message;
            btn.style.display = isPersistent ? 'block' : 'none';
            btn.innerText = tr('btnCancel');
            bar.style.display = 'flex';

            if (!isPersistent) {
                toastTimeout = setTimeout(() => {
                    bar.style.display = 'none';
                }, 4000);
            }
        }

        function dismissStatusToast() {
            let bar = document.getElementById('status-toast-bar');
            bar.style.display = 'none';
            if (currentMode === 'connecting') cancelBuild();
        }


        function toggleTariffModal() {
            let modal = document.getElementById('tariff-modal');
            modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
            if (modal.style.display === 'block') updateTariffUI();
        }

        function updateTariffValues() {
            tariffConfig.metroPeak = parseInt(document.getElementById('inp-metro-peak').value) || 840;
            tariffConfig.metroOff = parseInt(document.getElementById('inp-metro-off').value) || 750;
            tariffConfig.busFlat = parseInt(document.getElementById('inp-bus-flat').value) || 730;
            tariffConfig.bipIntegrated = document.getElementById('chk-bip').checked;
            updateTariffUI();
        }

        function updateTariffUI() {
            let avgPrice = (tariffConfig.metroPeak + tariffConfig.metroOff + tariffConfig.busFlat) / 3;
            let calculatedEvasion = Math.max(0.02, Math.min(0.25, ((avgPrice - 600) / 1200) * (tariffConfig.bipIntegrated ? 0.75 : 1.2)));
            evasionRate = calculatedEvasion;

            document.getElementById('ui-evasion-rate').innerText = `${Math.round(evasionRate * 100)}%`;
            let impactEl = document.getElementById('ui-tariff-impact');

            if (avgPrice > 880) {
                impactEl.innerText = tr('fareImpactHigh');
                impactEl.style.color = "var(--danger-pastel)";
            } else if (avgPrice < 700) {
                impactEl.innerText = tr('fareImpactLow');
                impactEl.style.color = "var(--success-pastel)";
            } else {
                impactEl.innerText = tr('fareImpactBalanced');
                impactEl.style.color = "var(--accent)";
            }
        }


function updateMoneyDisplay() {
    let el = document.getElementById('ui-money');
    if (el) el.innerText = formatFixedCurrency(money);
}

        function toggleFinancialModal() {
            let el = document.getElementById('financial-modal');
            el.style.display = el.style.display === 'block' ? 'none' : 'block';
        }

        function updateFinancialModalContent(tInc, tExp) {
            document.getElementById('fin-content').innerHTML = `
                <div style="margin-bottom:6px; color:var(--success-pastel);"><b>${tr('finPeriodIncome', {amt: tInc.toLocaleString()})}</b></div>
                <div style="margin-left:10px; font-size:0.8rem; color:#ccc;">
                    ${tr('finSubwayRev', {amt: Math.floor(statsRecord.metroRev).toLocaleString()})}<br>
                    ${tr('finBusRev', {amt: Math.floor(statsRecord.busRev).toLocaleString()})}<br>
                    ${tr('finEvasionLoss', {pct: Math.round(evasionRate * 100)})}<br>
                    Approval Impact: ${citizenHappiness >= 90 ? '+20% Bonus' : (citizenHappiness <= 30 ? '-40% Penalty' : 'Normal')}
                </div>
                <hr style="border-color:#1f1f2a; margin:10px 0;">
                <div style="margin-bottom:6px; color:var(--danger-pastel);"><b>${tr('finMaintCost', {amt: tExp.toLocaleString()})}</b></div>
                <div style="margin-left:10px; font-size:0.8rem; color:#ccc;">
                    ${tr('finSubwayExp', {amt: statsRecord.metroExp.toLocaleString()})}<br>
                    ${tr('finBusExp', {amt: statsRecord.busExp.toLocaleString()})}${statsRecord.intermodalExp ? `<br>🏢 ${currentLang === 'es' ? 'Nodos Intermodales (Operación)' : 'Intermodal Hubs (Operations)'}: -$${statsRecord.intermodalExp.toLocaleString()}` : ''}
                </div>
            `;
        }


function toggleTechModal() {
    playAudioClick();
    let modal = document.getElementById('tech-modal');
    if (!modal) return;
    if (modal.style.display === 'block') {
        modal.style.display = 'none';
    } else {
        renderTechModalContent();
        modal.style.display = 'block';
    }
}

function renderTechModalContent() {
    let container = document.getElementById('tech-grid-container');
    if (!container) return;

    let html = '';
    TECH_UPGRADES_CATALOG.forEach(t => {
        let isUnlocked = !!techUpgrades[t.id];
        let name = currentLang === 'es' ? t.nameEs : t.nameEn;
        let desc = currentLang === 'es' ? t.descEs : t.descEn;
        let perk = currentLang === 'es' ? t.perkEs : t.perkEn;
        let canAfford = money >= t.cost;

        let btnHtml = '';
        if (isUnlocked) {
            btnHtml = `<button class="tech-btn-action unlocked-btn" disabled>${tr('techUnlockedBadge')}</button>`;
        } else if (canAfford) {
            btnHtml = `<button class="tech-btn-action" onclick="purchaseTechUpgrade('${t.id}')">${tr('techUnlockBtn', {cost: formatFixedCurrency(t.cost)})}</button>`;
        } else {
            btnHtml = `<button class="tech-btn-action" disabled>${tr('techInsufficientFunds')} (${formatFixedCurrency(t.cost)})</button>`;
        }

        html += `
            <div class="tech-card ${isUnlocked ? 'unlocked' : ''}">
                <div>
                    <div class="tech-header">
                        <div class="tech-icon">${t.icon}</div>
                        <div>
                            <div class="tech-title">${name}</div>
                            <div style="font-size:0.75rem; color:#8b949e; margin-top:2px;">${isUnlocked ? 'âœ“ ' + tr('techUnlockedBadge') : formatFixedCurrency(t.cost)}</div>
                        </div>
                    </div>
                    <div class="tech-desc">${desc}</div>
                    <div class="tech-perk-badge">â˜… ${perk}</div>
                </div>
                <div>${btnHtml}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function purchaseTechUpgrade(techId) {
    let tech = TECH_UPGRADES_CATALOG.find(t => t.id === techId);
    if (!tech || techUpgrades[techId]) return;

    if (money < tech.cost) {
        showStatusToast(currentLang === 'es' ? 'âš ï¸ Fondos pÃºblicos insuficientes' : 'âš ï¸ Insufficient public funds', false, 'var(--danger-pastel)');
        return;
    }

    money -= tech.cost;
    techUpgrades[techId] = true;
    updateMoneyDisplay();
    playAudioMetroChime();

    applyTechUpgradeEffect(techId);
    renderTechModalContent();

    let techName = currentLang === 'es' ? tech.nameEs : tech.nameEn;
    showStatusToast(`âš¡ ${currentLang === 'es' ? 'TecnologÃ­a desbloqueada' : 'Tech unlocked'}: ${techName}!`, false, 'var(--success-pastel)');
}

function applyTechUpgradeEffect(techId) {
    if (techId === 'tech_electric_fleet') {
        citizenHappiness = Math.min(100, citizenHappiness + 6);
        let hapEl = document.getElementById('ui-happiness');
        if (hapEl) hapEl.innerText = `${Math.round(citizenHappiness)}% ðŸ˜Š`;
    } else if (techId === 'tech_butterfly_turnstiles') {
        evasionRate = Math.max(0.02, evasionRate * 0.50);
    } else if (techId === 'tech_fleet_climate') {
        citizenHappiness = Math.min(100, citizenHappiness + 8);
        let hapEl = document.getElementById('ui-happiness');
        if (hapEl) hapEl.innerText = `${Math.round(citizenHappiness)}% ðŸ˜Š`;
    } else if (techId === 'tech_cbtc_signaling') {
        (transportLines.metro || []).forEach(l => {
            l.bonusCapacity = (l.bonusCapacity || 0) + 2;
        });
    }
}

