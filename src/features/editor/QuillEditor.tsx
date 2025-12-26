import { Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useEffect, useRef, useState } from "react";
import { fetchPrimaryBoard } from "../api/boardService";
import { fetchEditorNote, saveEditorNote } from "../api/editorService";

type QuillEditorProps = {
  userId: string;
};

const QuillEditor = ({ userId }: QuillEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const quill = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: "Escribe una descripción o nota rápida...",
    });

    quillRef.current = quill;

    return () => {
      quill.disable();
      quillRef.current = null;
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const loadNote = async () => {
      try {
        const board = await fetchPrimaryBoard(userId);
        if (!board) {
          return;
        }
        setBoardId(board.id);

        const note = await fetchEditorNote(board.id);
        if (note && quillRef.current) {
          quillRef.current.setContents(note.content as unknown);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadNote();
  }, [userId]);

  const handleSave = async () => {
    if (!boardId || !quillRef.current) {
      return;
    }

    setIsSaving(true);
    try {
      const content = quillRef.current.getContents();
      await saveEditorNote(boardId, content);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

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
        <Stack spacing={2}>
          <Box
            ref={editorRef}
            sx={{
              ".ql-container": {
                minHeight: 160,
                fontSize: 16,
              },
            }}
          />
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isSaving || !boardId}
              startIcon={
                isSaving ? <CircularProgress color="inherit" size={16} /> : undefined
              }
            >
              Autoguardar
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default QuillEditor;
