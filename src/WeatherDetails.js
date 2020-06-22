import React from "react";

export default function WeatherDetails(props) {
  return (
    <div className="row RowTodayForecast">
      <div className="col-5 DataCeld">
        <h2 className="City"> {props.data.city} </h2>
        <div className="Main">
          <ul>
            <li> Precipitation: {props.data.humidity} % </li>
            <li> Wind : {props.data.wind} km/hr </li>
          </ul>
        </div>
      </div>
      <div className="col-2 TempCeld">
        <h2>
          <span className="Temperature">{props.data.temperature}</span>
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
      </div>
      <div className="col-5 WeatherImageCeld">
        <img src={props.data.icon} alt="" id="weather-icon" />
        <p className="WeatherDescrip">{props.data.description}</p>
      </div>
    </div>
  );
}
