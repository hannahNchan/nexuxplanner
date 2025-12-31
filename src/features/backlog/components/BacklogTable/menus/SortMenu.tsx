import { Menu, MenuItem, ListItemText, ListItemIcon } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

type SortColumn = "title" | "assignee" | "priority" | "story_points" | "epic" | "task_id" | "created_at";
type SortOrder = "asc" | "desc";

type SortMenuProps = {
  anchorEl: HTMLElement | null;
  sortColumn: SortColumn;
  sortOrder: SortOrder;
  onClose: () => void;
  onSortColumnChange: (column: SortColumn) => void;
  onSortOrderChange: (order: SortOrder) => void;
};

export const SortMenu = ({
  anchorEl,
  sortColumn,
  sortOrder,
  onClose,
  onSortColumnChange,
  onSortOrderChange,
}: SortMenuProps) => {
  const sortOptions: { value: SortColumn; label: string }[] = [
    { value: "task_id", label: "ID de Tarea" },
    { value: "title", label: "Título" },
    { value: "assignee", label: "Responsable" },
    { value: "priority", label: "Prioridad" },
    { value: "story_points", label: "Story Points" },
    { value: "epic", label: "Épica" },
    { value: "created_at", label: "Fecha de creación" },
  ];

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{ sx: { minWidth: 250 } }}
    >
      {sortOptions.map((option) => (
        <MenuItem
          key={option.value}
          selected={sortColumn === option.value}
          onClick={() => {
            onSortColumnChange(option.value);
            onClose();
          }}
        >
          <ListItemText primary={option.label} />
          {sortColumn === option.value && (
            <ListItemIcon sx={{ minWidth: 32 }}>
              {sortOrder === "asc" ? (
                <ArrowUpwardIcon fontSize="small" />
              ) : (
                <ArrowDownwardIcon fontSize="small" />
              )}
            </ListItemIcon>
          )}
        </MenuItem>
      ))}
      <MenuItem
        onClick={() => {
          onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
          onClose();
        }}
      >
        <ListItemText
          primary={sortOrder === "asc" ? "Cambiar a descendente" : "Cambiar a ascendente"}
        />
      </MenuItem>
    </Menu>
  );
};