
import TelegramBot from 'node-telegram-bot-api';
import { createKey, revokeKey } from './keys.js';

const admins = new Set(
  (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
);

const bot = new TelegramBot(
  process.env.TELEGRAM_BOT_TOKEN,
  { polling: true }
);

bot.on('message', async msg => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const text = (msg.text || '').trim();

  if (!admins.has(userId)) {
    return bot.sendMessage(chatId, 'Bạn không có quyền.');
  }

  try {
    if (text === '/start') {
      return bot.sendMessage(
        chatId,
        'TH SV KEY MANAGER\n\n' +
        '/newkey 30 2\n' +
        '/revoke TH-XXXX-XXXX-XXXX'
      );
    }

    if (text.startsWith('/newkey')) {
      const args = text.split(/\s+/);
      const days = Number(args[1] || 30);
      const devices = Number(args[2] || 1);

      const result = await createKey(days, devices, userId);

      return bot.sendMessage(
        chatId,
        `TH KEY CREATED\n\n` +
        `KEY: ${result.key}\n` +
        `DAYS: ${days}\n` +
        `DEVICES: ${devices}\n` +
        `EXPIRES: ${result.expiresAt}`
      );
    }

    if (text.startsWith('/revoke')) {
      const key = text.split(/\s+/)[1];

      if (!key) {
        return bot.sendMessage(chatId, 'Thiếu key cần thu hồi.');
      }

      const success = await revokeKey(key);

      return bot.sendMessage(
        chatId,
        success ? 'Đã thu hồi key.' : 'Không tìm thấy key.'
      );
    }
  } catch (error) {
    console.error(error.message);
    return bot.sendMessage(chatId, 'Có lỗi khi xử lý.');
  }
});

bot.on('polling_error', error => {
  console.error(error.message);
});

console.log('TH SV KEY BOT STARTED');
