"""
ChronoFire: NASA Active Fire Harmonization Observatory Launcher
--------------------------------------------------------------
Author: Senior AI & Remote Sensing Engineer (NASA Space Apps Challenge 2026)
"""

import sys
import os
import uvicorn

if __name__ == "__main__":
    print("=" * 70)
    print("  Starting ChronoFire: NASA Active Fire Harmonization Observatory")
    print("  Challenge: Harmonization of MODIS and VIIRS Hot Spots")
    print("  NASA Space Apps Challenge 2026")
    print("=" * 70)
    port = int(os.environ.get("PORT", 8000))
    host = "0.0.0.0"
    print(f"  Web Server running at: http://{host}:{port}")
    print(f"  API Docs available at: http://{host}:{port}/docs")
    print("  Press Ctrl+C to terminate server.")
    print("=" * 70)

    uvicorn.run("backend.server:app", host=host, port=port, reload=False, log_level="info")
