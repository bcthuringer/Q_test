import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import App from './App';
import './styles/index.css';

// Configure Amplify
// Note: These values will be replaced with actual values after deployment
Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: 'USER_POOL_ID',
    userPoolWebClientId: 'USER_POOL_CLIENT_ID',
    mandatorySignIn: true,
  },
  API: {
    endpoints: [
      {
        name: 'blogApi',
        endpoint: 'API_ENDPOINT',
        region: 'us-east-1'
      }
    ]
  },
  Storage: {
    AWSS3: {
      bucket: 'MEDIA_BUCKET_NAME',
      region: 'us-east-1'
    }
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
