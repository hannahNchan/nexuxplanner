import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type {} from "@mui/x-data-grid/themeAugmentation";
import { supabase } from "../lib/supabase";

export type ThemeMode = "light" | "dark" | "solarized";

const THEME_MODES: ThemeMode[] = ["light", "dark", "solarized"];

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
  solarized: "Solarized",
};

const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === "string" && THEME_MODES.includes(value as ThemeMode);

type ThemeContextType = {
  mode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
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
    if (isThemeMode(saved)) {
      return saved;
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  };

  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [userId, setUserId] = useState<string | null>(null);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, unknown>>({});
  const [remotePreferencesLoaded, setRemotePreferencesLoaded] = useState(false);

  useEffect(() => {
    localStorage.setItem("theme-mode", mode);
  }, [mode]);

  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;

      if (!isMounted || !currentUser) {
        setRemotePreferencesLoaded(true);
        return;
      }

      setUserId(currentUser.id);

      const { data, error } = await supabase
        .from("user_profiles")
        .select("preferences")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error("Error cargando preferencias de tema:", error);
        setRemotePreferencesLoaded(true);
        return;
      }

      const preferences =
        data?.preferences && typeof data.preferences === "object"
          ? (data.preferences as Record<string, unknown>)
          : {};

      setProfilePreferences(preferences);

      if (isThemeMode(preferences.themeMode)) {
        setMode(preferences.themeMode);
      }

      setRemotePreferencesLoaded(true);
    };

    void loadPreferences();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);
      if (!nextUserId) {
        setProfilePreferences({});
        setRemotePreferencesLoaded(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId || !remotePreferencesLoaded) return;

    const nextPreferences = {
      ...profilePreferences,
      themeMode: mode,
    };

    setProfilePreferences(nextPreferences);

    void supabase
      .from("user_profiles")
      .update({
        preferences: nextPreferences,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .then(({ error }) => {
        if (error) {
          console.error("Error guardando preferencias de tema:", error);
        }
      });
  }, [mode, remotePreferencesLoaded, userId]);

  const toggleTheme = () => {
    setMode((prev) => {
      const currentIndex = THEME_MODES.indexOf(prev);
      return THEME_MODES[(currentIndex + 1) % THEME_MODES.length];
    });
  };

  const theme = useMemo(() => {
    const isDark = mode === "dark";
    const isSolarized = mode === "solarized";
    const solarized = {
      base03: "#002b36",
      base02: "#073642",
      base01: "#586e75",
      base00: "#657b83",
      base0: "#839496",
      base1: "#93a1a1",
      base2: "#eee8d5",
      base3: "#fdf6e3",
      yellow: "#b58900",
      orange: "#cb4b16",
      red: "#dc322f",
      magenta: "#d33682",
      violet: "#6c71c4",
      blue: "#268bd2",
      cyan: "#2aa198",
      green: "#859900",
    };
    const muiMode = isDark ? "dark" : "light";
    const surface = isDark ? "#172033" : isSolarized ? solarized.base2 : "#F8FAFC";
    const elevated = isDark ? "#1E293B" : isSolarized ? solarized.base3 : "#FBFCFE";
    const canvas = isDark ? "#0F172A" : isSolarized ? solarized.base3 : "#F3F6FA";
    const border = isDark
      ? "rgba(148, 163, 184, 0.22)"
      : isSolarized
        ? "rgba(101, 123, 131, 0.28)"
        : "rgba(15, 23, 42, 0.12)";
    const textPrimary = isDark ? "#E5E7EB" : isSolarized ? solarized.base01 : "#1F2937";
    const textSecondary = isDark ? "#AAB7CC" : isSolarized ? solarized.base00 : "#5B6678";
    const controlBackground = isDark
      ? "rgba(15, 23, 42, 0.55)"
      : isSolarized
        ? solarized.base3
        : "#FBFCFE";
    const mutedBackground = isDark ? "#111827" : isSolarized ? solarized.base2 : "#EEF3F8";

    return createTheme({
      palette: {
        mode: muiMode,
        primary: {
          main: isDark ? "#60A5FA" : isSolarized ? solarized.blue : "#2563EB",
          light: isDark ? "#93C5FD" : isSolarized ? "#57a4df" : "#60A5FA",
          dark: isDark ? "#1D4ED8" : isSolarized ? "#1c6ea7" : "#1E40AF",
          contrastText: "#F8FAFC",
        },
        secondary: {
          main: isDark ? "#A78BFA" : isSolarized ? solarized.violet : "#7C3AED",
          light: isDark ? "#C4B5FD" : isSolarized ? "#8589d3" : "#A78BFA",
          dark: isDark ? "#6D28D9" : isSolarized ? "#4f55ad" : "#5B21B6",
          contrastText: "#F8FAFC",
        },
        success: {
          main: isDark ? "#4ADE80" : isSolarized ? solarized.green : "#16A34A",
          dark: isDark ? "#22C55E" : isSolarized ? "#657400" : "#15803D",
          contrastText: isDark ? "#052E16" : "#F8FAFC",
        },
        warning: {
          main: isDark ? "#FBBF24" : isSolarized ? solarized.orange : "#D97706",
          dark: isDark ? "#F59E0B" : isSolarized ? "#9E3B12" : "#92400E",
          contrastText: isDark ? "#422006" : "#FFFBEB",
        },
        error: {
          main: isDark ? "#F87171" : isSolarized ? solarized.red : "#DC2626",
          dark: isDark ? "#EF4444" : isSolarized ? "#A72624" : "#991B1B",
          contrastText: "#FEF2F2",
        },
        background: {
          default: canvas,
          paper: elevated,
        },
        text: {
          primary: textPrimary,
          secondary: textSecondary,
          disabled: isDark
            ? "rgba(203, 213, 225, 0.45)"
            : isSolarized
              ? "rgba(88, 110, 117, 0.52)"
              : "rgba(71, 85, 105, 0.5)",
        },
        divider: border,
        action: {
          hover: isDark
            ? "rgba(96, 165, 250, 0.12)"
            : isSolarized
              ? "rgba(38, 139, 210, 0.1)"
              : "rgba(37, 99, 235, 0.08)",
          selected: isDark
            ? "rgba(96, 165, 250, 0.18)"
            : isSolarized
              ? "rgba(38, 139, 210, 0.16)"
              : "rgba(37, 99, 235, 0.12)",
          disabledBackground: isDark
            ? "rgba(148, 163, 184, 0.12)"
            : isSolarized
              ? "rgba(101, 123, 131, 0.12)"
              : "rgba(148, 163, 184, 0.18)",
        },
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
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
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
        MuiCssBaseline: {
          styleOverrides: {
            html: {
              backgroundColor: canvas,
            },
            body: {
              backgroundColor: canvas,
              color: textPrimary,
            },
            "#root": {
              minHeight: "100vh",
              backgroundColor: canvas,
            },
            "::selection": {
              backgroundColor: isDark
                ? "rgba(96, 165, 250, 0.35)"
                : isSolarized
                  ? "rgba(38, 139, 210, 0.24)"
                  : "rgba(37, 99, 235, 0.22)",
            },
            ".ql-toolbar": {
              backgroundColor: mutedBackground,
              borderColor: border,
            },
            ".ql-container, .ql-editor": {
              backgroundColor: elevated,
              borderColor: border,
              color: textPrimary,
            },
            ".ql-picker-options": {
              backgroundColor: elevated,
              borderColor: border,
            },
            ".ql-stroke": {
              stroke: textSecondary,
            },
            ".ql-fill": {
              fill: textSecondary,
            },
            ".ql-picker-label": {
              color: textSecondary,
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundImage: "none",
              backgroundColor: isDark ? "#1D4ED8" : isSolarized ? solarized.base02 : "#2276D2",
              color: "#F8FAFC",
              borderBottom: `1px solid ${border}`,
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundImage: "none",
              backgroundColor: surface,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: "none",
              backgroundColor: elevated,
              borderColor: border,
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: "none",
              borderRadius: 8,
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              backgroundImage: "none",
              backgroundColor: elevated,
            },
          },
        },
        MuiDialogTitle: {
          styleOverrides: {
            root: {
              backgroundColor: elevated,
              color: textPrimary,
            },
          },
        },
        MuiDialogContent: {
          styleOverrides: {
            root: {
              backgroundColor: elevated,
              color: textPrimary,
            },
          },
        },
        MuiDialogActions: {
          styleOverrides: {
            root: {
              backgroundColor: elevated,
              color: textPrimary,
            },
          },
        },
        MuiTabs: {
          styleOverrides: {
            indicator: {
              height: 3,
              borderRadius: 999,
            },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              color: textSecondary,
              "&.Mui-selected": {
                color: isDark ? "#93C5FD" : isSolarized ? solarized.blue : "#2563EB",
              },
            },
          },
        },
        MuiInputLabel: {
          styleOverrides: {
            root: {
              color: textSecondary,
              "&.Mui-focused": {
                color: isDark ? "#93C5FD" : isSolarized ? solarized.blue : "#2563EB",
              },
            },
          },
        },
        MuiFormLabel: {
          styleOverrides: {
            root: {
              color: textSecondary,
            },
          },
        },
        MuiFormHelperText: {
          styleOverrides: {
            root: {
              color: textSecondary,
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              backgroundColor: controlBackground,
              color: textPrimary,
              "& fieldset": {
                borderColor: border,
              },
              "&:hover fieldset": {
                borderColor: isDark
                  ? "rgba(147, 197, 253, 0.75)"
                  : isSolarized
                    ? "rgba(38, 139, 210, 0.55)"
                    : "rgba(37, 99, 235, 0.5)",
              },
              "&.Mui-focused fieldset": {
                borderColor: isDark ? "#93C5FD" : isSolarized ? solarized.blue : "#2563EB",
              },
            },
            input: {
              color: textPrimary,
            },
            notchedOutline: {
              borderColor: border,
            },
          },
        },
        MuiSelect: {
          styleOverrides: {
            select: {
              backgroundColor: controlBackground,
              color: textPrimary,
            },
            icon: {
              color: textSecondary,
            },
          },
        },
        MuiMenu: {
          styleOverrides: {
            paper: {
              backgroundImage: "none",
              backgroundColor: elevated,
              border: `1px solid ${border}`,
            },
          },
        },
        MuiPopover: {
          styleOverrides: {
            paper: {
              backgroundImage: "none",
              backgroundColor: elevated,
              color: textPrimary,
              border: `1px solid ${border}`,
            },
          },
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              color: textPrimary,
              "&:hover": {
                backgroundColor: isDark
                  ? "rgba(96, 165, 250, 0.12)"
                  : isSolarized
                    ? "rgba(38, 139, 210, 0.1)"
                    : "rgba(37, 99, 235, 0.08)",
              },
              "&.Mui-selected": {
                backgroundColor: isDark
                  ? "rgba(96, 165, 250, 0.18)"
                  : isSolarized
                    ? "rgba(38, 139, 210, 0.16)"
                    : "rgba(37, 99, 235, 0.12)",
              },
            },
          },
        },
        MuiList: {
          styleOverrides: {
            root: {
              backgroundColor: "transparent",
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              fontWeight: 600,
            },
          },
        },
        MuiDataGrid: {
          styleOverrides: {
            root: {
              backgroundColor: elevated,
              color: textPrimary,
              borderColor: border,
            },
            columnHeaders: {
              backgroundColor: mutedBackground,
              borderBottomColor: border,
            },
            cell: {
              borderBottomColor: border,
            },
            row: {
              "&:hover": {
                backgroundColor: isDark
                  ? "rgba(96, 165, 250, 0.1)"
                  : isSolarized
                    ? "rgba(38, 139, 210, 0.08)"
                    : "rgba(37, 99, 235, 0.06)",
              },
            },
            footerContainer: {
              borderTopColor: border,
              backgroundColor: mutedBackground,
            },
          },
        },
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setThemeMode: setMode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
