/* ==============================================================
   MAP INITIALIZATION, ZONES & STREET NETWORK
   ============================================================== */


        const map = L.map('map-container', { zoomControl: false, closePopupOnClick: true }).setView([-33.4380, -70.6350], 13.5);
        window.map = map;

        // Custom Leaflet panes to strictly constrain density map visibility to unlocked communes
        map.createPane('densityStreetPane');
        map.getPane('densityStreetPane').style.zIndex = 280; // Above base tiles (200), below active zone mask (380)
        map.getPane('densityStreetPane').style.pointerEvents = 'none';

        map.createPane('maskPane');
        map.getPane('maskPane').style.zIndex = 380; // Above density street layer (280), below HUD vectors/borders (400)

        const darkTiles = L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_KEY}`, { maxZoom: 18 }).addTo(map);
        darkTiles.on('tileerror', function(error, tile) {
            tile.src = 'https://a.basemaps.cartocdn.com/dark_all/' + error.coords.z + '/' + error.coords.x + '/' + error.coords.y + '.png';
        });

        maskLayerGroup.addTo(map);
        activeBorders.addTo(map);
        curveHandlesLayer.addTo(map);
        trainHitchLayer.addTo(map);

let nodeMap = new Map();
let realStreetsData = { all: [], high: [], medium: [], low: [] };

function loadSantiagoStreetsFromJS() {
    if (window.SANTIAGO_STREETS && realStreetsData.all.length === 0) {
        let data = window.SANTIAGO_STREETS;
        if (data.high) data.high.forEach(c => clasificarYGuardar(c, 'primary'));
        if (data.medium) data.medium.forEach(c => clasificarYGuardar(c, 'secondary'));
        if (data.low) data.low.forEach(c => clasificarYGuardar(c, 'residential'));

        const statusEl = document.getElementById('upload-status');
        if (statusEl) {
            statusEl.innerHTML = '<span style="color:var(--success-pastel); font-weight:bold;">' + tr('fileLoaded', {count: realStreetsData.all.length}) + '</span>';
        }
        const btnStgo = document.getElementById('btn-stgo');
        if (btnStgo) {
            btnStgo.style.background = 'var(--accent)';
            btnStgo.style.color = '#000';
        }
        return true;
    }
    return realStreetsData.all.length > 0;
}

// Cleaned: eliminated calls to nonexistent 'calles.geojson' and 'export (1).geojson', and eliminated new Function(text)()
async function autoDetectLocalFiles() {
    if (loadSantiagoStreetsFromJS()) return;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        let res = await fetch('density_maps/santiago_streets.js', { signal: controller.signal });
        if (!res.ok) res = await fetch('santiago_streets.js', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res && res.ok) {
            let text = await res.text();
            if (text.includes('window.SANTIAGO_STREETS')) {
                let scriptEl = document.createElement('script');
                scriptEl.textContent = text;
                document.head.appendChild(scriptEl);
                loadSantiagoStreetsFromJS();
            }
        }
    } catch(e) {}
}

loadSantiagoStreetsFromJS();
autoDetectLocalFiles();
document.addEventListener('DOMContentLoaded', loadSantiagoStreetsFromJS);

        function procesarGeoJSON(data) {
            const arr = Array.isArray(data) ? data : (data.features || data.elements);
            if (!arr) return;
            arr.forEach(item => {
                let type = 'residential';
                if (item.geometry && !item.geometry.type) {
                    let c = item.geometry.map(g => [g.lat, g.lon]);
                    type = (item.tags && item.tags.highway) ? item.tags.highway : 'residential';
                    clasificarYGuardar(c, type);
                } else if (item.geometry && (item.geometry.type === 'LineString' || item.geometry.type === 'MultiLineString')) {
                    type = (item.properties && item.properties.highway) ? item.properties.highway : 'residential';
                    let list = item.geometry.type === 'LineString' ? [item.geometry.coordinates] : item.geometry.coordinates;
                    list.forEach(coords => {
                        let c = coords.map(pt => [pt[1], pt[0]]);
                        clasificarYGuardar(c, type);
                    });
                }
            });
        }

        function clasificarYGuardar(coords, type) {
            if (coords.length > 1) {
                realStreetsData.all.push(coords);
                coords.forEach((pt, idx) => {
                    let key = `${pt[0].toFixed(4)},${pt[1].toFixed(4)}`;
                    if(!nodeMap.has(key)) nodeMap.set(key, []);
                    nodeMap.get(key).push({ road: coords, index: idx });
                });

                if (type.match(/motorway|trunk|primary/)) realStreetsData.high.push(coords);
                else if (type.match(/secondary|tertiary/)) realStreetsData.medium.push(coords);
                else realStreetsData.low.push(coords);
            }
        }

        function syncZoneGeometries() {
            if (currentLevel === 10) {
                unlockedCommunes.clear();
            } else {
                let activeCommunes = ZONES[currentLevel-1].communes;
                unlockedCommunes = new Set(activeCommunes);
            }
            renderActiveZones();
            if (typeof isDensityFilterActive !== 'undefined' && isDensityFilterActive) {
                renderDensityMapFilter();
            }
        }

        function renderActiveZones() {
            maskLayerGroup.clearLayers();
            activeBorders.clearLayers();

            if (currentLevel === 10) return; // RM Open

            let smoothFactor = currentResolution === 50 ? 5.0 : (currentResolution === 75 ? 2.5 : 1.0);
            let strokeWidth = currentResolution === 50 ? 1.4 : (currentResolution === 75 ? 2.0 : 2.5);

            let allActiveRings = [];
            unlockedCommunes.forEach(c => {
                let rings = getCommuneRings(c);
                if (rings) {
                    rings.forEach(ring => {
                        let activeRing = ring;
                        if (currentResolution === 50 && ring.length > 20) {
                            activeRing = ring.filter((_, idx) => idx % 2 === 0 || idx === ring.length - 1);
                        }
                        allActiveRings.push(activeRing);
                        L.polyline(activeRing, {
                            pane: 'overlayPane',
                            color: 'var(--accent)',
                            weight: strokeWidth,
                            smoothFactor: smoothFactor,
                            dashArray: '5, 8',
                            opacity: 0.95,
                            interactive: false
                        }).addTo(activeBorders);
                    });
                }
            });

            if (allActiveRings.length > 0) {
                let worldMask = [
                    [[-85, -180], [-85, 180], [85, 180], [85, -180]],
                    ...allActiveRings
                ];
                let maskOpacity = (typeof isDensityFilterActive !== 'undefined' && isDensityFilterActive) ? 1.0 : 0.88;
                L.polygon(worldMask, {
                    pane: 'maskPane',
                    color: 'transparent',
                    weight: 0,
                    fillColor: '#050508',
                    fillOpacity: maskOpacity,
                    interactive: true
                }).on('click', handleBlockedZoneClick).addTo(maskLayerGroup);
            }
        }

        function isPointInActiveZone(latlng) {
            if (currentLevel === 10) return true;
            let x = latlng.lat, y = latlng.lng;

            for (let c of unlockedCommunes) {
                let rings = getCommuneRings(c);
                if (!rings) continue;
                for (let ring of rings) {
                    let inside = false;
                    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                        let xi = ring[i][0], yi = ring[i][1];
                        let xj = ring[j][0], yj = ring[j][1];
                        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                        if (intersect) inside = !inside;
                    }
                    if (inside) return true;
                }
            }
            return false;
        }

        function checkLevelProgression() {
            if (currentLevel >= 10) return;
            let nextZone = ZONES[currentLevel];
            let mStations = allStations.filter(s => s.type === 'metro').length;
            let busLines = transportLines.bus.length;

            if (mStations >= nextZone.req.st && busLines >= nextZone.req.bus) {
                currentLevel++;
                syncZoneGeometries();
            initWeatherSystem();
            let todayWeather = DAILY_WEATHER[simDayOfMonth] || { type: 'clear' };
            applyWeatherAtmosphere(todayWeather.type);
                updateMaxCarsTarget();
                showStatusToast(tr('toastLevelUp', {name: ZONES[currentLevel-1].name}), false, 'var(--success-pastel)');
            }
        }
