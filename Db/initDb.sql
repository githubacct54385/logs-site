CREATE TABLE User (
  id integer PRIMARY KEY,
  createdAt datetime DEFAULT current_timestamp,
  emailAddress text UNIQUE NOT NULL,
  password text NOT NULL,
  numPasswordChanges integer DEFAULT 0
);

CREATE TABLE Log (
  id integer PRIMARY KEY,
  createdAt datetime DEFAULT current_timestamp,
  message text NOT NULL
);

CREATE TABLE Otp (
  id integer PRIMARY KEY,
  createdAt datetime DEFAULT current_timestamp,
  otp text NOT NULL,
  emailAddress text NOT NULL,
  expiresAt datetime NOT NULL
);
