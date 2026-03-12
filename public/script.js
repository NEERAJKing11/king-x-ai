class KingXAI {
    constructor() {
        this.currentChatId = null;
        this.userName = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadChats();
    }

    bindEvents() {
        // Welcome screen
        document.getElementById('startChatBtn').addEventListener('click', () => this.startNewChat());
        document.getElementById('userNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startNewChat();
        });

        // Chat controls
        document.getElementById('newChatBtn').addEventListener('click', () => this.createNewChat());
        document.getElementById('backBtn').addEventListener('click', () => this.showWelcome());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteCurrentChat());

        // Message input
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        messageInput.addEventListener('input', () => {
            sendBtn.disabled = messageInput.value.trim() === '';
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        sendBtn.addEventListener('click', () => this.sendMessage());
    }

    async startNewChat() {
        const userName = document.getElementById('userNameInput').value.trim();
        if (!userName) return alert('कृपया अपना नाम बताएं!');

        this.userName = userName;
        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName })
        });

        const chat = await response.json();
        this.currentChatId = chat._id;
        this.loadChat(chat._id);
    }

    async createNewChat() {
        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: this.userName })
        });

        const chat = await response.json();
        this.currentChatId = chat._id;
        this.loadChat(chat._id);
    }

    async loadChats() {
        try {
            const response = await fetch('/api/chats');
            const chats = await response.json();
            this.renderChats(chats);
        } catch (error) {
            console.error('Load chats error:', error);
        }
    }

    renderChats(chats) {
        const chatsList = document.getElementById('chatsList');
        chatsList.innerHTML = chats.map(chat => `
            <div class="chat-item ${this.currentChatId === chat._id ? 'active' : ''}" data-chat-id="${chat._id}">
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-time">${this.formatDate(chat.createdAt)}</div>
            </div>
        `).join('');

        // Bind chat clicks
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.dataset.chatId;
                this.loadChat(chatId);
            });
        });
    }

    async loadChat(chatId) {
        try {
            const response = await fetch(`/api/chats/${chatId}/messages`);
            const chat = await response.json();
            
            this.currentChatId = chatId;
            document.getElementById('chatTitle').textContent = chat.title;
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('chatScreen').style.display = 'block';
            
            this.renderMessages(chat.messages);
            this.scrollToBottom();
            
            // Update active chat
            document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
            document.querySelector(`[data-chat-id="${chatId}"]`).classList.add('active');
        } catch (error) {
            console.error('Load chat error:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = messages.map(msg => `
            <div class="message ${msg.role}-message">
                <div class="message-content">
                    ${msg.role === 'assistant' ? `
                        <div class="message-actions">
                            <button class="copy-btn" onclick="navigator.clipboard.writeText('${msg.content.replace(/'/g, "\\'")}') && this.style.background='rgba(76,175,80,0.8)'" title="कॉपी करें">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="regenerate-btn" onclick="kingXAI.regenerateMessage('${msg._id}')" title="नया जवाब">
                                <i class="fas fa-redo"></i>
                            </button>
                        </div>
                    ` : ''}
                    <div>${this.formatMessage(msg.content)}</div>
                </div>
            </div>
        `).join('');
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        if (!message || !this.currentChatId) return;

        // Add user message
        const userMessageHtml = `
            <div class="message user-message">
                <div class="message-content">${this.escapeHtml(message)}</div>
            </div>
        `;
        document.getElementById('messagesContainer').insertAdjacentHTML('beforeend', userMessageHtml);
        messageInput.value = '';
        this.scrollToBottom();

        // Show typing indicator
        const typingHtml = `
            <div class="typing-indicator" id="typingIndicator">
                <div>KING X.AI लिख रहा है...</div>
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        document.getElementById('messagesContainer').insertAdjacentHTML('beforeend', typingHtml);
        this.scrollToBottom();

        try {
            const response = await fetch(`/api/chats/${this.currentChatId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            
            // Remove typing indicator
            document.getElementById('typingIndicator').remove();
            
            // Add AI response with typing effect
            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'message assistant-message';
            aiMessageDiv.innerHTML = `
                <div class="message-content typing-effect" data-text="${this.escapeHtml(data.messages[data.messages.length-1].content)}">
                    <div class="message-actions">
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.messages[data.messages.length-1].content.replace(/'/g, "\\'")}') && this.style.background='rgba(76,175,80,0.8)'" title="कॉपी करें">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="regenerate-btn" onclick="kingXAI.regenerateMessage('${data.messages[data.messages.length-1]._id}')" title="नया जवाब">
                            <i class="fas fa-redo"></i>
                        </button>
                    </div>
                    <div class="typing-text"></div>
                </div>
            `;
            document.getElementById('messagesContainer').appendChild(aiMessageDiv);
            
            this.typeWriter(aiMessageDiv.querySelector('.typing-text'), data.messages[data.messages.length-1].content);
            this.scrollToBottom();
            
            // Refresh chats list
            this.loadChats();
        } catch (error) {
            document.getElementById('typingIndicator').remove();
            this.showError('कुछ गलत हो गया! फिर से कोशिश करें।');
        }
    }

    typeWriter(element, text, speed = 30) {
        let i = 0;
        element.innerHTML = '';
        
        const type = () => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                element.parentElement.classList.remove('typing-effect');
            }
        };
        type();
    }

    async regenerateMessage(messageId) {
        // Simplified regenerate - resend last user message
        const messages = document.querySelectorAll('.message');
        const lastUserMessage = Array.from(messages).reverse().find(m => m.classList.contains('user-message'));
        if (lastUserMessage) {
            const userMessageText = lastUserMessage.querySelector('.message-content').textContent;
            this.sendMessage(userMessageText);
        }
    }

    async deleteCurrentChat() {
        if (!confirm('क्या आप यह चैट हटाना चाहते हैं?')) return;
        
        try {
            await fetch(`/api/chats/${this.currentChatId}`, { method: 'DELETE' });
            this.showWelcome();
            this.loadChats();
        } catch (error) {
            alert('हटाने में त्रुटि!');
        }
    }

    showWelcome() {
        document.getElementById('welcomeScreen').classList.add('active');
        document.getElementById('chatScreen').style.display = 'none';
        document.getElementById('userNameInput').value = this.userName || '';
        this.currentChatId = null;
    }

    scrollToBottom() {
        setTimeout(() => {
            document.getElementById('messagesContainer').scrollTop = 
                document.getElementById('messagesContainer').scrollHeight;
        }, 100);
    }

    formatMessage(text) {
        return text.replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('hi-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showError(message) {
        const errorHtml = `
            <div class="message assistant-message">
                <div class="message-content" style="background: rgba(244,67,54,0.2); border: 1px solid rgba(244,67,54,0.3);">
                    ❌ ${message}
                </div>
            </div>
        `;
        document.getElementById('messagesContainer').insertAdjacentHTML('beforeend', errorHtml);
        this.scrollToBottom();
    }
}

// Initialize app
const kingXAI = new KingXAI();
