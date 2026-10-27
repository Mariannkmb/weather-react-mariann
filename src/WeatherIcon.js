import React from "react";
import { sceneFor } from "./Soundscape";

// One picture per scene. sceneFor() picks the scene (holidays, very hot,
// freezing, strong wind, then the weather icon), the same rule the sounds use.
const pictures = {
  "01d": "snoopyclearsky01.gif",
  "01n": "snoopyclearnight02.gif",
  "02d": "snoopyclearsky04.gif",
  "02n": "snoopynight-doghouse.gif",
  "03d": "snoopyfewclouds03.gif",
  "03n": "snoopybigmoon.webp",
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
  hot: "snoopyhot02.gif",
  freezing: "snoopyfreezing02.gif",
  wind: "snoopywindy.gif",
  christmas: "snoopychristmas.gif",
  newyear: "snoopynewyear.webp",
};

export default function WeatherIcon(props) {
  const scene = sceneFor({ icon: props.code, temp: props.temp, wind: props.wind, scene: props.scene });
  return (
    <img
      src={require(`../src/images/${pictures[scene]}`)}
      className="mx-auto my-auto SnoopyIcons"
      alt={props.descrip}
    />
  );
}
