import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { getAuthRedirectUrl } from "./authRedirect";

type AuthMode = "google" | "email";

type AuthFormProps = {
  onSuccess: () => void;
};

const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) {
        throw error;
      }

      onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("No se pudo autenticar.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("No se pudo autenticar.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper elevation={1} sx={{ p: 4, borderRadius: 3, width: "100%", maxWidth: 420 }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            Entrar a Nexus Planner
          </Typography>
          <Typography color="text.secondary">
            Usa tu cuenta de Google para continuar.
          </Typography>
        </Stack>

        <Button
          variant="contained"
          size="large"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          sx={{
            justifyContent: "center",
            gap: 1.5,
            textTransform: "none",
            py: 1.25,
          }}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: "50%",
              bgcolor: "background.paper",
              color: "text.primary",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            G
          </Box>
          Continuar con Google
        </Button>

        <Divider />

        {mode === "email" && (
          <Stack spacing={2}>
            <TextField
              label="Correo"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
            />
          </Stack>
        )}

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <Stack spacing={1}>
          {mode === "email" && (
            <Button
              variant="outlined"
              onClick={handleEmailSignIn}
              disabled={isSubmitting || !email || !password}
            >
              Entrar con correo
            </Button>
          )}
          <Box textAlign="center">
            <Button
              variant="text"
              size="small"
              onClick={() =>
                setMode((current) => (current === "google" ? "email" : "google"))
              }
              disabled={isSubmitting}
            >
              {mode === "google" ? "Entrar con correo" : "Volver a Google"}
            </Button>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default AuthForm;
