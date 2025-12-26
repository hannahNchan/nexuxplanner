import { Box, Container, Stack, Typography } from "@mui/material";
import Board from "../features/board/components/Board";
import QuillEditor from "../features/editor/QuillEditor";

const App = () => {
  return (
    <Box sx={{ minHeight: "100vh", py: 6 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Stack spacing={1}>
            <Typography variant="h3" fontWeight={700}>
              Nexux Planner
            </Typography>
            <Typography color="text.secondary">
              Planeador tipo Monday / Trello / Jira con drag & drop y editor WYSIWYG.
            </Typography>
          </Stack>
          <Board />
          <QuillEditor />
        </Stack>
      </Container>
    </Box>
  );
};

export default App;
