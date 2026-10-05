// Import required modules
const express = require("express");
const router = express.Router();

// Import database models
const Menu = require('../models/Menu');
const Time = require('../models/Time');

// Get the weekly menu
router.get(
    "/menu",
    async (req, res) => {
        res.send(await Menu.getMenu());
    }
);

// Get the time and cost of breakfast, lunch, dinner
router.get(
    "/time",
    async (req, res) => {
        const menu = await Menu.getMenu();
        const configuredTimes = menu.flatMap(({ day, meals }) =>
            meals.map(({ id, name, time, cost, active }) => ({ day, meal: id, name, time, cost, active }))
        );
        res.send(configuredTimes.length ? configuredTimes : await Time.getTimes());
    }
);

// Get the logged in and admin status
router.get(
    "/status",
    async (req, res) => {
        res.send({ loggedIn: req.isAuthenticated(), admin: (req.isAuthenticated() && req.user?.email === process.env.ADMIN) });
    }
);

module.exports = router;