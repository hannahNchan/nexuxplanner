import {
  Box,
  Chip,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
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
  readOnly?: boolean;
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
    readOnly = false,
  } = params;

  const renderDateCell = (
    cellParams: GridRenderCellParams,
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
          disabled={readOnly}
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
                  borderRadius: 1,
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
      field: "epicId",
      headerName: "ID",
      width: 110,
      renderCell: (cellParams) => (
        <Typography
          variant="caption"
          sx={{
            fontFamily: "monospace",
            color: "text.secondary",
            fontWeight: 800,
          }}
        >
          {cellParams.value as string}
        </Typography>
      ),
    },
    {
      field: "color",
      headerName: "Color",
      width: 64,
      renderCell: (cellParams) => (
        <Tooltip title={readOnly ? "Solo lectura" : "Click para cambiar color"} placement="top">
          <Box
            sx={{
              cursor: readOnly ? "default" : "pointer",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
            onClick={(e) => {
              if (readOnly) return;
              e.stopPropagation();
              e.preventDefault();
              setEditingColor(cellParams.row.id as string);
              setColorMenuAnchor(e.currentTarget);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: 1,
                bgcolor: cellParams.value as string,
                border: `1px solid ${alpha(theme.palette.common.black, 0.14)}`,
                transition: "border-color 0.16s ease",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
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
      minWidth: 260,
      flex: 1,
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
                  borderRadius: 1,
                },
              }}
            />
          );
        }

        return (
          <Tooltip title={readOnly ? "Solo lectura" : "Click para editar"} placement="top">
            <Box
              sx={{
                cursor: readOnly ? "default" : "pointer",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1,
                borderRadius: 1,
                transition: "background-color 0.16s ease",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
              onClick={() => {
                if (!readOnly) {
                  setEditingName(cellParams.row.id as string);
                }
              }}
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
      width: 180,
      renderCell: (cellParams) => (
        <Tooltip title={readOnly ? "Solo lectura" : "Click para cambiar proyecto"} placement="top">
          <Box
            sx={{
              cursor: readOnly ? "default" : "pointer",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
            onClick={(e) => {
              if (readOnly) return;
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
                cursor: readOnly ? "default" : "pointer",
                transition: "background-color 0.16s ease, border-color 0.16s ease",
                "&:hover": {
                  borderColor: cellParams.row.project_id ? theme.palette.info.main : theme.palette.text.secondary,
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
      width: 150,
      renderCell: (cellParams) => {
        const phaseColor = (cellParams.row.phaseColor as string) || theme.palette.grey[400];

        return (
          <Tooltip title={readOnly ? "Solo lectura" : "Click para cambiar fase"} placement="top">
            <Box
              sx={{
                cursor: readOnly ? "default" : "pointer",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
              }}
              onClick={(e) => {
                if (readOnly) return;
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
                  cursor: readOnly ? "default" : "pointer",
                  transition: "filter 0.16s ease",
                  "&:hover": {
                    filter: "brightness(0.96)",
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
      width: 260,
      renderCell: (cellParams) => (
        <TaskListCell
          epicId={cellParams.row.id as string}
          tasks={cellParams.value as Array<{ id: string; title: string }>}
          onAddTask={(epicId) => {
            if (readOnly) return;
            setTaskSearchOpen(epicId);
            setTaskSearchText("");
          }}
          onRemoveTask={readOnly ? undefined : handleDisconnectTask}
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
      headerName: "Esfuerzo",
      width: 130,
      renderCell: (cellParams) => (
        <Tooltip title={readOnly ? "Solo lectura" : "Click para cambiar esfuerzo"} placement="top">
          <Box
            sx={{
              cursor: readOnly ? "default" : "pointer",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              px: 1.5,
              borderRadius: 1,
              transition: "background-color 0.16s ease",
              "&:hover": {
                bgcolor: alpha(theme.palette.warning.main, 0.08),
              },
            }}
            onClick={(e) => {
              if (readOnly) return;
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
      field: "actions",
      type: "actions",
      headerName: "Acciones",
      width: 90,
      getActions: (cellParams) => [
        <GridActionsCellItem
          key="delete"
          icon={
            <Tooltip title="Eliminar épica">
              <DeleteIcon />
            </Tooltip>
          }
          label="Eliminar"
          disabled={readOnly}
          onClick={() => handleDeleteEpic(cellParams.row.id as string)}
        />,
      ],
    },
  ];
};
