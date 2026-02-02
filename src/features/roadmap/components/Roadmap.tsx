import { Container, Stack, Typography, CircularProgress, Box } from "@mui/material";
import { useProject } from "../../../shared/contexts/ProjectContext";
import { useRoadmap } from "../hooks/useRoadmap";
import TimelineGrid from "./TimelineGrid";

type RoadmapProps = {
  userId: string;
};

const Roadmap = ({ userId }: RoadmapProps) => {
  const { currentProject } = useProject();
  const { epics, dependencies, loading, updateEpicDates, addDependency } = useRoadmap(userId, currentProject?.id || null);

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const currentYear = new Date().getFullYear();

  const handleCreateDependency = async (fromEpicId: string, toEpicId: string, dependencyType: string) => {
    try {
      await addDependency(fromEpicId, toEpicId, dependencyType);
    } catch (error) {
      console.error("Error creating dependency:", error);
    }
  };

  return (
    <Container maxWidth="xl">
      <Stack spacing={3} sx={{ height: "calc(100vh - 250px)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={700}>
              Roadmap
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Planifica y visualiza el timeline de tus épicas
            </Typography>
          </Stack>
          <Typography variant="h4" fontWeight={700} color="text.secondary">
            {currentYear}
          </Typography>
        </Stack>

        <TimelineGrid 
          epics={epics} 
          dependencies={dependencies}
          onUpdateEpicDates={updateEpicDates}
          onCreateDependency={handleCreateDependency}
        />
      </Stack>
    </Container>
  );
};

export default Roadmap;