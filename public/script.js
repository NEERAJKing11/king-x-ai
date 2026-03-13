class NeerajKingAI {
    constructor() {
        this.currentChatId = null;
        this.initElements();
        this.init();
    }

    initElements() {
        this.sidebar = document.getElementById('sidebar');
        this.messagesContainer = document.getElementById('messages-container');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.chatsList = document.getElementById('chats-list');
        this.chatHeader = document.getElementById('chat-header');
        this.chatTitle = document.getElementById('chat-title');
        this.chatDate = document.getElementById('chat-date');
        this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
        this.backBtn = document.getElementById('back-btn');
    }

    init() {
        this.attachEventListeners();
        this.loadChats();
        console.log('🚀 Neeraj King AI Initialized!');
    }

    attachEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) this.sendMessage();
        });
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        this.mobileMenuBtn?.addEventListener('click', () => this.toggleSidebar());
        this.backBtn?.addEventListener('click', () => this.showChatsList());
        
        this.messageInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });
    }

    // 🔥 FIXED API CALL - Proxy + Error Handling
    async apiCall(endpoint, options = {}) {
        try {
            console.log('🔄 API Call:', endpoint, options.body);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(`${window.location.origin}${endpoint}`, {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: options.body ? JSON.stringify(options.body) : null,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ API Success:', endpoint, data);
            return data;

        } catch (error) {
            console.error('❌ API Error Details:', error);
            
            if (error.name === 'AbortError') {
                this.showError('⏰ Request Timeout! थोड़ी देर बाद ट्राई करो');
            } else if (error.message.includes('Failed to fetch')) {
                this.showError('🌐 Server Down! पेज refresh करो');
            } else {
                this.showError('⚠️ कुछ गलत हुआ! Developer Tools (F12) check करो');
            }
            throw error;
        }
    }

    async loadChats() {
        try {
            const chats = await this.apiCall('/api/chats');
            this.renderChatsList(chats || []);
            if (chats?.length > 0) {
                this.loadChat(chats[0]._id);
            }
        } catch (error) {
            console.error('Load Chats Error:', error);
            this.showWelcomeMessage();
        }
    }

    renderChatsList(chats) {
        this.chatsList.innerHTML = '';
        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.innerHTML = `
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-preview">${this.getPreview(chat.messages)}</div>
            `;
            chatItem.addEventListener('click', () => this.loadChat(chat._id));
            this.chatsList.appendChild(chatItem);
        });
    }

    getPreview(messages) {
        const lastMsg = messages[messages.length - 1];
        return lastMsg ? lastMsg.content.substring(0, 50) + '...' : 'नया चैट';
    }

    async createNewChat() {
        try {
            const newChat = await this.apiCall('/api/chats', {
                method: 'POST',
                body: { userName: 'Neeraj King User' }
            });
            
            if (newChat) {
                this.currentChatId = newChat._id;
                await this.loadChats();
                this.showChatArea();
                this.clearMessages();
            }
        } catch (error) {
            this.showError('नया चैट बनाने में समस्या!');
        }
    }

    async loadChat(chatId) {
        try {
            this.currentChatId = chatId;
            const chat = await this.apiCall(`/api/chats/${chatId}`);
            
            this.renderMessages(chat.messages);
            this.updateChatHeader(chat.title, chat.createdAt);
            this.showChatArea();
            this.scrollToBottom();
            
            // Active chat highlight
            document.querySelectorAll('.chat-item').forEach(item => 
                item.classList.toggle('active', item.onclick?.toString().includes(chatId))
            );
        } catch (error) {
            this.showError('चैट लोड नहीं हो सका!');
        }
    }

    renderMessages(messages) {
        this.messagesContainer.innerHTML = '';
        messages.forEach(msg => this.addMessage(msg.role, msg.content, msg.timestamp));
    }

    addMessage(role, content, timestamp = new Date()) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.innerHTML = `
            <div class="message-content">${this.escapeHtml(content).replace(/\n/g, '<br>')}</div>
            <div class="message-time">${this.formatTime(timestamp)}</div>
        `;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.currentChatId) return;

        // UI Update
        this.sendBtn.disabled = true;
        this.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        this.messageInput.value = '';

        // User message
        this.addMessage('user', message);

        try {
            const chat = await this.apiCall(`/api/chats/${this.currentChatId}/message`, {
                method: 'POST',
                body: { message }
            });

            // AI Response
            const aiMsg = chat.messages[chat.messages.length - 1];
            if (aiMsg.role === 'assistant') {
                this.addMessage('assistant', aiMsg.content, aiMsg.timestamp);
            }

            this.updateChatHeader(chat.title);
        } catch (error) {
            this.addMessage('assistant', '🤖 माफ़ कीजिए, अभी जवाब नहीं दे पा रहा। थोड़ी देर बाद ट्राई करो!');
        } finally {
            this.sendBtn.disabled = false;
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }

    // UI Methods
    showChatArea() {
        this.chatHeader.style.display = 'flex';
        this.messagesContainer.innerHTML = ''; // Clear welcome
    }

    showWelcomeMessage() {
        this.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon"><i class="fas fa-rocket"></i></div>
                <h1>Neeraj King AI से बात करो!</h1>
                <p><strong>नया चैट</strong> बटन दबाओ या F12 Console चेक करो</p>
            </div>
        `;
    }

    clearMessages() {
        this.showWelcomeMessage();
    }

    updateChatHeader(title, createdAt) {
        this.chatTitle.textContent = title;
        this.chatDate.textContent = createdAt ? 
            `शुरू: ${this.formatDate(new Date(createdAt))}` : '';
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('hidden');
        this.sidebar.classList.toggle('mobile-open');
    }

    showChatsList() {
        this.chatHeader.style.display = 'none';
        this.toggleSidebar();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    // Utilities
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('hi-IN');
    }

    showError(message) {
        console.error('❌ Error:', message);
        this.addMessage('assistant', message);
    }
}

// 🔥 Global Initialize
let kingAI;
document.addEventListener('DOMContentLoaded', () => {
    kingAI = new NeerajKingAI();
    console.log('🌐 Website Loaded: http://localhost:3000');
});
