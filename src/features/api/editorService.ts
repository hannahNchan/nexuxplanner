import { supabase } from "../../lib/supabase";

export type EditorNote = {
  id: string;
  board_id: string;
  content: unknown;
  created_at: string;
  updated_at: string;
  is_snapshot: boolean;
};

/**
 * Obtiene la nota activa (la que se auto-guarda constantemente)
 */
export const fetchActiveNote = async (boardId: string): Promise<EditorNote | null> => {
  const { data, error } = await supabase
    .from("editor_notes")
    .select("*")
    .eq("board_id", boardId)
    .eq("is_snapshot", false)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
};

/**
 * Obtiene todos los snapshots (versiones guardadas manualmente)
 */
export const fetchSnapshots = async (boardId: string): Promise<EditorNote[]> => {
  const { data, error } = await supabase
    .from("editor_notes")
    .select("*")
    .eq("board_id", boardId)
    .eq("is_snapshot", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return data ?? [];
};

/**
 * Auto-guarda la nota activa (actualiza siempre la misma)
 */
export const autoSaveNote = async (boardId: string, content: unknown) => {
  // Buscar si existe una nota activa
  const existingNote = await fetchActiveNote(boardId);

  if (existingNote) {
    // Actualizar la nota activa existente
    const { error } = await supabase
      .from("editor_notes")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingNote.id);

    if (error) throw error;
  } else {
    // Crear la primera nota activa
    const { error } = await supabase.from("editor_notes").insert({
      board_id: boardId,
      content,
      is_snapshot: false,
    });

    if (error) throw error;
  }
};

/**
 * Crea un snapshot (versión manual) del estado actual
 */
export const createSnapshot = async (boardId: string, content: unknown) => {
  // Crear nuevo snapshot
  const { error: insertError } = await supabase.from("editor_notes").insert({
    board_id: boardId,
    content,
    is_snapshot: true,
  });

  if (insertError) throw insertError;

  // Limpiar snapshots antiguos (mantener solo 10)
  await cleanupOldSnapshots(boardId);
};

/**
 * Restaura un snapshot (lo convierte en la nota activa)
 */
export const restoreSnapshot = async (boardId: string, snapshotId: string) => {
  // Obtener el contenido del snapshot
  const { data: snapshot, error: fetchError } = await supabase
    .from("editor_notes")
    .select("content")
    .eq("id", snapshotId)
    .single();

  if (fetchError) throw fetchError;

  // Actualizar la nota activa con el contenido del snapshot
  await autoSaveNote(boardId, snapshot.content);
};

/**
 * Elimina un snapshot específico
 */
export const deleteSnapshot = async (snapshotId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("editor_notes")
      .delete()
      .eq("id", snapshotId)
      .eq("is_snapshot", true); // Solo permitir borrar snapshots, no la nota activa

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error eliminando snapshot:", error);
    return false;
  }
};

/**
 * Limpia snapshots antiguos, dejando solo los 10 más recientes
 */
const cleanupOldSnapshots = async (boardId: string) => {
  const { data: allSnapshots } = await supabase
    .from("editor_notes")
    .select("id")
    .eq("board_id", boardId)
    .eq("is_snapshot", true)
    .order("created_at", { ascending: false });

  if (allSnapshots && allSnapshots.length > 10) {
    const idsToDelete = allSnapshots.slice(10).map((s) => s.id);
    await supabase.from("editor_notes").delete().in("id", idsToDelete);
  }
};