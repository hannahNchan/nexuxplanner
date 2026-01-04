import { Menu, MenuItem, ListItemText } from "@mui/material";
import { useEffect, useState } from "react";
import { supabase } from "../../../../../lib/supabase";

type User = {
  id: string;
  email: string;
};

type AssigneeMenuProps = {
  anchorEl: HTMLElement | null;
  editingAssignee: string | null;
  onClose: () => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
};

export const AssigneeMenu = ({
  anchorEl,
  editingAssignee,
  onClose,
  onAssigneeChange,
}: AssigneeMenuProps) => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      // En un entorno real, deberías tener una tabla de usuarios del proyecto
      // Por ahora, obtenemos el usuario actual
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUsers([{ id: data.user.id, email: data.user.email || "Usuario" }]);
      }
    };

    if (anchorEl) {
      void loadUsers();
    }
  }, [anchorEl]);

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{ sx: { minWidth: 200 } }}
    >
      <MenuItem
        onClick={() => {
          if (editingAssignee) {
            onAssigneeChange(editingAssignee, null);
          }
          onClose();
        }}
      >
        <ListItemText primary="Sin asignar" />
      </MenuItem>
      {users.map((user) => (
        <MenuItem
          key={user.id}
          onClick={() => {
            if (editingAssignee) {
              onAssigneeChange(editingAssignee, user.id);
            }
            onClose();
          }}
        >
          <ListItemText primary={user.email} />
        </MenuItem>
      ))}
    </Menu>
  );
};