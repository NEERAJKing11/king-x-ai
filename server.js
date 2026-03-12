require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Chat = require('./models/Chat');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ KING X.AI MongoDB Connected!'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// API Routes
app.get('/api/chats', async (req, res) => {
  try {
    const chats = await Chat.find().sort({ createdAt: -1 }).limit(50);
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Chats load error' });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const { userName } = req.body;
    const newChat = new Chat({ 
      userName, 
      title: `नमस्ते ${userName}! 👋`,
      messages: [] 
    });
    await newChat.save();
    res.json(newChat);
  } catch (error) {
    res.status(500).json({ error: 'New chat error' });
  }
});

app.delete('/api/chats/:id', async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Delete error' });
  }
});

app.post('/api/chats/:id/message', async (req, res) => {
  try {
    const { message } = req.body;
    const chatId = req.params.id;
    
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    
    // User message
    chat.messages.push({ 
      role: 'user', 
      content: message,
      timestamp: new Date()
    });
    
    // AI Response
    const systemPrompt = `तुम KING X.AI हो - Neeraj King द्वारा बनाया गया। हमेशा हिंदी में friendly, helpful जवाब दो। 
    User: ${chat.userName}. सवाल: ${message}. 
    गणित, कोडिंग, पढ़ाई, कहानी, वेबसाइट कोड सबमें expert हो।`;
    
    const result = await model.generateContent(systemPrompt);
    const aiResponse = await result.response.text();
    
    chat.messages.push({ 
      role: 'assistant', 
      content: aiResponse,
      timestamp: new Date()
    });
    
    // Update title from first message
    if (chat.messages.length === 2) {
      chat.title = message.slice(0, 50) + '...';
    }
    
    await chat.save();
    res.json({ messages: chat.messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI Error: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 KING X.AI running on http://localhost:${PORT}`);
  console.log(`👨‍💻 Made by NEERAJ KING`);
});
