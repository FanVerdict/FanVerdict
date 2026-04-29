// Supabase client — plain fetch, no SDK required
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://egkrjclqwlkokqjcqdsa.supabase.co";
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || "sb_publishable_EVcJqH1aRCMzwVM7GkgUbw_hvsdKG9b";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export const db = {
  async select(table) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?order=created_at.desc`, { headers });
      return res.ok ? res.json() : [];
    } catch { return []; }
  },
  async insert(table, row) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST", headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify(row),
      });
    } catch {}
  },
  async update(table, id, patch) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "PATCH", headers, body: JSON.stringify(patch),
      });
    } catch {}
  },
  async del(table, id) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "DELETE", headers,
      });
    } catch {}
  },
};
