# ChronoFire // NASA Active Fire Harmonization Observatory
### Harmonization of MODIS and VIIRS Hot Spots - NASA Space Apps Challenge 2026

[![Python 3.13](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Production%20Ready-009688.svg)](https://fastapi.tiangolo.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Geospatial%20Maps-199900.svg)](https://leafletjs.com/)
[![NASA FIRMS](https://img.shields.io/badge/NASA%20FIRMS-Active%20Fires-red.svg)](https://firms.modaps.eosdis.nasa.gov/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. Executive Summary

Satellites have tracked active fire hotspots for more than two decades, but the record is fractured between NASA legacy MODIS sensors (Terra and Aqua, 1 km resolution) and modern VIIRS sensors (Suomi-NPP, NOAA-20, NOAA-21, 375 m resolution). Because VIIRS provides 7-fold smaller pixel areas and detects lower-intensity fires, uncorrected time series create an artificial 3x to 5x step-function surge in hotspot counts starting in 2012.

ChronoFire solves this foundational Earth science challenge by delivering a mathematically unified harmonization pipeline and full-stack web observatory:
- Spatio-Temporal Event Clustering (ST-DBSCAN): Groups pixel detections into invariant Physical Fire Complexes (1.5 to 2.4 km, 24-hour window).
- Biome-Stratified Quantile Mapping: Calibrated power-law transfer functions across 7 global biomes.
- Terra Post-2020 Orbital Drift Compensation: Mathematical correction for diurnal combustion cycle suppression caused by equator crossing drift.
- FRP Radiant Energy Normalization: Conserves combustion energy release across sensors using view-zenith geometric correction.
- 27-Year Burning Activity Calendar Matrix (2000-2026): Accessible, colorblind-safe (Viridis, Magma, Plasma, Cividis) calendar heatmaps with dynamic start/end year filtering.
- 20-Year Climatological Baseline (2001-2020) and Z-Score Anomalies: Instant triage of catastrophic megafires versus normal seasonal fire weather.
- 90-Day Predictive Early Warning Risk Forecast: Autoregressive projection with Gaussian crisis probability and tactical action posturing.
- Fire Return Interval (FRI) and Regime Shift Tracker: Multi-decade pulse recurrence comparison between Era 1 (2000-2012) and Era 2 (2013-2026).
- Fire Radiative Energy (FRE) and Emissions Model: Estimates dry biomass consumption and greenhouse gas releases.
- Interactive Geospatial Satellite Map: Leaflet map with NASA GIBS imagery, cluster inspection, dual-sensor comparator, 4D daily scrubber, and custom ROI bounding box drawing.
- Interoperable Data Exports: 1-click CSV, RFC 7946 GeoJSON, high-resolution PNG visualizations, and automated SITREP tactical briefs.

---

## 2. Quick Start Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.13.3)
- Modern web browser (Chrome, Firefox, Edge, Safari)

### 1. Launch the Observatory
Run the launcher script from the project root (your NASA FIRMS MAP_KEY is pre-configured):
```bash
python start.py
```

### 2. Access the Web Application
Open your browser and navigate to:
```
http://127.0.0.1:8000
```
- Interactive Web Observatory: `http://127.0.0.1:8000`
- Interactive OpenAPI REST Documentation: `http://127.0.0.1:8000/docs`

---

## 3. Repository Structure

```
D:\NASA\
|-- backend\
|   |-- harmonization_engine.py  # Core scientific math: ST-DBSCAN, transfer functions, climatology, AR(1) forecast, FRI
|   |-- firms_client.py          # NASA FIRMS API ingestion & 2000-2026 benchmark generator
|   |-- server.py                # FastAPI REST server & static file host (v4.0.0 Global Edition)
|   `-- regions.json             # Benchmark fire regimes, biomes, and historical disaster metadata
|-- static\
|   |-- index.html               # Clean editorial architectural layout (Preymaker-inspired, zero emojis)
|   |-- app.js                   # Client controller, Leaflet map, Chart.js graphs, calendar renderer, PNG exporter
|   `-- styles.css               # Clean typography, high-contrast accessible design, print-ready SITREP stylesheet
|-- submission\
|   |-- PROJECT_SUBMISSION_PORTAL_CONTENT.md  # Copy-paste text for NASA Space Apps portal
|   |-- SEVEN_SLIDE_PRESENTATION_DECK.md      # Official 7-slide deck conforming to guidelines
|   |-- THIRTY_SECOND_VIDEO_PITCH_SCRIPT.md   # Exact second-by-second video pitch script
|   `-- SCIENTIFIC_METHODOLOGY_PAPER.md       # In-depth mathematical and physical derivations
|-- start.py                     # Single-click application launcher
|-- README.md                    # Project overview & technical documentation
|-- PROBLEM STATEMENT            # NASA Space Apps Challenge Problem Statement
`-- SUBMISSIONGUIDLINE           # Official Project Submission Guide
```

---

## 4. Nine Interactive Analytical Modules

1. Card [ 01 ]: 27-Year Harmonized Burning Activity Calendar Matrix (2000-2026, 12 months, customizable date range, accessible palettes).
2. Card [ 02 ]: Harmonization Proof & Sensor Step Discontinuity Correction (Raw MODIS vs Raw VIIRS vs Harmonized Continuum).
3. Card [ 03 ]: Multi-Decade Climatological Baseline & Anomaly Envelope (2001-2020 median, IQR envelope, current year overlay).
4. Card [ 04 ]: Intra-Annual Seasonal Fire Cycle & Peak Burning Window (Monthly climatology vs current year).
5. Card [ 05 ]: Geospatial Fire Observatory & ST-DBSCAN Cluster Delineation (NASA GIBS WMS, dual-sensor comparator, 4D daily scrubber, custom ROI drawer).
6. Card [ 06 ]: Fire Radiative Energy (FRE) Combustion & Carbon Emissions Model (Biomass burned in metric tons, CO2 equivalent).
7. Card [ 07 ]: Granular Hotspot Ledger & Fire Complex Registry (Inspected cluster details, FRP, coordinates, sensor source).
8. Card [ 08 ]: 90-Day Predictive Early Warning & Fire Risk Forecast (AR(1) projection, Gaussian crisis probability, tactical action posture).
9. Card [ 09 ]: Fire Return Interval (FRI) & Ecological Regime Shift Tracker (Era 1: 2000-2012 vs Era 2: 2013-2026 cycle acceleration).

---

## 5. REST API Reference

| Endpoint | Method | Description |
|:---|:---:|:---|
| `/api/regions` | `GET` | List all pre-configured global fire benchmarks and biomes |
| `/api/calendar` | `GET` | Generate 27-year burning activity matrix, climatology baseline, forecast, and regime shift |
| `/api/forecast` | `GET` | 90-Day Predictive Early Warning risk forecast and tactical action posture |
| `/api/regime-shift` | `GET` | Multi-decade Fire Return Interval acceleration and regime shift analytics |
| `/api/hotspots` | `GET` | Granular hotspots and ST-DBSCAN physical fire complexes |
| `/api/emissions` | `GET` | FRE combustion energy and carbon emissions estimates |
| `/api/sitrep` | `GET` | Automated operational Situation Report (SITREP) brief |
| `/api/custom-analysis` | `POST` | Execute live harmonization for custom user-drawn bounding box |
| `/api/export/csv` | `GET` | Download standardized NASA FIRMS CSV dataset |
| `/api/export/geojson` | `GET` | Download RFC 7946 GeoJSON FeatureCollection |
| `/api/system-info` | `GET` | Satellite sensor metadata and algorithm specifications |

---

## 6. NASA & Space Agency Data Sources

- NASA FIRMS (ESDIS/LANCE): MODIS Collection 6.1 (MCD14DL) & VIIRS 375 m (VNP14IMGTDL, VJ114IMGTDL).
- NASA GIBS: Daily global satellite imagery (Terra/Aqua MODIS True Color, VIIRS Day/Night Band).
- ESA Copernicus: Sentinel-3 SLSTR active fire detection.
- JAXA: GCOM-C SGLI thermal infrared observations.
- ISRO: INSAT-3D thermal meteorological imager observations.

---

## 7. NASA Space Apps Submission Deliverables

All required deliverables complying with the 2026 Project Submission Guide are prepared in the `submission/` folder:
- [Project Submission Portal Content](file:///D:/NASA/submission/PROJECT_SUBMISSION_PORTAL_CONTENT.md)
- [Official 7-Slide Presentation Deck](file:///D:/NASA/submission/SEVEN_SLIDE_PRESENTATION_DECK.md)
- [Official 30-Second Video Pitch Script](file:///D:/NASA/submission/THIRTY_SECOND_VIDEO_PITCH_SCRIPT.md)
- [Scientific Methodology & Mathematical Derivations](file:///D:/NASA/submission/SCIENTIFIC_METHODOLOGY_PAPER.md)

---
*Built for the 2026 NASA Space Apps Challenge - Advancing Open Science and Global Wildfire Resilience.*
