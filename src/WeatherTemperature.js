import React, { useState } from "react";
import "./WeatherTemperature.css";

export default function WeatherTemperature(props) {
  const [units, setUnits] = useState("C");

  function ShowFahrenheiht(event) {
    event.preventDefault();
    setUnits("F");
  }
  function ShowCelsius(event) {
    event.preventDefault();
    setUnits("C");
  }

  return (
    <div>
      <h2>
        <span className="Temperature">
          {units === "C"
            ? `${props.temperature}˚C`
            : `${Math.round(props.temperature * (9 / 5) + 32)}˚F`}
        </span>
      </h2>
      <h5 className="ChangeMetric">
        <a href="/" id="celcius" className="active" onClick={ShowCelsius}>
          ˚C
        </a>
        |
        <a href="/" id="fahrenheit" onClick={ShowFahrenheiht}>
          ˚F
        </a>
      </h5>
    </div>
  );
}
