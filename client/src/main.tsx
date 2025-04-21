import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add Google Material Icons
const link = document.createElement("link");
link.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
link.rel = "stylesheet";
document.head.appendChild(link);

// Add Inter and Roboto fonts
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// Add title
const title = document.createElement("title");
title.textContent = "Newslettr - Podcast-Style Newsletter App";
document.head.appendChild(title);

// Add CSS for audio progress bar
const style = document.createElement("style");
style.textContent = `
  .audio-progress::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: hsl(var(--primary));
    border-radius: 50%;
    cursor: pointer;
  }
  .audio-progress::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: hsl(var(--primary));
    border-radius: 50%;
    cursor: pointer;
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(<App />);
