import React from "react";
import "./WeatherForecastItems.css";

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
    var month = date.substring(6, 7) - 1;
    var day = date.substring(8, 10);
    return `${monthNames[month]} ${day}`;
  }

  function Temperatures(temp) {
    if (props.units === "F") {
      return `${Math.round(temp * (9 / 5) + 32)}˚F`;
    } else {
      return `${Math.round(temp)}˚C`;
    }
  }

  function Icon(icon, description) {
    return (
      <img
        src={require(`../src/images/forecast/${icon}.png`)}
        alt={description}
        className="Icons rounded-circle mx-auto d-block"
        width="40"
        height="40"
      />
    );
  }

  return (
    <div className="col ForecastItem">
      {Date(props.forecast.date)}
      {Icon(props.forecast.icon, props.forecast.description)}
      <div className="ForecastTemperatures">
        <span className="TempMaxForecast">
          {Temperatures(props.forecast.tempmax)}
        </span>
        <span className="TempMinForecast">
          {Temperatures(props.forecast.tempmin)}
        </span>
      </div>
    </div>
  );
}
