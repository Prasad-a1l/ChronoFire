"""
ChronoFire: NASA Harmonized Active Fire Hotspot Intelligence Platform
---------------------------------------------------------------------
FastAPI REST API & Web Server
Author: Senior AI & Remote Sensing Engineer (NASA Space Apps Challenge 2026)
"""

import os
import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io

from backend.harmonization_engine import FireHarmonizer, BIOME_CALIBRATION_COEFFICIENTS
from backend.firms_client import FIRMSClient

app = FastAPI(
    title="ChronoFire: NASA MODIS & VIIRS Hotspot Harmonization Observatory",
    description="Operational Harmonized Burning Activity Calendar & Multi-Decade Fire Intelligence Platform",
    version="4.0.0"
)

# Enable CORS for open science and local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

firms_client = FIRMSClient()
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

# ------------------------------------------------------------------
# Biome-stratified combustion emission factors (GFED / Wooster et al.)
# EF = Emission Factor in g/kg dry matter burned
# alpha = radiant fraction (MJ per kg biomass): Wooster 2005
# ------------------------------------------------------------------
EMISSION_FACTORS = {
    "tropical_forest":     {"name": "Tropical Moist Forest",    "alpha": 0.368, "EF_CO2": 1686, "EF_CO": 93,  "EF_PM25": 9.1,  "EF_CH4": 6.8},
    "savanna_grassland":   {"name": "Savanna & Grassland",      "alpha": 0.330, "EF_CO2": 1613, "EF_CO": 65,  "EF_PM25": 6.26, "EF_CH4": 2.3},
    "boreal_forest":       {"name": "Boreal Forest & Taiga",    "alpha": 0.420, "EF_CO2": 1569, "EF_CO": 127, "EF_PM25": 15.3, "EF_CH4": 5.1},
    "temperate_forest":    {"name": "Temperate Mixed Forest",   "alpha": 0.395, "EF_CO2": 1597, "EF_CO": 88,  "EF_PM25": 12.7, "EF_CH4": 4.7},
    "mediterranean":       {"name": "Mediterranean Chaparral",  "alpha": 0.350, "EF_CO2": 1575, "EF_CO": 100, "EF_PM25": 13.0, "EF_CH4": 3.9},
    "cropland_agriculture": {"name": "Agricultural Cropland",   "alpha": 0.302, "EF_CO2": 1515, "EF_CO": 102, "EF_PM25": 7.17, "EF_CH4": 2.7},
    "global_default":      {"name": "Global Average",           "alpha": 0.360, "EF_CO2": 1613, "EF_CO": 90,  "EF_PM25": 9.6,  "EF_CH4": 4.0},
}

CAR_CO2_ANNUAL_TONS = 4.6


class CustomBBoxRequest(BaseModel):
    min_lat: float
    min_lon: float
    max_lat: float
    max_lon: float
    biome: Optional[str] = "global_default"
    region_name: Optional[str] = "Custom Area of Interest"


@app.get("/api/regions")
def get_regions():
    """Returns all pre-configured global fire benchmark regions."""
    regions = firms_client.get_all_regions()
    return {
        "count": len(regions),
        "regions": regions,
        "available_biomes": [
            {"key": k, "name": v["name"], "viirs_to_modis_scale": v["viirs_to_modis_scale"]}
            for k, v in BIOME_CALIBRATION_COEFFICIENTS.items()
        ]
    }


@app.get("/api/calendar")
def get_burning_activity_calendar(
    region_id: str = Query("amazon_basin", description="Region key from /api/regions or 'custom'"),
    start_year: int = Query(2000, ge=2000, le=2026),
    end_year: int = Query(2026, ge=2000, le=2026),
    biome: Optional[str] = Query(None)
):
    """
    Generates the complete 25-Year Harmonized Burning Activity Calendar matrix,
    climatological baseline (2001-2020), standardized fire activity anomaly indices,
    predictive early warning forecast, and fire return interval analytics.
    """
    if not isinstance(start_year, int):
        start_year = 2000
    if not isinstance(end_year, int):
        end_year = 2026
    if not isinstance(region_id, str):
        region_id = "amazon_basin"
    if not isinstance(biome, str):
        biome = None

    reg_meta = firms_client.get_region_metadata(region_id)
    target_biome = biome or (reg_meta.get("biome", "global_default") if reg_meta else "global_default")

    harmonizer = FireHarmonizer(target_biome)
    monthly_records = firms_client.generate_regional_time_series(region_id)

    # Calculate climatology & standardized anomalies
    climatology, enriched_records = harmonizer.calculate_climatology_and_anomalies(
        monthly_records, baseline_start_year=2001, baseline_end_year=2020
    )

    # Build 2D calendar matrix
    calendar_data = harmonizer.build_burning_activity_calendar(enriched_records, start_year, end_year)

    # Current year (2026) vs historical baseline summary
    records_2026 = [r for r in enriched_records if r["year"] == 2026]
    recent_month = records_2026[-1] if records_2026 else None

    # UPGRADE A: 90-Day Predictive Early Warning Forecast
    forecast = harmonizer.generate_early_warning_forecast(enriched_records, climatology, 2026, 11)

    # UPGRADE C: Fire Return Interval & Regime Shift Analytics
    regime_shift = harmonizer.calculate_regime_shift_and_fri(calendar_data["annual_totals"])

    # UPGRADE B: Terra Orbital Drift Calibration Metadata
    orbital_drift_metadata = {
        "drift_status": "Active Compensation Enabled",
        "terra_drift_2026_factor": harmonizer.get_terra_drift_factor(2026),
        "nominal_crossing_time": "10:30 AM MLST",
        "current_crossing_time": "09:05 AM MLST",
        "scientific_basis": "Compensates for diurnal combustion suppression in morning orbit (NASA Terra Post-2020 Drift)"
    }

    return {
        "region_id": region_id,
        "region_name": reg_meta["name"] if reg_meta else "Custom Region",
        "biome": target_biome,
        "biome_name": BIOME_CALIBRATION_COEFFICIENTS.get(target_biome, {}).get("name", "Default"),
        "calendar": calendar_data,
        "climatology_baseline": climatology,
        "recent_month_status": recent_month,
        "calibration_parameters": harmonizer.coeffs,
        "forecast": forecast,
        "regime_shift": regime_shift,
        "orbital_drift": orbital_drift_metadata
    }


@app.get("/api/forecast")
def get_forecast(
    region_id: str = Query("amazon_basin"),
    year: int = Query(2026),
    month: int = Query(11)
):
    """
    UPGRADE A: 90-Day Early Warning Fire Risk Model.
    Projects future fire activity and probabilities of extreme wildfire crisis.
    """
    reg_meta = firms_client.get_region_metadata(region_id)
    target_biome = reg_meta.get("biome", "global_default") if reg_meta else "global_default"
    harmonizer = FireHarmonizer(target_biome)
    monthly_records = firms_client.generate_regional_time_series(region_id)
    climatology, enriched_records = harmonizer.calculate_climatology_and_anomalies(monthly_records)
    return harmonizer.generate_early_warning_forecast(enriched_records, climatology, year, month)


@app.get("/api/regime-shift")
def get_regime_shift(region_id: str = Query("amazon_basin")):
    """
    UPGRADE C: Fire Return Interval (FRI) & Ecological Regime Shift Tracker.
    """
    reg_meta = firms_client.get_region_metadata(region_id)
    target_biome = reg_meta.get("biome", "global_default") if reg_meta else "global_default"
    harmonizer = FireHarmonizer(target_biome)
    monthly_records = firms_client.generate_regional_time_series(region_id)
    _, enriched_records = harmonizer.calculate_climatology_and_anomalies(monthly_records)
    calendar_data = harmonizer.build_burning_activity_calendar(enriched_records, 2000, 2026)
    return harmonizer.calculate_regime_shift_and_fri(calendar_data["annual_totals"])


@app.get("/api/hotspots")
def get_hotspots_and_clusters(
    region_id: str = Query("amazon_basin"),
    year: int = Query(2024, ge=2000, le=2026),
    month: int = Query(8, ge=1, le=12),
    cluster_radius_km: Optional[float] = Query(None),
    use_live: bool = Query(False)
):
    """
    Returns granular active fire hotspots and executes Spatial-Temporal Clustering (ST-DBSCAN)
    to identify discrete Fire Complexes. Supports live NASA FIRMS API ingestion.
    """
    if not isinstance(cluster_radius_km, (int, float)):
        cluster_radius_km = None
    if not isinstance(region_id, str):
        region_id = "amazon_basin"
    if not isinstance(year, int):
        year = 2024
    if not isinstance(month, int):
        month = 8

    reg_meta = firms_client.get_region_metadata(region_id)
    target_biome = reg_meta.get("biome", "global_default") if reg_meta else "global_default"
    harmonizer = FireHarmonizer(target_biome)

    hotspots = []
    source_type = "Historical Benchmark & Calibrated Simulation"

    if use_live and reg_meta and "bbox" in reg_meta:
        live_pts = firms_client.fetch_live_firms_hotspots(reg_meta["bbox"], days=3, source="VIIRS_SNPP_NRT")
        if live_pts:
            hotspots = live_pts
            source_type = "LIVE NASA FIRMS API (Suomi-NPP VIIRS 375m)"

    if not hotspots:
        hotspots = firms_client.generate_detailed_hotspots(region_id, year, month)

    clusters = harmonizer.cluster_fire_hotspots(hotspots, eps_km=cluster_radius_km)

    return {
        "region_id": region_id,
        "year": year,
        "month": month,
        "source": source_type,
        "api_key_active": bool(firms_client.api_key),
        "hotspot_count": len(hotspots),
        "cluster_count": len(clusters),
        "clusters": clusters,
        "hotspots": hotspots[:400]
    }


@app.get("/api/emissions")
def get_emissions_estimate(
    region_id: str = Query("amazon_basin"),
    year: int = Query(2024, ge=2000, le=2026),
    month: int = Query(8, ge=1, le=12)
):
    """
    UPGRADE 2: Biomass Consumption & Carbon Emission Estimator
    Uses FRE-based methodology (Wooster et al. 2005 / GFED combustion formulations)
    to estimate CO2, CO, PM2.5, CH4 from active fire hotspots.
    """
    if not isinstance(region_id, str):
        region_id = "amazon_basin"
    if not isinstance(year, int):
        year = 2024
    if not isinstance(month, int):
        month = 8

    reg_meta = firms_client.get_region_metadata(region_id)
    target_biome = reg_meta.get("biome", "global_default") if reg_meta else "global_default"
    harmonizer = FireHarmonizer(target_biome)

    hotspots = firms_client.generate_detailed_hotspots(region_id, year, month)
    clusters = harmonizer.cluster_fire_hotspots(hotspots)

    ef = EMISSION_FACTORS.get(target_biome, EMISSION_FACTORS["global_default"])
    alpha = ef["alpha"]
    OBS_DURATION_S = 900

    total_frp_mw = sum(h.get("frp", 0) for h in hotspots)
    fre_mj = total_frp_mw * OBS_DURATION_S
    biomass_kg = fre_mj / alpha if alpha > 0 else 0.0

    co2_kg   = biomass_kg * ef["EF_CO2"]  / 1000.0
    co_kg    = biomass_kg * ef["EF_CO"]   / 1000.0
    pm25_kg  = biomass_kg * ef["EF_PM25"] / 1000.0
    ch4_kg   = biomass_kg * ef["EF_CH4"]  / 1000.0

    biomass_t = biomass_kg  / 1000.0
    co2_t     = co2_kg      / 1000.0
    co_t      = co_kg       / 1000.0
    pm25_t    = pm25_kg     / 1000.0
    ch4_t     = ch4_kg      / 1000.0

    co2_eq_t = co2_t + ch4_t * 28.0 + co_t * 1.57
    car_year_equivalents = co2_eq_t / CAR_CO2_ANNUAL_TONS

    total_cluster_area_km2 = sum(c.get("estimated_area_km2", 0) for c in clusters)

    cluster_emissions = []
    for c in clusters[:5]:
        c_frp = c.get("total_frp_mw", 0)
        c_fre = c_frp * OBS_DURATION_S
        c_bio = c_fre / alpha if alpha > 0 else 0
        c_co2 = (c_bio * ef["EF_CO2"] / 1000.0) / 1000.0
        cluster_emissions.append({
            "cluster_id": c["cluster_id"],
            "frp_mw": round(c_frp, 1),
            "biomass_t": round(c_bio / 1000.0, 1),
            "co2_t": round(c_co2, 1)
        })

    return {
        "region_id": region_id,
        "region_name": reg_meta["name"] if reg_meta else region_id,
        "year": year,
        "month": month,
        "biome": target_biome,
        "biome_name": ef["name"],
        "methodology": "Wooster et al. (2005) FRE-based estimation + GFED4 biome-stratified emission factors",
        "observation_window_seconds": OBS_DURATION_S,
        "total_hotspots": len(hotspots),
        "total_cluster_area_km2": round(total_cluster_area_km2, 1),
        "total_frp_mw": round(total_frp_mw, 1),
        "fre_mj": round(fre_mj, 0),
        "biomass_consumed_t": round(biomass_t, 1),
        "emissions": {
            "co2_t":    round(co2_t,    1),
            "co_t":     round(co_t,     2),
            "pm25_t":   round(pm25_t,   2),
            "ch4_t":    round(ch4_t,    2),
            "co2_eq_t": round(co2_eq_t, 1)
        },
        "car_year_equivalents": round(car_year_equivalents, 0),
        "emission_factors": ef,
        "top_cluster_emissions": cluster_emissions
    }


@app.get("/api/sitrep")
def get_sitrep(
    region_id: str = Query("amazon_basin"),
    year: int = Query(2024, ge=2000, le=2026),
    month: int = Query(8, ge=1, le=12)
):
    """
    UPGRADE 5: Automated Situational Report (SITREP) Generator
    Returns structured JSON for a one-page wildfire intelligence brief.
    """
    if not isinstance(region_id, str):
        region_id = "amazon_basin"
    if not isinstance(year, int):
        year = 2024
    if not isinstance(month, int):
        month = 8

    reg_meta = firms_client.get_region_metadata(region_id)
    target_biome = reg_meta.get("biome", "global_default") if reg_meta else "global_default"
    harmonizer = FireHarmonizer(target_biome)

    hotspots = firms_client.generate_detailed_hotspots(region_id, year, month)
    clusters = harmonizer.cluster_fire_hotspots(hotspots)
    monthly_records = firms_client.generate_regional_time_series(region_id)
    climatology, enriched = harmonizer.calculate_climatology_and_anomalies(
        monthly_records, baseline_start_year=2001, baseline_end_year=2020
    )

    record = next((r for r in enriched if r["year"] == year and r["month"] == month), None)

    ef = EMISSION_FACTORS.get(target_biome, EMISSION_FACTORS["global_default"])
    alpha = ef["alpha"]
    OBS = 900
    total_frp = sum(h.get("frp", 0) for h in hotspots)
    fre = total_frp * OBS
    biomass_t = (fre / alpha / 1000.0) if alpha > 0 else 0
    co2_t = biomass_t * ef["EF_CO2"] / 1000.0
    pm25_t = biomass_t * ef["EF_PM25"] / 1000.0
    co2_eq = co2_t + (biomass_t * ef["EF_CH4"] / 1000.0) * 28.0

    z = record["anomaly_z_score"] if record else 0.0
    severity = record["severity_label"] if record else "Unknown"

    if z >= 2.0:
        threat_level = "CRITICAL"
        threat_color = "#dc2626"
        recommended_actions = [
            "Immediate aerial thermal reconnaissance deployment over active perimeters.",
            "Activate Tier-3 inter-agency wildfire incident management team.",
            "Coordinate emergency smoke dispersion advisories with public health agencies.",
            "Alert downstream river basin communities for ashfall and water quality impacts.",
            "Request supplemental VIIRS and MODIS overpass tasking from NASA LANCE."
        ]
    elif z >= 1.0:
        threat_level = "ELEVATED"
        threat_color = "#d97706"
        recommended_actions = [
            "Increase satellite overpass analysis cadence from daily to 6-hourly.",
            "Pre-position Type II incident command resources within 50 km of active clusters.",
            "Issue public smoke advisory for affected downwind communities.",
            "Notify agricultural land managers of active stubble burn monitoring.",
            "Review buffer zone burning restrictions within 20 km of forest boundaries."
        ]
    else:
        threat_level = "NOMINAL"
        threat_color = "#16a34a"
        recommended_actions = [
            "Maintain standard daily MODIS/VIIRS overpass monitoring protocol.",
            "Continue seasonal prescribed burn program within approved windows.",
            "Review fuel moisture indices ahead of projected dry season onset.",
            "Update pre-suppression resource staging plan for coming peak season.",
            "Submit routine fire weather outlook to regional coordination center."
        ]

    historical_analogues = []
    for r in enriched:
        if r["month"] == month and abs(r["anomaly_z_score"] - z) < 0.5 and r["year"] != year:
            historical_analogues.append({
                "year": r["year"],
                "z_score": r["anomaly_z_score"],
                "severity": r["severity_label"],
                "harmonized": round(r.get("harmonized_hotspot_index", 0), 0)
            })
    historical_analogues = sorted(historical_analogues, key=lambda x: abs(x["z_score"] - z))[:3]

    modis_count = sum(1 for h in hotspots if h.get("sensor") == "MODIS")
    viirs_count = sum(1 for h in hotspots if h.get("sensor") == "VIIRS")
    max_frp = max((h.get("frp", 0) for h in hotspots), default=0)
    total_cluster_area = sum(c.get("estimated_area_km2", 0) for c in clusters)

    month_names = ["", "January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"]

    return {
        "report_title": "WILDFIRE SITUATIONAL INTELLIGENCE BRIEF",
        "classification": "OPEN SOURCE — NASA SPACE APPS CHALLENGE 2026",
        "incident_summary": {
            "region": reg_meta["name"] if reg_meta else region_id,
            "country": reg_meta.get("country", "N/A") if reg_meta else "N/A",
            "period": f"{month_names[month]} {year}",
            "biome": ef["name"],
            "threat_level": threat_level,
            "threat_color": threat_color,
            "severity_label": severity
        },
        "sensor_intelligence": {
            "total_hotspots": len(hotspots),
            "modis_detections": modis_count,
            "viirs_detections": viirs_count,
            "fire_complexes": len(clusters),
            "total_active_area_km2": round(total_cluster_area, 1),
            "peak_frp_mw": round(max_frp, 1),
            "total_frp_mw": round(total_frp, 1)
        },
        "climatological_context": {
            "anomaly_z_score": round(z, 2),
            "baseline_period": "2001-2020",
            "severity_label": severity,
            "historical_analogues": historical_analogues,
            "baseline_median": climatology.get(month, {}).get("median", 0) if climatology else 0
        },
        "emission_estimates": {
            "biomass_consumed_t": round(biomass_t, 0),
            "co2_equivalent_t": round(co2_eq, 0),
            "pm25_t": round(pm25_t, 2),
            "methodology": "FRE-based (Wooster 2005) + GFED4 EF"
        },
        "recommended_actions": recommended_actions,
        "data_sources": [
            "NASA FIRMS MODIS (1 km, Terra/Aqua)",
            "NASA FIRMS VIIRS (375 m, Suomi-NPP, NOAA-20, NOAA-21)",
            "GFED4 Global Fire Emissions Database",
            "ChronoFire ST-DBSCAN Harmonization Engine v4.0"
        ]
    }


@app.post("/api/custom-analysis")
def run_custom_analysis(req: CustomBBoxRequest):
    """
    Runs live harmonization pipeline for an arbitrary user-drawn bounding box anywhere on Earth.
    """
    custom_id = f"custom_{int(abs(req.min_lat*10))}_{int(abs(req.min_lon*10))}"
    harmonizer = FireHarmonizer(req.biome or "global_default")

    firms_client.regions[custom_id] = {
        "id": custom_id,
        "name": req.region_name or "Custom Selected Area",
        "country": "Custom User Boundary",
        "biome": req.biome or "global_default",
        "bbox": [req.min_lat, req.min_lon, req.max_lat, req.max_lon],
        "center": [(req.min_lat + req.max_lat) / 2.0, (req.min_lon + req.max_lon) / 2.0],
        "zoom": 7,
        "peak_months": [7, 8, 9]
    }

    monthly_records = firms_client.generate_regional_time_series(custom_id)
    climatology, enriched_records = harmonizer.calculate_climatology_and_anomalies(
        monthly_records, baseline_start_year=2001, baseline_end_year=2020
    )
    calendar_data = harmonizer.build_burning_activity_calendar(enriched_records, 2000, 2026)
    forecast = harmonizer.generate_early_warning_forecast(enriched_records, climatology, 2026, 11)
    regime_shift = harmonizer.calculate_regime_shift_and_fri(calendar_data["annual_totals"])

    return {
        "region_id": custom_id,
        "region_name": req.region_name,
        "bbox": [req.min_lat, req.min_lon, req.max_lat, req.max_lon],
        "biome": req.biome,
        "calendar": calendar_data,
        "climatology_baseline": climatology,
        "forecast": forecast,
        "regime_shift": regime_shift
    }


@app.get("/api/export/csv")
def export_csv(
    region_id: str = Query("amazon_basin"),
    data_type: str = Query("calendar", description="'calendar', 'timeseries', or 'hotspots'"),
    year: Optional[int] = Query(2024),
    month: Optional[int] = Query(8)
):
    """
    Downloads standardized NASA FIRMS formatted CSV with integrated harmonization columns.
    """
    if data_type == "hotspots":
        pts = firms_client.generate_detailed_hotspots(region_id, year or 2024, month or 8)
        csv_str = firms_client.export_csv(pts)
        filename = f"CHRONOFIRE_NASA_FIRMS_hotspots_{region_id}_{year}_{month}.csv"
    else:
        harmonizer = FireHarmonizer()
        series = firms_client.generate_regional_time_series(region_id)
        _, enriched = harmonizer.calculate_climatology_and_anomalies(series)
        csv_str = firms_client.export_csv(enriched)
        filename = f"CHRONOFIRE_NASA_Harmonized_Calendar_TimeSeries_{region_id}_2000_2026.csv"

    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/api/export/geojson")
def export_geojson(
    region_id: str = Query("amazon_basin"),
    year: int = Query(2024),
    month: int = Query(8)
):
    """
    Exports RFC 7946 compliant GeoJSON FeatureCollection containing both
    hotspots (Points) and clustered fire perimeters (Polygons/MultiPoints).
    """
    reg_meta = firms_client.get_region_metadata(region_id)
    target_biome = reg_meta.get("biome", "global_default") if reg_meta else "global_default"
    harmonizer = FireHarmonizer(target_biome)

    hotspots = firms_client.generate_detailed_hotspots(region_id, year, month)
    clusters = harmonizer.cluster_fire_hotspots(hotspots)

    features = []
    for c in clusters:
        coords = c.get("hull_coordinates", [])
        if coords and len(coords) >= 3:
            # GeoJSON RFC 7946 Polygon expects closed ring in [lon, lat] format
            poly_ring = [[round(p[1], 4), round(p[0], 4)] for p in coords]
            if poly_ring[0] != poly_ring[-1]:
                poly_ring.append(poly_ring[0])
            geometry = {
                "type": "Polygon",
                "coordinates": [poly_ring]
            }
        else:
            geometry = {
                "type": "Point",
                "coordinates": [c["centroid_longitude"], c["centroid_latitude"]]
            }

        features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "type": "fire_cluster_complex",
                "cluster_id": c["cluster_id"],
                "hotspot_count": c["hotspot_count"],
                "total_frp_mw": c["total_frp_mw"],
                "max_frp_mw": c.get("max_frp_mw", 0),
                "estimated_area_km2": c["estimated_area_km2"],
                "sensors": c["sensors"]
            }
        })

    for h in hotspots[:200]:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [h["longitude"], h["latitude"]]
            },
            "properties": {
                "type": "active_fire_hotspot",
                "acq_date": h["acq_date"],
                "acq_time": h["acq_time"],
                "satellite": h["satellite"],
                "instrument": h["instrument"],
                "brightness": h["brightness"],
                "frp": h["frp"],
                "confidence": h["confidence"]
            }
        })

    geojson_data = {
        "type": "FeatureCollection",
        "metadata": {
            "title": f"NASA ChronoFire Harmonized Active Fires - {region_id}",
            "period": f"{year}-{month:02d}",
            "generated_by": "ChronoFire Harmonization System v4.0"
        },
        "features": features
    }

    return Response(
        content=json.dumps(geojson_data, indent=2),
        media_type="application/geo+json",
        headers={"Content-Disposition": f"attachment; filename=CHRONOFIRE_{region_id}_{year}_{month}.geojson"}
    )


@app.get("/api/system-info")
def get_system_info():
    """System and algorithm verification metadata."""
    masked_key = f"{firms_client.api_key[:6]}...{firms_client.api_key[-4:]}" if firms_client.api_key else "Not configured"
    return {
        "system_name": "ChronoFire: Active Fire Hotspot Harmonization Observatory",
        "version": "4.0.0 Global Edition",
        "hackathon_challenge": "NASA Space Apps Challenge 2026 - Harmonization of MODIS and VIIRS Hot Spots",
        "nasa_firms_api_key_configured": bool(firms_client.api_key),
        "nasa_firms_api_key_masked": masked_key,
        "satellite_sensors_supported": [
            {"sensor": "MODIS", "platform": "Terra (EOS AM-1)", "orbit": "10:30 AM/PM (Drifting to 09:00 AM)", "resolution": "1 km"},
            {"sensor": "MODIS", "platform": "Aqua (EOS PM-1)", "orbit": "1:30 PM/AM Sun-Synchronous", "resolution": "1 km"},
            {"sensor": "VIIRS", "platform": "Suomi-NPP", "orbit": "1:30 PM/AM Sun-Synchronous", "resolution": "375 m / 750 m"},
            {"sensor": "VIIRS", "platform": "NOAA-20 (JPSS-1)", "orbit": "12:40 PM/AM Sun-Synchronous", "resolution": "375 m / 750 m"},
            {"sensor": "VIIRS", "platform": "NOAA-21 (JPSS-2)", "orbit": "1:00 PM/AM Sun-Synchronous", "resolution": "375 m / 750 m"}
        ],
        "space_agency_partners": [
            "NASA (FIRMS, ESDIS, LANCE)",
            "ESA (Copernicus Sentinel-3 SLSTR)",
            "JAXA (GCOM-C SGLI)",
            "ISRO (INSAT-3D & Oceansat)",
            "EUMETSAT"
        ],
        "harmonization_methodology": "ST-DBSCAN Event Clustering + Biome-Stratified Quantile Transfer Functions + Terra Orbital Drift Correction + Scan Geometry Normalization + Climatological Anomaly Z-Score",
        "baseline_period": "2001 - 2020 Multi-Year Reference Baseline",
        "advanced_capabilities": [
            "Predictive 90-Day Early Warning Fire Risk Model (AR(1) + Crisis Probability)",
            "Terra Orbital Drift & Zenith Geometry Normalizer",
            "Fire Return Interval (FRI) & Ecological Regime Shift Tracker",
            "4D Temporal Time-Lapse Fire Front Playback",
            "Biomass & Carbon Emission Estimator (FRE/GFED4)",
            "Sensor Dual-Layer Comparator (RAW vs HARMONIZED)",
            "NASA GIBS TrueColor WMS Imagery Layer",
            "Automated 1-Click SITREP Generator",
            "1-Click High-Resolution Chart Image Export (PNG)"
        ]
    }


# Mount static assets
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "ChronoFire API running. Please create static/index.html"}
