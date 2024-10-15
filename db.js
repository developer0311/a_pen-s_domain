import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const db = new pg.Client({
  user: 'book_lib_1_kj9c_user', // Your database username
  host: 'dpg-cs7bmstumphs73a42p20-a.oregon-postgres.render.com', // Your database host
  database: 'book_lib_1_kj9c', // Your database name
  password: '9AFk7r0LOi8lrrzjlOSAKVDWvfLhvUTX', // Your database password
  port: 5432, // PostgreSQL default port
  ssl: {
    rejectUnauthorized: false, // Accept self-signed certificates
  },
});

async function runQueries() {
  try {
    await db.connect();
    console.log('Connected to the database');

    // SQL commands to create tables
    const createBooksTable = `
      CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          subtitle VARCHAR(255),
          author_name VARCHAR(255) NOT NULL,
          publish_date DATE NOT NULL,
          description TEXT,
          image_url VARCHAR(255),
          pdf_name VARCHAR(255),
          likes INT DEFAULT 0,
          shares INT DEFAULT 0,
          downloads INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createLikesTable = `
      CREATE TABLE IF NOT EXISTS likes (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          action VARCHAR(10) CHECK (action IN ('like', 'dislike')) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, book_id)
      );
    `;

    const createCommentsTable = `
      CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          comment_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Trigger and function to automatically update the updated_at column
    const createUpdateTriggerFunction = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const createUpdateTrigger = `
      CREATE TRIGGER update_books_updated_at
      BEFORE UPDATE ON books
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `;

    const insertBook = `
      INSERT INTO books (title, subtitle, author_name, publish_date, description, image_url, pdf_name, likes, created_at, updated_at)
      VALUES (
          'SAUL',
          'A journey to the void',
          'Sharanya Majumdar, Sambit Roy',
          '2020-01-01',
          'This story is about a boy who faces something, which he never expected ever to happen.',
          'images/book.png',
          'saul.pdf',
          120,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
      ) RETURNING id; -- Return the inserted ID
    `;

    const insertUser = `
      INSERT INTO users (email, password, created_at)
      VALUES ('example@example.com', '1234', CURRENT_TIMESTAMP) RETURNING id; -- Return the inserted ID
    `;

    // Execute the SQL commands
    await db.query(createBooksTable);
    await db.query(createUsersTable);
    await db.query(createLikesTable);
    await db.query(createCommentsTable);
    await db.query(createUpdateTriggerFunction); // Create trigger function
    await db.query(createUpdateTrigger); // Create trigger
    const bookId = await db.query(insertBook);
    const userId = await db.query(insertUser);

    console.log(`Inserted book with ID: ${bookId.rows[0].id}`);
    console.log(`Inserted user with ID: ${userId.rows[0].id}`);

  } catch (err) {
    console.error('Error executing queries:', err.stack);
  } finally {
    await db.end(); // Close the connection
    console.log('Database connection closed.');
  }
}

runQueries();
