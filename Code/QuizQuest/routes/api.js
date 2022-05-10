const { param, validationResult } = require("express-validator");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const router = express.Router();

const db = new sqlite3.Database("./assets/db/QuizDatabase.db", err => {
    if (err) { console.error(err); }
});

router.use(express.urlencoded({ extended: false }));
router.use(express.json());

function resize_image(img, resolution) {
    return `${img.replace("/commons/", "/commons/thumb/")}/${resolution}px-${img.split("/").filter(e => e.search(/(jpeg)|(jpg)|(png)/i) != -1)[0]}`;
}

const status_codes = {
    400: "Bad request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not found",
    500: "Internal server error"
};

// Get all locations
router.get("/locations", (req, res) => {
    db.parallelize(() => {
        db.all(`SELECT quiz_id,latitude,longitude,name,img
                FROM locations
                JOIN
                quizzes USING (location_id)`,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(`500: ${status_codes[500]}`);
            }
            else {
                const modified = result.map(r => {
                    const { quiz_id, latitude, longitude, name, img } = r;
                    return {
                        quiz_id: quiz_id,
                        latitude: latitude,
                        longitude: longitude,
                        img: resize_image(img, 200),
                        name: name
                    };
                });

                return res.send(modified);
            }
        });
    });
});

// Get a specific location by id
router.get("/locations/:id", [ param("id").exists().isInt() ], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).send(`400: ${status_codes[400]}`);

    // Query database for user with specified id
    db.parallelize(() => {
        db.get("SELECT * FROM locations WHERE location_id = ?", id, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(`500: ${status_codes[500]}`);
            }
            else {
                return res.send(result);
            }
        });
    });
});

// Get the three quizzes with locations closest to the given id
router.get("/quiz/:id/nearby", [ param("id").exists().isInt() ], (req,res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).send(`400: ${status_codes[400]}`);

    db.parallelize(() => {
        db.get(`SELECT latitude,longitude
                FROM quizzes
                JOIN locations USING (location_id)
                WHERE quiz_id = ?`,
        id,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(400).send(`400: ${status_codes[400]}`);
            }
            else {
                const { latitude, longitude } = result;

                db.parallelize(() => {
                    db.all(`SELECT quiz_id,name,img,description
                            FROM
                            (
                                SELECT location_id,latitude,longitude,name,img,
                                ((?-latitude)*(?-latitude)) + ((?-longitude)*(?-longitude)) AS distance
                                FROM locations
                                WHERE (distance <> 0.0) AND (distance < 100)
                                ORDER by distance ASC
                                LIMIT 3
                            ) AS nearby_locations
                            JOIN
                            (SELECT * FROM quizzes) AS quizzes
                            ON
                            nearby_locations.location_id = quizzes.location_id`,
                    [latitude, latitude, longitude, longitude],
                    (nearby_err, nearby_locations) => {
                        if (nearby_err) {
                            console.error(nearby_err);
                            return res.status(500).send(`500: ${status_codes[500]}`);
                        }
                        else {
                            const modified = nearby_locations.map(r => {
                                const { quiz_id, name, img,  description } = r;
                                return {
                                    quiz_id: quiz_id,
                                    name: name,
                                    img: resize_image(img, 200),
                                    description: description
                                };
                            });

                            return res.send(modified);
                        }
                    });
                });
            }
        });
    });
});


// Get all quizzes
router.get("/quizzes", (req, res) => {
    db.parallelize(() => {
        db.all("SELECT * FROM quizzes", (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(`500: ${status_codes[500]}`);
            }
            else {
                return res.send(result);
            }
        });
    });
});

// Get a specific quiz by id
router.get("/quizzes/:id", [ param("id").exists().isInt() ], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).send(`400: ${status_codes[400]}`);

    // Query database for quiz with specified id
    db.parallelize(() => {
        db.get(`SELECT quiz_id,location_id,description,img,name
                FROM quizzes
                JOIN
                locations USING (location_id)
                WHERE quiz_id = ?`,
        id,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(`500: ${status_codes[500]}`);
            }
            else if (result) {
                const { quiz_id, location_id, description, img, name } = result;

                return res.json({
                    quiz_id: quiz_id,
                    location_id: location_id,
                    description: description,
                    img: resize_image(img, 1280),
                    name: name
                });
            }
            else {
                return res.status(404).send(`404: ${status_codes[404]}`);
            }
        });
    });
});

// Get all questions associated with a specific quiz
router.get("/quizzes/questions/:id", [ param("id").exists().isInt() ], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).send(`400: ${status_codes[400]}`);

    // Query database for questions with specified id
    db.parallelize(() => {
        db.all("SELECT * FROM questions WHERE quiz_id = ?", id, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(`500: ${status_codes[500]}`);
            }
            else {
                return res.send(result);
            }
        });
    });
});

// Get a specific question by id
router.get("/questions/:id", [ param("id").exists().isInt() ], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).send(`400: ${status_codes[400]}`);

    // Query database for question with specified id
    db.parallelize(() => {
        db.get("SELECT * FROM questions WHERE question_id = ?", id, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(`500: ${status_codes[500]}`);
            }
            else {
                return res.send(result);
            }
        });
    });
});

// Get all answers associated with a specific quiz
router.get("/questions/answers/:id", [ param("id").exists().isInt() ], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).send(`400: ${status_codes[400]}`);

    // Query database for answers with specified id
    db.parallelize(() => {
        db.all(`SELECT answer_id, answer
                FROM answers
                WHERE question_id = ?`,
        id,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(`500: ${status_codes[500]}`);
            }
            else {
                return res.send(result);
            }
        });
    });
});

// Get the correct answer for a specific quiz id
router.get("/questions/answer/:id", [ param("id").exists().isInt() ], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).send(`400: ${status_codes[400]}`);

    // Query database for the correct answer assocated with a given question id
    db.parallelize(() => {
        db.get(`SELECT answer_id
                FROM answers
                WHERE (question_id = ?) AND (correct = 1)`,
        id,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(`500: ${status_codes[500]}`);
            }
            else {
                return res.send(result);
            }
        });
    });
});

// Get a specific answer by id and return whether it's correct or not (used for sesssion score)
router.get("/answers/:id", [ param("id").exists().isInt() ], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).send(`400: ${status_codes[400]}`);

    // Query database for answers with specified id
    db.parallelize(() => {
        db.get(`SELECT a.question_id, answer_id, point_total, correct
                FROM
                (SELECT question_id, point_total FROM questions) AS q
                JOIN
                (SELECT * FROM answers) AS a
                ON a.question_id = q.question_id
                WHERE answer_id = ?`,
        id,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(`500: ${status_codes[500]}`);
            }
            else {
                const { question_id, point_total, correct } = result;

                if (req.isAuthenticated())
                {
                    if (!req.user.questions_completed) {
                        req.user.questions_completed = {};
                        req.user.questions_completed[question_id] = (correct == 1 ? point_total : 0);
                    }
                    else if (!req.user.questions_completed[question_id] ) {
                        req.user.questions_completed[question_id] = (correct == 1 ? point_total : 0);
                    }
                }

                return res.send({ correct: correct });
            }
        });
    });
});

// Set difference
function difference(setA, setB)
{
    const diff = new Set(setA);

    for (const elem of setB)
        diff.delete(elem);

    return diff;
}

// User completed a quiz. Adds relevant data to corresponding tables
function complete_quiz(quiz_id, user_id, user_score)
{
    db.serialize(() =>
    {
        // Lookup whether the user has already completed the quiz
        db.get(`SELECT completion_date FROM completed_quizzes
                WHERE (user_id = ?) AND (quiz_id = ?)`, [user_id, quiz_id], (lookup_error, quiz_completed) =>
        {
            if (lookup_error)
            {
                console.error(lookup_error);
                return false;
            }
            else
            {
                // Update the list of completd quizzes
                db.run(`INSERT INTO completed_quizzes(user_id, quiz_id, completion_date)
                        VALUES(?, ?, ?)`, [user_id, quiz_id, Math.floor(new Date().getTime() / 1000.0)], insertion_error =>
                {
                    if (insertion_error)
                    {
                        console.error(insertion_error);
                        return false;
                    }
                    else
                    {
                        // If the quiz hasn't already been completed by the user, update their score
                        if (!quiz_completed)
                        {
                            db.parallelize(() =>
                            {
                                db.run(`UPDATE users
                                        SET score = (score + ?)
                                        WHERE user_id = ?`,
                                [user_score, user_id],
                                update_error =>
                                {
                                    if (update_error) {
                                        console.error(update_error);
                                        return false;
                                    }
                                    else {
                                        return true;
                                    }
                                });
                            });
                        }

                        return true;
                    }
                });
            }
        });
    });
}

// Finish a quiz
router.post("/quizzes/:id", [ param("id").exists().isInt() ], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).send(`400: ${status_codes[400]}`);


    db.parallelize(() => {
        db.all("SELECT question_id FROM questions WHERE quiz_id = ?", id, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(`500: ${status_codes[500]}`);
            }
            else {
                // Update user score/quizzes completed
                if (req.isAuthenticated())
                {
                    const s1 = new Set(Object.keys(req.user.questions_completed).map(qid => Number(qid)));
                    const s2 = new Set(result.map(q => q.question_id));
                    const diff = difference(s2,s1);

                    // User completed every question
                    if (diff.size == 0) {
                        let quiz_score = 0;

                        for (const qid of s2) {
                            quiz_score += req.user.questions_completed[qid];
                            delete req.user.questions_completed[qid];
                        }

                        complete_quiz(id, req.user.user_id, quiz_score);
                    }
                }

                return res.status(200).send("Quiz complete");
            }
        });
    });
});

module.exports = router;
