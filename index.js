const express = require('express');
const app = express();
const port = 3000;
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();
const db = new sqlite3.Database(process.env.SQLITE);
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser');
const session = require("express-session");

app.set('view engine', 'ejs');// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser());

app.use(
    session({
        secret: process.env.SESSION_SECRET_KEY,
        resave: false,
        saveUninitialized: false,
    })
);

// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/login");
    }
};

app.get('/', function(req, res) {
  res.render('pages/index', {
    isAuthenticated: !!req.session.user
  });
});

app.get('/logs', isAuthenticated, (req, res) => {
  var logs = [];
  db.all("SELECT id, createdAt, message FROM Log order by createdAt DESC LIMIT 100", (err, rows) => {
    res.render('pages/logs', {
      logs: rows,
      isAuthenticated: !!req.session.user
    })
  });
});

app.use(authRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
