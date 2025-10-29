module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    
    prefix: process.env.PREFIX || '!',
    embedColor: process.env.EMBED_COLOR || '#5865F2',
    supportServer: process.env.SUPPORT_SERVER,
    
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
    ticketCategoryId: process.env.TICKET_CATEGORY_ID,
    transcriptChannelId: process.env.TRANSCRIPT_CHANNEL_ID,
    modLogChannelId: process.env.MOD_LOG_CHANNEL_ID,
    tournamentChannelId: process.env.TOURNAMENT_CHANNEL_ID,
    
    autoRoleId: process.env.AUTO_ROLE_ID,
    giveawayRoleId: process.env.GIVEAWAY_ROLE_ID,
    tournamentRoleId: process.env.TOURNAMENT_ROLE_ID,
    staffRoleId: process.env.STAFF_ROLE_ID,
    
    databasePath: process.env.DATABASE_PATH || './database.sqlite',
    
    statusMessages: [
        { name: 'PLOT', type: 'Playing' },
        { name: 'GGs', type: 'Watching' },
    ],
    
    moderatorPermissions: [
        'KICK_MEMBERS',
        'BAN_MEMBERS',
        'MANAGE_MESSAGES',
        'MANAGE_ROLES'
    ],
    
    adminPermissions: [
        'ADMINISTRATOR',
        'MANAGE_GUILD'
    ]
};
