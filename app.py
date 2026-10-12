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

# Mount the static directory only if it exists locally (on Vercel, @vercel/static handles static files)
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

class SearchRequest(BaseModel):
    from_airport: str
    to_airport: str
    date: str
    adults: int = 1
    seat: str = "economy"
    max_stops: int | None = None  # None = any stops, 0 = non-stop, 1 = 1 stop max, etc.

@app.get("/")
def read_root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return {"message": "CrewFly Staff Travel API is running."}

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
            max_stops=req.max_stops,
        )
        res = get_flights(query)
        
        results = []
        for flight in res:
            legs = flight.flights
            if not legs:
                continue

            first_leg = legs[0]
            last_leg = legs[-1]
            stops_count = len(legs) - 1

            # Build detailed leg list & calculate layovers
            segments = []
            layovers = []
            total_duration = 0

            for i, leg in enumerate(legs):
                total_duration += leg.duration or 0
                segments.append({
                    "flight_number": leg.flight_number or "N/A",
                    "from_code": leg.from_airport.code,
                    "to_code": leg.to_airport.code,
                    "departure_time": f"{leg.departure.time[0]:02d}:{leg.departure.time[1]:02d}",
                    "arrival_time": f"{leg.arrival.time[0]:02d}:{leg.arrival.time[1]:02d}",
                    "duration": leg.duration or 0,
                    "equipment": leg.plane_type or "N/A",
                })

                if i < stops_count:
                    next_leg = legs[i + 1]
                    # Calculate layover duration in minutes
                    arr_min = leg.arrival.time[0] * 60 + leg.arrival.time[1]
                    dep_min = next_leg.departure.time[0] * 60 + next_leg.departure.time[1]
                    if dep_min < arr_min:  # overnight layover
                        dep_min += 24 * 60
                    layover_dur = dep_min - arr_min
                    layovers.append({
                        "airport": leg.to_airport.code,
                        "duration": layover_dur,
                    })

            # Layover airport codes list
            layover_codes = [lay["airport"] for lay in layovers]
            flight_numbers = [leg.flight_number for leg in legs if leg.flight_number]

            results.append({
                "airlines": flight.airlines,
                "flight_number": " / ".join(flight_numbers) if flight_numbers else "N/A",
                "price": flight.price,
                "stops": stops_count,
                "layovers": layovers,
                "layover_codes": layover_codes,
                "segments": segments,
                "from_code": first_leg.from_airport.code,
                "to_code": last_leg.to_airport.code,
                "departure_time": f"{first_leg.departure.time[0]:02d}:{first_leg.departure.time[1]:02d}",
                "arrival_time": f"{last_leg.arrival.time[0]:02d}:{last_leg.arrival.time[1]:02d}",
                "next_day": tuple(last_leg.arrival.date) != tuple(first_leg.departure.date),
                "duration": total_duration,
                "equipment": first_leg.plane_type or "N/A",
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
