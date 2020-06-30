import React from "react";
import WeatherTemperature from "./WeatherTemperature";
import WeatherIcon from "./WeatherIcon";

export default function WeatherDetails(props) {
  return (
    <div className="row RowTodayForecast">
      <div className="col-5 DataCeld mx-auto my-auto">
        <h2 className="City"> {props.data.city} </h2>
        <h2 className="Country">{props.data.countryCode}</h2>
        <div className="TempCeld">
          <WeatherTemperature
            temperature={props.data.temperature}
            setUnits={props.setUnits}
            units={props.units}
          />
        </div>
        <div className="Main">
          <ul className="list-unstyled">
            <li>
              Humidity:<strong> {props.data.humidity} %</strong>
            </li>
            <li>
              Wind:
              <strong> {Math.round(props.data.wind * 3.6)} km/hr </strong>
            </li>
          </ul>
        </div>
      </div>
      <div className="col-7">
        <div className="row WeatherImageCeld d-flex">
          <WeatherIcon
            code={props.data.icon}
            descrip={props.data.description}
            temp={props.data.temperature}
          />
        </div>
        <div className="row-sm">
          <div className="text-uppercase row WeatherDescrip">
            {props.data.description}
          </div>
        </div>
      </div>
    </div>
  );
}
