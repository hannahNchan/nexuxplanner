import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type ChannelScope = "project" | "user" | "organization";

type ChannelNameOptions = {
  scope: ChannelScope;
  scopeId: string;
  topic: string;
  subtopic?: string | null;
  unique?: boolean;
};

type DebouncedCallback = {
  run: () => void;
  cancel: () => void;
};

const sanitizeSegment = (segment: string) =>
  segment.trim().replace(/[^a-zA-Z0-9_-]/g, "-");

export const createRealtimeChannelName = ({
  scope,
  scopeId,
  topic,
  subtopic,
  unique = true,
}: ChannelNameOptions) => {
  const segments = [scope, scopeId, topic, subtopic]
    .filter((segment): segment is string => Boolean(segment))
    .map(sanitizeSegment);

  if (unique) {
    segments.push(crypto.randomUUID());
  }

  return segments.join(":");
};

export const createDebouncedRealtimeCallback = (
  callback: () => void,
  delayMs = 300
): DebouncedCallback => {
  let timer: number | null = null;

  return {
    run: () => {
      if (timer) {
        window.clearTimeout(timer);
      }

      timer = window.setTimeout(() => {
        callback();
        timer = null;
      }, delayMs);
    },
    cancel: () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    },
  };
};

export const removeRealtimeChannel = (channel: RealtimeChannel | null) => {
  if (channel) {
    void supabase.removeChannel(channel);
  }
};
