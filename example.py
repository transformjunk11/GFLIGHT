from fast_flights import FlightQuery, Passengers, create_query, get_flights
from datetime import datetime, timedelta

def main():
    # Pick a date 30 days from now
    target_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    print(f"Searching for flights from JFK to LHR on {target_date}...")
    
    query = create_query(
        flights=[
            FlightQuery(
                date=target_date,
                from_airport="JFK",
                to_airport="LHR",
            ),
        ],
        seat="economy",
        trip="one-way",
        passengers=Passengers(adults=1)
    )

    # Fetch the flights
    res = get_flights(query)
    
    print("\n--- Search Results ---")
    if not res:
        print("No flights found.")
        return

    # Print the top 3 flights
    for idx, flight in enumerate(res[:3]):
        print(f"\nFlight {idx + 1}:")
        print(f"  Airlines: {', '.join(flight.airlines)}")
        print(f"  Price (approx): {flight.price}")
        if flight.flights:
            print(f"  Stops: {len(flight.flights) - 1}")
            equipments = [f.plane_type for f in flight.flights if f.plane_type]
            if equipments:
                print(f"  Equipment: {', '.join(equipments)}")

if __name__ == "__main__":
    main()
