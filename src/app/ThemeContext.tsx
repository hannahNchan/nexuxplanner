import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { alpha, createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type {} from "@mui/x-data-grid/themeAugmentation";
import { supabase } from "../lib/supabase";
import { logError } from "../shared/utils/errorHandling";
import { createNexusVisualTokens } from "./visualTokens";

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
        logError("theme.loadPreferences", error);
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
          logError("theme.savePreferences", error);
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
    const tokens = createNexusVisualTokens(mode);
    const { colors, density, radii, shadows, state } = tokens;
    const { semantic } = colors;

    return createTheme({
      palette: {
        mode: tokens.muiMode,
        primary: {
          main: semantic.primary.main,
          light: semantic.primary.light,
          dark: semantic.primary.dark,
          contrastText: semantic.primary.contrast,
        },
        secondary: {
          main: semantic.secondary.main,
          light: semantic.secondary.light,
          dark: semantic.secondary.dark,
          contrastText: semantic.secondary.contrast,
        },
        success: {
          main: semantic.success.main,
          dark: semantic.success.dark,
          contrastText: semantic.success.contrast,
        },
        warning: {
          main: semantic.warning.main,
          dark: semantic.warning.dark,
          contrastText: semantic.warning.contrast,
        },
        error: {
          main: semantic.danger.main,
          dark: semantic.danger.dark,
          contrastText: semantic.danger.contrast,
        },
        background: {
          default: colors.canvas,
          paper: colors.elevated,
        },
        text: {
          primary: colors.text.primary,
          secondary: colors.text.secondary,
          disabled: colors.text.disabled,
        },
        divider: colors.border,
        action: {
          active: colors.text.secondary,
          hover: state.hover,
          selected: state.selected,
          focus: state.focus,
          disabled: colors.text.disabled,
          disabledBackground: state.disabledBackground,
        },
      },
      shape: {
        borderRadius: radii.md,
      },
      typography: {
        fontFamily: "'Inter', sans-serif",
        h1: { fontWeight: 800, letterSpacing: 0 },
        h2: { fontWeight: 760, letterSpacing: 0 },
        h3: { fontWeight: 720, letterSpacing: 0 },
        h4: { fontWeight: 700, letterSpacing: 0 },
        h5: { fontWeight: 680, letterSpacing: 0 },
        h6: { fontWeight: 650, letterSpacing: 0 },
        subtitle1: { fontWeight: 600, letterSpacing: 0 },
        subtitle2: { fontWeight: 500, letterSpacing: 0 },
        body1: { fontWeight: 500, letterSpacing: 0 },
        body2: { fontWeight: 400, letterSpacing: 0 },
        button: { fontWeight: 650, letterSpacing: 0 },
        caption: { fontWeight: 500, letterSpacing: 0 },
        overline: { fontWeight: 600, letterSpacing: 0, textTransform: "uppercase" },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            html: {
              backgroundColor: colors.canvas,
              colorScheme: tokens.muiMode,
            },
            body: {
              backgroundColor: colors.canvas,
              color: colors.text.primary,
              fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
            },
            "#root": {
              minHeight: "100vh",
              backgroundColor: colors.canvas,
            },
            "::selection": {
              backgroundColor: state.selection,
            },
            ".ql-toolbar": {
              backgroundColor: colors.muted,
              borderColor: colors.border,
            },
            ".ql-container, .ql-editor": {
              backgroundColor: colors.elevated,
              borderColor: colors.border,
              color: colors.text.primary,
            },
            ".ql-picker-options": {
              backgroundColor: colors.elevated,
              borderColor: colors.border,
            },
            ".ql-stroke": {
              stroke: colors.text.secondary,
            },
            ".ql-fill": {
              fill: colors.text.secondary,
            },
            ".ql-picker-label": {
              color: colors.text.secondary,
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundImage: "none",
              backgroundColor: colors.topbar,
              color: mode === "light" ? colors.text.primary : colors.text.inverse,
              borderBottom: `1px solid ${colors.border}`,
              boxShadow: "none",
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundImage: "none",
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          },
        },
        MuiPaper: {
          defaultProps: {
            elevation: 0,
          },
          styleOverrides: {
            root: {
              backgroundImage: "none",
              backgroundColor: colors.elevated,
              borderColor: colors.border,
            },
            elevation1: {
              boxShadow: shadows.none,
            },
            elevation2: {
              boxShadow: shadows.soft,
            },
            elevation3: {
              boxShadow: shadows.soft,
            },
            rounded: {
              borderRadius: radii.md,
            },
          },
        },
        MuiButton: {
          defaultProps: {
            disableElevation: true,
          },
          styleOverrides: {
            root: {
              textTransform: "none",
              borderRadius: radii.md,
              fontWeight: 650,
              lineHeight: 1.35,
              paddingInline: 16,
              boxShadow: "none",
              "&:focus-visible": {
                boxShadow: shadows.focusRing,
              },
            },
            sizeSmall: {
              paddingBlock: 5,
              paddingInline: 10,
            },
            sizeMedium: {
              paddingBlock: 7,
            },
            containedPrimary: {
              backgroundColor: semantic.primary.main,
              "&:hover": {
                backgroundColor: semantic.primary.dark,
                boxShadow: shadows.none,
              },
            },
            outlined: {
              borderColor: colors.border,
              "&:hover": {
                borderColor: alpha(semantic.primary.main, 0.5),
                backgroundColor: state.hover,
              },
            },
            text: {
              "&:hover": {
                backgroundColor: state.hover,
              },
            },
            startIcon: {
              marginRight: 6,
              "& > *:first-of-type": {
                fontSize: 18,
              },
            },
            endIcon: {
              marginLeft: 6,
              "& > *:first-of-type": {
                fontSize: 18,
              },
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              backgroundImage: "none",
              backgroundColor: colors.elevated,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              boxShadow: shadows.dialog,
            },
          },
        },
        MuiDialogTitle: {
          styleOverrides: {
            root: {
              backgroundColor: colors.elevated,
              color: colors.text.primary,
            },
          },
        },
        MuiDialogContent: {
          styleOverrides: {
            root: {
              backgroundColor: colors.elevated,
              color: colors.text.primary,
            },
          },
        },
        MuiDialogActions: {
          styleOverrides: {
            root: {
              backgroundColor: colors.elevated,
              color: colors.text.primary,
            },
          },
        },
        MuiTabs: {
          styleOverrides: {
            root: {
              minHeight: density.tabHeight,
            },
            indicator: {
              height: 3,
              borderRadius: radii.pill,
            },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              color: colors.text.secondary,
              fontWeight: 650,
              minHeight: density.tabHeight,
              letterSpacing: 0,
              "&:hover": {
                color: semantic.primary.main,
                backgroundColor: state.hover,
              },
              "&.Mui-selected": {
                color: semantic.primary.main,
              },
            },
          },
        },
        MuiInputLabel: {
          styleOverrides: {
            root: {
              color: colors.text.secondary,
              "&.Mui-focused": {
                color: semantic.primary.main,
              },
            },
          },
        },
        MuiFormLabel: {
          styleOverrides: {
            root: {
              color: colors.text.secondary,
            },
          },
        },
        MuiFormHelperText: {
          styleOverrides: {
            root: {
              color: colors.text.secondary,
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              backgroundColor: colors.control,
              color: colors.text.primary,
              borderRadius: radii.md,
              transition: "box-shadow 160ms ease, background-color 160ms ease",
              "& fieldset": {
                borderColor: colors.border,
              },
              "&:hover fieldset": {
                borderColor: alpha(semantic.primary.main, 0.55),
              },
              "&.Mui-focused": {
                boxShadow: shadows.focusRing,
                "& fieldset": {
                  borderColor: semantic.primary.main,
                  borderWidth: 1,
                },
              },
            },
            input: {
              color: colors.text.primary,
            },
            notchedOutline: {
              borderColor: colors.border,
            },
          },
        },
        MuiSelect: {
          styleOverrides: {
            select: {
              backgroundColor: colors.control,
              color: colors.text.primary,
            },
            icon: {
              color: colors.text.secondary,
            },
          },
        },
        MuiMenu: {
          styleOverrides: {
            paper: {
              backgroundImage: "none",
              backgroundColor: colors.menu,
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.soft,
              borderRadius: radii.md,
            },
          },
        },
        MuiPopover: {
          styleOverrides: {
            paper: {
              backgroundImage: "none",
              backgroundColor: colors.menu,
              color: colors.text.primary,
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.soft,
              borderRadius: radii.md,
            },
          },
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              color: colors.text.primary,
              borderRadius: radii.sm,
              marginInline: 4,
              "&:hover": {
                backgroundColor: state.hover,
              },
              "&.Mui-selected": {
                backgroundColor: state.selected,
                "&:hover": {
                  backgroundColor: state.hoverStrong,
                },
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
              borderRadius: radii.sm,
            },
            filled: {
              backgroundColor: state.selected,
              color: mode === "dark" ? semantic.primary.light : semantic.primary.dark,
            },
            outlined: {
              borderColor: colors.border,
            },
          },
        },
        MuiDataGrid: {
          defaultProps: {
            disableRowSelectionOnClick: true,
            disableColumnMenu: true,
            columnHeaderHeight: density.tableHeaderHeight,
          },
          styleOverrides: {
            root: {
              backgroundColor: colors.elevated,
              color: colors.text.primary,
              border: "none",
              borderRadius: radii.md,
              boxShadow: shadows.insetBorder,
              "--DataGrid-rowBorderColor": colors.borderSubtle,
            },
            columnHeaders: {
              backgroundColor: colors.muted,
              borderBottomColor: colors.borderSubtle,
              borderTopLeftRadius: radii.md,
              borderTopRightRadius: radii.md,
            },
            columnHeader: {
              "&:focus, &:focus-within": {
                outline: "none",
              },
            },
            columnHeaderTitle: {
              fontWeight: 700,
              color: colors.text.primary,
            },
            cell: {
              borderBottomColor: colors.borderSubtle,
              color: colors.text.secondary,
              "&:focus, &:focus-within": {
                outline: "none",
              },
            },
            row: {
              "&:hover": {
                backgroundColor: state.hover,
              },
              "&.Mui-selected": {
                backgroundColor: state.selected,
                "&:hover": {
                  backgroundColor: state.selectedStrong,
                },
              },
            },
            footerContainer: {
              borderTopColor: colors.borderSubtle,
              backgroundColor: colors.muted,
              borderBottomLeftRadius: radii.md,
              borderBottomRightRadius: radii.md,
            },
            columnSeparator: {
              display: "none",
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              backgroundColor: colors.tooltip,
              color: colors.text.inverse,
              borderRadius: radii.sm,
              fontWeight: 600,
            },
            arrow: {
              color: colors.tooltip,
            },
          },
        },
        MuiSwitch: {
          styleOverrides: {
            switchBase: {
              "&.Mui-checked": {
                color: colors.text.inverse,
                "& + .MuiSwitch-track": {
                  backgroundColor: semantic.primary.main,
                  opacity: 1,
                },
              },
            },
            track: {
              backgroundColor: colors.borderSubtle,
              opacity: 1,
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
