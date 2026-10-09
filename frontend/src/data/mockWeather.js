export const mockWeather = {
  current: {
    temperature: 28,
    condition: "Partly Cloudy",
    humidity: 68,
    rainfall: 2,
    wind: 12
  },
  forecast: [
    { day: "MON", temp: 28, condition: "Cloudy" },
    { day: "TUE", temp: 26, condition: "Rain" },
    { day: "WED", temp: 24, condition: "Rain" },
    { day: "THU", temp: 27, condition: "Sunny" },
    { day: "FRI", temp: 29, condition: "Sunny" },
  ],
  impact: "Rain expected tomorrow. Consider reducing watering for outdoor plants."
};
