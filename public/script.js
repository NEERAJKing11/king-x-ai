class NeerajAIChat {
    constructor() {
        this.currentChatId = 'chat-' + Date.now();
        this.init();
    }

    init() {
        // Elements
        this.sidebar = document.getElementById('sidebar');
        this.menuBtn = document.getElementById('menuBtn');
        this.newChatBtn = document.getElementById('newChat');
        this.messages = document.getElementById('messages');
        this.input = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');

        // Events
        this.menuBtn.onclick = () => this.toggleSidebar();
        this.newChatBtn.onclick = () => this.newChat();
        this.sendBtn.onclick = () => this.sendMessage();
        this.input.onkeypress = (e) => {
            if (e.key === 'Enter') this.sendMessage();
        };

        this.input.focus();
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('open');
    }

    newChat() {
        this.currentChatId = 'chat-' + Date.now();
        this.messages.innerHTML = '';
        this.input.focus();
        this.sidebar.classList.remove('open');
    }

    async sendMessage() {
        const message = this.input.value.trim();
        if (!message) return;

        this.addMessage('user', message);
        this.input.value = '';
        this.sendBtn.disabled = true;

        try {
            const response = await fetch(`/api/chats/${this.currentChatId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            if (data.messages) {
                const lastMsg = data.messages[data.messages.length - 1];
                if (lastMsg.role === 'assistant') {
                    this.addMessage('ai', lastMsg.content);
                }
            }
        } catch (error) {
            this.addMessage('ai', 'कुछ technical problem है। Refresh करें!');
        } finally {
            this.sendBtn.disabled = false;
            this.input.focus();
        }
    }

    addMessage(role, content) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.innerHTML = `<div class="bubble">${content}</div>`;
        this.messages.appendChild(div);
        this.messages.scrollTop = this.messages.scrollHeight;
    }
}

new NeerajAIChat();
