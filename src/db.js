const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../ticketboss.db');
const db = new Database(dbPath/*, { verbose: console.log } */);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

function initializeDatabase() {
  // Create Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      totalSeats INTEGER NOT NULL,
      availableSeats INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Create Reservations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      partnerId TEXT NOT NULL,
      seats INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('confirmed', 'cancelled')),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eventId) REFERENCES events(id)
    )
  `);

  // Seed data if not exists
  const stmt = db.prepare('SELECT count(*) as count FROM events WHERE id = ?');
  const row = stmt.get('node-meetup-2025');

  if (!row || row.count === 0) {
    console.log('Seeding database with initial event...');
    const insert = db.prepare(`
      INSERT INTO events (id, name, totalSeats, availableSeats, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    insert.run('node-meetup-2025', 'Node.js Meet-up', 500, 500, 0);
  }
}

initializeDatabase();

module.exports = db;
