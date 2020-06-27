import React from "react";
import WeatherTemperature from "./WeatherTemperature";
import WeatherIcon from "./WeatherIcon";

export default function WeatherDetails(props) {
  return (
    <div className="row RowTodayForecast">
      <div className="col-5 DataCeld">
        <h2 className="City"> {props.data.city} </h2>
        <div className="TempCeld">
          <WeatherTemperature
            temperature={props.data.temperature}
            // setUnits={props.setUnits}
            // units={props.units}
          />
        </div>
        <div className="text-uppercase WeatherDescrip">
          {props.data.description}
        </div>
        <div className="Main">
          <ul>
            <li> Humidity: {props.data.humidity} % </li>
            <li> Wind : {Math.round(props.data.wind * 3.6)} km/hr </li>
          </ul>
        </div>
        <div className="row RowHeaderForecast">
          <h3 className="ForecastTitle">
            Forecast <span className="NextDays">Next Days</span>
          </h3>
        </div>
      </div>
      <div className="col-7 WeatherImageCeld">
        <WeatherIcon
          code={props.data.icon}
          descrip={props.data.description}
          temp={props.data.temperature}
        />
      </div>
    </div>
  );
}
