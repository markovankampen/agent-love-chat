import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "profile-photos";
const SIGNED_URL_EXPIRY = 3600; // 1 hour

// Fallback bucket for legacy photos that may still be in temp
const FALLBACK_BUCKET = "profile-photos-temp";

/**
 * Generates a fresh signed URL from a stored storage path.
 * If the value is already a full URL (legacy data), returns it as-is.
 */
export function useSignedUrl(storedPath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storedPath) {
      setUrl(null);
      return;
    }

    // If it's already a full URL (legacy data), use as-is
    if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
      setUrl(storedPath);
      return;
    }

    let cancelled = false;

    async function sign() {
      // Try permanent bucket first
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storedPath!, SIGNED_URL_EXPIRY);

      if (!cancelled) {
        if (error) {
          // Fallback to legacy temp bucket
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from(FALLBACK_BUCKET)
            .createSignedUrl(storedPath!, SIGNED_URL_EXPIRY);
          if (!cancelled) {
            if (fallbackError) {
              console.error("Failed to create signed URL:", fallbackError);
              setUrl(null);
            } else {
              setUrl(fallbackData.signedUrl);
            }
          }
        } else {
          setUrl(data.signedUrl);
        }
      }
    }

    sign();
    return () => { cancelled = true; };
  }, [storedPath]);

  return url;
}

/**
 * Batch-generate signed URLs for multiple paths.
 * Returns a map of path -> signedUrl.
 */
export function useSignedUrls(paths: (string | null | undefined)[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const validPaths = paths.filter((p): p is string => !!p);
    if (validPaths.length === 0) {
      setUrls({});
      return;
    }

    let cancelled = false;

    async function signAll() {
      const result: Record<string, string> = {};

      await Promise.all(
        validPaths.map(async (path) => {
          if (path.startsWith("http://") || path.startsWith("https://")) {
            result[path] = path;
            return;
          }
          // Try permanent bucket first, fallback to temp
          let { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, SIGNED_URL_EXPIRY);
          if (error) {
            const fallback = await supabase.storage
              .from(FALLBACK_BUCKET)
              .createSignedUrl(path, SIGNED_URL_EXPIRY);
            data = fallback.data;
            error = fallback.error;
          }
          if (!error && data) {
            result[path] = data.signedUrl;
          }
        })
      );

      if (!cancelled) setUrls(result);
    }

    signAll();
    return () => { cancelled = true; };
  }, [JSON.stringify(paths)]);

  return urls;
}
