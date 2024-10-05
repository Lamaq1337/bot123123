const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');

// Твой токен бота
const token = '7877580792:AAGTLODOonq9ZTZoClwGsQwwGQhuq52Wfv0';
const bot = new TelegramBot(token, { polling: true });

// Подключение к базе данных
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'my_bot_db'
});

// Регистрация пользователя
const registrationState = {};

bot.onText(/\/register/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Пожалуйста, введите ваше имя:');
    registrationState[chatId] = { step: 1 }; // Устанавливаем шаг регистрации
});

// Обработка ответов пользователя
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const state = registrationState[chatId];

    if (state && state.step === 1) {
        // Сохраняем имя
        registrationState[chatId].name = msg.text;
        bot.sendMessage(chatId, 'Спасибо! Теперь введите вашу почту:');
        registrationState[chatId].step = 2; // Переходим к следующему шагу
    } else if (state && state.step === 2) {
        // Сохраняем почту и регистрируем пользователя
        const email = msg.text;
        const name = registrationState[chatId].name;

        connection.query('INSERT INTO users (username, chat_id, name, email) VALUES (?, ?, ?, ?)', 
        [msg.from.username, chatId, name, email], (err) => {
            if (err) {
                console.error('Ошибка регистрации:', err); // Логирование ошибки
                bot.sendMessage(chatId, 'Ошибка регистрации. Попробуйте позже.');
                return;
            }
            bot.sendMessage(chatId, 'Вы успешно зарегистрированы. Ожидайте одобрения.');
            delete registrationState[chatId]; // Очищаем состояние после регистрации
        });
    }
});

// Проверка статуса пользователя
bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;

    connection.query('SELECT is_approved FROM users WHERE chat_id = ?', [chatId], (err, results) => {
        if (err) {
            console.error('Ошибка проверки статуса:', err); // Логирование ошибки
            bot.sendMessage(chatId, 'Ошибка проверки статуса.');
            return;
        }
        if (results.length > 0 && results[0].is_approved) {
            bot.sendMessage(chatId, 'Вы одобрены. Можете использовать бота.');
        } else {
            bot.sendMessage(chatId, 'Вы еще не одобрены.');
        }
    });
});

// Обработка заявок пользователей
const reportState = {}; // Объект для отслеживания состояния отчетов

// Обработка команды /report
bot.onText(/\/report/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Пожалуйста, введите текст вашей заявки:');
    reportState[chatId] = { step: 1 }; // Устанавливаем шаг для состояния заявки
});

// Обработка текстовых сообщений (для заявки)
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    // Проверка состояния заявки
    if (reportState[chatId] && reportState[chatId].step === 1) {
        const applicationText = msg.text;

        connection.query('SELECT id FROM users WHERE chat_id = ?', [chatId], (err, results) => {
            if (err || results.length === 0) {
                bot.sendMessage(chatId, 'Вы должны быть зарегистрированы для отправки заявок.');
                delete reportState[chatId]; // Очищаем состояние при ошибке
                return;
            }

            const userId = results[0].id;
            connection.query('INSERT INTO applications (user_id, application_text) VALUES (?, ?)', 
            [userId, applicationText], (err) => {
                if (err) {
                    console.error('Ошибка отправки заявки:', err);
                    bot.sendMessage(chatId, 'Ошибка отправки заявки.');
                    delete reportState[chatId]; // Очищаем состояние при ошибке
                    return;
                }
                bot.sendMessage(chatId, 'Ваша заявка отправлена. Вы можете проверить статус заявки с помощью команды /checkstatus.');
                delete reportState[chatId]; // Очищаем состояние после отправки заявки
            });
        });
    }
});

// Проверка статуса заявки
bot.onText(/\/checkstatus/, (msg) => {
    const chatId = msg.chat.id;

    connection.query('SELECT a.id, a.application_text, r.response_text, r.created_at AS response_date ' +
                     'FROM applications a LEFT JOIN responses r ON a.id = r.application_id ' +
                     'WHERE a.user_id = (SELECT id FROM users WHERE chat_id = ?)', 
                     [chatId], (err, results) => {
        if (err) {
            console.error('Ошибка проверки статуса заявки:', err);
            bot.sendMessage(chatId, 'Ошибка проверки статуса.');
            return;
        }

        if (results.length === 0) {
            bot.sendMessage(chatId, 'У вас нет активных заявок.');
            return;
        }

        let responseMessage = 'Статус ваших заявок:\n';
        results.forEach(result => {
            responseMessage += `Заявка ID: ${result.id}\nТекст: ${result.application_text}\n`;
            if (result.response_text) {
                responseMessage += `Ответ: ${result.response_text} (Дата: ${result.response_date})\n`;
            } else {
                responseMessage += 'Статус: Ожидает ответа.\n';
            }
            responseMessage += '--------------------------------\n';
        });

        bot.sendMessage(chatId, responseMessage);
    });
});


// Закрытие соединения при завершении работы бота
process.on('SIGINT', () => {
    connection.end(err => {
        if (err) {
            console.error('Ошибка при закрытии соединения:', err);
        } else {
            console.log('Соединение с базой данных закрыто.');
        }
        process.exit();
    });
});