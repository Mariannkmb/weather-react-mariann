import React, { useState } from "react";
import axios from "axios";
import "./Weather.css";
import date from "date-and-time";
import WeatherDetails from "./WeatherDetails";
import WeatherForecast from "./WeatherForecast";
import LoaderSpinner from "./LoaderSpinner";

export default function Weather(props) {
  const now = new Date();
  const pattern = date.compile(" ddd, MMM DD YYYY HH:mm");
  const [data, setData] = useState({ submit: false });
  const [city, setCity] = useState(props.defaultCity);
  //   const [units, setUnits] = useState("C");
  let apiKey = "b5de5ed43000236f70d3412957f9f340";

  function getData(response) {
    setData({
      submit: true,
      temperature: Math.round(response.data.main.temp),
      humidity: response.data.main.humidity,
      feelslike: response.data.main.feels_like,
      description: response.data.weather[0].description,
      wind: response.data.wind.speed,
      icon: response.data.weather[0].icon,
      city: response.data.name,
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
      <div className="SetDate mt-6"> {date.format(now, pattern)}</div>
    </form>
  );

  if (data.submit) {
    return (
      <div className="WeatherAppWrapper">
        <h1 className="AppTitle">Snoopy Weather</h1>
        <div className="row RowHeader">{headerForm}</div>
        <WeatherDetails
          data={data}
          // setUnits={setUnits}
        />
        <WeatherForecast
          city={data.city}
          // units={units}
        />
      </div>
    );
  } else {
    searchCity();
    return <LoaderSpinner />;
  }
}
