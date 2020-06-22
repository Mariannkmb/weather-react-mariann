import React from "react";
import Loader from "react-loader-spinner";

export default function LoaderSpinner() {
  return (
    <Loader
      type="Puff"
      color="#EC6E4C"
      height={100}
      width={100}
      timeout={3000}
      className="Loader"
    />
  );
}
