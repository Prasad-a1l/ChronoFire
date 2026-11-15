# NASA Space Apps Challenge 2026 — Official Project Submission

## Challenge Information
- **Challenge Title:** Harmonization of MODIS and VIIRS Hot Spots
- **Challenge Category:** Earth Science & Software
- **Event:** 2026 NASA Space Apps Challenge

---

## 1. Project Name
**ChronoFire: NASA Harmonized Active Fire Hotspot Intelligence & 25-Year Burning Activity Calendar**

*Tagline:* Unifying 27 Years of Satellite Observations into an Actionable Fire Climatology Continuum for Global Emergency Response and Climate Science.

---

## 2. High-Level Project Summary
For more than two decades, NASA's Earth-observing satellites have tracked active fire hotspots across the globe. However, this critical record is split between legacy Moderate Resolution Imaging Spectroradiometer (MODIS) sensors on Terra and Aqua (1 km resolution) and modern Visible Infrared Imaging Radiometer Suite (VIIRS) sensors on Suomi-NPP, NOAA-20, and NOAA-21 (375 m resolution). Because VIIRS provides seven-fold finer pixel footprints and detects smaller, lower-intensity smoldering fires, unharmonized records show an artificial 3x to 5x surge in hotspot detections starting in 2012. This sensor artifact distorts long-term fire trend analyses, masks true climate anomalies, and confuses emergency managers.

**ChronoFire** solves this foundational Earth science dilemma by delivering an open-source, full-stack remote sensing harmonization platform. Utilizing **Spatio-Temporal Event Clustering (ST-DBSCAN)**, **Biome-Stratified Non-Linear Transfer Functions**, **Terra Post-2020 Orbital Drift Compensation**, and **Fire Radiative Power (FRP) Radiant Energy Normalization**, ChronoFire reconciles multi-sensor observations into a seamless 2000–2026 burning activity continuum. 

Through an interactive web observatory, fire managers, emergency responders, scientists, and communities can explore a **25-Year Burning Activity Calendar Matrix** rendered in accessible, colorblind-safe palettes (Viridis, Magma, Plasma, Cividis, Diverging), evaluate real-time departures against a 20-year climatological baseline (2001–2020), inspect active fire complex perimeters on NASA satellite imagery, generate automated 1-click incident SITREPs, consult a **90-Day Predictive Early Warning Risk Forecast**, track **Fire Return Interval (FRI) ecological regime shifts**, and download harmonized datasets (CSV/GeoJSON) and high-resolution chart graphics (PNG) for instant GIS integration.

---

## 3. Link to Project Demo
- **Demo Type:** 7-Slide Presentation Deck & 30-Second Video Pitch Demo
- **Publicly Accessible URL:** `https://github.com/Prasad-a1l/ChronoFire/tree/main/submission`
- *(Refer to `submission/SEVEN_SLIDE_PRESENTATION_DECK.md` and `submission/THIRTY_SECOND_VIDEO_PITCH_SCRIPT.md`)*

---

## 4. Link to Final Project
- **Code Repository & Live Application:** `https://github.com/Prasad-a1l/ChronoFire`
- **Interactive Web App Deployment:** `http://127.0.0.1:8000` *(Local production server)* / Cloud hosted instance.

---

## 5. Detailed Project Description

### What exactly does it do?
ChronoFire transforms disparate, sensor-skewed satellite active fire hotspot records into a unified, continuous 27-year burning activity intelligence system:
1. **Harmonizes Active Fire Hotspots:** Bridges the 1 km MODIS (Terra/Aqua) and 375 m VIIRS (S-NPP/NOAA-20/NOAA-21) time series (2000 to 2026) by eliminating resolution bias, sub-pixel detection threshold disparities, and Terra orbital drift artifacts.
2. **Generates a Burning Activity Calendar:** Produces an interactive 2D heatmap matrix (Years vs Months) displaying harmonized hotspot counts ($H^*$), radiant energy release, raw sensor ratios, and standardized anomaly departure levels.
3. **Establishes Climatological Baselines:** Calculates 20-year reference normals (2001–2020) including multi-year medians, means, and 25th–75th interquartile ranges (IQR) to establish what is truly "normal" fire behavior for any selected biome.
4. **Calculates Standardized Fire Activity Anomalies (SFAI):** Computes statistical Z-scores ($Z = (X_t - \mu)/\sigma$) to categorize burning conditions from "Extremely Suppressed / Wet" ($Z < -1.5$) to "Catastrophic Megafire Crisis" ($Z \ge +2.0\sigma$).
5. **Delineates Physical Fire Complexes:** Applies spatio-temporal clustering (ST-DBSCAN) to aggregate discrete pixel detections into contiguous physical fire fronts, reporting total radiant energy (MW) and estimated burn front area ($\text{km}^2$).
6. **Delivers a 90-Day Predictive Early Warning Risk Model:** Uses seasonal autoregressive projection ($\rho=0.68$) and momentum to forecast the next 3 months with 80% confidence intervals and calculate the probability of extreme wildfire crises ($P(Z \ge +1.5\sigma)$).
7. **Tracks Fire Return Intervals & Regime Shifts:** Compares historical Era 1 (2000–2012) against modern Era 2 (2013–2026) to detect fire cycle acceleration rates and burn season lengthening.
8. **Estimates Biomass & Carbon Emissions:** Applies FRE-based combustion formulations (Wooster et al. 2005 / GFED4) to compute biomass burned (dry matter tons), CO2, CO, PM2.5, and US EPA car-year equivalents.
9. **Generates 1-Click Situational Reports (SITREPs):** Formats instant, printable tactical intelligence briefs with auto-triaged threat levels and operational action recommendations.
10. **Enables Global and Custom Area Analysis:** Provides pre-calibrated benchmarks for global fire hotspots (Amazon, California, Australia, Indo-Gangetic Plain, Canada Boreal, Mediterranean Basin, African Savannas) and supports custom user-drawn bounding boxes anywhere on Earth.

### How does it work?
ChronoFire operates across five scientific and architectural layers:
- **Layer 1: Spatio-Temporal Event Clustering (ST-DBSCAN):** Groups pixel detections within a spatial tolerance of $1.5\text{ to }2.4\text{ km}$ and a temporal window of $\Delta t = 24\text{ hours}$. This clusters multi-pixel VIIRS detections of a single blaze into one unified fire front, inherently mitigating resolution-driven pixel inflation.
- **Layer 2: Biome-Stratified Empirical Quantile Mapping:** Calibrated over the 2012–2026 co-observation period where MODIS and VIIRS observed Earth simultaneously. Non-linear power-law scaling transfer functions ($H^* = \alpha_b \cdot H_{\text{VIIRS}}^{\beta_b}$) account for canopy obscuration, fuel load, and fire size distributions across 7 ecological biomes.
- **Layer 3: Terra Post-2020 Orbital Drift Compensation:** Corrects for Terra's drift from 10:30 AM to ~09:00 AM MLST ($D_t = 1.0 + 0.042 \times (\text{Year} - 2020)$), restoring diurnal combustion peak consistency.
- **Layer 4: Fire Radiative Power (FRP) Energy Conservation:** Integrates total radiative power in Megawatts, adjusting for scan-angle pixel smearing via view-zenith geometry normalization ($\cos(\theta)^{-1.2}$) to guarantee combustion energy continuity.
- **Layer 5: Full-Stack Web Observatory:** Built with a high-performance Python FastAPI engine and an accessible single-page interface powered by Leaflet.js, Chart.js, NASA GIBS satellite tiles, and HTML5 Canvas image exporters.

### What benefits does it have?
- **For Emergency Responders & Fire Managers:** Instant visual recognition of whether an ongoing fire event is historically anomalous or part of typical seasonal burning, enabling rapid triage, 90-day forward planning, and tactical resource deployment.
- **For Land Managers & Conservationists:** Identifies shifting critical burning periods, contracting fire return cycles, and post-harvest crop residue burn peaks.
- **For Climate Scientists & Carbon Modelers:** Delivers an unbroken, 27-year sensor-invariant fire activity record essential for global greenhouse gas emission inventories, atmospheric aerosol transport models, and IPCC climate projections.
- **For the Public & Communities:** High-contrast, colorblind-safe visualizations (Viridis, Cividis) ensure transparent communication of wildfire risks without misinterpreting sensor changes as real-world fire escalations.

### What tools, coding languages, hardware, or software did you use?
- **Backend & Data Science:** Python 3.13, FastAPI, Uvicorn, NumPy, Pandas, SciPy, Scikit-learn (ST-DBSCAN clustering), Requests.
- **Frontend & Visualizations:** HTML5, CSS3 (Editorial architectural light theme, zero emojis), Modern JavaScript (ES6+), Leaflet.js (geospatial mapping), Chart.js (time-series & climatology graphs), HTML5 Canvas (high-resolution PNG exports).
- **Satellite Data & APIs:** NASA Earthdata FIRMS API (active MAP_KEY: `7409713aa7e673b3c5a73ae4c11ee170`), NASA GIBS Satellite WMS (Terra/Aqua MODIS True Color Reflectance), OpenStreetMap and Esri World Imagery.
- **Data Standards:** GeoJSON (RFC 7946), OGC WMS, Standardized ISO 19115 remote sensing CSV metadata.

---

## 6. Use of Super Intelligence (SI)
- **Did you utilize any Super Intelligence (SI) tools and software?** Yes.
- **How did you use them?** LLM-based coding assistants were utilized to accelerate boilerplate code generation, optimize FastAPI endpoint routing, format documentation, and structure accessible CSS color palettes.
- **Attribution & Originality:** All mathematical harmonization formulas, remote sensing calibration models, ST-DBSCAN clustering logic, and user interface workflows were engineered specifically for this challenge in accordance with NASA Space Apps Challenge originality rules. No NASA logos, flags, or mission patches were generated or modified.

---

## 7. NASA Data
- **NASA FIRMS (Fire Information for Resource Management System):**
  - MODIS Collection 6.1 Active Fire Product (MCD14DL / MOD14 / MYD14) — 1 km resolution (2000–2026).
  - VIIRS 375 m Active Fire Product (VNP14IMGTDL on Suomi-NPP; VJ114IMGTDL on NOAA-20 and NOAA-21).
- **NASA GIBS (Global Imagery Browse Services):**
  - MODIS Terra & Aqua Corrected Reflectance (True Color) daily global imagery via OGC WMS.
  - VIIRS Day/Night Band (DNB) thermal anomaly and night light radiance imagery.
- **NASA Earth Science Data and Information System (ESDIS) & LANCE (Land, Atmosphere Near real-time Capability for EOS).**

---

## 8. Space Agency Partner Data and Other References
- **ESA (European Space Agency):** Copernicus Sentinel-3 SLSTR (Sea and Land Surface Temperature Radiometer) active fire validation datasets.
- **JAXA (Japan Aerospace Exploration Agency):** GCOM-C SGLI (Second-generation GLI) thermal infrared fire observation data.
- **ISRO (Indian Space Research Organisation):** INSAT-3D/3DR geostationary thermal meteorological imager observations over the Indo-Gangetic Plain.
- **Scientific Literature Citations:**
  - Giglio, L., et al. (2016). *The Collection 6 MODIS active fire detection algorithm and fire products.* Remote Sensing of Environment, 178, 31-41.
  - Schroeder, W., et al. (2014). *The New VIIRS 375 m active fire detection product-Algorithm description and initial assessment.* Remote Sensing of Environment, 143, 85-96.
  - Wooster, M. J., et al. (2005). *Retrieval of biomass combustion rates and totals from fire radiative power observations.* JGR Atmospheres.
  - van der Werf, G. R., et al. (2017). *Global fire emissions estimates during 1997–2016 (GFED4).* Earth System Science Data.
