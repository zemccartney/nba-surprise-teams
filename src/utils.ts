/*
    Returns an ISO String representing the current time in the US Eastern timezone
    Useful for date comparisons given the NBA scheduling data is all relative to that timezone

    https://community.cloudflare.com/t/cf-worker-determine-time-of-day-timezone/179405
    https://cloudflareworkers.com/?&_ga=2.210309013.1661354319.1590399175-1e120377e5869563dd571ab6d3c69695#b2ce644441c28d716a5886203bf6fe76:https://tutorial.Cloudflareworkers.com
*/
export const getCurrentDateEastern = () => {
  const d = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  // Coerce the date string with correct timezone back into a date
  return new Date(d).toISOString();
};
