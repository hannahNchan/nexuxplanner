import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRowsProp,
  GridActionsCellItem,
  type GridCellEditStopParams,
  type MuiEvent,
} from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  fetchEpics,
  fetchEpicPhases,
  createEpic,
  updateEpic,
  deleteEpic,
  connectTaskToEpic,
  disconnectTaskFromEpic,
  searchTasks,
  type EpicWithDetails,
  type EpicPhase,
} from "../../api/epicService";
import {
  fetchDefaultPointSystem,
  fetchPointValues,
  type PointValue,
} from "../../api/catalogService";

type EpicsTableProps = {
  userId: string;
};

const EpicsTable = ({ userId }: EpicsTableProps) => {
  const [epics, setEpics] = useState<EpicWithDetails[]>([]);
  const [phases, setPhases] = useState<EpicPhase[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [rows, setRows] = useState<GridRowsProp>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Menús
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [hideAnchor, setHideAnchor] = useState<HTMLElement | null>(null);

  // Estado de filtros
  const [filters, setFilters] = useState<{
    phases: string[];
    efforts: string[];
  }>({
    phases: [],
    efforts: [],
  });

  // Estado de ordenamiento
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Épicas ocultas
  const [hiddenEpics, setHiddenEpics] = useState<string[]>([]);

  // Autocomplete de tareas
  const [taskSearchOpen, setTaskSearchOpen] = useState<string | null>(null);
  const [taskOptions, setTaskOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [taskSearchText, setTaskSearchText] = useState("");

  // Estados para edición inline
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingEffort, setEditingEffort] = useState<string | null>(null);
  const [phaseMenuAnchor, setPhaseMenuAnchor] = useState<HTMLElement | null>(null);
  const [effortMenuAnchor, setEffortMenuAnchor] = useState<HTMLElement | null>(null);

  // Cargar datos iniciales
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [epicsData, phasesData, pointSystem] = await Promise.all([
        fetchEpics(userId),
        fetchEpicPhases(),
        fetchDefaultPointSystem(),
      ]);

      setEpics(epicsData);
      setPhases(phasesData);

      if (pointSystem) {
        const points = await fetchPointValues(pointSystem.id);
        setPointValues(points);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId]);

  // Procesar y filtrar épicas
  useEffect(() => {
    let processedEpics = epics.filter((epic) => !hiddenEpics.includes(epic.id));

    // Filtro de búsqueda
    if (searchText) {
      processedEpics = processedEpics.filter(
        (epic) =>
          epic.name.toLowerCase().includes(searchText.toLowerCase()) ||
          epic.epic_id_display?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtros de fase
    if (filters.phases.length > 0) {
      processedEpics = processedEpics.filter((epic) =>
        filters.phases.includes(epic.phase_id || "")
      );
    }

    // Filtros de esfuerzo
    if (filters.efforts.length > 0) {
      processedEpics = processedEpics.filter((epic) =>
        filters.efforts.includes(epic.estimated_effort || "")
      );
    }

    // Ordenamiento
    processedEpics.sort((a, b) => {
      let aValue: string = "";
      let bValue: string = "";

      switch (sortColumn) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "phase":
          aValue = a.phase_name || "";
          bValue = b.phase_name || "";
          break;
        case "effort":
          aValue = a.estimated_effort || "";
          bValue = b.estimated_effort || "";
          break;
        case "epicId":
          aValue = a.epic_id_display || "";
          bValue = b.epic_id_display || "";
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    const mappedRows = processedEpics.map((epic) => ({
      id: epic.id,
      name: epic.name,
      owner: "Usuario",
      phase_id: epic.phase_id,
      phase: epic.phase_name || "Sin fase",
      phaseColor: epic.phase_color,
      connectedTasks: epic.connected_tasks || [],
      estimatedEffort: epic.estimated_effort || "",
      epicId: epic.epic_id_display || "-",
    }));

    setRows(mappedRows);
  }, [epics, hiddenEpics, searchText, filters, sortColumn, sortOrder]);

  // Buscar tareas para autocomplete
  useEffect(() => {
    // Cargar tareas cuando se abre el diálogo O cuando cambia el texto de búsqueda
    if (taskSearchOpen !== null) {
      searchTasks(userId, taskSearchText).then(setTaskOptions);
    }
  }, [taskSearchText, taskSearchOpen, userId]);

  const handleAddEpic = async () => {
    try {
      await createEpic(userId, { name: "Nueva épica" });
      await loadData();
    } catch (error) {
      console.error("Error creando épica:", error);
    }
  };

  const handleNameChange = async (epicId: string, newName: string) => {
    try {
      await updateEpic(epicId, { name: newName });
      await loadData();
    } catch (error) {
      console.error("Error actualizando nombre:", error);
    }
  };

  const handlePhaseChange = async (epicId: string, phaseId: string) => {
    try {
      await updateEpic(epicId, { phase_id: phaseId || null });
      await loadData();
    } catch (error) {
      console.error("Error actualizando fase:", error);
    }
  };

  const handleEffortChange = async (epicId: string, effort: string) => {
    try {
      await updateEpic(epicId, { estimated_effort: effort || null });
      await loadData();
    } catch (error) {
      console.error("Error actualizando esfuerzo:", error);
    }
  };

  const handleConnectTask = async (epicId: string, taskId: string) => {
    try {
      await connectTaskToEpic(epicId, taskId);
      await loadData();
      // NO cerrar el diálogo - permitir seguir seleccionando
    } catch (error) {
      console.error("Error conectando tarea:", error);
    }
  };

  const handleDisconnectTask = async (epicId: string, taskId: string) => {
    try {
      await disconnectTaskFromEpic(epicId, taskId);
      await loadData();
    } catch (error) {
      console.error("Error desconectando tarea:", error);
    }
  };

  const handleDeleteEpic = async (epicId: string) => {
    if (!confirm("¿Eliminar esta épica?")) return;

    try {
      await deleteEpic(epicId);
      await loadData();
    } catch (error) {
      console.error("Error eliminando épica:", error);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Épica",
      width: 250,
      renderCell: (params) => {
        const isEditing = editingName === params.row.id;
        
        if (isEditing) {
          return (
            <TextField
              autoFocus
              fullWidth
              size="small"
              defaultValue={params.value as string}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  handleNameChange(params.row.id as string, e.target.value);
                }
                setEditingName(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if ((e.target as HTMLInputElement).value.trim()) {
                    handleNameChange(params.row.id as string, (e.target as HTMLInputElement).value);
                  }
                  setEditingName(null);
                } else if (e.key === "Escape") {
                  setEditingName(null);
                }
              }}
              sx={{ my: -1 }}
            />
          );
        }

        return (
          <Box
            sx={{
              cursor: "pointer",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
            onClick={() => setEditingName(params.row.id as string)}
          >
            <Typography variant="body2">{params.value as string}</Typography>
          </Box>
        );
      },
    },
    {
      field: "owner",
      headerName: "Propietario",
      width: 150,
    },
    {
      field: "phase",
      headerName: "Fase",
      width: 220,
      renderCell: (params) => (
        <Box
          sx={{
            cursor: "pointer",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
          }}
          onClick={(e) => {
            setEditingPhase(params.row.id as string);
            setPhaseMenuAnchor(e.currentTarget);
          }}
        >
          <Chip
            label={params.value as string}
            size="small"
            sx={{
              backgroundColor: (params.row.phaseColor as string) || "#ccc",
              color: "#fff",
              cursor: "pointer",
              "&:hover": {
                opacity: 0.8,
              },
            }}
          />
        </Box>
      ),
    },
    {
      field: "connectedTasks",
      headerName: "Tareas conectadas",
      width: 350,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" alignItems="center">
          {(params.value as Array<{ id: string; title: string }>).map((task) => (
            <Chip
              key={task.id}
              label={task.title}
              size="small"
              onDelete={() => handleDisconnectTask(params.row.id as string, task.id)}
              sx={{ m: 0.25 }}
            />
          ))}
          <IconButton
            size="small"
            onClick={() => {
              setTaskSearchOpen(params.row.id as string);
              setTaskSearchText("");
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
    {
      field: "estimatedEffort",
      headerName: "Esfuerzo estimado",
      width: 160,
      renderCell: (params) => (
        <Box
          sx={{
            cursor: "pointer",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
          onClick={(e) => {
            setEditingEffort(params.row.id as string);
            setEffortMenuAnchor(e.currentTarget);
          }}
        >
          <Typography variant="body2">
            {params.value || "Sin estimar"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "epicId",
      headerName: "ID de épica",
      width: 140,
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Acciones",
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Eliminar"
          onClick={() => handleDeleteEpic(params.row.id as string)}
        />,
      ],
    },
  ];

  const handleCellEditStop = (
    params: GridCellEditStopParams,
    event: MuiEvent
  ) => {
    if (params.field === "name") {
      const newValue = (event as any).target?.value;
      if (newValue && typeof newValue === "string") {
        handleNameChange(params.id as string, newValue);
      }
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl">
        <Stack spacing={2} alignItems="center" py={8}>
          <CircularProgress />
          <Typography color="text.secondary">Cargando épicas...</Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Stack spacing={3}>
        {/* Header */}
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={700}>
            Épicas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona las épicas de tu proyecto y conecta tareas relacionadas.
          </Typography>
        </Stack>

        {/* Toolbar */}
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddEpic}>
            Agregar épica
          </Button>

          {!searchOpen ? (
            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              onClick={() => setSearchOpen(true)}
            >
              Buscar
            </Button>
          ) : (
            <TextField
              size="small"
              placeholder="Buscar épicas..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                endAdornment: (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchText("");
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                ),
              }}
              sx={{ width: 300 }}
            />
          )}

          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
          >
            Filtrar
          </Button>

          <Button
            variant="outlined"
            startIcon={<SortIcon />}
            onClick={(e) => setSortAnchor(e.currentTarget)}
          >
            Ordenar
          </Button>

          <Button
            variant="outlined"
            startIcon={<VisibilityOffIcon />}
            onClick={(e) => setHideAnchor(e.currentTarget)}
          >
            Ocultar
          </Button>
        </Stack>

        {/* DataGrid */}
        <Box sx={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            sx={{
              "& .MuiDataGrid-cell": {
                py: 1,
              },
              "& .MuiDataGrid-cell:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-cell:focus-within": {
                outline: "none",
              },
            }}
          />
        </Box>

        {/* Menú de Filtros */}
        <Menu
          anchorEl={filterAnchor}
          open={Boolean(filterAnchor)}
          onClose={() => setFilterAnchor(null)}
          PaperProps={{
            sx: { width: 320, maxHeight: 500 },
          }}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2" fontWeight={700}>
              Filtros
            </Typography>
          </MenuItem>
          <Divider />

          <MenuItem>
            <Stack spacing={1} width="100%">
              <Typography variant="body2" fontWeight={600}>
                Por Fase
              </Typography>
              {phases.map((phase) => (
                <Box key={phase.id} display="flex" alignItems="center">
                  <Checkbox
                    size="small"
                    checked={filters.phases.includes(phase.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({
                          ...filters,
                          phases: [...filters.phases, phase.id],
                        });
                      } else {
                        setFilters({
                          ...filters,
                          phases: filters.phases.filter((id) => id !== phase.id),
                        });
                      }
                    }}
                  />
                  <ListItemText primary={phase.name} />
                </Box>
              ))}
            </Stack>
          </MenuItem>

          <Divider />

          <MenuItem>
            <Stack spacing={1} width="100%">
              <Typography variant="body2" fontWeight={600}>
                Por Esfuerzo
              </Typography>
              {pointValues.map((point) => (
                <Box key={point.id} display="flex" alignItems="center">
                  <Checkbox
                    size="small"
                    checked={filters.efforts.includes(point.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({
                          ...filters,
                          efforts: [...filters.efforts, point.value],
                        });
                      } else {
                        setFilters({
                          ...filters,
                          efforts: filters.efforts.filter((v) => v !== point.value),
                        });
                      }
                    }}
                  />
                  <ListItemText primary={point.value} />
                </Box>
              ))}
            </Stack>
          </MenuItem>

          <Divider />

          <MenuItem>
            <Button
              fullWidth
              size="small"
              onClick={() => setFilters({ phases: [], efforts: [] })}
            >
              Limpiar filtros
            </Button>
          </MenuItem>
        </Menu>

        {/* Menú de Ordenamiento */}
        <Menu
          anchorEl={sortAnchor}
          open={Boolean(sortAnchor)}
          onClose={() => setSortAnchor(null)}
          PaperProps={{
            sx: { width: 300, p: 2 },
          }}
        >
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={700}>
              Ordenar por
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Elegir columna</InputLabel>
              <Select
                value={sortColumn}
                label="Elegir columna"
                onChange={(e) => setSortColumn(e.target.value)}
              >
                <MenuItem value="name">Épica</MenuItem>
                <MenuItem value="phase">Fase</MenuItem>
                <MenuItem value="effort">Esfuerzo estimado</MenuItem>
                <MenuItem value="epicId">ID de épica</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Orden</InputLabel>
              <Select
                value={sortOrder}
                label="Orden"
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              >
                <MenuItem value="asc">Ascendente (A-Z)</MenuItem>
                <MenuItem value="desc">Descendente (Z-A)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Menu>

        {/* Menú de Ocultar */}
        <Menu
          anchorEl={hideAnchor}
          open={Boolean(hideAnchor)}
          onClose={() => setHideAnchor(null)}
          PaperProps={{
            sx: { width: 320, maxHeight: 400 },
          }}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2" fontWeight={700}>
              Ocultar épicas
            </Typography>
          </MenuItem>
          <Divider />

          {epics.map((epic) => (
            <MenuItem key={epic.id}>
              <Checkbox
                checked={hiddenEpics.includes(epic.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setHiddenEpics([...hiddenEpics, epic.id]);
                  } else {
                    setHiddenEpics(hiddenEpics.filter((id) => id !== epic.id));
                  }
                }}
              />
              <ListItemText primary={epic.name} />
            </MenuItem>
          ))}

          {hiddenEpics.length > 0 && (
            <>
              <Divider />
              <MenuItem>
                <Button fullWidth size="small" onClick={() => setHiddenEpics([])}>
                  Mostrar todas
                </Button>
              </MenuItem>
            </>
          )}
        </Menu>

        {/* Menú contextual para editar Fase */}
        <Menu
          anchorEl={phaseMenuAnchor}
          open={Boolean(phaseMenuAnchor) && editingPhase !== null}
          onClose={() => {
            setPhaseMenuAnchor(null);
            setEditingPhase(null);
          }}
        >
          <MenuItem
            onClick={() => {
              if (editingPhase) {
                handlePhaseChange(editingPhase, "");
              }
              setPhaseMenuAnchor(null);
              setEditingPhase(null);
            }}
          >
            <em>Sin fase</em>
          </MenuItem>
          {phases.map((phase) => (
            <MenuItem
              key={phase.id}
              onClick={() => {
                if (editingPhase) {
                  handlePhaseChange(editingPhase, phase.id);
                }
                setPhaseMenuAnchor(null);
                setEditingPhase(null);
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: phase.color || "#ccc",
                  }}
                />
                <Typography>{phase.name}</Typography>
              </Stack>
            </MenuItem>
          ))}
        </Menu>

        {/* Menú contextual para editar Esfuerzo */}
        <Menu
          anchorEl={effortMenuAnchor}
          open={Boolean(effortMenuAnchor) && editingEffort !== null}
          onClose={() => {
            setEffortMenuAnchor(null);
            setEditingEffort(null);
          }}
        >
          <MenuItem
            onClick={() => {
              if (editingEffort) {
                handleEffortChange(editingEffort, "");
              }
              setEffortMenuAnchor(null);
              setEditingEffort(null);
            }}
          >
            <em>Sin estimar</em>
          </MenuItem>
          {pointValues.map((point) => (
            <MenuItem
              key={point.id}
              onClick={() => {
                if (editingEffort) {
                  handleEffortChange(editingEffort, point.value);
                }
                setEffortMenuAnchor(null);
                setEditingEffort(null);
              }}
            >
              {point.value}
            </MenuItem>
          ))}
        </Menu>

        {/* Dialog de Selección de Tareas - Estilo MUI con Checkboxes */}
        <Dialog
          open={taskSearchOpen !== null}
          onClose={() => {
            setTaskSearchOpen(null);
            setTaskSearchText("");
            setTaskOptions([]);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { height: "80vh" },
          }}
        >
          <DialogTitle>
            <Stack spacing={1}>
              <Typography variant="h6" fontWeight={600}>
                Elegir tareas
              </Typography>
              
              {/* Buscador */}
              <TextField
                size="small"
                placeholder="Busca o agregar Tarea"
                value={taskSearchText}
                onChange={(e) => setTaskSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                  ),
                }}
                sx={{ mt: 1 }}
              />
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ p: 0 }}>
            <Stack>
              {/* Sección: Todas las tareas */}
              <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50" }}>
                <Typography variant="subtitle2" color="primary" fontWeight={600}>
                  Todas las tareas
                </Typography>
              </Box>

              {/* Lista de tareas con checkboxes */}
              <Stack sx={{ maxHeight: "calc(80vh - 220px)", overflow: "auto" }}>
                {taskOptions.length === 0 ? (
                  <Stack alignItems="center" py={4}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Cargando tareas...
                    </Typography>
                  </Stack>
                ) : taskOptions.length === 0 && taskSearchText ? (
                  <Stack alignItems="center" py={4}>
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron tareas
                    </Typography>
                  </Stack>
                ) : (
                  taskOptions.map((task) => {
                    const epicRow = rows.find((r) => r.id === taskSearchOpen);
                    const isConnected = epicRow
                      ? (epicRow.connectedTasks as Array<{ id: string; title: string }>).some(
                          (t) => t.id === task.id
                        )
                      : false;

                    return (
                      <Box
                        key={task.id}
                        sx={{
                          px: 2,
                          py: 1.5,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                        }}
                        onClick={() => {
                          if (taskSearchOpen) {
                            if (isConnected) {
                              handleDisconnectTask(taskSearchOpen, task.id);
                            } else {
                              handleConnectTask(taskSearchOpen, task.id);
                            }
                          }
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Checkbox
                            checked={isConnected}
                            sx={{ p: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (taskSearchOpen) {
                                if (isConnected) {
                                  handleDisconnectTask(taskSearchOpen, task.id);
                                } else {
                                  handleConnectTask(taskSearchOpen, task.id);
                                }
                              }
                            }}
                          />
                          <Typography variant="body2">{task.title}</Typography>
                        </Stack>
                      </Box>
                    );
                  })
                )}
              </Stack>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              {taskOptions.length} tarea{taskOptions.length !== 1 ? "s" : ""} disponible
              {taskOptions.length !== 1 ? "s" : ""}
            </Typography>
            <Button
              onClick={() => {
                setTaskSearchOpen(null);
                setTaskSearchText("");
                setTaskOptions([]);
              }}
            >
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Container>
  );
};

export default EpicsTable;