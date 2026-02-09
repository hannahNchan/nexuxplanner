import { Paper, Stack, Typography, Chip } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import type { Task } from "../../../shared/types/board";
import UserAvatar from "../../../shared/ui/UserAvatar";

type TaskCardProps = {
  task: Task;
  onClick: () => void;
  currentUserId?: string;
  isDragging?: boolean;
  currentUserEmail?: string;
};

const TaskCard = ({
  task,
  onClick,
  currentUserId,
  isDragging = false,
  currentUserEmail = "",
}: TaskCardProps) => {
  const theme = useTheme();
  // const isAssignedToMe = task.assignee_id === currentUserId;
  const displayUserId = task.assignee_id || currentUserId;
  const displayUserEmail = task.assignee_id ? "" : currentUserEmail;

  return (
    <Paper
      elevation={isDragging ? 8 : 1}
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 1,
        bgcolor: isDragging
          ? alpha(theme.palette.warning.main, 0.2)
          : "background.paper",
        border: isDragging
          ? `2px solid ${theme.palette.warning.main}`
          : `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        cursor: isDragging ? "grabbing" : "pointer",
        transform: isDragging ? "rotate(3deg)" : "none",
        transition: "all 0.2s ease-in-out",
        boxShadow: isDragging ? theme.shadows[8] : theme.shadows[1],
        "&:hover": {
          elevation: 3,
          transform: isDragging ? "rotate(3deg)" : "translateY(-2px)",
          bgcolor: isDragging
            ? alpha(theme.palette.warning.main, 0.2)
            : "action.hover",
          borderColor: isDragging
            ? theme.palette.warning.main
            : alpha(theme.palette.primary.main, 0.3),
          boxShadow: theme.shadows[3],
        },
      }}
    >
      <Stack>
        <Stack direction="column" justifyContent="start" alignItems="start" spacing={1}>
          <Typography fontWeight={600} fontSize={20}>
            {task.title}
          </Typography>
          {task.subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {task.subtitle}
            </Typography>
          )}
          {task.epic_name && (
            <Chip
              label={task.epic_name.toUpperCase()}
              size="small"
              sx={{
                height: 24,
                padding: "0 3px",
                borderRadius: 0.8,
                fontSize: "0.7rem",
                fontWeight: 600,
                bgcolor:
                  task.epic_color || alpha(theme.palette.secondary.main, 0.1),
                color: "#fff",
                border: `1px solid ${alpha(task.epic_color || theme.palette.secondary.main, 0.3)}`,
                "& .MuiChip-icon": {
                  color: "#fff !important",
                },
                "& .MuiChip-label": {
                  px: 0,
                },
              }}
            />
          )}
        </Stack>
        {/* <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          {isAssignedToMe && (
            <Chip
              icon={<PersonIcon sx={{ fontSize: 16 }} />}
              label="Asignada a ti"
              size="small"
              color="primary"
              sx={{
                borderRadius: 1,
                height: 20,
                fontSize: "0.75rem",
                fontWeight: 600,
                alignSelf: "flex-start",
              }}
            />
          )}
        </Stack> */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              overflow: "hidden",
              fontSize: 12,
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {task.task_id_display || "SIN-ID"}
          </Typography>
          <UserAvatar 
            userId={displayUserId}
            userEmail={displayUserEmail}
            size={36}
            showTooltip={true}
          />
        </Stack>
      </Stack>
    </Paper>
  );
};

export default TaskCard;
