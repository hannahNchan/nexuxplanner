import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import EpicsTable from "../components/EpicsTable";
import {
  fetchEpics,
  fetchEpicPhases,
  createEpic,
  type EpicWithDetails,
  type EpicPhase,
} from "../api/epicService";
import {
  fetchDefaultPointSystem,
  fetchPointValues,
  type PointValue,
} from "../api/catalogService";

type EpicsPageProps = {
  userId: string;
};

const EpicsPage = ({ userId }: EpicsPageProps) => {
  const [epics, setEpics] = useState<EpicWithDetails[]>([]);
  const [phases, setPhases] = useState<EpicPhase[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

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
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("No se pudieron cargar las épicas. Intenta recargar la página.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId]);

  const handleAddEpic = async () => {
    try {
      await createEpic(userId, { name: "Nueva épica" });
      await loadData();
    } catch (err) {
      console.error("Error creando épica:", err);
      setError("No se pudo crear la épica.");
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={2} alignItems="center" py={8}>
          <CircularProgress />
          <Typography color="text.secondary">Cargando épicas...</Typography>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={2} alignItems="center" py={8}>
          <Typography color="error" variant="h6">
            {error}
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
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

        {/* Tabla */}
        <EpicsTable
          userId={userId}
          epics={epics}
          phases={phases}
          pointValues={pointValues}
          onRefresh={loadData}
          onAddEpic={handleAddEpic}
        />
      </Stack>
    </Container>
  );
};

export default EpicsPage;