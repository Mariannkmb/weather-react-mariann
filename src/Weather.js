import React, { useState } from "react";
import axios from "axios";
import "./Weather.css";
import date from "date-and-time";
import WeatherDetails from "./WeatherDetails";
import WeatherForecast from "./WeatherForecast";
import LoaderSpinner from "./LoaderSpinner";
import SoundToggle from "./SoundToggle";
import { TEST_SCENES, testSceneLabel } from "./Soundscape";

export default function Weather(props) {
  const now = new Date();
  const pattern = date.compile(" ddd, MMM DD YYYY HH:mm");
  const [data, setData] = useState({ submit: false });
  const [city, setCity] = useState(props.defaultCity);
  const [units, setUnits] = useState("C");
  // Hidden test mode: ?scene=10n shows that picture and its sound for any city
  const [testScene, setTestScene] = useState(() => {
    const key = new URLSearchParams(window.location.search).get("scene");
    return TEST_SCENES.indexOf(key) >= 0 ? key : null;
  });
  let apiKey = "b5de5ed43000236f70d3412957f9f340";

  function getData(response) {
    setData({
      submit: true,
      temperature: Math.round(response.data.main.temp),
      humidity: response.data.main.humidity,
      feelslike: response.data.main.feels_like,
      description: response.data.weather[0].description,
      weatherId: response.data.weather[0].id,
      wind: response.data.wind.speed,
      icon: response.data.weather[0].icon,
      city: response.data.name,
      countryCode: response.data.sys.country,
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    searchCity();
  }

  function handleCity(event) {
    event.preventDefault();
    setCity(event.target.value);
  }

  function searchCity() {
    let apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    axios.get(apiUrl).then(getData);
  }

  function CurrentCity(event) {
    event.preventDefault();
    navigator.geolocation.getCurrentPosition(getLatitudeAndLongitude);
  }

  function getLatitudeAndLongitude(position) {
    let latitude = position.coords.latitude;
    let longitude = position.coords.longitude;
    let apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric`;
    axios.get(`${apiUrl}&appid=${apiKey}`).then(getData);
  }

  // what the picture and the sound use (the test mode can override it)
  let shown = data;
  if (data.submit && testScene) {
    const normalTemp = data.temperature >= 37 || data.temperature < 0 ? 15 : data.temperature;
    shown = {
      ...data,
      icon: testScene === "hot" || testScene === "freezing" ? data.icon : testScene,
      temperature: testScene === "hot" ? 38 : testScene === "freezing" ? -3 : normalTemp,
    };
  }

  function goToScene(step) {
    const i = TEST_SCENES.indexOf(testScene);
    const next = TEST_SCENES[(i + step + TEST_SCENES.length) % TEST_SCENES.length];
    setTestScene(next);
    window.history.replaceState(null, "", `?scene=${next}`);
  }

  let testBar = testScene ? (
    <div className="TestBar">
      <button type="button" onClick={() => goToScene(-1)} aria-label="Previous scene">
        ◀
      </button>
      <span>
        Test mode · <strong>{testScene}</strong> · {testSceneLabel(testScene)} ({TEST_SCENES.indexOf(testScene) + 1}/
        {TEST_SCENES.length})
      </span>
      <button type="button" onClick={() => goToScene(1)} aria-label="Next scene">
        ▶
      </button>
      <a href={window.location.pathname}>exit</a>
    </div>
  ) : null;

  let headerForm = (
    <form
      className="form-inline search-box SearchInput"
      onSubmit={handleSubmit}
    >
      <input
        className="form-control mr-sm-2"
        type="search"
        placeholder="Enter City"
        aria-label="Search"
        id="searchButton"
        autoComplete="off"
        onChange={handleCity}
      />
      <button
        className="btn btn-outline-light my-2 my-sm-0"
        type="submit"
        id="btn-search"
      >
        Search
      </button>
      <button
        className="btn btn-outline-light my-2 my-sm-0"
        type="button"
        id="btn-current"
        onClick={CurrentCity}
      >
        Current
      </button>
      {data.submit && (
        <SoundToggle
          weather={{
            id: data.weatherId,
            icon: shown.icon,
            wind: data.wind,
            temp: shown.temperature,
          }}
        />
      )}
      <div className="SetDate"> {date.format(now, pattern)}</div>
    </form>
  );

  if (data.submit) {
    return (
      <div className="WeatherAppWrapper">
        <h1 className="AppTitle">Snoopy Weather</h1>
        <div className="row RowHeader">{headerForm}</div>
        {testBar}
        <WeatherDetails data={shown} setUnits={setUnits} units={units} />
        <WeatherForecast city={data.city} units={units} />
      </div>
    );
  } else {
    searchCity();
    return <LoaderSpinner />;
  }
}
