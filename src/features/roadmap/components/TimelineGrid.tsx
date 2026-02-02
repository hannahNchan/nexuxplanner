import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useState } from "react";
import { startOfYear, endOfYear, addMonths, startOfMonth, endOfMonth } from "date-fns";
import Xarrow from "react-xarrows";
import EpicBar from "./EpicBar";
import type { EpicWithDetails } from "../../../features/api/epicService";
import type { EpicDependency } from "../../../features/api/dependencyService";

type TimelineGridProps = {
  epics: EpicWithDetails[];
  dependencies: EpicDependency[];
  onUpdateEpicDates: (epicId: string, startDate: string, endDate: string) => void;
  onCreateDependency: (fromEpicId: string, toEpicId: string, dependencyType: string) => void;
};

const TimelineGrid = ({ epics, dependencies, onUpdateEpicDates, onCreateDependency }: TimelineGridProps) => {
  const today = new Date();
  const yearStart = startOfYear(today);
  const yearEnd = endOfYear(today);

  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [draggingFromEpic, setDraggingFromEpic] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ from: string; to: string } | null>(null);
  const [dependencyType, setDependencyType] = useState("finish-to-start");

  const quarters = [
    { label: "ENE - MAR", start: startOfMonth(yearStart), end: endOfMonth(addMonths(yearStart, 2)) },
    { label: "ABR - JUN", start: startOfMonth(addMonths(yearStart, 3)), end: endOfMonth(addMonths(yearStart, 5)) },
    { label: "JUL - SEP", start: startOfMonth(addMonths(yearStart, 6)), end: endOfMonth(addMonths(yearStart, 8)) },
    { label: "OCT - DIC", start: startOfMonth(addMonths(yearStart, 9)), end: endOfMonth(addMonths(yearStart, 11)) },
  ];

  const epicsWithDates = epics.filter(epic => epic.start_date && epic.end_date);

  const handleStartConnection = (epicId: string) => {
    setIsDraggingConnection(true);
    setDraggingFromEpic(epicId);
  };

  const handleEndConnection = (toEpicId: string) => {
    if (draggingFromEpic && draggingFromEpic !== toEpicId) {
      setPendingConnection({ from: draggingFromEpic, to: toEpicId });
    }
    setIsDraggingConnection(false);
    setDraggingFromEpic(null);
  };

  const handleConfirmConnection = async () => {
    if (pendingConnection) {
      try {
        await onCreateDependency(pendingConnection.from, pendingConnection.to, dependencyType);
      } catch (error) {
        console.error("Error creating dependency:", error);
      }
    }
    setPendingConnection(null);
    setDependencyType("finish-to-start");
  };

  const handleCancelModal = () => {
    setPendingConnection(null);
    setDependencyType("finish-to-start");
  };

  return (
    <Box sx={{ overflow: "auto", height: "100%", position: "relative" }}>
      <Box sx={{ display: "flex", borderBottom: 2, borderColor: "divider", position: "sticky", top: 0, bgcolor: "background.paper", zIndex: 10 }}>
        <Box sx={{ width: 200, flexShrink: 0, p: 2, borderRight: 1, borderColor: "divider" }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Épicas
          </Typography>
        </Box>

        {quarters.map((quarter, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              minWidth: 200,
              p: 2,
              borderRight: 1,
              borderColor: "divider",
              textAlign: "center",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              {quarter.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ position: "relative" }}>
        {epicsWithDates.map((epic, index) => (
          <Box
            key={epic.id}
            sx={{
              display: "flex",
              borderBottom: 1,
              borderColor: "divider",
              minHeight: 60,
              bgcolor: index % 2 === 0 ? "background.paper" : "action.hover",
              "&:hover": {
                bgcolor: "action.selected",
              },
            }}
          >
            <Box
              sx={{
                width: 200,
                flexShrink: 0,
                p: 2,
                borderRight: 1,
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" fontWeight={600} noWrap>
                {epic.epic_id_display || epic.name}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, position: "relative", display: "flex" }}>
              {quarters.map((_quarter, qIndex) => (
                <Box
                  key={qIndex}
                  sx={{
                    flex: 1,
                    minWidth: 200,
                    borderRight: 1,
                    borderColor: "divider",
                    position: "relative",
                  }}
                />
              ))}
              
              <EpicBar
                epic={epic}
                monthStart={yearStart}
                monthEnd={yearEnd}
                onUpdateDates={onUpdateEpicDates}
                isDraggingConnection={isDraggingConnection}
                onStartConnection={handleStartConnection}
                onEndConnection={handleEndConnection}
                draggingFromEpic={draggingFromEpic}
              />
            </Box>
          </Box>
        ))}
      </Box>

      {dependencies.map((dep) => (
        <Xarrow
          key={dep.id}
          start={`${dep.depends_on_epic_id}-right`}
          end={`${dep.epic_id}-left`}
          color="#666"
          strokeWidth={2}
          headSize={6}
          curveness={0.6}
          showHead={true}
          path="smooth"
        />
      ))}

      <Dialog open={pendingConnection !== null} onClose={handleCancelModal}>
        <DialogTitle>Crear Dependencia</DialogTitle>
        <DialogContent sx={{ minWidth: 300, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Tipo de dependencia</InputLabel>
            <Select
              value={dependencyType}
              label="Tipo de dependencia"
              onChange={(e) => setDependencyType(e.target.value)}
            >
              <MenuItem value="finish-to-start">Fin a Inicio (FS)</MenuItem>
              <MenuItem value="start-to-start">Inicio a Inicio (SS)</MenuItem>
              <MenuItem value="finish-to-finish">Fin a Fin (FF)</MenuItem>
              <MenuItem value="start-to-finish">Inicio a Fin (SF)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelModal}>Cancelar</Button>
          <Button onClick={handleConfirmConnection} variant="contained">
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimelineGrid;