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
}: DataTableProps) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
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
          onRowClick={onRowClick}
          initialState={{
            pagination: {
              paginationModel: { pageSize },
            },
          }}
          pageSizeOptions={pageSizeOptions}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderBottom: `2px solid ${theme.palette.divider}`,
              fontWeight: 700,
            },
            "& .MuiDataGrid-cell": {
              py: 1.5,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiDataGrid-row": {
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.03),
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
              borderTop: `2px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
            },
            ...sx,
          }}
        />
      </Box>
    </Paper>
  );
};