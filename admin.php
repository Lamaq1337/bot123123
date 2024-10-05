<?php
$mysqli = new mysqli('localhost', 'root', '', 'my_bot_db');

if ($mysqli->connect_error) {
    die('Ошибка подключения (' . $mysqli->connect_errno . ') ' . $mysqli->connect_error);
}

// Модерация пользователей
if (isset($_POST['approve'])) {
    $user_id = $_POST['user_id'];
    $mysqli->query("UPDATE users SET is_approved = 1 WHERE id = $user_id");
}

// Получение заявок
$applications_result = $mysqli->query("SELECT a.id, u.username, a.application_text, a.is_responded 
                                       FROM applications a 
                                       JOIN users u ON a.user_id = u.id");

// Получение пользователей для модерации
$users = $mysqli->query("SELECT * FROM users WHERE is_approved = 0");

// Обработка ответа на заявку
if (isset($_POST['respond'])) {
    $application_id = $_POST['application_id'];
    $response_text = $_POST['response_text'];

    // Вставка ответа в базу данных
    if ($mysqli->query("INSERT INTO responses (application_id, response_text) VALUES ($application_id, '$response_text')")) {
        // Обновляем статус заявки, что на нее был дан ответ
        $mysqli->query("UPDATE applications SET is_responded = 1 WHERE id = $application_id");
    } else {
        echo "Ошибка вставки ответа: " . $mysqli->error;
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Panel</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f4f4f4;
        }
        h1, h2 {
            color: #333;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
        }
        th {
            background-color: #007BFF;
            color: white;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        tr:hover {
            background-color: #ddd;
        }
        button {
            background-color: #28a745;
            color: white;
            border: none;
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 5px;
        }
        button:hover {
            background-color: #218838;
        }
        .tab {
            display: none;
        }
        .active {
            display: block;
        }
        .tabs {
            margin-bottom: 20px;
        }
        .tablinks {
            cursor: pointer;
            padding: 10px 15px;
            border: 1px solid #007BFF;
            background-color: #007BFF;
            color: white;
            margin-right: 5px;
        }
        .tablinks.active {
            background-color: #0056b3;
        }
    </style>
</head>
<body>

<h1>Панель администратора</h1>

<div class="tabs">
    <button class="tablinks active" onclick="openTab(event, 'registration')">Заявки на регистрацию</button>
    <button class="tablinks" onclick="openTab(event, 'applications')">Заявки пользователей</button>
</div>

<!-- Заявки на регистрацию -->
<div id="registration" class="tab active">
    <h2>Заявки на регистрацию</h2>
    <table>
        <tr>
            <th>Username</th>
            <th>Имя</th>
            <th>Email</th>
            <th>Одобрить</th>
        </tr>
        <?php while ($user = $users->fetch_assoc()) : ?>
            <tr>
                <td><?php echo $user['username']; ?></td>
                <td><?php echo $user['name']; ?></td>
                <td><?php echo $user['email']; ?></td>
                <td>
                    <form method="post">
                        <input type="hidden" name="user_id" value="<?php echo $user['id']; ?>">
                        <button type="submit" name="approve">Одобрить</button>
                    </form>
                </td>
            </tr>
        <?php endwhile; ?>
    </table>
</div>

<!-- Заявки пользователей -->
<div id="applications" class="tab">
    <h2>Заявки пользователей</h2>
    <table>
        <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Заявка</th>
            <th>Ответ</th>
        </tr>
        <?php while ($application = $applications_result->fetch_assoc()) : ?>
            <tr style="<?php echo $application['is_responded'] ? 'background-color: #4c7101;' : ''; ?>">
                <td><?php echo $application['id']; ?></td>
                <td><?php echo $application['username']; ?></td>
                <td><?php echo $application['application_text']; ?></td>
                <td>
                    <form method="post">
                        <input type="hidden" name="application_id" value="<?php echo $application['id']; ?>">
                        <input type="text" name="response_text" placeholder="Введите ответ" required>
                        <button type="submit" name="respond">Ответить</button>
                    </form>
                </td>
            </tr>
        <?php endwhile; ?>
    </table>
</div>

<script>
    function openTab(evt, tabName) {
        var i, tabcontent, tablinks;

        // Скрыть все вкладки
        tabcontent = document.getElementsByClassName("tab");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }

        // Удалить активный класс с всех кнопок
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].classList.remove("active");
        }

        // Показать текущую вкладку и добавить активный класс к кнопке
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.classList.add("active");
    }
</script>

</body>
</html>
