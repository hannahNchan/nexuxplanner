import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import { faChartLine } from "@fortawesome/free-solid-svg-icons";
import { DataTableHeader } from "../../../shared/ui/DataTable";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { useProject } from "../../../shared/contexts/ProjectContext";
import {
  fetchProjectSprintReports,
  type SprintReport,
  type SprintReportTaskSnapshot,
} from "../../api/reportService";
import { getErrorMessage, logError } from "../../../shared/utils/errorHandling";

type ReportsPageProps = {
  userId: string;
};

type BreakdownRow = {
  label: string;
  tasks: number;
  storyPoints: number;
  completedTasks: number;
  completedPoints: number;
  color?: string | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const getBarWidth = (value: number, max: number) => {
  if (max <= 0) return 0;
  return Math.max(4, Math.min(100, (value / max) * 100));
};

const getTaskLabel = (task: SprintReportTaskSnapshot) => task.task_id_display || task.id.slice(0, 8);

const groupByEpic = (tasks: SprintReportTaskSnapshot[]): BreakdownRow[] => {
  const rows = new Map<string, BreakdownRow>();

  tasks.forEach((task) => {
    const key = task.epic_id ?? "no-epic";
    const current = rows.get(key) ?? {
      label: task.epic_name ?? "Sin epica",
      tasks: 0,
      storyPoints: 0,
      completedTasks: 0,
      completedPoints: 0,
      color: task.epic_color,
    };

    current.tasks += 1;
    current.storyPoints += task.story_points_number;
    if (task.is_completed) {
      current.completedTasks += 1;
      current.completedPoints += task.story_points_number;
    }

    rows.set(key, current);
  });

  return Array.from(rows.values()).sort((a, b) => b.storyPoints - a.storyPoints);
};

const groupByAssignee = (tasks: SprintReportTaskSnapshot[]): BreakdownRow[] => {
  const rows = new Map<string, BreakdownRow>();

  tasks.forEach((task) => {
    const key = task.assignee_id ?? "unassigned";
    const current = rows.get(key) ?? {
      label: task.assignee_id ? `Usuario ${task.assignee_id.slice(0, 8)}` : "Sin asignar",
      tasks: 0,
      storyPoints: 0,
      completedTasks: 0,
      completedPoints: 0,
    };

    current.tasks += 1;
    current.storyPoints += task.story_points_number;
    if (task.is_completed) {
      current.completedTasks += 1;
      current.completedPoints += task.story_points_number;
    }

    rows.set(key, current);
  });

  return Array.from(rows.values()).sort((a, b) => b.storyPoints - a.storyPoints);
};

const MetricCard = ({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: "100%",
        borderRadius: 1,
        bgcolor: "background.paper",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={900}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

const HorizontalMetricBar = ({
  label,
  value,
  max,
  color,
  suffix = "pts",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) => {
  const theme = useTheme();

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Typography variant="body2" fontWeight={750}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={800}>
          {value} {suffix}
        </Typography>
      </Stack>
      <Box
        sx={{
          height: 10,
          borderRadius: 1,
          bgcolor: alpha(theme.palette.text.primary, 0.08),
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${getBarWidth(value, max)}%`,
            height: "100%",
            bgcolor: color,
            borderRadius: 1,
          }}
        />
      </Box>
    </Stack>
  );
};

const BreakdownTable = ({ title, rows }: { title: string; rows: BreakdownRow[] }) => {
  const theme = useTheme();
  const maxPoints = Math.max(...rows.map((row) => row.storyPoints), 0);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 1,
        bgcolor: "background.paper",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack spacing={2}>
        <Typography variant="subtitle1" fontWeight={900}>
          {title}
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay datos para esta seccion.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {rows.map((row) => (
              <Stack key={row.label} spacing={0.75}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    {row.color ? (
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: row.color, flexShrink: 0 }} />
                    ) : null}
                    <Typography variant="body2" fontWeight={750} noWrap>
                      {row.label}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" fontWeight={800}>
                    {row.completedPoints}/{row.storyPoints} pts
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={getBarWidth(row.storyPoints, maxPoints)}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.text.primary, 0.08),
                    "& .MuiLinearProgress-bar": {
                      bgcolor: row.color || theme.palette.primary.main,
                      borderRadius: 1,
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {row.completedTasks} de {row.tasks} tareas terminadas
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

const ReportsPage = ({ userId }: ReportsPageProps) => {
  void userId;
  const theme = useTheme();
  const { currentProject } = useProject();
  const [reports, setReports] = useState<SprintReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      if (!currentProject) {
        setReports([]);
        setSelectedReportId(null);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const nextReports = await fetchProjectSprintReports(currentProject.id);
        if (cancelled) return;

        setReports(nextReports);
        setSelectedReportId((current) =>
          current && nextReports.some((report) => report.id === current)
            ? current
            : nextReports[0]?.id ?? null
        );
      } catch (loadError) {
        if (cancelled) return;
        logError("reports.load", loadError);
        setError(getErrorMessage(loadError, "No se pudieron cargar los reportes."));
        setReports([]);
        setSelectedReportId(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [currentProject]);

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null;
  const statusRows = useMemo(
    () =>
      Object.entries(selectedReport?.snapshot.totals_by_status ?? {})
        .map(([label, value]) => ({
          label,
          tasks: Number(value.tasks ?? 0),
          storyPoints: Number(value.story_points ?? 0),
          completedTasks: 0,
          completedPoints: 0,
        }))
        .sort((a, b) => b.storyPoints - a.storyPoints),
    [selectedReport]
  );
  const epicRows = useMemo(
    () => groupByEpic(selectedReport?.snapshot.tasks ?? []),
    [selectedReport]
  );
  const assigneeRows = useMemo(
    () => groupByAssignee(selectedReport?.snapshot.tasks ?? []),
    [selectedReport]
  );

  if (!currentProject) {
    return (
      <Container maxWidth={false}>
        <EmptyState
          icon={faChartLine}
          title="Selecciona un proyecto"
          description="Los reportes se generan por proyecto cuando se completa un sprint."
        />
      </Container>
    );
  }

  return (
    <Container maxWidth={false}>
      <Stack spacing={2}>
        <DataTableHeader
          title="Reportes"
          subtitle={`Analiza los sprints cerrados de ${currentProject.title}. Los datos vienen del snapshot creado al completar cada sprint.`}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? (
          <Stack spacing={2} alignItems="center" py={8}>
            <CircularProgress size={44} thickness={4} />
            <Typography color="text.secondary" variant="h6">
              Cargando reportes...
            </Typography>
          </Stack>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={faChartLine}
            title="No hay reportes todavía"
            description="Cuando completes un sprint, NexusPlanner generará aquí el resumen histórico con puntos, tareas, estados y decisiones de cierre."
          />
        ) : selectedReport ? (
          <Grid container spacing={2} alignItems="flex-start">
            <Grid
              item
              xs={12}
              md={3}
              sx={{
                position: { md: "sticky" },
                top: { md: 16 },
                alignSelf: "flex-start",
                zIndex: 1,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 1,
                  bgcolor: "background.paper",
                  border: `1px solid ${theme.palette.divider}`,
                  overflow: "hidden",
                }}
              >
                <Stack
                  sx={{
                    p: 1,
                    maxHeight: { md: "calc(100vh - 220px)" },
                    overflowY: "auto",
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": {
                      display: "none",
                    },
                  }}
                >
                  {reports.map((report) => {
                    const selected = report.id === selectedReport.id;

                    return (
                      <Box
                        key={report.id}
                        component="button"
                        type="button"
                        onClick={() => setSelectedReportId(report.id)}
                        style={{ border: 0, font: "inherit", textAlign: "left" }}
                      >
                        <Stack
                          spacing={0.75}
                          sx={{
                            p: 1.5,
                            borderRadius: 1,
                            cursor: "pointer",
                            bgcolor: selected ? alpha(theme.palette.primary.main, 0.12) : "transparent",
                            color: "text.primary",
                            "&:hover": {
                              bgcolor: selected
                                ? alpha(theme.palette.primary.main, 0.16)
                                : alpha(theme.palette.text.primary, 0.045),
                            },
                          }}
                        >
                          <Typography variant="body2" fontWeight={900} noWrap>
                            {report.sprint_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(report.sprint_start_date)} - {formatDate(report.sprint_end_date)}
                          </Typography>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Chip size="small" label={`${report.completed_story_points}/${report.total_story_points} pts`} />
                            <Chip size="small" color="primary" variant="outlined" label={formatPercent(report.story_point_completion_rate)} />
                          </Stack>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={9}>
              <Stack spacing={2}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: "background.paper",
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Stack spacing={1}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                      <Box>
                        <Typography variant="h5" fontWeight={900}>
                          {selectedReport.sprint_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(selectedReport.sprint_start_date)} - {formatDate(selectedReport.sprint_end_date)}
                        </Typography>
                      </Box>
                      <Chip label="Sprint cerrado" color="success" variant="outlined" />
                    </Stack>
                    {selectedReport.sprint_goal ? (
                      <Typography variant="body2" color="text.secondary">
                        {selectedReport.sprint_goal}
                      </Typography>
                    ) : null}
                  </Stack>
                </Paper>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} lg={3}>
                    <MetricCard
                      label="Cumplimiento"
                      value={formatPercent(selectedReport.story_point_completion_rate)}
                      caption="Por story points terminados"
                      icon={<TrackChangesIcon fontSize="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <MetricCard
                      label="Puntos"
                      value={`${selectedReport.completed_story_points}/${selectedReport.total_story_points}`}
                      caption="Completados vs planeados"
                      icon={<AssessmentIcon fontSize="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <MetricCard
                      label="Terminadas"
                      value={`${selectedReport.completed_tasks}`}
                      caption={`${selectedReport.total_tasks} tareas planeadas`}
                      icon={<CheckCircleIcon fontSize="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <MetricCard
                      label="Pendientes"
                      value={`${selectedReport.incomplete_tasks}`}
                      caption={`${selectedReport.incomplete_story_points} puntos arrastrados`}
                      icon={<ErrorOutlineIcon fontSize="small" />}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        bgcolor: "background.paper",
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Stack spacing={2}>
                        <Typography variant="subtitle1" fontWeight={900}>
                          Compromiso vs entrega
                        </Typography>
                        <HorizontalMetricBar
                          label="Planeado"
                          value={selectedReport.total_story_points}
                          max={selectedReport.total_story_points}
                          color={theme.palette.info.main}
                        />
                        <HorizontalMetricBar
                          label="Completado"
                          value={selectedReport.completed_story_points}
                          max={selectedReport.total_story_points}
                          color={theme.palette.success.main}
                        />
                        <HorizontalMetricBar
                          label="No completado"
                          value={selectedReport.incomplete_story_points}
                          max={selectedReport.total_story_points}
                          color={theme.palette.warning.main}
                        />
                      </Stack>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <BreakdownTable title="Estados finales" rows={statusRows} />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <BreakdownTable title="Resultado por epica" rows={epicRows} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <BreakdownTable title="Carga por responsable" rows={assigneeRows} />
                  </Grid>
                </Grid>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 1,
                    bgcolor: "background.paper",
                    border: `1px solid ${theme.palette.divider}`,
                    overflow: "hidden",
                  }}
                >
                  <Stack spacing={1.5} sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={900}>
                      Tareas del sprint
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Este listado usa el estado capturado al cierre del sprint.
                    </Typography>
                  </Stack>
                  <Divider />
                  <TableContainer sx={{ maxHeight: 420 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Tarea</TableCell>
                          <TableCell>Estado final</TableCell>
                          <TableCell>Epica</TableCell>
                          <TableCell align="right">Puntos</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedReport.snapshot.tasks.map((task) => (
                          <TableRow key={task.id} hover>
                            <TableCell>
                              <Typography variant="caption" fontFamily="monospace" fontWeight={900}>
                                {getTaskLabel(task)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <Typography variant="body2" fontWeight={750}>
                                  {task.title}
                                </Typography>
                                {task.priority_name ? (
                                  <Typography variant="caption" color="text.secondary">
                                    {task.priority_name}
                                  </Typography>
                                ) : null}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={task.is_completed ? "success" : "default"}
                                variant={task.is_completed ? "filled" : "outlined"}
                                label={task.column_name ?? "Sin columna"}
                              />
                            </TableCell>
                            <TableCell>{task.epic_name ?? "Sin epica"}</TableCell>
                            <TableCell align="right">{task.story_points_number}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        ) : null}
      </Stack>
    </Container>
  );
};

export default ReportsPage;
