# SkySearch (fast-flights Web UI)

SkySearch is a stunning, modern web application that provides a graphical user interface for the `fast-flights` Python library. It enables users to search for flights quickly and beautifully directly from their local browser without writing any code.

---

## 📑 Table of Contents

1. [Features](#features)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Installation & Setup](#installation--setup)
5. [Running the Application](#running-the-application)
6. [API Reference](#api-reference)
7. [Technologies Used](#technologies-used)

---

## ✨ Features

- **Modern UI:** Built with Vanilla CSS utilizing glassmorphism, animated background gradients, and sleek form elements.
- **Lightning Fast:** Uses `fast-flights` to fetch Google Flights data seamlessly.
- **Simple API Integration:** FastAPI backend seamlessly parses frontend requests and returns structured JSON responses.
- **Responsive Design:** Optimized for seamless usage across devices.

---

## 📂 Project Structure

```text
flights/
├── app.py                   # FastAPI backend application
├── example.py               # Basic CLI example for using fast-flights
├── pyproject.toml           # Python package configuration
├── requirements.txt         # Project dependencies
├── fast_flights/            # Core library source code
├── static/                  # Frontend assets
│   ├── index.html           # Main UI structure
│   ├── style.css            # Styling and animations (Vanilla CSS)
│   └── script.js            # Frontend logic and API calls
└── venv/                    # Python virtual environment
```

---

## 🛠️ Prerequisites

To run this project, you need:
- **Python 3.8+** installed on your machine.
- A terminal (PowerShell, Command Prompt, or bash).
- An active internet connection to fetch real-time flight data.

---

## 🚀 Installation & Setup

1. **Clone the Repository**
   Ensure you are in your project directory, then clone the source repository:
   ```powershell
   git clone https://github.com/AWeirdDev/flights
   cd flights
   ```

2. **Create and Activate a Virtual Environment**
   It's highly recommended to use a virtual environment to isolate dependencies:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
   *(For Mac/Linux use: `source venv/bin/activate`)*

3. **Install the Package in Editable Mode**
   Install the `fast-flights` package alongside its dependencies:
   ```powershell
   pip install -e .
   ```

4. **Install Web Application Dependencies**
   Install FastAPI and Uvicorn for the web server:
   ```powershell
   pip install fastapi uvicorn
   ```

---

## 🏃 Running the Application

### Starting the Web Server
Make sure your virtual environment is active, then run the Uvicorn server:
```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 8080
```

### Accessing the UI
Open your favorite web browser and navigate to:
**http://127.0.0.1:8080**

Enter your Origin, Destination, Date, Passenger Count, and Seat Class to fetch live flight data!

---

## 📡 API Reference

The backend exposes a simple REST endpoint used by the frontend to fetch flights.

### `POST /api/search`
Searches for available flights based on the specified criteria.

**Request Payload (JSON):**
```json
{
  "from_airport": "JFK",
  "to_airport": "LHR",
  "date": "2026-11-02",
  "adults": 1,
  "seat": "economy"
}
```

**Response Payload (Success):**
```json
{
  "success": true,
  "flights": [
    {
      "airlines": ["Delta", "Virgin Atlantic"],
      "price": 28801,
      "stops": 1,
      "departure_time": "15:55",
      "arrival_time": "07:20",
      "duration": 543
    }
  ]
}
```

**Response Payload (Error):**
```json
{
  "success": false,
  "error": "Detailed error message string"
}
```

---

## 💻 Technologies Used

### Backend
- **Python:** Core programming language.
- **FastAPI:** High-performance web framework for building APIs.
- **Uvicorn:** Lightning-fast ASGI server implementation.
- **fast-flights:** Core scraper/library connecting to flight data sources.

### Frontend
- **HTML5:** Page structure and semantic markup.
- **Vanilla CSS3:** Glassmorphism, animations, gradients, responsive layout.
- **Vanilla JavaScript (ES6+):** Async/Await fetch API requests, DOM manipulation.
- **Google Fonts (Outfit):** Modern typography.
