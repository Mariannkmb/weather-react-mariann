import React from "react";
import "./Weather.css";
import date from "date-and-time";
import WeatherDetails from "./WeatherDetails";
import WeatherForecast from "./WeatherForecast";

export default function Weather(props) {
  const now = new Date();
  const pattern = date.compile(" ddd, MMM DD YYYY");

  let headerForm = (
    <form className="form-inline search-box">
      <input
        className="form-control mr-sm-2"
        type="search"
        placeholder="Enter City"
        aria-label="Search"
        id="searchButton"
        autocomplete="off"
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

  return (
    <div className="WeatherAppWrapper">
      <h1 className="AppTitle">Weather</h1>
      <div className="row RowHeader">{headerForm}</div>
      <WeatherDetails city={props.defaultCity} />
      <WeatherForecast />
    </div>
  );
}
