export type NotificationSeverity = "error" | "info" | "success" | "warning";

type ErrorLike = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
  status?: number;
};

const SUPABASE_ERROR_MESSAGES: Record<string, string> = {
  "23503": "No se puede completar la acción porque hay datos relacionados.",
  "23505": "Ya existe un registro con esos datos.",
  "23514": "Los datos no cumplen una regla de validación.",
  "42501": "No tienes permisos para realizar esta acción.",
  "22P02": "Uno de los identificadores enviados no es válido.",
  PGRST116: "No se encontró el registro solicitado.",
};

const isErrorLike = (error: unknown): error is ErrorLike =>
  typeof error === "object" && error !== null;

export const getErrorMessage = (
  error: unknown,
  fallback = "No se pudo completar la acción. Intenta de nuevo."
) => {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (!isErrorLike(error)) {
    return fallback;
  }

  if (error.code && SUPABASE_ERROR_MESSAGES[error.code]) {
    return SUPABASE_ERROR_MESSAGES[error.code];
  }

  if (error.status === 401) {
    return "Tu sesión expiró. Vuelve a iniciar sesión.";
  }

  if (error.status === 403) {
    return "No tienes permisos para realizar esta acción.";
  }

  const message = error.message?.trim();
  if (!message || message === "[object Object]") {
    return fallback;
  }

  if (message.toLowerCase().includes("failed to fetch")) {
    return "No se pudo conectar con Supabase. Revisa tu conexión.";
  }

  return message;
};

export const logError = (context: string, error: unknown) => {
  console.error(`[${context}]`, error);
};
