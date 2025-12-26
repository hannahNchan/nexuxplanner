import { supabase } from "../../lib/supabase";

export type EditorNote = {
  id: string;
  board_id: string;
  content: unknown;
};

export const fetchEditorNote = async (boardId: string): Promise<EditorNote | null> => {
  const { data, error } = await supabase
    .from("planner.editor_notes")
    .select("id, board_id, content")
    .eq("board_id", boardId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
};

export const saveEditorNote = async (boardId: string, content: unknown) => {
  const { error } = await supabase.from("planner.editor_notes").upsert({
    board_id: boardId,
    content,
  });

  if (error) {
    throw error;
  }
};
