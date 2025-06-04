
export const formatTime = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const paddedHours = String(hours).padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
};

export const parseDurationToSeconds = (durationStr: string): number => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) { // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) { // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) { // SS
    return parts[0];
  }
  return 0;
};

export const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
