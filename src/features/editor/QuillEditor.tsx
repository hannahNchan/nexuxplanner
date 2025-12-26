import { Box, Paper, Stack, Typography } from "@mui/material";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useEffect, useRef } from "react";

const QuillEditor = () => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const quill = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: "Escribe una descripción o nota rápida...",
    });

    return () => {
      quill.disable();
      editorRef.current = null;
    };
  }, []);

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={700}>
          Editor de notas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Usa Quill para documentar tareas, acuerdos o descripciones.
        </Typography>
      </Stack>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Box
          ref={editorRef}
          sx={{
            ".ql-container": {
              minHeight: 160,
              fontSize: 16,
            },
          }}
        />
      </Paper>
    </Stack>
  );
};

export default QuillEditor;
