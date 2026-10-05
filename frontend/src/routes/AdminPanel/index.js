import classes from './index.module.css';
import { Alert, Button, Card, Input, InputNumber, Popconfirm, Table, Tag, message } from 'antd';
import {
    CheckCircleFilled,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReadOutlined,
    ReloadOutlined,
    SaveOutlined
} from '@ant-design/icons';
import axios from "axios";
import { useEffect, useMemo, useState } from "react";

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function emptyWeek() {
    return DAYS.map(day => ({ day, meals: [] }));
}

function invalidActiveMeals(menu) {
    return menu.flatMap(({ day, meals }) => meals
        .filter(({ active = true, name, item, time, cost }) =>
            active && (!name?.trim() || !item?.trim() || !time?.trim() ||
                cost === null || !Number.isFinite(Number(cost)) || Number(cost) < 0)
        )
        .map(meal => `${day}: ${meal.name || 'unnamed meal'}`)
    );
}

function createMeal() {
    return {
        id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: '',
        item: '',
        time: '',
        cost: 0,
        active: true
    };
}

export default function AdminPanel() {
    const [menu, setMenu] = useState([]);
    const [savedMenu, setSavedMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const changed = JSON.stringify(menu) !== JSON.stringify(savedMenu);
    const invalidMeals = useMemo(() => invalidActiveMeals(menu), [menu]);

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const response = await axios.get(window.APIROOT + 'api/data/menu');
                const data = response.data.length ? response.data : emptyWeek();
                setMenu(data);
                setSavedMenu(data);
            } catch (error) {
                message.error('Failed to fetch the weekly menu');
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();
    }, []);

    const updateMeal = (day, mealId, field, value) => {
        setMenu(current => current.map(dayEntry => dayEntry.day !== day ? dayEntry : ({
            ...dayEntry,
            meals: dayEntry.meals.map(meal => meal.id === mealId ? { ...meal, [field]: value } : meal)
        })));
    };

    const addMeal = day => {
        setMenu(current => current.map(dayEntry => dayEntry.day === day
            ? { ...dayEntry, meals: [...dayEntry.meals, createMeal()] }
            : dayEntry
        ));
    };

    const setMealActive = (day, mealId, active) => {
        updateMeal(day, mealId, 'active', active);
    };

    const saveMenu = async () => {
        if (invalidMeals.length) {
            message.error(`Complete meal name, dish, serving time, and valid price: ${invalidMeals.slice(0, 3).join('; ')}`);
            return;
        }
        setSaving(true);
        try {
            await axios.post(window.APIROOT + 'api/admin/setMenu', { menus: menu });
            setSavedMenu(menu);
            message.success('Weekly meal types, menu, timings, and prices saved');
        } catch (error) {
            message.error(error.response?.data?.error || 'Failed to save the weekly menu');
        } finally {
            setSaving(false);
        }
    };

    const columnsForDay = day => [
        {
            title: 'Meal type',
            dataIndex: 'name',
            key: 'name',
            width: 160,
            render: (name, meal) => (
                <div className={classes.typeCell}>
                    <Input
                        aria-label={`${day} meal type`}
                        value={name}
                        onChange={event => updateMeal(day, meal.id, 'name', event.target.value)}
                        placeholder="e.g. Breakfast"
                    />
                    {meal.active === false && <Tag color="default">Archived</Tag>}
                </div>
            )
        },
        {
            title: 'Menu / dish',
            dataIndex: 'item',
            key: 'item',
            render: (item, meal) => (
                <Input
                    aria-label={`${day} ${meal.name || 'meal'} dish`}
                    value={item}
                    onChange={event => updateMeal(day, meal.id, 'item', event.target.value)}
                    placeholder="Add dish or meal description"
                />
            )
        },
        {
            title: 'Serving time',
            dataIndex: 'time',
            key: 'time',
            width: 210,
            render: (time, meal) => (
                <Input
                    aria-label={`${day} ${meal.name || 'meal'} serving time`}
                    value={time}
                    onChange={event => updateMeal(day, meal.id, 'time', event.target.value)}
                    placeholder="e.g. 8:00 AM – 9:30 AM"
                />
            )
        },
        {
            title: 'Price (₹)',
            dataIndex: 'cost',
            key: 'cost',
            width: 140,
            render: (cost, meal) => (
                <InputNumber
                    aria-label={`${day} ${meal.name || 'meal'} price`}
                    className={classes.priceInput}
                    min={0}
                    precision={2}
                    value={cost}
                    onChange={value => updateMeal(day, meal.id, 'cost', value)}
                    prefix="₹"
                />
            )
        },
        {
            title: 'Manage',
            key: 'manage',
            width: 115,
            render: (_, meal) => meal.active === false ? (
                <Button type="link" onClick={() => setMealActive(day, meal.id, true)}>Restore</Button>
            ) : (
                <Popconfirm
                    title="Remove this meal from the menu?"
                    description="It will no longer be available for new purchases. Existing coupons can still be scanned."
                    okText="Archive meal"
                    cancelText="Keep meal"
                    onConfirm={() => setMealActive(day, meal.id, false)}
                >
                    <Button danger type="text" icon={<DeleteOutlined />}>Archive</Button>
                </Popconfirm>
            )
        }
    ];

    return (
        <main className={classes.adminPage}>
            <header className={classes.hero}>
                <span className={classes.eyebrow}>MESS MANAGEMENT</span>
                <h1>Admin control center</h1>
                <p>Manage each day’s meal types, dishes, serving times, and prices in one place.</p>
            </header>

            <Card className={classes.card} bordered={false}>
                <div className={classes.sectionHeading}>
                    <div className={classes.sectionIcon}><ReadOutlined /></div>
                    <div>
                        <span className={classes.sectionEyebrow}>DAY-BY-DAY SETTINGS</span>
                        <h2>Meals, timings &amp; prices</h2>
                        <p>Add meals per day or edit any existing meal field.</p>
                    </div>
                    <Tag color={changed ? 'orange' : 'green'} className={classes.statusTag}>
                        {changed ? <><EditOutlined /> Unsaved</> : <><CheckCircleFilled /> Up to date</>}
                    </Tag>
                </div>

                <Alert
                    className={classes.infoAlert}
                    type="info"
                    showIcon
                    message="Archiving hides a meal from new purchases but preserves it for existing coupons and redemption."
                />

                <div className={classes.dayList}>
                    {menu.map(({ day, meals }) => (
                        <section className={classes.daySection} key={day}>
                            <div className={classes.dayHeading}>
                                <div>
                                    <div className={classes.dayTitle}>{day}</div>
                                    <span>{meals.filter(meal => meal.active !== false).length} active meal types</span>
                                </div>
                                <Button icon={<PlusOutlined />} onClick={() => addMeal(day)}>Add meal</Button>
                            </div>
                            <Table
                                className={classes.table}
                                columns={columnsForDay(day)}
                                dataSource={meals.map(meal => ({ ...meal, key: meal.id }))}
                                loading={loading}
                                pagination={false}
                                bordered
                                locale={{ emptyText: 'No meal types for this day. Add one to get started.' }}
                                scroll={{ x: 850 }}
                            />
                        </section>
                    ))}
                </div>

                {invalidMeals.length > 0 && (
                    <Alert
                        className={classes.validationAlert}
                        type="warning"
                        showIcon
                        message="Active meals need a name, dish, serving time, and a valid non-negative price before saving."
                    />
                )}

                <div className={classes.actions}>
                    {changed && (
                        <Button
                            icon={<ReloadOutlined />}
                            disabled={saving}
                            onClick={() => setMenu(savedMenu)}
                        >
                            Discard edits
                        </Button>
                    )}
                    <Button
                        type="primary"
                        size="large"
                        icon={<SaveOutlined />}
                        loading={saving}
                        disabled={loading || !changed || invalidMeals.length > 0}
                        onClick={saveMenu}
                    >
                        Save all menu changes
                    </Button>
                </div>
            </Card>
        </main>
    );
}
