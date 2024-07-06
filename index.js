const express = require('express');
const app = express();
const port = 5000;
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../holiday-tracker/holidays.db');

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  res.render('pages/index');
});

app.get('/logs', (req, res) => {
  var logs = [];
  db.all("SELECT id, createdAt, message FROM Log order by createdAt DESC LIMIT 100", (err, rows) => {
    res.render('pages/logs', {
      logs: rows
    })
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
