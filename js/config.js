/* ==============================================================
   CONFIG, LOCALIZATION & GAME DATA
   ============================================================== */

        const CARTO_KEY = "cb1_41yx_1_cc5bf091efaeca2d5498676e"; 
        const ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjBhNGYyY2Q1OGUzYTRiY2I5NTE3YzQ5NTg3NzI5MzU1IiwiaCI6Im11cm11cjY0In0="; 
        const SANTIAGO_CENTER = L.latLng(-33.4380, -70.6350); 

        // ==============================================================
        // BILINGUAL LOCALIZATION (DEFAULT: ENGLISH)
        // ==============================================================
        let currentLang = 'en';
        let currentResolution = 100;
        let currentUiScale = 1.0;

        const TRANSLATIONS = {
            en: {
                gameTitle: "WORLD DESIGNER",
                subTitle: "Urban Transit Simulation",
                fileBoxTitle: "ðŸ“ Street Network File (.geojson or .json)",
                fileBoxDesc: "Select your streets file to generate vehicle traffic:",
                noFile: "No file selected (optional)",
                fileLoaded: "âœ“ Street network loaded ({count} streets)",
                startSim: "START SIMULATION",
                regimeOffPeak: "OFF-PEAK",
                regimePeak: "RUSH HOUR",
                regimeLow: "NIGHT LOW",
                weatherSunny: "SANTIAGO â˜€ï¸",
                weatherRain: "SANTIAGO ðŸŒ§ï¸ (RAIN)",
                fundsLabel: "Public Funds",
                btnFares: "ðŸ·ï¸ Fares",
                btnSchematic: "ðŸ—ºï¸ Schematic",
                btnBuild: "Build â–¾",
                buildSubway: "Subway",
                buildBus: "Bus",
                buildTrain: "Train (Soon)",
                btnPause: "PAUSE",
                pauseTitle: "PAUSE",
                btnResume: "â–¶ Resume Game",
                btnTech: "âš¡ Tech",
                btnSave: "ðŸ’¾ Save",
                techModalTitle: "TRANSIT R&D & TECH TREE",
                techModalDesc: "Invest city treasury funds into technological breakthroughs to boost transit efficiency, safety, and rider satisfaction.",
                techUnlockBtn: "Unlock for {cost}",
                techUnlockedBadge: "Unlocked",
                techInsufficientFunds: "Insufficient Funds",
                saveModalTitle: "SAVE & LOAD GAME",
                saveSec1Title: "Quick Save (Browser Storage)",
                saveSec1Desc: "Save your entire city, lines, fleet schedules, and unlocked technologies directly into your browser.",
                saveSec2Title: "File Export & Import (JSON)",
                saveSec2Desc: "Download a backup file to keep your progress safe, or transfer your transit network between devices.",
                btnQuickSave: "Save Game Now",
                btnQuickLoad: "Load Saved Game",
                btnExportSave: "Download Save (.json)",
                btnImportSave: "Load File (.json)",
                pipVelocity: "Velocity",
                pipPassengers: "Passengers",
                pipStatus: "Status",
                pipCondition: "Condition",
                pipFollow: "ðŸŽ¥ Follow",
                pipFollowing: "ðŸŽ¥ Following",
                pipCenter: "ðŸ” Center",
                pipNextStop: "Next Station",
                timeDawn: "Dawn",
                timeDay: "Day",
                timeDusk: "Dusk",
                timeNight: "Night",
                btnSettings: "âš™ï¸ Settings",
                btnRestart: "ðŸ”„ Restart Game",
                btnExit: "ðŸšª Exit to Title",
                settingsTitle: "SETTINGS",
                settingLang: "Language / Language:",
                settingRes: "Map / Border Quality:",
                res100: "100% (High / Sharp)",
                res75: "75% (Medium / Balanced)",
                res50: "50% (Low / Fast Performance)",
                settingVehicles: "Traffic Generation (Visible):",
                vehicleHint: "Lowers visible cars for performance. Stations receive full passenger impact equal to max (4500).",
                settingUi: "UI Scale:",
                btnSettingsClose: "Apply & Close",
                tabEvents: "ðŸ“… Monthly Events",
                tabFleetSchedule: "â° Fleet Schedule & Regimes",
                eventsDesc: "Forecasts and scheduled events for this month",
                calDayTitle: "Select a day",
                calDaySub: "No event selected.",
                calRegularDay: "Regular transit day without scheduled incidents.",
                brushLabel: "Brush:",
                brushActive: "ðŸŸ© Operating",
                brushMaint: "ðŸŸ¦ Maintenance",
                brushDisabled: "â¬› Inactive",
                regimeHint: "ðŸ’¡ <b>Mechanic:</b> Vehicles lose health during active service. In <b>Maintenance</b> they enter the depot and repair. At shift end, <i>passengers alight at the next stop and vehicles return to depot</i>.",
                faresTitle: "FARE POLICIES",
                faresDesc: "Adjust fares to balance city finances, evasion rate, and citizen approval.",
                fareSubPeak: "ðŸš‡ Subway Peak:",
                fareSubOff: "ðŸš‡ Subway Off-Peak / Low:",
                fareBusFlat: "ðŸšŒ Bus (Flat Fare):",
                fareBip: "Bip! Fare Integration",
                fareEvasion: "Estimated evasion:",
                fareImpact: "Social impact:",
                fareImpactHigh: "Citizen Discontent (High Fare)",
                fareImpactLow: "High Citizen Approval (Subsidized)",
                fareImpactBalanced: "Balanced",
                btnSaveFares: "Save & Close",
                schematicTitle: "TRANSIT SCHEMATIC MAP",
                schematicSub: "Orthogonal topological pocket map diagram",
                btnBackMap: "âœ– Back to Geographic Map",
                schematicEmpty: "No subway lines with created stations.",
                thudSubwayTitle: "ðŸš‡ Subway Network",
                thudBusTitle: "ðŸšŒ Bus Network",
                thudSubtitle: "Line and fleet management",
                thudLinesTab: "Lines",
                thudCreateTab: "+ New",
                thudNameLabel: "Name:",
                thudColorLabel: "Identifier Color:",
                thudFreqLabel: "Departure Interval (sec):",
                thudCreateBtn: "Create Line",
                thudBuildSubway: "âœš Build Station (-$4,500,000)",
                thudBuildBus: "âœš Build Stop (-$1,200,000)",
                thudBuildActive: "Build Mode Active",
                toastBuildHint: "âœš Click on the map to place a new station/stop.",
                thudNoLines: "No lines created.",
                detailSubway: "SUBWAY",
                detailBus: "BUS",
                detailDailyProfit: "DAILY EARNINGS",
                detailYesterday: "Yesterday: +${amt}",
                detailToday: "Today so far: +${amt}",
                detailTotalStations: "TOTAL STATIONS:",
                btnUpgrades: "âš¡ UPGRADES",
                expressActiveTag: "ðŸ”´ðŸŸ¢ Express Active (Red / Green Route)",
                expressInactiveTag: "âšª Common Service Standard",
                rushHourTag: "Rush Hour",
                toastConnecting: "ðŸ”— Connecting via <b>{name}</b> â€” Click on any station to link.",
                toastLinked: "âœ“ Track connected successfully to {name}.",
                toastDemolished: "ðŸ—‘ Station demolished (+ ${refund} refunded).",
                toastRenamed: "âœ“ Station renamed to \"{name}\".",
                stLevel: "LEVEL",
                stLines: "LINES",
                stDensity: "DENSITY",
                stAttraction: "ATTRACTION",
                stIsolated: "Isolated",
                stMonthProfit: "MONTH PROFIT",
                stBtnConnect: "ðŸ”— Connect",
                stBtnMove: "â†” Move",
                stBtnDemolish: "ðŸ—‘ Demolish",
                stBtnCurves: "ã€° Curves",
                stExpCommon: "âšª Common",
                stExpRed: "ðŸ”´ Red Route",
                stExpGreen: "ðŸŸ¢ Green Route",
                stFullView: "ðŸ“‹ Full Station Panel",
                stRenamePrompt: "Enter new name for this station/stop:",
                upgSpeedSubway: "LINE SPEED",
                upgSpeedSubwayDesc: "Faster acceleration and higher frequency on track.",
                upgCapSubway: "CAR CAPACITY",
                upgCapSubwayDesc: "Capacity per convoy: {total} passengers.",
                upgSpeedBus: "DEDICATED BUS LANE",
                upgSpeedBusDesc: "Bypasses traffic congestion along the route.",
                upgCapBus: "BUS CAPACITY",
                upgCapBusDesc: "Extended passenger seating capacity.",
                upgMaxLevel: "Max Level Reached",
                upgBtnSpeedSubway: "Upgrade (+5 km/h) ($15,000,000)",
                upgBtnCapSubway: "Increase (+1 Pax) ($10,000,000)",
                upgBtnSpeedBus: "Install Dedicated Lane ($8,000,000)",
                upgBtnCapBus: "Increase (+2 Pax) ($6,000,000)",
                finTitle: "FINANCIAL SUMMARY",
                finPeriodIncome: "Period Income: +${amt}",
                finSubwayRev: "Subway Fares: +${amt}",
                finBusRev: "Bus Fares: +${amt}",
                finEvasionLoss: "Loss from Evasion: -{pct}%",
                finMaintCost: "Maintenance Costs: -${amt}",
                finSubwayExp: "Underground Network: -${amt}",
                finBusExp: "Surface Network: -${amt}",
                finCloseBtn: "Close",
                blockedTitle: "LOCKED ZONE",
                blockedNext: "Next level: <b>{name}</b>",
                blockedReq: "Requires: {currSt}/{reqSt} Subway Stations and {currBus}/{reqBus} Bus Routes.",
                toastLevelUp: "ðŸŽ‰ NEW LEVEL UNLOCKED! {name}",
                toastRainAlert: "ðŸŒ§ï¸ Weather Alert! Rain started in Santiago. Buses and traffic slowed down.",
                btnCancel: "Cancel",
                settingSound: "Sound Effects & Ambience:",
                tabCalendar: "Calendar",
                tabMetro: "Metro",
                tabBus: "Bus",
                metroFleetTitle: "Subway Trains per Line",
                metroFinTitle: "Subway Financial Balance",
                busFleetTitle: "Bus Fleet per Route",
                busFinTitle: "Bus Financial Balance",
                metroSelectLine: "ðŸš‡ Line:",
                busSelectLine: "ðŸšŒ Route:",
                brushLabel: "Mode:",
                brushActive: "ðŸŸ© Operating",
                brushMaint: "ðŸŸ¦ Maintenance",
                brushDisabled: "â¬› Inactive",
                brushAll: "âš¡ Apply to All",
                metroMechanicTip: "ðŸ’¡ <b>Subway Mechanic:</b> Trains lose durability during active service. In <b>Maintenance</b> they enter depots/workshops for repairs. At shift end, <i>passengers alight at the next stop and trains return to depot</i>.",
                busMechanicTip: "ðŸ’¡ <b>Bus Mechanic:</b> Buses operating on streets suffer continuous wear. In <b>Maintenance</b> they enter terminals and depots for tuning. At shift end, they complete their route and retire to yard."
            },
            es: {
                gameTitle: "WORLD DESIGNER",
                subTitle: "SimulaciÃ³n de Transporte Urbano",
                fileBoxTitle: "ðŸ“ Archivo de Calles (.geojson o .json)",
                fileBoxDesc: "Selecciona tu archivo de calles para generar el trÃ¡fico vehicular:",
                noFile: "NingÃºn archivo seleccionado (opcional)",
                fileLoaded: "âœ“ Red vial detectada ({count} calles)",
                startSim: "COMENZAR SIMULACIÃ“N",
                regimeOffPeak: "HORA VALLE",
                regimePeak: "HORA PUNTA",
                regimeLow: "HORA BAJA",
                weatherSunny: "SANTIAGO â˜€ï¸",
                weatherRain: "SANTIAGO ðŸŒ§ï¸ (LLUVIA)",
                fundsLabel: "Fondos PÃºblicos",
                btnFares: "ðŸ·ï¸ Tarifas",
                btnSchematic: "ðŸ—ºï¸ Esquema",
                btnBuild: "Construir â–¾",
                buildSubway: "Metro",
                buildBus: "Bus",
                buildTrain: "Tren (Pronto)",
                btnPause: "PAUSA",
                pauseTitle: "PAUSA",
                btnResume: "â–¶ Volver al Juego",
                btnTech: "âš¡ I+D Tech",
                btnSave: "ðŸ’¾ Guardar",
                techModalTitle: "I+D Y ÃRBOL DE TECNOLOGÃA",
                techModalDesc: "Invierte fondos pÃºblicos en avances tecnolÃ³gicos para maximizar la eficiencia, seguridad y satisfacciÃ³n ciudadana.",
                techUnlockBtn: "Desbloquear por {cost}",
                techUnlockedBadge: "Desbloqueado",
                techInsufficientFunds: "Fondos Insuficientes",
                saveModalTitle: "GUARDAR Y CARGAR PARTIDA",
                saveSec1Title: "Guardado RÃ¡pido (Almacenamiento Local)",
                saveSec1Desc: "Guarda tu red completa de metro y buses, flota, horarios y tecnologÃ­as en tu navegador.",
                saveSec2Title: "Exportar e Importar Archivo (JSON)",
                saveSec2Desc: "Descarga un archivo de respaldo o transfiere tu progreso de transporte entre computadores.",
                btnQuickSave: "Guardar Partida Ahora",
                btnQuickLoad: "Cargar Guardado",
                btnExportSave: "Descargar Partida (.json)",
                btnImportSave: "Subir Archivo (.json)",
                pipVelocity: "Velocidad",
                pipPassengers: "Pasajeros",
                pipStatus: "Estado",
                pipCondition: "Salud MecÃ¡nica",
                pipFollow: "ðŸŽ¥ Seguir",
                pipFollowing: "ðŸŽ¥ Siguiendo",
                pipCenter: "ðŸ” Centrar",
                pipNextStop: "PrÃ³xima EstaciÃ³n",
                timeDawn: "Amanecer",
                timeDay: "DÃ­a",
                timeDusk: "Atardecer",
                timeNight: "Noche",
                btnSettings: "âš™ï¸ ConfiguraciÃ³n",
                btnRestart: "ðŸ”„ Reiniciar Juego",
                btnExit: "ðŸšª Salir al Inicio",
                settingsTitle: "CONFIGURACIÃ“N",
                settingLang: "Idioma / Language:",
                settingRes: "Calidad de Mapa / Fronteras:",
                res100: "100% (Alta / NÃ­tida)",
                res75: "75% (Media / Equilibrada)",
                res50: "50% (Baja / Alto Rendimiento)",
                settingVehicles: "GeneraciÃ³n de VehÃ­culos (Visibles):",
                vehicleHint: "Reduce autos en pantalla para mejorar rendimiento. Las estaciones reciben el impacto completo equivalente al mÃ¡x. (4500).",
                settingUi: "Escala de la Interfaz (UI):",
                btnSettingsClose: "Guardar y Cerrar",
                tabEvents: "ðŸ“… Eventos del Mes",
                tabFleetSchedule: "â° Horarios y RÃ©gimen (Flota)",
                eventsDesc: "PronÃ³sticos y eventos masivos programados para este mes",
                calDayTitle: "Selecciona un dÃ­a",
                calDaySub: "No hay evento seleccionado.",
                calRegularDay: "Jornada habitual de transporte sin eventualidades programadas.",
                brushLabel: "Pincel:",
                brushActive: "ðŸŸ© Operando",
                brushMaint: "ðŸŸ¦ Mantenimiento",
                brushDisabled: "â¬› Apagado",
                regimeHint: "ðŸ’¡ <b>MecÃ¡nica:</b> Los vehÃ­culos pierden salud durante el servicio activo. En horario de <b>Mantenimiento</b> ingresan a taller y reparan su integridad.",
                faresTitle: "POLÃTICAS TARIFARIAS",
                faresDesc: "Regula los pasajes para balancear finanzas, evasiÃ³n y satisfacciÃ³n social.",
                fareSubPeak: "ðŸš‡ Metro Punta:",
                fareSubOff: "ðŸš‡ Metro Valle / Baja:",
                fareBusFlat: "ðŸšŒ Bus (Tarifa Ãšnica):",
                fareBip: "IntegraciÃ³n Tarifaria Bip!",
                fareEvasion: "EvasiÃ³n estimada:",
                fareImpact: "Impacto Social:",
                fareImpactHigh: "Descontento Popular (Tarifa Alta)",
                fareImpactLow: "Alta AceptaciÃ³n Ciudadana (Subsidio)",
                fareImpactBalanced: "Equilibrado",
                btnSaveFares: "Guardar y Cerrar",
                schematicTitle: "PLANO ESQUEMÃTICO DE RED",
                schematicSub: "Diagrama ortogonal y topolÃ³gico estilo plano de bolsillo",
                btnBackMap: "âœ– Volver al Mapa GeogrÃ¡fico",
                schematicEmpty: "No hay lÃ­neas de metro con estaciones creadas.",
                thudSubwayTitle: "ðŸš‡ Red de Metro",
                thudBusTitle: "ðŸšŒ Red de Buses",
                thudSubtitle: "GestiÃ³n de lÃ­neas y flota",
                thudLinesTab: "LÃ­neas",
                thudCreateTab: "+ Nueva",
                thudNameLabel: "Nombre:",
                thudColorLabel: "Color Identificador:",
                thudFreqLabel: "Frecuencia de salida (seg):",
                thudCreateBtn: "Crear LÃ­nea",
                thudBuildSubway: "âœš Construir EstaciÃ³n (-$4.500.000)",
                thudBuildBus: "âœš Construir Paradero (-$1.200.000)",
                thudBuildActive: "Modo ConstrucciÃ³n Activo",
                toastBuildHint: "âœš Haz clic en el mapa para ubicar una nueva estaciÃ³n/paradero.",
                thudNoLines: "No hay lÃ­neas creadas.",
                detailSubway: "METRO",
                detailBus: "MICROBUS",
                detailDailyProfit: "GANANCIA DIARIA",
                detailYesterday: "Ayer: +${amt}",
                detailToday: "Hoy en curso: +${amt}",
                detailTotalStations: "ESTACIONES TOTALES:",
                btnUpgrades: "âš¡ MEJORAS",
                expressActiveTag: "ðŸ”´ðŸŸ¢ Expreso Activo (Ruta Roja / Verde)",
                expressInactiveTag: "âšª Servicio ComÃºn EstÃ¡ndar",
                rushHourTag: "Hora Punta",
                toastConnecting: "ðŸ”— Conectando vÃ­a <b>{name}</b> â€” Haz clic en cualquier estaciÃ³n para enlazar.",
                toastLinked: "âœ“ VÃ­a conectada con Ã©xito a {name}.",
                toastDemolished: "ðŸ—‘ EstaciÃ³n demolida (+ ${refund} reembolsados).",
                toastRenamed: "âœ“ EstaciÃ³n renombrada a \"{name}\".",
                stLevel: "NIVEL",
                stLines: "LÃNEAS",
                stDensity: "DENSIDAD",
                stAttraction: "ATRACCIÃ“N",
                stIsolated: "Aislada",
                stMonthProfit: "GANANCIA MES",
                stBtnConnect: "ðŸ”— Conectar",
                stBtnMove: "â†” Mover",
                stBtnDemolish: "ðŸ—‘ Demoler",
                stBtnCurves: "ã€° Curvatura",
                stExpCommon: "âšª ComÃºn",
                stExpRed: "ðŸ”´ Ruta Roja",
                stExpGreen: "ðŸŸ¢ Ruta Verde",
                stPopupViewFull: "ðŸ“‹ Ver Panel Completo",
                stRenamePrompt: "Ingresa el nuevo nombre para esta estaciÃ³n/paradero:",
                upgSpeedSubway: "VELOCIDAD LÃNEA",
                upgSpeedSubwayDesc: "Mayor aceleraciÃ³n y frecuencia en vÃ­a.",
                upgCapSubway: "CAPACIDAD VAGONES",
                upgCapSubwayDesc: "Capacidad por convoy: {total} pasajeros.",
                upgSpeedBus: "CARRIL EXCLUSIVO",
                upgSpeedBusDesc: "Evita la congestiÃ³n vehicular en ruta.",
                upgCapBus: "CAPACIDAD MICROBÃšS",
                upgCapBusDesc: "AmpliaciÃ³n de asientos por vehÃ­culo.",
                upgMaxLevel: "Tope MÃ¡ximo Alcanzado",
                upgBtnSpeedSubway: "Mejorar (+5 km/h) ($15.000.000)",
                upgBtnCapSubway: "Aumentar (+1 Pax) ($10.000.000)",
                upgBtnSpeedBus: "Habilitar Carril ($8.000.000)",
                upgBtnCapBus: "Aumentar (+2 Pax) ($6.000.000)",
                finTitle: "RESUMEN FINANCIERO",
                finPeriodIncome: "Ingresos del PerÃ­odo: +${amt}",
                finSubwayRev: "Cobro Pasajes Metro: +${amt}",
                finBusRev: "Cobro Pasajes Buses: +${amt}",
                finEvasionLoss: "PÃ©rdida por EvasiÃ³n: -{pct}%",
                finMaintCost: "Costos de Mantenimiento: -${amt}",
                finSubwayExp: "Red SubterrÃ¡nea: -${amt}",
                finBusExp: "Red Superficial: -${amt}",
                finCloseBtn: "Cerrar",
                blockedTitle: "ZONA BLOQUEADA",
                blockedNext: "PrÃ³ximo nivel: <b>{name}</b>",
                blockedReq: "Requiere: {currSt}/{reqSt} Estaciones de Metro y {currBus}/{reqBus} Recorridos de Bus.",
                toastLevelUp: "ðŸŽ‰ Â¡NUEVO NIVEL DESBLOQUEADO! {name}",
                toastRainAlert: "ðŸŒ§ï¸ Â¡Alerta ClimÃ¡tica! Ha comenzado a llover en Santiago. Buses y trÃ¡fico ralentizados.",
                btnCancel: "Cancelar",
                settingSound: "Efectos de Sonido y Ambiente:",
                tabCalendar: "Calendario",
                tabMetro: "Metro",
                tabBus: "Bus",
                metroFleetTitle: "Flota de Convoys por LÃ­nea",
                metroFinTitle: "Balance Operacional Metro",
                busFleetTitle: "Flota de Buses por Recorrido",
                busFinTitle: "Balance Operacional Buses",
                metroSelectLine: "ðŸš‡ LÃ­nea:",
                busSelectLine: "ðŸšŒ Recorrido:",
                brushLabel: "Modo:",
                brushActive: "ðŸŸ© Operativo",
                brushMaint: "ðŸŸ¦ MantenciÃ³n",
                brushDisabled: "â¬› Inactivo",
                brushAll: "âš¡ Aplicar a Todo",
                metroMechanicTip: "ðŸ’¡ <b>MecÃ¡nica Metro:</b> Los trenes en servicio sufren desgaste por kilometraje. En <b>MantenciÃ³n</b> ingresan a cocheras/talleres para repararse. Al terminar el turno operativo, <i>los pasajeros bajan en la siguiente estaciÃ³n y el convoy regresa a cocheras</i>.",
                busMechanicTip: "ðŸ’¡ <b>MecÃ¡nica Buses:</b> Los buses operando en las calles sufren desgaste continuo. En <b>MantenciÃ³n</b> entran a terminales y patios para puesta a punto. Al terminar el turno, completan su trayecto y se retiran a patio."
            }
        };

        function tr(key, vars = {}) {
            let dict = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];
            let str = dict[key] || TRANSLATIONS['en'][key] || key;
            for (let k in vars) {
                str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
            }
            return str;
        }

        function applyAllTranslations() {
            if (document.getElementById('txt-title')) document.getElementById('txt-title').innerText = tr('gameTitle');
            if (document.getElementById('txt-subtitle')) document.getElementById('txt-subtitle').innerText = tr('subTitle');
            if (document.getElementById('txt-upload-title')) document.getElementById('txt-upload-title').innerText = tr('fileBoxTitle');
            if (document.getElementById('txt-upload-desc')) document.getElementById('txt-upload-desc').innerText = tr('fileBoxDesc');
            if (document.getElementById('btn-stgo')) document.getElementById('btn-stgo').innerText = tr('startSim');
            if (document.getElementById('txt-funds-label')) document.getElementById('txt-funds-label').innerText = tr('fundsLabel');
            if (document.getElementById('btn-nav-fares')) document.getElementById('btn-nav-fares').innerText = tr('btnFares');
            if (document.getElementById('btn-nav-schematic')) document.getElementById('btn-nav-schematic').innerText = tr('btnSchematic');
            if (document.getElementById('txt-btn-build')) document.getElementById('txt-btn-build').innerText = tr('btnBuild');
            if (document.getElementById('txt-item-subway')) document.getElementById('txt-item-subway').innerText = tr('buildSubway');
            if (document.getElementById('txt-item-bus')) document.getElementById('txt-item-bus').innerText = tr('buildBus');
            if (document.getElementById('txt-item-train')) document.getElementById('txt-item-train').innerText = tr('buildTrain');
            if (document.getElementById('btn-navbar-pause')) document.getElementById('btn-navbar-pause').innerText = tr('btnPause');

            // Pause Modal
            if (document.getElementById('txt-pause-title')) document.getElementById('txt-pause-title').innerText = tr('pauseTitle');
            if (document.getElementById('btn-pause-resume')) document.getElementById('btn-pause-resume').innerText = tr('btnResume');
            if (document.getElementById('btn-nav-tech')) document.getElementById('btn-nav-tech').innerText = tr('btnTech');
            if (document.getElementById('btn-nav-save')) document.getElementById('btn-nav-save').innerText = tr('btnSave');
            if (document.getElementById('btn-pause-tech')) document.getElementById('btn-pause-tech').innerText = tr('btnTech');
            if (document.getElementById('btn-pause-save')) document.getElementById('btn-pause-save').innerText = tr('btnSave');
            if (document.getElementById('txt-tech-title')) document.getElementById('txt-tech-title').innerText = tr('techModalTitle');
            if (document.getElementById('txt-tech-desc')) document.getElementById('txt-tech-desc').innerText = tr('techModalDesc');
            if (document.getElementById('txt-save-title')) document.getElementById('txt-save-title').innerText = tr('saveModalTitle');
            if (document.getElementById('txt-save-sec1-title')) document.getElementById('txt-save-sec1-title').innerText = tr('saveSec1Title');
            if (document.getElementById('txt-save-sec1-desc')) document.getElementById('txt-save-sec1-desc').innerText = tr('saveSec1Desc');
            if (document.getElementById('txt-save-sec2-title')) document.getElementById('txt-save-sec2-title').innerText = tr('saveSec2Title');
            if (document.getElementById('txt-save-sec2-desc')) document.getElementById('txt-save-sec2-desc').innerText = tr('saveSec2Desc');
            if (document.getElementById('txt-btn-quicksave')) document.getElementById('txt-btn-quicksave').innerText = tr('btnQuickSave');
            if (document.getElementById('txt-btn-quickload')) document.getElementById('txt-btn-quickload').innerText = tr('btnQuickLoad');
            if (document.getElementById('txt-btn-export')) document.getElementById('txt-btn-export').innerText = tr('btnExportSave');
            if (document.getElementById('txt-btn-import')) document.getElementById('txt-btn-import').innerText = tr('btnImportSave');
            if (document.getElementById('lbl-pip-speed')) document.getElementById('lbl-pip-speed').innerText = tr('pipVelocity');
            if (document.getElementById('lbl-pip-pax')) document.getElementById('lbl-pip-pax').innerText = tr('pipPassengers');
            if (document.getElementById('lbl-pip-status')) document.getElementById('lbl-pip-status').innerText = tr('pipStatus');
            if (document.getElementById('lbl-pip-health')) document.getElementById('lbl-pip-health').innerText = tr('pipCondition');
            if (document.getElementById('pip-btn-follow') && !isPiPFollowActive) document.getElementById('pip-btn-follow').innerText = tr('pipFollow');

            if (document.getElementById('btn-pause-settings')) document.getElementById('btn-pause-settings').innerText = tr('btnSettings');
            if (document.getElementById('btn-pause-restart')) document.getElementById('btn-pause-restart').innerText = tr('btnRestart');
            if (document.getElementById('btn-pause-exit')) document.getElementById('btn-pause-exit').innerText = tr('btnExit');

            // Settings Modal
            if (document.getElementById('txt-settings-title')) document.getElementById('txt-settings-title').innerText = tr('settingsTitle');
            if (document.getElementById('txt-setting-lang')) document.getElementById('txt-setting-lang').innerText = tr('settingLang');
            if (document.getElementById('txt-setting-res')) document.getElementById('txt-setting-res').innerText = tr('settingRes');
            if (document.getElementById('opt-res-100')) document.getElementById('opt-res-100').innerText = tr('res100');
            if (document.getElementById('opt-res-75')) document.getElementById('opt-res-75').innerText = tr('res75');
            if (document.getElementById('opt-res-50')) document.getElementById('opt-res-50').innerText = tr('res50');
            if (document.getElementById('txt-setting-vehicles')) document.getElementById('txt-setting-vehicles').innerText = tr('settingVehicles');
            if (document.getElementById('txt-vehicle-hint')) document.getElementById('txt-vehicle-hint').innerText = tr('vehicleHint');
            if (document.getElementById('txt-setting-ui')) document.getElementById('txt-setting-ui').innerText = tr('settingUi');
            if (document.getElementById('txt-setting-sound')) document.getElementById('txt-setting-sound').innerText = tr('settingSound');
            if (document.getElementById('btn-settings-close')) document.getElementById('btn-settings-close').innerText = tr('btnSettingsClose');

            // Fares Modal
            if (document.getElementById('txt-fares-title')) document.getElementById('txt-fares-title').innerText = tr('faresTitle');
            if (document.getElementById('txt-fares-desc')) document.getElementById('txt-fares-desc').innerText = tr('faresDesc');
            if (document.getElementById('txt-fare-sub-peak')) document.getElementById('txt-fare-sub-peak').innerText = tr('fareSubPeak');
            if (document.getElementById('txt-fare-sub-off')) document.getElementById('txt-fare-sub-off').innerText = tr('fareSubOff');
            if (document.getElementById('txt-fare-bus-flat')) document.getElementById('txt-fare-bus-flat').innerText = tr('fareBusFlat');
            if (document.getElementById('txt-fare-bip')) document.getElementById('txt-fare-bip').innerText = tr('fareBip');
            if (document.getElementById('txt-evasion-label')) document.getElementById('txt-evasion-label').innerText = tr('fareEvasion');
            if (document.getElementById('txt-approval-label')) document.getElementById('txt-approval-label').innerText = tr('fareApproval');
            if (document.getElementById('txt-tariff-impact')) document.getElementById('txt-tariff-impact').innerHTML = tr('fareMechanic');

            // Schematic Modal
            if (document.getElementById('txt-schematic-title')) document.getElementById('txt-schematic-title').innerText = tr('schematicTitle');
            if (document.getElementById('txt-schematic-desc')) document.getElementById('txt-schematic-desc').innerText = tr('schematicDesc');

            // Folder Tabs & Modal Controls
            let lblFolderCal = document.getElementById('lbl-folder-tab-cal');
            if (lblFolderCal) lblFolderCal.innerText = tr('tabCalendar');
            let lblFolderMetro = document.getElementById('lbl-folder-tab-metro');
            if (lblFolderMetro) lblFolderMetro.innerText = tr('tabMetro');
            let lblFolderBus = document.getElementById('lbl-folder-tab-bus');
            if (lblFolderBus) lblFolderBus.innerText = tr('tabBus');

            let lblMetroFleet = document.getElementById('lbl-metro-fleet-title');
            if (lblMetroFleet) lblMetroFleet.innerText = tr('metroFleetTitle');
            let lblMetroFin = document.getElementById('lbl-metro-fin-title');
            if (lblMetroFin) lblMetroFin.innerText = tr('metroFinTitle');
            let lblBusFleet = document.getElementById('lbl-bus-fleet-title');
            if (lblBusFleet) lblBusFleet.innerText = tr('busFleetTitle');
            let lblBusFin = document.getElementById('lbl-bus-fin-title');
            if (lblBusFin) lblBusFin.innerText = tr('busFinTitle');

            let lblMetroSel = document.getElementById('lbl-metro-select-line');
            if (lblMetroSel) lblMetroSel.innerText = tr('metroSelectLine');
            let lblBusSel = document.getElementById('lbl-bus-select-line');
            if (lblBusSel) lblBusSel.innerText = tr('busSelectLine');

            let txtBrushM = document.getElementById('txt-brush-label-metro');
            if (txtBrushM) txtBrushM.innerText = tr('brushLabel');
            let txtBrushB = document.getElementById('txt-brush-label-bus');
            if (txtBrushB) txtBrushB.innerText = tr('brushLabel');

            let bMActive = document.getElementById('brush-btn-metro-active');
            if (bMActive) bMActive.innerText = tr('brushActive');
            let bBActive = document.getElementById('brush-btn-bus-active');
            if (bBActive) bBActive.innerText = tr('brushActive');

            let bMMaint = document.getElementById('brush-btn-metro-maint');
            if (bMMaint) bMMaint.innerText = tr('brushMaint');
            let bBMaint = document.getElementById('brush-btn-bus-maint');
            if (bBMaint) bBMaint.innerText = tr('brushMaint');

            let bMDis = document.getElementById('brush-btn-metro-disabled');
            if (bMDis) bMDis.innerText = tr('brushDisabled');
            let bBDis = document.getElementById('brush-btn-bus-disabled');
            if (bBDis) bBDis.innerText = tr('brushDisabled');

            let mTip = document.getElementById('txt-metro-mechanic-tip');
            if (mTip) mTip.innerHTML = tr('metroMechanicTip');
            let bTip = document.getElementById('txt-bus-mechanic-tip');
            if (bTip) bTip.innerHTML = tr('busMechanicTip');

            // Re-render active calendar or fleet views if modal is visible
            let calModal = document.getElementById('calendar-modal');
            if (calModal && (calModal.style.display === 'flex' || calModal.style.display === 'block')) {
                if (currentFolderTab === 'cal') {
                    renderCalendarGrid();
                    selectCalendarDay(selectedCalendarDay || simDayOfMonth);
                } else if (currentFolderTab === 'metro') {
                    updateMetroSummaryCards();
                    renderRegimeTableForMode('metro');
                } else if (currentFolderTab === 'bus') {
                    updateBusSummaryCards();
                    renderRegimeTableForMode('bus');
                }
            }
        }


        const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const DAYS_OF_WEEK_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const DAYS_OF_WEEK_ES = ["Dom", "Lun", "Mar", "MiÃ©", "Jue", "Vie", "SÃ¡b"];
        const FULL_DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const FULL_DAYS_ES = ["Domingo", "Lunes", "Martes", "MiÃ©rcoles", "Jueves", "Viernes", "SÃ¡bado"];

        const MONTH_NAMES = {
            en: ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"],
            es: ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
        };
        const CAL_WEEKDAYS = {
            en: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            es: ["LUN", "MAR", "MIÃ‰", "JUE", "VIE", "SÃB", "DOM"]
        };

        let simMonthIndex = 0; // January / Enero
        let simDayIndex = 1; // Mon
        let simDayOfMonth = 1;
        let simHour = 8;
        let simMinute = 0;
        let citizenHappiness = 100;
        let currentWeather = 'clear';

        let selectedCalendarDay = 1;

        // Daily event modifiers affecting real gameplay
        let currentEventSpeedFactor = 1.0;
        let currentEventBusExpMultiplier = 1.0;
        let currentEventFleetExpMultiplier = 1.0;
        let currentEventDemandBoost = 1.0;
        let currentEventOffPeakBoost = 1.0;

        let currentRegimeBrush = 'active';

        const MONTH_EVENTS = {
            3: {
                id: 'rain_winter',
                type: 'negative',
                icon: 'ðŸŒ§ï¸',
                titleEn: 'Winter Rainstorm',
                titleEs: 'Lluvia Invernal Intensa',
                descEn: 'A cold front brings continuous downpours to Santiago. Street traffic and bus routes are slowed down significantly.',
                descEs: 'Un frente frÃ­o trae intensas precipitaciones a Santiago. El trÃ¡fico en calles y recorridos de buses se ralentiza.',
                effectsEn: [
                    { text: 'Road vehicle & bus speed reduced by -35%', type: 'bad' },
                    { text: 'Underground subway passenger demand +40%', type: 'good' }
                ],
                effectsEs: [
                    { text: 'Velocidad de buses y autos en calle -35%', type: 'bad' },
                    { text: 'Demanda de pasajeros en Metro subterrÃ¡neo +40%', type: 'good' }
                ]
            },
            5: {
                id: 'subsidy',
                type: 'positive',
                icon: 'âš¡',
                titleEn: 'State Transit Modernization Subsidy',
                titleEs: 'Subsidio Estatal de Transporte',
                descEn: 'The Ministry of Transport approves an emergency state grant to support public fleet expansion and track maintenance.',
                descEs: 'El Ministerio de Transportes aprueba una inyecciÃ³n fiscal de apoyo a la flota pÃºblica y mantenimiento de vÃ­as.',
                effectsEn: [
                    { text: '+$15,000,000 injected directly into Public Funds', type: 'good' },
                    { text: '+5% Citizen Approval rating boost', type: 'good' }
                ],
                effectsEs: [
                    { text: '+$15.000.000 inyectados a Fondos PÃºblicos', type: 'good' },
                    { text: '+5% de AprobaciÃ³n Ciudadana', type: 'good' }
                ]
            },
            7: {
                id: 'concert',
                type: 'positive',
                icon: 'ðŸŽµ',
                titleEn: 'Mega Festival at Parque O\'Higgins',
                titleEs: 'Mega Concierto en Parque O\'Higgins',
                descEn: 'A high-profile international music festival brings hundreds of thousands of fans travelling across the city.',
                descEs: 'Un festival internacional masivo moviliza a cientos de miles de fanÃ¡ticos a lo largo de toda la ciudad.',
                effectsEn: [
                    { text: '+150% (2.5x) Passenger arrival surge at all stations', type: 'good' },
                    { text: 'Significantly higher ticket fare revenue collected', type: 'good' }
                ],
                effectsEs: [
                    { text: '+150% (2.5x) en llegada de pasajeros a estaciones', type: 'good' },
                    { text: 'RecaudaciÃ³n tarifaria disparada en toda la red', type: 'good' }
                ]
            },
            10: {
                id: 'roadworks',
                type: 'negative',
                icon: 'ðŸš§',
                titleEn: 'Major Roadworks & Asphalt Repaving',
                titleEs: 'Obras Viales en Ejes Principales',
                descEn: 'Heavy machinery and lane closures on major arteries (Alameda and Providencia) create heavy street bottlenecks.',
                descEs: 'Maquinaria pesada y desvÃ­os en ejes estructurantes (Alameda y Providencia) generan cuellos de botella.',
                effectsEn: [
                    { text: 'Street vehicle and bus speed slowed down by -40%', type: 'bad' },
                    { text: '+25% bus operational maintenance costs today', type: 'bad' }
                ],
                effectsEs: [
                    { text: 'Velocidad de tránsito en calle reducida un -40%', type: 'bad' },
                    { text: '+25% en costos operativos de mantención de buses', type: 'bad' }
                ]
            },
            12: {
                id: 'match',
                type: 'positive',
                icon: '⚽',
                titleEn: 'Superclásico Derby (Colo-Colo vs U. de Chile)',
                titleEs: 'Superclásico del Fútbol Chileno',
                descEn: 'The biggest soccer match of the year fills regional stadiums to capacity, causing explosive peak passenger transit rushes.',
                descEs: 'El partido de fútbol más convocante del año llena estadios y genera un frenesí de viajes en toda la red.',
                effectsEn: [
                    { text: 'Passenger influx triples (3.0x) during peak rush', type: 'good' },
                    { text: 'Huge revenue surge across connected stations', type: 'good' }
                ],
                effectsEs: [
                    { text: 'Afluencia de pasajeros se triplica (3.0x) en punta', type: 'good' },
                    { text: 'Ingresos máximos por validación de pasajes Bip!', type: 'good' }
                ]
            },
            15: {
                id: 'strike',
                type: 'positive',
                icon: '📢',
                titleEn: 'Private Taxi & Rideshare Strike',
                titleEs: 'Paro de Taxis y Apps de Transporte',
                descEn: 'Private rideshare apps and taxi unions strike over fuel regulations. Santiago commuters rely entirely on Metro and Buses.',
                descEs: 'Aplicaciones privadas y taxis suspenden servicios. Toda la población se traslada en transporte público.',
                effectsEn: [
                    { text: '+80% (1.8x) passenger demand across the entire day', type: 'good' },
                    { text: '+4% Citizen Approval as transit remains dependable', type: 'good' }
                ],
                effectsEs: [
                    { text: '+80% (1.8x) en demanda de pasajeros todo el día', type: 'good' },
                    { text: '+4% Aprobación por confiabilidad de la red', type: 'good' }
                ]
            },
            18: {
                id: 'storm',
                type: 'negative',
                icon: '⛈️',
                titleEn: 'Severe Flash Flood & Windstorm Alert',
                titleEs: 'Temporal y Alerta de Inundaciones',
                descEn: 'Intense rainstorms flood underpasses and street drainage channels. Emergency civil protection measures deployed.',
                descEs: 'Lluvias torrenciales inundan pasos bajo nivel y canales viales. Se activan medidas de protección civil.',
                effectsEn: [
                    { text: '-,000,000 emergency municipal repair expense', type: 'bad' },
                    { text: 'Street car and bus speed halved (-50%)', type: 'bad' },
                    { text: 'Subway passenger demand increases +60%', type: 'good' }
                ],
                effectsEs: [
                    { text: '-.000.000 en gastos de despeje e infraestructura', type: 'bad' },
                    { text: 'Velocidad vial y de buses reducida a la mitad (-50%)', type: 'bad' },
                    { text: 'Demanda del Metro subterráneo sube un +60%', type: 'good' }
                ]
            },
            21: {
                id: 'car_free',
                type: 'positive',
                icon: '🌳',
                titleEn: 'Santiago Car-Free Environmental Day',
                titleEs: 'Día Sin Auto en Santiago',
                descEn: 'City-wide environmental initiative restricting private passenger vehicles to reduce emissions and foster green transit.',
                descEs: 'Jornada ambiental municipal restringiendo autos particulares para descontaminar la cuenca de Santiago.',
                effectsEn: [
                    { text: '+120% (2.2x) commuter ridership on Metro and Buses', type: 'good' },
                    { text: '+8% Citizen Happiness rating increase', type: 'good' }
                ],
                effectsEs: [
                    { text: '+120% (2.2x) afluencia en Metro y Red Movilidad', type: 'good' },
                    { text: '+8% en Felicidad y Aprobación Ciudadana', type: 'good' }
                ]
            },
            24: {
                id: 'festival',
                type: 'positive',
                icon: '🎪',
                titleEn: 'Downtown Cultural & Food Fair',
                titleEs: 'Feria Costumbrista y Gastronómica',
                descEn: 'Traditional culinary and craft fairs in downtown squares draw families and tourists throughout all off-peak hours.',
                descEs: 'Muestras gastronómicas y culturales en plazas céntricas atraen a miles de familias en horario valle.',
                effectsEn: [
                    { text: '+80% (1.8x) off-peak ridership throughout the day', type: 'good' },
                    { text: '+5% Citizen Happiness boost', type: 'good' }
                ],
                effectsEs: [
                    { text: '+80% (1.8x) pasajeros durante horario valle', type: 'good' },
                    { text: '+5% en Felicidad y Bienestar Ciudadano', type: 'good' }
                ]
            },
            26: {
                id: 'heatwave',
                type: 'negative',
                icon: '🔥',
                titleEn: 'Extreme 38°C Summer Heatwave',
                titleEs: 'Ola de Calor Extremo (38°C)',
                descEn: 'Scorching temperatures grip Santiago. Massive electricity is drawn by station and rolling-stock air conditioning compressors.',
                descEs: 'Calor sofocante azota la capital. Los sistemas de aire acondicionado en trenes y estaciones disparan el consumo eléctrico.',
                effectsEn: [
                    { text: '+35% fleet electricity & operational expenses', type: 'bad' },
                    { text: '-5% Citizen Happiness due to transit heat exhaustion', type: 'bad' }
                ],
                effectsEs: [
                    { text: '+35% en gastos operativos por aire acondicionado', type: 'bad' },
                    { text: '-5% Felicidad por agotamiento térmico en andenes', type: 'bad' }
                ]
            },
            28: {
                id: 'evasion_crisis',
                type: 'negative',
                icon: '📉',
                titleEn: 'Organized Fare Evasion Surge',
                titleEs: 'Jornada Masiva de Evasión',
                descEn: 'Coordinated turnstile jumping campaigns on surface buses severely reduce fare box collections for 24 hours.',
                descEs: 'Campañas de evasión masiva en torniquetes y puertas traseras merman la recaudación tarifaria durante 24 horas.',
                effectsEn: [
                    { text: 'Fare evasion rate spikes from 6% to 22%', type: 'bad' },
                    { text: 'Significantly lower fare income per passenger boarded', type: 'bad' }
                ],
                effectsEs: [
                    { text: 'Tasa de evasión se dispara del 6% al 22%', type: 'bad' },
                    { text: 'Pérdida directa en recaudación por validación', type: 'bad' }
                ]
            },
            30: {
                id: 'award',
                type: 'positive',
                icon: '🏆',
                titleEn: 'Global Urban Mobility Excellence Award',
                titleEs: 'Premio a la Excelencia del Transporte',
                descEn: 'Santiago wins international recognition as Latin America\'s most progressive and efficient transit system!',
                descEs: '¡Santiago es galardonada internacionalmente por la excelencia, cobertura y sostenibilidad de su red de transporte!',
                effectsEn: [
                    { text: '+,000,000 international mobility prize grant', type: 'good' },
                    { text: 'Citizen Approval rating restored directly to 100%', type: 'good' }
                ],
                effectsEs: [
                    { text: '+.000.000 en subvención de premio internacional', type: 'good' },
                    { text: 'Aprobación Ciudadana restaurada al 100% perfecto', type: 'good' }
                ]
            }
        };

// --- OPTION 5: TECH TREE & R&D SUITE ---
const TECH_UPGRADES_CATALOG = [
    {
        id: 'tech_electric_fleet',
        icon: 'âš¡',
        nameEn: 'Zero-Emission Electric Bus Fleet',
        nameEs: 'Flota de Buses 100% ElÃ©ctricos',
        descEn: 'Modernizes bus corridors with quiet electric drivetrains, slashing daily maintenance/fuel by 35% and boosting public approval.',
        descEs: 'Moderniza corredores con buses elÃ©ctricos silenciosos, reduciendo gasto diario en 35% y aumentando aprobaciÃ³n.',
        cost: 8500000,
        perkEn: '-35% Daily Bus Operating Cost, +6% Citizen Approval',
        perkEs: '-35% Gasto Diario de Buses, +6% AprobaciÃ³n Ciudadana'
    },
    {
        id: 'tech_cbtc_signaling',
        icon: 'ðŸ“¡',
        nameEn: 'CBTC Automated Train Control',
        nameEs: 'SeÃ±alizaciÃ³n CBTC y ConducciÃ³n AutomÃ¡tica',
        descEn: 'Advanced communications-based signaling allows precision braking and shorter headways, unlocking +25% wagon capacity.',
        descEs: 'SeÃ±alizaciÃ³n basada en comunicaciones que permite menor intervalo de seguridad, aumentando capacidad de trenes en +25%.',
        cost: 15000000,
        perkEn: '+25% Metro Wagon Capacity, +15 km/h Safe Top Speed',
        perkEs: '+25% Capacidad de Pasajeros por Tren, +15 km/h Velocidad Segura'
    },
    {
        id: 'tech_butterfly_turnstiles',
        icon: 'ðŸ¦‹',
        nameEn: 'Anti-Evasion Butterfly Turnstiles',
        nameEs: 'Torniquetes AntievasiÃ³n Tipo Mariposa',
        descEn: 'Floor-to-ceiling perimeter gates installed across all station lobbies, cutting fare evasion rate in half.',
        descEs: 'Torniquetes de altura completa en andenes y boleterÃ­as, reduciendo la tasa de evasiÃ³n a la mitad.',
        cost: 6000000,
        perkEn: '-50% Fare Evasion, +$50 Extra Revenue per Passenger',
        perkEs: '-50% EvasiÃ³n de Pasaje, +$50 Ingreso Extra por Pasajero'
    },
    {
        id: 'tech_fleet_climate',
        icon: 'â„ï¸',
        nameEn: 'Smart Inverter Air Conditioning',
        nameEs: 'ClimatizaciÃ³n Inteligente (Aire Acondicionado)',
        descEn: 'Full climate-controlled passenger cabins, granting 100% immunity to extreme summer heatwaves and winter chill discontent.',
        descEs: 'Cabinas climatizadas con control de temperatura, otorgando inmunidad total a quejas por calor o frÃ­o extremo.',
        cost: 5000000,
        perkEn: 'Weather Discontent Immunity, +8% Base Approval',
        perkEs: 'Inmunidad al Mal Clima, +8% Felicidad Base'
    },
    {
        id: 'tech_predictive_ai',
        icon: 'ðŸ¤–',
        nameEn: 'AI Predictive Telemetry Maintenance',
        nameEs: 'TelemetrÃ­a IA y Mantenimiento Predictivo',
        descEn: 'Machine learning sensors anticipate wear-and-tear before breakdowns occur, doubling vehicle durability and accelerating depot repairs.',
        descEs: 'Sensores de IA anticipan desgaste de vÃ­as y motores, duplicando durabilidad de trenes y buses y acelerando reparaciones.',
        cost: 11000000,
        perkEn: '+100% Vehicle Durability, 2x Faster Depot Service',
        perkEs: '+100% Durabilidad de VehÃ­culos, 2x Servicio en Taller'
    },
    {
        id: 'tech_qr_bip',
        icon: 'ðŸ“±',
        nameEn: 'Contactless Bip! QR & Open Banking',
        nameEs: 'Pago Contactless QR y Tarjeta Bancaria',
        descEn: 'Instant turnstile validation eliminates station entrance queues, expanding passenger demand by +18%.',
        descEs: 'ValidaciÃ³n instantÃ¡nea con celular y tarjeta que elimina filas en andenes, elevando demanda de pasajeros en +18%.',
        cost: 7500000,
        perkEn: '+18% Passenger Demand Throughput, Zero Queueing Delay',
        perkEs: '+18% Demanda de Pasajeros, Abordaje InstantÃ¡neo'
    }
];

let techUpgrades = {
    tech_electric_fleet: false,
    tech_cbtc_signaling: false,
    tech_butterfly_turnstiles: false,
    tech_fleet_climate: false,
    tech_predictive_ai: false,
    tech_qr_bip: false
};


const SAVE_LOCALSTORAGE_KEY = 'santiago_transit_quicksave_v2';
