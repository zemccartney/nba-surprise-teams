import { useEffect, useState } from "react";
import * as ReactUse from "react-use";

type ColorScheme = "dark" | "light";

// TODO Want to understand why localStorage hook not working as expected

export function useColorScheme(): ColorScheme {
  const prefersDarkTheme = ReactUse.useMedia(
    "(prefers-color-scheme: dark)",
    true,
  );
  const [theme, setTheme] = ReactUse.useLocalStorage<ColorScheme>(
    "theme",
    undefined,
    {
      raw: true,
    },
  );

  // TODO fire custom event from the color scheme toggle, listen here, update state?

  useEffect(() => {
    const themePref = localStorage.getItem("theme");
    if (themePref && ["dark", "light"].includes(themePref)) {
      setTheme(themePref as ColorScheme);
    }
  }, []);

  console.log({ prefersDarkTheme, theme });

  return theme || (prefersDarkTheme ? "dark" : "light");
}
