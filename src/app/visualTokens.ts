import { alpha } from "@mui/material/styles";

export type VisualThemeMode = "light" | "dark" | "solarized";

export const nexusRadii = {
  none: 0,
  xs: 3,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  pill: 999,
} as const;

export const nexusSpacing = {
  xxs: 0.5,
  xs: 1,
  sm: 1.5,
  md: 2,
  lg: 3,
  xl: 4,
  xxl: 6,
} as const;

export const nexusDensity = {
  topbarHeight: 58,
  navItemHeight: 42,
  tabHeight: 56,
  controlHeight: 40,
  controlHeightCompact: 34,
  tableHeaderHeight: 48,
  sidebar: {
    collapsed: 60,
    default: 280,
    max: 400,
  },
  pagePadding: {
    compact: 2,
    default: 4,
    spacious: 6,
  },
} as const;

const solarized = {
  base03: "#002b36",
  base02: "#073642",
  base01: "#586e75",
  base00: "#657b83",
  base2: "#eee8d5",
  base3: "#fdf6e3",
  orange: "#cb4b16",
  red: "#dc322f",
  violet: "#6c71c4",
  blue: "#268bd2",
  green: "#859900",
};

const nexusPalette = {
  neutral50: "#F7FAFC",
  neutral100: "#EBF2F5",
  neutral200: "#DBE6EB",
  neutral300: "#C3D3DB",
  neutral400: "#9CAEB8",
  neutral500: "#77878F",
  neutral600: "#4D595E",
  neutral700: "#262D30",
  neutral800: "#1B2124",
  neutral900: "#111417",
  blue50: "#EAF3FD",
  blue300: "#7DB1F5",
  blue400: "#589BF3",
  blue500: "#3385F0",
  blue600: "#2B71CC",
  blue800: "#1C4984",
  green500: "#099F69",
  orange500: "#F68D2A",
  red500: "#D02241",
  purple500: "#A641FA",
};

export const createNexusVisualTokens = (mode: VisualThemeMode) => {
  const isDark = mode === "dark";
  const isSolarized = mode === "solarized";
  const muiMode: "light" | "dark" = isDark ? "dark" : "light";
  const canvas = isDark ? nexusPalette.neutral900 : isSolarized ? solarized.base3 : nexusPalette.neutral50;
  const surface = isDark ? "#151A1E" : isSolarized ? solarized.base2 : "#FFFFFF";
  const elevated = isDark ? nexusPalette.neutral800 : isSolarized ? solarized.base3 : "#FFFFFF";
  const muted = isDark ? "#20282D" : isSolarized ? solarized.base2 : nexusPalette.neutral100;
  const menu = isDark ? "#171D21" : isSolarized ? solarized.base3 : "#FFFFFF";
  const control = isDark ? "#151A1E" : isSolarized ? solarized.base3 : "#FFFFFF";
  const border = isDark
    ? alpha(nexusPalette.neutral400, 0.18)
    : isSolarized
      ? alpha(solarized.base00, 0.28)
      : alpha(nexusPalette.neutral300, 0.85);
  const borderSubtle = isDark
    ? alpha(nexusPalette.neutral400, 0.12)
    : isSolarized
      ? alpha(solarized.base00, 0.18)
      : alpha(nexusPalette.neutral300, 0.55);
  const primary = isDark ? nexusPalette.blue300 : isSolarized ? solarized.blue : nexusPalette.blue500;
  const primaryLight = isDark ? nexusPalette.blue400 : isSolarized ? "#57a4df" : nexusPalette.blue300;
  const primaryDark = isDark ? nexusPalette.blue600 : isSolarized ? "#1c6ea7" : nexusPalette.blue600;
  const secondary = isDark ? "#C686FC" : isSolarized ? solarized.violet : nexusPalette.purple500;
  const textPrimary = isDark ? nexusPalette.neutral50 : isSolarized ? solarized.base01 : nexusPalette.neutral800;
  const textSecondary = isDark ? nexusPalette.neutral300 : isSolarized ? solarized.base00 : nexusPalette.neutral600;
  const textDisabled = isDark
    ? alpha(nexusPalette.neutral300, 0.48)
    : isSolarized
      ? alpha(solarized.base00, 0.52)
      : nexusPalette.neutral400;
  const shadowRgb = isDark ? "0, 0, 0" : "27, 33, 36";

  return {
    mode,
    muiMode,
    radii: nexusRadii,
    spacing: nexusSpacing,
    density: nexusDensity,
    colors: {
      canvas,
      surface,
      elevated,
      muted,
      menu,
      control,
      topbar: isDark ? "#141A1F" : isSolarized ? solarized.base02 : "#FFFFFF",
      border,
      borderSubtle,
      tooltip: isDark ? nexusPalette.neutral700 : nexusPalette.neutral800,
      text: {
        primary: textPrimary,
        secondary: textSecondary,
        disabled: textDisabled,
        inverse: "#FFFFFF",
      },
      semantic: {
        primary: {
          main: primary,
          light: primaryLight,
          dark: primaryDark,
          contrast: "#FFFFFF",
        },
        secondary: {
          main: secondary,
          light: isDark ? "#D6A8FD" : isSolarized ? "#8589d3" : "#C686FC",
          dark: isDark ? "#8D37D5" : isSolarized ? "#4f55ad" : "#742DAF",
          contrast: "#FFFFFF",
        },
        success: {
          main: isDark ? "#35B084" : isSolarized ? solarized.green : nexusPalette.green500,
          dark: isDark ? nexusPalette.green500 : isSolarized ? "#657400" : "#066F49",
          contrast: "#FFFFFF",
        },
        warning: {
          main: isDark ? "#F9B677" : isSolarized ? solarized.orange : nexusPalette.orange500,
          dark: isDark ? nexusPalette.orange500 : isSolarized ? "#9E3B12" : "#AC631D",
          contrast: isDark ? nexusPalette.neutral900 : "#FFFFFF",
        },
        danger: {
          main: isDark ? "#E17286" : isSolarized ? solarized.red : nexusPalette.red500,
          dark: isDark ? nexusPalette.red500 : isSolarized ? "#A72624" : "#91182D",
          contrast: "#FFFFFF",
        },
      },
    },
    state: {
      hover: alpha(primary, isDark ? 0.12 : 0.08),
      hoverStrong: alpha(primary, isDark ? 0.22 : 0.16),
      selected: alpha(primary, isDark ? 0.18 : 0.12),
      selectedStrong: alpha(primary, isDark ? 0.2 : 0.14),
      focus: alpha(primary, 0.18),
      focusRing: `0 0 0 3px ${alpha(primary, isDark ? 0.2 : 0.16)}`,
      disabledBackground: isDark ? alpha(nexusPalette.neutral400, 0.12) : nexusPalette.neutral200,
      selection: isDark ? alpha(primary, 0.35) : isSolarized ? alpha(primary, 0.24) : alpha(primary, 0.22),
    },
    shadows: {
      none: "none",
      soft: `0 1px 2px rgba(${shadowRgb}, ${isDark ? 0.26 : 0.06})`,
      raised: `0 2px 8px rgba(${shadowRgb}, ${isDark ? 0.32 : 0.1})`,
      dialog: `0 12px 36px rgba(${shadowRgb}, ${isDark ? 0.5 : 0.16})`,
      insetBorder: `inset 0 0 0 1px ${border}`,
      focusRing: `0 0 0 3px ${alpha(primary, isDark ? 0.2 : 0.16)}`,
    },
  } as const;
};

export type NexusVisualTokens = ReturnType<typeof createNexusVisualTokens>;
