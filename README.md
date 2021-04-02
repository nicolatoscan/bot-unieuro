# bot-unieuro

This bot check an notify on a telegram channel the avaiability of some products from mediaworld and unieuro online store.

# Setup
* Create a telegram bot
* Create a telegram channel
* Add the bot to your telegram channel
* Install [node](https://nodejs.org/) on your machine

# Configuration
Create a `.env` in the root folder of the project as follows:
```
BOT_TOKEN=<your-telegram-bot-token>
CHANNEL_ID=<telegram-channel-id>
```
Where the telegram bot token and the thelegram channel id are the ones you created in the setup.

You can add or remove links to check at the  of `src/index.ts`

# Run the script
Before running the script you need the traspile it with:
```bash
npm run transpile
```

You can run the script with:
```bash
npm run start
```

You can trasnpile and run your script with one comman using:
```bash
npm run serve
```
