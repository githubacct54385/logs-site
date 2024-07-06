const express = require('express');
const app = express();
const port = 3000;
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./logs.db');

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  res.render('pages/index');
});

app.get('/logs', (req, res) => {
  var logs = [];
  db.all("SELECT id, createdAt, message FROM Log", (err, rows) => {
    console.log(rows);
    res.render('pages/logs', {
      logs: rows
    })
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
