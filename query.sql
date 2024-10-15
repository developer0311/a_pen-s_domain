---------------------- BOOKS TABLE ----------------------

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    author_name VARCHAR(255) NOT NULL,
    publish_date DATE NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    pdf_name VARCHAR(255),
    likes INT DEFAULT 100,  -- Column for tracking likes, default is 0
    shares INT DEFAULT 12,
    downloads INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO books (id, title, subtitle, author_name, publish_date, description, image_url, pdf_name, likes, created_at, updated_at)
VALUES (
    1, 
    'SAUL', 
    'A journey to the void', 
    'Sharanya Majumdar, Sambit Roy', 
    '2020-01-01', 
    'This story is about a boy who faces something, which he never expected ever to happen.',
    'images/book.png', 
    'saul.pdf', 
    120,  -- Example value for the number of likes
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
);


------------------------------- USER TABLE -------------------------------

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, password, created_at) 
VALUES ('example@example.com', '1234', CURRENT_TIMESTAMP);



------------------------------- LIKES TABLE -------------------------------

CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    action VARCHAR(10) CHECK (action IN ('like', 'dislike')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, book_id)  -- Ensures a user can only like or dislike a book once
);


------------------------------- COMMENTS TABLE -------------------------------

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
