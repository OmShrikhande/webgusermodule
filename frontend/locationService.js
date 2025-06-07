import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    // Send locations to your backend here if needed
    if (locations && locations.length > 0) {
      const latest = locations[0];
      // Example: send to backend
      // await fetch('https://your-backend/api/location', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ latitude: latest.coords.latitude, longitude: latest.coords.longitude }),
      // });
      console.log('Background location:', latest.coords);
    }
  }
});

export async function checkPermissions() {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return fg === 'granted' && bg === 'granted';
}

export async function startBackgroundLocationTracking() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 60000, // 1 minute
      distanceInterval: 50, // 50 meters
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Tracking',
        notificationBody: 'Location tracking is active.',
      },
    });
  }
}

export async function stopLocationTracking() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
