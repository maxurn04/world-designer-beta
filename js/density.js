/* ==============================================================
   DENSITY FILTER, OSM GRID & REACH / CATCHMENT INSPECTOR (60 FPS GPU)
   ============================================================== */

let densityMapLayerGroup = L.layerGroup();
let densityCatchmentLayerGroup = L.layerGroup();
let isDensityFilterActive = false;
let densityInspectMarker = null;
let densityInspectPopup = null;
let densityRasterCache = {};
let santiagoStreetOverlay = null;
let currentLoadedRasterLvl = null;

// Linear interpolation helper along polyline segments
function samplePointsAlongPolyline(points, stepMeters = 50) {
    let samples = [];
    for (let i = 0; i < points.length - 1; i++) {
        let p1 = points[i], p2 = points[i + 1];
        let lat1 = p1[0], lng1 = p1[1];
        let lat2 = p2[0], lng2 = p2[1];
        let dLat = (lat2 - lat1) * 111320;
        let dLng = (lng2 - lng1) * 111320 * Math.cos((lat1 + lat2) * Math.PI / 360);
        let segDist = Math.sqrt(dLat * dLat + dLng * dLng);
        let steps = Math.max(1, Math.floor(segDist / stepMeters));
        for (let s = 0; s <= steps; s++) {
            let t = s / steps;
            samples.push({
                lat: lat1 + (lat2 - lat1) * t,
                lng: lng1 + (lng2 - lng1) * t
            });
        }
    }
    return samples;
}

function toggleDensityFilter() {
    playAudioClick();
    isDensityFilterActive = !isDensityFilterActive;

    let btn = document.getElementById('btn-density-filter');
    let legend = document.getElementById('density-legend-card');

    if (isDensityFilterActive) {
        if (btn) btn.classList.add('active');
        if (legend) legend.style.display = 'block';
        if (!map.hasLayer(densityMapLayerGroup)) map.addLayer(densityMapLayerGroup);
        if (!densityMapLayerGroup.hasLayer(densityCatchmentLayerGroup)) {
            densityMapLayerGroup.addLayer(densityCatchmentLayerGroup);
        }
        renderDensityMapFilter();
        renderActiveZones();
        showStatusToast(
            currentLang === 'es'
                ? '👥 Mapa de Jerarquía Vial y Demanda Activado (⚡ GPU 60 FPS)'
                : '👥 Road Hierarchy & Transit Demand Map Active (⚡ GPU 60 FPS)',
            false,
            'var(--accent)'
        );
    } else {
        if (btn) btn.classList.remove('active');
        if (legend) legend.style.display = 'none';
        densityMapLayerGroup.clearLayers();
        densityCatchmentLayerGroup.clearLayers();
        santiagoStreetOverlay = null;
        currentLoadedRasterLvl = null;
        if (map.hasLayer(densityMapLayerGroup)) map.removeLayer(densityMapLayerGroup);
        renderActiveZones();
        closeDensityInspector();
    }
}

function closeDensityInspector() {
    if (densityInspectPopup && map.hasLayer(densityInspectPopup)) {
        map.closePopup(densityInspectPopup);
    }
    if (densityInspectMarker && map.hasLayer(densityInspectMarker)) {
        map.removeLayer(densityInspectMarker);
    }
    densityInspectPopup = null;
    densityInspectMarker = null;
}

function getCommuneAtLatLng(latlng) {
    let x = latlng.lat, y = latlng.lng;
    for (let cName in OFFICIAL_COMMUNE_POLYGONS) {
        let rings = OFFICIAL_COMMUNE_POLYGONS[cName];
        if (!rings) continue;
        for (let ring of rings) {
            let inside = false;
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                let xi = ring[i][0], yi = ring[i][1];
                let xj = ring[j][0], yj = ring[j][1];
                let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            if (inside) return cName;
        }
    }
    return null;
}

function distanceToSegmentMeters(lat, lng, p1, p2) {
    let x = lat, y = lng;
    let x1 = p1[0], y1 = p1[1];
    let x2 = p2[0], y2 = p2[1];
    let dx = x2 - x1, dy = y2 - y1;
    let l2 = dx * dx + dy * dy;
    let t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2));
    let projLat = x1 + t * dx;
    let projLng = y1 + t * dy;
    let dLat = (lat - projLat) * 111320;
    let dLng = (lng - projLng) * 111320 * Math.cos((lat + projLat) * Math.PI / 360);
    return Math.sqrt(dLat * dLat + dLng * dLng);
}

function findNearestMajorAvenue(latlng) {
    let best = null;
    let minDist = Infinity;
    if (typeof SANTIAGO_MAJOR_AVENUES !== 'undefined' && Array.isArray(SANTIAGO_MAJOR_AVENUES)) {
        for (let ave of SANTIAGO_MAJOR_AVENUES) {
            if (!ave.coords || ave.coords.length < 2) continue;
            for (let i = 0; i < ave.coords.length - 1; i++) {
                let d = distanceToSegmentMeters(latlng.lat, latlng.lng, ave.coords[i], ave.coords[i + 1]);
                if (d < minDist) {
                    minDist = d;
                    best = ave;
                }
            }
        }
    }
    return { avenue: best, distance: minDist };
}

function getPointDensityAndAttraction(latlng) {
    if (!latlng) return { density: 100, attraction: 50, tierColor: '#00e5ff', tierBadge: '', streetName: 'Zona Urbana', streetDesc: '', densityCategory: '', attractionCategory: '', distance: 9999 };
    let nearestAve = (typeof findNearestMajorAvenue === 'function') ? findNearestMajorAvenue(latlng) : { avenue: null, distance: 9999 };
    let streetName = '';
    let streetDesc = '';
    let tierBadge = '';
    let tierColor = '#d50000';
    let densityVal = 350;
    let densityCategory = '';
    let attractionVal = 185;
    let attractionCategory = '';

    let dCenter = latlng.distanceTo(L.latLng(-33.445, -70.655));    // Santiago Centro / Est. Central
    let dLaPintana = latlng.distanceTo(L.latLng(-33.585, -70.635));  // La Pintana / Santa Rosa
    let dSanMiguel = latlng.distanceTo(L.latLng(-33.495, -70.655));  // San Miguel / Gran Avenida
    let dQuilicura = latlng.distanceTo(L.latLng(-33.360, -70.730));  // Quilicura centro
    let dPuenteAlto = latlng.distanceTo(L.latLng(-33.605, -70.575)); // Puente Alto centro
    let dCerroNavia = latlng.distanceTo(L.latLng(-33.425, -70.730)); // Cerro Navia

    let baseDensity = 50;
    if (dCenter < 2200 || dLaPintana < 1800 || dSanMiguel < 1400 || dQuilicura < 1200 || dPuenteAlto < 1300 || dCerroNavia < 1200) {
        baseDensity = 110; // Red cluster: 351 - Max. hab/ha
    } else if (dCenter < 4800 || dLaPintana < 3800 || dSanMiguel < 3200 || dQuilicura < 3000 || dPuenteAlto < 3000 || dCerroNavia < 3000) {
        baseDensity = 85;  // Dark orange cluster: 151 - 350 hab/ha
    } else if ((latlng.lng > -70.56 && latlng.lat > -33.43) || (latlng.lat > -33.36 && latlng.lng > -70.55)) {
        baseDensity = 38;  // Yellow cluster: Vitacura / Las Condes / Lo Barnechea: 1 - 75 hab/ha
    } else {
        baseDensity = 68;  // Orange cluster: Providencia, Ñuñoa, Maipú: 76 - 150 hab/ha
    }
    let baseAttr = Math.round(baseDensity * 1.45);
    let communeRaw = (typeof getCommuneAtLatLng === 'function') ? (getCommuneAtLatLng(latlng) || 'santiago') : 'santiago';
    let communeName = communeRaw.charAt(0).toUpperCase() + communeRaw.slice(1);

    if (nearestAve.avenue && nearestAve.distance < 240) {
        let ave = nearestAve.avenue;
        streetName = ave.name;
        streetDesc = ave.desc || '';
        if (ave.tier === 'red') {
            tierColor = '#d50000';
            tierBadge = '🔴 Tier 1: Major Avenue (350+ / Multi-lane)';
            densityVal = Math.round(ave.density * 1.85);
            densityCategory = 'Max Transit Density (350+ hab/ha)';
            attractionVal = Math.round(ave.density);
            attractionCategory = 'Critical Transit Demand 🔥';
        } else if (ave.tier === 'yellow') {
            tierColor = '#ff9100';
            tierBadge = '🟠 Tier 2: Local Avenue (1 lane/side)';
            densityVal = Math.round(ave.density * 1.35);
            densityCategory = 'High Transit Density';
            attractionVal = Math.round(ave.density * 0.85);
            attractionCategory = 'High Demand ⚡';
        } else {
            tierColor = '#ffb300';
            tierBadge = '🟡 Tier 3: Secondary / Connecting Street';
            densityVal = Math.round(ave.density * 0.95);
            densityCategory = 'Moderate Density';
            attractionVal = Math.round(ave.density * 0.70);
            attractionCategory = 'Moderate Demand 🟡';
        }
    } else {
        if (baseAttr >= 130) {
            tierColor = '#ff9100';
            tierBadge = '🟠 Tier 2: Urban Arterial / Local Ave';
            streetName = `Corredor Urbano (${communeName})`;
            streetDesc = 'Eje conector local de 1 vía por sentido con activo flujo de transporte.';
            densityVal = Math.round(baseAttr * 1.55);
            densityCategory = 'High Density (180-280 hab/ha)';
            attractionVal = baseAttr;
            attractionCategory = 'High Demand ⚡';
        } else if (baseAttr >= 75) {
            tierColor = '#ffb300';
            tierBadge = '🟡 Tier 3: Secondary Street';
            streetName = `Calle Conectora (${communeName})`;
            streetDesc = 'Vía intermedia conectora entre barrios residenciales y ejes comerciales.';
            densityVal = Math.round(baseAttr * 1.30);
            densityCategory = 'Moderate Density (90-170 hab/ha)';
            attractionVal = baseAttr;
            attractionCategory = 'Moderate Demand 🟡';
        } else {
            tierColor = '#a3a18e';
            tierBadge = '⚪ Tier 4: Residential Neighborhood';
            streetName = `Barrio Residencial (${communeName})`;
            streetDesc = 'Pasajes interiores y calles locales residenciales de tráfico calmo.';
            densityVal = Math.round(baseAttr * 1.10);
            densityCategory = 'Low Density (30-85 hab/ha)';
            attractionVal = baseAttr;
            attractionCategory = 'Local Demand ⚪';
        }
    }

    return {
        density: densityVal,
        attraction: attractionVal,
        tierColor: tierColor,
        tierBadge: tierBadge,
        streetName: streetName,
        streetDesc: streetDesc,
        densityCategory: densityCategory,
        attractionCategory: attractionCategory,
        distance: nearestAve.distance
    };
}

function inspectDensityPoint(latlng) {
    if (!isDensityFilterActive) return;

    let communeRaw = getCommuneAtLatLng(latlng) || 'santiago';
    let communeName = communeRaw.charAt(0).toUpperCase() + communeRaw.slice(1);
    let data = getPointDensityAndAttraction(latlng);

    let streetName = data.streetName;
    let streetDesc = data.streetDesc;
    let tierBadge = data.tierBadge;
    let tierColor = data.tierColor;
    let densityVal = data.density;
    let densityCategory = data.densityCategory;
    let attractionVal = data.attraction;
    let attractionCategory = data.attractionCategory;

    // Metro Station Liberation Check (360m standard, 520m if Intermodal)
    let metroStations = allStations.filter(s => s.type === 'metro' || s.isIntermodal);
    let nearestSt = null;
    let minStDist = Infinity;
    metroStations.forEach(s => {
        let d = latlng.distanceTo(s.latlng);
        if (d < minStDist) {
            minStDist = d;
            nearestSt = s;
        }
    });

    let reachRadius = (nearestSt && nearestSt.isIntermodal) ? 520 : 360;
    let isLiberated = (minStDist <= reachRadius);
    let coverageHtml = '';
    if (isLiberated && nearestSt) {
        coverageHtml = `
            <div style="background:rgba(0,229,255,0.12); border:1px solid #00e5ff; border-radius:6px; padding:6px 8px; margin-top:8px;">
                <div style="color:#00e5ff; font-weight:800; font-size:0.75rem; display:flex; align-items:center; gap:5px;">
                    <span>✓</span> <span>ÁREA LIBERADA (${nearestSt.isIntermodal ? 'NODO INTERMODAL' : 'METRO'})</span>
                </div>
                <div style="color:#ddd; font-size:0.72rem; margin-top:2px; line-height:1.25;">
                    Demanda satisfecha por <b>${nearestSt.name}</b> (${Math.round(minStDist)}m de ${reachRadius}m de radio).
                </div>
            </div>
        `;
    } else {
        coverageHtml = `
            <div style="background:rgba(213,0,0,0.12); border:1px solid #d50000; border-radius:6px; padding:6px 8px; margin-top:8px;">
                <div style="color:#ff5252; font-weight:800; font-size:0.75rem; display:flex; align-items:center; gap:5px;">
                    <span>🔥</span> <span>DEMANDA INSATISFECHA (Sin Metro)</span>
                </div>
                <div style="color:#ddd; font-size:0.72rem; margin-top:2px; line-height:1.25;">
                    ${minStDist < 5000 && nearestSt ? `Estación más cercana: ${nearestSt.name} (${Math.round(minStDist)}m).` : 'Sin estación de metro cercana.'} Zona prioritaria para captar pasajeros.
                </div>
            </div>
        `;
    }

    // Metro Spacing Rule Check (280m)
    let spacingHtml = '';
    if (minStDist < 280 && nearestSt) {
        spacingHtml = `
            <div style="background:rgba(239,83,80,0.14); border:1px dashed #ef5350; border-radius:6px; padding:5px 8px; margin-top:6px; color:#ff8a80; font-size:0.72rem; line-height:1.25;">
                ⚠️� <b>Restricción de espaciado:</b> Demasiado cerca de <b>${nearestSt.name}</b> (${Math.round(minStDist)}m &lt; 280m mín. de separación).
            </div>
        `;
    } else {
        spacingHtml = `
            <div style="background:rgba(76,175,80,0.12); border:1px dashed #4caf50; border-radius:6px; padding:5px 8px; margin-top:6px; color:#81c784; font-size:0.72rem; line-height:1.25;">
                🚇 <b>Zona edificable:</b> Cumple la regla de &gt;280m de separación con otras estaciones.
            </div>
        `;
    }

    let attrPct = Math.min(100, Math.max(5, Math.round((attractionVal / 200) * 100)));

    let popupContent = `
        <div style="font-family:'Segoe UI',Roboto,sans-serif; color:#fff;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:6px;">
                <span style="display:inline-block; padding:2px 7px; border-radius:4px; font-size:0.68rem; font-weight:800; background:${tierColor}25; color:${tierColor}; border:1px solid ${tierColor}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${tierBadge}
                </span>
                <span style="font-size:0.72rem; color:#aaa; font-weight:600; white-space:nowrap;">📍� ${communeName}</span>
            </div>
            <div style="font-size:0.95rem; font-weight:800; color:#fff; margin-bottom:3px; line-height:1.2;">
                ${streetName}
            </div>
            <div style="font-size:0.72rem; color:#aaa; margin-bottom:8px; line-height:1.3;">
                ${streetDesc}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px; text-align:center;">
                    <div style="font-size:0.65rem; color:#888; text-transform:uppercase; font-weight:700;">DENSIDAD</div>
                    <div style="font-size:1.05rem; font-weight:800; color:${tierColor}; margin:1px 0;">
                        ${densityVal} <span style="font-size:0.65rem; color:#aaa;">hab/ha</span>
                    </div>
                    <div style="font-size:0.68rem; color:#bbb;">${densityCategory}</div>
                </div>
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px; text-align:center;">
                    <div style="font-size:0.65rem; color:#888; text-transform:uppercase; font-weight:700;">DEMANDA / ATTR</div>
                    <div style="font-size:1.05rem; font-weight:800; color:var(--accent); margin:1px 0;">
                        ${attractionVal} <span style="font-size:0.65rem; color:#aaa;">/ 200</span>
                    </div>
                    <div style="font-size:0.68rem; color:#bbb;">${attractionCategory}</div>
                </div>
            </div>
            <div style="height:4px; border-radius:2px; background:rgba(255,255,255,0.08); margin-bottom:6px; overflow:hidden;">
                <div style="height:100%; width:${attrPct}%; background:${tierColor};"></div>
            </div>
            ${coverageHtml}
            ${spacingHtml}
        </div>
    `;

    closeDensityInspector();

    densityInspectMarker = L.circleMarker(latlng, {
        radius: 7,
        color: tierColor,
        fillColor: tierColor,
        fillOpacity: 0.55,
        weight: 2.5
    }).addTo(map);

    densityInspectPopup = L.popup({
        className: 'density-inspector-popup',
        offset: [0, -8],
        closeButton: true,
        autoPan: true
    })
    .setLatLng(latlng)
    .setContent(popupContent)
    .openOn(map);

    densityInspectPopup.on('remove', function() {
        if (densityInspectMarker && map.hasLayer(densityInspectMarker)) {
            map.removeLayer(densityInspectMarker);
            densityInspectMarker = null;
        }
    });
}

// High-Performance Raster Loader: Uses pre-rendered GPU PNGs with Canvas fallback
function loadDensityRaster(lvl, callback) {
    if (densityRasterCache[lvl]) {
        callback(densityRasterCache[lvl]);
        return;
    }

    let pngCandidates = [
        `density_maps/santiago_density_lvl${lvl}.png`,
        `./density_maps/santiago_density_lvl${lvl}.png`,
        `JUEGO/density_maps/santiago_density_lvl${lvl}.png`,
        `santiago_density_lvl${lvl}.png`,
        `./santiago_density_lvl${lvl}.png`,
        `JUEGO/santiago_density_lvl${lvl}.png`
    ];
    let idx = 0;

    function tryNextPng() {
        if (idx >= pngCandidates.length) {
            // Fallback: in-browser Canvas rasterization from SVG
            rasterizeSvgToCanvasBlob(lvl, callback);
            return;
        }
        let url = pngCandidates[idx++];
        let testImg = new Image();
        testImg.onload = function() {
            densityRasterCache[lvl] = url;
            callback(url);
        };
        testImg.onerror = function() {
            tryNextPng();
        };
        testImg.src = url;
    }

    tryNextPng();
}

function rasterizeSvgToCanvasBlob(lvl, callback) {
    let svgCandidates = [
        `density_maps/santiago_density_lvl${lvl}.svg`,
        `./density_maps/santiago_density_lvl${lvl}.svg`,
        `JUEGO/density_maps/santiago_density_lvl${lvl}.svg`,
        `santiago_density_lvl${lvl}.svg`,
        `./santiago_density_lvl${lvl}.svg`
    ];
    let sIdx = 0;

    function tryNextSvg() {
        if (sIdx >= svgCandidates.length) {
            callback(`density_maps/santiago_density_lvl${lvl}.svg`);
            return;
        }
        let svgUrl = svgCandidates[sIdx++];
        let svgImg = new Image();
        svgImg.crossOrigin = 'anonymous';
        svgImg.onload = function() {
            try {
                let canvas = document.createElement('canvas');
                canvas.width = 2560;
                canvas.height = 2807;
                let ctx = canvas.getContext('2d');
                ctx.drawImage(svgImg, 0, 0, 2560, 2807);
                canvas.toBlob(function(blob) {
                    if (blob) {
                        let blobUrl = URL.createObjectURL(blob);
                        densityRasterCache[lvl] = blobUrl;
                        callback(blobUrl);
                    } else {
                        densityRasterCache[lvl] = svgUrl;
                        callback(svgUrl);
                    }
                }, 'image/png');
            } catch (e) {
                console.warn("Offscreen rasterization failed:", e);
                densityRasterCache[lvl] = svgUrl;
                callback(svgUrl);
            }
        };
        svgImg.onerror = function() {
            tryNextSvg();
        };
        svgImg.src = svgUrl;
    }

    tryNextSvg();
}

function renderDensityMapFilter() {
    if (!isDensityFilterActive) return;

    if (!map.hasLayer(densityMapLayerGroup)) map.addLayer(densityMapLayerGroup);
    if (!densityMapLayerGroup.hasLayer(densityCatchmentLayerGroup)) {
        densityMapLayerGroup.addLayer(densityCatchmentLayerGroup);
    }

    let metroStations = allStations.filter(s => s.type === 'metro' || s.isIntermodal);

    // 1. High-Performance Hardware-Accelerated 60 FPS Density Overlay
    const SANTIAGO_DENSITY_BOUNDS = L.latLngBounds(
        [-33.6977331, -70.8888608],
        [-33.2713440, -70.4226449]
    );
    let lvl = Math.min(10, Math.max(1, currentLevel || 1));

    if (currentLoadedRasterLvl !== lvl || !santiagoStreetOverlay || !densityMapLayerGroup.hasLayer(santiagoStreetOverlay)) {
        loadDensityRaster(lvl, function(rasterUrl) {
            if (!isDensityFilterActive) return;
            currentLoadedRasterLvl = lvl;

            if (santiagoStreetOverlay && densityMapLayerGroup.hasLayer(santiagoStreetOverlay)) {
                santiagoStreetOverlay.setUrl(rasterUrl);
            } else {
                santiagoStreetOverlay = L.imageOverlay(rasterUrl, SANTIAGO_DENSITY_BOUNDS, {
                    opacity: 0.95,
                    interactive: false,
                    pane: 'densityStreetPane',
                    zIndex: 340,
                    className: 'santiago-density-osm-grid'
                });
                santiagoStreetOverlay.addTo(densityMapLayerGroup);
            }
        });
    }

    // 2. Draw Clearly Marked Catchment Circles for Metro & Intermodal Stations
    densityCatchmentLayerGroup.clearLayers();
    let liberatedStationsCount = 0;
    metroStations.forEach(st => {
        if (!isPointInActiveZone(st.latlng)) return;
        liberatedStationsCount++;

        let radiusMeters = st.isIntermodal ? 520 : 360;
        let strokeColor = st.isIntermodal ? '#ffcc00' : '#00e5ff';
        let fillColor = st.isIntermodal ? '#ffd700' : '#00e5ff';

        // Catchment Area Circle
        let cCirc = L.circle(st.latlng, {
            radius: radiusMeters,
            color: strokeColor,
            weight: 2.2,
            dashArray: '6, 6',
            fillColor: fillColor,
            fillOpacity: st.isIntermodal ? 0.22 : 0.16,
            interactive: true
        });
        cCirc.on('click', function(ev) {
            if (isDensityFilterActive) {
                L.DomEvent.stopPropagation(ev);
                inspectDensityPoint(ev.latlng);
            }
        });
        cCirc.bindTooltip(
            currentLang === 'es'
                ? `🚇 <b>Área Liberada: ${st.name}</b>${st.isIntermodal ? ' <span style="background:#ffcc00; color:#000; padding:1px 5px; border-radius:3px; font-weight:800; font-size:0.7rem;">INTERMODAL</span>' : ''}<br><span style="color:#00e5ff; font-weight:700;">✓ Cobertura de Metro activa (Demanda absorbida)</span><br><span style="color:#bbb; font-size:0.75rem;">Radio: ${radiusMeters}m • Distancia mínima: 280m</span>`
                : `🚇 <b>Liberated Area: ${st.name}</b>${st.isIntermodal ? ' <span style="background:#ffcc00; color:#000; padding:1px 5px; border-radius:3px; font-weight:800; font-size:0.7rem;">INTERMODAL</span>' : ''}<br><span style="color:#00e5ff; font-weight:700;">✓ Active Subway coverage (Demand satisfied)</span><br><span style="color:#bbb; font-size:0.75rem;">Radius: ${radiusMeters}m • Min. separation: 280m</span>`,
            { sticky: true }
        ).addTo(densityCatchmentLayerGroup);

        // Station Center Core Marker
        L.circleMarker(st.latlng, {
            radius: st.isIntermodal ? 7.0 : 5.5,
            color: strokeColor,
            fillColor: '#ffffff',
            fillOpacity: 1.0,
            weight: 2,
            interactive: false
        }).addTo(densityCatchmentLayerGroup);
    });

    // 3. Update Floating HUD Stats
    let statsEl = document.getElementById('density-legend-stats');
    if (statsEl) {
        let lvlCounts = {
            1: { total: "3,851", r: "1,497", o: "334", y: "497", g: "1,523" },
            2: { total: "6,536", r: "1,601", o: "698", y: "889", g: "3,348" },
            3: { total: "10,553", r: "2.585", o: "1,127", y: "1,435", g: "5,406" },
            4: { total: "17,949", r: "4,397", o: "1,916", y: "2,441", g: "9,195" },
            5: { total: "29,660", r: "7,266", o: "3,167", y: "4,033", g: "15,194" },
            6: { total: "32,446", r: "7,949", o: "3,465", y: "4,412", g: "16,620" },
            7: { total: "38,311", r: "9,386", o: "4,091", y: "5,210", g: "19,624" },
            8: { total: "47,395", r: "11,611", o: "5,061", y: "6,445", g: "24,278" },
            9: { total: "52,713", r: "12,914", o: "5,629", y: "7,168", g: "27,002" },
            10: { total: "58,721", r: "14,395", o: "6,276", y: "7,984", g: "30,066" }
        }[lvl] || { total: "58,721", r: "14,395", o: "6,276", y: "7,984", g: "30,066" };

        let activeCommunesText = currentLevel === 10 
            ? (currentLang === 'es' ? 'Toda la Región Metropolitana (Nivel 10)' : 'Entire Metropolitan Region (Level 10)')
            : (currentLang === 'es' ? `Nivel ${currentLevel} (${unlockedCommunes.size} comunas activas)` : `Level ${currentLevel} (${unlockedCommunes.size} active communes)`);

        statsEl.innerHTML = `
            <div style="margin-bottom:6px; padding-bottom:5px; border-bottom:1px solid rgba(255,255,255,0.08); color:var(--accent); font-weight:700; font-size:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                <span>🗺️� ${activeCommunesText}</span>
                <span style="font-size:0.65rem; color:#00e5ff; background:rgba(0,229,255,0.15); border:1px solid rgba(0,229,255,0.4); padding:1px 6px; border-radius:10px; font-weight:800;">⚡ GPU 60 FPS</span>
            </div>
            <b>${lvlCounts.total}</b> ${currentLang === 'es' ? 'Vías renderizadas en zona activa' : 'Streets rendered in active zone'}<br>
            <span style="color:#d50000; font-weight:800;">🔴 ${lvlCounts.r}</span> ${currentLang === 'es' ? 'Grandes Avenidas (350+ / 2+ pistas)' : 'Major Avenues (350+ / 2+ lanes)'}<br>
            <span style="color:#ff9100; font-weight:800;">🟠 ${lvlCounts.o}</span> ${currentLang === 'es' ? 'Avenidas Locales (1 pista/sentido)' : 'Local Avenues (1 lane/side)'}<br>
            <span style="color:#ffb300; font-weight:800;">🟡 ${lvlCounts.y}</span> ${currentLang === 'es' ? 'Calles Menores / Conectoras' : 'Secondary / Connecting streets'}<br>
            <span style="color:#a3a18e; font-weight:800;">⚪ ${lvlCounts.g}</span> ${currentLang === 'es' ? 'Barrios Residenciales (Grisáceo)' : 'Neighborhoods (Yellow-gray)'}<br>
            <span style="color:#00e5ff; font-weight:800;">🔵 ${liberatedStationsCount}</span> ${currentLang === 'es' ? 'Estaciones de Metro satisfaciendo demanda' : 'Subway stations satisfying demand'}
            <div style="margin-top:6px; padding-top:5px; border-top:1px dashed rgba(255,255,255,0.1); font-size:0.7rem; color:#888; text-align:center;">
                💡 <i>${currentLang === 'es' ? 'Haz clic en cualquier calle o punto del mapa para inspeccionar densidad y demanda' : 'Click any street line on the map to inspect density & demand'}</i>
            </div>
        `;
    }
}
