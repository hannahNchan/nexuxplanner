import { Button, Paper, Stack, Typography, Box, Chip } from "@mui/material";
import BugReportIcon from "@mui/icons-material/BugReport";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useState } from "react";
import { supabase } from "../../../lib/supabase";

type ColumnDebugInfo = {
  id: string;
  name: string;
  position: number;
  board_id: string;
};

type DebugPanelProps = {
  boardId: string | null;
  localColumnOrder: string[];
  localColumns: Record<string, { id: string; title: string; taskIds: string[] }>;
};

const DebugPanel = ({ boardId, localColumnOrder, localColumns }: DebugPanelProps) => {
  const [dbColumns, setDbColumns] = useState<ColumnDebugInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const fetchDbColumns = async () => {
    if (!boardId) {
      console.log("❌ No hay boardId");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("columns")
        .select("id, name, position, board_id")
        .eq("board_id", boardId)
        .order("position", { ascending: true });

      if (error) throw error;

      setDbColumns(data || []);
      setLastCheck(new Date());
      
      console.log("📊 DEBUG - Columnas en BD:", data);
      console.log("📊 DEBUG - Orden local:", localColumnOrder);
    } catch (error) {
      console.error("Error cargando columnas de BD:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const compareOrders = () => {
    if (dbColumns.length === 0) return null;

    const dbOrder = dbColumns.map(c => c.id);
    const matches = JSON.stringify(dbOrder) === JSON.stringify(localColumnOrder);

    return {
      matches,
      dbOrder,
      localOrder: localColumnOrder,
    };
  };

  const comparison = compareOrders();

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mb: 3,
        border: "2px solid #fbbf24",
        backgroundColor: "#fffbeb",
      }}
    >
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <BugReportIcon sx={{ color: "#f59e0b" }} />
            <Typography variant="h6" fontWeight={700} color="#92400e">
              Panel de Debug - Orden de Columnas
            </Typography>
          </Stack>

          <Button
            variant="contained"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchDbColumns}
            disabled={isLoading || !boardId}
            sx={{ bgcolor: "#f59e0b", "&:hover": { bgcolor: "#d97706" } }}
          >
            {isLoading ? "Cargando..." : "Verificar BD"}
          </Button>
        </Stack>

        {/* Info de última verificación */}
        {lastCheck && (
          <Typography variant="caption" color="text.secondary">
            Última verificación: {lastCheck.toLocaleTimeString()}
          </Typography>
        )}

        {/* Comparación de órdenes */}
        {comparison && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="subtitle2" fontWeight={600}>
                Estado:
              </Typography>
              <Chip
                label={comparison.matches ? "✅ SINCRONIZADO" : "❌ DESINCRONIZADO"}
                color={comparison.matches ? "success" : "error"}
                size="small"
              />
            </Stack>

            {/* Orden en Base de Datos */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                📦 Orden en Base de Datos (position):
              </Typography>
              <Stack spacing={1} pl={2}>
                {dbColumns.map((col, index) => (
                  <Stack
                    key={col.id}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      p: 1,
                      bgcolor: "#fff",
                      borderRadius: 1,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <Chip
                      label={`#${index}`}
                      size="small"
                      sx={{ bgcolor: "#dbeafe", color: "#1e40af", minWidth: 40 }}
                    />
                    <Typography variant="body2" fontWeight={600}>
                      {col.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      (position: {col.position})
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "monospace",
                        bgcolor: "#f3f4f6",
                        px: 1,
                        borderRadius: 0.5,
                      }}
                    >
                      {col.id.substring(0, 8)}...
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {/* Orden Local (Estado React) */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                💻 Orden Local (Estado React):
              </Typography>
              <Stack spacing={1} pl={2}>
                {localColumnOrder.map((colId, index) => {
                  const col = localColumns[colId];
                  const dbCol = dbColumns.find(c => c.id === colId);
                  const positionMismatch = dbCol && dbCol.position !== index;

                  return (
                    <Stack
                      key={colId}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{
                        p: 1,
                        bgcolor: positionMismatch ? "#fee2e2" : "#fff",
                        borderRadius: 1,
                        border: `1px solid ${positionMismatch ? "#ef4444" : "#e5e7eb"}`,
                      }}
                    >
                      <Chip
                        label={`#${index}`}
                        size="small"
                        sx={{
                          bgcolor: positionMismatch ? "#fca5a5" : "#dbeafe",
                          color: positionMismatch ? "#991b1b" : "#1e40af",
                          minWidth: 40,
                        }}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {col?.title || "???"}
                      </Typography>
                      {positionMismatch && (
                        <Chip
                          label={`⚠️ BD dice: ${dbCol.position}`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: "monospace",
                          bgcolor: "#f3f4f6",
                          px: 1,
                          borderRadius: 0.5,
                        }}
                      >
                        {colId.substring(0, 8)}...
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>

            {/* Diagnóstico */}
            {!comparison.matches && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: "#fef2f2",
                  borderLeft: "4px solid #ef4444",
                  borderRadius: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} color="error.dark" gutterBottom>
                  🔍 Problema detectado:
                </Typography>
                <Typography variant="body2" color="error.dark">
                  El orden en la base de datos NO coincide con el orden local.
                  <br />
                  <strong>Posible causa:</strong> persistColumnOrder() no se está ejecutando correctamente.
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {/* Instrucciones */}
        {dbColumns.length === 0 && !isLoading && (
          <Box
            sx={{
              p: 2,
              bgcolor: "#fff",
              border: "2px dashed #d1d5db",
              borderRadius: 1,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Haz clic en "Verificar BD" para comparar el orden
            </Typography>
          </Box>
        )}

        {/* Info adicional */}
        <Box sx={{ pt: 2, borderTop: "1px solid #e5e7eb" }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Board ID:</strong> {boardId || "No disponible"}
            <br />
            <strong>Columnas locales:</strong> {localColumnOrder.length}
            <br />
            <strong>Columnas en BD:</strong> {dbColumns.length}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

export default DebugPanel;