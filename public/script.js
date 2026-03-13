class NeerajKingAI {
    constructor() {
        this.currentChatId = null;
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

        this.init();
    }

    init() {
        // Event Listeners
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) this.sendMessage();
            if (e.key === 'Enter') this.messageInput.style.height = 'auto';
        });
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        this.mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
        this.backBtn.addEventListener('click', () => this.showChatsList());

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });

        // Load chats on start
        this.loadChats();
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`/api${endpoint}`, {
                method: options.method || 'GET',
                headers: { 'Content-Type': 'application/json' },
                body: options.body ? JSON.stringify(options.body) : null
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showError('नेटवर्क एरर! इंटरनेट चेक करो');
        }
    }

    async loadChats() {
        const chats = await this.apiCall('/chats');
        if (chats && chats.length > 0) {
            this.renderChatsList(chats);
            this.loadChat(chats[0]._id); // Load first chat
        }
    }

    renderChatsList(chats) {
        this.chatsList.innerHTML = '';
        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.innerHTML = `
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-preview">${chat.messages[chat.messages.length - 1]?.content?.substring(0, 50) || 'कोई मैसेज नहीं'}...</div>
            `;
            chatItem.addEventListener('click', () => this.loadChat(chat._id));
            this.chatsList.appendChild(chatItem);
        });
    }

    async createNewChat() {
        const chatData = { userName: 'Neeraj King User' };
        const newChat = await this.apiCall('/chats', {
            method: 'POST',
            body: chatData
        });

        if (newChat) {
            this.currentChatId = newChat._id;
            this.loadChats();
            this.showChatArea();
            this.clearMessages();
            this.scrollToBottom();
        }
    }

    async loadChat(chatId) {
        this.currentChatId = chatId;
        const chat = await this.apiCall(`/chats/${chatId}`);
        
        if (chat) {
            this.renderMessages(chat.messages);
            this.updateChatHeader(chat.title, chat.createdAt);
            this.showChatArea();
            this.scrollToBottom();
            
            // Update active chat
            document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
            document.querySelector(`[onclick="kingAI.loadChat('${chatId}')"]`)?.classList.add('active');
        }
    }

    renderMessages(messages) {
        this.messagesContainer.innerHTML = '';
        messages.forEach(message => {
            this.addMessage(message.role, message.content, message.timestamp);
        });
    }

    addMessage(role, content, timestamp = new Date()) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `
            <div class="message-content">${this.formatMessage(content)}</div>
            <div class="message-time">${this.formatTime(timestamp)}</div>
        `;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.currentChatId) return;

        // Disable send button
        this.sendBtn.disabled = true;
        this.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Add user message
        this.addMessage('user', message);
        const inputValue = this.messageInput.value;
        this.messageInput.value = '';

        try {
            // Send to AI
            const chat = await this.apiCall(`/chats/${this.currentChatId}/message`, {
                method: 'POST',
                body: { message }
            });

            if (chat) {
                // Add AI response
                const lastMessage = chat.messages[chat.messages.length - 1];
                if (lastMessage.role === 'assistant') {
                    this.addMessage('assistant', lastMessage.content, lastMessage.timestamp);
                }
                this.updateChatHeader(chat.title);
            }
        } catch (error) {
            this.addMessage('assistant', '❌ माफ़ कीजिए, अभी जवाब नहीं दे पा रहा। थोड़ी देर बाद ट्राई करो!');
        } finally {
            // Re-enable send button
            this.sendBtn.disabled = false;
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }

    updateChatHeader(title, createdAt = null) {
        this.chatTitle.textContent = title;
        if (createdAt) {
            this.chatDate.textContent = `शुरू: ${this.formatDate(new Date(createdAt))}`;
        }
    }

    showChatArea() {
        this.chatHeader.style.display = 'flex';
        this.messagesContainer.classList.remove('welcome');
    }

    showChatsList() {
        this.chatHeader.style.display = 'none';
        this.sidebar.classList.remove('hidden', 'mobile-open');
    }

    clearMessages() {
        this.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon"><i class="fas fa-comments"></i></div>
                <h1>नया चैट शुरू!</h1>
                <p>अपना पहला मैसेज लिखो...</p>
            </div>
        `;
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('mobile-open');
        this.sidebar.classList.toggle('hidden');
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    formatMessage(content) {
        return content
            .replace(/\n/g, '<br>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/`(.*)/g, '<code>$1</code>');
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('hi-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('hi-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    showError(message) {
        this.addMessage('assistant', `❌ ${message}`);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.kingAI = new NeerajKingAI();
    
    // PWA Support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }
});
