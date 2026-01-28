
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new Database(dbPath);

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    json_data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export const getAllProjects = () => {
    const stmt = db.prepare('SELECT json_data FROM projects ORDER BY updated_at DESC');
    const rows = stmt.all();
    return rows.map(row => JSON.parse(row.json_data));
};

export const saveProject = (project) => {
    const stmt = db.prepare(`
    INSERT INTO projects (id, json_data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
    json_data = excluded.json_data,
    updated_at = CURRENT_TIMESTAMP
  `);
    stmt.run(project.id, JSON.stringify(project));
};

export const deleteProject = (id) => {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
};
