import {
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";

type SortMenuProps = {
  anchorEl: HTMLElement | null;
  sortColumn: string;
  sortOrder: "asc" | "desc";
  onClose: () => void;
  onSortColumnChange: (column: string) => void;
  onSortOrderChange: (order: "asc" | "desc") => void;
};

export const SortMenu = ({
  anchorEl,
  sortColumn,
  sortOrder,
  onClose,
  onSortColumnChange,
  onSortOrderChange,
}: SortMenuProps) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{
        sx: { width: 300, p: 2, borderRadius: 2, mt: 1 },
      }}
    >
      <Stack spacing={2}>
        <Typography variant="subtitle2" fontWeight={700}>
          Ordenar por
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Columna</InputLabel>
          <Select
            value={sortColumn}
            label="Columna"
            onChange={(e) => onSortColumnChange(e.target.value)}
            sx={{ borderRadius: 1.5 }}
          >
            <MenuItem value="name">Épica</MenuItem>
            <MenuItem value="project">Proyecto</MenuItem>
            <MenuItem value="phase">Fase</MenuItem>
            <MenuItem value="effort">Esfuerzo estimado</MenuItem>
            <MenuItem value="epicId">ID de épica</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Orden</InputLabel>
          <Select
            value={sortOrder}
            label="Orden"
            onChange={(e) => onSortOrderChange(e.target.value as "asc" | "desc")}
            sx={{ borderRadius: 1.5 }}
          >
            <MenuItem value="asc">Ascendente (A-Z)</MenuItem>
            <MenuItem value="desc">Descendente (Z-A)</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Menu>
  );
};