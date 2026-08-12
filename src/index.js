import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { shouldLoadSyntheticLife } from "./development/syntheticMode";

let RootComponent = App;
if (shouldLoadSyntheticLife(process.env.NODE_ENV, window.location.search)) {
  RootComponent = require("./development/SyntheticLifeApp").default;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
