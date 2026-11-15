/**
 * ChronoFire: NASA Active Fire Harmonization Observatory v4.0
 * Frontend Controller & Visualization Engine
 * Features:
 *   - 4D Temporal Time-Lapse Fire Front Playback
 *   - Biomass Consumption & Carbon Emission Estimator (FRE / GFED4)
 *   - Sensor Dual-Layer Comparator (RAW vs HARMONIZED)
 *   - NASA GIBS TrueColor WMS Satellite Layer
 *   - Automated 1-Click SITREP Incident Generator
 *   - Predictive 90-Day Early Warning Risk Forecaster
 *   - Fire Return Interval & Regime Shift Analytics
 *   - 1-Click High-Resolution Chart & Calendar Image Export (PNG)
 *   - Interactive Date Range Filters (Start Year & End Year)
 * Author: Senior AI & Remote Sensing Engineer (NASA Space Apps Challenge 2026)
 */

let appState = {
  currentRegionId: "amazon_basin",
  regionsMetadata: {},
  calendarData: null,
  climatologyData: null,
  forecastData: null,
  regimeShiftData: null,
  startYear: 2000,
  endYear: 2026,
  selectedYear: 2024,
  selectedMonth: 8,
  selectedMetric: "harmonized",
  selectedPalette: "viridis",
  map: null,
  hotspotLayerGroup: null,
  clusterLayerGroup: null,
  bboxDrawLayer: null,
  isDrawingBbox: false,
  bboxStartPoint: null,
  allHotspots: [],
  allClusters: [],
  timelapseTimer: null,
  timelapseDay: 1,
  timelapseMaxDay: 31,
  timelapseRunning: false,
  mapViewMode: "harmonized",
  gibsLayer: null,
  charts: {
    discrepancy: null,
    climatology: null,
    frp: null
  }
};

// ─── Color Palettes ───────────────────────────────────────────────────────────
const COLOR_PALETTES = {
  viridis: [
    [0.0,  [68, 1, 84]],
    [0.25, [59, 82, 139]],
    [0.5,  [33, 145, 140]],
    [0.75, [94, 201, 98]],
    [1.0,  [253, 231, 37]]
  ],
  magma: [
    [0.0,  [15, 12, 41]],
    [0.2,  [67, 18, 93]],
    [0.4,  [135, 34, 110]],
    [0.6,  [204, 68, 90]],
    [0.8,  [247, 137, 72]],
    [1.0,  [252, 253, 191]]
  ],
  plasma: [
    [0.0,  [13, 8, 135]],
    [0.25, [126, 3, 168]],
    [0.5,  [204, 71, 120]],
    [0.75, [248, 149, 64]],
    [1.0,  [240, 249, 33]]
  ],
  cividis: [
    [0.0,  [0, 32, 77]],
    [0.25, [65, 78, 107]],
    [0.5,  [124, 123, 120]],
    [0.75, [190, 175, 111]],
    [1.0,  [255, 234, 70]]
  ],
  diverging: [
    [0.0,  [33, 102, 172]],
    [0.35, [103, 169, 207]],
    [0.5,  [241, 245, 249]],
    [0.75, [251, 146, 60]],
    [1.0,  [220, 38, 38]]
  ]
};

function interpolateColor(valueNorm, paletteKey) {
  const ramp = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.viridis;
  const clamped = Math.max(0.0, Math.min(1.0, valueNorm));
  for (let i = 0; i < ramp.length - 1; i++) {
    const [t0, c0] = ramp[i];
    const [t1, c1] = ramp[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const factor = (clamped - t0) / (t1 - t0);
      const r = Math.round(c0[0] + factor * (c1[0] - c0[0]));
      const g = Math.round(c0[1] + factor * (c1[1] - c0[1]));
      const b = Math.round(c0[2] + factor * (c1[2] - c0[2]));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const last = ramp[ramp.length - 1][1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initYearSelectors();
  initMap();
  await loadRegionsMetadata();
  await loadCalendarData(appState.currentRegionId, null, appState.startYear, appState.endYear);
  switchWorkspace("calendar");
});

// ─── Year Selector Initializer (Date Range Filter) ───────────────────────────
function initYearSelectors() {
  const startSel = document.getElementById("start-year-select");
  const endSel   = document.getElementById("end-year-select");
  if (!startSel || !endSel) return;

  startSel.innerHTML = "";
  endSel.innerHTML   = "";

  for (let y = 2000; y <= 2026; y++) {
    startSel.innerHTML += `<option value="${y}" ${y === appState.startYear ? 'selected' : ''}>${y}</option>`;
    endSel.innerHTML   += `<option value="${y}" ${y === appState.endYear ? 'selected' : ''}>${y}</option>`;
  }
}

async function onDateRangeChange() {
  const s = parseInt(document.getElementById("start-year-select").value);
  const e = parseInt(document.getElementById("end-year-select").value);
  if (s > e) {
    document.getElementById("end-year-select").value = s;
    appState.endYear = s;
  } else {
    appState.endYear = e;
  }
  appState.startYear = s;
  await loadCalendarData(appState.currentRegionId, null, appState.startYear, appState.endYear);
}

// ─── NASA GIBS TrueColor WMS Layer ────────────────────────────────────────────
function buildGibsLayer(year, month) {
  const dateStr = `${year}-${String(month).padStart(2, "0")}-15`;
  return L.tileLayer.wms(
    "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
    {
      layers: "MODIS_Terra_CorrectedReflectance_TrueColor",
      format: "image/jpeg",
      transparent: false,
      version: "1.1.1",
      time: dateStr,
      attribution: "NASA GIBS / Earthdata",
      maxZoom: 9
    }
  );
}

// ─── Native High-Performance HTML5 Canvas Heatmap Layer ────────────────────────
const CanvasHeatmapLayer = L.Layer.extend({
  initialize: function(points, options) {
    this._points = points || [];
    this.options = Object.assign({
      radius: 34,
      blur: 24,
      maxIntensity: 60.0,
      opacity: 0.86
    }, options);
    this._lut = null;
  },
  onAdd: function(map) {
    this._map = map;
    if (!this._canvas) {
      this._canvas = L.DomUtil.create("canvas", "leaflet-heatmap-layer");
      this._canvas.style.pointerEvents = "none";
      this._canvas.style.position = "absolute";
      this._ctx = this._canvas.getContext("2d");
    }
    map.getPanes().overlayPane.appendChild(this._canvas);
    map.on("moveend zoomend viewreset resize", this._reset, this);
    this._reset();
  },
  onRemove: function(map) {
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    map.off("moveend zoomend viewreset resize", this._reset, this);
  },
  setPoints: function(points) {
    this._points = points;
    return this.redraw();
  },
  redraw: function() {
    if (this._map && this._canvas) {
      this._draw();
    }
    return this;
  },
  _reset: function() {
    if (!this._map || !this._canvas) return;
    const size = this._map.getSize();
    const bounds = this._map.getBounds();
    const topLeft = this._map.latLngToLayerPoint(bounds.getNorthWest());

    this._canvas.width = size.x;
    this._canvas.height = size.y;
    L.DomUtil.setPosition(this._canvas, topLeft);
    this._draw();
  },
  _draw: function() {
    if (!this._map || !this._points || !this._points.length) {
      if (this._ctx && this._canvas) {
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      }
      return;
    }
    const ctx = this._ctx;
    const size = this._map.getSize();
    ctx.clearRect(0, 0, size.x, size.y);

    const bounds = this._map.getBounds();
    const topLeft = this._map.latLngToLayerPoint(bounds.getNorthWest());
    const r = this.options.radius;
    const blur = this.options.blur;

    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = size.x;
    shadowCanvas.height = size.y;
    const sCtx = shadowCanvas.getContext("2d");

    const maxI = this.options.maxIntensity || 60.0;

    for (let i = 0; i < this._points.length; i++) {
      const p = this._points[i];
      const lat = p[0], lon = p[1], rawI = p[2] || 15.0;
      const intensity = Math.min(1.0, Math.max(0.12, rawI / maxI));
      const pt = this._map.latLngToLayerPoint([lat, lon]);
      const x = pt.x - topLeft.x;
      const y = pt.y - topLeft.y;

      if (x < -r || x > size.x + r || y < -r || y > size.y + r) continue;

      const grad = sCtx.createRadialGradient(x, y, Math.max(1, r - blur), x, y, r);
      grad.addColorStop(0, `rgba(0,0,0,${intensity.toFixed(2)})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");

      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(x, y, r, 0, Math.PI * 2);
      sCtx.fill();
    }

    const imgData = sCtx.getImageData(0, 0, size.x, size.y);
    const data = imgData.data;
    const lut = this._getColorLUT();

    for (let j = 3; j < data.length; j += 4) {
      const alpha = data[j];
      if (alpha > 3) {
        const lutIdx = alpha * 4;
        data[j - 3] = lut[lutIdx];
        data[j - 2] = lut[lutIdx + 1];
        data[j - 1] = lut[lutIdx + 2];
        data[j]     = Math.floor(alpha * this.options.opacity);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  },
  _getColorLUT: function() {
    if (this._lut) return this._lut;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0.0, "rgba(127, 29, 29, 0)");
    grad.addColorStop(0.18, "rgb(185, 28, 28)");
    grad.addColorStop(0.38, "rgb(220, 38, 38)");
    grad.addColorStop(0.62, "rgb(249, 115, 22)");
    grad.addColorStop(0.82, "rgb(250, 204, 21)");
    grad.addColorStop(1.0, "rgb(255, 255, 255)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 1);
    this._lut = ctx.getImageData(0, 0, 256, 1).data;
    return this._lut;
  }
});

function initMap() {
  appState.map = L.map("map", {
    center: [-8.5, -60.0],
    zoom: 5,
    minZoom: 2,
    maxZoom: 17,
    zoomControl: true
  });

  const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | NASA FIRMS',
    maxZoom: 19
  });

  const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  });

  appState.gibsLayer = buildGibsLayer(appState.selectedYear, appState.selectedMonth);

  osmLayer.addTo(appState.map);

  const baseMaps = {
    "Vector Street": osmLayer,
    "Satellite Ortho": satelliteLayer,
    "NASA TrueColor (GIBS)": appState.gibsLayer
  };
  L.control.layers(baseMaps, null, { position: "topright" }).addTo(appState.map);

  appState.hotspotLayerGroup = L.layerGroup().addTo(appState.map);
  appState.clusterLayerGroup = L.layerGroup().addTo(appState.map);
  appState.bboxDrawLayer     = L.layerGroup().addTo(appState.map);
  appState.heatmapLayer      = new CanvasHeatmapLayer([], { radius: 34, blur: 24, maxIntensity: 60.0, opacity: 0.86 });
  appState.map.addLayer(appState.heatmapLayer);

  appState.map.on("zoomend", () => {
    renderMapHotspots(appState.allHotspots, appState.allClusters, appState.timelapseDay);
  });
}

// ─── Regions Metadata ─────────────────────────────────────────────────────────
async function loadRegionsMetadata() {
  try {
    const res  = await fetch("/api/regions");
    const data = await res.json();
    data.regions.forEach(r => { appState.regionsMetadata[r.id] = r; });
  } catch (err) {
    console.error("Failed to load regions metadata:", err);
  }
}

// ─── Smooth Numeric Counter Animation ─────────────────────────────────────────
function animateValue(elementId, start, end, duration = 600, decimals = 2, prefix = "", suffix = "") {
  const el = document.getElementById(elementId);
  if (!el) return;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1.0);
    const ease     = 1 - Math.pow(1 - progress, 4);
    const current  = start + (end - start) * ease;
    el.innerText   = `${prefix}${current.toFixed(decimals)}${suffix}`;
    if (progress < 1.0) {
      requestAnimationFrame(update);
    } else {
      el.innerText = `${prefix}${end.toFixed(decimals)}${suffix}`;
    }
  }
  requestAnimationFrame(update);
}

// ─── Calendar Data Load ───────────────────────────────────────────────────────
async function loadCalendarData(regionId, biome = null, startYear = null, endYear = null) {
  try {
    const sYr = startYear !== null ? startYear : appState.startYear;
    const eYr = endYear !== null ? endYear : appState.endYear;
    appState.startYear = sYr;
    appState.endYear   = eYr;

    let url = `/api/calendar?region_id=${regionId}&start_year=${sYr}&end_year=${eYr}`;
    if (biome && biome !== "auto") url += `&biome=${biome}`;

    const res  = await fetch(url);
    const data = await res.json();
    appState.calendarData    = data.calendar;
    appState.climatologyData = data.climatology_baseline;
    appState.forecastData    = data.forecast;
    appState.regimeShiftData = data.regime_shift;

    document.getElementById("stat-region-name").innerText = data.region_name;
    document.getElementById("stat-biome-name").innerText  = data.biome_name;

    const temporalRangeEl = document.getElementById("stat-temporal-range");
    if (temporalRangeEl) temporalRangeEl.innerText = `${sYr} — ${eYr}`;

    const biasRatio = 1.0 / data.calibration_parameters.viirs_to_modis_scale;
    animateValue("stat-bias-factor", 1.0, biasRatio, 500, 2, "", "x");

    if (data.recent_month_status) {
      const z = data.recent_month_status.anomaly_z_score;
      animateValue("stat-current-anomaly", 0.0, z, 500, 2, z >= 0 ? "+" : "", "\u03c3");
      document.getElementById("stat-current-severity").innerText = data.recent_month_status.severity_label;
    }

    renderCalendar();
    updateDiscrepancyChart();
    updateClimatologyChart();
    updateDecisionSupport(data);

    if (data.forecast) {
      renderForecast(data.forecast);
    }

    if (data.regime_shift) {
      renderRegimeShift(data.regime_shift);
    }

    await loadHotspotsAndClusters(regionId, appState.selectedYear, appState.selectedMonth);

    const reg = appState.regionsMetadata[regionId];
    if (reg && reg.center) {
      appState.map.flyTo(reg.center, reg.zoom || 5, { duration: 0.8, easeLinearity: 0.25 });
    }
  } catch (err) {
    console.error("Failed to load calendar data:", err);
  }
}

// ─── Calendar Render ──────────────────────────────────────────────────────────
function renderCalendar() {
  if (!appState.calendarData) return;

  const table   = document.getElementById("calendar-table");
  const metric  = document.getElementById("metric-select").value;
  const palette = document.getElementById("palette-select").value;
  appState.selectedMetric  = metric;
  appState.selectedPalette = palette;

  updateLegendBar(palette, metric);

  const months = appState.calendarData.months;
  const years  = appState.calendarData.years;
  const matrix = appState.calendarData.matrix;

  let maxVal = 1.0;
  if      (metric === "harmonized")  maxVal = appState.calendarData.max_harmonized;
  else if (metric === "frp")         maxVal = appState.calendarData.max_frp;
  else if (metric === "anomaly")     maxVal = Math.max(3.0, appState.calendarData.max_z_score);
  else if (metric === "discrepancy") maxVal = 5.0;

  let html = `<thead><tr><th>Year</th>`;
  months.forEach(m => { html += `<th>${m}</th>`; });
  html += `<th>Total (H*)</th></tr></thead><tbody>`;

  years.forEach((yr, yIdx) => {
    html += `<tr><td class="year-label">${yr}</td>`;
    const row = matrix[yIdx];
    row.forEach((cell, mIdx) => {
      let cellVal = 0, normVal = 0;
      if      (metric === "harmonized")  { cellVal = cell.harmonized_hotspot_index; normVal = cellVal / maxVal; }
      else if (metric === "frp")         { cellVal = cell.total_frp_mw; normVal = cellVal / maxVal; }
      else if (metric === "anomaly")     { cellVal = cell.anomaly_z_score; normVal = (cellVal + 3.0) / 6.0; }
      else if (metric === "discrepancy") { const m2 = cell.raw_modis_count; const v2 = cell.raw_viirs_count; cellVal = m2 > 0 ? (v2 / m2) : 0; normVal = cellVal / 5.0; }

      const color      = interpolateColor(normVal, palette);
      const isSelected = yr === appState.selectedYear && (mIdx + 1) === appState.selectedMonth;
      const cls        = isSelected ? "calendar-cell active-selected" : "calendar-cell";
      html += `<td class="${cls}" style="background-color: ${color};"
                   data-year="${yr}" data-month="${mIdx + 1}"
                   onmouseover="showCellTooltip(event, ${yr}, ${mIdx + 1})"
                   onmouseout="hideCellTooltip()"
                   onclick="selectCalendarCell(${yr}, ${mIdx + 1})"></td>`;
    });
    const annualTotal = appState.calendarData.annual_totals[yIdx];
    html += `<td style="font-size: 11.5px; text-align: right; padding-left: 10px; font-family: var(--font-mono); color: var(--text-muted); font-weight: 600;">${Math.round(annualTotal.total_harmonized_hotspots).toLocaleString()}</td></tr>`;
  });
  html += `</tbody>`;
  table.innerHTML = html;
}

function updateLegendBar(paletteKey, metric) {
  const bar      = document.getElementById("legend-gradient");
  const lowLabel = document.getElementById("legend-low-label");
  const hiLabel  = document.getElementById("legend-high-label");
  if (metric === "anomaly") {
    lowLabel.innerText = "-3\u03c3 (Suppressed / Wet)";
    hiLabel.innerText  = "+3\u03c3 (Megafire Crisis)";
    bar.style.background = "linear-gradient(to right, rgb(33, 102, 172), rgb(241, 245, 249), rgb(220, 38, 38))";
  } else {
    lowLabel.innerText = "Low Activity";
    hiLabel.innerText  = "Peak Burning Season";
    const colors   = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.viridis;
    const gradStops = colors.map(([t, [r, g, b]]) => `rgb(${r},${g},${b}) ${(t * 100).toFixed(0)}%`).join(", ");
    bar.style.background = `linear-gradient(to right, ${gradStops})`;
  }
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function showCellTooltip(event, year, month) {
  const tooltip = document.getElementById("calendar-tooltip");
  const yIdx    = year - appState.calendarData.years[0];
  const cell    = appState.calendarData.matrix[yIdx][month - 1];
  if (!cell) return;

  const mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const zColor = cell.anomaly_z_score >= 1.5 ? "#dc2626" : (cell.anomaly_z_score <= -1 ? "#0284c7" : "#16a34a");

  tooltip.innerHTML = `
    <div style="font-weight: 700; color: #0284c7; margin-bottom: 6px; font-size: 12.5px;">${mn[month - 1]} ${year} — Fire Activity Summary</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-family: var(--font-mono); font-size: 11.5px;">
      <div>Harmonized (H*):</div><div style="text-align: right; font-weight: 700; color: #0f172a;">${Math.round(cell.harmonized_hotspot_index).toLocaleString()}</div>
      <div>Raw MODIS:</div><div style="text-align: right; color: #64748b;">${Math.round(cell.raw_modis_count).toLocaleString()}</div>
      <div>Raw VIIRS:</div><div style="text-align: right; color: #64748b;">${Math.round(cell.raw_viirs_count).toLocaleString()}</div>
      <div>Total FRP:</div><div style="text-align: right; color: #d97706; font-weight: 600;">${Math.round(cell.total_frp_mw).toLocaleString()} MW</div>
      <div>Baseline Median:</div><div style="text-align: right; color: #64748b;">${cell.climatology_median}</div>
      <div>Anomaly (Z):</div><div style="text-align: right; font-weight: 700; color: ${zColor};">${cell.anomaly_z_score > 0 ? "+" : ""}${cell.anomaly_z_score}\u03c3</div>
    </div>
    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #475569;">
      Status: <strong style="color: #0f172a;">${cell.severity_label}</strong><br>
      <span style="color: #0284c7;">Click to project onto map</span>
    </div>`;
  tooltip.style.left    = `${event.pageX + 14}px`;
  tooltip.style.top     = `${event.pageY - 20}px`;
  tooltip.style.display = "block";
}

function hideCellTooltip() {
  document.getElementById("calendar-tooltip").style.display = "none";
}

// ─── Calendar Cell Select ─────────────────────────────────────────────────────
async function selectCalendarCell(year, month) {
  appState.selectedYear  = year;
  appState.selectedMonth = month;
  renderCalendar();
  await loadHotspotsAndClusters(appState.currentRegionId, year, month);
  updateDecisionSupportForCell(year, month);
  updateGibsTime(year, month);
}

function updateGibsTime(year, month) {
  if (appState.gibsLayer && appState.map.hasLayer(appState.gibsLayer)) {
    appState.map.removeLayer(appState.gibsLayer);
  }
  appState.gibsLayer = buildGibsLayer(year, month);
}

// ─── Map View Mode (Harmonized vs Raw Sensors) ─────────────────────────────────
function setMapView(mode) {
  appState.mapViewMode = mode;
  const btnH   = document.getElementById("btn-view-harmonized");
  const btnR   = document.getElementById("btn-view-raw");
  const legend = document.getElementById("sensor-legend");

  if (mode === "raw") {
    btnH.classList.remove("active");
    btnR.classList.add("active");
    legend.style.display = "flex";
  } else {
    btnR.classList.remove("active");
    btnH.classList.add("active");
    legend.style.display = "none";
  }

  renderMapHotspots(appState.allHotspots, appState.allClusters);
}

function zoomToActiveFireComplex() {
  if (!appState.allClusters || !appState.allClusters.length) return;
  const sorted = [...appState.allClusters].sort((a, b) => (b.total_frp_mw || 0) - (a.total_frp_mw || 0));
  const top = sorted[0];
  if (top && top.centroid_latitude && top.centroid_longitude) {
    appState.map.flyTo([top.centroid_latitude, top.centroid_longitude], 9, {
      duration: 1.2,
      easeLinearity: 0.25
    });
  }
}

function renderMapHotspots(hotspots, clusters, dayFilter = null) {
  appState.hotspotLayerGroup.clearLayers();
  appState.clusterLayerGroup.clearLayers();

  let pts = hotspots || [];
  if (dayFilter !== null) {
    const dayStr = String(dayFilter).padStart(2, "0");
    pts = pts.filter(h => {
      if (!h.acq_date) return false;
      const d = h.acq_date.split("-")[2];
      return d <= dayStr;
    });
  }

  const zoom = appState.map.getZoom();
  const isTacticalZoom = zoom >= 7;

  // Update HUD scale indicator
  const hud = document.getElementById("map-scale-hud");
  if (hud) {
    if (appState.mapViewMode === "raw") {
      hud.innerText = isTacticalZoom
        ? `TACTICAL ZOOM (${zoom}): SENSOR FOOTPRINTS (MODIS 1km vs VIIRS 375m)`
        : `CONTINENTAL ZOOM (${zoom}): RAW DUAL SENSOR DETECTIONS`;
    } else {
      hud.innerText = isTacticalZoom
        ? `TACTICAL INCIDENT ZOOM (${zoom}): FIRE COMPLEX PERIMETERS & FOOTPRINTS`
        : `CONTINENTAL ZOOM (${zoom}): ACTIVE THERMAL RADIATIVE HEATMAP`;
    }
  }

  // ─── Mode: RAW SENSORS ───
  if (appState.mapViewMode === "raw") {
    if (appState.heatmapLayer) appState.heatmapLayer.setPoints([]);

    let modisCount = 0, viirsCount = 0;
    pts.forEach(h => {
      const isViirs = h.sensor === "VIIRS";
      isViirs ? viirsCount++ : modisCount++;

      if (isTacticalZoom && h.footprint_bounds) {
        const rect = L.rectangle(h.footprint_bounds, {
          color: isViirs ? "#ea580c" : "#0891b2",
          fillColor: isViirs ? "#f97316" : "#06b6d4",
          fillOpacity: isViirs ? 0.72 : 0.35,
          weight: isViirs ? 1 : 1.5
        });
        rect.bindPopup(`
          <div style="font-size: 12px; line-height: 1.5; color: #0f172a; font-family: var(--font-mono);">
            <strong style="color: ${isViirs ? "#ea580c" : "#0891b2"};">${h.instrument} (${h.satellite})</strong><br>
            Resolution: <strong>${isViirs ? "VIIRS 375m x 375m (0.14 km\u00b2)" : "MODIS 1km x 1km (1.0 km\u00b2)"}</strong><br>
            Pixel Ratio: <strong>${isViirs ? "7x finer footprint than MODIS" : "Baseline 1km footprint"}</strong><br>
            Acquired: <strong>${h.acq_date} ${h.acq_time} UTC</strong><br>
            Radiative Power: <strong>${h.frp} MW</strong> | Brightness: <strong>${h.brightness} K</strong>
          </div>`);
        appState.hotspotLayerGroup.addLayer(rect);
      } else {
        const marker = L.circleMarker([h.latitude, h.longitude], {
          radius: isViirs ? 3.5 : 6,
          fillColor: isViirs ? "#f97316" : "#0284c7",
          color: "#ffffff",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.88
        });
        marker.bindPopup(`
          <div style="font-size: 12px; line-height: 1.5; color: #0f172a;">
            <strong style="color: ${isViirs ? "#f97316" : "#0284c7"};">${h.instrument} (${h.satellite})</strong><br>
            Sensor: <strong>${isViirs ? "VIIRS 375 m" : "MODIS 1 km"}</strong><br>
            Acquired: <strong>${h.acq_date} ${h.acq_time} UTC</strong><br>
            FRP: <strong>${h.frp} MW</strong> | Brightness: <strong>${h.brightness} K</strong>
          </div>`);
        appState.hotspotLayerGroup.addLayer(marker);
      }
    });

    const rawEl = document.getElementById("raw-counts");
    if (rawEl) rawEl.innerText = `MODIS 1km: ${modisCount}  |  VIIRS 375m: ${viirsCount}  |  Total: ${pts.length}`;
    return;
  }

  // ─── Mode: HARMONIZED COMPLEXES (Option 5 Multi-Scale) ───
  if (!isTacticalZoom) {
    // Zoom < 7: Continental Thermal Heatmap + Glowing Major Complex Beacons
    if (appState.heatmapLayer) {
      const heatPts = pts.map(h => [h.latitude, h.longitude, h.frp || 15.0]);
      appState.heatmapLayer.setPoints(heatPts);
    }

    const sortedClusters = [...(clusters || [])].sort((a, b) => (b.total_frp_mw || 0) - (a.total_frp_mw || 0));
    const topBeacons = sortedClusters.slice(0, 8);

    topBeacons.forEach(c => {
      const beacon = L.marker([c.centroid_latitude, c.centroid_longitude], {
        icon: L.divIcon({
          className: "complex-beacon-marker",
          html: `
            <div class="beacon-pulse"></div>
            <div class="beacon-badge">Complex #${c.cluster_id}: ${Math.round(c.total_frp_mw)} MW</div>
          `,
          iconSize: [120, 28],
          iconAnchor: [60, 14]
        })
      });
      beacon.on("click", () => {
        appState.map.flyTo([c.centroid_latitude, c.centroid_longitude], 9, {
          duration: 1.0,
          easeLinearity: 0.25
        });
      });
      beacon.bindPopup(`
        <div style="font-size: 12px; line-height: 1.5; color: #0f172a; font-family: var(--font-mono);">
          <strong style="color: #dc2626;">Fire Complex #${c.cluster_id}</strong><br>
          Total Radiant Power: <strong>${c.total_frp_mw} MW</strong> (Peak: ${c.max_frp_mw} MW)<br>
          Estimated Active Front: <strong>${c.estimated_area_km2} km\u00b2</strong><br>
          Hotspot Detections: <strong>${c.hotspot_count}</strong><br>
          Sensors: <strong>${c.sensors.join(", ")}</strong><br>
          <em style="color: #64748b; font-size: 11px;">Click badge to zoom into tactical perimeters</em>
        </div>`);
      appState.clusterLayerGroup.addLayer(beacon);
    });

  } else {
    // Zoom >= 7: Tactical Complex Hulls & Footprints
    if (appState.heatmapLayer) {
      appState.heatmapLayer.setPoints([]);
    }

    (clusters || []).forEach(c => {
      if (c.hull_coordinates && c.hull_coordinates.length >= 3) {
        const polygon = L.polygon(c.hull_coordinates, {
          color: "#ef4444",
          fillColor: "#ea580c",
          fillOpacity: 0.28,
          weight: 2,
          dashArray: "4, 4"
        });
        polygon.bindPopup(`
          <div style="font-size: 12px; line-height: 1.5; color: #0f172a; font-family: var(--font-mono);">
            <strong style="color: #dc2626;">Fire Complex Perimeter #${c.cluster_id}</strong><br>
            Total Radiant Energy: <strong>${c.total_frp_mw} MW</strong> (Peak: ${c.max_frp_mw} MW)<br>
            Delineated Incident Area: <strong>${c.estimated_area_km2} km\u00b2</strong><br>
            Hotspots In Complex: <strong>${c.hotspot_count}</strong><br>
            Observation Sensors: <strong>${c.sensors.join(", ")}</strong><br>
            First Detected: <strong>${c.first_detected}</strong>
          </div>`);
        appState.clusterLayerGroup.addLayer(polygon);
      } else {
        const radiusMeters = Math.max(1200, Math.sqrt((c.estimated_area_km2 || 5) / Math.PI) * 1000);
        const circle = L.circle([c.centroid_latitude, c.centroid_longitude], {
          radius: radiusMeters,
          color: "#ef4444",
          fillColor: "#ea580c",
          fillOpacity: 0.25,
          weight: 1.5,
          dashArray: "4, 4"
        });
        appState.clusterLayerGroup.addLayer(circle);
      }

      const tacticalMarker = L.marker([c.centroid_latitude, c.centroid_longitude], {
        icon: L.divIcon({
          className: "complex-tactical-marker",
          html: `
            <div class="complex-tactical-inner">
              <div class="complex-tactical-title">COMPLEX #${c.cluster_id}</div>
              <div class="complex-tactical-stats">${Math.round(c.total_frp_mw)} MW &middot; ${c.estimated_area_km2} km\u00b2</div>
            </div>
          `,
          iconSize: [130, 36],
          iconAnchor: [65, 18]
        })
      });
      tacticalMarker.bindPopup(`
        <div style="font-size: 12px; line-height: 1.5; color: #0f172a; font-family: var(--font-mono);">
          <strong style="color: #dc2626;">Fire Complex #${c.cluster_id} Incident Brief</strong><br>
          Total Radiant Power: <strong>${c.total_frp_mw} MW</strong><br>
          Est. Physical Front Area: <strong>${c.estimated_area_km2} km\u00b2</strong><br>
          Hotspot Count: <strong>${c.hotspot_count}</strong><br>
          Sensors: <strong>${c.sensors.join(", ")}</strong>
        </div>`);
      appState.clusterLayerGroup.addLayer(tacticalMarker);
    });

    pts.forEach(h => {
      const isViirs = h.sensor === "VIIRS";
      const marker = L.circleMarker([h.latitude, h.longitude], {
        radius: isViirs ? 3.5 : 5.5,
        fillColor: isViirs ? "#f97316" : "#dc2626",
        color: "#ffffff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.88
      });
      marker.bindPopup(`
        <div style="font-size: 12px; line-height: 1.5; color: #0f172a; font-family: var(--font-mono);">
          <strong style="color: ${isViirs ? "#f97316" : "#dc2626"};">${h.instrument} (${h.satellite})</strong><br>
          Acquired: <strong>${h.acq_date} ${h.acq_time} UTC</strong><br>
          Radiative Power: <strong>${h.frp} MW</strong> | Temp: <strong>${h.brightness} K</strong><br>
          Footprint: <strong>${h.scan} km x ${h.track} km</strong><br>
          Confidence: <strong>${h.confidence}</strong>
        </div>`);
      appState.hotspotLayerGroup.addLayer(marker);
    });
  }
}

// ─── Load Hotspots & Clusters ─────────────────────────────────────────────────
async function loadHotspotsAndClusters(regionId, year, month, useLive = false) {
  try {
    const res  = await fetch(`/api/hotspots?region_id=${regionId}&year=${year}&month=${month}&use_live=${useLive}`);
    const data = await res.json();

    appState.allHotspots = data.hotspots;
    appState.allClusters = data.clusters;

    const days = data.hotspots.map(h => {
      if (!h.acq_date) return 1;
      return parseInt(h.acq_date.split("-")[2]) || 1;
    });
    const maxDay = days.length > 0 ? Math.max(...days) : 31;
    appState.timelapseMaxDay = maxDay;
    const scrubber = document.getElementById("day-scrubber");
    if (scrubber) { scrubber.max = maxDay; scrubber.value = maxDay; }
    document.getElementById("tl-status").innerText = "ALL DAYS";
    document.getElementById("day-display").innerText = "ALL";

    const liveBadge = data.source && data.source.includes("LIVE") ? "[LIVE OVERPASS] " : "";
    document.getElementById("map-subtitle").innerText =
      `${liveBadge}Viewing ${data.hotspot_count} active hotspots and ${data.cluster_count} aggregated fire complexes for ${year}-${month < 10 ? "0" + month : month} (${data.source}).`;

    renderMapHotspots(data.hotspots, data.clusters);
    updateFRPChart(data.clusters);

  } catch (err) {
    console.error("Failed to load hotspots:", err);
  }
}

// ─── 4D Temporal Time-Lapse ───────────────────────────────────────────────────
function toggleTimelapse() {
  if (appState.timelapseRunning) {
    pauseTimelapse();
  } else {
    startTimelapse();
  }
}

function startTimelapse() {
  if (appState.allHotspots.length === 0) return;
  appState.timelapseRunning = true;
  appState.timelapseDay     = 1;
  document.getElementById("btn-tl-play").innerText = "PAUSE";
  document.getElementById("tl-status").innerText   = "PLAYING";

  const speed = parseInt(document.getElementById("tl-speed").value) || 800;
  appState.timelapseTimer = setInterval(() => {
    stepTimelapse();
  }, speed);
}

function pauseTimelapse() {
  appState.timelapseRunning = false;
  if (appState.timelapseTimer) { clearInterval(appState.timelapseTimer); appState.timelapseTimer = null; }
  document.getElementById("btn-tl-play").innerText = "PLAY";
  document.getElementById("tl-status").innerText   = "PAUSED";
}

function resetTimelapse() {
  pauseTimelapse();
  appState.timelapseDay = 1;
  const scrubber = document.getElementById("day-scrubber");
  if (scrubber) scrubber.value = appState.timelapseMaxDay;
  document.getElementById("day-display").innerText = "ALL";
  document.getElementById("tl-status").innerText   = "ALL DAYS";
  renderMapHotspots(appState.allHotspots, appState.allClusters);
}

function stepTimelapse() {
  if (appState.timelapseDay > appState.timelapseMaxDay) {
    appState.timelapseDay = 1;
  }
  onDayScrub(appState.timelapseDay);
  appState.timelapseDay++;
}

function onDayScrub(day) {
  day = parseInt(day);
  appState.timelapseDay = day;
  const scrubber = document.getElementById("day-scrubber");
  if (scrubber) scrubber.value = day;
  document.getElementById("day-display").innerText = `DAY ${String(day).padStart(2, "0")}`;
  renderMapHotspots(appState.allHotspots, appState.allClusters, day);

  const pts = appState.allHotspots.filter(h => {
    if (!h.acq_date) return false;
    return parseInt(h.acq_date.split("-")[2]) <= day;
  });
  document.getElementById("tl-status").innerText = `${pts.length} pts`;
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function updateDiscrepancyChart() {
  if (!appState.calendarData) return;
  const ctx  = document.getElementById("discrepancyChart").getContext("2d");
  const years = appState.calendarData.years;
  const rawModisSeries    = [];
  const rawViirsSeries    = [];
  const harmonizedSeries  = [];

  years.forEach((y, idx) => {
    const total = appState.calendarData.annual_totals[idx];
    rawModisSeries.push(total.total_modis);
    rawViirsSeries.push(y < 2012 ? null : total.total_viirs);
    harmonizedSeries.push(total.total_harmonized_hotspots);
  });

  if (appState.charts.discrepancy) appState.charts.discrepancy.destroy();
  appState.charts.discrepancy = new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "Raw VIIRS (375m) — Artificial 3x-5x Step Surge",
          data: rawViirsSeries,
          borderColor: "#ea580c",
          backgroundColor: "rgba(234, 88, 12, 0.08)",
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.2
        },
        {
          label: "Raw MODIS (1km) — Historical Baseline (Drifting Orbit)",
          data: rawModisSeries,
          borderColor: "#dc2626",
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.2
        },
        {
          label: "ChronoFire Harmonized (Sensor-Invariant Continuum)",
          data: harmonizedSeries,
          borderColor: "#0284c7",
          backgroundColor: "rgba(2, 132, 199, 0.12)",
          fill: true,
          borderWidth: 2.5,
          pointRadius: 3,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 650, easing: "easeOutQuart" },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#334155", font: { size: 11, weight: "600" } } },
        tooltip: { backgroundColor: "#0f172a", titleColor: "#ffffff", bodyColor: "#f8fafc", borderColor: "#e2e8f0", borderWidth: 1,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw ? Math.round(ctx.raw).toLocaleString() : "N/A"}` }
        }
      },
      scales: {
        x: { ticks: { color: "#64748b", maxTicksLimit: 14 }, grid: { color: "#f1f5f9" } },
        y: { ticks: { color: "#64748b" }, grid: { color: "#f1f5f9" }, title: { display: true, text: "Annual Hotspots Count", color: "#475569", font: { weight: "600" } } }
      }
    }
  });
}

function updateClimatologyChart() {
  if (!appState.climatologyData || !appState.calendarData) return;
  const ctx      = document.getElementById("climatologyChart").getContext("2d");
  const compYear = parseInt(document.getElementById("compare-year-select").value);
  const months   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const medians  = [], q25s = [], q75s = [];

  for (let m = 1; m <= 12; m++) {
    const c = appState.climatologyData[m];
    medians.push(c ? c.median : 0);
    q25s.push(c ? c.q25 : 0);
    q75s.push(c ? c.q75 : 0);
  }

  const yIdx     = compYear - appState.calendarData.years[0];
  const yearCurve = [];
  if (yIdx >= 0 && yIdx < appState.calendarData.matrix.length) {
    appState.calendarData.matrix[yIdx].forEach(c => yearCurve.push(c.harmonized_hotspot_index));
  }

  if (appState.charts.climatology) appState.charts.climatology.destroy();
  appState.charts.climatology = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        { label: `Year ${compYear} Harmonized Curve`, data: yearCurve, borderColor: "#ea580c", borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: "#ea580c", tension: 0.3 },
        { label: "2001-2020 Multi-Year Median", data: medians, borderColor: "#0284c7", borderDash: [5, 5], borderWidth: 2, pointRadius: 0, tension: 0.3 },
        { label: "75th Percentile (Historical High)", data: q75s, borderColor: "transparent", backgroundColor: "rgba(2, 132, 199, 0.12)", fill: "+1", pointRadius: 0, tension: 0.3 },
        { label: "25th Percentile (Historical Low)", data: q25s, borderColor: "transparent", fill: false, pointRadius: 0, tension: 0.3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 650, easing: "easeOutQuart" },
      plugins: {
        legend: { labels: { color: "#334155", font: { size: 11, weight: "600" } } },
        tooltip: { backgroundColor: "#0f172a", titleColor: "#ffffff", bodyColor: "#f8fafc", borderColor: "#e2e8f0", borderWidth: 1 }
      },
      scales: {
        x: { ticks: { color: "#64748b" }, grid: { color: "#f1f5f9" } },
        y: { ticks: { color: "#64748b" }, grid: { color: "#f1f5f9" }, title: { display: true, text: "Harmonized Monthly Hotspots (H*)", color: "#475569", font: { weight: "600" } } }
      }
    }
  });
}

function updateFRPChart(clusters) {
  const ctx         = document.getElementById("frpChart").getContext("2d");
  const topClusters = clusters.slice(0, 8);
  const labels      = topClusters.map(c => `Complex #${c.cluster_id}`);
  const frpVals     = topClusters.map(c => c.total_frp_mw);
  const areas       = topClusters.map(c => c.estimated_area_km2);

  if (appState.charts.frp) appState.charts.frp.destroy();
  appState.charts.frp = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Total Radiative Energy (MW)", data: frpVals, backgroundColor: "rgba(217, 119, 6, 0.8)", borderColor: "#d97706", borderWidth: 1, yAxisID: "y" },
        { label: "Estimated Front Area (km\u00b2)", data: areas, backgroundColor: "rgba(2, 132, 199, 0.75)", borderColor: "#0284c7", borderWidth: 1, yAxisID: "y1" }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 650, easing: "easeOutQuart" },
      plugins: {
        legend: { labels: { color: "#334155", font: { size: 11, weight: "600" } } },
        tooltip: { backgroundColor: "#0f172a", titleColor: "#ffffff", bodyColor: "#f8fafc", borderColor: "#e2e8f0", borderWidth: 1 }
      },
      scales: {
        x:  { ticks: { color: "#64748b", font: { size: 10 } }, grid: { display: false } },
        y:  { position: "left",  ticks: { color: "#d97706" }, title: { display: true, text: "FRP (MW)",    color: "#d97706", font: { weight: "600" } }, grid: { color: "#f1f5f9" } },
        y1: { position: "right", ticks: { color: "#0284c7" }, title: { display: true, text: "Area (km\u00b2)", color: "#0284c7", font: { weight: "600" } }, grid: { display: false } }
      }
    }
  });
}

// ─── UPGRADE A: Predictive Early Warning Forecaster ───────────────────────────
function renderForecast(f) {
  if (!f) return;
  const badge = document.getElementById("forecast-advisory-badge");
  if (badge) {
    badge.innerText = f.advisory_level;
    badge.style.background = f.advisory_code === "RED" ? "#fef2f2" : (f.advisory_code === "AMBER" ? "#fffbeb" : "#f0fdf4");
    badge.style.borderColor = f.advisory_code === "RED" ? "#fecaca" : (f.advisory_code === "AMBER" ? "#fed7aa" : "#bbf7d0");
    badge.style.color = f.advisory_color;
  }
  document.getElementById("forecast-posture-text").innerText = f.recommended_posture;
  document.getElementById("forecast-current-z").innerText = `${f.current_anomaly_z >= 0 ? "+" : ""}${f.current_anomaly_z}\u03c3`;
  document.getElementById("forecast-max-prob").innerText = `${f.max_probability_crisis_pct}%`;
  document.getElementById("forecast-max-prob").style.color = f.advisory_color;
  document.getElementById("forecast-momentum").innerText = `${f.anomaly_momentum >= 0 ? "+" : ""}${f.anomaly_momentum}\u03c3/mo`;

  const container = document.getElementById("forecast-cards-container");
  if (!container) return;

  container.innerHTML = f.projections.map(p => `
    <div class="forecast-card">
      <div class="forecast-card-header">
        <span class="fc-step">STEP +${p.forecast_step}</span>
        <span class="fc-period">${p.label}</span>
      </div>
      <div class="forecast-card-body">
        <div class="fc-val">${Number(p.projected_harmonized_hotspots).toLocaleString()}</div>
        <div class="fc-sub">Est. Harmonized Hotspots (H*)</div>
        <div class="fc-interval">80% CI: ${Number(p.lower_bound_80).toLocaleString()} — ${Number(p.upper_bound_80).toLocaleString()}</div>
        <div class="fc-prob-bar-wrapper">
          <div class="fc-prob-label"><span>Crisis Risk:</span><span>${p.prob_crisis_pct}%</span></div>
          <div class="fc-prob-bar"><div class="fc-prob-fill" style="width: ${p.prob_crisis_pct}%; background: ${p.prob_crisis_pct > 60 ? '#dc2626' : (p.prob_crisis_pct > 30 ? '#ea580c' : '#16a34a')};"></div></div>
        </div>
      </div>
    </div>
  `).join("");
}

// ─── UPGRADE C: Fire Return Interval & Regime Shift Analytics ─────────────────
function renderRegimeShift(rs) {
  if (!rs) return;
  const badge = document.getElementById("regime-status-badge");
  if (badge) {
    badge.innerText = rs.regime_shift_status.toUpperCase();
    badge.style.color = rs.fri_acceleration_pct > 15 ? "#c2410c" : "#166534";
    badge.style.background = rs.fri_acceleration_pct > 15 ? "#fff7ed" : "#f0fdf4";
    badge.style.borderColor = rs.fri_acceleration_pct > 15 ? "#fed7aa" : "#bbf7d0";
  }
  document.getElementById("regime-era1-fri").innerText = `${rs.era1_mean_fri_years} yrs`;
  document.getElementById("regime-era2-fri").innerText = `${rs.era2_mean_fri_years} yrs`;
  document.getElementById("regime-accel-pct").innerText = `${rs.fri_acceleration_pct > 0 ? "-" : "+"}${Math.abs(rs.fri_acceleration_pct)}%`;
  document.getElementById("regime-accel-pct").style.color = rs.fri_acceleration_pct > 0 ? "#dc2626" : "#16a34a";
  document.getElementById("regime-era1-pulses").innerText = `Pulse Years: ${rs.era1_pulse_years.join(", ") || "None"}`;
  document.getElementById("regime-era2-pulses").innerText = `Pulse Years: ${rs.era2_pulse_years.join(", ") || "None"}`;
  document.getElementById("regime-load-change").innerText = `Annual Fire Load: ${rs.annual_load_change_pct >= 0 ? "+" : ""}${rs.annual_load_change_pct}%`;
  document.getElementById("regime-interp-text").innerText = rs.interpretation;

  const friVal = document.getElementById("stat-fri-val");
  const friSub = document.getElementById("stat-fri-sub");
  if (friVal && friSub) {
    friVal.innerText = `${rs.era2_mean_fri_years} yrs`;
    friSub.innerText = `Cycle: ${rs.fri_acceleration_pct > 0 ? '-' : '+'}${Math.abs(rs.fri_acceleration_pct)}% vs Era 1`;
  }
}

// ─── UPGRADE D: 1-Click High-Resolution Chart & Calendar Export ────────────────
function exportChartPNG(chartKey) {
  const chart = appState.charts[chartKey];
  if (!chart) return;
  const imageURI = chart.toBase64Image();
  const link = document.createElement("a");
  link.download = `CHRONOFIRE_${appState.currentRegionId}_${chartKey}_chart.png`;
  link.href = imageURI;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportMatrixPNG() {
  if (!appState.calendarData) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const years = appState.calendarData.years;
  const months = appState.calendarData.months;
  const matrix = appState.calendarData.matrix;

  const cellW = 34, cellH = 16, startX = 64, startY = 66;
  const totalW = startX + 12 * cellW + 110;
  const totalH = startY + years.length * (cellH + 2) + 30;

  canvas.width = totalW;
  canvas.height = totalH;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, totalW, totalH);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.fillText(`ChronoFire: Harmonized Burning Activity Calendar (${appState.currentRegionId})`, 20, 28);
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.fillStyle = "#64748b";
  ctx.fillText("NASA Space Apps Challenge 2026 | Sensor-Invariant Active Fire Hotspots", 20, 46);

  ctx.font = "bold 9.5px JetBrains Mono, monospace";
  ctx.fillStyle = "#475569";
  months.forEach((m, idx) => {
    ctx.fillText(m, startX + idx * cellW + 6, startY - 8);
  });
  ctx.fillText("Annual Total", startX + 12 * cellW + 10, startY - 8);

  const metric = appState.selectedMetric;
  const palette = appState.selectedPalette;
  let maxVal = appState.calendarData.max_harmonized || 1.0;

  years.forEach((yr, yIdx) => {
    const rowY = startY + yIdx * (cellH + 2);
    ctx.fillStyle = "#475569";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(yr.toString(), 20, rowY + 12);

    matrix[yIdx].forEach((cell, mIdx) => {
      let norm = cell.harmonized_hotspot_index / maxVal;
      ctx.fillStyle = interpolateColor(norm, palette);
      ctx.fillRect(startX + mIdx * cellW, rowY, cellW - 2, cellH);
    });

    const tot = appState.calendarData.annual_totals[yIdx].total_harmonized_hotspots;
    ctx.fillStyle = "#64748b";
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.fillText(Math.round(tot).toLocaleString(), startX + 12 * cellW + 10, rowY + 12);
  });

  const uri = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `CHRONOFIRE_Calendar_Matrix_${appState.currentRegionId}_${appState.startYear}_${appState.endYear}.png`;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportFullPack() {
  downloadCSV();
  setTimeout(() => {
    downloadGeoJSON();
  }, 400);
  setTimeout(() => {
    exportMatrixPNG();
  }, 800);
}

// ─── Emissions Estimator ──────────────────────────────────────────────────────
async function loadEmissions() {
  const btn = document.getElementById("btn-emissions");
  btn.innerText = "COMPUTING...";
  btn.disabled  = true;

  try {
    const reg   = appState.currentRegionId;
    const year  = appState.selectedYear;
    const month = appState.selectedMonth;
    const res   = await fetch(`/api/emissions?region_id=${reg}&year=${year}&month=${month}`);
    const data  = await res.json();
    renderEmissionsCard(data);
  } catch (err) {
    console.error("Emissions fetch failed:", err);
    document.getElementById("emissions-content").innerHTML =
      `<div class="emissions-placeholder" style="color:#dc2626;">Emission computation failed. Ensure backend is running.</div>`;
  } finally {
    btn.innerText = "REFRESH EMISSIONS";
    btn.disabled  = false;
  }
}

function renderEmissionsCard(data) {
  const e = data.emissions;
  const html = `
    <div class="emissions-grid">
      <div class="em-kpi">
        <div class="em-kpi-label">Biomass Consumed</div>
        <div class="em-kpi-val" style="color: var(--accent-orange);">${Number(data.biomass_consumed_t).toLocaleString()}</div>
        <div class="em-kpi-unit">metric tons dry matter</div>
      </div>
      <div class="em-kpi">
        <div class="em-kpi-label">CO2 Equivalent</div>
        <div class="em-kpi-val" style="color: var(--accent-fire);">${Number(e.co2_eq_t).toLocaleString()}</div>
        <div class="em-kpi-unit">metric tons CO2-eq</div>
      </div>
      <div class="em-kpi">
        <div class="em-kpi-label">PM2.5 Particulates</div>
        <div class="em-kpi-val" style="color: #7c3aed;">${Number(e.pm25_t).toLocaleString()}</div>
        <div class="em-kpi-unit">metric tons</div>
      </div>
      <div class="em-kpi">
        <div class="em-kpi-label">Car-Year Equivalents</div>
        <div class="em-kpi-val" style="color: var(--accent-blue);">${Number(data.car_year_equivalents).toLocaleString()}</div>
        <div class="em-kpi-unit">passenger cars / year (US EPA)</div>
      </div>
    </div>
    <div class="emissions-breakdown">
      <div class="em-row"><span>Direct CO2</span><span>${Number(e.co2_t).toLocaleString()} t</span></div>
      <div class="em-row"><span>Carbon Monoxide (CO)</span><span>${Number(e.co_t).toLocaleString()} t</span></div>
      <div class="em-row"><span>Methane (CH4)</span><span>${Number(e.ch4_t).toLocaleString()} t</span></div>
      <div class="em-row"><span>PM2.5 Particulates</span><span>${Number(e.pm25_t).toLocaleString()} t</span></div>
      <div class="em-row em-row-total"><span>CO2-Equivalent Total</span><span>${Number(e.co2_eq_t).toLocaleString()} t CO2-eq</span></div>
    </div>
    <div class="em-meta">
      Biome: <strong>${data.biome_name}</strong> | 
      Methodology: <strong>${data.methodology}</strong> | 
      Total FRP: <strong>${data.total_frp_mw} MW</strong> | 
      FRE: <strong>${Number(data.fre_mj).toLocaleString()} MJ</strong>
    </div>`;
  document.getElementById("emissions-content").innerHTML = html;
}

// ─── SITREP Generator ─────────────────────────────────────────────────────────
async function generateSitrep() {
  openModal("sitrep-modal");
  document.getElementById("sitrep-body").innerHTML = `<div class="sitrep-loading">Generating situational report...</div>`;

  try {
    const reg   = appState.currentRegionId;
    const year  = appState.selectedYear;
    const month = appState.selectedMonth;
    const res   = await fetch(`/api/sitrep?region_id=${reg}&year=${year}&month=${month}`);
    const data  = await res.json();
    renderSitrep(data);
  } catch (err) {
    console.error("SITREP fetch failed:", err);
    document.getElementById("sitrep-body").innerHTML =
      `<div class="sitrep-loading" style="color:#dc2626;">Report generation failed. Ensure backend is running.</div>`;
  }
}

function renderSitrep(d) {
  const inc  = d.incident_summary;
  const si   = d.sensor_intelligence;
  const clim = d.climatological_context;
  const em   = d.emission_estimates;

  const analoguesHtml = clim.historical_analogues.map(a =>
    `<div class="sitrep-row"><span>${a.year} (${a.severity})</span><span>Z=${a.z_score > 0 ? "+" : ""}${a.z_score}</span></div>`
  ).join("") || `<div class="sitrep-row"><span>No close historical analogue found</span><span>-</span></div>`;

  const actionsHtml = d.recommended_actions.map((a, i) =>
    `<div class="sitrep-action"><span class="action-num">${i + 1}</span><span>${a}</span></div>`
  ).join("");

  const threatBg = inc.threat_level === "CRITICAL" ? "#fef2f2" : (inc.threat_level === "ELEVATED" ? "#fffbeb" : "#f0fdf4");

  document.getElementById("sitrep-body").innerHTML = `
    <div class="sitrep-print" id="sitrep-print-area">
      <div class="sitrep-header-block" style="background: ${threatBg}; border-left: 4px solid ${inc.threat_color};">
        <div class="sitrep-classification">${d.classification}</div>
        <div class="sitrep-title-main">${d.report_title}</div>
        <div class="sitrep-meta-row">
          <span>REGION: <strong>${inc.region}</strong></span>
          <span>PERIOD: <strong>${inc.period}</strong></span>
          <span>BIOME: <strong>${inc.biome}</strong></span>
          <span class="sitrep-threat-badge" style="background: ${inc.threat_color}; color:#fff;">${inc.threat_level}</span>
        </div>
      </div>

      <div class="sitrep-sections">
        <div class="sitrep-section">
          <div class="sitrep-section-title">SECTION 1 — SENSOR INTELLIGENCE</div>
          <div class="sitrep-row"><span>Total Active Hotspots</span><span>${si.total_hotspots.toLocaleString()}</span></div>
          <div class="sitrep-row"><span>MODIS Detections (1 km)</span><span>${si.modis_detections.toLocaleString()}</span></div>
          <div class="sitrep-row"><span>VIIRS Detections (375 m)</span><span>${si.viirs_detections.toLocaleString()}</span></div>
          <div class="sitrep-row"><span>ST-DBSCAN Fire Complexes</span><span>${si.fire_complexes}</span></div>
          <div class="sitrep-row"><span>Total Active Front Area</span><span>${si.total_active_area_km2} km\u00b2</span></div>
          <div class="sitrep-row sitrep-row-hl"><span>Peak FRP</span><span>${si.peak_frp_mw} MW</span></div>
          <div class="sitrep-row sitrep-row-hl"><span>Total FRP</span><span>${si.total_frp_mw} MW</span></div>
        </div>

        <div class="sitrep-section">
          <div class="sitrep-section-title">SECTION 2 — CLIMATOLOGICAL CONTEXT</div>
          <div class="sitrep-row"><span>Anomaly Departure (Z-Score)</span><span>${clim.anomaly_z_score > 0 ? "+" : ""}${clim.anomaly_z_score}\u03c3</span></div>
          <div class="sitrep-row"><span>Baseline Period</span><span>${clim.baseline_period}</span></div>
          <div class="sitrep-row"><span>Severity Assessment</span><span>${clim.severity_label}</span></div>
          <div class="sitrep-row"><span>Baseline Median (H*)</span><span>${Number(clim.baseline_median).toLocaleString()}</span></div>
          <div class="sitrep-section-sub">Historical Analogues:</div>
          ${analoguesHtml}
        </div>

        <div class="sitrep-section">
          <div class="sitrep-section-title">SECTION 3 — EMISSION ESTIMATES</div>
          <div class="sitrep-row"><span>Biomass Consumed</span><span>${Number(em.biomass_consumed_t).toLocaleString()} t</span></div>
          <div class="sitrep-row sitrep-row-hl"><span>CO2 Equivalent</span><span>${Number(em.co2_equivalent_t).toLocaleString()} t CO2-eq</span></div>
          <div class="sitrep-row"><span>PM2.5 Particulates</span><span>${em.pm25_t} t</span></div>
          <div class="sitrep-row"><span>Methodology</span><span>${em.methodology}</span></div>
        </div>

        <div class="sitrep-section sitrep-section-actions">
          <div class="sitrep-section-title">SECTION 4 — RECOMMENDED ACTIONS</div>
          ${actionsHtml}
        </div>

        <div class="sitrep-section sitrep-sources">
          <div class="sitrep-section-title">DATA SOURCES</div>
          <div>${d.data_sources.join(" | ")}</div>
        </div>
      </div>
    </div>`;
}

function printSitrep() {
  window.print();
}

// ─── Decision Support ─────────────────────────────────────────────────────────
function updateDecisionSupport(calendarData) {
  const rec = calendarData.recent_month_status;
  if (!rec) return;
  const z       = rec.anomaly_z_score;
  const statusEl = document.getElementById("decision-status");
  const analogEl = document.getElementById("decision-analog");

  if (z >= 1.5) {
    statusEl.innerHTML = `<span style="color: #dc2626; font-weight: 700;">CRITICAL WILDFIRE ANOMALY (+${z}\u03c3):</span> Multi-day fire front propagation exceeds 90th percentile historical envelope. Extreme biomass consumption.`;
    analogEl.innerText = "Burning trajectory closely matches historical mega-fire crises (e.g. 2019/2020 El Nino dry season). High pyroconvective risk.";
  } else if (z >= 0.5) {
    statusEl.innerHTML = `<span style="color: #d97706; font-weight: 700;">ELEVATED FIRE INTENSITY (+${z}\u03c3):</span> Above historical median. Active agricultural clearing and forest understory ignition detected.`;
    analogEl.innerText = "Parallels moderate drought fire seasons. Maintain enhanced satellite overpass vigilance.";
  } else {
    statusEl.innerHTML = `<span style="color: #16a34a; font-weight: 700;">NORMAL / SUPPRESSED BURNING:</span> Within 20-year climatological baseline. No extraordinary fire crisis.`;
    analogEl.innerText = "Consistent with seasonal precipitation cycles. Standard monitoring protocols sufficient.";
  }
}

function updateDecisionSupportForCell(year, month) {
  const yIdx = year - appState.calendarData.years[0];
  const cell = appState.calendarData.matrix[yIdx][month - 1];
  if (!cell) return;
  const mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const z  = cell.anomaly_z_score;
  document.getElementById("decision-status").innerHTML =
    `<strong>${mn[month - 1]} ${year} Analysis:</strong> Harmonized Hotspots: <strong>${Math.round(cell.harmonized_hotspot_index).toLocaleString()}</strong> | Anomaly Departure: <strong>${z > 0 ? "+" : ""}${z}\u03c3</strong> (${cell.severity_label}).`;
}

// ─── UI Event Handlers ────────────────────────────────────────────────────────
function updateRegionPills(regionId) {
  document.querySelectorAll(".pill-btn").forEach(p => {
    p.classList.toggle("active", p.getAttribute("data-region") === regionId);
  });
}

function quickSelectRegion(regionId) {
  const sel = document.getElementById("region-select");
  if (sel) {
    sel.value = regionId;
    onRegionChange();
  }
}

function switchWorkspace(mode) {
  appState.currentWorkspace = mode;
  document.querySelectorAll(".ws-tab").forEach(tab => tab.classList.remove("active"));
  const activeTab = document.getElementById(`tab-${mode}`);
  if (activeTab) activeTab.classList.add("active");

  const cardCalendar    = document.getElementById("card-calendar");
  const cardDiscrepancy = document.getElementById("card-discrepancy");
  const cardClimatology = document.getElementById("card-climatology");
  const cardMap         = document.getElementById("card-map");
  const cardFrp         = document.getElementById("card-frp");
  const cardGuidance    = document.getElementById("card-guidance");
  const cardEmissions   = document.getElementById("card-emissions");
  const cardForecast    = document.getElementById("card-forecast");
  const cardRegimeShift = document.getElementById("card-regime-shift");

  const allCards = [
    cardCalendar, cardDiscrepancy, cardClimatology,
    cardMap, cardFrp, cardGuidance,
    cardEmissions, cardForecast, cardRegimeShift
  ];

  if (mode === "all") {
    allCards.forEach(c => { if (c) c.style.display = ""; });
  } else if (mode === "calendar") {
    allCards.forEach(c => { if (c) c.style.display = "none"; });
    if (cardCalendar) cardCalendar.style.display = "";
    if (cardDiscrepancy) cardDiscrepancy.style.display = "";
    if (cardClimatology) cardClimatology.style.display = "";
  } else if (mode === "map") {
    allCards.forEach(c => { if (c) c.style.display = "none"; });
    if (cardMap) cardMap.style.display = "";
    if (cardFrp) cardFrp.style.display = "";
    if (cardGuidance) cardGuidance.style.display = "";
  } else if (mode === "forecast") {
    allCards.forEach(c => { if (c) c.style.display = "none"; });
    if (cardForecast) cardForecast.style.display = "";
    if (cardRegimeShift) cardRegimeShift.style.display = "";
    if (cardEmissions) cardEmissions.style.display = "";
  }

  if ((mode === "map" || mode === "all") && appState.map) {
    setTimeout(() => {
      appState.map.invalidateSize();
      renderMapHotspots(appState.allHotspots, appState.allClusters, appState.timelapseDay);
    }, 100);
  }
}

function dismissQuickGuide() {
  const bar = document.getElementById("quick-guide-bar");
  if (bar) bar.style.display = "none";
}

async function onRegionChange() {
  appState.currentRegionId = document.getElementById("region-select").value;
  updateRegionPills(appState.currentRegionId);
  await loadCalendarData(appState.currentRegionId, null, appState.startYear, appState.endYear);
}

async function onBiomeChange() {
  await loadCalendarData(appState.currentRegionId, document.getElementById("biome-select").value, appState.startYear, appState.endYear);
}

async function queryLiveFIRMS() {
  const btn     = document.getElementById("btn-live-firms");
  const origTxt = btn.innerHTML;
  btn.innerText = "QUERYING FIRMS...";
  try {
    await loadHotspotsAndClusters(appState.currentRegionId, 2026, 11, true);
  } catch (err) {
    console.error("Live query failed:", err);
  } finally {
    btn.innerHTML = origTxt;
  }
}

function fitMapBounds() {
  const reg = appState.regionsMetadata[appState.currentRegionId];
  if (reg && reg.bbox) {
    const [minLat, minLon, maxLat, maxLon] = reg.bbox;
    appState.map.fitBounds([[minLat, minLon], [maxLat, maxLon]]);
  }
}

// ─── Professional Drag & Click Bounding Box Engine ───────────────────────────
function detectBiomeFromCoords(lat, lon) {
  if (lat >= -25 && lat <= 10 && lon >= -82 && lon <= -34) return "tropical_forest";
  if (lat >= 30 && lat <= 45 && lon >= -125 && lon <= -114) return "mediterranean";
  if (lat >= 34 && lat <= 46 && lon >= -10 && lon <= 36) return "mediterranean";
  if (lat <= -10 && lat >= -44 && lon >= 112 && lon <= 155) return "savanna_grassland";
  if (lat >= 20 && lat <= 35 && lon >= 68 && lon <= 88) return "cropland_agriculture";
  if (lat >= 48) return "boreal_forest";
  if (lat <= 5 && lat >= -35 && lon >= 10 && lon <= 45) return "savanna_grassland";
  return "global_default";
}

let isBboxDragging = false;

function toggleBboxDraw() {
  appState.isDrawingBbox = !appState.isDrawingBbox;
  const btn = document.getElementById("btn-draw-bbox");
  const hud = document.getElementById("map-scale-hud");

  if (appState.isDrawingBbox) {
    if (btn) {
      btn.style.background = "#dc2626";
      btn.style.color      = "#ffffff";
      btn.innerText        = "CANCEL DRAWING";
    }
    if (hud) {
      hud.innerText = "CLICK & DRAG TO DRAW AREA OF INTEREST (OR CLICK OPPOSITE CORNERS)";
      hud.style.borderColor = "#0284c7";
      hud.style.color = "#0284c7";
    }

    appState.map.getContainer().style.cursor = "crosshair";
    appState.bboxStartPoint = null;
    isBboxDragging = false;

    // Temporarily disable map panning so drag draws rectangle instead of moving map
    appState.map.dragging.disable();

    // Prevent marker clicks from intercepting drawing
    const overlayPane = appState.map.getPanes().overlayPane;
    if (overlayPane) overlayPane.style.pointerEvents = "none";
    const markerPane = appState.map.getPanes().markerPane;
    if (markerPane) markerPane.style.pointerEvents = "none";

    appState.map.on("mousedown", onBboxMouseDown);
    appState.map.on("mousemove", onBboxMouseMove);
    appState.map.on("mouseup", onBboxMouseUp);
    appState.map.on("click", onBboxClick);

  } else {
    cleanupBboxDrawing();
  }
}

function cleanupBboxDrawing() {
  appState.isDrawingBbox = false;
  appState.bboxStartPoint = null;
  isBboxDragging = false;

  if (appState.bboxPreviewRect) {
    appState.bboxDrawLayer.removeLayer(appState.bboxPreviewRect);
    appState.bboxPreviewRect = null;
  }
  if (appState.bboxAnchorMarker) {
    appState.bboxDrawLayer.removeLayer(appState.bboxAnchorMarker);
    appState.bboxAnchorMarker = null;
  }

  const btn = document.getElementById("btn-draw-bbox");
  if (btn) {
    btn.style.background = "";
    btn.style.color      = "";
    btn.innerText        = "DRAW BOUNDING BOX";
  }

  if (appState.map) {
    appState.map.getContainer().style.cursor = "";
    appState.map.dragging.enable();

    const overlayPane = appState.map.getPanes().overlayPane;
    if (overlayPane) overlayPane.style.pointerEvents = "auto";
    const markerPane = appState.map.getPanes().markerPane;
    if (markerPane) markerPane.style.pointerEvents = "auto";

    appState.map.off("mousedown", onBboxMouseDown);
    appState.map.off("mousemove", onBboxMouseMove);
    appState.map.off("mouseup", onBboxMouseUp);
    appState.map.off("click", onBboxClick);
  }

  const hud = document.getElementById("map-scale-hud");
  if (hud && appState.map) {
    hud.style.borderColor = "";
    hud.style.color = "";
    const zoom = appState.map.getZoom();
    hud.innerText = zoom >= 7
      ? `TACTICAL INCIDENT ZOOM (${zoom}): FIRE COMPLEX PERIMETERS & FOOTPRINTS`
      : `CONTINENTAL ZOOM (${zoom}): ACTIVE THERMAL RADIATIVE HEATMAP`;
  }
}

function onBboxMouseDown(e) {
  if (!appState.isDrawingBbox) return;
  if (!appState.bboxStartPoint) {
    appState.bboxStartPoint = e.latlng;
    isBboxDragging = true;
    appState.bboxDrawLayer.clearLayers();

    appState.bboxPreviewRect = L.rectangle([e.latlng, e.latlng], {
      color: "#0284c7",
      weight: 2,
      fillColor: "#38bdf8",
      fillOpacity: 0.22,
      dashArray: "5, 5"
    }).addTo(appState.bboxDrawLayer);
  }
}

function onBboxMouseMove(e) {
  if (!appState.isDrawingBbox || !appState.bboxStartPoint) return;
  if (!appState.bboxPreviewRect) {
    appState.bboxPreviewRect = L.rectangle([appState.bboxStartPoint, e.latlng], {
      color: "#0284c7",
      weight: 2,
      fillColor: "#38bdf8",
      fillOpacity: 0.22,
      dashArray: "5, 5"
    }).addTo(appState.bboxDrawLayer);
  } else {
    appState.bboxPreviewRect.setBounds([appState.bboxStartPoint, e.latlng]);
  }
}

function onBboxMouseUp(e) {
  if (!appState.isDrawingBbox || !appState.bboxStartPoint) return;
  const p1 = appState.bboxStartPoint;
  const p2 = e.latlng;

  const dLat = Math.abs(p2.lat - p1.lat);
  const dLon = Math.abs(p2.lng - p1.lng);

  // If dragged at least 0.1 degrees in any direction, complete box
  if (isBboxDragging && (dLat > 0.1 || dLon > 0.1)) {
    isBboxDragging = false;
    finishBboxDraw(p1, p2);
  }
}

function onBboxClick(e) {
  if (!appState.isDrawingBbox) return;
  if (!appState.bboxStartPoint) {
    // First click: anchor corner 1
    appState.bboxStartPoint = e.latlng;
    appState.bboxDrawLayer.clearLayers();
    appState.bboxAnchorMarker = L.circleMarker(e.latlng, {
      radius: 6,
      color: "#0284c7",
      fillColor: "#ffffff",
      fillOpacity: 1,
      weight: 2.5
    }).addTo(appState.bboxDrawLayer);

    const hud = document.getElementById("map-scale-hud");
    if (hud) {
      hud.innerText = `CORNER 1 SET [${e.latlng.lat.toFixed(2)}, ${e.latlng.lng.toFixed(2)}]. CLICK OPPOSITE CORNER TO FINISH.`;
    }
  } else {
    // Second click: anchor corner 2
    const p1 = appState.bboxStartPoint;
    const p2 = e.latlng;
    const dLat = Math.abs(p2.lat - p1.lat);
    const dLon = Math.abs(p2.lng - p1.lng);
    if (dLat > 0.05 || dLon > 0.05) {
      finishBboxDraw(p1, p2);
    }
  }
}

function finishBboxDraw(p1, p2) {
  const minLat = Math.min(p1.lat, p2.lat);
  const maxLat = Math.max(p1.lat, p2.lat);
  const minLon = Math.min(p1.lng, p2.lng);
  const maxLon = Math.max(p1.lng, p2.lng);

  cleanupBboxDrawing();

  appState.bboxDrawLayer.clearLayers();
  const finalRect = L.rectangle([[minLat, minLon], [maxLat, maxLon]], {
    color: "#0284c7",
    weight: 2.5,
    fillColor: "#0284c7",
    fillOpacity: 0.16,
    dashArray: "5, 5"
  }).addTo(appState.bboxDrawLayer);

  const centerLat = (minLat + maxLat) / 2.0;
  const centerLon = (minLon + maxLon) / 2.0;
  const detectedBiome = detectBiomeFromCoords(centerLat, centerLon);

  const estWidthKm = Math.round(Math.abs(maxLon - minLon) * 111 * Math.cos(Math.PI * centerLat / 180));
  const estHeightKm = Math.round(Math.abs(maxLat - minLat) * 111);

  document.getElementById("custom-min-lat").value = minLat.toFixed(2);
  document.getElementById("custom-max-lat").value = maxLat.toFixed(2);
  document.getElementById("custom-min-lon").value = minLon.toFixed(2);
  document.getElementById("custom-max-lon").value = maxLon.toFixed(2);
  const biomeSel = document.getElementById("custom-biome");
  if (biomeSel) biomeSel.value = detectedBiome;

  appState.activeDrawnBbox = {
    minLat, maxLat, minLon, maxLon,
    biome: detectedBiome,
    name: `Custom AOI [${minLat.toFixed(1)}, ${minLon.toFixed(1)}]`
  };

  const popupHtml = `
    <div style="font-family: var(--font-mono); font-size: 11.5px; line-height: 1.5; color: #0f172a; min-width: 220px; padding: 4px;">
      <div style="font-weight: 800; color: #0284c7; text-transform: uppercase; margin-bottom: 2px;">
        AREA OF INTEREST (AOI)
      </div>
      <div style="color: #64748b; font-size: 10.5px; margin-bottom: 8px;">
        Bounds: [${minLat.toFixed(2)}, ${minLon.toFixed(2)}] &rarr; [${maxLat.toFixed(2)}, ${maxLon.toFixed(2)}]<br>
        Dimensions: ~${Math.abs(estWidthKm)} km &times; ~${Math.abs(estHeightKm)} km<br>
        Detected Biome: <strong>${detectedBiome}</strong>
      </div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button class="btn btn-primary" style="padding: 5px 12px; font-size: 10.5px; font-weight: 700;" onclick="executeDrawnBboxAnalysis()">ANALYZE AOI</button>
        <button class="btn" style="padding: 5px 8px; font-size: 10.5px;" onclick="openModal('custom-bbox-modal')">FINE TUNE</button>
        <button class="btn" style="padding: 5px 8px; font-size: 10.5px;" onclick="cancelDrawnBbox()">CLEAR</button>
      </div>
    </div>
  `;

  finalRect.bindPopup(popupHtml, { autoPan: false }).openPopup();

  const hud = document.getElementById("map-scale-hud");
  if (hud) hud.innerText = `BOUNDING BOX READY: ~${Math.abs(estWidthKm)}x${Math.abs(estHeightKm)} km. CLICK 'ANALYZE AOI'.`;
}

function cancelDrawnBbox() {
  appState.bboxDrawLayer.clearLayers();
  appState.activeDrawnBbox = null;
  const hud = document.getElementById("map-scale-hud");
  if (hud && appState.map) {
    const zoom = appState.map.getZoom();
    hud.innerText = zoom >= 7
      ? `TACTICAL INCIDENT ZOOM (${zoom}): FIRE COMPLEX PERIMETERS & FOOTPRINTS`
      : `CONTINENTAL ZOOM (${zoom}): ACTIVE THERMAL RADIATIVE HEATMAP`;
  }
}

async function executeDrawnBboxAnalysis() {
  if (!appState.activeDrawnBbox) return;
  const { minLat, maxLat, minLon, maxLon, biome, name } = appState.activeDrawnBbox;
  appState.map.closePopup();

  const hud = document.getElementById("map-scale-hud");
  if (hud) hud.innerText = "EXECUTING HARMONIZATION PIPELINE FOR CUSTOM AOI...";

  try {
    const res = await fetch("/api/custom-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        min_lat: minLat,
        max_lat: maxLat,
        min_lon: minLon,
        max_lon: maxLon,
        biome: biome || "global_default",
        region_name: name || `Custom AOI [${minLat.toFixed(1)}, ${minLon.toFixed(1)}]`
      })
    });
    const data = await res.json();

    appState.currentRegionId = data.region_id;
    appState.regionsMetadata[data.region_id] = {
      id: data.region_id,
      name: data.region_name,
      bbox: data.bbox,
      center: [(minLat + maxLat) / 2, (minLon + maxLon) / 2],
      zoom: 7
    };
    appState.calendarData    = data.calendar;
    appState.climatologyData = data.climatology_baseline;
    appState.forecastData    = data.forecast;
    appState.regimeShiftData = data.regime_shift;

    const nameEl = document.getElementById("stat-region-name");
    if (nameEl) nameEl.innerText = data.region_name;
    const biomeEl = document.getElementById("stat-biome-name");
    if (biomeEl) biomeEl.innerText = biome;

    renderCalendar();
    updateDiscrepancyChart();
    updateClimatologyChart();
    if (data.forecast) renderForecast(data.forecast);
    if (data.regime_shift) renderRegimeShift(data.regime_shift);

    await loadHotspotsAndClusters(data.region_id, appState.selectedYear, appState.selectedMonth);

    appState.map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [30, 30] });

    if (hud) hud.innerText = `AOI HARMONIZED: ${data.region_name} (27-YEAR CONTINUUM ACTIVE)`;
  } catch (err) {
    console.error("Custom AOI analysis failed:", err);
    if (hud) hud.innerText = "CUSTOM ANALYSIS ERROR. CHECK CONSOLE.";
  }
}

async function submitCustomBBox() {
  const minLat = parseFloat(document.getElementById("custom-min-lat").value);
  const maxLat = parseFloat(document.getElementById("custom-max-lat").value);
  const minLon = parseFloat(document.getElementById("custom-min-lon").value);
  const maxLon = parseFloat(document.getElementById("custom-max-lon").value);
  const biome  = document.getElementById("custom-biome").value;
  closeModal("custom-bbox-modal");

  appState.bboxDrawLayer.clearLayers();
  L.rectangle([[minLat, minLon], [maxLat, maxLon]], {
    color: "#0284c7",
    weight: 2.5,
    fillColor: "#0284c7",
    fillOpacity: 0.16,
    dashArray: "5, 5"
  }).addTo(appState.bboxDrawLayer);

  appState.activeDrawnBbox = {
    minLat, maxLat, minLon, maxLon,
    biome,
    name: `Custom AOI [${minLat.toFixed(1)}, ${minLon.toFixed(1)}]`
  };

  await executeDrawnBboxAnalysis();
}

// ─── Export ───────────────────────────────────────────────────────────────────
function downloadCSV() {
  window.open(`/api/export/csv?region_id=${appState.currentRegionId}&data_type=calendar`, "_blank");
}
function downloadGeoJSON() {
  window.open(`/api/export/geojson?region_id=${appState.currentRegionId}&year=${appState.selectedYear}&month=${appState.selectedMonth}`, "_blank");
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "flex";
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
