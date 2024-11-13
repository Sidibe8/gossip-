(function() {
    const app = document.querySelector('.app');
    const socket = io();
    let uname;

    // Tableau de prénoms, adjectifs et émojis amusants
    const funNames = ["Gamer", "Warrior", "Ninja", "Hero", "Wizard"];
    const funAdjectives = ["Crazy", "Brave", "Silent", "Epic", "Mighty"];
    const emojis = ["🐉", "🔥", "⚔️", "🧙‍♂️", "🎮"];

   // Fonction pour générer un nom amusant et masqué
   function generateRandomName(baseName) {
    const randomName = funNames[Math.floor(Math.random() * funNames.length)];
    const randomAdjective = funAdjectives[Math.floor(Math.random() * funAdjectives.length)];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    // Crée un pseudonyme avec une partie du nom d'utilisateur pour plus d'anonymat
    const partialBaseName = baseName.slice(0, 1).toUpperCase() + "*".repeat(baseName.length - 1);
    
    return `${randomAdjective} ${randomName} ${randomEmoji} ${partialBaseName}`;
}

    // Vérifiez si un nom d'utilisateur est stocké dans localStorage
    if (localStorage.getItem("username")) {
        uname = localStorage.getItem("username");
        startChat(); // Démarrer la session de chat si le nom d'utilisateur est trouvé
    }

    // Fonction pour démarrer le chat
    function startChat() {
        socket.emit("newuser", uname);
        app.querySelector(".join-screen").classList.remove("active");
        app.querySelector(".chat-screen").classList.add("active");


        // s
        // Charger l'historique des messages de la base de données pour cet utilisateur
        fetch("/api/messages")
            .then(response => response.json())
            .then(messages => {
                messages.forEach(message => {
                    if (message.username === uname) {
                        renderMessage("my", message);
                    } else {
                        renderMessage("other", message);
                    }
                });
            })
            .catch(error => console.error("Failed to fetch messages:", error));
    }

    // Gestion du bouton pour rejoindre le chat
    app.querySelector(".join-screen #join-user").addEventListener("click", function() {
        let username = app.querySelector(".join-screen #username").value;
        if (username.length === 0) return;

        // Générer un nom d'utilisateur amusant et unique
        uname = generateRandomName(username);
        localStorage.setItem("username", uname); // Sauvegarde du nom d'utilisateur dans localStorage
        startChat(); // Appel de la fonction pour démarrer le chat
    });

    // Envoi d'un message
    app.querySelector(".chat-screen #send-message").addEventListener("click", function() {
        let message = app.querySelector(".chat-screen #message-input").value;
        if (message.length === 0) return;

        renderMessage("my", { username: uname, text: message });

        // Envoi du message à tous les utilisateurs
        socket.emit("chat", { username: uname, text: message });

        // Enregistrement du message dans MongoDB
        fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: uname, text: message })
        }).catch(error => console.error("Failed to save message:", error));

        app.querySelector(".chat-screen #message-input").value = '';
    });

    // Déconnexion
    app.querySelector(".chat-screen #exit-chat").addEventListener("click", function() {
        socket.emit("exituser", uname);
        localStorage.removeItem("username");
        window.location.href = window.location.href;
    });

    // Réception des messages et mise à jour de l'interface
    socket.on("update", function(update) {
        renderMessage("update", update);
    });

    socket.on("chat", function(message) {
        if (message.username === uname) {
            renderMessage("my", message);
        } else {
            renderMessage("other", message);
        }
    });

    // Fonction pour afficher les messages dans l'interface
    function renderMessage(type, message) {
        let messageContainer = app.querySelector(".chat-screen .messages");
        let el = document.createElement("div");

        if (type === "my") {
            el.classList.add("message", "my-message", "fade-in"); // Ajoute la classe fade-in
            el.innerHTML = `<div><div class="name">Vous</div><div class="text">${message.text}</div></div>`;
        } else if (type === "other") {
            el.classList.add("message", "other-message", "fade-in"); // Ajoute la classe fade-in
            el.innerHTML = `<div><div class="name">${message.username}</div><div class="text">${message.text}</div></div>`;
        } else if (type === 'update') {
            el.classList.add("update", "fade-in", "collor"); // Ajoute la classe fade-in pour les messages de mise à jour
            el.innerText = message;
        }

        messageContainer.appendChild(el);
        messageContainer.scrollTop = messageContainer.scrollHeight - messageContainer.clientHeight;
    }
})();
