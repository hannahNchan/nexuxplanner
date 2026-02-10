import { Avatar, Tooltip, Stack, Typography } from "@mui/material";
import { useUserProfile } from "../../features/users/hooks/useUserProfiles";

type UserAvatarProps = {
  userId: string | null | undefined;
  userEmail?: string;
  size?: number;
  showTooltip?: boolean;
};

const UserAvatar = ({ 
  userId, 
  userEmail = "", 
  size = 36,
  showTooltip = true,
}: UserAvatarProps) => {
  const { profile } = useUserProfile(userId);

  // Determinar qué mostrar en el avatar
  const getAvatarContent = () => {
    if (profile?.avatar_url) {
      return null;
    }

    if (profile?.full_name) {
      const names = profile.full_name.trim().split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return profile.full_name[0].toUpperCase();
    }

    return userEmail ? userEmail[0].toUpperCase() : "U";
  };

  const avatarElement = (
    <Avatar
      src={profile?.avatar_url || undefined}
      sx={{
        width: size,
        height: size,
        bgcolor: "secondary.main",
        fontSize: size * 0.4,
        fontWeight: 600,
      }}
    >
      {getAvatarContent()}
    </Avatar>
  );

  if (!showTooltip) {
    return avatarElement;
  }

  const tooltipContent = (
    <Stack spacing={0.5}>
      {profile?.full_name && (
        <Typography variant="body2" fontWeight={600}>
          {profile.full_name}
        </Typography>
      )}
      {!profile?.full_name && userEmail && (
        <Typography variant="body2" fontWeight={600}>
          {userEmail}
        </Typography>
      )}
      {profile?.organization && (
        <Typography variant="caption" color="text.secondary">
          {profile.organization}
        </Typography>
      )}
      {profile?.job_title && (
        <Typography variant="caption" color="text.secondary">
          {profile.job_title}
        </Typography>
      )}
    </Stack>
  );

  return (
    <Tooltip
      title={tooltipContent}
      arrow
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: "background.paper",
            color: "text.primary",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 2,
          },
        },
        arrow: {
          sx: {
            color: "background.paper",
            '&::before': {
              border: "1px solid",
              borderColor: "divider",
            },
          },
        },
      }}
    >
      {avatarElement}
    </Tooltip>
  );
};

export default UserAvatar;