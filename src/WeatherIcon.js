import React from "react";
import "./WeatherIcon.css";

export default function WeatherIcon(props) {
  const codeMapping = {
    "01d": "snoopyclearsky01.jpg",
    "01n": "snoopyclearnight02.gif",
    "02d": "snoopyclearsky04.gif",
    "02n": "snoopyfewclouds02.jpg",
    "03d": "snoopyfewclouds03.jpg",
    "03n": "snoopyclearsky03.jpg",
    "04d": "snoopybrokenclouds01.jpg",
    "04n": "snoopybrokenclouds02.jpg",
    "09d": "snoopyraint01.jpg",
    "09n": "snoopyshowerrain01.gif",
    "10d": "snoopyrainy02.gif",
    "10n": "snoopyshowerrain02.gif",
    "11d": "snoopythunder02.jpg",
    "11n": "snoopythunder01.jpg",
    "13d": "snoopysnow04.gif",
    "13n": "snoopysnow02.gif",
    "50d": "snoopymist02.jpg",
    "50n": "snoopymist01.jpg",
  };

  return (
    <div className="SnoopyImages">
      <img
        src={require(`../src/images/${
          props.temp >= 35
            ? "snoppyhot01.jpg"
            : props.temp < 5
            ? "snoppyfrezzing01.jpg"
            : codeMapping[props.code]
        }`)}
        width="200"
        alt={props.descrip}
      />
      <div class="text-uppercase">{props.descrip}</div>
    </div>
  );
}
