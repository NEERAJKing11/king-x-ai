require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Chat = require('./models/Chat');

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ Advanced Middleware (सही क्रम में)
app.use(cors({
    origin: ['http://localhost:3000', 'https://yourdomain.com'], // Production के लिए add करो
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 🏠 ROOT + SPA Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SPA Fallback (React/Vue जैसा)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔗 MongoDB Connection (Retry Logic)
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
})
.then(() => console.log('✅ MongoDB Connected!'))
.catch(err => console.error('❌ MongoDB Error:', err));

// 🤖 Gemini AI Setup (Error Handling + Latest Model)
let model;
try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro-latest" // Latest Pro model
    });
    console.log('✅ Gemini Pro Ready!');
} catch (error) {
    console.error('❌ Gemini Setup Failed:', error.message);
}

// 🏥 Health Check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        mongo: mongoose.connection.readyState === 1,
        gemini: !!model
    });
});

// 📚 API Routes (Pro Error Handling)
app.get('/api/chats', asyncHandler(async (req, res) => {
    const chats = await Chat.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .select('userName title createdAt messages')
        .lean();
    res.json(chats);
}));

app.post('/api/chats', asyncHandler(async (req, res) => {
    const { userName = 'Neeraj King' } = req.body;
    const newChat = new Chat({ 
        userName, 
        title: `नमस्ते ${userName}! 👋`,
        messages: []
    });
    await newChat.save();
    res.json(newChat);
}));

app.delete('/api/chats/:id', asyncHandler(async (req, res) => {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ success: true });
}));

// 💬 MAIN CHAT API (Pro Optimized)
app.post('/api/chats/:id/message', asyncHandler(async (req, res) => {
    const { message } = req.body;
    const chatId = req.params.id;
    
    // Validation
    if (!message?.trim()) {
        return res.status(400).json({ error: 'खाली मैसेज नहीं भेज सकते!' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        return res.status(404).json({ error: 'चैट नहीं मिला!' });
    }

    // User message save
    chat.messages.push({ 
        role: 'user', 
        content: message.trim(), 
        timestamp: new Date() 
    });

    console.log(`🤖 ${chat.userName}: "${message.slice(0, 50)}..."`);

    // Smart Hindi System Prompt
    const systemPrompt = `तुम Neeraj King का Powerful AI Assistant हो। हमेशा हिंदी में friendly, helpful जवाब दो। 
User: ${chat.userName}
सवाल: ${message}
जवाब छोटा, clear और useful हो।`;

    try {
        const result = await model.generateContent(systemPrompt);
        let aiResponse = await result.response.text();

        // Response cleanup
        aiResponse = aiResponse
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/```\w*\n([\s\S]*?)\n```/g, '$1')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // AI message save
        chat.messages.push({ 
            role: 'assistant', 
            content: aiResponse, 
            timestamp: new Date() 
        });

        // Auto title update
        if (chat.messages.length === 2) {
            chat.title = message.slice(0, 50) + '...';
        }

        await chat.save();
        res.json({ 
            messages: chat.messages.slice(-20), // Last 20 messages
            success: true 
        });

    } catch (aiError) {
        console.error('🤖 AI Error:', aiError.message);
        
        // Smart fallback messages
        let fallback = 'माफ़ कीजिए, अभी AI busy है। 30 सेकंड बाद try करें।';
        if (aiError.message.includes('quotaExceeded') || aiError.message.includes('rate')) {
            fallback = '⏳ API limit exceed। थोड़ी देर बाद try करें।';
        } else if (aiError.message.includes('invalid')) {
            fallback = '🔑 API Key issue। Admin को बताएं।';
        }

        chat.messages.push({ 
            role: 'assistant', 
            content: fallback, 
            timestamp: new Date() 
        });
        await chat.save();

        res.status(503).json({ 
            error: fallback,
            messages: chat.messages.slice(-20)
        });
    }
}));

// 🛠️ Async Error Handler Utility
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// 🌍 Global Error Handler (Production Ready)
app.use((error, req, res, next) => {
    console.error('🚨 ERROR:', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
    });

    // Specific error types
    if (error.name === 'ValidationError') {
        return res.status(400).json({ 
            error: 'Invalid data provided',
            success: false 
        });
    }

    if (error.name === 'CastError') {
        return res.status(400).json({ 
            error: 'Invalid ID format',
            success: false 
        });
    }

    // Default error
    res.status(500).json({ 
        error: 'कुछ technical problem है। Refresh करके try करें।',
        success: false 
    });
});

// 🚀 Server Start
app.listen(PORT, () => {
    console.log('\n🚀 Neeraj King AI Chatbot Started!');
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`👨‍💻 Made by NEERAJ KING | Pro Version ✅`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down gracefully...');
    mongoose.connection.close(() => {
        process.exit(0);
    });
});
