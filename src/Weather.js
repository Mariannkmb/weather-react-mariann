import React from "react";
import "./Weather.css";

export default function Weather(props) {
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
      <p className="SetDate">Date</p>
    </form>
  );

  return (
    <div className="WeatherAppWrapper">
      <h1 className="AppTitle">Weather</h1>
      <div className="row RowHeader">{headerForm}</div>

      <div className="row RowTodayForecast">
        <div className="col-5">
          <h2 className="City"> {props.defaultCity} </h2>
          <p className="Main">Precipitation: Humidity % Wind : Wind km/hr</p>
        </div>
        <div className="col-2 TempCeld">
          <p>
            <h2>
              <span className="Temperature">20</span>
              <span className="Metric">˚C</span>
            </h2>
            <h5 className="change-metric">
              <a href="/" id="celcius" className="active">
                ˚C
              </a>
              |
              <a href="/" id="fahrenheit">
                ˚F
              </a>
            </h5>
          </p>
        </div>
        <div className="col-5 WeatherImageCeld">
          <img
            src="https://ssl.gstatic.com/onebox/weather/64/cloudy.png"
            alt=""
            id="weather-icon"
          />
          <p className="WeatherDescrip">Cloudy</p>
        </div>
      </div>

      <div className="row RowHeaderForecast">
        <h3 className="ForecastTitle">Forecast</h3>
        <h6>Next Days</h6>
      </div>
      <div className="row RowDetailForecast mh-30"></div>
    </div>
  );
}
