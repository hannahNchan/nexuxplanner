const normalizeRedirectUrl = (url: string) => url.replace(/\/+$/, "");

export const getAuthRedirectUrl = () => {
  const configuredUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;

  if (typeof configuredUrl === "string" && configuredUrl.trim()) {
    return normalizeRedirectUrl(configuredUrl.trim());
  }

  return normalizeRedirectUrl(window.location.origin);
};
