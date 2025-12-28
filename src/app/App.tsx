import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthGate from "../features/auth/AuthGate";
import Layout from "./Layout";
import Board from "../features/board/components/Board";
import EpicsTable from "../features/board/components/EpicsTable";
import QuillEditor from "../features/editor/QuillEditor";
import { Container, Stack, Typography } from "@mui/material";

const App = () => {
  return (
    <BrowserRouter>
      <AuthGate>
        {(session) => (
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Redirect raíz a /tablero */}
              <Route index element={<Navigate to="/tablero" replace />} />
              
              {/* Tablero Kanban */}
              <Route
                path="tablero"
                element={
                  <Container maxWidth="xl">
                    <Stack spacing={3}>
                      <Stack spacing={1}>
                        <Typography variant="h4" fontWeight={700}>
                          Tablero Kanban
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Organiza y gestiona tus tareas con el tablero visual.
                        </Typography>
                      </Stack>
                      <Board userId={session.user.id} />
                    </Stack>
                  </Container>
                }
              />
              
              {/* Épicas */}
              <Route
                path="epicas"
                element={<EpicsTable userId={session.user.id} />}
              />
              
              {/* Editor de Notas */}
              <Route
                path="editor"
                element={
                  <Container maxWidth="xl">
                    <Stack spacing={3}>
                      <Stack spacing={1}>
                        <Typography variant="h4" fontWeight={700}>
                          Editor de Notas
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Documenta tus ideas, acuerdos y notas importantes.
                        </Typography>
                      </Stack>
                      <QuillEditor userId={session.user.id} />
                    </Stack>
                  </Container>
                }
              />
              
              {/* 404 - Ruta no encontrada */}
              <Route path="*" element={<Navigate to="/tablero" replace />} />
            </Route>
          </Routes>
        )}
      </AuthGate>
    </BrowserRouter>
  );
};

export default App;