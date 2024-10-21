// StickPM Project: Real-Time User Database Management and Twitch WebSocket Bot Integration

/**
 * This module manages users, integrates Twitch chat commands using WebSockets, 
 * and provides a flexible structure for OBS-related theme and game modules.
 * Users are dynamically added and removed after 5 minutes, with real-time 
 * response to Twitch commands for bots or themes.
 */

const io = require('socket.io');  // Socket.io for WebSocket management
const tmi = require('tmi.js');    // Twitch Messaging Interface (for Twitch WebSocket integration)

// User Database to store users with ObjectId, username, and timestamp
let userDatabase = {};

/** Generates a unique ObjectId for each user.
 * @returns {String} A unique ObjectId (random string)
 */
const generateObjectId = () => {
    return Math.random().toString(36).substr(2, 9);  // Generate random ID
};

/** Adds a new user to the database and schedules removal after 5 minutes.
 * @param {String} username - The username to be added.
 */
const addUser = (username) => {
    const objectId = generateObjectId();  // Generate unique ObjectId
    const timestamp = Date.now();  // Record the current timestamp

    // Store the user data
    userDatabase[objectId] = { username, timestamp };

    // Automatically remove the user after 5 minutes (300,000ms)
    setTimeout(() => {
        removeUser(objectId);  // Remove user
    }, 300000);  // 5 minutes

    console.log(`User added: ${username} with ObjectId: ${objectId}`);
};

/** Removes a user from the database after their session expires (5 minutes).
 * @param {String} objectId - The unique ObjectId of the user to remove.
 */
const removeUser = (objectId) => {
    if (userDatabase[objectId]) {
        const { username } = userDatabase[objectId];  // Get username
        delete userDatabase[objectId];  // Delete the user
        console.log(`User removed: ${username} (ObjectId: ${objectId})`);
    }
};

/** Sets up WebSockets using Socket.io and listens for new user events.
 * Allows modular extensibility such as games, themes, or bot commands.
 * 
 * @param {Object} server - The HTTP or HTTPS server instance to attach Socket.io.
 */
const setupWebSocket = (server) => {
    const ioInstance = io(server);  // Initialize Socket.io on the server

    // Handle new user connection
    ioInstance.on('connection', (socket) => {
        console.log('New user connected with socket ID:', socket.id);
        // Listen for 'newUser' events from the client side
        socket.on('newUser', (username) => {
            addUser(username);  // Add user to the database
            socket.emit('userAdded', { username, message: 'User successfully added.' });
        });
        // Listen for module-specific events (games, themes, bots, etc.)
        socket.on('moduleAction', (eventData) => {
            handleCustomModules(eventData);  // Trigger custom module
        });
        // Handle user disconnection
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};

/** Handles custom modules such as games, themes, or bot commands.
 * @param {Object} eventData - Data from the client containing module type and info.
 */
const handleCustomModules = (eventData) => {
    // Custom modules (game, theme, or bot-related actions)
    const customModules = {
        'gameModule': (data) => {
            console.log('Game module activated with data:', data);
            // Logic for game module
        },
        'themeModule': (data) => {
            console.log('Theme module activated with data:', data);
            // Logic for theme customization
        },
        'botCommand': (data) => {
            // Example bot command (!ping)
            if (data.command === '!ping') {
                console.log('Bot responded: Pong!');
                // Respond to the user in chat (or via WebSocket)
            }
        }
    };

    // Check if the module exists and trigger the corresponding function
    if (customModules[eventData.module]) {
        customModules[eventData.module](eventData.data);
    } else {
        console.log('Unknown module:', eventData.module);
    }
};

// Twitch Chat WebSocket Integration
const setupTwitchBot = () => {
    const twitchClient = new tmi.Client({
        options: { debug: true },
        connection: {
            reconnect: true,
            secure: true
        },
        identity: {
            username: 'YourTwitchBotUsername',  // Twitch bot username
            password: 'oauth:YourTwitchOAuthToken'  // OAuth token from Twitch
        },
        channels: ['YourChannelName']  // Twitch channel to join
    });

    // Connect the Twitch client
    twitchClient.connect();

    // Listen for messages in the chat
    twitchClient.on('message', (channel, tags, message, self) => {
        if (self) return;  // Ignore messages from the bot itself

        // Example: Respond to the !ping command
        if (message.toLowerCase() === '!ping') {
            twitchClient.say(channel, 'Pong!');  // Respond in the chat
            console.log(`Responded to !ping from ${tags.username}`);
            // Emit botCommand event to WebSocket (for broader use)
            io.emit('botCommand', { command: '!ping', username: tags.username });
        }
        // Extend this to handle more complex interactions
    });
};

/** Initializes the WebSocket and Twitch bot systems.
 * @param {Object} server - The HTTP or HTTPS server instance to attach WebSocket.
 */
const initializeSystem = (server) => {
    setupWebSocket(server);  // Set up Socket.io WebSocket
    setupTwitchBot();  // Set up Twitch WebSocket for chat commands
};

module.exports = { initializeSystem };
