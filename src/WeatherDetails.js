import React from "react";
import WeatherTemperature from "./WeatherTemperature";
import WeatherIcon from "./WeatherIcon";
export default function WeatherDetails(props) {
  return (
    <div className="row RowTodayForecast">
      <div className="col-4 DataCeld">
        <h2 className="City"> {props.data.city} </h2>
        <div className="Main">
          <ul>
            <li> Humidity: {props.data.humidity} % </li>
            <li> Wind : {Math.round(props.data.wind * 3.6)} km/hr </li>
          </ul>
        </div>
      </div>
      <div className="col-2 TempCeld">
        <WeatherTemperature temperature={props.data.temperature} />
      </div>
      <div className="col-6 WeatherImageCeld">
        <WeatherIcon
          code={props.data.icon}
          descrip={props.data.description}
          temp={props.data.temperature}
        />
      </div>
    </div>
  );
}
