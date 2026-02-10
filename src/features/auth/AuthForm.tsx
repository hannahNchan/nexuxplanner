import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  onSuccess: () => void;
};

const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
            options: {
            emailRedirectTo: undefined,
          }
        });
        if (error) {
          throw error;
        }
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
    <Paper elevation={1} sx={{ p: 4, borderRadius: 3, maxWidth: 420 }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            {mode === "sign-in" ? "Iniciar sesión" : "Crear cuenta"}
          </Typography>
          <Typography color="text.secondary">
            Usa tu correo para entrar a tu tablero.
          </Typography>
        </Stack>

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

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <Stack spacing={1}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting || !email || !password}
          >
            {mode === "sign-in" ? "Entrar" : "Registrarme"}
          </Button>
          <Box textAlign="center">
            <Button
              variant="text"
              size="small"
              onClick={() =>
                setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))
              }
              disabled={isSubmitting}
            >
              {mode === "sign-in"
                ? "¿No tienes cuenta? Regístrate"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </Button>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default AuthForm;
