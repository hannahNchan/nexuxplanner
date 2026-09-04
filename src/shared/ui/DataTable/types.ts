import type { DataGridProps, GridColDef, GridEventListener, GridRowsProp } from "@mui/x-data-grid";
import type { SxProps, Theme } from "@mui/material/styles";

export interface DataTableProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  loading?: boolean;
  height?: number | string;
  pageSize?: number;
  pageSizeOptions?: number[];
  sx?: SxProps<Theme>;
  containerSx?: SxProps<Theme>;
  onRowClick?: GridEventListener<"rowClick">;
  checkboxSelection?: boolean;
  disableRowSelectionOnClick?: boolean;
  disableColumnMenu?: boolean;
  slots?: DataGridProps["slots"];
  slotProps?: DataGridProps["slotProps"];
  initialState?: DataGridProps["initialState"];
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
