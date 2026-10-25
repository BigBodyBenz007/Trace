import React from 'react';
import ReactDOM from 'react-dom/client';
import './appThemes.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import SharedLabelReviewPage from './components/SharedLabelReviewPage';
import { shouldLoadSyntheticLife } from "./development/syntheticMode";
import { registerTraceServiceWorker } from "./serviceWorkerRegistration";
import { shouldLoadNutritionPilot } from "./development/nutritionPilotMode";

let RootComponent = App;
if (shouldLoadSyntheticLife(process.env.NODE_ENV, window.location.search)) {
  RootComponent = require("./development/SyntheticLifeApp").default;
}
if (process.env.NODE_ENV === 'development'
  && shouldLoadNutritionPilot(process.env.NODE_ENV, window.location.hostname, window.location.search)) {
  RootComponent = require('./development/NutritionPilot').default;
}

if (new URLSearchParams(window.location.search).get('labelReview') === '1') RootComponent = SharedLabelReviewPage;

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
registerTraceServiceWorker();
