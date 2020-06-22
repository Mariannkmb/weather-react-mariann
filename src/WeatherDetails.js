import React from "react";

export default function WeatherDetails(props) {
  return (
    <div className="row RowTodayForecast">
      <div className="col-5">
        <h2 className="City"> {props.city} </h2>
        <p className="Main">Precipitation: Humidity % Wind : Wind km/hr</p>
      </div>
      <div className="col-2 TempCeld">
        <p>
          <h2>
            <span className="Temperature">20</span>
            <span className="Metric">˚C</span>
          </h2>
          <h5 className="change-metric">
            <a href="/" id="celcius" className="active">
              ˚C
            </a>
            |
            <a href="/" id="fahrenheit">
              ˚F
            </a>
          </h5>
        </p>
      </div>
      <div className="col-5 WeatherImageCeld">
        <img
          src="https://ssl.gstatic.com/onebox/weather/64/cloudy.png"
          alt=""
          id="weather-icon"
        />
        <p className="WeatherDescrip">Cloudy</p>
      </div>
    </div>
  );
}
