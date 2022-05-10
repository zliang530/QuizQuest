import sqlite3

conn = sqlite3.connect('QuizDatabase.db')
c = conn.cursor()


def create_database():
    # Regular tables
    c.execute('''CREATE TABLE "answers" (
                "answer_id"	INTEGER NOT NULL UNIQUE,
                "question_id"	INTEGER NOT NULL,
                "answer"	TEXT NOT NULL COLLATE RTRIM,
                "correct"	INTEGER NOT NULL,
                PRIMARY KEY("answer_id" AUTOINCREMENT))''')

    c.execute('''CREATE TABLE IF NOT EXISTS "completed_quizzes" (
                 "user_id"   INTEGER NOT NULL,
                 "quiz_id"   INTEGER NOT NULL,
                 "completion_date"   TEXT NOT NULL)''')

    c.execute('''CREATE TABLE IF NOT EXISTS "locations" (
                 "location_id"   INTEGER NOT NULL UNIQUE,
                 "latitude"  REAL NOT NULL,
                 "longitude" REAL NOT NULL,
                 "name"  TEXT NOT NULL COLLATE RTRIM,
                 "img"   TEXT COLLATE RTRIM,
                 PRIMARY KEY("location_id" AUTOINCREMENT))''')

    c.execute('''CREATE TABLE IF NOT EXISTS "questions" (
                 "question_id"   INTEGER NOT NULL UNIQUE,
                 "quiz_id"   INTEGER NOT NULL,
                 "question"  TEXT NOT NULL COLLATE RTRIM,
                 "point_total"   INTEGER NOT NULL,
                 PRIMARY KEY("question_id" AUTOINCREMENT))''')

    c.execute('''CREATE TABLE IF NOT EXISTS "quizzes" (
                 "quiz_id"   INTEGER NOT NULL UNIQUE,
                 "location_id"   INTEGER NOT NULL,
                 "description"   TEXT COLLATE RTRIM,
                 PRIMARY KEY("quiz_id" AUTOINCREMENT))''')

    c.execute('''CREATE TABLE IF NOT EXISTS "users" (
                 "user_id"   INTEGER NOT NULL UNIQUE,
                 "username"  TEXT NOT NULL UNIQUE COLLATE NOCASE,
                 "password_hash" TEXT NOT NULL,
                 "score" INTEGER NOT NULL,
                 "is_moderator" INTEGER NOT NULL,
                 "country_of_origin" TEXT COLLATE RTRIM,
                 PRIMARY KEY("user_id" AUTOINCREMENT))''')

    # Pending tables
    c.execute('''CREATE TABLE IF NOT EXISTS "submitted_quizzes" (
                 "user_id"   INTEGER NOT NULL,
                 "quiz_id"   INTEGER NOT NULL,
                 "submission_date"   TEXT NOT NULL)''')

    c.execute('''CREATE TABLE "pending_answers" (
                "answer_id"	INTEGER NOT NULL UNIQUE,
                "question_id"	INTEGER NOT NULL,
                "answer"	TEXT NOT NULL COLLATE RTRIM,
                "correct"	INTEGER NOT NULL,
                PRIMARY KEY("answer_id" AUTOINCREMENT))''')

    c.execute('''CREATE TABLE IF NOT EXISTS "pending_locations" (
                 "location_id"   INTEGER NOT NULL UNIQUE,
                 "latitude"  REAL NOT NULL,
                 "longitude" REAL NOT NULL,
                 "name"  TEXT NOT NULL COLLATE RTRIM,
                 "img"   TEXT COLLATE RTRIM,
                 PRIMARY KEY("location_id" AUTOINCREMENT))''')

    c.execute('''CREATE TABLE IF NOT EXISTS "pending_questions" (
                 "question_id"   INTEGER NOT NULL UNIQUE,
                 "quiz_id"   INTEGER NOT NULL,
                 "question"  TEXT NOT NULL COLLATE RTRIM,
                 "point_total"   INTEGER NOT NULL,
                 PRIMARY KEY("question_id" AUTOINCREMENT))''')

    c.execute('''CREATE TABLE IF NOT EXISTS "pending_quizzes" (
                 "quiz_id"   INTEGER NOT NULL UNIQUE,
                 "location_id"   INTEGER NOT NULL,
                 "description"   TEXT COLLATE RTRIM,
                 PRIMARY KEY("quiz_id" AUTOINCREMENT))''')


def insert_locations(filename="locations.txt"):
    # Read data from file
    with open(filename, "r", encoding="utf-8") as f:
        rows = f.read().strip().split("\n")[1:]
        rows = [[value.strip() for value in row.split(";")] for row in rows]

    for latitude, longitude, name, img in rows:
        # Insert a row of data
        c.execute('''INSERT INTO locations(latitude, longitude, name, img) VALUES(?, ?, ?, ?)''',
                  (latitude, longitude, name, img))


def insert_quizzes(filename="quizzes.txt"):
    # Read data from file
    with open(filename, "r", encoding="utf-8") as f:
        rows = f.read().strip().split("\n")[1:]
        rows = [[value.strip() for value in row.split(";")] for row in rows]

    for location_id, description in rows:
        # Insert a row of data
        c.execute('''INSERT INTO quizzes(location_id, description) VALUES(?, ?)''',
                  (location_id, description))


def insert_questions(filename="questions.txt"):
    # Read data from file
    with open(filename, "r", encoding="utf-8") as f:
        rows = f.read().strip().split("\n")[1:]
        rows = [[value.strip() for value in row.split(";")] for row in rows]

    for quiz_id, question, point_total in rows:
        # Insert a row of data
        c.execute('''INSERT INTO questions(quiz_id, question, point_total) VALUES(?, ?, ?)''',
                  (quiz_id, question, int(point_total)))


def insert_answers(filename="answers.txt"):
    # Read data from file
    with open(filename, "r", encoding="utf-8") as f:
        rows = f.read().strip().split("\n")[1:]
        rows = [[value.strip() for value in row.split(";")] for row in rows]

    for question_id, answer, correct in rows:
        # Insert a row of data
        c.execute('''INSERT INTO answers(question_id, answer, correct) VALUES(?, ?, ?)''',
                  (question_id, answer, correct))


# Pass in a specific filename if needed
create_database()
insert_locations()
insert_quizzes()
insert_questions()
insert_answers()

# Save (commit) the changes
conn.commit()

# We can also close the connection if we are done with it.
# Just be sure any changes have been committed or they will be lost.
conn.close()
