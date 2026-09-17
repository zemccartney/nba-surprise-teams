// Shared by Node maintenance and Worker requests; no framework or asset imports.
const easternFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/New_York",
  year: "numeric",
});
export const getEasternYYYYMMDD = (date: Date): string => {
  const parts = easternFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((entry) => entry.type === type);
    if (!part) throw new Error(`Missing Eastern date part ${type}`);
    return part.value;
  };
  return `${value("year")}-${value("month")}-${value("day")}`;
};
export const getCurrentEasternYYYYMMDD = () => getEasternYYYYMMDD(new Date());
