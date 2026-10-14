/* ==============================================================
   SIMULATION ENGINE (CROWDS, VEHICLE TRAFFIC & GAME LOOP)
   ============================================================== */

 
let trafficCars = [];
let MAX_CARS = 380; 


        function getRandomStreetInZoneWeighted() {
            let category, street, start, p;
            for(let i=0; i<150; i++) {
                let r = Math.random();
                if (r < 0.60 && realStreetsData.high.length > 0) category = realStreetsData.high;
                else if (r < 0.85 && realStreetsData.medium.length > 0) category = realStreetsData.medium;
                else if (realStreetsData.low.length > 0) category = realStreetsData.low;
                else category = realStreetsData.high.length > 0 ? realStreetsData.high : realStreetsData.all; 

                if(!category || category.length === 0) continue;

                street = category[Math.floor(Math.random() * category.length)];
                start = Math.floor(Math.random() * (street.length - 1));
                p = L.latLng(street[start]);

                if (isPointInActiveZone(p)) {
                    return { road: street, segment: start, point: p };
                }
            }
            return null;
        }

        function spawnCar() {
            if (realStreetsData.all.length === 0) return;
            let pos = getRandomStreetInZoneWeighted();
            if (!pos) return;

            let icon = L.divIcon({ className: 'car-wrapper', html: `<div class="car-square"></div>`, iconSize: [3, 3], iconAnchor: [1, 1] });
            let marker = L.marker(pos.point, { icon: icon, interactive: false, zIndexOffset: 100 }).addTo(map);

            trafficCars.push({ 
                road: pos.road, segment: pos.segment, dir: 1, progress: 0, 
                speed: (35 + (Math.random() * 35)) * 1.10, marker: marker, 
                fading: false, visitedRoads: []
            });
        }

        function despawnCarWithFade(car, idx) {
            if (car.fading) return;
            car.fading = true;
            let el = car.marker.getElement();
            if (el) {
                el.classList.add('car-despawn');
                setTimeout(() => {
                    let pos = trafficCars.indexOf(car);
                    if (pos > -1) {
                        map.removeLayer(car.marker);
                        trafficCars.splice(pos, 1);
                        spawnCar();
                    }
                }, 500);
            } else {
                map.removeLayer(car.marker);
                let pos = trafficCars.indexOf(car);
                if (pos > -1) trafficCars.splice(pos, 1);
                spawnCar();
            }
        }


        function getPointAtMeters(coords, dists, total, targetMeters) {
            if (!coords || coords.length === 0) return null;
            if (coords.length === 1 || targetMeters <= 0) {
                let p0 = coords[0], p1 = coords[1] || coords[0];
                return { latlng: p0, tangent: [p1[0] - p0[0], p1[1] - p0[1]] };
            }
            if (targetMeters >= total) {
                let pLast = coords[coords.length - 1];
                let pPrev = coords[coords.length - 2] || pLast;
                return { latlng: pLast, tangent: [pLast[0] - pPrev[0], pLast[1] - pPrev[1]] };
            }

            let cur = 0;
            for (let i = 0; i < dists.length; i++) {
                if (cur + dists[i] >= targetMeters) {
                    let segD = dists[i];
                    let frac = segD > 0 ? (targetMeters - cur) / segD : 0;
                    let p0 = coords[i];
                    let p1 = coords[i+1];
                    let lat = p0[0] + (p1[0] - p0[0]) * frac;
                    let lng = p0[1] + (p1[1] - p0[1]) * frac;
                    return { latlng: [lat, lng], tangent: [p1[0] - p0[0], p1[1] - p0[1]] };
                }
                cur += dists[i];
            }
            let pEnd = coords[coords.length - 1];
            return { latlng: pEnd, tangent: [0, 1] };
        }

        function renderPassengerDots(count, maxCapacity) {
            let dots = '';
            let isFull = count >= maxCapacity;
            let numDots = 10;
            let activeDots = Math.round((count / (maxCapacity || 1)) * numDots);
            for (let i = 0; i < numDots; i++) {
                if (i < activeDots) {
                    dots += `<div class="passenger-dot ${isFull ? 'full' : 'occ'}"></div>`;
                } else {
                    dots += `<div class="passenger-dot"></div>`;
                }
            }
            return dots;
        }

        function openTrainInspector(net, trainObj) {
            if (trainObj.state === 'waiting_dispatch' || trainObj.state === 'depot') {
                showStatusToast(currentLang === 'es' ? '⏳ Convoy en cocheras / mantenimiento...' : '⏳ Convoy in depot: maintenance or awaiting dispatch...', false, net.color);
                return;
            }
            trackVehicle(trainObj, net, 'metro');
        }

        function openBusInspector(net, busObj) {
            if (busObj.state === 'depot') {
                showStatusToast(currentLang === 'es' ? '⏳ Bus en taller / mantenimiento.' : '⏳ Bus in depot / repair bay.', false, net.color);
                return;
            }
            trackVehicle(busObj, net, 'bus');
        }

        function executeStationExchange(st, vehicleObj, net, maxCapacity) {
            if (!st) return;
            let revMultiplier = st.revMultiplier || 1.0;

            let currentFare = net.type === 'metro'
                ? (isRushHour() ? tariffConfig.metroPeak : tariffConfig.metroOff)
                : tariffConfig.busFlat;

            let collectedPerPax = currentFare * (1 - evasionRate) * revMultiplier;

            let totalAlighted = 0;
            for (let w = 0; w < (vehicleObj.wagonsPassengers ? vehicleObj.wagonsPassengers.length : 1); w++) {
                let currentPass = vehicleObj.wagonsPassengers ? vehicleObj.wagonsPassengers[w] : vehicleObj.passengers;
                if (currentPass > 0) {
                    let leaveRatio = vehicleObj.retiring ? 1.0 : (0.40 + (Math.random() * 0.35));
                    let leave = Math.ceil(currentPass * leaveRatio);
                    totalAlighted += leave;
                    let lineRevenue = Math.floor(leave * collectedPerPax);

                    if (vehicleObj.wagonsPassengers) {
                        vehicleObj.wagonsPassengers[w] = Math.max(0, vehicleObj.wagonsPassengers[w] - leave);
                        statsRecord.metroRev += lineRevenue;
                    } else {
                        vehicleObj.passengers = Math.max(0, vehicleObj.passengers - leave);
                        statsRecord.busRev += lineRevenue;
                    }

                    net.dailyEarningsCurrent = (net.dailyEarningsCurrent || 0) + lineRevenue;
                    st.revenueThisMonth = (st.revenueThisMonth || 0) + lineRevenue;
                }
            }

            // Combination Hub transfer mechanic: 25% of alighted passengers transfer to intersecting metro lines
            if (st.lines && st.lines.length >= 2 && totalAlighted > 0 && !vehicleObj.retiring) {
                let otherLines = st.lines.filter(lId => lId !== net.id);
                if (otherLines.length > 0) {
                    let transferPax = Math.floor(totalAlighted * 0.25);
                    let perLine = Math.floor(transferPax / otherLines.length);
                    if (perLine > 0) {
                        otherLines.forEach(lId => {
                            st.passengersByLine[lId] = (st.passengersByLine[lId] || 0) + perLine;
                        });
                        updateStationBadge(st);
                    }
                }
            }

            if (activeLineId === net.id) renderLineDetailContent();
            if (currentSidePanelType === 'station' && currentSelectedStation && currentSelectedStation.id === st.id) {
                openSideStationPanel(st);
            }

            let totalBoarded = 0;
            if (!vehicleObj.retiring) {
                let waitingForThisLine = (st.passengersByLine[net.id] || 0) + (st.passengersByLine['default'] || 0);
                if (waitingForThisLine > 0) {
                    if (vehicleObj.wagonsPassengers) {
                        for (let w = 0; w < 3; w++) {
                            let spaceAvailable = maxCapacity - vehicleObj.wagonsPassengers[w];
                            if (spaceAvailable > 0 && waitingForThisLine > 0) {
                                let canEnter = Math.min(spaceAvailable, waitingForThisLine);
                                vehicleObj.wagonsPassengers[w] += canEnter;
                                waitingForThisLine -= canEnter;
                                totalBoarded += canEnter;
                            }
                        }
                    } else {
                        let space = (15 + (net.bonusCapacity || 0)) - vehicleObj.passengers;
                        let canEnter = Math.min(space, waitingForThisLine);
                        vehicleObj.passengers += canEnter;
                        totalBoarded += canEnter;
                    }

                    st.passengersByLine[net.id] = Math.max(0, (st.passengersByLine[net.id] || 0) - totalBoarded);
                    delete st.passengersByLine['default'];
                    updateStationBadge(st);
                }
            }

            // Dynamic Dwell Time (1.5s to 6.0s depending smoothly on passenger volume exchanged)
            let totalExchanged = totalAlighted + totalBoarded;
            let dynamicWait = Math.min(6.0, Math.max(1.5, 1.5 + (totalExchanged * 0.12)));
            vehicleObj.wait = dynamicWait;
            vehicleObj.initialWait = dynamicWait;
            vehicleObj.departureAlertPlayed = false;

            // Train Soundscape: ONLY plays when player has this train selected!
            if (activeTrackedVehicle && activeTrackedVehicle.vehicle && activeTrackedVehicle.vehicle.id === vehicleObj.id) {
                playMetroBrakeHiss();
                setTimeout(() => {
                    if (activeTrackedVehicle && activeTrackedVehicle.vehicle && activeTrackedVehicle.vehicle.id === vehicleObj.id) {
                        playMetroStationArrivalChime();
                    }
                }, 140);
            }
        }

        let passengerCrowdAccumulator = 0;
        let pidsUpdateAccumulator = 0;

        function getHourlyRegimeMultiplier() {
            let h = simHour + (simMinute / 60);
            let isWeekday = simDayIndex >= 1 && simDayIndex <= 5;
            
            if (isWeekday) {
                // Hora Punta Mañana (07:00 a 09:30, pico máximo 08:00 - 08:30)
                if (h >= 7.0 && h < 9.5) {
                    let progress = 1 - Math.abs(h - 8.2) / 1.25;
                    return 2.2 + progress * 0.9; // 2.2x a 3.1x
                }
                // Hora Punta Tarde (17:30 a 20:30, pico máximo 18:30 - 19:30)
                if (h >= 17.5 && h < 20.5) {
                    let progress = 1 - Math.abs(h - 19.0) / 1.5;
                    return 2.4 + progress * 0.9; // 2.4x a 3.3x
                }
                // Mediodía / Almuerzo (12:30 a 14:30)
                if (h >= 12.5 && h < 14.5) {
                    return 1.45;
                }
                // Horas valle diurnas normales (06:00 a 22:00)
                if (h >= 6.0 && h < 22.0) {
                    return 1.15;
                }
                // Madrugada / Noche baja (22:00 a 05:30)
                if (h >= 22.0 || h < 5.5) {
                    return 0.18;
                }
                return 0.75;
            } else {
                // Fin de semana: tráfico más relajado en la mañana, activo en la tarde (12:00 - 20:00)
                if (h >= 12.0 && h < 20.0) return 1.55;
                if (h >= 9.0 && h < 22.0) return 1.10;
                if (h >= 22.0 || h < 7.0) return 0.20;
                return 0.65;
            }
        }

        function scheduleNextStationArrival(st) {
            let attr = getStationAttraction(st); // 10 to 200
            let isPeak = isRushHour();
            let isLow = isNightLowHour();
            let regimeMult = typeof getHourlyRegimeMultiplier === 'function' ? getHourlyRegimeMultiplier() : (isPeak ? 2.5 : (isLow ? 0.22 : 1.0));
            let eventBoost = (currentEventDemandBoost || 1.0);
            let turnstileMult = st.hasTurnstiles ? 1.25 : 1.0;

            // Tamaño de grupo y cadencia variable en el tiempo según la atracción y hora:
            // a veces cada 1 segundo 1 persona, a veces cada 6 segundos 4 personas, o ráfagas mayores!
            let maxBurst = Math.max(1, Math.round((attr / 24) * regimeMult * turnstileMult * eventBoost));
            let roll = Math.random();
            let incomingPax = 1;
            let nextDelay = 3.0; // segundos hasta la próxima llegada

            if (roll < 0.38) {
                // Entrada individual (+1 persona cada 0.8 a 2.5 segundos según atracción de la estación)
                incomingPax = 1;
                let basePacing = (attr >= 120 && regimeMult >= 1.4) ? (0.7 + Math.random() * 0.8) : (1.4 + Math.random() * 2.2);
                nextDelay = Math.max(0.6, basePacing / (turnstileMult * Math.sqrt(Math.max(0.2, regimeMult))));
            } else if (roll < 0.74) {
                // Grupo moderado (+2 a +4 personas cada 3 a 6.5 segundos, ej: 4 personas cada 6 segundos)
                let medCap = Math.max(2, Math.min(4, Math.floor(maxBurst * 0.65)));
                incomingPax = Math.floor(2 + Math.random() * (medCap - 1));
                let basePacing = 3.2 + Math.random() * 3.3; // ~3.2s a 6.5s
                nextDelay = Math.max(1.4, basePacing / Math.sqrt(Math.max(0.2, regimeMult)));
            } else {
                // Oleada grande (+4 a +X pasajeros cada 5 a 10 segundos en estaciones de alta atracción)
                let highMin = Math.min(4, maxBurst);
                incomingPax = Math.floor(highMin + Math.random() * (maxBurst - highMin + 1));
                let basePacing = 5.0 + Math.random() * 5.0; // ~5s a 10s
                nextDelay = Math.max(2.5, basePacing / Math.sqrt(Math.max(0.2, regimeMult)));
            }

            st.nextArrivalBatch = incomingPax;
            st.nextArrivalDelay = nextDelay;
            st.arrivalTimer = 0;
        }

        function tickStationCrowdSimulation(dt) {
            if (isGamePaused) return;
            if (typeof dt !== 'number') dt = 0.05;

            let isPeak = isRushHour();
            let isLow = isNightLowHour();
            let regimeMult = typeof getHourlyRegimeMultiplier === 'function' ? getHourlyRegimeMultiplier() : (isPeak ? 2.5 : (isLow ? 0.22 : 1.0));
            let eventBoost = (currentEventDemandBoost || 1.0);

            allStations.forEach(st => {
                if (!st.lines || st.lines.length === 0) return;
                let attr = getStationAttraction(st); // 10 to 200
                let maxCap = st.maxCapacity || (100 + ((st.level || 1) - 1) * 50);
                let currentPax = Object.values(st.passengersByLine || {}).reduce((a, b) => a + b, 0);
                let turnstileMult = st.hasTurnstiles ? 1.25 : 1.0;

                // Inicializar delay escalonado para que cada estación tenga su propio ciclo asíncrono
                if (typeof st.arrivalTimer === 'undefined' || typeof st.nextArrivalDelay === 'undefined') {
                    scheduleNextStationArrival(st);
                    st.arrivalTimer = Math.random() * st.nextArrivalDelay;
                }

                st.arrivalTimer += dt;
                if (st.arrivalTimer < st.nextArrivalDelay) return;

                let incomingPax = st.nextArrivalBatch || 1;
                scheduleNextStationArrival(st);

                // Probabilidad de momento de calma estocástico (sobre todo en horas valle/noche)
                let arrivalProbability = Math.min(0.96, 0.45 + (attr / 260) * Math.min(2.0, regimeMult));
                if (Math.random() > arrivalProbability) return;

                // Respetar capacidad máxima del andén
                if (currentPax + incomingPax > maxCap) {
                    incomingPax = Math.max(0, maxCap - currentPax);
                }

                if (incomingPax > 0) {
                    if (st.lines.length === 1) {
                        let lId = st.lines[0];
                        st.passengersByLine[lId] = (st.passengersByLine[lId] || 0) + incomingPax;
                    } else {
                        let perLine = Math.floor(incomingPax / st.lines.length);
                        let rem = incomingPax % st.lines.length;
                        st.lines.forEach((lId, idx) => {
                            let toAdd = perLine + (idx < rem ? 1 : 0);
                            st.passengersByLine[lId] = (st.passengersByLine[lId] || 0) + toAdd;
                        });
                    }
                    updateStationBadge(st);
                    statsRecord.passInc += 250 * incomingPax;
                }
            });
        }

        let lastTime = 0;
        function animationEngine(timestamp) {
            if (!lastTime) lastTime = timestamp;
            let dt = (timestamp - lastTime) / 1000;
            lastTime = timestamp;
            if (dt > 0.1) dt = 0.1;

            if (isGamePaused) {
                requestAnimationFrame(animationEngine);
                return;
            }

            let rainSpeedFactor = (currentWeather === 'rain' ? 0.65 : 1.0) * (currentEventSpeedFactor || 1.0);

            try {
                // Traffic car count modulated dynamically by regime (peak/off-peak/night) & presets
                let targetTrafficCars = MAX_CARS;
                if (isRushHour()) targetTrafficCars = MAX_CARS;
                else if (isNightLowHour()) targetTrafficCars = Math.round(MAX_CARS * 0.28);
                else targetTrafficCars = Math.round(MAX_CARS * 0.65);

                if (trafficCars.length < targetTrafficCars && Math.random() < 0.45) {
                    spawnCar();
                }

                // Continuous Per-Station Dynamic Passenger Inflow (hourly regime & variable pacing)
                tickStationCrowdSimulation(dt);

                // Periodic PIDS countdown and occupancy refresh for open station inspector
                pidsUpdateAccumulator += dt;
                if (pidsUpdateAccumulator >= 0.8) {
                    pidsUpdateAccumulator = 0;
                    if (currentSelectedStation && (currentSidePanelType === 'station' || (document.getElementById('station-hud-panel') && document.getElementById('station-hud-panel').style.display === 'block'))) {
                        updateActiveStationPids(currentSelectedStation);
                    }
                }

                // TRAFFIC: Cars drive continuously across Santiago roads without despawning near stations
                for (let i = trafficCars.length - 1; i >= 0; i--) {
                    let car = trafficCars[i];
                    if (car.fading) continue; 

                    let p1 = L.latLng(car.road[car.segment]);

                    if (!isPointInActiveZone(p1)) {
                        despawnCarWithFade(car, i);
                        continue;
                    }

                    let nextIdx = car.segment + car.dir;
                    let p2 = (nextIdx >= 0 && nextIdx < car.road.length) ? L.latLng(car.road[nextIdx]) : null;

                    if (!p2) {
                        let key = `${p1.lat.toFixed(4)},${p1.lng.toFixed(4)}`;
                        let conns = nodeMap.get(key);
                        let bestConn = null;

                        if (conns && conns.length > 1) {
                            let validConns = conns.filter(c => c.road !== car.road);
                            if (validConns.length > 0) {
                                let nonLoopConns = validConns.filter(c => !car.visitedRoads.includes(c.road));
                                bestConn = nonLoopConns.length > 0 
                                    ? nonLoopConns[Math.floor(Math.random() * nonLoopConns.length)]
                                    : validConns[Math.floor(Math.random() * validConns.length)];
                            }
                        }

                        if (bestConn) {
                            car.visitedRoads.push(car.road);
                            if (car.visitedRoads.length > 8) car.visitedRoads.shift();
                            car.road = bestConn.road; 
                            car.segment = bestConn.index; 
                            car.dir = (bestConn.index === 0) ? 1 : (bestConn.index >= bestConn.road.length - 1 ? -1 : (Math.random() > 0.5 ? 1 : -1));
                        } else {
                            car.dir *= -1;
                        }

                        car.progress = 0;
                        nextIdx = car.segment + car.dir;
                        p2 = (nextIdx >= 0 && nextIdx < car.road.length) ? L.latLng(car.road[nextIdx]) : null;
                        if (!p2) continue;
                    }

                    let d = p1.distanceTo(p2);
                    if (d < 1) {
                        car.segment += car.dir; 
                        car.progress = 0;
                    } else {
                        let move = (car.speed * rainSpeedFactor * dt) / d;
                        car.progress += isFinite(move) ? move : 1;
                        if (car.progress >= 1) {
                            car.segment += car.dir; 
                            car.progress = 0;
                            car.marker.setLatLng(p2);
                            if (!isPointInActiveZone(p2)) {
                                despawnCarWithFade(car, i);
                                continue;
                            }
                        } else {
                            let nLat = p1.lat + (p2.lat - p1.lat) * car.progress;
                            let nLng = p1.lng + (p2.lng - p1.lng) * car.progress;
                            let curPos = L.latLng(nLat, nLng);
                            car.marker.setLatLng(curPos);
                            if (!isPointInActiveZone(curPos)) {
                                despawnCarWithFade(car, i);
                                continue;
                            }
                        }
                    }
                }

                // SUBWAY TRAINS
                trainHitchLayer.clearLayers();

                let mPerPx = map.distance(map.containerPointToLatLng([0, 0]), map.containerPointToLatLng([1, 0]));

                transportLines.metro.forEach(net => {
                    if (net.stations.length < 2 || !net.routeCoords || net.routeCoords.length < 2) return;
                    if (!net.trainDataList || net.trainDataList.length === 0) return;

                    let maxCapacity = 10 + (net.bonusCapacity || 0);
                    let speedMps = ((BASE_METRO_SPEED + (net.bonusSpeedKmh || 0)) * 1000) / 3600;
                    let track = net.routeCoords;
                    let totalD = net.totalDistance || 1000;
                    let dists = net.trackDists || [];

                    let targetSpacingM = 19 * mPerPx;
                    let maxSpacingM = (totalD * 0.35) / 2;
                    let wagonSpacingM = Math.min(targetSpacingM, maxSpacingM);
                    let trainLengthM = wagonSpacingM * 2;

                    net.trainDataList.forEach((t) => {
                        let schedNow = t.schedule[simHour] || 'active';

                        if (t.state === 'moving') {
                            t.health = Math.max(5, t.health - (dt * 0.05));
                        } else if (t.state === 'depot' && schedNow === 'maintenance') {
                            t.health = Math.min(100, t.health + (dt * 0.45));
                        }

                        if (schedNow !== 'active' && t.state !== 'depot' && !t.retiring) {
                            t.retiring = true;
                        } else if (schedNow === 'active' && t.state === 'depot') {
                            t.state = 'waiting_dispatch';
                            t.retiring = false;
                        }

                        if (t.state === 'waiting_dispatch') {
                            if (isLineTerminalClear(net, trainLengthM)) {
                                t.meter = trainLengthM;
                                t.dir = 1;
                                t.state = 'stopped';
                                t.wait = 3.5;
                                t.lastStoppedStationId = net.stations[0].id;
                                t.cooldownStation = 4.0;
                                executeStationExchange(net.stations[0], t, net, maxCapacity);
                                showStatusToast(`✓ Convoy entered service at ${net.stations[0].name}.`, false, 'var(--success-pastel)');
                            }
                        }
                    });

                    net.trainDataList.forEach((t, tIdx) => {
                        let wagonMarkers = net.markers[tIdx];

                        if (t.state === 'waiting_dispatch' || t.state === 'depot') {
                            for (let w = 0; w < 3; w++) {
                                let el = wagonMarkers[w].getElement();
                                if (el) el.style.opacity = '0';
                            }
                            return;
                        } else {
                            for (let w = 0; w < 3; w++) {
                                let el = wagonMarkers[w].getElement();
                                if (el && !el.classList.contains('fade-out')) el.style.opacity = '1';
                            }
                        }

                        if (t.cooldownStation > 0) t.cooldownStation -= dt;

                        let healthFactor = t.health < 25 ? 0.60 : 1.0;
                        let curSpeedMps = speedMps * healthFactor;

                        if (t.state === 'stopped') {
                            t.wait -= dt;
                            if (t.wait <= 0.85 && !t.departureAlertPlayed) {
                                if (activeTrackedVehicle && activeTrackedVehicle.vehicle && activeTrackedVehicle.vehicle.id === t.id) {
                                    playMetroDoorCloseAlert();
                                }
                                t.departureAlertPlayed = true;
                            }
                            if (t.wait <= 0) {
                                if (t.retiring) {
                                    for (let w = 0; w < 3; w++) {
                                        let el = wagonMarkers[w].getElement();
                                        if (el) el.classList.add('fade-out');
                                    }
                                    setTimeout(() => {
                                        t.state = 'depot';
                                        t.retiring = false;
                                        for (let w = 0; w < 3; w++) {
                                            let el = wagonMarkers[w].getElement();
                                            if (el) {
                                                el.classList.remove('fade-out');
                                                el.style.opacity = '0';
                                            }
                                        }
                                        showStatusToast(`🛠 Convoy of ${net.name} entered depot.`);
                                    }, 800);
                                    return;
                                }

                                t.state = 'moving';
                                t.cooldownStation = 3.0;
                                t.departureAlertPlayed = false;
                            }
                        } else if (t.state === 'moving') {
                            let trainAheadBlocked = false;
                            net.trainDataList.forEach((otherT, oIdx) => {
                                if (oIdx !== tIdx && otherT.state !== 'waiting_dispatch' && otherT.state !== 'depot' && otherT.dir === t.dir) {
                                    if (t.dir === 1) {
                                        let gap = otherT.meter - t.meter;
                                        if (gap > 0 && gap < trainLengthM + 30) trainAheadBlocked = true;
                                    } else {
                                        let gap = t.meter - otherT.meter;
                                        if (gap > 0 && gap < trainLengthM + 30) trainAheadBlocked = true;
                                    }
                                }
                            });

                            if (!trainAheadBlocked) {
                                t.meter += curSpeedMps * dt * t.dir;
                            }

                            if (t.cooldownStation <= 0) {
                                for (let st of net.stations) {
                                    if (st.id === net.stations[0].id || st.id === net.stations[net.stations.length - 1].id) continue;
                                    let leadPos = getPointAtMeters(track, dists, totalD, t.meter);
                                    if (leadPos && L.latLng(leadPos.latlng).distanceTo(st.latlng) < 26) {
                                        if (t.lastStoppedStationId !== st.id) {
                                            let skipStation = false;
                                            if (isRushHour() && net.expressActive) {
                                                if (t.serviceType === 'red' && st.expressType === 'green') skipStation = true;
                                                if (t.serviceType === 'green' && st.expressType === 'red') skipStation = true;
                                            }

                                            if (!skipStation) {
                                                t.state = 'stopped';
                                                t.lastStoppedStationId = st.id;
                                                executeStationExchange(st, t, net, maxCapacity);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                            if (t.dir === 1 && t.meter >= totalD) {
                                t.dir = -1;
                                t.meter = totalD;
                                t.state = 'stopped';
                                let endSt = net.stations[net.stations.length - 1];
                                t.lastStoppedStationId = endSt.id;
                                executeStationExchange(endSt, t, net, maxCapacity);
                            } else if (t.dir === -1 && t.meter <= trainLengthM) {
                                t.dir = 1;
                                t.meter = trainLengthM;
                                t.state = 'stopped';
                                let startSt = net.stations[0];
                                t.lastStoppedStationId = startSt.id;
                                executeStationExchange(startSt, t, net, maxCapacity);
                            }
                        }

                        let wagonCoords = [];

                        for (let w = 0; w < 3; w++) {
                            let offsetM = t.meter - (w * wagonSpacingM);
                            offsetM = Math.max(0, Math.min(totalD, offsetM));

                            let wData = getPointAtMeters(track, dists, totalD, offsetM);
                            if (!wData) continue;

                            wagonMarkers[w].setLatLng(wData.latlng);
                            wagonCoords.push(wData.latlng);

                            let angle = Math.atan2(-wData.tangent[0], wData.tangent[1]) * (180 / Math.PI);
                            if (t.dir === -1) angle += 180;

                            let el = wagonMarkers[w].getElement();
                            if (el) {
                                let body = el.querySelector('.metro-wagon-body');
                                if (body) {
                                    body.style.transform = `rotate(${angle}deg)`;
                                    body.innerHTML = renderPassengerDots(t.wagonsPassengers[w], maxCapacity);
                                    if (isRushHour() && net.expressActive) {
                                        body.style.borderColor = t.serviceType === 'red' ? '#ff3344' : (t.serviceType === 'green' ? '#00dd66' : net.color);
                                    } else {
                                        body.style.borderColor = net.color;
                                    }
                                }
                            }
                        }

                        for (let w = 0; w < 2; w++) {
                            if (wagonCoords[w] && wagonCoords[w+1]) {
                                L.polyline([wagonCoords[w], wagonCoords[w+1]], {
                                    color: '#aaaaaa', weight: 2, opacity: 0.8, interactive: false
                                }).addTo(trainHitchLayer);
                            }
                        }
                    });
                });

                // BUSES
                transportLines.bus.forEach(net => {
                    if (net.stations.length < 2 || !net.routeCoords || net.routeCoords.length < 2) return;
                    if (!net.busDataList || net.busDataList.length === 0) return;

                    let route = net.routeCoords;
                    let totalRouteDist = net.totalDistance || 1000;
                    let dists = net.trackDists || [];

                    net.busDataList.forEach((b, bIdx) => {
                        let bm = net.markers[bIdx];
                        let schedNow = b.schedule[simHour] || 'active';

                        if (b.state === 'moving') {
                            b.health = Math.max(5, b.health - (dt * 0.05));
                        } else if (b.state === 'depot' && schedNow === 'maintenance') {
                            b.health = Math.min(100, b.health + (dt * 0.5));
                        }

                        if (schedNow !== 'active' && b.state !== 'depot' && !b.retiring) {
                            b.retiring = true;
                        } else if (schedNow === 'active' && b.state === 'depot') {
                            b.state = 'moving';
                            b.retiring = false;
                            b.progress = 0.05;
                            if (bm && bm.getElement()) bm.getElement().style.opacity = '1';
                        }

                        if (b.state === 'depot') {
                            if (bm && bm.getElement()) bm.getElement().style.opacity = '0';
                            return;
                        }

                        if (b.cooldownStation > 0) b.cooldownStation -= dt;

                        let healthFactor = b.health < 25 ? 0.60 : 1.0;
                        let busBaseSpd = (BASE_BUS_SPEED + (net.bonusSpeedKmh || 0)) * healthFactor;
                        let speedMps = ((busBaseSpd * rainSpeedFactor) * 1000) / 3600;

                        if (b.state === 'stopped') {
                            b.wait -= dt;
                            if (b.wait <= 0) {
                                if (b.retiring) {
                                    if (bm && bm.getElement()) bm.getElement().classList.add('fade-out');
                                    setTimeout(() => {
                                        b.state = 'depot';
                                        b.retiring = false;
                                        if (bm && bm.getElement()) {
                                            bm.getElement().classList.remove('fade-out');
                                            bm.getElement().style.opacity = '0';
                                        }
                                    }, 800);
                                    return;
                                }

                                b.state = 'moving';
                                b.cooldownStation = 3.0;
                            }
                        } else if (b.state === 'moving') {
                            b.progress += ((speedMps * dt) / totalRouteDist) * b.dir;
                            let targetM = b.progress * totalRouteDist;
                            let bPos = getPointAtMeters(route, dists, totalRouteDist, targetM);

                            if (b.cooldownStation <= 0 && bPos) {
                                net.stations.forEach(st => {
                                    if (L.latLng(bPos.latlng).distanceTo(st.latlng) < 22) {
                                        if (b.lastStoppedStationId !== st.id) {
                                            b.state = 'stopped';
                                            b.wait = 2.0;
                                            b.lastStoppedStationId = st.id;
                                            executeStationExchange(st, b, net, 15 + (net.bonusCapacity || 0));
                                        }
                                    }
                                });
                            }

                            if (b.progress >= 1 && b.dir === 1) {
                                b.dir = -1;
                                b.progress = 0.999;
                                b.state = 'stopped';
                                b.wait = 2.0;
                                let endSt = net.stations[net.stations.length - 1];
                                b.lastStoppedStationId = endSt.id;
                                executeStationExchange(endSt, b, net, 15 + (net.bonusCapacity || 0));
                            } else if (b.progress <= 0 && b.dir === -1) {
                                b.dir = 1;
                                b.progress = 0.001;
                                b.state = 'stopped';
                                b.wait = 2.0;
                                let startSt = net.stations[0];
                                b.lastStoppedStationId = startSt.id;
                                executeStationExchange(startSt, b, net, 15 + (net.bonusCapacity || 0));
                            }
                        }

                        let targetM = Math.max(0, Math.min(totalRouteDist, b.progress * totalRouteDist));
                        let bData = getPointAtMeters(route, dists, totalRouteDist, targetM);
                        if (bData && b.marker) {
                            b.marker.setLatLng(bData.latlng);
                            let angle = Math.atan2(-bData.tangent[0], bData.tangent[1]) * (180 / Math.PI);
                            if (b.dir === -1) angle += 180;

                            let el = b.marker.getElement();
                            if (el) {
                                let body = el.querySelector('.bus-wagon-body');
                                if (body) {
                                    body.style.transform = `rotate(${angle}deg)`;
                                    body.innerHTML = renderPassengerDots(b.passengers, 15 + (net.bonusCapacity || 0));
                                }
                            }
                        }
                    });
                });
            } catch(e) {}

            
            // Real-time Vehicle PiP Telemetry & Follow Camera
            if (activeTrackedVehicle && activeTrackedVehicle.vehicle) {
                updatePiPTelemetryUI();
                updateLeaderLine();
                if (isPiPFollowActive && activeTrackedVehicle.vehicle.marker && activeTrackedVehicle.vehicle.marker.getLatLng) {
                    let curPos = activeTrackedVehicle.vehicle.marker.getLatLng();
                    map.panTo(curPos, { animate: false });
                }
            }

            requestAnimationFrame(animationEngine);
        }
