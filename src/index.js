import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import joi from 'joi';
import { MongoClient } from "mongodb";
import dayjs from 'dayjs';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const participantSchema = joi.object({
	name: joi.string().min(3).required(),
	lastStatus: joi.number()
}
);

const messageSchema = joi.object({
	from: joi.string().required(),
	to: joi.string().min(3).required(),
	text: joi.string().min(1).required(),
	type: joi.string().valid("message", "private_message").required(),
	time: joi.string()
}
);

const mongoClient = new MongoClient(process.env.DATABASE_URL)

try{
    await mongoClient.connect();
    console.log("Mongo connected")
}catch(er) {
    console.log(err);
}

const db = mongoClient.db();

app.post("/participants", async (req, res) => {

	const name = req.body;
	const validation = participantSchema.validate(name, { abortEarly: false, });

	if (validation.error) {
		const errors = validation.error.details.map((type) => type.message);
		res.status(422).send(errors);
		return;
	}
	try {
		const isParticipant = await db.collection("participants").findOne({ name })
		if (isParticipant) {
			res.sendStatus(409);
			return;
		}
		await db.collection("participants").insertOne({ name, lastStatus: Date.now() });
		await db.collection("message").insertOne({
			from: name,
			to: "Todos",
			text: "entrar na sala...",
			type: "status",
			time: dayjs().format("HH:mm:ss"),	
		});
		res.send(201);
	} catch (error) {
		res.status(500).send(error.message);
	}
})
});                 

app.get('/participants', async (req, res) => {
	try {
		const participants = await db.collection('participants').find().toArray();
		if (!participants) {
			res.status(404).send("Não há nenhum participante.");
			return
		}
		res.send(participants);
	} catch (err) {
		res.sendStatus(500);
	}
});

app.post('/messages', async (req, res) => {
	try {
	const { to, text, type } = req.body;
	const { participant } = req.headers;
		const message = {
		from: participant,
		to,
		text,
		type,
		time: dayjs().format("HH:mm:ss")
	};
        
		const validation = messageSchema.validate(message, { abortEarly: false });
		if (validation.error) {
			const errors = validation.error.details.map((type) => type.message);
			res.status(422).send(errors);
			return;
		}

		const isParticipant = await db.collection('participants').findOne({name: participant});
		if (!isParticipant) {
			res.sendStatus(409);
			return
		}
		await db.collection('messages').insertOne(message);

		res.sendStatus(201);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.get('/messages', async (req, res) => {
	try {
		const { participant } = req.headers;
		const limit = Number(req.query.limit);
		const messages = await db.collection('messages').find().toArray();
		if (!participant) {
			res.status(404).send("Não há nenhum participante.");
			return
		}
		const typeMessage = messages.filter((message) =>{
			const messageTo = message.to === participant || message.from === participant || message.to === "Todos" 
			const messagePublic = message.type === "message";
			return messagePublic || messageTo;
		})
		res.send(typeMessage.slice(-limit));
	} catch (err) {
		res.sendStatus(500);
	}
});

app.post("/status", async (req, res) => {
	try {
	const {participant} = req.headers;	
		const isParticipant = await db.collection("participants").findOne({ name: participant.name })
		if (!isParticipant) {
			res.sendStatus(404);
			return;
		}
		await db.collection("participants").updateOne({ name: participant }, {$set: { lastStatus: Date.now() } });
		res.sendStatus(200);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

app.listen(5000, () => console.log("Rodando a porta 5000. Sucesso!!!"))
