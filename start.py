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
    print("  Web Server running at: http://127.0.0.1:8000")
    print("  API Docs available at: http://127.0.0.1:8000/docs")
    print("  Press Ctrl+C to terminate server.")
    print("=" * 70)

    uvicorn.run("backend.server:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
