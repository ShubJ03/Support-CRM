const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// POST /api/tickets
app.post("/api/tickets", async (req, res) => {
  const { customer_name, customer_email, subject, description, priority } = req.body;
  if (!customer_name || !customer_email || !subject || !description)
    return res.status(400).json({ error: "All fields are required." });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customer_email))
    return res.status(400).json({ error: "Invalid email address." });
  try {
    const result = await db.createTicket({ customer_name, customer_email, subject, description, priority });
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create ticket." });
  }
});

// GET /api/tickets
app.get("/api/tickets", async (req, res) => {
  const { status, search } = req.query;
  try {
    const tickets = await db.getAllTickets({ status, search });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tickets." });
  }
});

// GET /api/tickets/:ticket_id
app.get("/api/tickets/:ticket_id", async (req, res) => {
  try {
    const ticket = await db.getTicketById(req.params.ticket_id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found." });
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ticket." });
  }
});

// PUT /api/tickets/:ticket_id
app.put("/api/tickets/:ticket_id", async (req, res) => {
  const { status, note_text } = req.body;
  const validStatuses = ["Open", "In Progress", "Closed"];
  if (status && !validStatuses.includes(status))
    return res.status(400).json({ error: "Invalid status." });
  try {
    const existing = await db.getTicketById(req.params.ticket_id);
    if (!existing) return res.status(404).json({ error: "Ticket not found." });
    const result = await db.updateTicket(req.params.ticket_id, { status, note_text });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update ticket." });
  }
});

// GET /api/stats
app.get("/api/stats", async (req, res) => {
  try {
    res.json(await db.getStats());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

// Catch-all for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Support CRM running at http://localhost:${PORT}`);
});
