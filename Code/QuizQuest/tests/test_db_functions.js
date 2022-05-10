const sqlite3 = require("sqlite3").verbose();
const { Quiz, Question, Answer } = require("./QuizQuestionAnswer.js");

// open db
const db = new sqlite3.Database("../db/QuizDatabase.db", sqlite3.OPEN_READWRITE);

// for cleaning up after tests
function deleteQuiz(testQuiz){
    var sql = `DELETE FROM pending_quizzes WHERE location_id = -1`;
    
    db.run(sql, function(err) {
        if (err) {
            return console.error(err.message);
        }
    });
    
    // delete every question
    for (let i = 0; i < testQuiz.questions.length; i++) {
        deleteQuestion(testQuiz.questions[i]);
    }
}

// delete questions
function deleteQuestion(testQuestion){
    var sql = `DELETE FROM pending_questions WHERE quiz_id = -1`;
    
    db.run(sql, function(err) {
        if (err) {
            return console.error(err.message);
        }
    });
    
    // delete every answer to this question
    for (let i = 0; i < testQuestion.answers.length; ++i) {
        deleteAnswer(testQuestion.answers[i]);
    }
}

// delete answers
function deleteAnswer(testAnswer){
    var sql = `DELETE FROM pending_answers WHERE question_id = -1`;
    
    db.run(sql, function(err) {
        if (err) {
            return console.error(err.message);
        }
    });
}

// every test is the same, just using different quiz objects
// therefore this is the bulk of the tests themselves
function insertAQuiz(testQuiz){
    // did the function return false? that means it never got entered into the db
    if (!insert_pending_quiz(testQuiz)){
        return false;
    }
    
    // our query
    var sql = `SELECT COUNT(*) FROM pending_quizzes WHERE location_id = ?`
              
    // now look in the db to see if it was inserted
    var count;
    db.get(sql, [testQuiz.locationID], (err, row) => {
        if (err) {
            return false;
        }
        count = row;
    });
    
    // something is seriously wrong!
    if (count != 1){
        return false;
    }
    
    // okay, everything is fine - now clean up after the test
    deleteQuiz(testQuiz);
    return true;
}

// test the case of no questions to insert
function testNoQuestions(){
    // create a quiz object for testing purposes
    var testQuiz = {locationID: -1, description: "testing quiz", questions: []};
    
    // call the insert function
    if (!insertAQuiz(testQuiz)){
        throw "No questions test failed.";
    }
}

// a quiz with question that don't have answers
function testNoAnswers(){
    var ques = {quizID: -1, text: "test", points: 0, answers: []};
    var testQuiz = {locationID: -1, description: "testing quiz", questions: [ques]};
    
    // call the insert function
    if (!insertAQuiz(testQuiz)){
        throw "No answers test failed.";
    }
}

// an ordinary quiz, with questions that each have answers
function testOrdinary(){
    var ans = {text: "test", correct: 0, questionID: -1};
    var ques = {quizID: -1, text: "test", points: 0, answers: [ans]};
    var testQuiz = {locationID: -1, description: "testing quiz", questions: [ques]};
    
    // call the insert function
    if (!insertAQuiz(testQuiz)){
        throw "Normal quiz test failed.";
    }
}

// main function
function main(){
    // run the tests
    try{
        testNoQuestions();
        testNoAnswers();
        testOrdinary();
    }
    // did any fail?
    catch(err){
        console.log(err);
        return;
    }
    
    // if the code reaches here, everything passed
    console.log("All tests passed. Exiting...");
}

// run main
main();

// close the db
db.close((err) => {
    if (err) {
        return console.error(err.message);
    }
});