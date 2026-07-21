import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";

type OrganizationLogoCropDialogProps = {
  open: boolean;
  file: File | null;
  title?: string;
  onCancel: () => void;
  onCrop: (file: File) => void;
};

const VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 512;

const createImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    image.src = src;
  });

const canvasToFile = (canvas: HTMLCanvasElement, fileName: string) =>
  new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar el logo recortado."));
          return;
        }

        resolve(new File([blob], fileName, { type: "image/webp" }));
      },
      "image/webp",
      0.92
    );
  });

const OrganizationLogoCropDialog = ({
  open,
  file,
  title = "Recortar logo",
  onCancel,
  onCrop,
}: OrganizationLogoCropDialogProps) => {
  const theme = useTheme();
  const [imageUrl, setImageUrl] = useState("");
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [error, setError] = useState("");
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    if (!file || !open) {
      setImageUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setError("");

    void createImage(url)
      .then((image) => {
        setImageSize({
          width: image.naturalWidth || 1,
          height: image.naturalHeight || 1,
        });
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : "No se pudo leer la imagen.");
      });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, open]);

  const cropMetrics = useMemo(() => {
    const aspect = imageSize.width / imageSize.height;
    const baseWidth = aspect >= 1 ? VIEWPORT_SIZE * aspect : VIEWPORT_SIZE;
    const baseHeight = aspect >= 1 ? VIEWPORT_SIZE : VIEWPORT_SIZE / aspect;
    const displayWidth = baseWidth * zoom;
    const displayHeight = baseHeight * zoom;
    const maxOffsetX = Math.max(0, (displayWidth - VIEWPORT_SIZE) / 2);
    const maxOffsetY = Math.max(0, (displayHeight - VIEWPORT_SIZE) / 2);
    const clampedOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
    const clampedOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY));

    return {
      displayWidth,
      displayHeight,
      maxOffsetX,
      maxOffsetY,
      x: (VIEWPORT_SIZE - displayWidth) / 2 + clampedOffsetX,
      y: (VIEWPORT_SIZE - displayHeight) / 2 + clampedOffsetY,
    };
  }, [imageSize, offsetX, offsetY, zoom]);

  useEffect(() => {
    setOffsetX((current) => Math.max(-cropMetrics.maxOffsetX, Math.min(cropMetrics.maxOffsetX, current)));
    setOffsetY((current) => Math.max(-cropMetrics.maxOffsetY, Math.min(cropMetrics.maxOffsetY, current)));
  }, [cropMetrics.maxOffsetX, cropMetrics.maxOffsetY]);

  const handleCrop = async () => {
    if (!file || !imageUrl) return;

    try {
      setIsCropping(true);
      setError("");

      const image = await createImage(imageUrl);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("No se pudo preparar el recorte.");
      }

      context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const scale = cropMetrics.displayWidth / image.naturalWidth;
      const sourceX = Math.max(0, -cropMetrics.x / scale);
      const sourceY = Math.max(0, -cropMetrics.y / scale);
      const sourceSize = VIEWPORT_SIZE / scale;

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      const croppedFile = await canvasToFile(canvas, "organization-logo.webp");
      onCrop(croppedFile);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo recortar el logo.");
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Ajusta la imagen dentro del cuadro. El resultado sera un logo cuadrado listo para el sidebar.
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              py: 1,
            }}
          >
            <Box
              sx={{
                width: VIEWPORT_SIZE,
                height: VIEWPORT_SIZE,
                position: "relative",
                overflow: "hidden",
                borderRadius: 1,
                bgcolor: alpha(theme.palette.text.primary, 0.06),
                border: `2px solid ${theme.palette.primary.main}`,
                boxShadow: `0 0 0 999px ${alpha(theme.palette.common.black, 0.08)}`,
              }}
            >
              {imageUrl ? (
                <Box
                  component="img"
                  src={imageUrl}
                  alt="Vista previa del logo"
                  sx={{
                    position: "absolute",
                    left: cropMetrics.x,
                    top: cropMetrics.y,
                    width: cropMetrics.displayWidth,
                    height: cropMetrics.displayHeight,
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              ) : null}
            </Box>
          </Box>

          <Stack spacing={1.5}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Zoom
              </Typography>
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.01}
                onChange={(_, value) => setZoom(Array.isArray(value) ? value[0] : value)}
              />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Horizontal
              </Typography>
              <Slider
                value={offsetX}
                min={-cropMetrics.maxOffsetX}
                max={cropMetrics.maxOffsetX}
                step={1}
                disabled={cropMetrics.maxOffsetX === 0}
                onChange={(_, value) => setOffsetX(Array.isArray(value) ? value[0] : value)}
              />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Vertical
              </Typography>
              <Slider
                value={offsetY}
                min={-cropMetrics.maxOffsetY}
                max={cropMetrics.maxOffsetY}
                step={1}
                disabled={cropMetrics.maxOffsetY === 0}
                onChange={(_, value) => setOffsetY(Array.isArray(value) ? value[0] : value)}
              />
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isCropping}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleCrop} disabled={!file || isCropping}>
          {isCropping ? "Recortando..." : "Usar logo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrganizationLogoCropDialog;
