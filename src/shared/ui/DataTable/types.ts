import type { GridColDef, GridRowsProp, GridSlotProps } from "@mui/x-data-grid";
import type { SxProps, Theme } from "@mui/material/styles";

export interface DataTableProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  loading?: boolean;
  height?: number | string;
  pageSize?: number;
  pageSizeOptions?: number[];
  sx?: GridSlotProps;
  containerSx?: SxProps<Theme>;
  onRowClick?: (params: any) => void;
  checkboxSelection?: boolean;
  disableRowSelectionOnClick?: boolean;
}

export interface DataTableHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  containerSx?: SxProps<Theme>;
}

export interface DataTableToolbarProps {
  children: React.ReactNode;
  containerSx?: SxProps<Theme>;
}