// Import required modules
const express = require("express");
const router = express.Router();

// Import database models
const Menu = require('../models/Menu');
const Time = require('../models/Time');
const Buyer = require('../models/Buyer');

const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Set the time and cost of breakfast, lunch, dinner
router.post(
    "/setTime",
    async (req, res) => {
        await Time.setTimes(req.body.times);
        res.send();
    }
);

// Set the weekly menu
router.post(
    "/setMenu",
    async (req, res) => {
        if (!Array.isArray(req.body.menus) || req.body.menus.length !== validDays.length) {
            return res.status(400).send({ error: "A menu entry is required for each day" });
        }
        const seenDays = new Set();
        const validMenu = req.body.menus.every(entry => {
            if (!entry || typeof entry !== "object" || !Array.isArray(entry.meals)) return false;
            const { day, meals } = entry;
            if (!validDays.includes(day)) return false;
            if (seenDays.has(day)) return false;
            seenDays.add(day);
            const mealIds = new Set();
            return meals.every(meal => {
                if (!meal || typeof meal !== "object") return false;
                const { id, name, item, time, cost, active } = meal;
                if (typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id) || mealIds.has(id)) return false;
                if (active !== undefined && typeof active !== "boolean") return false;
                mealIds.add(id);
                if (active === false) return true;
                return typeof name === "string" &&
                    name.trim().length > 0 &&
                    typeof item === "string" &&
                    item.trim().length > 0 &&
                    typeof time === "string" &&
                    time.trim().length > 0 &&
                    typeof cost === "number" &&
                    Number.isFinite(cost) &&
                    cost >= 0;
            });
        });
        if (!validMenu || seenDays.size !== validDays.length) {
            return res.status(400).send({ error: "Every active meal requires a name, menu item, serving time, and valid price" });
        }
        await Menu.setMenus(req.body.menus);
        res.send();
    }
);

// Get the total meals that need to be cooked
router.post(
    "/meals",
    async (req, res) => {
        if (!["this", "next"].includes(req.body.week)) return res.status(400).send({ error: "Invalid week" });
        const [buyers, menu] = await Promise.all([Buyer.allBuyers(), Menu.getMenu()]);
        const currentWeekKey = Buyer.getCurrentWeekKey();
        const processed = menu.map(({ day, meals }) => ({
            day,
            meals: meals.map(meal => ({
                ...meal,
                count: buyers.reduce((total, buyer) =>
                    total + (
                        (req.body.week !== "this" || buyer.purchaseWeek === currentWeekKey) &&
                        buyer[req.body.week]?.[day]?.[meal.id] === true ? 1 : 0
                    ), 0)
            }))
        }));
        res.send(processed);
    }
);

module.exports = router;