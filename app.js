import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

try {
  await mongoClient.connect();
  db = mongoClient.db();
  console.log("MongoDB Connected!");
} catch (error) {
  console.log(error.message);
}

const app = express();
app.use(cors());
app.use(express.json());

const participantSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid("message", "private_message").required(),
});

app.post("/participants", async (req, res) => {
  try {
    const validation = participantSchema.validate(req.body);
    if (validation.error) {
      return res.status(422).send(validation.error.details);
    }

    const userexiste = await db.collection("participants").findOne(req.body);
    if (userexiste) {
      return res.status(409).send("Nome já existe");
    }

    await db
      .collection("participants")
      .insertOne({ name: req.body.name, lastStatus: Date.now() });

    await db.collection("messages").insertOne({
      from: req.body.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:MM:SS"),
    });

    res.sendStatus(201);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.get("/participants", (req, res) => {
  const participantes = db.collection("participants").find().toArray();
  res.send(participantes);
});

app.post("/messages", async (req, res) => {
  try {
    const userexiste = await db
      .collection("participants")
      .findOne({ name: req.headers.user });

    const validation = messageSchema.validate(req.body, {
      abortEarly: true,
    });

    if (!userexiste || validation.error) {
      return res.status(422).send(validation.error.details);
    }

    const user = req.headers.user;
    const mensagem = req.body;

    await db.collection("messages").insertOne({
      from: user,
      to: mensagem.to,
      text: mensagem.text,
      type: mensagem.type,
      time: dayjs().format("HH:MM:SS"),
    });

    res.sendStatus(201);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.get("/messages", async (req, res) => {
  const userexiste = await db
    .collection("participants")
    .findOne({ name: req.headers.user });
  if (!userexiste) {
    return res.sendStatus(422);
  }

  const user = req.headers.user;
  const limit = parseInt(req.query.limit);

  if (!limit || limit === "string" || limit <= 0) {
    const mensagens = db
      .collection("messages")
      .find({
        $or: [{ from: user }, { to: user }, { to: "Todos" }],
      })
      .toArray();

    return res.send(mensagens);
  }

  const mensagens = db
    .collection("messages")
    .find({
      $or: [{ from: user }, { to: user }, { to: "Todos" }],
    })
    .limit(limit)
    .toArray();

  res.send(mensagens);
});

app.post("/status", async (req, res) => {
  try {
    const userexiste = await db
      .collection("participants")
      .findOne({ name: req.headers.user });
    if (!userexiste) {
      return res.sendStatus(404);
    }

    const lastStatus = Date.now();

    await db
      .collection("participants")
      .updateOne({ name: req.headers.user }, { $set: { lastStatus } });

    if (result.modifiedCount === 0)
      return res.sendStatus(404);

    res.sendStatus(200);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.listen(5000);
