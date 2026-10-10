import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fast_flights import FlightQuery, Passengers, create_query, get_flights

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

@app.post("/api/search")
def search_flights(req: SearchRequest):
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
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)
