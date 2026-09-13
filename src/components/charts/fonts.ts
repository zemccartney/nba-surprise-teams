// Font availability must not be a prerequisite for a working chart.
export const waitForChartFonts = async (
  fonts: Pick<FontFaceSet, "load">,
  family: string,
  timeoutMs = 1500,
) => {
  const load = async () => {
    try {
      await Promise.all([
        fonts.load(`16px ${family}`),
        fonts.load(`bold 16px ${family}`),
      ]);
    } catch {
      // Offline/blocked fonts or an unavailable API: use fallback metrics.
    }
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      load(),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
