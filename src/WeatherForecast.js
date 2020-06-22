import React from "react";

export default function WeatherForecast() {
  return (
    <div className="row RowHeaderForecast">
      <h3 className="ForecastTitle">
        Forecast <span className="NextDays">Next Days</span>
      </h3>
      <div className="row RowDetailForecast mh-30"></div>
    </div>
  );
}
