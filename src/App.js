import React from "react";
import Weather from "./Weather";
import "./App.css";

function App() {
  return (
    <div className="App">
      <div className="container">
        <Weather defaultCity="Lima" />
        <footer>
          <small id="gitHubUrl">
            <a
              href="https://github.com/Mariannkmb/weather-react-mariann"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open-source code on Github
            </a>
            , by Mariann Montoya
          </small>
        </footer>
      </div>
    </div>
  );
}

export default App;
