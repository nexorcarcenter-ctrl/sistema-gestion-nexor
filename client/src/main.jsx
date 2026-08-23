import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import moment from "moment";
import "moment/locale/es";

// La app está en español; sin esto moment escribe los meses y días en inglés.
moment.locale("es");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
