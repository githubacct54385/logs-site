CREATE TABLE User (
  id integer PRIMARY KEY,
  createdAt datetime DEFAULT current_timestamp,
  emailAddress text UNIQUE NOT NULL,
  password text NOT NULL
);

CREATE TABLE Log (
  id integer PRIMARY KEY,
  createdAt datetime DEFAULT current_timestamp,
  message text NOT NULL
);
