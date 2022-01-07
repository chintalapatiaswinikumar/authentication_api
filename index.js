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

const dbPath = path.join(__dirname, "post.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(process.env.PORT || 3000, () => {
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
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      project_user 
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      project_user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    await db.run(createUserQuery);
    const error = {};
    error["error_msg"] = "User created successfully";
    response.send(error);
  } else {
    response.status(400);
    const error = {};
    error["error_msg"] = "User already exists";
    response.send(error);
  }
});

// User Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM project_user WHERE username = '${username}'`;
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

  const values = uploadedDetails.map((eachRecord) => {
    return `(${eachRecord.userId}, ${eachRecord.id}, '${eachRecord.title}' , '${eachRecord.body}')`;
  });

  const valuesString = values.join(",");

  const addUploadQuery = `
    INSERT INTO
      project_table (user_id,id,title,body)
    VALUES
       ${valuesString};`;
  const dbResponse = await db.run(addUploadQuery);
  const id = dbResponse.lastID;
  response.send({ id: id, message: "File data uploaded successfully!!!" });
});

/// User get API
app.get("/records/", async (request, response) => {
  const getRecordsQuery = `
    SELECT
      *
    FROM
      project_Table
    ORDER BY
      user_id;`;
  const records = await db.all(getRecordsQuery);
  response.send(records);
});
