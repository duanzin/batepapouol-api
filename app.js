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
      time: dayjs(Date.now()).format("hh:mm:ss"),
    });

    res.sendStatus(201);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.get("/participants", async (req, res) => {
  const participantes = await db.collection("participants").find().toArray();
  res.send(participantes);
});

app.post("/messages", async (req, res) => {
  try {
    const userexiste = await db
      .collection("participants")
      .findOne({ name: req.headers.user });

    if (!userexiste || !req.headers.user) {
      return res.sendStatus(422);
    }

    const validation = messageSchema.validate(req.body, {
      abortEarly: true,
    });

    if (validation.error) {
      return res.status(422).send(validation.error.details);
    }

    const user = req.headers.user;
    const mensagem = req.body;

    await db.collection("messages").insertOne({
      from: user,
      to: mensagem.to,
      text: mensagem.text,
      type: mensagem.type,
      time: dayjs(Date.now()).format("hh:mm:ss"),
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
  let mensagens = [];
  const msgs = db
    .collection("messages")
    .find({
      $or: [{ from: user }, { to: user }, { to: "Todos" }],
    })
    .toArray();

  mensagens = msgs;
  if (!req.query.limit) {
    return res.send(mensagens);
  } else if (isNaN(limit) || limit < 1) {
    return res.sendStatus(422);
  }
  mensagens = mensagens.slice(-limit);
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

    const atualizastatus = await db
      .collection("participants")
      .updateOne({ name: req.headers.user }, { $set: { lastStatus } });

    if (atualizastatus.modifiedCount === 0) {
      return res.sendStatus(404);
    }

    res.sendStatus(200);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

setInterval(async () => {
  const tempo = Date.now() - 10000;
  const usuarios = await db.collection("participants").find().toArray();

  usuarios.forEach(async (usuario) => {
    if (usuario.lastStatus < tempo) {
      await db.collection("participants").deleteOne({ name: usuario.name });

      await db.collection("messages").insertOne({
        from: usuario.name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: dayjs(Date.now()).format("hh:mm:ss"),
      });
    }
  });
}, 15000);

app.listen(5000);
