import React from "react";
import "./WeatherTemperature.css";

export default function WeatherTemperature(props) {
  function ShowCelsius(event) {
    event.preventDefault();
    props.setUnits("C");
  }

  function ShowFahrenheiht(event) {
    event.preventDefault();
    props.setUnits("F");
  }

  return (
    <div>
      <h2>
        <span className="Temperature">
          {props.units === "C"
            ? `${props.temperature}˚C`
            : `${Math.round(props.temperature * (9 / 5) + 32)}˚F`}
        </span>
      </h2>
      <h5 className="ChangeMetric">
        <a
          href="/"
          className={props.units === "C" ? "active" : "inactive"}
          onClick={ShowCelsius}
        >
          ˚C
        </a>
        {" | "}
        <a
          href="/"
          className={props.units === "F" ? "active" : "inactive"}
          onClick={ShowFahrenheiht}
        >
          ˚F
        </a>
      </h5>
    </div>
  );
}
