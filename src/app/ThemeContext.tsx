import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

type ThemeMode = "light" | "dark";

type ThemeContextType = {
  mode: ThemeMode;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode debe usarse dentro de ThemeProvider");
  }
  return context;
};

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const getInitialMode = (): ThemeMode => {
    const saved = localStorage.getItem("theme-mode");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  };

  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  useEffect(() => {
    localStorage.setItem("theme-mode", mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode,
      },
      typography: {
        fontFamily: "Inter, sans-serif",
      h1: {
        fontWeight: 800,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 500,
      },
      h5: {
        fontWeight: 400,
      },
      h6: {
        fontWeight: 300,
      },
      button: {
        fontWeight: 500,
      },
      subtitle1: {
        fontWeight: 500,
      },
      subtitle2: {
        fontWeight: 400,
      },
      body1: {
        fontWeight: 500,
      },
      body2: {
        fontWeight: 400,
      },
      caption: {
        fontWeight: 400,
      },
      overline: {
        fontWeight: 200,
      },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: "none",
              borderRadius: 8,
            },
          },
        },
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};