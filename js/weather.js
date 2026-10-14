/* ==============================================================
   DYNAMIC WEATHER & DAY/NIGHT ATMOSPHERE SYSTEM
   ============================================================== */

        // ==========================================
        // DAILY VARIABLE WEATHER & ATMOSPHERE SYSTEM
        // ==========================================
        const DAILY_WEATHER = {
            1: { type: 'sunny', temp: 28, icon: '☀️', nameEn: 'Sunny', nameEs: 'Soleado' },
            2: { type: 'sunny', temp: 30, icon: '☀️', nameEn: 'Warm', nameEs: 'Cálido' },
            3: { type: 'rain', temp: 13, icon: '🌧️', nameEn: 'Rainstorm', nameEs: 'Lluvia Invernal' },
            4: { type: 'clear', temp: 22, icon: '⛅', nameEn: 'Partly Cloudy', nameEs: 'Parcial' },
            5: { type: 'clear', temp: 25, icon: '☀️', nameEn: 'Clear', nameEs: 'Despejado' },
            6: { type: 'sunny', temp: 28, icon: '☀️', nameEn: 'Sunny', nameEs: 'Soleado' },
            7: { type: 'clear', temp: 24, icon: '⛅', nameEn: 'Mild', nameEs: 'Templado' },
            8: { type: 'hot', temp: 33, icon: '☀️', nameEn: 'Very Hot', nameEs: 'Muy Caluroso' },
            9: { type: 'clear', temp: 25, icon: '⛅', nameEn: 'Clear', nameEs: 'Despejado' },
            10: { type: 'clear', temp: 26, icon: '⛅', nameEn: 'Dry & Breezy', nameEs: 'Seco' },
            11: { type: 'rain', temp: 15, icon: '🌦️', nameEn: 'Light Showers', nameEs: 'Chubascos' },
            12: { type: 'clear', temp: 26, icon: '☀️', nameEn: 'Sunny', nameEs: 'Soleado' },
            13: { type: 'snow', temp: 2, icon: '❄️', nameEn: 'Mountain Snowfall', nameEs: 'Nevada Cordillerana' },
            14: { type: 'sunny', temp: 29, icon: '☀️', nameEn: 'Warm', nameEs: 'Cálido' },
            15: { type: 'clear', temp: 27, icon: '☀️', nameEn: 'Clear', nameEs: 'Despejado' },
            16: { type: 'clear', temp: 25, icon: '⛅', nameEn: 'Pleasant', nameEs: 'Agradable' },
            17: { type: 'sunny', temp: 28, icon: '☀️', nameEn: 'Sunny', nameEs: 'Soleado' },
            18: { type: 'clear', temp: 21, icon: '🌌', nameEn: 'Clear Night', nameEs: 'Noche Despejada' },
            19: { type: 'storm', temp: 11, icon: '⛈️', nameEn: 'Heavy Storm', nameEs: 'Temporal' },
            20: { type: 'rain', temp: 14, icon: '🌧️', nameEn: 'Rainy', nameEs: 'Lluvioso' },
            21: { type: 'clear', temp: 24, icon: '⛅', nameEn: 'Mild & Clean Air', nameEs: 'Aire Limpio' },
            22: { type: 'clear', temp: 25, icon: '☀️', nameEn: 'Clear', nameEs: 'Despejado' },
            23: { type: 'sunny', temp: 30, icon: '☀️', nameEn: 'Warm', nameEs: 'Cálido' },
            24: { type: 'clear', temp: 26, icon: '⛅', nameEn: 'Pleasant', nameEs: 'Agradable' },
            25: { type: 'hot', temp: 35, icon: '☀️', nameEn: 'Intense Heat', nameEs: 'Calor Intenso' },
            26: { type: 'heatwave', temp: 38, icon: '🔥', nameEn: 'Extreme Heatwave', nameEs: 'Ola de Calor' },
            27: { type: 'rain', temp: 18, icon: '🌦️', nameEn: 'Summer Rain', nameEs: 'Lluvia de Verano' },
            28: { type: 'clear', temp: 24, icon: '⛅', nameEn: 'Mild', nameEs: 'Templado' },
            29: { type: 'clear', temp: 25, icon: '☀️', nameEn: 'Clear', nameEs: 'Despejado' },
            30: { type: 'sunny', temp: 27, icon: '☀️', nameEn: 'Sunny', nameEs: 'Soleado' },
            31: { type: 'sunny', temp: 29, icon: '☀️', nameEn: 'Warm & Fair', nameEs: 'Buen Tiempo' }
        };

        let currentWeatherState = 'clear';
        let rainDrops = [];
        let weatherCanvas = null;
        let weatherCtx = null;

        function initWeatherSystem() {
            weatherCanvas = document.getElementById('weather-canvas');
            if (!weatherCanvas) return;
            weatherCtx = weatherCanvas.getContext('2d');
            resizeWeatherCanvas();
            window.addEventListener('resize', resizeWeatherCanvas);

            // 1. Rain Drops
            rainDrops = [];
            for (let i = 0; i < 160; i++) {
                rainDrops.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    length: 12 + Math.random() * 14,
                    speed: 16 + Math.random() * 12
                });
            }

            // 2. Snowflakes
            snowFlakes = [];
            for (let i = 0; i < 140; i++) {
                snowFlakes.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    r: 1.2 + Math.random() * 2.6,
                    speed: 1.0 + Math.random() * 1.8,
                    wobble: Math.random() * Math.PI * 2,
                    wobbleSpeed: 0.02 + Math.random() * 0.03,
                    alpha: 0.45 + Math.random() * 0.45
                });
            }

            // 3. Heat Shimmer Waves ("ondas calurosas")
            heatWaves = [];
            for (let i = 0; i < 9; i++) {
                heatWaves.push({
                    y: Math.random() * window.innerHeight,
                    speed: 0.65 + Math.random() * 0.95,
                    amplitude: 5 + Math.random() * 6,
                    wavelength: 0.012 + Math.random() * 0.008,
                    alpha: 0.06 + Math.random() * 0.08,
                    phase: Math.random() * Math.PI * 2,
                    thickness: 2.0 + Math.random() * 1.5
                });
            }

            animateWeather();
        }

        let rainSplashes = [];
        let snowFlakes = [];
        let heatWaves = [];
        let weatherAnimTime = 0;
        let currentLiveTemperature = 25;
        let currentWeatherIntensity = 0;

        function resizeWeatherCanvas() {
            if (!weatherCanvas) return;
            weatherCanvas.width = window.innerWidth;
            weatherCanvas.height = window.innerHeight;
        }

        function animateWeather() {
            if (weatherCtx && weatherCanvas) {
                weatherCtx.clearRect(0, 0, weatherCanvas.width, weatherCanvas.height);
                weatherAnimTime++;

                // --- A. LLUVIA Y TEMPORAL (RAIN & STORM) ---
                if (currentWeatherState === 'rain' || currentWeatherState === 'storm') {
                    let isStorm = currentWeatherState === 'storm';
                    weatherCtx.strokeStyle = isStorm ? 'rgba(195, 230, 255, 0.78)' : 'rgba(170, 215, 255, 0.55)';
                    weatherCtx.lineWidth = isStorm ? 1.6 : 1.1;

                    weatherCtx.beginPath();
                    for (let i = 0; i < rainDrops.length; i++) {
                        let d = rainDrops[i];
                        weatherCtx.moveTo(d.x, d.y);
                        weatherCtx.lineTo(d.x - 2.2, d.y + d.length);

                        d.y += d.speed;
                        d.x -= 1.3;
                        if (d.y > weatherCanvas.height) {
                            if (Math.random() < 0.25 && rainSplashes.length < 25) {
                                rainSplashes.push({ x: d.x, y: weatherCanvas.height - (Math.random() * 30), r: 1, maxR: 5 + Math.random() * 6, alpha: 0.5 });
                            }
                            d.y = -20;
                            d.x = Math.random() * (weatherCanvas.width + 50);
                        }
                    }
                    weatherCtx.stroke();

                    // Puddle ripples / splashes
                    if (rainSplashes.length > 0) {
                        weatherCtx.save();
                        for (let s = rainSplashes.length - 1; s >= 0; s--) {
                            let sp = rainSplashes[s];
                            weatherCtx.beginPath();
                            weatherCtx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
                            weatherCtx.strokeStyle = `rgba(180, 220, 255, ${sp.alpha})`;
                            weatherCtx.lineWidth = 0.8;
                            weatherCtx.stroke();
                            sp.r += 0.6;
                            sp.alpha -= 0.04;
                            if (sp.alpha <= 0) rainSplashes.splice(s, 1);
                        }
                        weatherCtx.restore();
                    }

                    // Storm lightning flash
                    if (isStorm && Math.random() < 0.003) {
                        weatherCtx.fillStyle = 'rgba(255, 255, 255, 0.28)';
                        weatherCtx.fillRect(0, 0, weatherCanvas.width, weatherCanvas.height);
                        playAudioRumble();
                    }
                }

                // --- B. NIEVE EXTREMA / NEVADA (SNOW) ---
                else if (currentWeatherState === 'snow') {
                    weatherCtx.save();
                    for (let i = 0; i < snowFlakes.length; i++) {
                        let s = snowFlakes[i];
                        weatherCtx.beginPath();
                        weatherCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                        weatherCtx.fillStyle = `rgba(235, 245, 255, ${s.alpha})`;
                        weatherCtx.shadowColor = 'rgba(200, 230, 255, 0.5)';
                        weatherCtx.shadowBlur = 4;
                        weatherCtx.fill();

                        s.wobble += s.wobbleSpeed;
                        s.x += Math.sin(s.wobble) * 1.2;
                        s.y += s.speed;
                        if (s.y > weatherCanvas.height) {
                            s.y = -10;
                            s.x = Math.random() * weatherCanvas.width;
                        }
                        if (s.x > weatherCanvas.width + 10) s.x = -10;
                        else if (s.x < -10) s.x = weatherCanvas.width + 10;
                    }
                    weatherCtx.restore();
                }

                // --- C. CALOR EXTREMO 34°C+ / ONDAS CALUROSAS (HEAT SHIMMER WAVES) ---
                else if (currentWeatherState === 'heatwave' || (currentWeatherState === 'hot' && currentLiveTemperature >= 32)) {
                    let intensity = Math.min(1.0, Math.max(0.35, (currentLiveTemperature - 31) / 7.0));
                    weatherCtx.save();

                    for (let w = 0; w < heatWaves.length; w++) {
                        let hw = heatWaves[w];
                        weatherCtx.beginPath();
                        let steps = 24;
                        let stepX = weatherCanvas.width / steps;

                        for (let s = 0; s <= steps; s++) {
                            let curX = s * stepX;
                            let curY = hw.y + Math.sin((curX * hw.wavelength) + (weatherAnimTime * 0.035) + hw.phase) * hw.amplitude;
                            if (s === 0) weatherCtx.moveTo(curX, curY);
                            else weatherCtx.lineTo(curX, curY);
                        }

                        let waveAlpha = (hw.alpha * intensity).toFixed(3);
                        weatherCtx.strokeStyle = `rgba(255, 140, 25, ${waveAlpha})`;
                        weatherCtx.lineWidth = hw.thickness;
                        weatherCtx.stroke();

                        hw.y -= hw.speed;
                        if (hw.y < -30) {
                            hw.y = weatherCanvas.height + (Math.random() * 40);
                            hw.alpha = 0.06 + Math.random() * 0.08;
                            hw.phase = Math.random() * Math.PI * 2;
                        }
                    }
                    weatherCtx.restore();
                }
            }
            requestAnimationFrame(animateWeather);
        }

        function updateLiveDynamicWeather() {
            let baseW = DAILY_WEATHER[simDayOfMonth] || { type: 'clear', temp: 24, nameEn: 'Clear', nameEs: 'Despejado' };

            // Diurnal thermal wave (Lowest at 05:00, peak heat at 15:30)
            let hourFrac = simHour + (simMinute / 60);
            let tempDelta = Math.sin((hourFrac - 9) * Math.PI / 12) * 5.0;
            currentLiveTemperature = Math.round(baseW.temp + tempDelta);

            let calculatedType = baseW.type;

            // Extreme weather evaluation
            if (baseW.type === 'snow' || (baseW.type === 'rain' && currentLiveTemperature <= 2) || (baseW.temp <= 6 && currentLiveTemperature <= 3)) {
                calculatedType = 'snow';
            } else if (currentLiveTemperature >= 34) {
                calculatedType = 'heatwave';
            } else if (baseW.type === 'hot' && currentLiveTemperature >= 31) {
                calculatedType = 'hot';
            } else if (baseW.type === 'rain' || baseW.type === 'storm') {
                calculatedType = baseW.type;
            } else if (baseW.type === 'sunny' && currentLiveTemperature >= 26) {
                calculatedType = 'sunny';
            } else {
                calculatedType = 'clear';
            }

            applyWeatherAtmosphere(calculatedType, currentLiveTemperature);
        }

        function applyWeatherAtmosphere(weatherType, tempVal) {
            currentWeatherState = weatherType;
            let temp = tempVal !== undefined ? tempVal : (DAILY_WEATHER[simDayOfMonth] ? DAILY_WEATHER[simDayOfMonth].temp : 24);
            currentLiveTemperature = temp;

            let overlay = document.getElementById('weather-ambient-overlay');
            let weatherSub = document.getElementById('ui-weather-sub');

            // 1. Calor Extremo & Ola de Calor (34°C+)
            if (weatherType === 'heatwave') {
                let intensity = Math.min(1.0, Math.max(0.3, (temp - 33) / 6.0));
                currentWeatherIntensity = intensity;
                let alpha = 0.10 + (0.08 * intensity);
                if (overlay) {
                    overlay.style.background = `radial-gradient(ellipse at 50% 18%, rgba(255, 120, 0, ${alpha}) 0%, rgba(220, 75, 0, ${alpha * 0.4}) 65%, transparent 100%)`;
                }
                if (weatherSub) {
                    let label = currentLang === 'es' ? 'OLA DE CALOR 🔥' : 'HEATWAVE 🔥';
                    weatherSub.innerText = `SANTIAGO (${temp}°C) ${label}`;
                    weatherSub.style.color = '#ff9436';
                }
                rainSpeedFactor = 1.0;
                setRainSoundActive(false);
            } 
            // 2. Cálido / Caluroso (30-33°C)
            else if (weatherType === 'hot') {
                currentWeatherIntensity = 0.35;
                if (overlay) {
                    overlay.style.background = 'radial-gradient(ellipse at 50% 18%, rgba(255, 140, 20, 0.06) 0%, transparent 60%)';
                }
                if (weatherSub) {
                    let label = currentLang === 'es' ? 'CALUROSO ☀️' : 'VERY HOT ☀️';
                    weatherSub.innerText = `SANTIAGO (${temp}°C) ${label}`;
                    weatherSub.style.color = '#ffb84d';
                }
                rainSpeedFactor = 1.0;
                setRainSoundActive(false);
            } 
            // 3. Nieve & Nevada Cordillerana (< 4°C)
            else if (weatherType === 'snow') {
                let intensity = Math.min(1.0, Math.max(0.3, (5 - temp) / 6.0));
                currentWeatherIntensity = intensity;
                let alpha = 0.10 + (0.07 * intensity);
                if (overlay) {
                    overlay.style.background = `radial-gradient(ellipse at 50% 30%, rgba(185, 225, 255, ${alpha}) 0%, rgba(150, 200, 245, ${alpha * 0.4}) 70%, transparent 100%)`;
                }
                if (weatherSub) {
                    let label = currentLang === 'es' ? 'NEVADA ❄️' : 'SNOWFALL ❄️';
                    weatherSub.innerText = `SANTIAGO (${temp}°C) ${label}`;
                    weatherSub.style.color = '#a0d8ef';
                }
                rainSpeedFactor = 0.75;
                setRainSoundActive(false);
            } 
            // 4. Lluvia y Temporal
            else if (weatherType === 'rain' || weatherType === 'storm') {
                currentWeatherIntensity = weatherType === 'storm' ? 1.0 : 0.6;
                let bg = weatherType === 'storm' ? 'rgba(8, 18, 38, 0.35)' : 'rgba(12, 24, 46, 0.22)';
                if (overlay) overlay.style.background = bg;
                if (weatherSub) {
                    let label = weatherType === 'storm' 
                        ? (currentLang === 'es' ? 'TEMPORAL ⛈️' : 'STORM ⛈️') 
                        : (currentLang === 'es' ? 'LLUVIA 🌧️' : 'RAIN 🌧️');
                    weatherSub.innerText = `SANTIAGO (${temp}°C) ${label}`;
                    weatherSub.style.color = '#7bc5ff';
                }
                rainSpeedFactor = 0.65;
                setRainSoundActive(true);
            } 
            // 5. Despejado y Soleado (Normal)
            else {
                currentWeatherIntensity = 0;
                if (overlay) overlay.style.background = 'transparent';
                if (weatherSub) {
                    let icon = weatherType === 'sunny' ? '☀️' : '⛅';
                    let label = weatherType === 'sunny'
                        ? (currentLang === 'es' ? 'SOLEADO' : 'SUNNY')
                        : (currentLang === 'es' ? 'DESPEJADO' : 'CLEAR');
                    weatherSub.innerText = `SANTIAGO (${temp}°C) ${icon} ${label}`;
                    weatherSub.style.color = 'var(--accent)';
                }
                rainSpeedFactor = 1.0;
                setRainSoundActive(false);
            }
        }

        const RANDOM_MINI_EVENTS = [
            {
                id: 'mini_music',
                icon: '🎸',
                titleEn: 'Acoustic Duo at Baquedano Station',
                titleEs: 'Dúo Acústico en Estación Baquedano',
                descEn: 'A live acoustic duo performs in the mezzanine, cheering commuters.',
                descEs: 'Una banda acústica toca en la mezanina central deleitando a los pasajeros.',
                effectEn: 'Citizen approval +4% • Local station ridership +15%',
                effectEs: 'Aprobación ciudadana +4% • Afluencia local en la estación +15%',
                apply: () => { citizenHappiness = Math.min(100, citizenHappiness + 4); }
            },
            {
                id: 'mini_ciclovia',
                icon: '🚲',
                titleEn: 'Sunday Ciclovía on Andrés Bello',
                titleEs: 'Ciclovía Recreativa Dominical',
                descEn: 'Avenue converted for bikes and pedestrians. Street congestion drops.',
                descEs: 'Avenida convertida en ciclovía dominical. El tráfico de autos particulares disminuye.',
                effectEn: 'Private road traffic -20% • Transit approval +5%',
                effectEs: 'Tráfico de autos particulares -20% • Aprobación ciudadana +5%',
                apply: () => { citizenHappiness = Math.min(100, citizenHappiness + 5); }
            },
            {
                id: 'mini_inspectors',
                icon: '👮',
                titleEn: 'Fare Inspector Sweeps',
                titleEs: 'Control Masivo de Fiscalización',
                descEn: 'Inspectors check bip! cards across major corridors, reducing evasion.',
                descEs: 'Fiscalizadores verifican tarjetas bip! en los troncales principales.',
                effectEn: 'Fare evasion halved for today • +$750,000 recovered funds',
                effectEs: 'Evasión reducida a la mitad por hoy • +$750.000 fondos recuperados',
                apply: () => { evasionRate = Math.max(0.04, evasionRate * 0.5); money += 750000; }
            },
            {
                id: 'mini_traffic_light',
                icon: '🚦',
                titleEn: 'Providencia Traffic Light Outage',
                titleEs: 'Falla de Semáforo en Providencia',
                descEn: 'Brief electrical outage causes minor intersection delays in Providencia.',
                descEs: 'Falla de energía intermitente descalibra los semáforos de un cruce clave en Providencia.',
                effectEn: 'Street bus traffic slowed by -15% • Temporary -2% approval',
                effectEs: 'Buses en calle ralentizados un -15% • Ligera molestia (-2% aprobación)',
                apply: () => { citizenHappiness = Math.max(10, citizenHappiness - 2); }
            },
            {
                id: 'mini_heritage',
                icon: '🏛️',
                titleEn: 'Santiago Heritage Day',
                titleEs: 'Día del Patrimonio Cultural',
                descEn: 'Historic monuments open with free tours, bringing crowds to city center.',
                descEs: 'Edificios históricos abren sus puertas al público trayendo miles de visitantes.',
                effectEn: 'Central passenger demand +35% • +$2,500,000 municipal grant',
                effectEs: 'Demanda de pasajeros en el centro +35% • +$2.500.000 subsidio municipal',
                apply: () => { money += 2500000; citizenHappiness = Math.min(100, citizenHappiness + 5); }
            },
            {
                id: 'mini_marathon',
                icon: '🏃',
                titleEn: 'Santiago 10K City Run',
                titleEs: 'Corrida 10K de Santiago',
                descEn: 'Athletes run along major avenues. Surface traffic shifts to subway.',
                descEs: 'Corredores llenan las principales avenidas. El tráfico se desvía hacia el Metro.',
                effectEn: 'Subway passenger demand +45% for today',
                effectEs: 'Demanda de pasajeros en Metro +45% durante hoy',
                apply: () => { currentEventDemandBoost = 1.45; }
            },
            {
                id: 'mini_green_energy',
                icon: '🌱',
                titleEn: 'Clean Energy Power Rebate',
                titleEs: 'Subsidio de Energía Limpia',
                descEn: 'Regional grid grants a rebate for 100% electrified rail transit.',
                descEs: 'La red eléctrica otorga un descuento fiscal por el uso de tracción eléctrica limpia.',
                effectEn: 'Subway electricity operational costs -30% today',
                effectEs: 'Costos de electricidad del Metro -30% durante hoy',
                apply: () => { currentEventFleetExpMultiplier = 0.70; }
            },
            {
                id: 'mini_street_fair',
                icon: '🍉',
                titleEn: 'Neighborhood Street Market',
                titleEs: 'Feria Barrial Costumbrista',
                descEn: 'Local farmers market fills streets in Recoleta and Independencia.',
                descEs: 'Una concurrida feria libre llena de vecinos las calles de Recoleta e Independencia.',
                effectEn: 'Northern ring bus line ridership +25%',
                effectEs: 'Afluencia de pasajeros en buses del sector norte +25%',
                apply: () => { citizenHappiness = Math.min(100, citizenHappiness + 3); }
            }
        ];

        function triggerRandomMiniEvent() {
            let evt = RANDOM_MINI_EVENTS[Math.floor(Math.random() * RANDOM_MINI_EVENTS.length)];
            if (!evt) return;
            evt.apply();
            playAudioNotification();
            let title = currentLang === 'es' ? evt.titleEs : evt.titleEn;
            let eff = currentLang === 'es' ? evt.effectEs : evt.effectEn;
            showStatusToast(`${evt.icon} ${title} — ${eff}`);
        }

// --- OPTION 3: DYNAMIC DAY / DUSK / NIGHT ATMOSPHERE ---
let cfgDayNightCycleActive = true;
let manualDayNightOverride = null; // null for auto, or 'dawn' | 'day' | 'dusk' | 'night'
let currentNightLightsState = false;

function updateDayNightAtmosphere() {
    let overlay = document.getElementById('day-night-overlay');
    let badge = document.getElementById('ui-day-night-icon');
    if (!overlay) return;

    if (!cfgDayNightCycleActive) {
        overlay.style.background = 'transparent';
        if (badge) badge.innerText = '☀️';
        setNightLightsActive(false);
        return;
    }

    let mode = manualDayNightOverride;
    if (!mode) {
        let h = simHour;
        let m = simMinute;
        let hFrac = h + (m / 60);

        if (hFrac >= 6.0 && hFrac < 8.0) {
            mode = 'dawn';
        } else if (hFrac >= 8.0 && hFrac < 18.0) {
            mode = 'day';
        } else if (hFrac >= 18.0 && hFrac < 20.5) {
            mode = 'dusk';
        } else {
            mode = 'night';
        }
    }

    let bgStyle = 'transparent';
    let icon = '☀️';
    let isNight = false;

    if (mode === 'dawn') {
        bgStyle = 'rgba(255, 175, 75, 0.12)';
        icon = '🌅';
        isNight = false;
    } else if (mode === 'day') {
        bgStyle = 'rgba(0, 0, 0, 0)';
        icon = '☀️';
        isNight = false;
    } else if (mode === 'dusk') {
        bgStyle = 'rgba(255, 115, 35, 0.08)';
        icon = '🌆';
        isNight = false;
    } else { // night
        bgStyle = 'rgba(6, 12, 28, 0.50)';
        icon = '🌙';
        isNight = true;
    }

    overlay.style.background = bgStyle;
    if (badge) {
        badge.innerText = icon;
        let lbl = mode === 'dawn' ? tr('timeDawn') : (mode === 'day' ? tr('timeDay') : (mode === 'dusk' ? tr('timeDusk') : tr('timeNight')));
        badge.title = `${lbl} (${simHour}:${simMinute < 10 ? '0' + simMinute : simMinute})`;
    }

    setNightLightsActive(isNight);
}

function setNightLightsActive(isNight) {
    if (currentNightLightsState === isNight) return;
    currentNightLightsState = isNight;

    document.querySelectorAll('.station-white-dot').forEach(el => {
        el.classList.toggle('night-glow-station', isNight);
    });
    document.querySelectorAll('.metro-wagon-body').forEach(el => {
        el.classList.toggle('night-headlight-metro', isNight);
    });
    document.querySelectorAll('.bus-wagon-body').forEach(el => {
        el.classList.toggle('night-headlight-bus', isNight);
    });
}

function cycleDayNightManual() {
    playAudioClick();
    const cycle = [null, 'dawn', 'day', 'dusk', 'night'];
    let curIdx = cycle.indexOf(manualDayNightOverride);
    manualDayNightOverride = cycle[(curIdx + 1) % cycle.length];
    updateDayNightAtmosphere();
    let label = manualDayNightOverride 
        ? (manualDayNightOverride.toUpperCase() + ' (Manual Lock)') 
        : 'AUTOMATIC SIMULATION TIME';
    showStatusToast(`⏰ Sky Atmosphere: ${label}`, false, 'var(--accent)');
}

function toggleDayNightCycleSetting(enabled) {
    cfgDayNightCycleActive = enabled;
    updateDayNightAtmosphere();
}

