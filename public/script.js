class NeerajAI {
    constructor() {
        this.currentChatId = 'main-chat-' + Date.now();
        this.init();
    }

    init() {
        this.messagesContainer = document.getElementById('messages');
        this.input = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.sidebar = document.getElementById('sidebar');
        this.menuToggle = document.getElementById('menuToggle');
        this.newChatBtn = document.getElementById('newChat');

        // Event Listeners
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.menuToggle.addEventListener('click', () => this.toggleSidebar());
        this.newChatBtn.addEventListener('click', () => this.newChat());

        // Auto-focus input
        this.input.focus();
    }

    async sendMessage() {
        const message = this.input.value.trim();
        if (!message) return;

        // User message
        this.addMessage('user', message);
        this.input.value = '';
        this.sendBtn.disabled = true;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: this.currentChatId, 
                    message 
                })
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            this.addMessage('ai', data.reply);
        } catch (error) {
            this.addMessage('ai', `❌ Error: ${error.message}`);
        } finally {
            this.sendBtn.disabled = false;
            this.input.focus();
        }
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `<div class="bubble">${this.escapeHtml(content)}</div>`;
        
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('open');
    }

    newChat() {
        this.currentChatId = 'chat-' + Date.now();
        this.messagesContainer.innerHTML = '';
        this.input.focus();
        this.sidebar.classList.remove('open');
    }
}

// Initialize Pro Chatbot
new NeerajAI();
