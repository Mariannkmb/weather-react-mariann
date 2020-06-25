import React from "react";

export default function WeatherForecastItems(props) {
  let monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  function Date(date) {
    let month = date.substring(6, 7) - 1;
    let day = date.substring(8, 10);
    return `${monthNames[month]} ${day}`;
  }

  function Temperatures(max, min) {
    return `${Math.round(max)}˚C | ${Math.round(min)}˚C `;
  }

  function Icon(icon, description) {
    return (
      <img
        src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
        alt={description}
      />
    );
  }

  return (
    <div className="col">
      {Date(props.forecast.date)}
      {Icon(props.forecast.icon, props.forecast.description)}
      {Temperatures(props.forecast.tempmax, props.forecast.tempmin)}
    </div>
  );
}
