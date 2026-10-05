// Import required modules
const express = require("express");
const router = express.Router();
const Razorpay = require('razorpay');

// Import database models
const Buyer = require('../models/Buyer');
const Menu = require('../models/Menu');
const Order = require('../models/Order');

// Import RazorPay payment validator
var { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');

// Get the user secret and meals purchased
router.get(
    "/data",
    async (req, res) => {
        res.send(await Buyer.getBuyer(req.user?.email));
    }
);

// Reset the user secret
router.get(
    "/resetSecret",
    async (req, res) => {
        res.send(await Buyer.resetSecret(req.user?.email));
    }
);

// Check if the user's coupon is valid for the current day and meal
router.post(
    "/checkCoupon",
    async (req, res) => {
        if (req.user.email !== process.env.ADMIN) {
            return res.sendStatus(403);
        }
        res.send(await Buyer.checkCoupon(req.body));
    }
);

// Check if the user has already bought coupons for the current week
router.get(
    "/boughtThisWeek",
    async (req, res) => {
        res.send(await Buyer.boughtThisWeek(req.user.email));
    }
);

// Check if the payment throught RazorPay is successful
router.post(
    "/checkOrder",
    async (req, res) => {
        const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
        if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") {
            return res.status(400).send({ error: "Missing payment verification details" });
        }
        if (!process.env.PAY_SECRET) {
            return res.status(503).send({ error: "Payment verification is not configured" });
        }
        const order = await Order.getOrder(orderId);
        if (!order || order.email !== req.user.email) {
            return res.status(404).send({ error: "Payment order not found" });
        }
        const isValid = validatePaymentVerification(
            { order_id: orderId, payment_id: paymentId },
            signature,
            process.env.PAY_SECRET
        );
        if (!isValid) return res.send(false);
        if (order.status === "paid") return res.send(true);

        await Buyer.saveOrder(req.user.email, order.selected);
        await Order.markPaid(orderId, paymentId);
        res.send(true);
    }
);

// Create a RazorPay order and send the order id to frontend
router.post(
    "/createOrder",
    async (req, res) => {
        if (!process.env.PAY_ID || !process.env.PAY_SECRET) {
            return res.status(503).send({ error: "Online payments are not configured" });
        }
        if (await Buyer.boughtThisWeek(req.user.email)) {
            return res.status(409).send({ error: "You have already purchased this week's meal coupons" });
        }
        if (!req.body.selected || typeof req.body.selected !== "object") {
            return res.status(400).send({ error: "Invalid meal selection" });
        }
        const menu = await Menu.getMenu();
        const mealsByDay = new Map(menu.map(day => [day.day, new Map(day.meals.map(meal => [meal.id, meal]))]));
        let total = 0;
        let selectedCount = 0;
        for (const [day, selections] of Object.entries(req.body.selected)) {
            const dayMeals = mealsByDay.get(day);
            if (!dayMeals || !selections || typeof selections !== "object") {
                return res.status(400).send({ error: "Invalid meal selection" });
            }
            for (const [mealId, selected] of Object.entries(selections)) {
                if (selected !== true) continue;
                const meal = dayMeals.get(mealId);
                if (!meal || meal.active === false) return res.status(400).send({ error: "Selected meal is not available for purchase" });
                total += Number(meal.cost);
                selectedCount += 1;
            }
        }
        if (selectedCount === 0 || !Number.isFinite(total) || total <= 0) {
            return res.status(400).send({ error: "Select at least one meal with a valid price" });
        }

        let instance = new Razorpay({ key_id: process.env.PAY_ID, key_secret: process.env.PAY_SECRET });
        let resp = await instance.orders.create({
            amount: Math.round(total * 100),
            currency: "INR",
            receipt: `${Date.now()}`
        });
        await Order.saveOrder(resp.id, req.user.email, resp.amount, req.body.selected);
        res.send({ ...resp, keyId: process.env.PAY_ID });
    }
);

module.exports = router;