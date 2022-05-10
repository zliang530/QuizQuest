const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./assets/db/QuizDatabase.db", sqlite3.OPEN_READONLY, err => {
    if (err) { console.error(err); }
});

// Render leaderboard by ordered by quizzes complete
router.get("/completed", (req, res) => {
    db.parallelize(() => {
        db.all(`SELECT user_id,username,
                COUNT(DISTINCT(quiz_id)) AS quizzes_completed
                FROM users
                JOIN
                completed_quizzes USING (user_id)
                GROUP BY user_id
                ORDER BY quizzes_completed DESC`,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.redirect("/error/500");
            }
            else {
                return res.render("leaderboard", {
                    pageTitle: "Leaderboard",
                    user: req.user,
                    users: result,
                    sort: 2
                });
            }
        });
    });
});

// Render leaderboard by ordered by score
router.get("/:score?", (req, res) => {
    db.parallelize(() => {
        db.all(`SELECT user_id, username, score, country_of_origin
                FROM users
                WHERE score <> 0
                ORDER BY score DESC`,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.redirect("/error/500");
            }
            else {
                return res.render("leaderboard", {
                    pageTitle: "Leaderboard",
                    user: req.user,
                    users: result,
                    sort: 1
                });
            }
        });
    });
});

module.exports = router;
