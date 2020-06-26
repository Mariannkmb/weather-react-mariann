import React, { useState } from "react";
import axios from "axios";
import Weather from "./Weather";
import WeatherForecastItems from "./WeatherForecastItems";

export default function WeatherForecast(props) {
  const [submit, setSubmit] = useState(false);
  const [handle, setHandle] = useState(null);
  const [newCity, setNewCity] = useState(null);

  function handleForecast(response) {
    let forecast = null;
    let varDate = response.data.list[0].dt_txt.substring(0, 10);
    let varTempMax = response.data.list[0].main.temp_max;
    let varTempMin = response.data.list[0].main.temp_min;
    let dayForecast = [];
    setNewCity(response.data.city.name);

    for (var index = 0; index < 40; index++) {
      forecast = response.data.list[index];
      if (varDate === forecast.dt_txt.substring(0, 10)) {
        if (varTempMax < forecast.main.temp_max) {
          varTempMax = forecast.main.temp_max;
        }
        if (varTempMin > forecast.main.temp_min) {
          varTempMin = forecast.main.temp_min;
        }
      } else {
        dayForecast.push({
          date: response.data.list[index].dt_txt.substring(0, 10),
          tempmax: varTempMax,
          tempmin: varTempMin,
          icon: response.data.list[index].weather[0].icon,
          description: response.data.list[index].weather[0].description,
        });
        varDate = forecast.dt_txt.substring(0, 10);
        varTempMax = forecast.main.temp_max;
        varTempMin = forecast.main.temp_min;
      }
    }
    setHandle(dayForecast);
    setSubmit(true);
  }

  if (submit && props.city === newCity) {
    return (
      <div className="RowDetailForecast row mh-30">
        {handle.map(function (items) {
          return <WeatherForecastItems forecast={items} />;
        })}
      </div>
    );
  } else {
    let apiKey = "b5de5ed43000236f70d3412957f9f340";
    let url = `https://api.openweathermap.org/data/2.5/forecast?q=${props.city}&appid=${apiKey}&units=metric`;

    axios.get(url).then(handleForecast);
    return null;
  }
}
