import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import { useTheme } from "@mui/material/styles";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { uploadImageToStorage } from "../../../../lib/imageUpload";
import { logError } from "../../../../shared/utils/errorHandling";

export type TaskDescriptionEditorHandle = {
  getHTML: () => string;
};

type TaskDescriptionEditorProps = {
  open: boolean;
  initialDescription?: string;
  onError: (message: string) => void;
  onUploadingChange: (isUploading: boolean) => void;
};

const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "link"],
  ["blockquote", "code-block"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["image"],
  ["clean"],
];

const TaskDescriptionEditor = forwardRef<TaskDescriptionEditorHandle, TaskDescriptionEditorProps>(
  ({ open, initialDescription = "", onError, onUploadingChange }, ref) => {
    const theme = useTheme();
    const editorRef = useRef<HTMLDivElement | null>(null);
    const quillRef = useRef<Quill | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const editorBorder = theme.palette.divider;
    const editorToolbarBg = theme.palette.action.selected;
    const editorText = theme.palette.text.primary;
    const editorMuted = theme.palette.text.secondary;

    useImperativeHandle(
      ref,
      () => ({
        getHTML: () => quillRef.current?.root.innerHTML ?? "",
      }),
      []
    );

    const insertImageFromFile = useCallback(
      async (file: File) => {
        if (!quillRef.current) return;

        try {
          onUploadingChange(true);
          const imageUrl = await uploadImageToStorage(file);

          const range = quillRef.current.getSelection(true);
          quillRef.current.insertEmbed(range.index, "image", imageUrl);
          quillRef.current.setSelection(range.index + 1, 0);
        } catch (error) {
          logError("taskEditor.uploadImage", error);
          onError("No se pudo subir la imagen.");
        } finally {
          onUploadingChange(false);
        }
      },
      [onError, onUploadingChange]
    );

    const handlePaste = useCallback(
      async (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return;

        const items = clipboardData.items;
        for (let index = 0; index < items.length; index += 1) {
          if (items[index].type.indexOf("image") !== -1) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const file = items[index].getAsFile();
            if (file) {
              await insertImageFromFile(file);
            }
            return;
          }
        }
      },
      [insertImageFromFile]
    );

    const openFilePicker = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await insertImageFromFile(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    useEffect(() => {
      if (!open) {
        quillRef.current = null;
        return;
      }

      const timer = window.setTimeout(() => {
        if (!editorRef.current) return;

        if (quillRef.current) {
          quillRef.current.root.innerHTML = initialDescription;
          return;
        }

        try {
          const quill = new Quill(editorRef.current, {
            theme: "snow",
            modules: {
              toolbar: {
                container: toolbarOptions,
                handlers: {
                  image: openFilePicker,
                },
              },
            },
            placeholder: "Escribe la descripcion de la tarea...",
          });

          quillRef.current = quill;
          quill.root.innerHTML = initialDescription;
          quill.root.addEventListener("paste", handlePaste, true);
        } catch (error) {
          logError("taskEditor.initQuill", error);
        }
      }, 0);

      return () => {
        window.clearTimeout(timer);
        if (quillRef.current) {
          quillRef.current.root.removeEventListener("paste", handlePaste, true);
          quillRef.current.off("text-change");
        }
      };
    }, [handlePaste, initialDescription, open, openFilePicker]);

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Descripcion
            </Typography>
            <Chip icon={<ImageIcon />} label="Soporta imagenes" size="small" variant="outlined" />
          </Stack>
          <Box
            ref={editorRef}
            sx={{
              ".ql-editor": {
                minHeight: 250,
                maxHeight: 400,
                overflowY: "auto",
                fontSize: 16,
                fontFamily: "'Inter', 'Roboto', sans-serif",
                color: editorText,
                backgroundColor: theme.palette.background.paper,
                "&.ql-blank::before": {
                  color: editorMuted,
                  opacity: 0.8,
                },
              },
              ".ql-container": {
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                borderColor: editorBorder,
                backgroundColor: theme.palette.background.paper,
              },
              ".ql-toolbar": {
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                backgroundColor: editorToolbarBg,
                borderColor: editorBorder,
              },
              ".ql-stroke": { stroke: editorMuted },
              ".ql-fill": { fill: editorMuted },
              ".ql-picker-label": { color: editorMuted },
              ".ql-picker-options": {
                backgroundColor: theme.palette.background.paper,
                borderColor: editorBorder,
              },
              ".ql-tooltip.ql-hidden": {
                display: "none !important",
              },
              ".ql-tooltip": {
                zIndex: 2,
                borderRadius: 1,
                borderColor: editorBorder,
                bgcolor: "background.paper",
                color: editorText,
                boxShadow: theme.shadows[3],
              },
              ".ql-tooltip input[type='text']": {
                color: editorText,
                bgcolor: "background.paper",
                borderColor: editorBorder,
                outline: "none",
              },
              ".ql-toolbar button:hover .ql-stroke": { stroke: theme.palette.primary.main },
              ".ql-toolbar button:hover .ql-fill": { fill: theme.palette.primary.main },
              ".ql-toolbar button.ql-active .ql-stroke": { stroke: theme.palette.primary.main },
              ".ql-toolbar button.ql-active .ql-fill": { fill: theme.palette.primary.main },
            }}
          />
        </Box>
      </>
    );
  }
);

TaskDescriptionEditor.displayName = "TaskDescriptionEditor";

export default TaskDescriptionEditor;
