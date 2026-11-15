# 7-Slide Pitch Presentation Deck: ChronoFire
**NASA Space Apps Challenge 2026 — Harmonization of MODIS and VIIRS Hot Spots**

> *Note: This slide deck strictly adheres to the official NASA Space Apps Challenge 7-slide limitation (including title and introductory slides). All slide contents, visual layout guidance, speaker notes, and key data callouts are detailed below.*

---

## Slide 1: Title & Challenge Introduction
- **Slide Title:** ChronoFire: NASA Harmonized Active Fire Hotspot Intelligence & Burning Activity Calendar
- **Subtitle:** Unifying 25 Years of Satellite Earth Observations (2000–2026) for Global Wildfire Resilience
- **Challenge:** Harmonization of MODIS and VIIRS Hot Spots (Earth Science & Software)
- **Team:** Senior AI & Remote Sensing Engineers
- **Visual Design:**
  - Dark command-center backdrop featuring dual Earth observation satellite orbits (Terra/Aqua at 705 km and Suomi-NPP/JPSS at 824 km).
  - NASA Meatball insignia, Space Agency Partner badges (ESA, JAXA, ISRO).
  - Real-time burning activity calendar matrix glowing in Magma/Viridis thermal color ramps.
- **Key Takeaway / Tagline:**
  *"Turning fragmented satellite pixels into an unbroken, sensor-invariant fire intelligence continuum."*

---

## Slide 2: The Core Problem & The Multi-Sensor Dilemma
- **Slide Title:** The Fracture in Earth's Wildfire Record
- **The Dilemma:**
  - **MODIS (Terra & Aqua, 2000–Present):** 1 km spatial resolution at nadir (swelling to 2 km x 4.8 km at scan edges). Decommissioning/orbital drift underway.
  - **VIIRS (S-NPP, NOAA-20, NOAA-21, 2012–Present):** 375 m I-band resolution (7x smaller pixel footprint area; detects small sub-pixel fires down to 10–50 m² and FRP ~ 0.5 MW).
- **The Dangerous Artifact:**
  - Directly comparing raw hotspot counts produces a fictitious **3x to 5x step-function surge** starting in 2012.
  - **Consequence:** Emergency managers, firefighters, and climate scientists cannot tell if fires are actually getting worse or if newer satellites simply have sharper eyes.
- **Visual Design:**
  - Dual-panel graphic showing a single wildfire perimeter:
    - Left: MODIS records 2 coarse 1 km grid pixels.
    - Right: VIIRS records 14 fine 375 m pixels for the exact same physical fire.
  - Time-series graph showing the severe, artificial step artifact in 2012/2018.

---

## Slide 3: The ChronoFire Scientific Solution
- **Slide Title:** Multi-Tier Physical & Statistical Harmonization Framework
- **Key Scientific Methodologies:**
  1. **ST-DBSCAN Event Clustering:** Clusters discrete satellite pixels into physically invariant *Fire Complexes* within $1.8\text{ to }2.4\text{ km}$ spatial envelopes and $\Delta t = 24\text{ hr}$, shifting from sensor-dependent pixel counts to true physical fire perimeters.
  2. **Biome-Stratified Quantile Mapping:** Calibrated over the 14-year co-observation period (2012–2026). Non-linear transfer functions ($H^* = \alpha_b \cdot H_{\text{VIIRS}}^{\beta_b}$) reconcile detection counts across 8 distinct global biomes (tropical rainforests, Mediterranean chaparral, boreal forests, savannas, agricultural croplands).
  3. **Radiative Energy (FRP) Integration:** Preserves physical combustion energy with scan-angle geometry normalization ($\cos(\theta)^{-1.2}$) eliminating off-nadir pixel smearing.
- **Visual Design:**
  - Three-stage architectural flowchart connecting Raw Satellite Swaths $\rightarrow$ ST-DBSCAN Clustering $\rightarrow$ Biome Quantile Mapping $\rightarrow$ Harmonized Fire Index ($H^*$).

---

## Slide 4: The 25-Year Burning Activity Calendar
- **Slide Title:** Actionable 25-Year Burning Activity Matrix & Climatological Anomaly Framework
- **Core Innovations:**
  - **The 25-Year Heatmap Grid:** 2000 to 2026 (Y-axis) vs Jan–Dec (X-axis) interactive matrix.
  - **Colorblind-Safe Accessible Palettes:** Perceptually uniform Viridis, Magma, and Cividis ramps (optimized for Deuteranopia/Protanopia).
  - **20-Year Climatological Reference Baseline (2001–2020):** Multi-year medians, means, and 25th–75th interquartile ranges (IQR).
  - **Standardized Fire Activity Anomaly (Z-Score):**
    $$Z = \frac{H^*_t - \mu_{\text{clim}}}{\sigma_{\text{clim}}}$$
    Instant triage: $-2.0\sigma$ (Suppressed/Wet) to $+2.0\sigma$ (Catastrophic Megafire Crisis).
- **Visual Design:**
  - High-resolution screenshot of the ChronoFire calendar matrix showing seasonal burn pulses across 26 years.
  - Interactive tooltip overlay revealing instant raw vs harmonized counts and anomaly classifications.

---

## Slide 5: Global Validation & Case Studies
- **Slide Title:** Ground-Truthed Across Earth's Critical Fire Regimes
- **Benchmark Case Studies:**
  - **Amazon Basin & Pantanal (Tropical Megafires):** Successfully detected the 2005/2010 Amazon droughts, 2019 deforestation crisis, and 2020 Pantanal wetland burns without sensor disruption.
  - **California & Western US (Chaparral & Conifer):** Seamlessly harmonized the 2018 Camp Fire and 2020 August Complex (4.3M acres record season).
  - **Southeast Australia (Austral Summer):** Faithfully captured the 2019–2020 Black Summer mega-fire disaster.
  - **Indo-Gangetic Plain (Punjab/Haryana):** Reconciled extreme sub-pixel agricultural residue burning (paddy stubble) where raw VIIRS/MODIS discrepancy exceeds 4.8x.
- **Visual Design:**
  - 4 miniature thumbnail calendar comparison matrices demonstrating consistent anomaly detection across completely different biomes and hemispheres.

---

## Slide 6: Operational Decision Support for Responders & Land Managers
- **Slide Title:** Putting Satellite Intelligence into the Hands of First Responders
- **Real-World Operational Capabilities:**
  - **Interactive Geospatial Web App:** Leaflet satellite map powered by NASA GIBS imagery (MODIS TrueColor & VIIRS Day/Night Band).
  - **Custom Area of Interest (AOI):** Draw an arbitrary bounding box anywhere on Earth and generate a real-time harmonized calendar in seconds.
  - **Critical Burning Window Warnings:** Early warning alerts notifying dispatchers weeks in advance when a region enters peak historical fire risk.
  - **Open Data & Interoperability:** 1-click CSV & RFC 7946 GeoJSON export formatted for direct ingestion into ArcGIS, QGIS, and dispatch CAD systems.
- **Visual Design:**
  - UI screenshot showing the operational dashboard: Interactive map with ST-DBSCAN fire perimeters alongside early warning risk advisories.

---

## Slide 7: Technical Stack, Space Agency Partners & Future Vision
- **Slide Title:** Production Architecture & Open Science Future
- **Software Architecture:**
  - **Backend:** Python 3.13, FastAPI, NumPy, Pandas, SciPy, Scikit-learn (ST-DBSCAN).
  - **Frontend:** HTML5, CSS3 (Tailwind dark theme), JavaScript ES6, Leaflet.js, Chart.js.
  - **Data Integration:** NASA FIRMS API, NASA GIBS WMS, OpenStreetMap.
- **Space Agency Partner Synergy:**
  - **NASA:** FIRMS (MCD14DL, VNP14IMGTDL, VJ114IMGTDL).
  - **ESA:** Copernicus Sentinel-3 SLSTR cross-calibration.
  - **JAXA:** GCOM-C SGLI thermal infrared validation.
  - **ISRO:** INSAT-3D thermal observations over South Asia.
- **Future Vision:**
  - Real-time geostationary diurnal cycle harmonization (GOES-16/18, Meteosat-12).
  - Onboard edge deployment for next-generation wildfire constellations.
