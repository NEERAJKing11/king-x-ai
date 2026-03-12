require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');  // ← ये ADD करो
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Chat = require('./models/Chat');

const app = express();

// Middleware - सही क्रम में
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));  // ← FIXED ये line

// ROOT ROUTE - ये सबसे जरूरी ADD करो!
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ KING X.AI MongoDB Connected!'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// API Routes - सभी routes यहाँ
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

// FIXED Message Route
app.post('/api/chats/:id/message', async (req, res) => {
  try {
    const { message } = req.body;
    const chatId = req.params.id;
    
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    
    chat.messages.push({ role: 'user', content: message, timestamp: new Date() });
    
    const systemPrompt = `तुम KING X.AI हो। हमेशा हिंदी में friendly जवाब दो। User: ${chat.userName}. सवाल: ${message}`;
    
    const result = await model.generateContent(systemPrompt);
    const aiResponse = await result.response.text();
    
    chat.messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date() });
    
    if (chat.messages.length === 2) {
      chat.title = message.slice(0, 50) + '...';
    }
    
    await chat.save();
    res.json({ messages: chat.messages });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'AI Response Error' });
  }
});

// 404 Handler - ये भी ADD करो
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 KING X.AI → http://localhost:${PORT}`);
  console.log(`👨‍💻 Made by NEERAJ KING`);
});
