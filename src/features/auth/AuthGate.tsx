import { CircularProgress, Stack, Typography } from "@mui/material";
import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AuthForm from "./AuthForm";

type AuthGateProps = {
  children: (session: Session) => ReactNode;
};

const AuthGate = ({ children }: AuthGateProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
      }
      setSession(data.session ?? null);
      setIsLoading(false);
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    void loadSession();

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <Stack spacing={2} alignItems="center" py={8}>
        <CircularProgress />
        <Typography color="text.secondary">Verificando sesión...</Typography>
      </Stack>
    );
  }

  if (!session) {
    return (
      <Stack spacing={3} alignItems="center" py={6}>
        <Typography variant="h4" fontWeight={700}>
          Nexux Planner
        </Typography>
        <AuthForm onSuccess={() => undefined} />
      </Stack>
    );
  }

  return <>{children(session)}</>;
};

export default AuthGate;