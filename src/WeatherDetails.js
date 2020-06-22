import React from "react";
import WeatherTemperature from "./WeatherTemperature";
import WeatherIcon from "./WeatherIcon";
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
        <WeatherTemperature temperature={props.data.temperature} />
      </div>
      <div className="col-5 WeatherImageCeld">
        <WeatherIcon code={props.data.icon} descrip={props.data.description} />
      </div>
    </div>
  );
}
