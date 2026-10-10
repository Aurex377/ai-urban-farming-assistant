"""
Weather Service Module — Phase 3
--------------------------------
Provides hyperlocal current weather observations and multi-day forecasts.
Uses Open-Meteo (open-source, no API key required) with deterministic fallback
for offline/resilient environments.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("growwise.weather")

# Default urban farming coordinates (fallback: e.g. London / temperate urban default or user profile)
DEFAULT_LATITUDE = float(os.getenv("DEFAULT_LATITUDE", "51.5074"))
DEFAULT_LONGITUDE = float(os.getenv("DEFAULT_LONGITUDE", "-0.1278"))
DEFAULT_CITY = os.getenv("DEFAULT_CITY", "Urban Garden Station")


# Weather Code Mapping (WMO Code -> Description and Icon Type)
WMO_WEATHER_MAP = {
    0: ("Clear Sky", "Sunny", "clear"),
    1: ("Mainly Clear", "Mostly Sunny", "partly_cloudy"),
    2: ("Partly Cloudy", "Partly Cloudy", "partly_cloudy"),
    3: ("Overcast", "Cloudy", "cloudy"),
    45: ("Foggy", "Fog", "fog"),
    48: ("Depositing Rime Fog", "Fog", "fog"),
    51: ("Light Drizzle", "Drizzle", "rain"),
    53: ("Moderate Drizzle", "Drizzle", "rain"),
    55: ("Dense Drizzle", "Heavy Drizzle", "rain"),
    61: ("Slight Rain", "Light Rain", "rain"),
    63: ("Moderate Rain", "Rain", "rain"),
    65: ("Heavy Rain", "Heavy Rain", "heavy_rain"),
    71: ("Slight Snow", "Light Snow", "snow"),
    73: ("Moderate Snow", "Snow", "snow"),
    75: ("Heavy Snow", "Heavy Snow", "snow"),
    80: ("Slight Rain Showers", "Showers", "rain"),
    81: ("Moderate Rain Showers", "Showers", "rain"),
    82: ("Violent Rain Showers", "Heavy Showers", "heavy_rain"),
    95: ("Thunderstorm", "Thunderstorm", "thunderstorm"),
}


def _get_fallback_weather(city_name: Optional[str] = None) -> Dict[str, Any]:
    """Deterministic, realistic fallback data when network or external API is unavailable."""
    return {
        "city": city_name or DEFAULT_CITY,
        "latitude": DEFAULT_LATITUDE,
        "longitude": DEFAULT_LONGITUDE,
        "current": {
            "temperature": 24.5,
            "humidity": 62.0,
            "rainfall_mm": 0.0,
            "rainfall": 0.0,
            "wind_speed": 9.5,
            "wind": 9.5,
            "weather_condition": "Partly Cloudy",
            "condition": "Partly Cloudy",
            "condition_type": "partly_cloudy",
            "feels_like": 25.5,
            "uv_index": 5.2,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "source": "deterministic_fallback"
        },
        "forecast": [
            {"day": "Today", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "temp_max": 25.0, "temp_min": 16.0, "condition": "Partly Cloudy", "rainfall_mm": 0.0, "rain_chance": 10},
            {"day": "Tomorrow", "date": "", "temp_max": 27.0, "temp_min": 17.5, "condition": "Sunny", "rainfall_mm": 0.0, "rain_chance": 5},
            {"day": "Day 3", "date": "", "temp_max": 23.0, "temp_min": 15.0, "condition": "Light Rain", "rainfall_mm": 4.5, "rain_chance": 75},
            {"day": "Day 4", "date": "", "temp_max": 22.0, "temp_min": 14.5, "condition": "Showers", "rainfall_mm": 2.0, "rain_chance": 60},
            {"day": "Day 5", "date": "", "temp_max": 24.0, "temp_min": 15.5, "condition": "Partly Cloudy", "rainfall_mm": 0.0, "rain_chance": 20},
        ],
        "garden_impact": {
            "summary": "Mild temperatures and low rainfall favor steady watering. Watch for rain on Day 3.",
            "evaporation_rate": "moderate",
            "frost_risk": False,
            "heat_stress_risk": False
        }
    }


_generate_fallback_weather = _get_fallback_weather


async def fetch_weather_data(latitude: Optional[float] = None, longitude: Optional[float] = None, location_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetches real-time weather and 5-day daily forecast via Open-Meteo.
    Gracefully falls back to deterministic telemetry if unreachable.
    """
    lat = latitude if latitude is not None else DEFAULT_LATITUDE
    lon = longitude if longitude is not None else DEFAULT_LONGITUDE
    city = location_name or DEFAULT_CITY

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code"
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max"
        "&timezone=auto"
    )

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                current_raw = data.get("current", {})
                wcode = current_raw.get("weather_code", 0)
                desc, cond_label, cond_type = WMO_WEATHER_MAP.get(wcode, ("Partly Cloudy", "Partly Cloudy", "partly_cloudy"))

                temp = float(current_raw.get("temperature_2m", 24.0))
                humidity = float(current_raw.get("relative_humidity_2m", 60.0))
                rainfall = float(current_raw.get("precipitation", 0.0))
                wind = float(current_raw.get("wind_speed_10m", 10.0))

                daily_raw = data.get("daily", {})
                dates = daily_raw.get("time", [])
                max_temps = daily_raw.get("temperature_2m_max", [])
                min_temps = daily_raw.get("temperature_2m_min", [])
                precip_sums = daily_raw.get("precipitation_sum", [])
                precip_probs = daily_raw.get("precipitation_probability_max", [])
                wcodes = daily_raw.get("weather_code", [])

                forecast_days: List[Dict[str, Any]] = []
                day_names = ["Today", "Tomorrow", "Wed", "Thu", "Fri", "Sat", "Sun"]
                for i in range(min(5, len(dates))):
                    d_code = wcodes[i] if i < len(wcodes) else 0
                    _, d_cond, _ = WMO_WEATHER_MAP.get(d_code, ("Partly Cloudy", "Partly Cloudy", "partly_cloudy"))
                    forecast_days.append({
                        "day": day_names[i] if i < len(day_names) else f"Day {i+1}",
                        "date": dates[i],
                        "temp_max": float(max_temps[i]) if i < len(max_temps) else temp,
                        "temp_min": float(min_temps[i]) if i < len(min_temps) else temp - 7,
                        "condition": d_cond,
                        "rainfall_mm": float(precip_sums[i]) if i < len(precip_sums) else 0.0,
                        "rain_chance": int(precip_probs[i]) if i < len(precip_probs) else 10,
                    })

                # Determine Garden Impact
                rain_upcoming = any(d.get("rainfall_mm", 0) >= 4.0 for d in forecast_days[:3])
                high_temp = any(d.get("temp_max", 0) >= 32.0 for d in forecast_days)
                low_temp = any(d.get("temp_min", 0) <= 5.0 for d in forecast_days)

                if rain_upcoming:
                    summary = "Significant rainfall expected in next 72 hours. Reduce outdoor watering."
                elif high_temp:
                    summary = "High temperatures expected. Plants in full sun require increased hydration."
                elif low_temp:
                    summary = "Cool nights ahead. Protect sensitive subtropical plants."
                else:
                    summary = "Stable temperate conditions ideal for urban vegetable and herb growth."

                return {
                    "city": city,
                    "latitude": lat,
                    "longitude": lon,
                    "current": {
                        "temperature": round(temp, 1),
                        "humidity": round(humidity, 1),
                        "rainfall_mm": round(rainfall, 1),
                        "rainfall": round(rainfall, 1),
                        "wind_speed": round(wind, 1),
                        "wind": round(wind, 1),
                        "weather_condition": cond_label,
                        "condition": cond_label,
                        "condition_type": cond_type,
                        "feels_like": round(temp + (1.0 if humidity > 60 else -1.0), 1),
                        "uv_index": 5.0,
                        "recorded_at": datetime.now(timezone.utc).isoformat(),
                        "source": "open-meteo"
                    },
                    "forecast": forecast_days,
                    "garden_impact": {
                        "summary": summary,
                        "evaporation_rate": "high" if temp > 28 else ("low" if temp < 18 else "moderate"),
                        "frost_risk": low_temp,
                        "heat_stress_risk": high_temp,
                    }
                }
    except Exception as exc:
        logger.warning(f"Live weather fetch failed, using fallback: {exc}")

    return _get_fallback_weather()
