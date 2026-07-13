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
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SettingsIcon from "@mui/icons-material/Settings";
import { addMonths, addWeeks, endOfWeek, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useProject } from "../../../shared/contexts/ProjectContext";
import { useRoadmap } from "../hooks/useRoadmap";
import TimelineGrid from "./TimelineGrid";

type RoadmapProps = {
  userId: string;
};

const Roadmap = ({ userId }: RoadmapProps) => {
  const { currentProject } = useProject();
  const [timelineMode, setTimelineMode] = useState<"weeks" | "months">("months");
  const [hasTimelineOverflow, setHasTimelineOverflow] = useState(false);
  const [timelineScrollRequest, setTimelineScrollRequest] = useState<{
    direction: "left" | "right";
    nonce: number;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    epics,
    dependencies,
    settings,
    loading,
    updateEpicDates,
    updateTaskDates,
    moveTaskBetweenEpics,
    createTaskUnderEpic,
    addDependency,
    removeDependency,
    updateSettings,
  } = useRoadmap(userId, currentProject?.id || null);

  const now = new Date();
  const timelineStart = startOfWeek(now, { weekStartsOn: 1 });
  const timelineEnd =
    timelineMode === "weeks"
      ? endOfWeek(addWeeks(timelineStart, 5), { weekStartsOn: 1 })
      : addMonths(timelineStart, 2);
  const timelineRangeLabel = `Sprint timeline: ${format(timelineStart, "d MMM yyyy", {
    locale: es,
  })} - ${format(timelineEnd, "d MMM yyyy", { locale: es })}`;

  const handleCreateDependency = async (fromEpicId: string, toEpicId: string, dependencyType: string) => {
    try {
      await addDependency(fromEpicId, toEpicId, dependencyType);
    } catch (error) {
      console.error("Error creating dependency:", error);
    }
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
        minWidth: 0,
        overflowX: "hidden",
      }}
    >
      <Stack spacing={3} sx={{ height: "calc(100vh - 250px)", width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h4" fontWeight={700}>
                Roadmap
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => setSettingsOpen(true)}
                sx={{ fontWeight: 700 }}
              >
                Settings
              </Button>
            </Stack>
            <Typography variant="body1" color="text.secondary">
              Planifica y visualiza el timeline de tus épicas
            </Typography>
          </Stack>
          <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ mt: 0.75 }}>
            {timelineRangeLabel}
          </Typography>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 2,
            minWidth: 0,
          }}
        >
          <Box />
          {hasTimelineOverflow ? (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              justifyContent="center"
              sx={{ minWidth: 0 }}
            >
              <IconButton
                onClick={() => requestTimelineScroll("left")}
                aria-label="Desplazar calendario a la izquierda"
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  boxShadow: 1,
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                sx={{ maxWidth: 460 }}
              >
                Desplázate por el calendario con los botones o usa las teclas ← y →.
              </Typography>
              <IconButton
                onClick={() => requestTimelineScroll("right")}
                aria-label="Desplazar calendario a la derecha"
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  boxShadow: 1,
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          ) : (
            <Box />
          )}

          <Stack direction="row" justifyContent="flex-end" sx={{ minWidth: 0 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={timelineMode}
            onChange={(_event, value: "weeks" | "months" | null) => {
              if (value) {
                setTimelineMode(value);
              }
            }}
            sx={{
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              "& .MuiToggleButton-root": {
                px: 3,
                py: 1,
                border: 0,
                borderRight: 1,
                borderColor: "divider",
                fontWeight: 700,
                "&.Mui-selected": {
                  color: "primary.contrastText",
                  bgcolor: "primary.main",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                },
              },
            }}
          >
            <ToggleButton value="weeks">Weeks</ToggleButton>
            <ToggleButton value="months">Months</ToggleButton>
            <ToggleButton value="quarters" disabled>
              Quarters
            </ToggleButton>
          </ToggleButtonGroup>
          </Stack>
        </Box>

        <TimelineGrid 
          epics={epics} 
          dependencies={dependencies}
          timelineMode={timelineMode}
          scrollRequest={timelineScrollRequest}
          onOverflowChange={setHasTimelineOverflow}
          onUpdateEpicDates={updateEpicDates}
          onUpdateTaskDates={updateTaskDates}
          onMoveTaskToEpic={moveTaskBetweenEpics}
          onCreateTask={createTaskUnderEpic}
          onCreateDependency={handleCreateDependency}
          onDeleteDependency={removeDependency}
          showChildLevelIssues={settings.child_level_issue_scheduling}
        />
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
