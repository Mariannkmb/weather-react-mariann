import React from "react";
import Loader from "react-loader-spinner";

export default function LoaderSpinner() {
  return (
    <Loader
      type="Puff"
      color="#3382EA"
      height={200}
      width={200}
      timeout={3000}
      className="Loader"
    />
  );
}
