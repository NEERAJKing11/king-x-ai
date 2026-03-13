require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Chat = require('./models/Chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected - Neeraj King AI'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Gemini AI Setup (1.5 Pro)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// API: Create New Chat
app.post('/api/chats', async (req, res) => {
  try {
    const { userName = 'Guest' } = req.body;
    const chat = new Chat({ userName, title: 'नया चैट' });
    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: 'चैट बनाने में त्रुटि!' });
  }
});

// API: Get All Chats
app.get('/api/chats', async (req, res) => {
  try {
    const chats = await Chat.find().sort({ createdAt: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'चैट लिस्ट लोड नहीं हो रही!' });
  }
});

// API: Get Chat by ID
app.get('/api/chats/:id', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'चैट नहीं मिला!' });
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: 'चैट लोड करने में त्रुटि!' });
  }
});

// API: Send Message
app.post('/api/chats/:id/message', async (req, res) => {
  try {
    const { message } = req.body;
    const chat = await Chat.findById(req.params.id);
    
    if (!chat) return res.status(404).json({ error: 'चैट नहीं मिला!' });

    // Add user message
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Generate AI Response
    const chatHistory = chat.messages.map(msg => ({
      role: msg.role,
      parts: [msg.content]
    }));

    const result = await model.generateContent({
      contents: chatHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      }
    });

    const aiResponse = await result.response.text();

    // Add AI response
    chat.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });

    // Update chat title based on first message
    if (chat.title === 'नया चैट' && message.length > 0) {
      chat.title = message.substring(0, 50) + '...';
    }

    await chat.save();
    res.json(chat);
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'AI जवाब देने में त्रुटि! API Key चेक करो' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Neeraj King AI - Running Perfectly! 🚀' });
});

app.listen(PORT, () => {
  console.log(`🚀 Neeraj King AI running on http://localhost:${PORT}`);
});
