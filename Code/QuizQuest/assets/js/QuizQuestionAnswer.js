class Quiz {
    constructor(locationID, description, questions) {
        this.locationID = locationID;
        this.description = description;
        this.questions = questions;
    }
}

class Question {
    constructor(quiz_id, questionTxt, pointTotal, answers) {
        this.quizID = quiz_id;
        this.text = questionTxt;
        this.points = pointTotal;
        this.answers = answers;
    }
}

class Answer {
    constructor(question_id, answerTxt, correctness) {
        this.text = answerTxt;
        this.correct = correctness;
        this.questionID = question_id;
    }
}

exports.Quiz = Quiz;
exports.Question = Question;
exports.Answer = Answer;
