const mongoose = require("mongoose");

const BuyerSchema = mongoose.model("buyer", new mongoose.Schema({
    email: String,
    secret: String,
    bought: Boolean,
    purchaseWeek: String,
    this: { type: mongoose.Schema.Types.Mixed, default: {} },
    next: { type: mongoose.Schema.Types.Mixed, default: {} }
}));

function getCurrentWeekKey() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const localDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
    const daysFromMonday = (localDate.getUTCDay() + 6) % 7;
    localDate.setUTCDate(localDate.getUTCDate() - daysFromMonday);
    return localDate.toISOString().slice(0, 10);
}

function getCurrentDay() {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        weekday: "long"
    }).format(new Date()).toLowerCase();
}

// Get the user details, or if it doesn't exists, create a new user object
module.exports.getBuyer = async function (email) {
    let charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
    let randomStr = "";
    for (let i = 0; i < 4; i++)
        randomStr += charset[Math.floor(Math.random() * charset.length)];

    const Buyer = await BuyerSchema.findOneAndUpdate(
        { email: email },
        {
            $setOnInsert: {
                bought: false,
                secret: randomStr,
                purchaseWeek: "",
                this: {},
                next: {}
            }
        },
        { new: true, upsert: true }
    ).select({ _id: 0 });
    return Buyer;
}

// Resets the user secret and returns the updated user object
module.exports.resetSecret = async function (email) {
    let charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
    let randomStr = "";
    for (let i = 0; i < 4; i++)
        randomStr += charset[Math.floor(Math.random() * charset.length)];

    const Buyer = await BuyerSchema.findOneAndUpdate(
        { email: email },
        { secret: randomStr }).select({ _id: 0 });
    return Buyer;
}

// Check if the user's coupon is valid for the current day and meal
module.exports.checkCoupon = async function (data) {
    const validDay = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(data.day) &&
        data.day === getCurrentDay();
    const validType = typeof data.type === "string" && /^[a-zA-Z0-9_-]+$/.test(data.type);
    if (!validDay || !validType || typeof data.email !== "string" || typeof data.secret !== "string") return false;
    const redeemed = await BuyerSchema.findOneAndUpdate(
        {
            email: data.email,
            secret: data.secret,
            purchaseWeek: getCurrentWeekKey(),
            [`this.${data.day}.${data.type}`]: true
        },
        { $set: { [`this.${data.day}.${data.type}`]: false } }
    );
    return redeemed !== null;
};

// Activate the purchased coupons for the current week after a successful payment.
module.exports.saveOrder = async function (email, data) {
    await BuyerSchema.updateOne(
        { email },
        { $set: { this: data, purchaseWeek: getCurrentWeekKey(), bought: true } },
        { upsert: true }
    );
}

module.exports.boughtThisWeek = async function (email) {
    await module.exports.getBuyer(email);
    const Buyer = await BuyerSchema.findOne({ email: email });
    return Buyer.purchaseWeek === getCurrentWeekKey();
}

// Returns details of all the users
module.exports.allBuyers = async function () {
    const Buyers = await BuyerSchema.find({});
    return Buyers;
}

module.exports.getCurrentWeekKey = getCurrentWeekKey;
module.exports.getCurrentDay = getCurrentDay;