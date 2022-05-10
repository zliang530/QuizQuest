const sqlite3 = require("sqlite3").verbose();
const { Quiz, Question, Answer } = require("./QuizQuestionAnswer.js");

// open db
const db = new sqlite3.Database("../db/QuizDatabase.db", sqlite3.OPEN_READWRITE);

function insert_pending_answer(answer, questionID) {
    db.run(`INSERT INTO pending_answers(question_id, answer, correct)
            VALUES($question, $answerTxt, $correct)`,
    {
        $question: questionID,
        $answerTxt: answer.text,
        $correct: answer.correct
    },
    err => {
        if (err) {
            return false; // failed
        }
    });
}

function insert_pending_question(question, quizID) {
    let questionID;

    db.run(`INSERT INTO pending_questions(quiz_id, question_text, point_total)
            VALUES($quiz, $text, $points)`,
    {
        $quiz: quizID,
        $desc: question.text,
        $points: question.points
    },
    err => {
        if (err) {
            return false; // failed
        }

        // get the last quiz id
        questionID = this.lastID;
    });

    // insert every answer to this question
    for (let i = 0; i < question.answers.length; ++i) {
        insert_pending_answer(question.answers[i], questionID);
    }
}

function insert_pending_quiz(quizObj) {
    let quizID;

    // add quiz
    db.run(`INSERT INTO pending_quizzes(location_id, description)
            VALUES($loc, $desc)`,
    {
        $loc: quizObj.locationID,
        $desc: quizObj.description
    },
    err => {
        if (err) {
            return false; // failed
        }

        // get the last quiz id
        quizID = this.lastID;
    });

    // insert every question in the quiz
    for (let i = 0; i < quizObj.questions.length; i++) {
        insert_pending_question(quizObj.questions[i], quizID);
    }
}

export { insert_pending_quiz };
