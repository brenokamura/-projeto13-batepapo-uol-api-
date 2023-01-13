import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import joi from 'joi';
import { MongoClient } from "mongodb";
import dayjs from 'dayjs';

dotenv.config();
const app = express();

const participantSchema = joi.object({
	name: joi.string().min(3).required(),
	lastStatus: joi.number()
}
);

app.post("/participants", async (req, res) => {
});                 / 

app.listen(5000, () => console.log("Rodando a porta 5000. Sucesso!!!"))
