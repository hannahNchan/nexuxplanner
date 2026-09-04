import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SettingsIcon from "@mui/icons-material/Settings";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useProject } from "../../../shared/contexts/ProjectContext";
import ReadOnlyProjectNotice from "../../../shared/ui/ReadOnlyProjectNotice";
import { useRoadmap } from "../hooks/useRoadmap";
import { getRoadmapTimelineRange, type RoadmapTimelineMode } from "../utils/timelineRange";
import TimelineGrid from "./TimelineGrid";

type RoadmapProps = {
  userId: string;
};

const Roadmap = ({ userId }: RoadmapProps) => {
  const theme = useTheme();
  const { currentProject } = useProject();
  const canEditProject = currentProject?.can_edit ?? true;
  const [timelineMode, setTimelineMode] = useState<RoadmapTimelineMode>("months");
  const [hasTimelineOverflow, setHasTimelineOverflow] = useState(false);
  const [timelineScrollRequest, setTimelineScrollRequest] = useState<{
    direction: "left" | "right";
    nonce: number;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    epics,
    dependencies,
    taskDependencies,
    settings,
    loading,
    updateEpicDates,
    updateTaskDates,
    moveTaskBetweenEpics,
    createTaskUnderEpic,
    addDependency,
    removeDependency,
    addTaskDependency,
    removeTaskDependency,
    updateSettings,
  } = useRoadmap(userId, currentProject?.id || null, canEditProject);

  const { timelineStart, timelineEnd } = getRoadmapTimelineRange(timelineMode, epics);
  const timelineRangeLabel = `Roadmap timeline: ${format(timelineStart, "d MMM yyyy", {
    locale: es,
  })} - ${format(timelineEnd, "d MMM yyyy", { locale: es })}`;

  const handleCreateDependency = async (fromEpicId: string, toEpicId: string, dependencyType: string) => {
    await addDependency(fromEpicId, toEpicId, dependencyType);
  };

  const handleCreateTaskDependency = async (fromTaskId: string, toTaskId: string, dependencyType: string) => {
    await addTaskDependency(fromTaskId, toTaskId, dependencyType);
  };

  const requestTimelineScroll = (direction: "left" | "right") => {
    setTimelineScrollRequest({
      direction,
      nonce: Date.now(),
    });
  };

  useEffect(() => {
    if (!hasTimelineOverflow) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.key === "ArrowLeft") {
        requestTimelineScroll("left");
      } else if (event.key === "ArrowRight") {
        requestTimelineScroll("right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasTimelineOverflow]);

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        paddingX: "32px",
        width: "100%",
        maxWidth: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Stack spacing={2} sx={{ height: "100%", width: "100%", maxWidth: "100%", minWidth: 0, minHeight: 0 }}>
        <Paper
          elevation={0}
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            flexShrink: 0,
            px: 3,
            py: 2,
            borderRadius: 1,
            bgcolor: "background.paper",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", lg: "center" }}
            spacing={2}
          >
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
                <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                  Roadmap
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SettingsIcon />}
                  onClick={() => setSettingsOpen(true)}
                  disabled={!canEditProject}
                  sx={{ fontWeight: 700 }}
                >
                  Settings
                </Button>
              </Stack>
              <Typography variant="body1" color="text.secondary" noWrap>
                Planifica y visualiza el timeline de tus épicas
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              justifyContent={{ xs: "flex-start", lg: "flex-end" }}
              flexWrap="wrap"
              sx={{ minWidth: 0 }}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                color="text.secondary"
                sx={{ whiteSpace: "nowrap" }}
              >
                {timelineRangeLabel}
              </Typography>

              {hasTimelineOverflow && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <IconButton
                    size="small"
                    onClick={() => requestTimelineScroll("left")}
                    aria-label="Desplazar calendario a la izquierda"
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => requestTimelineScroll("right")}
                    aria-label="Desplazar calendario a la derecha"
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )}

              <ToggleButtonGroup
                exclusive
                size="small"
                value={timelineMode}
                onChange={(_event, value: RoadmapTimelineMode | null) => {
                  if (value) {
                    setTimelineMode(value);
                  }
                }}
                sx={{
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  overflow: "hidden",
                  "& .MuiToggleButton-root": {
                    px: 2.25,
                    py: 0.75,
                    border: 0,
                    borderRight: 1,
                    borderColor: "divider",
                    fontSize: 12,
                    fontWeight: 800,
                    "&.Mui-selected": {
                      color: "primary.contrastText",
                      bgcolor: "primary.main",
                      "&:hover": {
                        bgcolor: "primary.dark",
                      },
                    },
                    "&:last-of-type": {
                      borderRight: 0,
                    },
                    "&.Mui-disabled": {
                      color: "text.disabled",
                    },
                  },
                }}
              >
                <ToggleButton value="weeks">Weeks</ToggleButton>
                <ToggleButton value="months">Monthly</ToggleButton>
                <ToggleButton value="quarters">Quarters</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
          {!canEditProject && currentProject ? (
            <Box sx={{ mt: 2 }}>
              <ReadOnlyProjectNotice projectName={currentProject.title} />
            </Box>
          ) : null}
        </Paper>

        <Box sx={{ flex: 1, minHeight: 0, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
          <TimelineGrid 
            epics={epics} 
            dependencies={dependencies}
            taskDependencies={taskDependencies}
            timelineMode={timelineMode}
            scrollRequest={timelineScrollRequest}
            onOverflowChange={setHasTimelineOverflow}
            onUpdateEpicDates={updateEpicDates}
            onUpdateTaskDates={updateTaskDates}
            onMoveTaskToEpic={moveTaskBetweenEpics}
            onCreateTask={createTaskUnderEpic}
            onCreateDependency={handleCreateDependency}
            onDeleteDependency={removeDependency}
            onCreateTaskDependency={handleCreateTaskDependency}
            onDeleteTaskDependency={removeTaskDependency}
            showChildLevelIssues={settings.child_level_issue_scheduling}
            readOnly={!canEditProject}
          />
        </Box>
      </Stack>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Roadmap settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.child_level_issue_scheduling}
                    onChange={(event) =>
                      void updateSettings({
                        child_level_issue_scheduling: event.target.checked,
                      })
                    }
                  />
                }
                label={
                  <Typography variant="subtitle1" fontWeight={700}>
                    Child level issue scheduling
                  </Typography>
                }
                sx={{ alignItems: "center", m: 0 }}
              />
              <Typography variant="body2" color="text.secondary">
                With this feature enabled, timeline bars for child level issues will be visible on your timeline using
                the dates of the sprint to which they&apos;re assigned. You can move these bars to reschedule issues
                within your project.
              </Typography>
            </Stack>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              Off: el roadmap muestra solo épicas. On: muestra épicas y tareas conectadas.
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default Roadmap;
