/* ==============================================================
   MAPLIBRE GL JS 3D ENGINE & LEAFLET COMPATIBILITY ADAPTER
   Provides 60 FPS WebGL, OSM 3D buildings, 2.5D tilt/rotation,
   GPU car simulation with 3D building occlusion, and full
   compatibility with existing game simulation code.
   ============================================================== */

(function(window) {
    'use strict';

    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = Math.PI / 180;
        const dLat = (lat2 - lat1) * toRad;
        const dLon = (lon2 - lon1) * toRad;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function resolveColor(c, fallback = '#ffffff') {
        if (!c) return fallback;
        if (c === 'var(--accent)') return '#ffcc00';
        if (c === 'var(--danger-pastel)') return '#ff6961';
        if (c === 'var(--success-pastel)') return '#77dd77';
        if (c === 'var(--info-pastel)') return '#6ec6ff';
        if (c === 'var(--neutral-gray)') return '#b0b0b8';
        if (c === 'var(--neutral-station)') return '#888899';
        if (typeof c === 'string' && c.startsWith('var(')) {
            try {
                const varName = c.slice(4, -1).trim();
                const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
                if (val) return val;
            } catch(e) {}
            return fallback;
        }
        return c;
    }

    function isLayerGroup(target) {
        return (target instanceof LayerGroupAdapter) || (target && typeof target.addLayer === 'function' && !target.maplibre);
    }

    function makeLineFeature(coords) {
        if (!coords || coords.length < 2) {
            return {
                type: 'Feature',
                geometry: null,
                properties: {}
            };
        }
        return {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coords
            },
            properties: {}
        };
    }

    function makePolygonFeature(rings) {
        if (!rings || rings.length === 0 || !rings[0] || rings[0].length < 3) {
            return {
                type: 'Feature',
                geometry: null,
                properties: {}
            };
        }
        return {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: rings
            },
            properties: {}
        };
    }

    // High-performance Mercator coordinate projection for WebGL GPU rendering
    function lngLatToMercator(lng, lat) {
        const x = (lng + 180) / 360;
        const sin = Math.sin(lat * Math.PI / 180);
        const y = 0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI;
        return [x, y];
    }

    /* ==============================================================
       WEBGL TRAFFIC CAR OCCLUSION & RENDERING ENGINE
       Renders 350+ traffic cars directly inside WebGL with depth testing
       so cars naturally disappear behind 3D buildings at 60 FPS.
       ============================================================== */
    class TrafficCarManager {
        constructor() {
            this.maxCars = 600;
            // 3 floats per car: mercX, mercY, alpha
            this.positions = new Float32Array(this.maxCars * 3);
            this.cars = new Map();
            this.freeIndices = [];
            for (let i = this.maxCars - 1; i >= 0; i--) this.freeIndices.push(i);
            this.gl = null;
            this.program = null;
            this.buffer = null;
            this.map = null;
            this.uMatrix = null;
            this.uSize = null;
            this.uColor = null;
            this.aPos = null;
            this.aAlpha = null;
            this.isDirty = false;
        }

        addCar(marker, latlng) {
            if (this.freeIndices.length === 0) return -1;
            const idx = this.freeIndices.pop();
            this.cars.set(marker, idx);
            this.updateCarPos(marker, latlng, 1.0);
            return idx;
        }

        removeCar(marker) {
            if (!this.cars.has(marker)) return;
            const idx = this.cars.get(marker);
            this.cars.delete(marker);
            this.positions[idx * 3 + 2] = 0.0; // alpha = 0
            this.freeIndices.push(idx);
            this.isDirty = true;
            if (this.map && typeof this.map.triggerRepaint === 'function') {
                this.map.triggerRepaint();
            }
        }

        updateCarPos(marker, latlng, opacity = 1.0) {
            if (!this.cars.has(marker)) {
                this.addCar(marker, latlng);
                return;
            }
            const idx = this.cars.get(marker);
            const lat = latlng.lat !== undefined ? latlng.lat : latlng[0];
            const lng = latlng.lng !== undefined ? latlng.lng : latlng[1];
            const [x, y] = lngLatToMercator(lng, lat);
            this.positions[idx * 3] = x;
            this.positions[idx * 3 + 1] = y;
            this.positions[idx * 3 + 2] = opacity;
            this.isDirty = true;
            if (this.map && typeof this.map.triggerRepaint === 'function') {
                this.map.triggerRepaint();
            }
        }

        setCarOpacity(marker, opacity) {
            if (!this.cars.has(marker)) return;
            const idx = this.cars.get(marker);
            this.positions[idx * 3 + 2] = opacity;
            this.isDirty = true;
            if (this.map && typeof this.map.triggerRepaint === 'function') {
                this.map.triggerRepaint();
            }
        }

        getCustomLayer() {
            const self = this;
            return {
                id: 'webgl-traffic-cars',
                type: 'custom',
                renderingMode: '3d',
                onAdd(map, gl) {
                    self.map = map;
                    self.gl = gl;
                    if (!gl || !gl.createShader) return;

                    const vsSource = `
                        attribute vec2 a_pos;
                        attribute float a_alpha;
                        uniform mat4 u_matrix;
                        uniform float u_size;
                        varying float v_alpha;

                        void main() {
                            v_alpha = a_alpha;
                            gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
                            gl_PointSize = u_size;
                        }
                    `;

                    const fsSource = `
                        precision mediump float;
                        varying float v_alpha;
                        uniform vec3 u_color;

                        void main() {
                            if (v_alpha <= 0.01) discard;
                            vec2 coord = gl_PointCoord - vec2(0.5);
                            if (abs(coord.x) > 0.46 || abs(coord.y) > 0.46) discard;
                            gl_FragColor = vec4(u_color, v_alpha);
                        }
                    `;

                    function createShader(type, src) {
                        const shader = gl.createShader(type);
                        gl.shaderSource(shader, src);
                        gl.compileShader(shader);
                        return shader;
                    }

                    const vs = createShader(gl.VERTEX_SHADER, vsSource);
                    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
                    const prog = gl.createProgram();
                    gl.attachShader(prog, vs);
                    gl.attachShader(prog, fs);
                    gl.linkProgram(prog);
                    self.program = prog;

                    self.aPos = gl.getAttribLocation(prog, 'a_pos');
                    self.aAlpha = gl.getAttribLocation(prog, 'a_alpha');
                    self.uMatrix = gl.getUniformLocation(prog, 'u_matrix');
                    self.uSize = gl.getUniformLocation(prog, 'u_size');
                    self.uColor = gl.getUniformLocation(prog, 'u_color');

                    self.buffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, self.buffer);
                    gl.bufferData(gl.ARRAY_BUFFER, self.positions, gl.DYNAMIC_DRAW);
                },
                render(gl, matrix) {
                    if (!self.program || self.cars.size === 0) return;

                    gl.useProgram(self.program);

                    gl.bindBuffer(gl.ARRAY_BUFFER, self.buffer);
                    if (self.isDirty) {
                        gl.bufferSubData(gl.ARRAY_BUFFER, 0, self.positions);
                        self.isDirty = false;
                    }

                    gl.enableVertexAttribArray(self.aPos);
                    gl.vertexAttribPointer(self.aPos, 2, gl.FLOAT, false, 12, 0);

                    gl.enableVertexAttribArray(self.aAlpha);
                    gl.vertexAttribPointer(self.aAlpha, 1, gl.FLOAT, false, 12, 8);

                    if (!(matrix instanceof Float32Array)) {
                        if (!self._matrix32) self._matrix32 = new Float32Array(16);
                        self._matrix32.set(matrix);
                        gl.uniformMatrix4fv(self.uMatrix, false, self._matrix32);
                    } else {
                        gl.uniformMatrix4fv(self.uMatrix, false, matrix);
                    }

                    const zoom = self.map ? self.map.getZoom() : 14;
                    const pointSize = Math.max(3.0, Math.min(6.5, 3.0 + (zoom - 13.0) * 0.9));
                    gl.uniform1f(self.uSize, pointSize);
                    gl.uniform3f(self.uColor, 1.0, 1.0, 1.0);

                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

                    // 3D Depth testing: enables natural building occlusion!
                    gl.enable(gl.DEPTH_TEST);
                    gl.depthFunc(gl.LEQUAL);

                    gl.drawArrays(gl.POINTS, 0, self.maxCars);
                }
            };
        }
    }

    class LatLng {
        constructor(lat, lng) {
            if (Array.isArray(lat)) {
                this.lat = Number(lat[0]);
                this.lng = Number(lat[1]);
            } else if (typeof lat === 'object' && lat !== null) {
                this.lat = Number(lat.lat ?? lat[0]);
                this.lng = Number(lat.lng ?? lat.lon ?? lat[1]);
            } else {
                this.lat = Number(lat);
                this.lng = Number(lng);
            }
        }
        distanceTo(other) {
            if (!other) return 0;
            const o = (other instanceof LatLng) ? other : new LatLng(other);
            return haversineDistance(this.lat, this.lng, o.lat, o.lng);
        }
        equals(other, margin = 1e-7) {
            if (!other) return false;
            const o = (other instanceof LatLng) ? other : new LatLng(other);
            return Math.abs(this.lat - o.lat) <= margin && Math.abs(this.lng - o.lng) <= margin;
        }
        toString() {
            return `LatLng(${this.lat.toFixed(5)}, ${this.lng.toFixed(5)})`;
        }
    }

    class LatLngBounds {
        constructor(southWest, northEast) {
            if (Array.isArray(southWest) && !northEast) {
                this._sw = new LatLng(southWest[0]);
                this._ne = new LatLng(southWest[1]);
            } else {
                this._sw = new LatLng(southWest);
                this._ne = new LatLng(northEast);
            }
        }
        getSouth() { return this._sw.lat; }
        getWest() { return this._sw.lng; }
        getNorth() { return this._ne.lat; }
        getEast() { return this._ne.lng; }
        getSouthWest() { return this._sw; }
        getNorthEast() { return this._ne; }
        getCenter() {
            return new LatLng((this._sw.lat + this._ne.lat) / 2, (this._sw.lng + this._ne.lng) / 2);
        }
        contains(latlng) {
            const p = new LatLng(latlng);
            return p.lat >= this._sw.lat && p.lat <= this._ne.lat &&
                   p.lng >= this._sw.lng && p.lng <= this._ne.lng;
        }
    }

    let _idSeq = 1;

    class MarkerAdapter {
        constructor(latlng, options = {}) {
            this.id = 'marker-' + (_idSeq++);
            this.latlng = new LatLng(latlng);
            this.options = options;
            this.isCar = (options.icon && options.icon.className && options.icon.className.includes('car-wrapper')) || options.isCar;
            this._marker = null;
            this._map = null;
            this._parentGroup = null;
            this._handlers = {};
            this._proxyElement = null;

            if (!this.isCar) {
                this.element = document.createElement('div');
                this.element.className = 'maplibre-marker-wrapper ' + (options.className || '');
                
                if (options.zIndexOffset) {
                    this.element.style.zIndex = options.zIndexOffset;
                }
                if (options.interactive === false) {
                    this.element.style.pointerEvents = 'none';
                }
                if (options.icon && options.icon.html) {
                    this.element.innerHTML = options.icon.html;
                    if (options.icon.className) {
                        this.element.classList.add(options.icon.className);
                    }
                }

                ['click', 'mousedown', 'mouseup', 'mouseover', 'mouseout'].forEach(evtName => {
                    this.element.addEventListener(evtName, (ev) => {
                        if (this._handlers[evtName]) {
                            const fakeEv = {
                                latlng: this.latlng,
                                originalEvent: ev,
                                target: this
                            };
                            this._handlers[evtName].forEach(fn => fn(fakeEv));
                        }
                    });
                });
            }
        }
        _getTrafficManager() {
            if (this._map) {
                if (this._map.trafficCarManager) return this._map.trafficCarManager;
                if (this._map._map && this._map._map.trafficCarManager) return this._map._map.trafficCarManager;
            }
            if (this._parentGroup) {
                if (this._parentGroup._map && this._parentGroup._map.trafficCarManager) return this._parentGroup._map.trafficCarManager;
                if (this._parentGroup._map && this._parentGroup._map._map && this._parentGroup._map._map.trafficCarManager) return this._parentGroup._map._map.trafficCarManager;
            }
            if (window.map && window.map.trafficCarManager) return window.map.trafficCarManager;
            return null;
        }
        setLatLng(latlng) {
            this.latlng = new LatLng(latlng);
            if (this.isCar) {
                const tm = this._getTrafficManager();
                if (tm) {
                    tm.updateCarPos(this, this.latlng, 1.0);
                }
            } else if (this._marker) {
                this._marker.setLngLat([this.latlng.lng, this.latlng.lat]);
            }
            return this;
        }
        getLatLng() {
            return this.latlng;
        }
        setIcon(icon) {
            this.options.icon = icon;
            if (!this.isCar && this.element && icon && icon.html) {
                this.element.innerHTML = icon.html;
                if (icon.className) this.element.className = 'maplibre-marker-wrapper ' + icon.className;
            }
            return this;
        }
        getElement() {
            if (this.isCar) {
                if (!this._proxyElement) {
                    this._proxyElement = {
                        classList: {
                            add: (cls) => {
                                if (cls === 'car-despawn') {
                                    const tm = this._getTrafficManager();
                                    if (tm) {
                                        tm.setCarOpacity(this, 0.0);
                                    }
                                }
                            },
                            remove: () => {}
                        },
                        style: {}
                    };
                }
                return this._proxyElement;
            }
            return this.element;
        }
        setOpacity(op) {
            if (this.isCar) {
                const tm = this._getTrafficManager();
                if (tm) {
                    tm.setCarOpacity(this, op);
                }
            } else if (this.element) {
                this.element.style.opacity = op;
            }
            return this;
        }
        on(event, handler) {
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(handler);
            return this;
        }
        off(event, handler) {
            if (!this._handlers[event]) return this;
            this._handlers[event] = this._handlers[event].filter(h => h !== handler);
            return this;
        }
        bindTooltip(content, options = {}) {
            this._tooltipContent = content;
            this._tooltipOptions = options;
            return this;
        }
        unbindTooltip() {
            this._tooltipContent = null;
            return this;
        }
        bindPopup(content, options = {}) {
            this._popupContent = content;
            this._popupOptions = options;
            return this;
        }
        unbindPopup() {
            this._popupContent = null;
            return this;
        }
        addTo(targetMap) {
            if (isLayerGroup(targetMap)) {
                targetMap.addLayer(this);
                return this;
            }
            this._map = targetMap;
            if (targetMap && targetMap._layers) targetMap._layers.add(this);

            if (this.isCar) {
                const tm = this._getTrafficManager();
                if (tm) {
                    tm.addCar(this, this.latlng);
                }
                return this;
            }

            const ml = targetMap.maplibre || targetMap;
            if (!this._marker) {
                this._marker = new maplibregl.Marker({
                    element: this.element,
                    anchor: 'center',
                    pitchAlignment: 'viewport',
                    rotationAlignment: 'viewport'
                });
            }
            this._marker.setLngLat([this.latlng.lng, this.latlng.lat]);
            this._marker.addTo(ml);
            return this;
        }
        remove() {
            if (this.isCar) {
                const tm = this._getTrafficManager();
                if (tm) {
                    tm.removeCar(this);
                }
            }
            if (this._map && this._map._layers) this._map._layers.delete(this);
            if (this._parentGroup) this._parentGroup._layers.delete(this);
            if (this._marker) {
                this._marker.remove();
            }
            this._map = null;
            return this;
        }
    }

    class CircleMarkerAdapter {
        constructor(latlng, options = {}) {
            this.latlng = new LatLng(latlng);
            this.options = Object.assign({ radius: 8, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.5 }, options);
            this.element = document.createElement('div');
            this.element.className = 'maplibre-circle-marker ' + (options.className || '');
            this._handlers = {};
            this._updateStyles();
            this._marker = null;
            this._map = null;
            this._parentGroup = null;

            ['click', 'mousedown', 'mouseup', 'mouseover', 'mouseout'].forEach(evtName => {
                this.element.addEventListener(evtName, (ev) => {
                    if (this._handlers[evtName]) {
                        const fakeEv = {
                            latlng: this.latlng,
                            originalEvent: ev,
                            target: this
                        };
                        this._handlers[evtName].forEach(fn => fn(fakeEv));
                    }
                });
            });
        }
        _updateStyles() {
            const r = this.options.radius || 8;
            const color = this.options.color || '#fff';
            const fill = this.options.fillColor || color;
            const op = this.options.opacity !== undefined ? Number(this.options.opacity) : 1;
            const fillOp = this.options.fillOpacity !== undefined ? Number(this.options.fillOpacity) : 0.5;

            // Completely hide the DOM element if opacity is 0
            if (op <= 0 || (this.options.opacity === 0 && (this.options.fillOpacity === undefined || this.options.fillOpacity === 0))) {
                this.element.style.display = 'none';
                this.element.style.opacity = '0';
                this.element.style.pointerEvents = 'none';
                return;
            }

            this.element.style.display = 'block';
            this.element.style.margin = '0';
            this.element.style.padding = '0';
            this.element.style.width = (r * 2) + 'px';
            this.element.style.height = (r * 2) + 'px';
            this.element.style.borderRadius = '50%';
            this.element.style.border = `${this.options.weight || 2}px solid ${color}`;
            this.element.style.backgroundColor = fill;
            this.element.style.opacity = op;
            this.element.style.pointerEvents = this.options.interactive ? 'auto' : 'none';
            this.element.style.boxSizing = 'border-box';
        }
        setLatLng(latlng) {
            this.latlng = new LatLng(latlng);
            if (this._marker) {
                this._marker.setLngLat([this.latlng.lng, this.latlng.lat]);
            }
            return this;
        }
        setStyle(opts) {
            Object.assign(this.options, opts);
            this._updateStyles();
            return this;
        }
        on(event, handler) {
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(handler);
            return this;
        }
        off(event, handler) {
            if (!this._handlers[event]) return this;
            this._handlers[event] = this._handlers[event].filter(h => h !== handler);
            return this;
        }
        bindTooltip(content, options = {}) {
            this._tooltipContent = content;
            this._tooltipOptions = options;
            return this;
        }
        unbindTooltip() {
            this._tooltipContent = null;
            return this;
        }
        bindPopup(content, options = {}) {
            this._popupContent = content;
            this._popupOptions = options;
            return this;
        }
        unbindPopup() {
            this._popupContent = null;
            return this;
        }
        addTo(targetMap) {
            if (isLayerGroup(targetMap)) {
                targetMap.addLayer(this);
                return this;
            }
            this._map = targetMap;
            if (targetMap && targetMap._layers) targetMap._layers.add(this);
            const ml = targetMap.maplibre || targetMap;
            if (!this._marker) {
                this._marker = new maplibregl.Marker({
                    element: this.element,
                    anchor: 'center',
                    pitchAlignment: 'viewport',
                    rotationAlignment: 'viewport'
                });
            }
            this._marker.setLngLat([this.latlng.lng, this.latlng.lat]);
            this._marker.addTo(ml);
            return this;
        }
        remove() {
            if (this._map && this._map._layers) this._map._layers.delete(this);
            if (this._parentGroup) this._parentGroup._layers.delete(this);
            if (this._marker) this._marker.remove();
            this._map = null;
            return this;
        }
    }

    class PolylineAdapter {
        constructor(coords = [], options = {}) {
            this.id = 'poly-' + (_idSeq++);
            this.sourceId = 'src-' + this.id;
            this.layerId = 'lay-' + this.id;
            this.coords = coords;
            this.options = Object.assign({ color: '#ffcc00', weight: 4, opacity: 0.9 }, options);
            this._map = null;
            this._parentGroup = null;
            this._added = false;
            this._isRemoved = false;
            this._handlers = {};
        }
        _toLngLats(coords) {
            if (!coords) return [];
            return coords.map(c => {
                if (Array.isArray(c)) return [Number(c[1]), Number(c[0])];
                if (c && typeof c.lat === 'number') return [Number(c.lng), Number(c.lat)];
                return [0, 0];
            });
        }
        setLatLngs(coords) {
            this.coords = coords;
            if (this._map && this._added) {
                const ml = this._map.maplibre || this._map;
                const src = ml.getSource(this.sourceId);
                if (src) {
                    src.setData(makeLineFeature(this._toLngLats(this.coords)));
                }
            }
            return this;
        }
        setStyle(opts) {
            Object.assign(this.options, opts);
            if (this._map && this._added) {
                const ml = this._map.maplibre || this._map;
                if (opts.color && ml.getLayer(this.layerId)) ml.setPaintProperty(this.layerId, 'line-color', resolveColor(opts.color, '#ffcc00'));
                if (opts.weight && ml.getLayer(this.layerId)) ml.setPaintProperty(this.layerId, 'line-width', opts.weight);
                if (opts.opacity !== undefined && ml.getLayer(this.layerId)) ml.setPaintProperty(this.layerId, 'line-opacity', opts.opacity);
            }
            return this;
        }
        on(event, handler) {
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(handler);
            if (event === 'click' && this._added && this._map) {
                const ml = this._map.maplibre || this._map;
                this._registerLayerClick(ml);
            }
            return this;
        }
        off(event, handler) {
            if (!this._handlers[event]) return this;
            this._handlers[event] = this._handlers[event].filter(h => h !== handler);
            return this;
        }
        bindTooltip(content, options = {}) {
            this._tooltipContent = content;
            this._tooltipOptions = options;
            return this;
        }
        unbindTooltip() {
            this._tooltipContent = null;
            return this;
        }
        bindPopup(content, options = {}) {
            this._popupContent = content;
            this._popupOptions = options;
            return this;
        }
        unbindPopup() {
            this._popupContent = null;
            return this;
        }
        _registerLayerClick(ml) {
            if (this._clickRegistered) return;
            this._clickRegistered = true;
            ml.on('click', this.layerId, (e) => {
                if (this._handlers['click']) {
                    const ev = {
                        latlng: new LatLng(e.lngLat.lat, e.lngLat.lng),
                        originalEvent: e.originalEvent
                    };
                    this._handlers['click'].forEach(fn => fn(ev));
                }
            });
        }
        addTo(targetMap) {
            if (isLayerGroup(targetMap)) {
                targetMap.addLayer(this);
                return this;
            }
            this._map = targetMap;
            if (targetMap && targetMap._layers) targetMap._layers.add(this);
            this._isRemoved = false;
            const ml = targetMap.maplibre || targetMap;
            targetMap._runWhenReady(() => {
                if (this._isRemoved) return;
                if (ml.getSource(this.sourceId)) return;
                const lngLats = this._toLngLats(this.coords);
                ml.addSource(this.sourceId, {
                    type: 'geojson',
                    data: makeLineFeature(lngLats)
                });
                const paint = {
                    'line-color': resolveColor(this.options.color, '#ffcc00'),
                    'line-width': this.options.weight || 4,
                    'line-opacity': this.options.opacity !== undefined ? this.options.opacity : 0.9
                };
                if (this.options.dashArray) {
                    paint['line-dasharray'] = [2, 2];
                }
                ml.addLayer({
                    id: this.layerId,
                    type: 'line',
                    source: this.sourceId,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: paint
                });
                if (this._handlers['click'] && this._handlers['click'].length > 0) {
                    this._registerLayerClick(ml);
                }
                this._added = true;
            });
            return this;
        }
        remove() {
            this._isRemoved = true;
            if (this._map && this._map._layers) this._map._layers.delete(this);
            if (this._parentGroup) this._parentGroup._layers.delete(this);
            if (this._map && this._added) {
                const ml = this._map.maplibre || this._map;
                if (ml.getLayer(this.layerId)) ml.removeLayer(this.layerId);
                if (ml.getSource(this.sourceId)) ml.removeSource(this.sourceId);
                this._added = false;
            }
            this._map = null;
            return this;
        }
    }

    class PolygonAdapter {
        constructor(rings = [], options = {}) {
            this.id = 'polygon-' + (_idSeq++);
            this.sourceId = 'src-' + this.id;
            this.layerId = 'lay-' + this.id;
            this.rings = rings;
            this.options = options;
            this._map = null;
            this._parentGroup = null;
            this._added = false;
            this._isRemoved = false;
            this._handlers = {};
        }
        on(event, handler) {
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(handler);
            if (event === 'click' && this._added && this._map) {
                const ml = this._map.maplibre || this._map;
                this._registerLayerClick(ml);
            }
            return this;
        }
        off(event, handler) {
            if (!this._handlers[event]) return this;
            this._handlers[event] = this._handlers[event].filter(h => h !== handler);
            return this;
        }
        bindTooltip(content, options = {}) {
            this._tooltipContent = content;
            this._tooltipOptions = options;
            return this;
        }
        unbindTooltip() {
            this._tooltipContent = null;
            return this;
        }
        bindPopup(content, options = {}) {
            this._popupContent = content;
            this._popupOptions = options;
            return this;
        }
        unbindPopup() {
            this._popupContent = null;
            return this;
        }
        _registerLayerClick(ml) {
            if (this._clickRegistered) return;
            this._clickRegistered = true;
            ml.on('click', this.layerId, (e) => {
                if (this._handlers['click']) {
                    const ev = {
                        latlng: new LatLng(e.lngLat.lat, e.lngLat.lng),
                        originalEvent: e.originalEvent
                    };
                    this._handlers['click'].forEach(fn => fn(ev));
                }
            });
        }
        setLatLngs(rings) {
            this.rings = rings;
            if (this._map && this._added) {
                const ml = this._map.maplibre || this._map;
                const src = ml.getSource(this.sourceId);
                if (src) {
                    let coordsRings = this.rings;
                    if (coordsRings.length > 0 && (typeof coordsRings[0][0] === 'number' || coordsRings[0].lat !== undefined)) {
                        coordsRings = [coordsRings];
                    }
                    const coords = coordsRings.map(ring => {
                        let r = ring.map(pt => {
                            if (Array.isArray(pt)) return [Number(pt[1]), Number(pt[0])];
                            if (pt && typeof pt.lat === 'number') return [Number(pt.lng), Number(pt.lat)];
                            return [0, 0];
                        });
                        if (r.length > 0) {
                            let first = r[0], last = r[r.length - 1];
                            if (first[0] !== last[0] || first[1] !== last[1]) {
                                r.push([first[0], first[1]]);
                            }
                        }
                        return r;
                    });
                    src.setData(makePolygonFeature(coords));
                }
            }
            return this;
        }
        setStyle(opts) {
            Object.assign(this.options, opts);
            if (this._map && this._added) {
                const ml = this._map.maplibre || this._map;
                if (opts.fillColor && ml.getLayer(this.layerId)) {
                    ml.setPaintProperty(this.layerId, 'fill-color', resolveColor(opts.fillColor, '#050508'));
                }
                if (opts.fillOpacity !== undefined && ml.getLayer(this.layerId)) {
                    ml.setPaintProperty(this.layerId, 'fill-opacity', opts.fillOpacity);
                }
            }
            return this;
        }
        addTo(targetMap) {
            if (isLayerGroup(targetMap)) {
                targetMap.addLayer(this);
                return this;
            }
            this._map = targetMap;
            if (targetMap && targetMap._layers) targetMap._layers.add(this);
            this._isRemoved = false;
            const ml = targetMap.maplibre || targetMap;
            targetMap._runWhenReady(() => {
                if (this._isRemoved) return;
                if (ml.getSource(this.sourceId)) return;
                let coordsRings = this.rings;
                if (coordsRings.length > 0 && (typeof coordsRings[0][0] === 'number' || coordsRings[0].lat !== undefined)) {
                    coordsRings = [coordsRings];
                }
                const coords = coordsRings.map(ring => {
                    let r = ring.map(pt => {
                        if (Array.isArray(pt)) return [Number(pt[1]), Number(pt[0])];
                        if (pt && typeof pt.lat === 'number') return [Number(pt.lng), Number(pt.lat)];
                        return [0, 0];
                    });
                    if (r.length > 0) {
                        let first = r[0], last = r[r.length - 1];
                        if (first[0] !== last[0] || first[1] !== last[1]) {
                            r.push([first[0], first[1]]);
                        }
                    }
                    return r;
                });
                ml.addSource(this.sourceId, {
                    type: 'geojson',
                    data: makePolygonFeature(coords)
                });

                // Active Commune Mask (Fog of War):
                // Renders dark ground fill UNDER 3D buildings and WebGL traffic cars.
                // Because 3D buildings (such as Gran Torre Santiago / Costanera Center) render AFTER
                // the mask, their full 3D geometry rises cleanly OVER the dark blocked zone without any slicing!
                if (this.options.pane === 'maskPane') {
                    const beforeBuildingsId = ml.getLayer('webgl-traffic-cars') ? 'webgl-traffic-cars' : (ml.getLayer('3d-buildings') ? '3d-buildings' : undefined);
                    ml.addLayer({
                        id: this.layerId,
                        type: 'fill',
                        source: this.sourceId,
                        paint: {
                            'fill-color': resolveColor(this.options.fillColor, '#050508'),
                            'fill-opacity': this.options.fillOpacity !== undefined ? this.options.fillOpacity : 0.88
                        }
                    }, beforeBuildingsId);
                } else {
                    ml.addLayer({
                        id: this.layerId,
                        type: 'fill',
                        source: this.sourceId,
                        paint: {
                            'fill-color': resolveColor(this.options.fillColor, '#050508'),
                            'fill-opacity': this.options.fillOpacity !== undefined ? this.options.fillOpacity : 0.88
                        }
                    });
                }

                if (this._handlers['click'] && this._handlers['click'].length > 0) {
                    this._registerLayerClick(ml);
                }
                this._added = true;
            });
            return this;
        }
        remove() {
            this._isRemoved = true;
            if (this._map && this._map._layers) this._map._layers.delete(this);
            if (this._parentGroup) this._parentGroup._layers.delete(this);
            if (this._map && this._added) {
                const ml = this._map.maplibre || this._map;
                if (ml.getLayer(this.layerId)) ml.removeLayer(this.layerId);
                if (ml.getSource(this.sourceId)) ml.removeSource(this.sourceId);
                this._added = false;
            }
            this._map = null;
            return this;
        }
    }

    class CircleAdapter {
        constructor(latlng, options = {}) {
            this.id = 'circle-' + (_idSeq++);
            this.sourceId = 'src-' + this.id;
            this.layerId = 'lay-' + this.id;
            this.lineLayerId = 'lay-line-' + this.id;
            this.latlng = new LatLng(latlng);
            this.radius = options.radius || 300;
            this.options = options;
            this._map = null;
            this._parentGroup = null;
            this._added = false;
            this._isRemoved = false;
            this._handlers = {};
        }
        _generateCirclePolygon(centerLat, centerLng, radiusMeters, points = 48) {
            const coords = [];
            const earthRadius = 6371000;
            const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
            const dLng = dLat / Math.cos(centerLat * (Math.PI / 180));
            for (let i = 0; i <= points; i++) {
                const theta = (i / points) * (2 * Math.PI);
                const lat = centerLat + dLat * Math.sin(theta);
                const lng = centerLng + dLng * Math.cos(theta);
                coords.push([lng, lat]);
            }
            return [coords];
        }
        on(event, handler) {
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(handler);
            if (event === 'click' && this._added && this._map) {
                const ml = this._map.maplibre || this._map;
                this._registerLayerClick(ml);
            }
            return this;
        }
        off(event, handler) {
            if (!this._handlers[event]) return this;
            this._handlers[event] = this._handlers[event].filter(h => h !== handler);
            return this;
        }
        bindTooltip(content, options = {}) {
            this._tooltipContent = content;
            this._tooltipOptions = options;
            return this;
        }
        unbindTooltip() {
            this._tooltipContent = null;
            return this;
        }
        bindPopup(content, options = {}) {
            this._popupContent = content;
            this._popupOptions = options;
            return this;
        }
        unbindPopup() {
            this._popupContent = null;
            return this;
        }
        _registerLayerClick(ml) {
            if (this._clickRegistered) return;
            this._clickRegistered = true;
            ml.on('click', this.layerId, (e) => {
                if (this._handlers['click']) {
                    const ev = {
                        latlng: new LatLng(e.lngLat.lat, e.lngLat.lng),
                        originalEvent: e.originalEvent
                    };
                    this._handlers['click'].forEach(fn => fn(ev));
                }
            });
        }
        addTo(targetMap) {
            if (isLayerGroup(targetMap)) {
                targetMap.addLayer(this);
                return this;
            }
            this._map = targetMap;
            if (targetMap && targetMap._layers) targetMap._layers.add(this);
            this._isRemoved = false;
            const ml = targetMap.maplibre || targetMap;
            targetMap._runWhenReady(() => {
                if (this._isRemoved) return;
                if (ml.getSource(this.sourceId)) return;
                const polygonCoords = this._generateCirclePolygon(this.latlng.lat, this.latlng.lng, this.radius);
                ml.addSource(this.sourceId, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: polygonCoords
                        }
                    }
                });
                ml.addLayer({
                    id: this.layerId,
                    type: 'fill',
                    source: this.sourceId,
                    paint: {
                        'fill-color': resolveColor(this.options.fillColor || this.options.color, '#00e5ff'),
                        'fill-opacity': this.options.fillOpacity !== undefined ? this.options.fillOpacity : 0.2
                    }
                });
                const linePaint = {
                    'line-color': resolveColor(this.options.color, '#00e5ff'),
                    'line-width': this.options.weight || 2
                };
                if (this.options.dashArray) {
                    linePaint['line-dasharray'] = [2, 2];
                }
                ml.addLayer({
                    id: this.lineLayerId,
                    type: 'line',
                    source: this.sourceId,
                    paint: linePaint
                });
                if (this._handlers['click'] && this._handlers['click'].length > 0) {
                    this._registerLayerClick(ml);
                }
                this._added = true;
            });
            return this;
        }
        remove() {
            this._isRemoved = true;
            if (this._map && this._map._layers) this._map._layers.delete(this);
            if (this._parentGroup) this._parentGroup._layers.delete(this);
            if (this._map && this._added) {
                const ml = this._map.maplibre || this._map;
                if (ml.getLayer(this.lineLayerId)) ml.removeLayer(this.lineLayerId);
                if (ml.getLayer(this.layerId)) ml.removeLayer(this.layerId);
                if (ml.getSource(this.sourceId)) ml.removeSource(this.sourceId);
                this._added = false;
            }
            this._map = null;
            return this;
        }
    }

    class ImageOverlayAdapter {
        constructor(url, bounds, options = {}) {
            this.id = 'img-' + (_idSeq++);
            this.sourceId = 'src-' + this.id;
            this.layerId = 'lay-' + this.id;
            this.url = url;
            this.bounds = bounds;
            this.options = options;
            this._map = null;
            this._parentGroup = null;
            this._added = false;
            this._isRemoved = false;
            this._handlers = {};
        }
        setUrl(url) {
            this.url = url;
            if (this._map && this._added) {
                const ml = this._map.maplibre || this._map;
                const src = ml.getSource(this.sourceId);
                if (src && src.updateImage) {
                    src.updateImage({ url: this.url });
                }
            }
            return this;
        }
        on(event, handler) {
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(handler);
            return this;
        }
        off(event, handler) {
            if (!this._handlers[event]) return this;
            this._handlers[event] = this._handlers[event].filter(h => h !== handler);
            return this;
        }
        bindTooltip(content, options = {}) {
            this._tooltipContent = content;
            this._tooltipOptions = options;
            return this;
        }
        unbindTooltip() {
            this._tooltipContent = null;
            return this;
        }
        bindPopup(content, options = {}) {
            this._popupContent = content;
            this._popupOptions = options;
            return this;
        }
        unbindPopup() {
            this._popupContent = null;
            return this;
        }
        addTo(targetMap) {
            if (isLayerGroup(targetMap)) {
                targetMap.addLayer(this);
                return this;
            }
            this._map = targetMap;
            if (targetMap && targetMap._layers) targetMap._layers.add(this);
            this._isRemoved = false;
            const ml = targetMap.maplibre || targetMap;
            targetMap._runWhenReady(() => {
                if (this._isRemoved) return;
                if (ml.getSource(this.sourceId)) return;
                const sw = this.bounds.getSouthWest();
                const ne = this.bounds.getNorthEast();
                ml.addSource(this.sourceId, {
                    type: 'image',
                    url: this.url,
                    coordinates: [
                        [sw.lng, ne.lat],
                        [ne.lng, ne.lat],
                        [ne.lng, sw.lat],
                        [sw.lng, sw.lat]
                    ]
                });
                const beforeId = ml.getLayer('webgl-traffic-cars') ? 'webgl-traffic-cars' : (ml.getLayer('3d-buildings') ? '3d-buildings' : undefined);
                ml.addLayer({
                    id: this.layerId,
                    type: 'raster',
                    source: this.sourceId,
                    paint: {
                        'raster-opacity': this.options.opacity !== undefined ? this.options.opacity : 0.95
                    }
                }, beforeId);
                this._added = true;
            });
            return this;
        }
        remove() {
            this._isRemoved = true;
            if (this._map && this._map._layers) this._map._layers.delete(this);
            if (this._parentGroup) this._parentGroup._layers.delete(this);
            if (this._map && this._added) {
                const ml = this._map.maplibre || this._map;
                if (ml.getLayer(this.layerId)) ml.removeLayer(this.layerId);
                if (ml.getSource(this.sourceId)) ml.removeSource(this.sourceId);
                this._added = false;
            }
            this._map = null;
            return this;
        }
    }

    class LayerGroupAdapter {
        constructor(layers = []) {
            this._layers = new Set(layers);
            this._map = null;
            this._parentGroup = null;
            this._handlers = {};
        }
        addLayer(layer) {
            if (!layer) return this;
            this._layers.add(layer);
            layer._parentGroup = this;
            if (this._map) {
                layer.addTo(this._map);
            }
            return this;
        }
        removeLayer(layer) {
            if (!layer) return this;
            this._layers.delete(layer);
            if (typeof layer.remove === 'function') {
                layer.remove();
            }
            return this;
        }
        hasLayer(layer) {
            return this._layers.has(layer);
        }
        clearLayers() {
            this._layers.forEach(layer => {
                if (layer && typeof layer.remove === 'function') {
                    layer.remove();
                }
            });
            this._layers.clear();
            return this;
        }
        on(event, handler) {
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(handler);
            return this;
        }
        off(event, handler) {
            if (!this._handlers[event]) return this;
            this._handlers[event] = this._handlers[event].filter(h => h !== handler);
            return this;
        }
        bindTooltip(content, options = {}) {
            this._layers.forEach(l => { if (l && typeof l.bindTooltip === 'function') l.bindTooltip(content, options); });
            return this;
        }
        unbindTooltip() {
            this._layers.forEach(l => { if (l && typeof l.unbindTooltip === 'function') l.unbindTooltip(); });
            return this;
        }
        bindPopup(content, options = {}) {
            this._layers.forEach(l => { if (l && typeof l.bindPopup === 'function') l.bindPopup(content, options); });
            return this;
        }
        unbindPopup() {
            this._layers.forEach(l => { if (l && typeof l.unbindPopup === 'function') l.unbindPopup(); });
            return this;
        }
        addTo(targetMap) {
            if (isLayerGroup(targetMap)) {
                targetMap.addLayer(this);
                return this;
            }
            this._map = targetMap;
            if (targetMap && targetMap._layers) {
                targetMap._layers.add(this);
            }
            this._layers.forEach(layer => {
                layer.addTo(targetMap);
            });
            return this;
        }
        remove() {
            if (this._map && this._map._layers) {
                this._map._layers.delete(this);
            }
            if (this._parentGroup) {
                this._parentGroup._layers.delete(this);
            }
            this._layers.forEach(layer => {
                if (layer && typeof layer.remove === 'function') {
                    layer.remove();
                }
            });
            this._map = null;
            return this;
        }
    }

    class PopupAdapter {
        constructor(options = {}) {
            this.options = options;
            this._handlers = {};
            this._popup = new maplibregl.Popup({
                className: options.className || 'custom-popup',
                offset: options.offset || [0, 0],
                closeButton: options.closeButton !== undefined ? options.closeButton : true,
                closeOnClick: options.closeOnClick !== undefined ? options.closeOnClick : true
            });
            this._map = null;

            this._popup.on('close', () => {
                if (this._map && this._map._activePopup === this) {
                    this._map._activePopup = null;
                }
                if (this._handlers['remove']) {
                    this._handlers['remove'].forEach(fn => fn({ target: this }));
                }
                if (this._handlers['close']) {
                    this._handlers['close'].forEach(fn => fn({ target: this }));
                }
            });
        }
        on(event, handler) {
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(handler);
            return this;
        }
        off(event, handler) {
            if (!this._handlers[event]) return this;
            this._handlers[event] = this._handlers[event].filter(h => h !== handler);
            return this;
        }
        setLatLng(latlng) {
            const p = new LatLng(latlng);
            this._popup.setLngLat([p.lng, p.lat]);
            return this;
        }
        setContent(html) {
            this._popup.setHTML(html);
            return this;
        }
        openOn(targetMap) {
            this._map = targetMap;
            if (targetMap && targetMap._layers) targetMap._layers.add(this);
            if (targetMap) targetMap._activePopup = this;
            const ml = targetMap.maplibre || targetMap;
            this._popup.addTo(ml);
            return this;
        }
        remove() {
            if (this._map && this._map._layers) this._map._layers.delete(this);
            if (this._map && this._map._activePopup === this) this._map._activePopup = null;
            this._popup.remove();
            if (this._handlers['remove']) {
                this._handlers['remove'].forEach(fn => fn({ target: this }));
            }
            this._map = null;
            return this;
        }
    }

    class MapLibreMapWrapper {
        constructor(containerId, options = {}) {
            this.is2D = false;
            this._readyQueue = [];
            this._isReady = false;
            this._layers = new Set();
            this._panes = {};
            this._activePopup = null;
            this.trafficCarManager = new TrafficCarManager();

            this.maplibre = new maplibregl.Map({
                container: containerId,
                style: 'https://tiles.openfreemap.org/styles/dark',
                center: [-70.6350, -33.4380], // Santiago
                zoom: 13.5,
                pitch: 55, // 2.5D view
                bearing: -15,
                canvasContextAttributes: { antialias: true }
            });

            this.maplibre.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

            this.dragging = {
                enable: () => this.maplibre.dragPan.enable(),
                disable: () => this.maplibre.dragPan.disable()
            };

            this.maplibre.on('load', () => {
                this._inject3DBuildings();
                this._isReady = true;
                this._readyQueue.forEach(fn => fn());
                this._readyQueue = [];
            });
        }

        _inject3DBuildings() {
            try {
                // Hide 2D flat building footprints to prevent ground z-fighting
                if (this.maplibre.getLayer('building')) {
                    this.maplibre.setLayoutProperty('building', 'visibility', 'none');
                }

                // Locate beforeId right before place labels
                const layers = this.maplibre.getStyle().layers;
                let targetBeforeId = null;
                for (let i = 0; i < layers.length; i++) {
                    if (layers[i].id && layers[i].id.startsWith('place_')) {
                        targetBeforeId = layers[i].id;
                        break;
                    }
                }

                const sourceName = this.maplibre.getSource('openmaptiles') ? 'openmaptiles' : null;
                if (sourceName) {
                    // 1. Add WebGL traffic cars layer BEFORE 3D buildings
                    // This allows 3D buildings to occlude cars that drive behind them!
                    if (!this.maplibre.getLayer('webgl-traffic-cars')) {
                        this.maplibre.addLayer(this.trafficCarManager.getCustomLayer(), targetBeforeId);
                    }

                    // 2. Add solid 3D OSM Buildings with directional sunlight
                    if (!this.maplibre.getLayer('3d-buildings')) {
                        this.maplibre.setLight({
                            anchor: 'viewport',
                            color: '#ffffff',
                            intensity: 0.55,
                            position: [1.25, 120, 50]
                        });

                        this.maplibre.addLayer({
                            'id': '3d-buildings',
                            'source': sourceName,
                            'source-layer': 'building',
                            'type': 'fill-extrusion',
                            'minzoom': 13.0,
                            'paint': {
                                'fill-extrusion-color': [
                                    'interpolate',
                                    ['linear'],
                                    ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
                                    0, '#30344a',
                                    20, '#3d4361',
                                    50, '#4e567d',
                                    100, '#636e9e',
                                    200, '#7b89c4',
                                    300, '#93a3e6'
                                ],
                                'fill-extrusion-height': [
                                    'interpolate',
                                    ['linear'],
                                    ['zoom'],
                                    13.0, 0,
                                    14.2, ['coalesce', ['get', 'render_height'], ['get', 'height'], 12]
                                ],
                                'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
                                'fill-extrusion-opacity': [
                                    'interpolate',
                                    ['linear'],
                                    ['zoom'],
                                    13.0, 1.0,
                                    16.8, 1.0,
                                    17.8, 0.72,
                                    19.0, 0.45
                                ]
                            }
                        }, targetBeforeId);
                        if (this._densityMode) {
                            this.setDensityMode(true);
                        }
                    }
                }
            } catch(e) {
                console.warn('3D Buildings injection notice:', e);
            }
        }

        setDensityMode(active) {
            this._densityMode = active;
            if (!this.maplibre || !this.maplibre.getLayer('3d-buildings')) return;
            if (active) {
                // Color buildings according to density of adjacent street network:
                // High density / Major avenues -> Red (#d50000)
                // Local avenues -> Orange (#ff9100)
                // Secondary / connecting streets -> Yellow (#ffb300)
                // Residential / low density -> Gray (#a3a18e)
                this.maplibre.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
                    'interpolate',
                    ['linear'],
                    ['coalesce', ['get', 'render_height'], ['get', 'height'], 10],
                    0,   '#a3a18e', // Low density: residential neighborhoods (<10m)
                    8,   '#a3a18e', 
                    12,  '#ffb300', // Medium density: secondary connecting streets (10-20m)
                    20,  '#ff9100', // High-medium density: local avenues (20-40m)
                    40,  '#d50000', // Major avenues (Alameda, Providencia corridor) (40m+)
                    80,  '#d50000', // High-density towers (red)
                    150, '#ff1744', // Major transit corridor towers (crimson)
                    300, '#ff0055'  // Landmark tower (vivid red-magenta)
                ]);
                this.maplibre.setLight({
                    anchor: 'viewport',
                    color: '#fff5ea',
                    intensity: 0.65,
                    position: [1.25, 120, 50]
                });
            } else {
                // Normal sleek architectural slate palette
                this.maplibre.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
                    'interpolate',
                    ['linear'],
                    ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
                    0, '#30344a',
                    20, '#3d4361',
                    50, '#4e567d',
                    100, '#636e9e',
                    200, '#7b89c4',
                    300, '#93a3e6'
                ]);
                this.maplibre.setLight({
                    anchor: 'viewport',
                    color: '#ffffff',
                    intensity: 0.55,
                    position: [1.25, 120, 50]
                });
            }
        }

        _runWhenReady(fn) {
            if (this._isReady) {
                fn();
            } else {
                this._readyQueue.push(fn);
            }
        }

        setCameraMode2D(duration = 350) {
            this.is2D = true;
            this.maplibre.easeTo({
                pitch: 0,
                bearing: 0,
                duration: duration
            });
            this._updateCameraUI();
        }

        setCameraMode3D(duration = 400) {
            this.is2D = false;
            this.maplibre.easeTo({
                pitch: 55,
                bearing: -15,
                duration: duration
            });
            this._updateCameraUI();
        }

        toggleCameraMode() {
            if (this.is2D) {
                this.setCameraMode3D(400);
            } else {
                this.setCameraMode2D(350);
            }
        }

        _updateCameraUI() {
            const btn = document.getElementById('btn-camera-toggle');
            if (btn) {
                btn.innerHTML = this.is2D ? '📐 2D' : '🏙️ 2.5D';
                btn.title = this.is2D ? 'Modo 2D Cenital (Construcción)' : 'Modo 2.5D Perspectiva (Juego)';
            }
        }

        on(event, handler) {
            if (!this._wrappedHandlers) this._wrappedHandlers = new Map();
            const wrapped = (e) => {
                if (e.lngLat) {
                    e.latlng = new LatLng(e.lngLat.lat, e.lngLat.lng);
                }
                handler(e);
            };
            this._wrappedHandlers.set(handler, wrapped);
            this.maplibre.on(event, wrapped);
            return this;
        }

        off(event, handler) {
            const wrapped = this._wrappedHandlers ? this._wrappedHandlers.get(handler) : null;
            this.maplibre.off(event, wrapped || handler);
            if (this._wrappedHandlers && wrapped) {
                this._wrappedHandlers.delete(handler);
            }
            return this;
        }

        setView(center, zoom) {
            const c = new LatLng(center);
            this.maplibre.jumpTo({
                center: [c.lng, c.lat],
                zoom: zoom !== undefined ? zoom : this.maplibre.getZoom()
            });
            return this;
        }

        panTo(latlng, options = {}) {
            const c = new LatLng(latlng);
            const panOpts = Object.assign({ duration: 300 }, options);
            if (options && options.animate === false) panOpts.duration = 0;
            this.maplibre.panTo([c.lng, c.lat], panOpts);
            return this;
        }

        flyTo(target, zoom, options = {}) {
            if (typeof zoom === 'object' && zoom !== null && (options === undefined || Object.keys(options).length === 0)) {
                options = zoom;
                zoom = undefined;
            }
            let center = null;
            if (Array.isArray(target) || (target && target.lat !== undefined)) {
                center = new LatLng(target);
            } else if (target && target.center) {
                center = new LatLng(target.center);
                if (target.zoom !== undefined && zoom === undefined) zoom = target.zoom;
                options = Object.assign({}, target, options);
            }
            const flyOpts = Object.assign({}, options);
            if (center) flyOpts.center = [center.lng, center.lat];
            if (zoom !== undefined) flyOpts.zoom = zoom;
            if (flyOpts.duration && flyOpts.duration < 100) {
                flyOpts.duration = flyOpts.duration * 1000;
            }
            this.maplibre.flyTo(flyOpts);
            return this;
        }

        getCenter() {
            const c = this.maplibre.getCenter();
            return new LatLng(c.lat, c.lng);
        }

        getZoom() {
            return this.maplibre.getZoom();
        }

        getBounds() {
            const b = this.maplibre.getBounds();
            return new LatLngBounds(
                [b.getSouth(), b.getWest()],
                [b.getNorth(), b.getEast()]
            );
        }

        containerPointToLatLng(pt) {
            const x = Array.isArray(pt) ? pt[0] : (pt.x !== undefined ? pt.x : 0);
            const y = Array.isArray(pt) ? pt[1] : (pt.y !== undefined ? pt.y : 0);
            const un = this.maplibre.unproject([x, y]);
            return new LatLng(un.lat, un.lng);
        }

        latLngToContainerPoint(latlng) {
            const p = new LatLng(latlng);
            const pr = this.maplibre.project([p.lng, p.lat]);
            return { x: pr.x, y: pr.y };
        }

        distance(p1, p2) {
            const a = new LatLng(p1);
            const b = new LatLng(p2);
            return a.distanceTo(b);
        }

        invalidateSize() {
            this.maplibre.resize();
            return this;
        }

        getContainer() {
            return this.maplibre.getContainer();
        }

        setMaxBounds(b) {
            if (b) {
                let sw, ne;
                if (Array.isArray(b)) {
                    sw = new LatLng(b[0]);
                    ne = new LatLng(b[1]);
                } else if (b.getSouthWest && b.getNorthEast) {
                    sw = b.getSouthWest();
                    ne = b.getNorthEast();
                }
                if (sw && ne) {
                    this.maplibre.setMaxBounds([[sw.lng, sw.lat], [ne.lng, ne.lat]]);
                }
            }
            return this;
        }

        setMinZoom(z) {
            this.maplibre.setMinZoom(z);
            return this;
        }

        hasLayer(layer) {
            return this._layers.has(layer);
        }

        addLayer(layer) {
            if (!layer) return this;
            this._layers.add(layer);
            if (typeof layer.addTo === 'function') {
                layer.addTo(this);
            }
            return this;
        }

        removeLayer(layer) {
            if (!layer) return this;
            this._layers.delete(layer);
            if (typeof layer.remove === 'function') {
                layer.remove();
            }
            return this;
        }

        closePopup(popup) {
            if (popup && typeof popup.remove === 'function') {
                popup.remove();
            } else if (this._activePopup) {
                this._activePopup.remove();
                this._activePopup = null;
            }
            return this;
        }

        createPane(name) {
            if (!this._panes[name]) {
                const el = document.createElement('div');
                el.className = 'maplibre-pane-' + name;
                this._panes[name] = el;
            }
            return this._panes[name];
        }

        getPane(name) {
            return this.createPane(name);
        }
    }

    // Expose Global L compatibility object
    window.L = {
        latLng: function(lat, lng) {
            return new LatLng(lat, lng);
        },
        latLngBounds: function(sw, ne) {
            return new LatLngBounds(sw, ne);
        },
        marker: function(latlng, options) {
            return new MarkerAdapter(latlng, options);
        },
        circleMarker: function(latlng, options) {
            return new CircleMarkerAdapter(latlng, options);
        },
        circle: function(latlng, options) {
            return new CircleAdapter(latlng, options);
        },
        polyline: function(coords, options) {
            return new PolylineAdapter(coords, options);
        },
        polygon: function(rings, options) {
            return new PolygonAdapter(rings, options);
        },
        imageOverlay: function(url, bounds, options) {
            return new ImageOverlayAdapter(url, bounds, options);
        },
        layerGroup: function(layers) {
            return new LayerGroupAdapter(layers);
        },
        divIcon: function(options) {
            return {
                className: options.className || '',
                html: options.html || '',
                iconSize: options.iconSize || [20, 20],
                iconAnchor: options.iconAnchor || null
            };
        },
        popup: function(options) {
            return new PopupAdapter(options);
        },
        tileLayer: function() {
            return {
                addTo: function() { return this; },
                on: function() { return this; }
            };
        },
        map: function(containerId, options) {
            return new MapLibreMapWrapper(containerId, options);
        },
        DomEvent: {
            stopPropagation: function(e) {
                if (!e) return;
                if (typeof e.stopPropagation === 'function') e.stopPropagation();
                if (e.originalEvent && typeof e.originalEvent.stopPropagation === 'function') {
                    e.originalEvent.stopPropagation();
                }
            },
            disableScrollPropagation: function(el) {
                if (!el) return;
                ['wheel', 'mousewheel', 'DOMMouseScroll', 'touchmove'].forEach(evt => {
                    el.addEventListener(evt, e => e.stopPropagation(), { passive: true });
                });
            }
        }
    };

})(window);
