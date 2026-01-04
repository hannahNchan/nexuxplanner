import { Box, Typography } from "@mui/material";
import { startOfYear, endOfYear, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { ArcherContainer } from "react-archer";
import EpicBar from "./EpicBar";
import type { EpicWithDetails } from "../../api/epicService";
import type { EpicDependency } from "../../api/dependencyService";

type TimelineGridProps = {
  epics: EpicWithDetails[];
  dependencies: EpicDependency[];
  onUpdateEpicDates: (epicId: string, startDate: string, endDate: string) => void;
  onCreateDependency: (fromEpicId: string, toEpicId: string) => void;
};

const TimelineGrid = ({ epics, dependencies, onUpdateEpicDates, onCreateDependency }: TimelineGridProps) => {
  const today = new Date();
  const yearStart = startOfYear(today);
  const yearEnd = endOfYear(today);

  const quarters = [
    { label: "ENE - MAR", start: startOfMonth(yearStart), end: endOfMonth(addMonths(yearStart, 2)) },
    { label: "ABR - JUN", start: startOfMonth(addMonths(yearStart, 3)), end: endOfMonth(addMonths(yearStart, 5)) },
    { label: "JUL - SEP", start: startOfMonth(addMonths(yearStart, 6)), end: endOfMonth(addMonths(yearStart, 8)) },
    { label: "OCT - DIC", start: startOfMonth(addMonths(yearStart, 9)), end: endOfMonth(addMonths(yearStart, 11)) },
  ];

  const epicsWithDates = epics.filter(epic => epic.start_date && epic.end_date);

  return (
    <ArcherContainer strokeColor="#666">
      <Box sx={{ overflow: "auto", height: "100%" }}>
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
                  onCreateDependency={onCreateDependency}
                  dependencies={dependencies}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </ArcherContainer>
  );
};

export default TimelineGrid;