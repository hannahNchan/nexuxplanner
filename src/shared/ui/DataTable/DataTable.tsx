import { Box, Paper } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { alpha, useTheme } from "@mui/material/styles";
import type { DataTableProps } from "./types";

export const DataTable = ({
  rows,
  columns,
  loading = false,
  height = 600,
  pageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  sx,
  containerSx,
  onRowClick,
  checkboxSelection = false,
  disableRowSelectionOnClick = true,
  disableColumnMenu,
  slots,
  slotProps,
  initialState,
}: DataTableProps) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 1,
        overflow: "hidden",
        border: `1px solid ${theme.palette.divider}`,
        ...containerSx,
      }}
    >
      <Box sx={{ height, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          checkboxSelection={checkboxSelection}
          disableRowSelectionOnClick={disableRowSelectionOnClick}
          disableColumnMenu={disableColumnMenu}
          onRowClick={onRowClick}
          slots={slots}
          slotProps={slotProps}
          initialState={{
            ...initialState,
            pagination: {
              ...initialState?.pagination,
              paginationModel: initialState?.pagination?.paginationModel ?? { pageSize },
            },
          }}
          pageSizeOptions={pageSizeOptions}
          rowHeight={52}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: alpha(theme.palette.text.primary, 0.03),
              borderBottom: `1px solid ${theme.palette.divider}`,
              fontWeight: 700,
            },
            "& .MuiDataGrid-cell": {
              py: 0.75,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiDataGrid-row": {
              transition: "background-color 0.16s ease",
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                cursor: "pointer",
              },
            },
            "& .MuiDataGrid-cell:focus": {
              outline: "none",
            },
            "& .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
            },
            ...sx,
          }}
        />
      </Box>
    </Paper>
  );
};
