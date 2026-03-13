require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');  // 👈 ये ADD करो
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Chat = require('./models/Chat');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ MIDDLEWARE - ये सही क्रम में होना चाहिए
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ STATIC FILES - ये सबसे पहले serve करेगा
app.use(express.static(path.join(__dirname, 'public')));  // 🔥 MAIN FIX

// ✅ FALLBACK - अगर कोई route न मिले तो index.html serve करो
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected - Neeraj King AI'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// API Routes
app.post('/api/chats', async (req, res) => {
    try {
        const { userName = 'Guest' } = req.body;
        const chat = new Chat({ userName, title: 'नया चैट' });
        await chat.save();
        res.json(chat);
    } catch (error) {
        console.error('Create Chat Error:', error);
        res.status(500).json({ error: 'चैट बनाने में त्रुटि!' });
    }
});

app.get('/api/chats', async (req, res) => {
    try {
        const chats = await Chat.find().sort({ createdAt: -1 }).limit(50);
        res.json(chats);
    } catch (error) {
        console.error('Get Chats Error:', error);
        res.status(500).json({ error: 'चैट लिस्ट लोड नहीं हो रही!' });
    }
});

app.get('/api/chats/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'चैट नहीं मिला!' });
        res.json(chat);
    } catch (error) {
        console.error('Get Chat Error:', error);
        res.status(500).json({ error: 'चैट लोड करने में त्रुटि!' });
    }
});

app.post('/api/chats/:id/message', async (req, res) => {
    try {
        const { message } = req.body;
        const chat = await Chat.findById(req.params.id);
        
        if (!chat) return res.status(404).json({ error: 'चैट नहीं मिला!' });

        // User message
        chat.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        // AI Response
        const result = await model.generateContent(chat.messages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        })));

        const aiResponse = await result.response.text();

        chat.messages.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date()
        });

        if (chat.title === 'नया चैट') {
            chat.title = message.substring(0, 50) + '...';
        }

        await chat.save();
        res.json(chat);
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ error: 'AI जवाब देने में त्रुटि! API Key चेक करो' });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ 
        status: '🚀 Neeraj King AI - Perfectly Working!',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Neeraj King AI Chatbot Running!`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`🔧 Health: http://localhost:${PORT}/health`);
    console.log(`📱 Mobile: http://localhost:${PORT}`);
});
