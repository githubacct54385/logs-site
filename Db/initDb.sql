CREATE TABLE User (
  id integer PRIMARY KEY,
  createdAt datetime DEFAULT (datetime('now', 'localtime')),
  emailAddress text UNIQUE NOT NULL,
  password text NOT NULL
);

CREATE TABLE Log (
  id integer PRIMARY KEY,
  createdAt datetime DEFAULT (datetime('now', 'localtime')),
  message text NOT NULL
);
