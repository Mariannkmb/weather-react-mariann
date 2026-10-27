import React, { useEffect, useRef, useState } from "react";
import { sceneFor, sceneLabel, startScene } from "./Soundscape";

// On/off button for the weather sounds. Starts off: browsers only allow sound
// after the visitor taps something, and it is the polite default anyway.
export default function SoundToggle(props) {
  const [on, setOn] = useState(false);
  const ctxRef = useRef(null);
  const stopRef = useRef(null);
  const onRef = useRef(false);
  const scene = sceneFor(props.weather);
  const windBucket = Math.round((props.weather.wind || 0) / 4);

  useEffect(() => {
    if (!on || !ctxRef.current) return undefined;
    stopRef.current = startScene(ctxRef.current, ctxRef.current.destination, props.weather);
    return () => {
      if (stopRef.current) stopRef.current();
      stopRef.current = null;
    };
    // restart only when the kind of weather really changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, scene, windBucket]);

  // pause the sound while the tab is hidden, to save battery
  useEffect(() => {
    function onVisibility() {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else if (on) ctx.resume();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [on]);

  function toggle() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!ctxRef.current) ctxRef.current = new AudioCtx();
    const ctx = ctxRef.current;
    if (!on) {
      ctx.resume();
    } else {
      // let the fade-out finish, then put the audio engine to sleep
      setTimeout(() => {
        if (!onRef.current && ctx.state === "running") ctx.suspend();
      }, 800);
    }
    onRef.current = !on;
    setOn(!on);
  }

  return (
    <button
      className={"btn btn-outline-light my-2 my-sm-0 btn-sound" + (on ? " active" : "")}
      type="button"
      id="btn-sound"
      aria-pressed={on}
      title={on ? `Sound: ${sceneLabel(props.weather)}` : "Play Snoopy's weather sounds"}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        {on ? (
          <path
            d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M16 9l5 6M21 9l-5 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
      </svg>
      <span className="sr-only">{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
