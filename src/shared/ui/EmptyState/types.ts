import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { SxProps, Theme } from "@mui/material/styles";

export interface EmptyStateProps {
  icon: IconDefinition;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: IconDefinition;
  };
  iconSize?: "2x" | "3x" | "4x" | "5x" | "6x";
  containerSx?: SxProps<Theme>;
}