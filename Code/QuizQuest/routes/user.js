const { body, param, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const express = require("express");
const passport = require("passport");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const LocalStrategy = require("passport-local").Strategy;

const salt_rounds = 10;

const db = new sqlite3.Database("./assets/db/QuizDatabase.db", err => {
    if (err) { console.error(err); }
});

router.use(express.urlencoded({ extended: false }));
router.use(express.json());

const log_in = (username, password, done) => {
    // Verify password
    db.parallelize(() => {
        db.get("SELECT * FROM users WHERE username LIKE ?",
            username,
            (db_err, result) => {
                if (db_err) {
                    console.error(db_err);
                    return done(null, false);
                }
                else if (result) {
                    const { user_id, password_hash, is_moderator } = result;
                    const uname = result.username;

                    // Password verification
                    bcrypt.compare(password, password_hash, (compare_err, is_match) => {
                        if (compare_err) {
                            console.error("Major server error, password hash comparison broke.");
                            return done(null, false, { message: "Error 500: Internal server error." });
                        }
                        else if (!is_match) {
                            return done(null, false, { message: "Password is incorrect." });
                        }
                        else {
                            return done(null, { user_id: user_id, username: uname, moderator: is_moderator });
                        }
                    });
                }
                else {
                    return done(null, false, { message: "User does not exist." });
                }
            });
    });
};

passport.use(new LocalStrategy(log_in));

// Public user profile route
router.get("/:id", [param("id").exists().isInt()], (req, res) => {
    const id = parseInt(req.params.id);
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.redirect("/error/400");

    db.parallelize(() => {
        db.get(`SELECT * FROM
                    (SELECT user_id, username, score, is_moderator,
                     COUNT(DISTINCT(quiz_id)) AS quizzes_completed
                     FROM users
                     LEFT JOIN completed_quizzes
                     USING (user_id)
                     WHERE user_id = ?)
                JOIN
                    (SELECT user_id,
                     RANK () OVER (ORDER BY score DESC) score_rank
                     FROM users)
                USING (user_id)`,
        id,
        (err, result) => {
            if (err) {
                console.error(err);
                return res.redirect("/error/500");
            }
            else if ((result !== undefined) && (result.user_id)) {
                db.parallelize(() => {
                    db.all(`SELECT quiz_id,name, completion_date FROM
                                (SELECT quiz_id,completion_date,location_id FROM
                                    (SELECT * FROM completed_quizzes
                                     WHERE user_id = ?
                                     GROUP BY quiz_id
                                     ORDER BY completion_date DESC)
                                JOIN
                                quizzes USING (quiz_id))
                            JOIN locations USING (location_id)`,
                    id,
                    (error, quizzes) => {
                        if (error) {
                            console.error(error);
                            return res.redirect("/error/500");
                        }
                        else {
                            return res.render("user.ejs", {
                                pageTitle: "Profile",
                                user: req.user,
                                profile_info: result,
                                completed_quizzes: quizzes
                            });
                        }
                    });
                });
            }
            else {
                res.redirect("/error/404");
            }
        });
    });
});


// Log user in
router.post("/auth",
    [   body("username").exists().matches(/^[a-zA-Z0-9\-_]+$/).withMessage("Invalid username"),
        body("username").exists().trim().escape().withMessage("Enter username"),
        body("password").exists().withMessage("Enter password")
    ],
    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.render("sign_in.ejs", { pageTitle: "Sign-in", errors: errors.array() });
        }
        else
        {
            const redirect_url = req.session.returnTo;
            delete req.session.redirectTo;

            passport.authenticate("local", (err, user, info) => {
                if (err) {
                    console.error(err);
                    return next(err);
                }
                if (!user) {
                    return res.render("sign_in.ejs", { pageTitle: "Sign-in", errors: info });
                }

                req.logIn(user, login_err => {
                    if (login_err) {
                        console.error(login_err);
                        return next(login_err);
                    }

                    return res.redirect(redirect_url);
                });
            })(req, res, next);
        }
    });


// Create user in database
router.post("/create",
    [body("username").exists().matches(/^[a-zA-Z0-9\-_]+$/)
        .withMessage("Usernames must contain only alphanumeric characters"),
    body("username").isLength({ min: 3, max: 20 }).trim().escape()
        .withMessage("Usernames must be at least 3 characters and not exceed 20 characters in length"),
    body("password").exists().isLength({ min: 5, max: 100 })
        .withMessage("Passwords must be at least 5 characters and not exceed 100 characters in length"),
    body("password_match").custom((confirm_pass, { req }) => {
        if (confirm_pass !== req.body.password)
            throw new Error("Passwords do not match");
        else
            return true;
    })],
    (req, res) => {
        // Finds the validation errors in this request and wraps them in an object with handy functions
        const errors = validationResult(req);

        if (!errors.isEmpty())
            return res.render("sign_up.ejs", { pageTitle: "Sign-up", errors: errors.array() });

        const { username, password } = req.body;

        bcrypt.hash(password, salt_rounds, (hash_err, hash) => {
            if (hash_err) {
                console.error(hash_err);
                return res.redirect("/error/500");
            }

            // Create account in database
            db.parallelize(() => {
                db.run(`INSERT INTO users(username, password_hash, score, is_moderator)
                        VALUES(?, ?, ?, ?)`,
                [username, hash, 0, 0],
                insertion_error =>
                {
                    if (insertion_error)
                    {
                        // 'Unique' username constraint violated
                        if (insertion_error.errno == 19)
                        {
                            return res.render("sign_up.ejs", {
                                pageTitle: "Sign-up",
                                errors: [ { param: "username", msg: "Username already registered" } ]
                            });
                        }
                        else
                        {
                            console.error(insertion_error);
                            return res.redirect("/error/500");
                        }
                    }
                    else
                    {
                        return res.redirect("/sign_in");
                    }
                });
            });
        });
    });


passport.serializeUser((user_id, done) => {
    done(null, user_id);
});

passport.deserializeUser((user_id, done) => {
    done(null, user_id);
});

module.exports = router;
