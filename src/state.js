/**
 * WJ DB Studio — shared app state.
 * (c) 2026 Weeradech Jessadarom — MIT
 */
import { toast } from './utils.js';

export const state = {
  settings: null,
  connections: [],
  active: new Map(),    // connId -> { meta, info }
  currentConnId: null,
  currentDb: new Map(), // connId -> selected db
};

export async function loadSettings() {
  state.settings = await window.wjds.getSettings();
  return state.settings;
}

export async function saveSettings(patch) {
  state.settings = await window.wjds.setSettings(patch);
  return state.settings;
}

export async function loadConnections() {
  state.connections = await window.wjds.listConnections();
  return state.connections;
}

export function connMeta(id) {
  return state.connections.find(c => c.id === id) || null;
}

export function activeInfo(connId) {
  return state.active.get(connId || state.currentConnId) || null;
}

/** Currently selected connection (meta + server info) or null. */
export function current() {
  const id = state.currentConnId;
  if (!id || !state.active.has(id)) return null;
  return { id, meta: connMeta(id), info: state.active.get(id).info };
}

/** Throw-friendly getter for features that need a live connection. */
export function requireConn() {
  const c = current();
  if (!c) { toast('เชื่อมต่อเซิร์ฟเวอร์ก่อน / Connect to a server first', 'err'); throw new Error('no-connection'); }
  return c;
}

export function currentDb(connId) {
  return state.currentDb.get(connId || state.currentConnId) || null;
}

export function setCurrentDb(connId, db) {
  state.currentDb.set(connId, db);
}

/** Schema cache for autocomplete: connId -> { tables: Map(db -> [table]) , columns: Map(table -> [col]) } */
export const schemaCache = new Map();
export function cacheFor(connId) {
  if (!schemaCache.has(connId)) schemaCache.set(connId, { tables: new Map(), columns: new Map(), loadedAt: 0 });
  return schemaCache.get(connId);
}
