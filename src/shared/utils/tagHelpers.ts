// 🎨 Colores para tags
const TAG_COLORS = [
  "#FF6B6B", // Rojo coral
  "#4ECDC4", // Turquesa
  "#45B7D1", // Azul cielo
  "#FFA07A", // Salmón
  "#98D8C8", // Menta
  "#F7DC6F", // Amarillo
  "#BB8FCE", // Púrpura
  "#85C1E2", // Azul claro
  "#F8B195", // Melocotón
  "#6C5CE7", // Índigo
];

// 🎭 Mapeo de palabras a emoticonos
const EMOJI_MAP: Record<string, string> = {
  // Tecnología
  "api": "🔌",
  "backend": "⚙️",
  "frontend": "🎨",
  "mobile": "📱",
  "web": "🌐",
  "app": "📱",
  "aplicacion": "📱",
  "database": "🗄️",
  "bd": "🗄️",
  "basededatos": "🗄️",
  "cloud": "☁️",
  "nube": "☁️",
  "server": "🖥️",
  "servidor": "🖥️",
  "code": "💻",
  "codigo": "💻",
  "bug": "🐛",
  "error": "🐛",
  "feature": "✨",
  "caracteristica": "✨",
  "fix": "🔧",
  "arreglo": "🔧",
  "test": "🧪",
  "prueba": "🧪",
  "deploy": "🚀",
  "despliegue": "🚀",
  "ci": "🔄",
  "cd": "🔄",
  "docker": "🐳",
  "kubernetes": "☸️",
  "k8s": "☸️",
  
  // Proyecto/Gestión
  "proyecto": "📁",
  "project": "📁",
  "task": "✅",
  "tarea": "✅",
  "sprint": "🏃",
  "epic": "🎯",
  "epica": "🎯",
  "milestone": "🏁",
  "hito": "🏁",
  "deadline": "⏰",
  "fecha": "⏰",
  "urgent": "🔥",
  "urgente": "🔥",
  "priority": "⭐",
  "prioridad": "⭐",
  "importante": "⭐",
  
  // Categorías
  "design": "🎨",
  "diseño": "🎨",
  "ui": "🖼️",
  "ux": "👤",
  "research": "🔍",
  "investigacion": "🔍",
  "busqueda": "🔍",
  "docs": "📚",
  "documentacion": "📚",
  "documentation": "📚",
  "meeting": "👥",
  "reunion": "👥",
  "junta": "👥",
  
  // Estados
  "done": "✅",
  "hecho": "✅",
  "completado": "✅",
  "progress": "🔄",
  "progreso": "🔄",
  "enprogreso": "🔄",
  "blocked": "🚫",
  "bloqueado": "🚫",
  "review": "👀",
  "revision": "👀",
  "revisar": "👀",
  
  // Negocios
  "sales": "💰",
  "ventas": "💰",
  "marketing": "📢",
  "publicidad": "📢",
  "product": "📦",
  "producto": "📦",
  "customer": "👤",
  "cliente": "👤",
  "support": "🆘",
  "soporte": "🆘",
  "ayuda": "🆘",
  
  // General
  "new": "🆕",
  "nuevo": "🆕",
  "update": "🔄",
  "actualizar": "🔄",
  "actualizacion": "🔄",
  "improve": "📈",
  "mejorar": "📈",
  "mejora": "📈",
  "idea": "💡",
  "note": "📝",
  "nota": "📝",
  "important": "❗",
  "security": "🔒",
  "seguridad": "🔒",
  "performance": "⚡",
  "rendimiento": "⚡",
  "optimization": "⚡",
  "optimizacion": "⚡",
};

/**
 * Obtiene un emoji para una palabra usando mapeo determinístico
 */
export const getEmojiForTag = (tag: string): string => {
  const lowerTag = tag.toLowerCase().trim();
  
  // Buscar coincidencia exacta
  if (EMOJI_MAP[lowerTag]) {
    return EMOJI_MAP[lowerTag];
  }

  // Buscar coincidencia parcial (la palabra contiene alguna clave)
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lowerTag.includes(key)) {
      return emoji;
    }
  }

  // Emoticonos por defecto basados en hash determinístico
  const defaultEmojis = ["🏷️", "📌", "🔖", "💼", "🎯", "🌟", "💫", "✨", "🎪", "🎭"];
  
  // Usar hash del tag para obtener siempre el mismo emoji
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % defaultEmojis.length;
  return defaultEmojis[index];
};

/**
 * Genera un color consistente para un tag basado en su contenido
 */
export const getColorForTag = (tag: string): string => {
  // Usar el string como semilla para obtener siempre el mismo color
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
};

/**
 * Valida si un tag es válido (no vacío, no duplicado)
 */
export const isValidTag = (tag: string, existingTags: string[]): boolean => {
  const trimmed = tag.trim();
  return trimmed.length > 0 && !existingTags.includes(trimmed);
};