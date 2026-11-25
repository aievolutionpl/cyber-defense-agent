import crypto from "node:crypto";
import { StateStore } from "./scope.mjs";

export function createProject(rootDir, name) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80 || /[\u0000-\u001f]/.test(name)) {
    throw new Error("INVALID_PROJECT_NAME");
  }
  const project = { id: crypto.randomUUID(), name: name.trim(), createdAt: new Date().toISOString() };
  new StateStore(rootDir).write("projects", project.id, project);
  return project;
}

export function projectFor(rootDir, id) {
  if (!id) return null;
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) throw new Error("INVALID_PROJECT");
  const project = new StateStore(rootDir).read("projects", id);
  if (project.id !== id || typeof project.name !== "string" || typeof project.createdAt !== "string") throw new Error("INVALID_PROJECT");
  return project;
}

export function listProjects(rootDir) {
  const store = new StateStore(rootDir);
  return store.list("projects").flatMap(id => {
    try { return [projectFor(rootDir, id)]; }
    catch { return []; } // Isolate an unreadable record from other projects.
  })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function setArchived(rootDir, { sessionId, archived }) {
  if (typeof archived !== "boolean") throw new Error("INVALID_SESSION");
  const store = new StateStore(rootDir);
  const session = store.read("sessions", sessionId);
  if (!session.chat || session.status === "running") throw new Error("CHAT_BUSY");
  store.write("conversations", session.conversationId || sessionId, { archived });
}
