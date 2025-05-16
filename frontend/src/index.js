import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import App from './App';
import './styles/index.css';
import config from './config';

// Configure Amplify with values from config
Amplify.configure({
  Auth: {
    region: config.region,
    userPoolId: config.userPoolId,
    userPoolWebClientId: config.userPoolClientId,
    mandatorySignIn: true,
  },
  Storage: {
    AWSS3: {
      bucket: config.mediaBucket,
      region: config.region
    }
  },
  // Only configure API if it's enabled and endpoint is available
  ...(config.features.apiEnabled && config.apiEndpoint ? {
    API: {
      endpoints: [
        {
          name: 'blogApi',
          endpoint: config.apiEndpoint,
          region: config.region
        }
      ]
    }
  } : {})
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
