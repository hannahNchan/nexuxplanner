import { AvatarGroup, Box, Chip, Stack, Typography } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import type { GridColDef, GridRenderCellParams, GridRowParams } from "@mui/x-data-grid";
import { alpha, useTheme } from "@mui/material/styles";
import type { BoardState, Task } from "../../../../shared/types/board";
import UserAvatar from "../../../../shared/ui/UserAvatar";
import { getBoardViewTasks, getTaskDateRange } from "./boardViewTypes";

type BoardTaskTableViewProps = {
  data: BoardState;
  onTaskClick: (task: Task) => void;
};

type BoardTaskTableRow = {
  id: string;
  task: Task;
  displayId: string;
  title: string;
  subtitle: string;
  status: string;
  epic: string;
  start: string;
  end: string;
  storyPoints: number | null;
  assigneeId: string | null;
  assigneeLabel: string;
};

const parseStoryPoints = (value?: string) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const BoardTaskTableView = ({ data, onTaskClick }: BoardTaskTableViewProps) => {
  const theme = useTheme();
  const tasks = getBoardViewTasks(data);

  const rows: BoardTaskTableRow[] = tasks.map((task) => {
    const range = getTaskDateRange(task);

    return {
      id: task.id,
      task,
      displayId: task.task_id_display || "SIN-ID",
      title: task.title,
      subtitle: task.subtitle ?? "",
      status: task.columnTitle ?? "Sin estado",
      epic: task.epic_name || "Sin epica",
      start: range.start,
      end: range.end,
      storyPoints: parseStoryPoints(task.story_points),
      assigneeId: task.assignee_id ?? null,
      assigneeLabel: task.assignee_id ? "Asignado" : "Sin asignar",
    };
  });

  const columns: GridColDef<BoardTaskTableRow>[] = [
    {
      field: "displayId",
      headerName: "ID",
      width: 120,
      renderCell: (params: GridRenderCellParams<BoardTaskTableRow, string>) => (
        <Typography variant="caption" fontFamily="monospace" fontWeight={800} color="text.secondary">
          {params.value}
        </Typography>
      ),
    },
    {
      field: "title",
      headerName: "Tarea",
      minWidth: 320,
      flex: 1.4,
      renderCell: (params: GridRenderCellParams<BoardTaskTableRow, string>) => (
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={800} noWrap>
            {params.value}
          </Typography>
          {params.row.subtitle ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {params.row.subtitle}
            </Typography>
          ) : null}
        </Stack>
      ),
    },
    {
      field: "status",
      headerName: "Estado",
      width: 170,
      type: "singleSelect",
      valueOptions: [...new Set(rows.map((row) => row.status))],
    },
    {
      field: "epic",
      headerName: "Epica",
      width: 190,
      type: "singleSelect",
      valueOptions: [...new Set(rows.map((row) => row.epic))],
      renderCell: (params: GridRenderCellParams<BoardTaskTableRow, string>) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          sx={{ height: 22, maxWidth: 170, justifyContent: "flex-start" }}
        />
      ),
    },
    {
      field: "start",
      headerName: "Inicio",
      width: 130,
      type: "date",
      valueGetter: (value) => (value ? new Date(`${value}T00:00:00`) : null),
      valueFormatter: (value: Date | null) => value?.toISOString().slice(0, 10) ?? "",
    },
    {
      field: "end",
      headerName: "Fin",
      width: 130,
      type: "date",
      valueGetter: (value) => (value ? new Date(`${value}T00:00:00`) : null),
      valueFormatter: (value: Date | null) => value?.toISOString().slice(0, 10) ?? "",
    },
    {
      field: "storyPoints",
      headerName: "Puntos",
      width: 110,
      type: "number",
      align: "left",
      headerAlign: "left",
      valueFormatter: (value: number | null) => (value ? `${value} pts` : "-"),
    },
    {
      field: "assigneeLabel",
      headerName: "Responsable",
      width: 150,
      type: "singleSelect",
      valueOptions: ["Asignado", "Sin asignar"],
      renderCell: (params: GridRenderCellParams<BoardTaskTableRow, string>) => (
        <AvatarGroup max={2} sx={{ justifyContent: "flex-start" }}>
          {params.row.assigneeId ? <UserAvatar userId={params.row.assigneeId} size={28} showTooltip /> : null}
        </AvatarGroup>
      ),
    },
  ];

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        width: "100%",
        borderRadius: 1,
        overflow: "hidden",
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        disableColumnMenu={false}
        disableRowSelectionOnClick
        slots={{ toolbar: GridToolbar }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 250 },
          },
        }}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
          sorting: {
            sortModel: [{ field: "start", sort: "asc" }],
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        onRowClick={(params: GridRowParams<BoardTaskTableRow>) => onTaskClick(params.row.task)}
        sx={{
          height: "100%",
          border: "none",
          "& .MuiDataGrid-toolbarContainer": {
            gap: 1,
            p: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: "background.paper",
          },
          "& .MuiDataGrid-columnHeaders": {
            bgcolor: `${theme.palette.background.paper} !important`,
            borderBottom: `1px solid ${theme.palette.divider}`,
          },
          "& .MuiDataGrid-columnHeader": {
            bgcolor: `${theme.palette.background.paper} !important`,
          },
          "& .MuiDataGrid-row": {
            cursor: "pointer",
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.055),
            },
          },
          "& .MuiDataGrid-cell": {
            display: "flex",
            alignItems: "center",
          },
        }}
      />
    </Box>
  );
};

export default BoardTaskTableView;
