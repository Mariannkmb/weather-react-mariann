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
        <button
          type="button"
          className="btn-sm btn-primary"
          aria-pressed="true"
          onClick={ShowCelsius}
        >
          ˚C
        </button>
        {"  "}
        <button
          type="button"
          className="btn-sm btn-primary"
          aria-pressed="true"
          onClick={ShowFahrenheiht}
        >
          ˚F
        </button>
      </h5>
    </div>
  );
}
