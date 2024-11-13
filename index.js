// Import des modules nécessaires
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');

// Initialisation de l'application et des variables serveur
const app = express();

const cors = require('cors');


const corsOptions = {
    origin: ['http://localhost:5000', 'https://gossip-ebon.vercel.app'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));

const server = http.createServer(app);
const io = require("socket.io")(server);

// Configuration de MongoDB
const mongoURL = 'mongodb+srv://escae:escae@cluster0.m4kqf8q.mongodb.net/';
mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(error => console.error("Failed to connect to MongoDB:", error));

// Définition du modèle de message
const messageSchema = new mongoose.Schema({
    username: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

// Middleware pour parser les requêtes JSON
app.use(express.json());
app.use(express.static(path.join(__dirname+"/public")));
// Route pour sauvegarder un message
app.post("/api/messages", async (req, res) => {
    const { username, text } = req.body;
    try {
        const message = new Message({ username, text });
        await message.save();
        res.status(201).json({ message: "Message saved successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save message" });
    }
});

// Route pour récupérer l'historique des messages
app.get("/api/messages", async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve messages" });
    }
});

// Socket.io pour les communications en temps réel
io.on("connection", socket => {
    console.log('Un utilisateur est connecté');

    // Charger l'historique des messages pour l'utilisateur connecté
    Message.find().sort({ timestamp: 1 }).then(messages => {
        socket.emit("history", messages);
    });

    socket.on("newuser", username => {
        socket.broadcast.emit("update", `${username} joined the conversation`);
    });

    socket.on("exituser", username => {
        socket.broadcast.emit("update", `${username} left the conversation`);
    });

    socket.on("chat", message => {
        // Envoyer le message aux autres utilisateurs
        socket.broadcast.emit("chat", message);
    });
});

// Lancer le serveur
server.listen(5000, () => {
    console.log("Server is running on port 5000");
});
