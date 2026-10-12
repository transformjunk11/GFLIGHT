import os
import sys
import traceback
import platform
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Attempt to import fast_flights; capture the error if it fails (e.g. primp on Vercel).
_import_error = None
try:
    from fast_flights import FlightQuery, Passengers, create_query, get_flights
except Exception as exc:
    _import_error = f"{type(exc).__name__}: {exc}"
    FlightQuery = Passengers = create_query = get_flights = None  # type: ignore

app = FastAPI()

# Pin the currency so the amounts Google returns always match the symbol shown in the UI.
CURRENCY = "INR"

# Mount the static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

class SearchRequest(BaseModel):
    from_airport: str
    to_airport: str
    date: str
    adults: int = 1
    seat: str = "economy"

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

@app.get("/api/health")
def health_check():
    """Diagnostic endpoint – hit /api/health to see what's going on."""
    return {
        "status": "ok" if _import_error is None else "degraded",
        "fast_flights_available": _import_error is None,
        "import_error": _import_error,
        "python_version": sys.version,
        "platform": platform.platform(),
    }

@app.post("/api/search")
def search_flights(req: SearchRequest):
    # Fail fast if the library couldn't load.
    if _import_error is not None:
        return {
            "success": False,
            "error": f"fast_flights failed to import: {_import_error}",
            "hint": "The primp library requires a full Linux environment. "
                    "Vercel serverless does not support it — deploy on Railway, Render, or Fly.io instead.",
        }

    try:
        query = create_query(
            flights=[
                FlightQuery(
                    date=req.date,
                    from_airport=req.from_airport,
                    to_airport=req.to_airport,
                ),
            ],
            seat=req.seat,
            trip="one-way",
            passengers=Passengers(adults=req.adults),
            currency=CURRENCY,
            max_stops=0,
        )
        res = get_flights(query)
        
        results = []
        for flight in res:
            # Non-stop only: a single leg means no connections.
            if len(flight.flights) != 1:
                continue
            leg = flight.flights[0]
            results.append({
                "airlines": flight.airlines,
                "flight_number": leg.flight_number,
                "price": flight.price,
                "stops": 0,
                "from_code": leg.from_airport.code,
                "to_code": leg.to_airport.code,
                "departure_time": f"{leg.departure.time[0]:02d}:{leg.departure.time[1]:02d}",
                "arrival_time": f"{leg.arrival.time[0]:02d}:{leg.arrival.time[1]:02d}",
                "next_day": tuple(leg.arrival.date) != tuple(leg.departure.date),
                "duration": leg.duration or 0,
                "equipment": leg.plane_type or "N/A",
            })
            
        return {"success": True, "currency": CURRENCY, "flights": results}
    except Exception as e:
        tb = traceback.format_exc()
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": tb,
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)
