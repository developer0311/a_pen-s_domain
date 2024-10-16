import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import flash from 'express-flash';
import "dotenv/config";
import path from "path";

const app = express();
const port = process.env.SERVER_PORT;
const __dirname = dirname(fileURLToPath(import.meta.url));
const saltRounds = 10;

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs"); // Set view engine

let home_active = "my-active";
let books_active = "";

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();


// --------------------------- FUNCTIONS ---------------------------//

let get_username = (email) => {
  const username = email.split("@")[0];
  return username;
};

let active_page = (pageName) => {
  if (pageName == "home") {
    home_active = "my-active";
    books_active = "";
  } else if (pageName == "books") {
    home_active = "";
    books_active = "my-active";
  }
};

//-------------------------- INDEX Routes --------------------------//

app.get("/", (req, res) => {
  if (req.isAuthenticated()){
    return res.redirect("/home");
  }
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest";
  res.render(__dirname + "/views/home.ejs", {
    homeActive: home_active,
    booksActive: books_active,
    profile_name: username,
  });
});

app.get(
  "/auth/google/home",
  passport.authenticate("google", {
    successRedirect: "/home",
    failureRedirect: "/login",
  })
);

// --------------------------- HOMEPAGE ROUTES ---------------------------//

app.get("/home", async (req, res) => {
  active_page("home");
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated

  if (req.isAuthenticated()) {
    try {
      const user = req.user;
      let username = get_username(user.email);
      res.render(__dirname + "/views/index.ejs", {
        homeActive: home_active,
        booksActive: books_active,
        profile_name: username,
      });
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

// --------------------------- BOOKS ROUTES ---------------------------//

app.get("/books", async (req, res) => {
  active_page("books");
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated
  if (req.isAuthenticated()) {
    try {
      const user = req.user;
      let username = get_username(user.email);
      const result = await db.query("SELECT * FROM books");
      res.render(__dirname + "/views/books.ejs", {
        books: result.rows,
        profile_name: username,
        homeActive: home_active,
        booksActive: books_active,
      });
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

// --------------------------- SPECIFIC PAGE ROUTES ---------------------------//

app.get("/specific", async (req, res) => {
  active_page("books");
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated
  if (req.isAuthenticated()) {
    try {
      const user = req.user;
      const bookID = req.query.id;
      let username = get_username(user.email);

      try {
        // Check if user exists
        const userExistsResult = await db.query(
          "SELECT id FROM users WHERE id = $1",
          [user.id]
        );
        if (userExistsResult.rows.length === 0) {
          return res.status(404).send("User not found.");
        }

        // Fetch the specific book
        const bookResult = await db.query("SELECT * FROM books WHERE id=$1", [
          bookID,
        ]);
        if (bookResult.rows.length === 0) {
          return res.status(404).send("Book not found.");
        }

        // Check if user liked the book
        const likeResult = await db.query(
          "SELECT action FROM likes WHERE user_id=$1 AND book_id=$2",
          [user.id, bookID]
        );
        const userLiked =
          likeResult.rows.length > 0
            ? likeResult.rows[0].action === "like"
            : false;

        // Fetch all comments for the specific book
        const commentsResult = await db.query(
          "SELECT comment_text, created_at FROM comments WHERE book_id=$1",
          [bookID]
        );

        const commentArray = commentsResult.rows.map(
          (comment) => comment.comment_text
        );

        // Render the specific page with book data, like status, and comments
        res.render("specific", {
          profile_name: username,
          book: bookResult.rows[0],
          bookID: bookID,
          userLiked: userLiked,
          commentArray: commentArray, // Pass comments to the EJS template
          homeActive: home_active,
          booksActive: books_active,
        });
      } catch (err) {
        console.error("Error fetching specific book", err);
        res.status(500).send("Internal Server Error");
      }
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

// --------------------------- Like/Dislike route --------------------------- //
app.get("/like", async (req, res) => {
  const userId = req.user.id; // Assuming you have user ID stored in session
  const bookId = req.query.id; // Get book ID from query parameters

  if (!userId || !bookId) {
    return res.status(400).send("User ID and Book ID are required.");
  }

  try {
    // Check if user exists
    const userExistsResult = await db.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );
    if (userExistsResult.rows.length === 0) {
      return res.status(400).send("User does not exist.");
    }

    // Check if book exists
    const bookExistsResult = await db.query(
      "SELECT id, likes FROM books WHERE id = $1",
      [bookId]
    );
    if (bookExistsResult.rows.length === 0) {
      return res.status(400).send("Book does not exist.");
    }

    // Check if the user has already liked or disliked the book
    const result = await db.query(
      "SELECT action FROM likes WHERE user_id=$1 AND book_id=$2",
      [userId, bookId]
    );

    if (result.rows.length > 0) {
      // User has already liked/disliked the book
      const currentAction = result.rows[0].action;

      // Toggle action
      if (currentAction === "like") {
        // Change to dislike
        await db.query(
          "UPDATE likes SET action = $1 WHERE user_id = $2 AND book_id = $3",
          ["dislike", userId, bookId]
        );
        // Decrement the like count
        await db.query("UPDATE books SET likes = likes - 1 WHERE id = $1", [
          bookId,
        ]);
      } else {
        // Change to like
        await db.query(
          "UPDATE likes SET action = $1 WHERE user_id = $2 AND book_id = $3",
          ["like", userId, bookId]
        );
        // Increment the like count
        await db.query("UPDATE books SET likes = likes + 1 WHERE id = $1", [
          bookId,
        ]);
      }
    } else {
      // User has not yet liked or disliked the book, so insert a new like
      await db.query(
        "INSERT INTO likes (user_id, book_id, action) VALUES ($1, $2, $3)",
        [userId, bookId, "like"]
      );
      // Increment the like count
      await db.query("UPDATE books SET likes = likes + 1 WHERE id = $1", [
        bookId,
      ]);
    }

    res.redirect("/specific?id=" + bookId); // Redirect back to the specific page with the book ID
  } catch (err) {
    console.error("Error handling like/dislike", err);
    res.status(500).send("Internal Server Error");
  }
});

// --------------------------- COMMENTS ROUTES ---------------------------//

app.post("/comment", async (req, res) => {
  const user = req.user; // Assuming you have user ID stored in session
  const bookId = req.body.bookId; // Get book ID from request body
  const commentText = req.body.comment; // Get comment text from request body

  // Validate input
  if (!user.id || !bookId || !commentText) {
    return res
      .status(400)
      .send("User ID, Book ID, and comment text are required.");
  }

  try {
    // Check if the user exists
    const userExistsResult = await db.query(
      "SELECT id FROM users WHERE id = $1",
      [user.id]
    );
    if (userExistsResult.rows.length === 0) {
      return res.status(400).send("User does not exist.");
    }

    // Check if the book exists
    const bookExistsResult = await db.query(
      "SELECT id FROM books WHERE id = $1",
      [bookId]
    );
    if (bookExistsResult.rows.length === 0) {
      return res.status(400).send("Book does not exist.");
    }

    // Insert the comment into the comments table
    await db.query(
      "INSERT INTO comments (user_id, book_id, comment_text, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)",
      [user.id, bookId, commentText]
    );

    // Redirect to the specific book page
    res.redirect(`/specific?id=${bookId}`);
  } catch (err) {
    console.error("Error saving comment", err);
    res.status(500).send("Internal Server Error");
  }
});

// --------------------------- SHARE ROUTES ---------------------------//

app.post("/share", async (req, res) => {
  const bookId = req.query.id;

  try {
    let result = await db.query(
      "UPDATE books SET shares = shares + 1 WHERE id = $1 RETURNING *",
      [bookId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    const updatedBook = result.rows[0];
    res.status(200).json({
      message: "Book shared successfully",
      updatedShareCount: updatedBook.shares,
    }); // Make sure this is `shares`
  } catch (error) {
    console.error("Error sharing book:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --------------------------- DOWNLOAD ROUTES ---------------------------//

app.post("/update-downloads", async (req, res) => {
  const { bookId, pdf_link } = req.query;

  try {
    // Update the download count in the database
    await db.query("UPDATE books SET downloads = downloads + 1 WHERE id = $1", [
      bookId,
    ]);
    res.status(200).send("Download count updated");
  } catch (error) {
    console.error("Error updating download count:", error);
    res.status(500).send("Internal server error");
  }
});

app.get("/download", async (req, res) => {
  const bookId = req.query.bookId;
  const pdfLink = req.query.pdf_link; // Get the PDF link from query parameters

  if (!pdfLink || !bookId) {
    return res.status(400).send("PDF link and book ID are required.");
  }

  let filePath = path.join(__dirname, pdfLink);

  // Update the downloads count first
  try {
    await db.query("UPDATE books SET downloads = downloads + 1 WHERE id = $1", [
      bookId,
    ]);
  } catch (error) {
    console.error("Error updating downloads:", error);
    return res.status(500).send("Error updating download count.");
  }

  // Now proceed to download the file
  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err); // Log the error for more insights
      if (err.code === "ENOENT") {
        return res.status(404).send("File not found.");
      }
      return res.status(500).send("Error downloading file.");
    }
  });
});

//-------------------------- LOGIN Route --------------------------//

app.get("/login", (req, res) => {
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated
  active_page("home");
  res.render(__dirname + "/views/login.ejs", {
    profile_name: username,
    homeActive: home_active,
    booksActive: books_active,
  });
});

app.post(
  "/login",
  (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err); // Handle error
      }
      if (!user) {
        // If the user is not found, flash the error and redirect to register
        req.flash("error", info.message || "User not found, please register.");
        return res.redirect("/register");
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err); // Handle error
        }
        return res.redirect("/home"); // Successful login
      });
    })(req, res, next); // Call passport.authenticate with req, res, next
  }
);


//-------------------------- REGISTER Route --------------------------//

app.get("/register", (req, res) => {
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated
  active_page("home");

  res.render(__dirname + "/views/register.ejs", {
    profile_name: username,
    homeActive: home_active,
    booksActive: books_active,
  });
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/home");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

//-------------------------- LOGOUT Route --------------------------//

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        // return cb("User not found");
        // res.redirect("/register");
        return cb(null, false, { message: "User not found. Redirecting to register." });
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://a-pen-s-domain.onrender.com/auth/google/home",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
