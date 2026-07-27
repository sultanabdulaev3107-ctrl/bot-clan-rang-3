import { Telegraf } from 'telegraf';
import axios from 'axios';

async function login(email, password, url) {
  try {
    const res = await axios.post(url, { clientType: "CLIENT_TYPE_ANDROID", email, password, returnSecureToken: true }, 
    { headers: { "User-Agent": "Dalvik/2.1.0", "Content-Type": "application/json" } });
    return res?.data?.idToken || null;
  } catch (e) { return null; }
}

async function setRank(token, url) {
  const ratingData = {
    cars: 100000, car_fix: 100000, car_collided: 100000, car_exchange: 100000, 
    car_trade: 100000, car_wash: 100000, slicer_cut: 100000, drift_max: 100000, 
    drift: 100000, cargo: 100000, delivery: 100000, taxi: 100000, levels: 100000, 
    gifts: 100000, fuel: 100000, offroad: 100000, speed_banner: 100000, 
    reactions: 100000, police: 100000, run: 100000, real_estate: 100000, 
    t_distance: 100000, treasure: 100000, block_post: 100000, push_ups: 100000, 
    burnt_tire: 100000, passanger_distance: 100000, time: 10000000000, race_win: 3000
  };
  try {
    const res = await axios.post(url, { data: JSON.stringify({ RatingData: ratingData }) }, { 
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } 
    });
    return res.status === 200;
  } catch (e) { return false; }
}

export default {
  async scheduled(event, env, ctx) {
    const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
    const chatId = env.ADMIN_CHAT_ID;
    
    // Получаем ВСЕ аккаунты из KV хранилища
    const allAccounts = await env.ACCOUNTS_KV.get("accounts_list", { type: "json" });
    
    if (!allAccounts || allAccounts.length === 0) {
        console.log("Аккаунты не найдены в KV");
        return;
    }

    const minute = new Date(event.scheduledTime).getUTCMinutes();
    let accounts = [];
    let name = "";

    // Распределение 100 аккаунтов на 6 партов каждые 5 минут (соответствует 20:00 – 20:25 МСК)
    if (minute === 0) { accounts = allAccounts.slice(0, 17); name = "PART 1 (20:00 МСК)"; }
    else if (minute === 5) { accounts = allAccounts.slice(17, 34); name = "PART 2 (20:05 МСК)"; }
    else if (minute === 10) { accounts = allAccounts.slice(34, 51); name = "PART 3 (20:10 МСК)"; }
    else if (minute === 15) { accounts = allAccounts.slice(51, 68); name = "PART 4 (20:15 МСК)"; }
    else if (minute === 20) { accounts = allAccounts.slice(68, 85); name = "PART 5 (20:20 МСК)"; }
    else if (minute === 25) { accounts = allAccounts.slice(85); name = "PART 6 (20:25 МСК)"; }

    if (accounts.length > 0) {
      await bot.telegram.sendMessage(chatId, `🚀 Запуск ${name}...`);
      
      let success = 0;
      for (const acc of accounts) {
        const token = await login(acc.email, acc.password, env.FIREBASE_LOGIN_URL);
        if (token && await setRank(token, env.RANK_URL)) {
          success++;
        } else {
          // Если на аккаунте ошибка, бот шлет уведомление, но НЕ останавливает цикл и продолжает дальше
          await bot.telegram.sendMessage(chatId, `❌ Ошибка на аккаунте: ${acc.email}`);
        }
      }
      
      const status = (success === accounts.length) ? "✅ Успешно" : `⚠️ Завершено с ошибками (${success}/${accounts.length})`;
      await bot.telegram.sendMessage(chatId, `${status} ${name}`);
    }
  }
};
