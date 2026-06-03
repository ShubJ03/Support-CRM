const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const DB_PATH = path.join(__dirname, "crm.db");

let db;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      priority TEXT NOT NULL DEFAULT 'Medium',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      note_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  try {
    db.run("ALTER TABLE tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium'");
    save();
  } catch(e) {
    // column already exists, ignore
  }

  save();
  return db;
}

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function generateTicketId() {
  const result = db.exec("SELECT COUNT(*) as count FROM tickets");
  const count = result[0]?.values[0][0] || 0;
  return "TKT-" + String(Number(count) + 1).padStart(4, "0");
}

function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

async function createTicket({ customer_name, customer_email, subject, description, priority = 'Medium' }) {
  await getDb();
  const ticket_id = generateTicketId();
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO tickets (ticket_id, customer_name, customer_email, subject, description, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Open', ?, ?, ?)",
    [ticket_id, customer_name, customer_email, subject, description, priority, now, now]
  );
  save();
  return { ticket_id, created_at: now };
}

async function getAllTickets({ status, search } = {}) {
  await getDb();
  let query = "SELECT ticket_id, customer_name, customer_email, subject, status, priority, created_at FROM tickets WHERE 1=1";
  const params = [];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (search) {
    query += " AND (customer_name LIKE ? OR customer_email LIKE ? OR ticket_id LIKE ? OR subject LIKE ? OR description LIKE ?)";
    const like = "%" + search + "%";
    params.push(like, like, like, like, like);
  }

  query += " ORDER BY created_at DESC";
  const result = db.exec(query, params);
  return rowsToObjects(result);
}

async function getTicketById(ticket_id) {
  await getDb();
  const ticketResult = db.exec("SELECT * FROM tickets WHERE ticket_id = ?", [ticket_id]);
  const tickets = rowsToObjects(ticketResult);
  if (tickets.length === 0) return null;

  const notesResult = db.exec("SELECT * FROM notes WHERE ticket_id = ? ORDER BY created_at ASC", [ticket_id]);
  const notes = rowsToObjects(notesResult);
  return { ...tickets[0], notes };
}

async function updateTicket(ticket_id, { status, note_text }) {
  await getDb();
  const now = new Date().toISOString();
  if (status) {
    db.run("UPDATE tickets SET status = ?, updated_at = ? WHERE ticket_id = ?", [status, now, ticket_id]);
  }
  if (note_text && note_text.trim()) {
    db.run("INSERT INTO notes (ticket_id, note_text, created_at) VALUES (?, ?, ?)", [ticket_id, note_text.trim(), now]);
  }
  save();
  return { success: true, updated_at: now };
}

async function getStats() {
  await getDb();
  const total = rowsToObjects(db.exec("SELECT COUNT(*) as count FROM tickets"))[0]?.count || 0;
  const open = rowsToObjects(db.exec("SELECT COUNT(*) as count FROM tickets WHERE status = 'Open'"))[0]?.count || 0;
  const inProgress = rowsToObjects(db.exec("SELECT COUNT(*) as count FROM tickets WHERE status = 'In Progress'"))[0]?.count || 0;
  const closed = rowsToObjects(db.exec("SELECT COUNT(*) as count FROM tickets WHERE status = 'Closed'"))[0]?.count || 0;
  return { total, open, inProgress, closed };
}

module.exports = { createTicket, getAllTickets, getTicketById, updateTicket, getStats };
