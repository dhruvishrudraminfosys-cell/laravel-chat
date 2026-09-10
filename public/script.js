document.addEventListener('DOMContentLoaded', () => {
    let username = prompt("Enter your name:") || 'Anonymous';

    const userStatus = document.getElementById('userStatus');
    userStatus.textContent = `Online • Logged in as ${username}`;

    const myAvatar = 'avatar/user1.jpg';
    const peerAvatar = 'avatar/user2.webp';

    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const typingIndicator = document.getElementById('typingIndicator');
    const imageInput = document.getElementById('imageInput');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    let typingTimeout = null;

    ws.onopen = () => {
        appendSystemMessage('Connected securely to chat server');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'typing') {
            typingIndicator.textContent = `${data.user} is typing...`;
            typingIndicator.style.display = 'block';

            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                typingIndicator.style.display = 'none';
            }, 1500);
        }
        else if (data.type === 'message') {
            typingIndicator.style.display = 'none';
            const isSent = data.user === username;
            appendMessage(data.user, data.text, data.timestamp, isSent ? myAvatar : peerAvatar, isSent);
            if (!isSent) showNotification(data.user, data.text);
        }
        else if (data.type === 'image') {
            typingIndicator.style.display = 'none';
            const isSent = data.user === username;
            appendImageMessage(data.user, data.url, data.timestamp, isSent ? myAvatar : peerAvatar, isSent);
            if (!isSent) showNotification(data.user, 'Sent you an image');
        }
    };

    ws.onclose = () => {
        appendSystemMessage('Disconnected from chat server');
    };

    messageInput.addEventListener('input', () => {
        const typingData = { type: 'typing', user: username };
        ws.send(JSON.stringify(typingData));
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text) return;

        const messageData = {
            type: 'message',
            user: username,
            text: text,
            timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(messageData));

        appendMessage("You", text, messageData.timestamp, myAvatar, true);
        messageInput.value = '';
    });

    function appendMessage(user, text, timestamp, avatarSrc, isSent) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('message-row', isSent ? 'sent' : 'received');

        const avatarImg = document.createElement('img');
        avatarImg.classList.add('avatar');
        avatarImg.src = avatarSrc;
        avatarImg.onerror = () => { avatarImg.src = 'https://via.placeholder.com/32'; };

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', isSent ? 'sent' : 'received');
        messageDiv.innerHTML = `<span class="user">${escapeHTML(user)}</span> ${escapeHTML(text)}<span class="message-time">${formatTimestamp(timestamp)}</span>`;

        rowDiv.appendChild(avatarImg);
        rowDiv.appendChild(messageDiv);

        chatMessages.appendChild(rowDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendImageMessage(user, url, timestamp, avatarSrc, isSent) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('message-row', isSent ? 'sent' : 'received');

        const avatarImg = document.createElement('img');
        avatarImg.classList.add('avatar');
        avatarImg.src = avatarSrc;
        avatarImg.onerror = () => { avatarImg.src = 'https://via.placeholder.com/32'; };

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', isSent ? 'sent' : 'received');
        messageDiv.innerHTML = `<span class="user">${escapeHTML(user)}</span><br><img src="${escapeHTML(url)}" style="max-width: 200px; border-radius: 8px; margin-top: 4px; display: block;"><span class="message-time">${formatTimestamp(timestamp)}</span>`;

        rowDiv.appendChild(avatarImg);
        rowDiv.appendChild(messageDiv);

        chatMessages.appendChild(rowDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return '';

        return date.toLocaleString([], {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    }

    function appendSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'system');
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showNotification(user, text) {
        const notification = document.createElement('div');
        notification.className = 'live-notification';
        notification.innerHTML = `<strong>${escapeHTML(user)}</strong><span>${escapeHTML(text)}</span>`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 250);
        }, 3500);
    }

    imageInput.addEventListener('change', async function () {
        const file = imageInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        formData.append('user', username); 

        try {
            const responseObj = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await responseObj.json();
            if (!responseObj.ok || !data.url) {
                throw new Error(data.error || 'Image upload failed');
            }
        } catch (error) {
            console.error('Image upload failed:', error);
        }

        imageInput.value = '';
    });

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
});