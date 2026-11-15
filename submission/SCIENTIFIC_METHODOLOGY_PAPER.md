# ChronoFire: Scientific Methodology & Mathematical Derivations
**Multi-Sensor Active Fire Hotspot Harmonization & Climatological Anomaly Framework**
*NASA Space Apps Challenge 2026 — Senior AI & Remote Sensing Engineering Documentation*

---

## 1. Physical Sensor Discrepancy Formulation

Satellite thermal anomaly detection relies on mid-infrared (MIR, $\approx 3.9\,\mu\text{m}$) and thermal infrared (TIR, $\approx 11\,\mu\text{m}$) spectral radiance. The physical discordance between MODIS and VIIRS stems from three fundamental optical and orbital characteristics:

### 1.1 Spatial Footprint and Area Disparity
- **MODIS (Terra & Aqua):** Nadir pixel resolution is $1.0\,\text{km} \times 1.0\,\text{km} = 1.0\,\text{km}^2$. At scan angles approaching $\theta = 55^\circ$, the "bow-tie" effect expands pixels to approximately $2.0\,\text{km} \times 4.8\,\text{km} \approx 9.6\,\text{km}^2$.
- **VIIRS (Suomi-NPP, NOAA-20, NOAA-21):** The 375 m active fire product (I4/I5 channels) has a nadir footprint of $0.375\,\text{km} \times 0.375\,\text{km} \approx 0.14\,\text{km}^2$ ($\approx 1/7\text{th}$ of MODIS nadir area). VIIRS employs a unique three-zone sample aggregation algorithm, keeping edge-of-scan pixel expansion constrained to $\le 0.8\,\text{km} \times 0.8\,\text{km} \approx 0.64\,\text{km}^2$.

### 1.2 Sub-Pixel Detection Threshold
Following Dozier's sub-pixel fire equation, the observed spectral radiance $L_\lambda$ in a detector pixel is:
$$L_\lambda = p \cdot B_\lambda(T_{\text{fire}}) + (1 - p) \cdot B_\lambda(T_{\text{bg}})$$
Where:
- $p = A_{\text{fire}} / A_{\text{pixel}}$ is the fractional burning area,
- $B_\lambda(T)$ is the Planck blackbody radiation function,
- $T_{\text{fire}}$ is the flaming/smoldering temperature,
- $T_{\text{bg}}$ is the ambient background surface temperature.

Because $A_{\text{pixel}}^{\text{VIIRS}} \approx \frac{1}{7} A_{\text{pixel}}^{\text{MODIS}}$, the fractional fire area $p_{\text{VIIRS}} \approx 7 \cdot p_{\text{MODIS}}$ for identical small fires. Consequently, small or low-intensity fires (flaming area $10\text{--}50\,\text{m}^2$, $\text{FRP} < 8\,\text{MW}$) elevate VIIRS brightness temperature well above the $3\sigma$ background clutter threshold, whereas in MODIS the thermal signal is diluted into background noise.

---

## 2. Multi-Tier Harmonization Framework

To bridge the 2000–2026 record without introducing statistical distortion or physical inconsistencies, ChronoFire implements an integrated scientific pipeline:

### 2.1 Tier 1: Spatio-Temporal Event Clustering (ST-DBSCAN)
Instead of comparing raw pixel counts, ChronoFire defines a physically invariant entity: **The Physical Fire Complex**.

Given a spatio-temporal dataset of active fire hotspots $\mathcal{H} = \{(\phi_i, \lambda_i, t_i, \text{FRP}_i)\}_{i=1}^N$:
- **Spatial Metric (Great-Circle Distance):**
  $$d_{\text{spatial}}(i, j) = 2 R_{\oplus} \arcsin \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos\phi_i \cos\phi_j \sin^2\left(\frac{\Delta \lambda}{2}\right)}$$
- **Temporal Metric:**
  $$d_{\text{temporal}}(i, j) = |t_i - t_j|$$
- **Adjacency Condition:** Points $i$ and $j$ belong to the same Fire Complex if:
  $$d_{\text{spatial}}(i, j) \le \epsilon_{\text{biome}} \quad \text{and} \quad d_{\text{temporal}}(i, j) \le \Delta t_{\text{window}} = 24\,\text{hours}$$
Where $\epsilon_{\text{biome}} \in [1.5\,\text{km}, 2.4\,\text{km}]$ matches the spatial extent of MODIS pixel smearing. This aggregates multiple adjacent 375 m VIIRS detections into a single fire perimeter, eliminating pixel-geometry bias.

### 2.2 Tier 2: Biome-Stratified Quantile-Quantile Transfer Functions
For regional time-series harmonization across the 2012–2026 co-observation era, ChronoFire fits empirical transfer functions stratified by ecological biome $b$:
$$H^*_b(t) = \alpha_b \cdot \left[H_{\text{VIIRS}}(t)\right]^{\beta_b}$$

| Biome Key | Biome Description | Scaling Factor ($\alpha_b$) | Exponent ($\beta_b$) | Typical VIIRS/MODIS Multiplier |
|:---|:---|:---:|:---:|:---:|
| `tropical_forest` | Amazon, Congo, SE Asian Rainforests | 0.238 | 0.945 | 4.20x |
| `savanna_grassland` | Cerrado, African Savannas, Australia | 0.294 | 0.962 | 3.40x |
| `mediterranean` | California Chaparral, Southern Europe | 0.357 | 0.978 | 2.80x |
| `temperate_forest` | Eastern North America, Central Europe | 0.312 | 0.965 | 3.20x |
| `boreal_forest` | Canadian Taiga, Siberian Peat Forests | 0.322 | 0.970 | 3.10x |
| `cropland_agriculture`| Indo-Gangetic Plain Crop Stubble | 0.208 | 0.930 | 4.81x |

### 2.3 Tier 3: Terra Post-2020 Orbital Drift Compensation
In February 2020, NASA ceased inclination maneuvers for Terra. The spacecraft equator crossing time has drifted from its nominal 10:30 AM MLST to ~09:00 AM MLST by 2024–2026. Because diurnal wildfire combustion peaks during afternoon solar heating (13:00–15:00), early morning overpasses artificially depress observed active hotspot counts and FRP.

ChronoFire applies an orbital drift compensation factor ($D_t$):
$$D_t = 1.0 + 0.042 \cdot \max(0, \text{Year} - 2020)$$
$$\tilde{H}_{\text{MODIS}} = H_{\text{MODIS}} \cdot D_t$$
This ensures that late-era MODIS records remain directly comparable to historical baseline observations.

### 2.4 Tier 4: Fire Radiative Power (FRP) Energy Harmonization
Fire Radiative Power (FRP) measures the rate of radiant energy release:
$$\text{FRP} \approx \frac{A_{\text{pix}} \cdot \sigma}{a} \cdot \left(L_{4} - \bar{L}_{4, \text{bg}}\right) \quad [\text{MW}]$$

To account for off-nadir atmospheric attenuation and angular emission geometry, ChronoFire applies view-zenith normalization:
$$\text{FRP}_{\text{norm}} = \text{FRP}_{\text{raw}} \cdot \left[\cos(\theta_{\text{scan}})\right]^{-1.2} \cdot \kappa_{\text{sensor}}$$

### 2.5 Tier 5: Climatological Baseline & Standardized Anomaly (Z-Score)
1. **Reference Climatology ($\mathcal{C}_{m, b}$):** Computed over the 20-year baseline ($2001 \le y \le 2020$):
   $$\mu_{m, b} = \frac{1}{20} \sum_{y=2001}^{2020} H^*_{y, m, b}, \quad \sigma_{m, b} = \sqrt{\frac{1}{19} \sum_{y=2001}^{2020} \left(H^*_{y, m, b} - \mu_{m, b}\right)^2}$$
2. **Standardized Fire Activity Anomaly ($Z$):**
   $$Z_{y, m} = \frac{H^*_{y, m} - \mu_{m}}{\sigma_{m}}$$
3. **Operational Severity Thresholds:**
   - $Z \ge +2.0\sigma$: **Catastrophic Megafire Crisis** (Historical 98th+ percentile)
   - $+1.0\sigma \le Z < +2.0\sigma$: **Significantly Elevated Fire Regime**
   - $-0.5\sigma \le Z < +1.0\sigma$: **Normal / Seasonal Baseline**
   - $-1.5\sigma \le Z < -0.5\sigma$: **Moderately Suppressed**
   - $Z < -1.5\sigma$: **Extremely Suppressed / Wet**

### 2.6 Tier 6: Predictive 90-Day Early Warning Risk Forecaster
For forward-looking incident planning, ChronoFire models future monthly fire activity using a seasonal autoregressive projection:
$$Z_{t+k} = Z_t \cdot \rho^k + \Delta Z \cdot 0.4 \cdot \rho^{k-1}$$
Where $\rho = 0.68$ is the anomaly persistence coefficient and $\Delta Z$ is the recent 3-month momentum.

The probability of an extreme wildfire crisis ($Z \ge +1.5\sigma$) is derived via the standard normal cumulative distribution function:
$$P(\text{Crisis}) = 1 - \Phi\left(\frac{1.5 - Z_{t+k}}{\sigma_{\epsilon, k}}\right)$$

### 2.7 Tier 7: Fire Return Interval (FRI) & Ecological Regime Shift Tracker
ChronoFire calculates the mean return interval between major fire pulse years ($H^* \ge P_{75}$) across two distinct observation eras:
- **Era 1 (2000–2012):** Baseline MODIS Era
- **Era 2 (2013–2026):** Dual-Sensor & Accelerated Climate Era

The Fire Cycle Acceleration Rate ($\Delta \text{FRI}$) is given by:
$$\Delta \text{FRI} = \frac{\text{FRI}_{\text{Era 1}} - \text{FRI}_{\text{Era 2}}}{\text{FRI}_{\text{Era 1}}} \times 100\%$$
Quantifying the shortening of return intervals provides land managers with direct evidence of changing fire regimes and fuel depletion.

### 2.8 Tier 8: FRE Biomass & Carbon Emission Modeling
Following Wooster et al. (2005) and GFED4:
$$\text{FRE} = \sum \text{FRP}_i \cdot \Delta t_{\text{obs}} \quad [\text{MJ}]$$
$$M_{\text{biomass}} = \frac{\text{FRE}}{\alpha_b} \quad [\text{kg dry matter}]$$
$$E_{\text{CO}_2} = M_{\text{biomass}} \cdot \text{EF}_{\text{CO}_2} \cdot 10^{-3} \quad [\text{kg}]$$
$$E_{\text{PM}2.5} = M_{\text{biomass}} \cdot \text{EF}_{\text{PM}2.5} \cdot 10^{-3} \quad [\text{kg}]$$
Where $\alpha_b \approx 0.302\text{--}0.420\,\text{MJ/kg}$ is the biome-specific combustion coefficient and $\text{EF}$ are emission factors from the Global Fire Emissions Database.

---

## 3. Summary & Scientific Validity

By uniting spatial clustering with biome-stratified non-linear transfer functions, Terra orbital drift compensation, predictive autoregressive forecasting, and physical combustion energy conservation, ChronoFire achieves an unbroken, sensor-agnostic 2000–2026 active fire record. This enables emergency responders, land managers, and climate modelers to analyze long-term trends and short-term crises with complete physical and statistical integrity.
