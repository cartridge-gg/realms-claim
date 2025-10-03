import express from 'express'
import dotenv from "dotenv";

dotenv.config();

const app = express()

app.get("/", (req, res) => {
    res.send('Hello World')
})

app.post("/check_eligibility", (req, res) => {
    res.json({ message: 'Check eligibility endpoint' })
})

app.post("/claim", (req, res) => {
    res.json({ message: 'Claim endpoint' })
})

app.listen(3000, async () => {
    console.log("Server ready on port ", 3000);
});


