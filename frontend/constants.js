import Constants from 'expo-constants';
const { debuggerHost } = Constants.expoConfig?.hostUri
  ? { debuggerHost: Constants.expoConfig.hostUri }
  : { debuggerHost: undefined };
const localIP = debuggerHost ? debuggerHost.split(':').shift() : 'localhost';
export const API_URL = `http://${localIP}:5000`;