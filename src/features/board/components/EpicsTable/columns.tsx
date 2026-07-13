import {
  Box,
  Chip,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { GridActionsCellItem } from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FolderIcon from "@mui/icons-material/Folder";
import TaskListCell from "./TaskListCell";

const toDateString = (value: string | number | Date | Dayjs | null | undefined) => {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
};

type CreateColumnsParams = {
  theme: Theme;
  editingName: string | null;
  editingColor: string | null;
  editingPhase: string | null;
  editingEffort: string | null;
  editingProject: string | null;
  setEditingName: (id: string | null) => void;
  setEditingColor: (id: string | null) => void;
  setEditingPhase: (id: string | null) => void;
  setEditingEffort: (id: string | null) => void;
  setEditingProject: (id: string | null) => void;
  setColorMenuAnchor: (el: HTMLElement | null) => void;
  setPhaseMenuAnchor: (el: HTMLElement | null) => void;
  setEffortMenuAnchor: (el: HTMLElement | null) => void;
  setProjectMenuAnchor: (el: HTMLElement | null) => void;
  setTaskSearchOpen: (id: string | null) => void;
  setTaskSearchText: (text: string) => void;
  handleNameChange: (epicId: string, newName: string) => void;
  handleEpicDateChange: (epicId: string, field: "start_date" | "end_date", value: string | null) => void;
  handleDisconnectTask: (epicId: string, taskId: string) => void;
  handleDeleteEpic: (epicId: string) => void;
};

export const createEpicsTableColumns = (params: CreateColumnsParams): GridColDef[] => {
  const {
    theme,
    editingName,
    setEditingName,
    setEditingColor,
    setEditingPhase,
    setEditingEffort,
    setEditingProject,
    setColorMenuAnchor,
    setPhaseMenuAnchor,
    setEffortMenuAnchor,
    setProjectMenuAnchor,
    setTaskSearchOpen,
    setTaskSearchText,
    handleNameChange,
    handleEpicDateChange,
    handleDisconnectTask,
    handleDeleteEpic,
  } = params;

  const renderDateCell = (
    cellParams: any,
    field: "start_date" | "end_date",
    label: string
  ) => (
    <Box
      sx={{ width: "100%", display: "flex", alignItems: "center" }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          value={cellParams.value ? dayjs(cellParams.value as string) : null}
          onChange={(value) => {
            handleEpicDateChange(
              cellParams.row.id as string,
              field,
              value ? toDateString(value) : null
            );
          }}
          slotProps={{
            textField: {
              size: "small",
              placeholder: label,
              variant: "outlined",
              sx: {
                width: "100%",
                "& .MuiOutlinedInput-root": {
                  height: 34,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  "& fieldset": {
                    borderColor: alpha(theme.palette.primary.main, 0.18),
                  },
                  "&:hover fieldset": {
                    borderColor: alpha(theme.palette.primary.main, 0.45),
                  },
                },
                "& input": {
                  fontSize: 13,
                  fontWeight: 600,
                },
              },
            },
          }}
        />
      </LocalizationProvider>
    </Box>
  );

  return [
    {
      field: "color",
      headerName: "Color",
      width: 80,
      renderCell: (cellParams) => (
        <Tooltip title="Click para cambiar color" placement="top">
          <Box
            sx={{
              cursor: "pointer",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setEditingColor(cellParams.row.id as string);
              setColorMenuAnchor(e.currentTarget);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: cellParams.value as string,
                border: `2px solid ${alpha(theme.palette.common.black, 0.1)}`,
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "scale(1.15)",
                  boxShadow: `0 4px 12px ${alpha(cellParams.value as string, 0.4)}`,
                },
              }}
            />
          </Box>
        </Tooltip>
      ),
    },
    {
      field: "name",
      headerName: "Épica",
      width: 250,
      renderCell: (cellParams) => {
        const isEditing = editingName === cellParams.row.id;

        if (isEditing) {
          return (
            <TextField
              autoFocus
              fullWidth
              size="small"
              defaultValue={cellParams.value as string}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  handleNameChange(cellParams.row.id as string, e.target.value);
                }
                setEditingName(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                }
              }}
              sx={{
                my: -1,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />
          );
        }

        return (
          <Tooltip title="Click para editar" placement="top">
            <Box
              sx={{
                cursor: "pointer",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1,
                borderRadius: 1.5,
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  transform: "translateX(2px)",
                },
              }}
              onClick={() => setEditingName(cellParams.row.id as string)}
            >
              <EditIcon sx={{ fontSize: 16, color: "text.secondary", opacity: 0.6 }} />
              <Typography variant="body2" fontWeight={600}>
                {cellParams.value as string}
              </Typography>
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: "project",
      headerName: "Proyecto",
      width: 220,
      renderCell: (cellParams) => (
        <Tooltip title="Click para cambiar proyecto" placement="top">
          <Box
            sx={{
              cursor: "pointer",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
            onClick={(e) => {
              setEditingProject(cellParams.row.id as string);
              setProjectMenuAnchor(e.currentTarget);
            }}
          >
            <Chip
              label={cellParams.value as string}
              size="small"
              icon={<FolderIcon sx={{ fontSize: 16, color: "inherit !important" }} />}
              sx={{
                bgcolor: cellParams.row.project_id
                  ? alpha(theme.palette.info.main, 0.1)
                  : alpha(theme.palette.grey[500], 0.1),
                color: cellParams.row.project_id
                  ? theme.palette.info.dark
                  : theme.palette.text.secondary,
                border: `1px solid ${
                  cellParams.row.project_id
                    ? alpha(theme.palette.info.main, 0.3)
                    : alpha(theme.palette.grey[500], 0.2)
                }`,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: `0 4px 12px ${alpha(
                    cellParams.row.project_id ? theme.palette.info.main : theme.palette.grey[500],
                    0.3
                  )}`,
                },
              }}
            />
          </Box>
        </Tooltip>
      ),
    },
    {
      field: "phase",
      headerName: "Fase",
      width: 180,
      renderCell: (cellParams) => {
        const phaseColor = (cellParams.row.phaseColor as string) || theme.palette.grey[400];

        return (
          <Tooltip title="Click para cambiar fase" placement="top">
            <Box
              sx={{
                cursor: "pointer",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
              }}
              onClick={(e) => {
                setEditingPhase(cellParams.row.id as string);
                setPhaseMenuAnchor(e.currentTarget);
              }}
            >
              <Chip
                label={cellParams.value as string}
                size="small"
                sx={{
                  bgcolor: phaseColor,
                  color: theme.palette.getContrastText(phaseColor),
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: `0 4px 12px ${alpha(phaseColor, 0.3)}`,
                  },
                }}
                icon={<CheckCircleIcon sx={{ fontSize: 16, color: "inherit !important" }} />}
              />
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: "connectedTasks",
      headerName: "Tareas conectadas",
      width: 320,
      renderCell: (cellParams) => (
        <TaskListCell
          epicId={cellParams.row.id as string}
          tasks={cellParams.value as Array<{ id: string; title: string }>}
          onAddTask={(epicId) => {
            setTaskSearchOpen(epicId);
            setTaskSearchText("");
          }}
          onRemoveTask={handleDisconnectTask}
        />
      ),
    },
    {
      field: "startDate",
      headerName: "Inicio",
      width: 170,
      renderCell: (cellParams) => renderDateCell(cellParams, "start_date", "Sin inicio"),
    },
    {
      field: "endDate",
      headerName: "Fin",
      width: 170,
      renderCell: (cellParams) => renderDateCell(cellParams, "end_date", "Sin fin"),
    },
    {
      field: "estimatedEffort",
      headerName: "Esfuerzo estimado",
      width: 160,
      renderCell: (cellParams) => (
        <Tooltip title="Click para cambiar esfuerzo" placement="top">
          <Box
            sx={{
              cursor: "pointer",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              px: 1.5,
              borderRadius: 1.5,
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: alpha(theme.palette.warning.main, 0.08),
              },
            }}
            onClick={(e) => {
              setEditingEffort(cellParams.row.id as string);
              setEffortMenuAnchor(e.currentTarget);
            }}
          >
            <Typography
              variant="body2"
              fontWeight={cellParams.value ? 600 : 400}
              color={cellParams.value ? "warning.dark" : "text.secondary"}
            >
              {cellParams.value || "Sin estimar"}
            </Typography>
          </Box>
        </Tooltip>
      ),
    },
    {
      field: "epicId",
      headerName: "ID",
      width: 100,
      renderCell: (cellParams) => (
        <Chip
          label={cellParams.value as string}
          size="small"
          variant="outlined"
          sx={{
            borderColor: alpha(theme.palette.text.primary, 0.2),
            fontFamily: "monospace",
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Acciones",
      width: 80,
      getActions: (cellParams) => [
        <GridActionsCellItem
          key="delete"
          icon={
            <Tooltip title="Eliminar épica">
              <DeleteIcon />
            </Tooltip>
          }
          label="Eliminar"
          onClick={() => handleDeleteEpic(cellParams.row.id as string)}
        />,
      ],
    },
  ];
};
