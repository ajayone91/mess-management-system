const mongoose = require("mongoose");

const OrderSchema = mongoose.model("order", new mongoose.Schema({
    orderid: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    selected: { type: mongoose.Schema.Types.Mixed, required: true },
    paymentid: String,
    status: { type: String, enum: ["created", "paid"], default: "created" }
}));

module.exports.saveOrder = async function (orderid, email, amount, selected) {
    await OrderSchema.create({ orderid, email, amount, selected, status: "created" });
};

module.exports.getOrder = async function (orderid) {
    return OrderSchema.findOne({ orderid });
};

module.exports.markPaid = async function (orderid, paymentid) {
    return OrderSchema.findOneAndUpdate(
        { orderid, status: "created" },
        { $set: { status: "paid", paymentid } },
        { new: true }
    );
};
