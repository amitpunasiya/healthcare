export const formatDuration = (mins?: number): string => {
  if (!mins || mins <= 0) return '';
  if (mins % 60 === 0) {
    const hours = mins / 60;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (mins > 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMins} min`;
  }
  return `${mins} mins`;
};
