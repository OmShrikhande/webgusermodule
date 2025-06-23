import Constants from 'expo-constants';

// Production URL - use this for the deployed app
export const API_URL = 'https://webgusermodule.onrender.com';

// Development URL - uncomment this for local development
// const { debuggerHost } = Constants.expoConfig?.hostUri
//   ? { debuggerHost: Constants.expoConfig.hostUri }
//   : { debuggerHost: undefined };
// const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
// export const API_URL = `http://${localIP}:5000`;