import { supabase } from "./supabase";

export const uploadImageToStorage = async (file: File): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("task-images")
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("task-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const uploadBase64ImageToStorage = async (base64: string): Promise<string> => {
  const matches = base64.match(/^data:([A-Za-z+\-/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 string");
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

  const fileExt = contentType.split("/")[1];
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("task-images")
    .upload(filePath, buffer, {
      contentType,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("task-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
};