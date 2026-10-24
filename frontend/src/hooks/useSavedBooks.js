import { useCallback, useEffect, useState } from "react";

const KEY = "savedBooks";

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

// Saved books live in this browser only (localStorage), so no backend change is needed.
export default function useSavedBooks() {
  const [saved, setSaved] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* storage unavailable: saving just won't persist */
    }
  }, [saved]);

  const toggle = useCallback(
    (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    []
  );
  const isSaved = useCallback((id) => saved.includes(id), [saved]);

  return { saved, toggle, isSaved };
}
