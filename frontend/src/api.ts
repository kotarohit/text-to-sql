import { getToken } from './auth';

const API_BASE = 'http://localhost:8000';

export async function apiGet(path: string) {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}
