import React from "react";
import WeatherTemperature from "./WeatherTemperature";
import WeatherIcon from "./WeatherIcon";

export default function WeatherDetails(props) {
  return (
    <div className="row RowTodayForecast">
      <div className="col-md-5 DataCeld">
        <h2 className="City"> {props.data.city} </h2>
        <div className="TempCeld">
          <WeatherTemperature
            temperature={props.data.temperature}
            setUnits={props.setUnits}
            units={props.units}
          />
        </div>
        <div className="text-uppercase WeatherDescrip">
          {props.data.description}
        </div>
        <div className="Main">
          <ul class="list-unstyled">
            <li>
              Humidity:<strong>{props.data.humidity} %</strong>
            </li>
            <li>
              Wind:
              <strong>{Math.round(props.data.wind * 3.6)} km/hr </strong>
            </li>
            <li>
              Feels Like:
              <strong>
                {" "}
                {props.units === "C"
                  ? `${Math.round(props.data.feelslike)}˚C`
                  : `${Math.round(props.data.feelslike * (9 / 5) + 32)}˚F`}
              </strong>
            </li>
          </ul>
        </div>
      </div>
      <div className="col-md-7 WeatherImageCeld">
        <WeatherIcon
          code={props.data.icon}
          descrip={props.data.description}
          temp={props.data.temperature}
        />
      </div>
    </div>
  );
}
