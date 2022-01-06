const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// User Register API
app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("hashed password", hashedPassword);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  console.log("user from db", dbUser);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    console.log("creating user", createUserQuery);
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// User Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    let error = {};
    error["error_msg"] =
      "user name is not found in data base,please register before login";
    response.send(error);
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      let error = {};
      error["error_msg"] =
        "your password did'nt match with the username provided";
      response.send(error);
    }
  }
});

//// User Upload API
app.post("/upload/", async (request, response) => {
  const uploadedDetails = request.body;
  //console.log("uploaded Details", uploadedDetails);

  //let us assume we have the table named book with title, author_id, and rating as columns
  const values = uploadedDetails.map((eachRecord) => {
    console.log(
      "userid",
      typeof eachRecord.userId,
      "id",
      typeof eachRecord.id,
      "title",
      typeof eachRecord.title,
      "body",
      typeof eachRecord.body
    );
    return `(${eachRecord.userId}, ${eachRecord.id}, ${eachRecord.title} , ${eachRecord.body})`;
  });

  const valuesString = values.join(",");
  console.log(valuesString);

  const addUploadQuery = `
    INSERT INTO
      project_table (user_id,id,title,body)
    VALUES
       ${valuesString};`;
  try {
    const dbResponse = await db.run(addUploadQuery);
    /*     console.log("response", dbResponse);
     */
  } catch (err) {
    console.log(err);
  }
  /* const id = dbResponse.id;
  response.send({ bookId: bookId }); */
});
