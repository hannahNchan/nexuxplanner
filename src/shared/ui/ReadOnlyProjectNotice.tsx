import { Alert, Typography } from "@mui/material";

type ReadOnlyProjectNoticeProps = {
  projectName?: string;
};

const ReadOnlyProjectNotice = ({ projectName }: ReadOnlyProjectNoticeProps) => (
  <Alert severity="info" variant="outlined">
    <Typography variant="body2">
      Este proyecto{projectName ? ` (${projectName})` : ""} es visible para tu organización,
      pero estás en modo lectura. Para crear, editar o mover trabajo, un colaborador del proyecto
      debe agregarte al proyecto.
    </Typography>
  </Alert>
);

export default ReadOnlyProjectNotice;
