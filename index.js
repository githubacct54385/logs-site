const express = require('express');
const app = express();
const port = 5000;
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../holiday-tracker/holidays.db');

app.get('/', (req, res) => {
  res.send('<h1>My Node app</h1>')
});

app.get('/logs', (req, res) => {
  db.run('select * from Log', (err, row) => {
    if(err) {
      console.log(err);
    }
    if(row) {
      console.log(row);
    }
  })
  res.send('<h1>Logs</h1>');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
