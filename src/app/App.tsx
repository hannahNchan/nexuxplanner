import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./ThemeContext";
import AuthGate from "../features/auth/AuthGate";
import Layout from "./Layout";
import Board from "../features/board/components/Board";
import EpicsTable from "../features/board/components/EpicsTable/EpicsTable";
import { BacklogTable } from "../features/backlog";
import Roadmap from "../features/roadmap/components/Roadmap";
import QuillEditor from "../features/editor/QuillEditor";
import { Container, Stack, Typography } from "@mui/material";
import { ProjectProvider } from "../shared/contexts/ProjectContext";

const App = () => {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <BrowserRouter>
          <AuthGate>
            {(session) => (
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/tablero" replace />} />
                  
                  <Route
                    path="tablero"
                    element={
                      <Container maxWidth={false}>
                        <Stack spacing={3}>
                          <Stack spacing={1}>
                            <Typography variant="h4" fontWeight={700}>
                              Tablero de Scrum
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
                  
                  <Route
                    path="epicas"
                    element={<EpicsTable userId={session.user.id} />}
                  />
                  
                  <Route
                    path="backlog"
                    element={<BacklogTable userId={session.user.id} />}
                  />

                  <Route
                    path="roadmap"
                    element={<Roadmap userId={session.user.id} />}
                  />
                  
                  <Route
                    path="editor"
                    element={
                      <Container maxWidth={false}>
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
                  
                  <Route path="*" element={<Navigate to="/tablero" replace />} />
                </Route>
              </Routes>
            )}
          </AuthGate>
        </BrowserRouter>
      </ProjectProvider>
    </ThemeProvider>
  );
};

export default App;