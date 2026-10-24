import type { JSONContent } from "@tiptap/core";
import type { Comment } from "./comments";
import { writeStorage, DOCUMENT_KEY, COMMENTS_KEY, TITLE_KEY } from "./storage";
import { isDocument } from "./documentUtils";

export const SESSION_KEY = "docs-editor-lab-session-v4";
export type Session = { version: 2; doc: JSONContent; comments: Comment[]; title: string; savedAt: string };
export function readSession(): Partial<Session> {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<Session>;
      if (data.version !== 2 || !isDocument(data.doc)) throw new Error("Invalid saved session");
      return data;
    }
    return {
      doc: JSON.parse(localStorage.getItem(DOCUMENT_KEY) || "null") as JSONContent,
      comments: JSON.parse(localStorage.getItem(COMMENTS_KEY) || "[]") as Comment[],
      title: JSON.parse(localStorage.getItem(TITLE_KEY) || '"Product planning notes"') as string,
    };
  } catch { return {}; }
}
export function saveSession(doc: JSONContent, comments: Comment[], title: string) {
  const snapshot: Session = { version: 2, doc, comments, title, savedAt: new Date().toISOString() };
  return writeStorage(SESSION_KEY, snapshot);
}
