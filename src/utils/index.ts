export function convertSecondsToHHMMSS(durationInSeconds: number) {
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = Math.floor(durationInSeconds % 60);

  // Pad with leading zeros if necessary
  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

export function isValidHHMMSSFormat(timeString: string) {
  // Regex to match MM:SS format, where MM and SS are two digits each
  const timeRegex = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/;
  return timeRegex.test(timeString);
}
export function convertMMSSToSeconds(timeString: string) {
  if (!isValidHHMMSSFormat(timeString)) {
    throw new Error("Invalid time format. Expected MM:SS format.");
  }

  const [hours, minutes, seconds] = timeString.split(":").map(Number);
  return hours * 60 * 60 + minutes * 60 + seconds;
}
export function isValidUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
}
export interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function predictSubtitleBox(
  videoWidth: number,
  videoHeight: number
): Dimensions {
  const paddingBottom = Math.round(videoHeight * 0.05); // 5% padding from bottom
  const boxHeight = Math.round(videoHeight * 0.1); // Subtitle height ~10% of video height
  const boxWidth = Math.round(videoWidth * 0.8); // Subtitle width ~80% of video width
  const x = Math.round((videoWidth - boxWidth) / 2); // Centered horizontally
  const y = videoHeight - boxHeight - paddingBottom; // Positioned above padding

  return { x, y, width: boxWidth, height: boxHeight };
}
