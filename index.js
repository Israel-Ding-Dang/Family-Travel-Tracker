import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

const app = express();
const port = 3000;
env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 2;

let users = [];

async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;", [currentUserId]);
  let countries = [];

  console.log(result.rows);

  result.rows.forEach((country) => {
    countries.push(country.country_code);           
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows; 

  return users.find((user) => user.id == currentUserId);
};

app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });  
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  //const currentUser = await getCurrentUser();  
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]      
    );
    const data = result.rows[0];
    const countryCode = data.country_code;
    try {            
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);      
    }
  } catch (err) {    
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");  
  } else {      
    currentUserId = req.body.user;

    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {  
  //https://www.postgresql.org/docs/current/dml-returning.html
  const {name, color} = req.body;
  
  const result = await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id;", [name, color]);
  const id = result.rows[0].id;

  currentUserId = id;

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
