const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const sqlite3 = require("sqlite3").verbose();


const db = new sqlite3.Database("./assets/db/QuizDatabase.db", err => {
    if (err) { console.error(err); }
});

router.use(express.urlencoded({ extended: false }));
router.use(express.json());

const status_codes = {
    400: "Bad request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not found",
    500: "Internal server error"
};

const check_moderator = () => (req, res, next) => {
    if (req.isAuthenticated())
    {
        if (req.user.moderator === 1)
            return next();
    }
    return res.redirect("/error/403");
};

router.get("/pending", check_moderator(), (req, res) => {
    db.parallelize(() => {
        db.all(`SELECT * FROM
                    (SELECT quiz_id, name, description
                    FROM pending_locations
                    JOIN
                    pending_quizzes USING (location_id))
                JOIN
                    (SELECT quiz_id,
                    SUM(point_total) AS quiz_total
                    FROM pending_questions
                    GROUP BY quiz_id)
                USING (quiz_id)`,
        (err, result) =>
        {
            if (err) {
                console.error(err);
                return res.redirect("/error/500");
            }
            else if (result.length > 0) {
                return res.render("quiz_browser", {
                    pageTitle: "Pending Quizzes",
                    pending: true,
                    quizzes: result,
                    user: req.user
                });
            }
            else {
                return res.render("quiz_browser", {
                    pageTitle: "Pending Quizzes",
                    pending: true,
                    quizzes: result,
                    user: req.user
                });
            }
        });
    });
});

router.get("/pending/:id", check_moderator(), [ param("id").exists().isInt() ], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.redirect("/error/400");

    db.parallelize(() => {
        db.all(`SELECT * FROM
                    (SELECT * FROM
                        (SELECT * FROM
                        pending_locations
                        JOIN
                        pending_quizzes USING (location_id)
                        WHERE quiz_id = ?)
                    JOIN
                    pending_questions USING (quiz_id))
                JOIN pending_answers USING (question_id)`,
        id,
        (err, result) =>
        {
            if (err) {
                console.error(err);
                return res.redirect("/error/500");
            }
            else if (result.length > 0) {
                // Retrieve quiz metadata
                const { location_id, latitude, longitude, name, img, quiz_id, description } = result[0];

                // Create array of questions (with duplicates)
                const temp_questions = result.map(q => ({
                    question: q.question,
                    question_id: q.question_id,
                    point_total: q.point_total,
                    answers: result.map(a => {
                        if (a.question_id == q.question_id) {
                            return {
                                answer_id: a.answer_id,
                                answer: a.answer,
                                correct: a.correct
                            };
                        }
                    }).filter(elem => elem)
                }));

                // Filter duplicate questions
                const questions = [...new Map(temp_questions.map(item => [item["question_id"], item] )).values()];

                // Construct pending quiz object
                const pending_quiz = {
                    location_id: location_id,
                    latitude: latitude,
                    longitude: longitude,
                    name: name,
                    img: img,
                    quiz_id: quiz_id,
                    description: description,
                    questions: questions
                };

                return res.render("handle_pending", {
                    pageTitle: "Pending Quizzes",
                    user: req.user,
                    pending_quiz: pending_quiz
                });
            }
            else {
                console.error("Server error: no quizzes in the database");
                return res.redirect("/error/404");
            }
        });
    });
});

router.get("/", (req, res) => {
    db.parallelize(() => {
        db.all(`SELECT * FROM
                    (SELECT quiz_id, name, description
                    FROM locations
                    JOIN
                    quizzes USING (location_id))
                JOIN
                    (SELECT quiz_id,
                    SUM(point_total) AS quiz_total
                    FROM questions
                    GROUP BY quiz_id)
                USING (quiz_id)`,
        (err, result) =>
        {
            if (err) {
                console.error(err);
                return res.redirect("/error/500");
            }
            else if (result.length > 0) {
                return res.render("quiz_browser", {
                    pageTitle: "Quiz Browser",
                    pending: false,
                    quizzes: result,
                    user: req.user,
                    sort: 1
                });
            }
            else {
                console.error("Server error: no quizzes in the database");
                return res.redirect("/error/404");
            }
        });
    });
});

router.get("/uncompleted", (req, res) => {
    const user_id = req.isAuthenticated() ? req.user.user_id : undefined;

    db.parallelize(() => {
        db.all(`SELECT * FROM
                    (SELECT quiz_id FROM quizzes
                     EXCEPT
                     SELECT quiz_id FROM completed_quizzes WHERE user_id = ?)
                JOIN
                    (SELECT * FROM
                         (SELECT quiz_id, name, description
                         FROM locations
                         JOIN
                         quizzes USING (location_id))
                     JOIN
                         (SELECT quiz_id,
                         SUM(point_total) AS quiz_total
                         FROM questions
                         GROUP BY quiz_id)
                     USING (quiz_id))
                USING (quiz_id)`,
        user_id,
        (err, result) =>
        {
            if (err) {
                console.error(err);
                return res.redirect("/error/500");
            }
            else if (result.length > 0) {
                return res.render("quiz_browser", {
                    pageTitle: "Quiz Browser",
                    pending: false,
                    quizzes: result,
                    user: req.user,
                    sort: 2
                });
            }
            else {
                console.error("Server error: no quizzes in the database");
                return res.redirect("/error/404");
            }
        });
    });
});

router.get("/", (req, res) => {
    db.parallelize(() => {
        db.all(`SELECT * FROM
                    (SELECT quiz_id, name, description
                    FROM locations
                    JOIN
                    quizzes USING (location_id))
                JOIN
                    (SELECT quiz_id,
                    SUM(point_total) AS quiz_total
                    FROM questions
                    GROUP BY quiz_id)
                USING (quiz_id)`,
        (err, result) =>
        {
            if (err) {
                console.error(err);
                return res.redirect("/error/500");
            }
            else if (result.length > 0) {
                return res.render("quiz_browser", {
                    pageTitle: "Quiz Browser",
                    pending: false,
                    quizzes: result,
                    user: req.user
                });
            }
            else {
                console.error("Server error: no quizzes in the database");
                return res.redirect("/error/404");
            }
        });
    });
});


router.get("/:id", [ param("id").exists().isInt() ], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.redirect("/error/400");

    // Query database for quiz with specified id
    db.parallelize(() => {
        db.get(`SELECT description,img,name
                FROM quizzes
                JOIN
                locations USING (location_id)
                WHERE quiz_id = ?`,
        id,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.redirect("/error/500");
            }
            else if (result) {
                const { description, img, name } = result;

                return res.render("quiz", {
                    pageTitle: name,
                    user: req.user,
                    quizTitle: name,
                    imageSource: `${img.replace("/commons/", "/commons/thumb/")}/1280px-${img.split("/").filter(e => e.search(/(jpeg)|(jpg)|(png)/i) != -1)[0]}`,
                    quizDesc: description
                });
            }
            else {
                return res.redirect("/error/404");
            }
        });
    });
});

function insert_pending_answer(answer, questionID) {
    db.run(`INSERT INTO pending_answers(question_id, answer, correct)
            VALUES(?, ?, ?)`,
    [questionID, answer.text, answer.correct],
    function(err)
    {
        if (err) {
            console.error(err);
            return false;
        }
        else {
            return true;
        }
    });

    return true;
}

function insert_pending_question(question, quizID) {
    db.run(`INSERT INTO pending_questions(quiz_id, question, point_total)
            VALUES(?, ?, ?)`,
    [quizID, question.question, question.point_total],
    function(err)
    {
        if (err) {
            console.error(err);
            return false;
        }
        else {
            // get the last quiz id
            const questionID = this.lastID;

            // insert every answer to this question
            for (let i = 0; i < question.responses.length; ++i)
            {
                let answer;

                if ((i + 1) === question.correct)
                    answer = { text: question.responses[i], correct: 1 };
                else
                    answer = { text: question.responses[i], correct: 0 };

                if (!insert_pending_answer(answer, questionID))
                {
                    return false;
                }
            }

            return true;
        }
    });

    return true;
}

function insert_pending_quiz(quizObj, user_id) {
    // add quiz
    db.run(`INSERT INTO pending_quizzes(location_id, description)
            VALUES(?, ?)`,
    [quizObj.locationID, quizObj.description],
    function(err)
    {
        if (err) {
            console.error(err);
            return false;
        }
        else {
            // get the last quiz id
            const quizID = this.lastID;

            db.serialize(() => {
                db.run(`INSERT INTO submitted_quizzes(user_id, quiz_id, submission_date)
                        VALUES(?, ?, ?)`,
                [user_id, quizID, Math.floor(new Date().getTime() / 1000.0)],
                function(submit_error)
                {
                    if (submit_error) {
                        return false;
                    }
                    else {
                        // insert every question in the quiz
                        for (let i = 0; i < quizObj.questions.length; ++i)
                        {
                            if (!insert_pending_question(quizObj.questions[i], quizID))
                            {
                                return false;
                            }
                        }

                        return true;
                    }
                });
            });
        }
    });

    return true;
}

router.post("/submit",
    [body("location_name").exists().escape().trim()
        .withMessage("Must provide a location name"),
    body("img").exists().isURL().trim()
        .withMessage("Must provide a valid image URL"),
    body("description").exists().trim().isLength({ min: 10, max: 160 })
        .withMessage("Must provide a valid description"),
    body("coordinates").exists().isLatLong()
        .withMessage("Must provide valid coordinates"),
    body("questions").exists().isArray()
        .withMessage("Must provide valid questions"),
    body("questions").custom(questions => (questions.length < 5 ? false : true))
        .withMessage("Must provide at least five questions"),
    body("questions").custom(questions => (questions.length > 20 ? false : true))
        .withMessage("Must provide no more than twenty questions"),
    body("questions").custom(questions => {
        questions.forEach((question, index) => {
            const { responses, point_total, correct } = question;
            let question_prompt = question.question;

            if (((typeof point_total) === "number") && (parseInt(point_total) === point_total)) {
                if ((point_total >= 5) && (point_total <= 100)) {
                    if ((parseInt(point_total) % 5) === 0) { }
                    else { throw new Error(`Question ${index + 1}: point total must be a multiple of 5`); }
                }
                else { throw new Error(`Question ${index + 1}: please provide a valid point total`); }
            }
            else { throw new Error(`Question ${index + 1}: please provide a valid point total`); }

            // Validate correct answer
            if (((typeof correct) === "number") && (parseInt(correct) === correct)) {
                if ((correct > 0) && (correct < 5)) { }
                else { throw new Error(`Question ${index + 1}: please provide a valid answer`); }
            }
            else { throw new Error(`Question ${index + 1}: please provide a valid answer`); }

            // Validate question prompt
            if ((typeof question_prompt) === "string") {
                if (question_prompt.trim() !== "") {
                    question_prompt = question_prompt.trim();

                    if (question_prompt.slice(-1) === "?") { }
                    else { throw new Error(`Question ${index + 1}: formatting error, please end question prompt with '?'`); }
                }
                else { throw new Error(`Question ${index + 1}: prompt is invalid`); }
            }
            else { throw new Error(`Question ${index + 1}: prompt is invalid`); }

            // Validate responses
            responses.forEach((response, res_index) => {
                if ((typeof response) === "string") {
                    if ((response.trim() !== "") && (response.trim().length !== 0)) { }
                    else { throw new Error(`Question ${index + 1}, answer ${res_index + 1}: answer is invalid`); }
                }
                else { throw new Error(`Question ${index + 1}, answer ${res_index + 1}: answer is invalid`); }
            });
        });

        return true;
    })],
    (req, res) =>
    {
        const errors = validationResult(req);

        if (!req.isAuthenticated())
            return res.status(403).send({ status_code: 403, msg: `403: ${status_codes[403]}` });

        if (!errors.isEmpty())
            return res.status(400).send({ status_code: 400, msg: `400: ${status_codes[400]}`, errors: errors.array() });

        const { location_name, img, description, coordinates, questions } = req.body;
        const [ lat, long ] = coordinates.split(",").map(coord => parseFloat(coord));

        // Create account in database
        db.serialize(() => {
            db.run(`INSERT INTO pending_locations(latitude, longitude, name, img)
                    VALUES(?, ?, ?, ?)`,
            [lat, long, location_name, img],
            function(location_error)
            {
                if (location_error)
                {
                    console.error(location_error);
                    return res.status(500).send({ status_code: 500, msg: `500: ${status_codes[500]}` });
                }

                const location_id = this.lastID;

                const result = insert_pending_quiz({
                    locationID: location_id,
                    description: description,
                    questions: questions
                }, req.user.user_id);

                if (result)
                    return res.status(200).send({ status_code: 200, msg: `200: ${status_codes[200]}` });
                else
                    return res.status(500).send({ status_code: 500, msg: `500: ${status_codes[500]}` });
            });
        });
    });

function insert_answer(answer, questionID) {
    db.run(`INSERT INTO answers(question_id, answer, correct)
            VALUES(?, ?, ?)`,
    [questionID, answer.text, answer.correct],
    function(err)
    {
        if (err) {
            console.error(err);
            return false;
        }
        else {
            return true;
        }
    });

    return true;
}

function insert_question(question, quizID) {
    db.run(`INSERT INTO questions(quiz_id, question, point_total)
            VALUES(?, ?, ?)`,
    [quizID, question.question, question.point_total],
    function(err)
    {
        if (err) {
            console.error(err);
            return false;
        }
        else {
            // get the last quiz id
            const questionID = this.lastID;

            // insert every answer to this question
            for (let i = 0; i < question.responses.length; ++i)
            {
                let answer;

                if ((i + 1) === question.correct)
                    answer = { text: question.responses[i], correct: 1 };
                else
                    answer = { text: question.responses[i], correct: 0 };

                if (!insert_answer(answer, questionID))
                {
                    return false;
                }
            }

            return true;
        }
    });

    return true;
}

function insert_quiz(quizObj) {
    // add quiz
    db.run(`INSERT INTO quizzes(location_id, description)
            VALUES(?, ?)`,
    [quizObj.locationID, quizObj.description],
    function(err)
    {
        if (err) {
            console.error(err);
            return false;
        }
        else {
            // get the last quiz id
            const quizID = this.lastID;

            // insert every question in the quiz
            for (let i = 0; i < quizObj.questions.length; ++i)
            {
                if (!insert_question(quizObj.questions[i], quizID))
                {
                    return false;
                }
            }

            return true;
        }
    });

    return true;
}

function remove_pending_quiz(quizId) {
    db.run(`DELETE FROM pending_quizzes
            WHERE quiz_id = ?`,
    quizId,
    function(err)
    {
        if (err) {
            console.error(err);
            return false;
        }
        else {
            return true;
        }
    });

    return true;
}

router.post("/approve/:id",
    [body("location_name").exists().escape().trim()
        .withMessage("Must provide a location name"),
    body("img").exists().isURL().trim()
        .withMessage("Must provide a valid image URL"),
    body("description").exists().trim().isLength({ min: 10, max: 160 })
        .withMessage("Must provide a valid description"),
    body("coordinates").exists().isLatLong()
        .withMessage("Must provide valid coordinates"),
    body("questions").exists().isArray()
        .withMessage("Must provide valid questions"),
    param("id").exists().isInt()
        .withMessage("Must provide valid location id"),
    body("questions").custom(questions => {
        questions.forEach((question, index) => {
            const { responses, point_total, correct } = question;
            let question_prompt = question.question;

            if (((typeof point_total) === "number") && (parseInt(point_total) === point_total)) {
                if ((point_total >= 5) && (point_total <= 100)) {
                    if ((parseInt(point_total) % 5) === 0) { }
                    else { throw new Error(`Question ${index + 1}: point total must be a multiple of 5`); }
                }
                else { throw new Error(`Question ${index + 1}: please provide a valid point total`); }
            }
            else { throw new Error(`Question ${index + 1}: please provide a valid point total`); }

            // Validate correct answer
            if (((typeof correct) === "number") && (parseInt(correct) === correct)) {
                if ((correct > 0) && (correct < 5)) { }
                else { throw new Error(`Question ${index + 1}: please provide a valid answer`); }
            }
            else { throw new Error(`Question ${index + 1}: please provide a valid answer`); }

            // Validate question prompt
            if ((typeof question_prompt) === "string") {
                if (question_prompt.trim() !== "") {
                    question_prompt = question_prompt.trim();

                    if (question_prompt.slice(-1) === "?") { }
                    else { throw new Error(`Question ${index + 1}: formatting error, please end question prompt with '?'`); }
                }
                else { throw new Error(`Question ${index + 1}: prompt is invalid`); }
            }
            else { throw new Error(`Question ${index + 1}: prompt is invalid`); }

            // Validate responses
            responses.forEach((response, res_index) => {
                if ((typeof response) === "string") {
                    if ((response.trim() !== "") && (response.trim().length !== 0)) { }
                    else { throw new Error(`Question ${index + 1}, answer ${res_index + 1}: answer is invalid`); }
                }
                else { throw new Error(`Question ${index + 1}, answer ${res_index + 1}: answer is invalid`); }
            });
        });

        return true;
    })],
    (req, res) =>
    {
        const errors = validationResult(req);

        if (!errors.isEmpty())
            return res.status(400).send({ status_code: 400, msg: `400: ${status_codes[400]}`, errors: errors.array() });

        const pending_quiz_id = parseInt(req.params.id);
        const { location_name, img, description, coordinates, questions } = req.body;
        const [ lat, long ] = coordinates.split(",").map(coord => parseFloat(coord));

        // Create account in database
        db.parallelize(() => {
            db.run(`INSERT INTO locations(latitude, longitude, name, img)
                    VALUES(?, ?, ?, ?)`,
            [lat, long, location_name, img],
            function(location_error)
            {
                if (location_error)
                {
                    console.error(location_error);
                    return res.status(500).send({ status_code: 500, msg: `500: ${status_codes[500]}` });
                }

                const location_id = this.lastID;
                const result = insert_quiz({
                    locationID: location_id,
                    description: description,
                    questions: questions
                });

                if (result)
                {
                    if (remove_pending_quiz(pending_quiz_id))
                        return res.status(200).send({ status_code: 200, msg: `200: ${status_codes[200]}` });
                    else
                        return res.status(500).send({ status_code: 500, msg: `500: ${status_codes[500]}` });
                }
                else
                {
                    return res.status(500).send({ status_code: 500, msg: `500: ${status_codes[500]}` });
                }
            });
        });
    });

router.post("/reject/:id", [ param("id").exists().isInt().withMessage("Must provide valid location id")], (req, res) =>
{
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).send({ status_code: 400, msg: `400: ${status_codes[400]}`, errors: errors.array() });

    const pending_quiz_id = parseInt(req.params.id);

    if (remove_pending_quiz(pending_quiz_id)) {
        return res.status(200).send({ status_code: 200, msg: `200: ${status_codes[200]}` });
    }
    else {
        return res.status(500).send({ status_code: 500, msg: `500: ${status_codes[500]}` });
    }
});


module.exports = router;
