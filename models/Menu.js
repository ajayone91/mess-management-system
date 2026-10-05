const mongoose = require("mongoose");
const Time = require("./Time");

const MenuSchema = mongoose.model("menuitem", new mongoose.Schema({
    day: String,
    meals: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    breakfast: String,
    lunch: String,
    dinner: String
}));

const LEGACY_MEALS = ["breakfast", "lunch", "dinner"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

module.exports.getMenu = async function () {
    const [menuItems, times] = await Promise.all([
        MenuSchema.find({}).select({ _id: 0 }).lean(),
        Time.getTimes()
    ]);
    const timeByMeal = new Map(times.map(({ meal, time, cost }) => [meal, { time, cost }]));

    const daysWithMeals = menuItems
        .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day))
        .map((item) => {
            if (Array.isArray(item.meals)) {
                return {
                    day: item.day,
                    meals: item.meals.map(meal => ({
                        id: meal.id,
                        name: meal.name,
                        item: meal.item,
                        time: meal.time || "",
                        cost: Number(meal.cost) || 0,
                        active: meal.active !== false
                    }))
                };
            }

            return {
                day: item.day,
                meals: LEGACY_MEALS.map((id) => ({
                    id,
                    name: id.charAt(0).toUpperCase() + id.slice(1),
                    item: item[id] || "",
                    time: timeByMeal.get(id)?.time || "",
                    cost: Number(timeByMeal.get(id)?.cost) || 0
                }))
            };
        });
    const mealsByDay = new Map(daysWithMeals.map(item => [item.day, item]));
    return DAYS.map(day => mealsByDay.get(day) || { day, meals: [] });
};

module.exports.setMenus = async function (menus) {
    const records = menus.map(({ day, meals }) => ({
        day,
        meals: meals.map(({ id, name, item, time, cost, active }) => ({
            id,
            name,
            item,
            time,
            cost: Number(cost),
            active: active !== false
        }))
    }));
    await MenuSchema.deleteMany({});
    await MenuSchema.insertMany(records);
};
