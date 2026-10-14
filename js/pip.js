/* ==============================================================
   VEHICLE PICTURE-IN-PICTURE (PIP) TELEMETRY & TRACKING
   ============================================================== */

let activeTrackedVehicle = null;
let isPiPFollowActive = false;
let pipLeaderPolyline = null;

        function trackVehicle(vehObj, netObj, type) {
            playAudioClick();
            activeTrackedVehicle = { vehicle: vehObj, line: netObj, type: type };
            let container = document.getElementById('vehicle-tracker-container');
            if (container) {
                container.style.display = 'flex';
                updatePiPTelemetryUI();
                updateLeaderLine();
            }
        }

        function closeVehicleTracker() {
            activeTrackedVehicle = null;
            isPiPFollowActive = false;
            let container = document.getElementById('vehicle-tracker-container');
            if (container) container.style.display = 'none';
            let svg = document.getElementById('vehicle-leader-line-svg');
            if (svg) svg.style.display = 'none';
            let btn = document.getElementById('pip-btn-follow');
            if (btn) {
                btn.classList.remove('active');
                btn.innerText = currentLang === 'es' ? '🎥 Seguir' : '🎥 Follow';
            }
        }

        function togglePiPFollow() {
            playAudioClick();
            isPiPFollowActive = !isPiPFollowActive;
            let btn = document.getElementById('pip-btn-follow');
            if (btn) {
                if (isPiPFollowActive) {
                    btn.classList.add('active');
                    btn.innerText = currentLang === 'es' ? '🎥 Siguiendo' : '🎥 Following';
                    showStatusToast(currentLang === 'es' ? '🎥 Cámara de seguimiento activada' : '🎥 Tracking camera active', false, 'var(--accent)');
                } else {
                    btn.classList.remove('active');
                    btn.innerText = currentLang === 'es' ? '🎥 Seguir' : '🎥 Follow';
                }
            }
        }

        function pipCenterOnVehicle() {
            playAudioClick();
            if (activeTrackedVehicle && activeTrackedVehicle.vehicle && activeTrackedVehicle.vehicle.marker) {
                let latlng = activeTrackedVehicle.vehicle.marker.getLatLng();
                map.flyTo(latlng, Math.max(15, map.getZoom()), { duration: 0.8 });
            }
        }

        function updateLeaderLine() {
            let svg = document.getElementById('vehicle-leader-line-svg');
            if (!svg) return;

            if (!activeTrackedVehicle || !activeTrackedVehicle.vehicle) {
                svg.style.display = 'none';
                return;
            }

            let v = activeTrackedVehicle.vehicle;
            let net = activeTrackedVehicle.line;
            let marker = v.marker;
            if (!marker || !marker.getLatLng) {
                svg.style.display = 'none';
                return;
            }

            let container = document.getElementById('vehicle-tracker-container');
            if (!container || container.style.display === 'none') {
                svg.style.display = 'none';
                return;
            }

            let vehLatLng = marker.getLatLng();
            let mapPt = map.latLngToContainerPoint(vehLatLng);
            let mapContainer = map.getContainer();
            let mapRect = mapContainer.getBoundingClientRect();

            let startX = mapRect.left + mapPt.x;
            let startY = mapRect.top + mapPt.y;

            let containerRect = container.getBoundingClientRect();
            let wagonsCard = document.getElementById('vehicle-tracker-wagons');
            let targetY = containerRect.top + (wagonsCard ? (wagonsCard.offsetHeight * 0.45) : 50);
            let endX = containerRect.left;
            let endY = targetY;

            let lineColor = (net && net.color) ? net.color : '#00d2ff';

            let pathD = `M ${startX} ${startY} L ${endX} ${endY}`;

            let core = document.getElementById('leader-line-core');
            let glow = document.getElementById('leader-line-glow');
            let dot = document.getElementById('leader-line-target-dot');
            let ring = document.getElementById('leader-line-target-ring');
            let anchor = document.getElementById('leader-line-anchor-dot');

            if (core) {
                core.setAttribute('d', pathD);
                core.setAttribute('stroke', lineColor);
            }
            if (glow) {
                glow.setAttribute('d', pathD);
                glow.setAttribute('stroke', lineColor);
            }
            if (dot) {
                dot.setAttribute('cx', startX);
                dot.setAttribute('cy', startY);
                dot.setAttribute('stroke', lineColor);
            }
            if (ring) {
                ring.setAttribute('cx', startX);
                ring.setAttribute('cy', startY);
                ring.setAttribute('stroke', lineColor);
            }
            if (anchor) {
                anchor.setAttribute('cx', endX);
                anchor.setAttribute('cy', endY);
                anchor.setAttribute('stroke', lineColor);
            }

            svg.style.display = 'block';
        }

        function updatePiPTelemetryUI() {
            if (!activeTrackedVehicle || !activeTrackedVehicle.vehicle) return;
            let v = activeTrackedVehicle.vehicle;
            let net = activeTrackedVehicle.line;
            let type = activeTrackedVehicle.type;

            let container = document.getElementById('vehicle-tracker-container');
            if (!container || container.style.display === 'none') return;

            let isMoving = v.state === 'moving';
            let baseSpd = type === 'metro' ? BASE_METRO_SPEED : BASE_BUS_SPEED;
            let bonusSpd = (net && net.bonusSpeedKmh) ? net.bonusSpeedKmh : 0;
            let currentKmh = isMoving ? Math.round(baseSpd + bonusSpd) : 0;
            let healthVal = Math.round(v.health !== undefined ? v.health : 100);

            // 1. UPDATE UPPER CARD (WAGONS / SEATS INSPECTOR)
            let wagonsBadge = document.getElementById('wagons-line-badge');
            if (wagonsBadge) {
                wagonsBadge.innerText = (type === 'metro' ? '🚇 ' : '🚌 ') + (net ? net.name : 'Line');
                wagonsBadge.style.borderColor = net ? net.color : 'var(--accent)';
                wagonsBadge.style.color = net ? net.color : '#fff';
            }

            let wagonsTitle = document.getElementById('wagons-title');
            if (wagonsTitle) {
                if (type === 'metro') {
                    let svcTag = v.serviceType === 'red' ? (currentLang === 'es' ? 'Ruta Roja 🔴' : 'Red Route 🔴') : (v.serviceType === 'green' ? (currentLang === 'es' ? 'Ruta Verde 🟢' : 'Green Route 🟢') : (currentLang === 'es' ? 'Común ⚪' : 'Common ⚪'));
                    wagonsTitle.innerText = `${currentLang === 'es' ? 'Convoy de Metro' : 'Subway Convoy'} (${svcTag})`;
                } else {
                    wagonsTitle.innerText = `${currentLang === 'es' ? 'Bus en Servicio' : 'Bus Transit'}`;
                }
            }

            let pax = 0;
            let maxCap = 0;
            let capPerWagon = 10;
            if (type === 'metro') {
                pax = (v.wagonsPassengers || []).reduce((a, b) => a + b, 0);
                capPerWagon = 10 + ((net && net.bonusCapacity) ? net.bonusCapacity : 0);
                if (techUpgrades && techUpgrades.tech_cbtc_signaling) capPerWagon = Math.round(capPerWagon * 1.25);
                maxCap = capPerWagon * 3;
            } else {
                pax = v.passengers || 0;
                capPerWagon = 15 + ((net && net.bonusCapacity) ? net.bonusCapacity : 0);
                maxCap = capPerWagon;
            }

            let wagonsSubtitle = document.getElementById('wagons-subtitle');
            if (wagonsSubtitle) {
                let spdLbl = currentLang === 'es' ? 'Velocidad' : 'Speed';
                let hLbl = currentLang === 'es' ? 'Salud' : 'Health';
                let onbLbl = currentLang === 'es' ? 'A bordo' : 'Onboard';
                wagonsSubtitle.innerText = `${spdLbl}: ~${currentKmh} km/h | ${hLbl}: ${healthVal}% | ${onbLbl}: ${pax}/${maxCap} pax`;
            }

            let wagonsContainer = document.getElementById('wagons-display-container');
            if (wagonsContainer) {
                let netColor = (net && net.color) ? net.color : '#00d2ff';
                if (type === 'metro') {
                    let wp = v.wagonsPassengers || [0, 0, 0];
                    let wagonsHtml = wp.map((passCount) => {
                        let slotsHtml = '';
                        for (let s = 0; s < capPerWagon; s++) {
                            if (s < passCount) {
                                slotsHtml += `<div class="inspector-slot occupied" style="background:${netColor}; color:${netColor};" title="Occupied"></div>`;
                            } else {
                                slotsHtml += `<div class="inspector-slot free" title="Available"></div>`;
                            }
                        }
                        return `
                            <div class="inspector-wagon" style="border-color:${netColor};">
                                <div class="wagon-seat-grid">
                                    ${slotsHtml}
                                </div>
                            </div>
                        `;
                    }).join('<div class="inspector-coupler"></div>');
                    wagonsContainer.innerHTML = wagonsHtml;
                } else {
                    let slotsHtml = '';
                    for (let s = 0; s < maxCap; s++) {
                        if (s < pax) {
                            slotsHtml += `<div class="inspector-slot occupied" style="background:${netColor}; color:${netColor};" title="Occupied"></div>`;
                        } else {
                            slotsHtml += `<div class="inspector-slot free" title="Available"></div>`;
                        }
                    }
                    wagonsContainer.innerHTML = `
                        <div class="inspector-wagon" style="border-color:${netColor}; width:100%; max-width:240px;">
                            <div class="wagon-seat-grid">
                                ${slotsHtml}
                            </div>
                        </div>
                    `;
                }
            }

            let dotOcc = document.getElementById('legend-dot-occupied');
            if (dotOcc) dotOcc.style.background = (net && net.color) ? net.color : 'var(--accent)';
            let txtOcc = document.getElementById('txt-legend-occupied');
            if (txtOcc) txtOcc.innerText = currentLang === 'es' ? 'Ocupado' : 'Occupied';
            let txtAvail = document.getElementById('txt-legend-available');
            if (txtAvail) txtAvail.innerText = currentLang === 'es' ? 'Disponible' : 'Available';

            // 2. UPDATE LOWER CARD (TELEMETRY HUD)
            let lineTag = document.getElementById('pip-line-tag');
            if (lineTag) {
                lineTag.innerText = (type === 'metro' ? '🚇 ' : '🚌 ') + (net ? net.name : 'Line');
                lineTag.style.borderColor = net ? net.color : 'var(--accent)';
                lineTag.style.color = net ? net.color : '#fff';
            }

            let idTag = document.getElementById('pip-vehicle-id');
            if (idTag) {
                let prefix = type === 'metro' ? (currentLang === 'es' ? 'Convoy' : 'Train') : 'Bus';
                let subId = v.id ? v.id.slice(-4) : '01';
                idTag.innerText = `${prefix} #${subId}`;
            }

            let speedEl = document.getElementById('pip-speed-val');
            if (speedEl) speedEl.innerText = `${currentKmh}`;
            let speedBar = document.getElementById('pip-speed-bar');
            if (speedBar) speedBar.style.width = `${Math.min(100, (currentKmh / 120) * 100)}%`;

            let paxEl = document.getElementById('pip-pax-val');
            if (paxEl) paxEl.innerText = `${pax} / ${maxCap} PAX`;
            let paxBar = document.getElementById('pip-pax-bar');
            let occPercent = maxCap > 0 ? (pax / maxCap) * 100 : 0;
            if (paxBar) {
                paxBar.style.width = `${Math.min(100, occPercent)}%`;
                paxBar.style.background = occPercent > 85 ? 'var(--danger-pastel)' : (occPercent > 50 ? '#ffb84d' : 'var(--success-pastel)');
            }

            let hEl = document.getElementById('pip-health-val');
            if (hEl) hEl.innerText = `${healthVal}%`;
            let hBar = document.getElementById('pip-health-bar');
            if (hBar) {
                hBar.style.width = `${healthVal}%`;
                hBar.style.background = healthVal < 30 ? 'var(--danger-pastel)' : (healthVal < 60 ? '#ffb84d' : '#00d2ff');
            }

            let statusEl = document.getElementById('pip-status-val');
            if (statusEl) {
                if (v.state === 'moving') {
                    statusEl.innerText = currentLang === 'es' ? '🟢 En Tránsito' : '🟢 In Transit';
                    statusEl.className = 'pip-badge moving';
                } else if (v.state === 'waiting' || v.state === 'boarding') {
                    statusEl.innerText = currentLang === 'es' ? '🟡 En Andén' : '🟡 Boarding';
                    statusEl.className = 'pip-badge waiting';
                } else {
                    statusEl.innerText = currentLang === 'es' ? '🔧 En Cocheras' : '🔧 Depot';
                    statusEl.className = 'pip-badge depot';
                }
            }

            let nextStEl = document.getElementById('pip-next-stop-name');
            if (nextStEl && net && net.stations && net.stations.length > 0) {
                let nextName = '---';
                if (v.lastStoppedStationId) {
                    let curIdx = net.stations.findIndex(s => s.id === v.lastStoppedStationId);
                    if (curIdx !== -1) {
                        let nextIdx = curIdx + (v.dir || 1);
                        if (nextIdx >= 0 && nextIdx < net.stations.length) {
                            nextName = net.stations[nextIdx].name;
                        } else {
                            nextName = net.stations[curIdx === 0 ? 1 : 0].name;
                        }
                    }
                }
                if (nextName === '---' && net.stations[0]) {
                    nextName = net.stations[v.dir === -1 ? 0 : (net.stations.length - 1)].name;
                }
                let lbl = tr('pipNextStop');
                nextStEl.innerText = `➡️ ${lbl}: ${nextName}`;
            }
        }

        // Leader line listeners on camera move & zoom
        if (typeof map !== 'undefined' && map) {
            map.on('move', () => { if (activeTrackedVehicle) updateLeaderLine(); });
            map.on('zoom', () => { if (activeTrackedVehicle) updateLeaderLine(); });
        }
        window.addEventListener('resize', () => { if (activeTrackedVehicle) updateLeaderLine(); });

