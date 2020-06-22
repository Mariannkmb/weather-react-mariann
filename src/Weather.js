import React, { useState } from "react";
import axios from "axios";
import "./Weather.css";
import date from "date-and-time";
import WeatherDetails from "./WeatherDetails";
import WeatherForecast from "./WeatherForecast";
import LoaderSpinner from "./LoaderSpinner";

export default function Weather(props) {
  const now = new Date();
  const pattern = date.compile(" ddd, MMM DD YYYY");
  const [data, setData] = useState({ submit: false });
  const [city, setCity] = useState(props.defaultCity);

  function getData(response) {
    setData({
      submit: true,
      temperature: Math.round(response.data.main.temp),
      humidity: response.data.main.humidity,
      description: response.data.weather[0].description,
      tempmax: Math.round(response.data.main.temp_max),
      tempmin: Math.round(response.data.main.temp_min),
      wind: response.data.wind.speed,
      icon: `http://openweathermap.org/img/wn/${response.data.weather[0].icon}@2x.png`,
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
    let apiKey = "b5de5ed43000236f70d3412957f9f340";
    let apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    axios.get(apiUrl).then(getData);
  }

  let headerForm = (
    <form className="form-inline search-box" onSubmit={handleSubmit}>
      <input
        className="form-control mr-sm-2"
        type="search"
        placeholder="Enter City"
        aria-label="Search"
        id="searchButton"
        autocomplete="off"
        onChange={handleCity}
      />
      <button
        className="btn btn-outline-secondary my-2 my-sm-0"
        type="submit"
        id="btn-search"
      >
        Search
      </button>
      <button
        className="btn btn-outline-light my-2 my-sm-0"
        type="button"
        id="btn-current"
      >
        Current
      </button>
      <p className="SetDate">
        <div className="SetDate mt-6"> {date.format(now, pattern)}</div>
      </p>
    </form>
  );

  if (data.submit) {
    return (
      <div className="WeatherAppWrapper">
        <h1 className="AppTitle">Weather</h1>
        <div className="row RowHeader">{headerForm}</div>
        <WeatherDetails data={data} />
        <WeatherForecast />
      </div>
    );
  } else {
    searchCity();
    return <LoaderSpinner />;
  }
}
