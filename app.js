import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
  await mongoClient.connect();
  console.log("MongoDB Connected!");
} catch (err) {
  console.log(err.message);
}

const db = mongoClient.db();

const app = express();
app.use(cors());

app.post("/participants", async (req, res) => {
  const nome = req.body;
  res.sendStatus(201);
});

app.get("/participants", (req, res) => {
  const participantes = db.collection("participants").find().toArray();
  res.send(participantes);
});

app.post("/messages", async (req, res) => {
  const mensagem = req.body;
  res.sendStatus(201);
});

app.get("/messages", (req, res) => {
  const user = req.headers.user;
  if (!req.query.limit) {
    const mensagens = db.collection("messages").find().toArray();
    res.send(mensagens);
    return;
  }
  const limit = req.query.limit;
  const mensagens = db.collection("messages").find().toArray();
  res.send(mensagens);
});

app.post("/status", async (req, res) => {
  const user = req.body;
  res.sendStatus(200);
});

app.listen(5000);
