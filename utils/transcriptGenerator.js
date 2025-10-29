const fs = require('fs').promises;
const path = require('path');

class TranscriptGenerator {
    constructor() {
        this.htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket Transcript - {TICKET_NAME}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #36393f;
            color: #dcddde;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background-color: #2f3136;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #7289da;
        }
        
        .header h1 {
            color: #7289da;
            margin-bottom: 10px;
        }
        
        .header-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .info-item {
            background-color: #40444b;
            padding: 10px;
            border-radius: 4px;
        }
        
        .info-label {
            font-weight: bold;
            color: #b9bbbe;
            font-size: 0.9em;
        }
        
        .info-value {
            color: #dcddde;
            margin-top: 5px;
        }
        
        .messages {
            background-color: #2f3136;
            border-radius: 8px;
            padding: 20px;
        }
        
        .message {
            display: flex;
            margin-bottom: 20px;
            position: relative;
        }
        
        .message:hover {
            background-color: #32353b;
            border-radius: 4px;
            padding: 10px;
            margin: -10px;
            margin-bottom: 10px;
        }
        
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 15px;
            flex-shrink: 0;
        }
        
        .message-content {
            flex: 1;
        }
        
        .message-header {
            display: flex;
            align-items: baseline;
            margin-bottom: 5px;
        }
        
        .username {
            font-weight: bold;
            margin-right: 10px;
            color: #dcddde;
        }
        
        .timestamp {
            font-size: 0.75em;
            color: #72767d;
        }
        
        .message-text {
            color: #dcddde;
            word-wrap: break-word;
        }
        
        .embed {
            background-color: #2f3136;
            border-left: 4px solid #7289da;
            margin: 10px 0;
            padding: 15px;
            border-radius: 0 4px 4px 0;
        }
        
        .embed-title {
            color: #00b0f4;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .embed-description {
            color: #dcddde;
            margin-bottom: 10px;
        }
        
        .embed-field {
            margin-bottom: 10px;
        }
        
        .embed-field-name {
            color: #b9bbbe;
            font-weight: bold;
            font-size: 0.9em;
        }
        
        .embed-field-value {
            color: #dcddde;
            margin-top: 5px;
        }
        
        .attachment {
            background-color: #40444b;
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
            border: 1px solid #72767d;
        }
        
        .attachment-name {
            color: #00b0f4;
            text-decoration: none;
        }
        
        .bot-message {
            background-color: #5865f21a;
            border-left: 4px solid #5865f2;
            margin-left: -20px;
            padding-left: 16px;
        }
        
        .system-message {
            text-align: center;
            color: #72767d;
            font-style: italic;
            margin: 20px 0;
            padding: 10px;
            background-color: #40444b;
            border-radius: 4px;
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background-color: #2f3136;
            border-radius: 8px;
            color: #72767d;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .header-info {
                grid-template-columns: 1fr;
            }
            
            .message {
                flex-direction: column;
            }
            
            .avatar {
                margin-bottom: 10px;
                align-self: flex-start;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Ticket Transcript</h1>
            <div class="header-info">
                <div class="info-item">
                    <div class="info-label">Ticket</div>
                    <div class="info-value">{TICKET_NAME}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Created By</div>
                    <div class="info-value">{CREATED_BY}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Created At</div>
                    <div class="info-value">{CREATED_AT}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Closed At</div>
                    <div class="info-value">{CLOSED_AT}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Total Messages</div>
                    <div class="info-value">{MESSAGE_COUNT}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Server</div>
                    <div class="info-value">{SERVER_NAME}</div>
                </div>
            </div>
        </div>
        
        <div class="messages">
            {MESSAGES}
        </div>
        
        <div class="footer">
            <p>Generated by PLOT • {GENERATION_TIME}</p>
            <p>This transcript contains the complete conversation history from this support ticket.</p>
        </div>
    </div>
</body>
</html>`;
    }

    async generateTranscript(channel, client) {
        try {
            const messages = [];
            let lastMessageId = null;
            
            while (true) {
                const options = { limit: 100 };
                if (lastMessageId) {
                    options.before = lastMessageId;
                }
                
                const batch = await channel.messages.fetch(options);
                if (batch.size === 0) break;
                
                messages.push(...batch.values());
                lastMessageId = batch.last().id;
            }
            
            messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            
            const ticketName = channel.name;
            const serverName = channel.guild.name;
            const createdAt = new Date(channel.createdTimestamp).toLocaleString();
            const closedAt = new Date().toLocaleString();
            const messageCount = messages.length;
            
            let createdBy = 'Unknown';
            const ticketCreatorMatch = ticketName.match(/ticket-(.+)/);
            if (ticketCreatorMatch) {
                const username = ticketCreatorMatch[1];
                const member = channel.guild.members.cache.find(m => 
                    m.user.username.toLowerCase() === username.toLowerCase()
                );
                if (member) {
                    createdBy = `${member.user.tag} (${member.user.id})`;
                }
            }
            
            const messagesHtml = await this.generateMessagesHtml(messages, client);
            
            let html = this.htmlTemplate
                .replace(/{TICKET_NAME}/g, this.escapeHtml(ticketName))
                .replace(/{CREATED_BY}/g, this.escapeHtml(createdBy))
                .replace(/{CREATED_AT}/g, this.escapeHtml(createdAt))
                .replace(/{CLOSED_AT}/g, this.escapeHtml(closedAt))
            
            return Buffer.from(html, 'utf8');
            
        } catch (error) {
            console.error('Error generating transcript:', error);
            throw error;
        }
    }

    async generateMessagesHtml(messages, client) {
        let html = '';
        
        for (const message of messages) {
            const timestamp = new Date(message.createdTimestamp).toLocaleString();
            const author = message.author;
            const avatarUrl = author.displayAvatarURL({ extension: 'png', size: 64 });
            
            const isBot = author.bot;
            const messageClass = isBot ? 'message bot-message' : 'message';
            
            let messageContent = '';
            
            if (message.type !== 0) {
                html += `<div class="system-message">${this.getSystemMessageText(message)}</div>`;
                continue;
            }
            
            if (message.content) {
                messageContent += `<div class="message-text">${this.formatMessageContent(message.content)}</div>`;
            }
            
            if (message.embeds.length > 0) {
                for (const embed of message.embeds) {
                    messageContent += this.formatEmbed(embed);
                }
            }
            
            // Handle attachments
            if (message.attachments.size > 0) {
                for (const attachment of message.attachments.values()) {
                    messageContent += `
                        <div class="attachment">
                            <a href="${attachment.url}" class="attachment-name" target="_blank">
                                📎 ${this.escapeHtml(attachment.name)} (${this.formatFileSize(attachment.size)})
                            </a>
                        </div>
                    `;
                }
            }
            
            html += `
                <div class="${messageClass}">
                    <img src="${avatarUrl}" alt="${this.escapeHtml(author.username)}" class="avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                    <div class="message-content">
                        <div class="message-header">
                            <span class="username">${this.escapeHtml(author.username)}</span>
                            <span class="timestamp">${timestamp}</span>
                        </div>
                        ${messageContent}
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    formatEmbed(embed) {
        let html = '<div class="embed">';
        
        if (embed.title) {
            html += `<div class="embed-title">${this.escapeHtml(embed.title)}</div>`;
        }
        
        if (embed.description) {
            html += `<div class="embed-description">${this.formatMessageContent(embed.description)}</div>`;
        }
        
        if (embed.fields && embed.fields.length > 0) {
            for (const field of embed.fields) {
                html += `
                    <div class="embed-field">
                        <div class="embed-field-name">${this.escapeHtml(field.name)}</div>
                        <div class="embed-field-value">${this.formatMessageContent(field.value)}</div>
                    </div>
                `;
            }
        }
        
        html += '</div>';
        return html;
    }

    formatMessageContent(content) {
        if (!content) return '';
        
        content = this.escapeHtml(content);
        
        content = content.replace(/<@!?(\d+)>/g, '<span style="color: #7289da; background-color: #7289da1a; padding: 2px 4px; border-radius: 3px;">@User</span>');
        
        content = content.replace(/<#(\d+)>/g, '<span style="color: #7289da; background-color: #7289da1a; padding: 2px 4px; border-radius: 3px;">#channel</span>');
        
        content = content.replace(/<@&(\d+)>/g, '<span style="color: #7289da; background-color: #7289da1a; padding: 2px 4px; border-radius: 3px;">@role</span>');
        
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        content = content.replace(/__(.*?)__/g, '<u>$1</u>');
        content = content.replace(/~~(.*?)~~/g, '<del>$1</del>');
        content = content.replace(/`(.*?)`/g, '<code style="background-color: #2f3136; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
        
        content = content.replace(/```(.*?)\n([\s\S]*?)```/g, '<pre style="background-color: #2f3136; padding: 10px; border-radius: 4px; overflow-x: auto; font-family: monospace;"><code>$2</code></pre>');
        
        content = content.replace(/\n/g, '<br>');
        
        return content;
    }

    getSystemMessageText(message) {
        switch (message.type) {
            case 1: return `${message.author.username} added ${message.mentions.users.first()?.username || 'someone'} to the channel.`;
            case 2: return `${message.author.username} removed ${message.mentions.users.first()?.username || 'someone'} from the channel.`;
            case 6: return `${message.author.username} pinned a message to this channel.`;
            case 7: return `${message.author.username} joined the server.`;
            default: return `System message: ${message.type}`;
        }
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = TranscriptGenerator;