import React from "react";
import "./WeatherIcon.css";

export default function WeatherIcon(props) {
  const codeMapping = {
    "01d": "snoopyclearsky01.gif",
    "01n": "snoopyclearnight02.gif",
    "02d": "snoopyclearsky04.gif",
    "02n": "snoopyfewclouds02.jpg",
    "03d": "snoopyfewclouds03.jpg",
    "03n": "snoopyclearsky03.jpg",
    "04d": "snoopybrokenclouds01.gif",
    "04n": "snoopybrokenclouds02.gif",
    "09d": "snoopyrainy02.gif",
    "09n": "snoopyshowerrain01.gif",
    "10d": "snoopyrainy01.gif",
    "10n": "snoopyshowerrain02.gif",
    "11d": "snoopythunder02.gif",
    "11n": "snoopythunder01.jpg",
    "13d": "snoopysnow04.gif",
    "13n": "snoopysnow02.gif",
    "50d": "snoopymist02.gif",
    "50n": "snoopymist01.jpg",
  };

  return (
    <div className="SnoopyImages">
      <img
        src={require(`../src/images/${
          props.temp >= 37
            ? "snoopyhot01.jpg"
            : props.temp < 0
            ? "snoopyfrezzing01.jpg"
            : codeMapping[props.code]
        }`)}
        width="250"
        alt={props.descrip}
      />
    </div>
  );
}
