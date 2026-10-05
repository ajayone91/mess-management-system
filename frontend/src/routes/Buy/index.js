import classes from './index.module.css';
import { Table, Button, message, Card, Tag } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from "axios";
import useRazorpay from "react-razorpay";

async function createOrder(selected) {
    const response = await axios.post(window.APIROOT + 'api/user/createOrder', { selected });
    return response.data;
}

async function checkOrder(response, setBought) {
    const result = await axios.post(window.APIROOT + 'api/user/checkOrder', response);
    if (result.data) {
        message.success("Coupons bought!");
        setBought(true);
    } else {
        message.error("Failed to buy coupons!");
    }
}

function PayButton({ selected, disabled, cost, setBought }) {
    const Razorpay = useRazorpay();
    const [processing, setProcessing] = useState(false);
    const handlePayment = useCallback(async () => {
        setProcessing(true);
        try {
            const order = await createOrder(selected);
            const options = {
                key: order.keyId,
                amount: order.amount.toString(),
                currency: "INR",
                name: "Mess Portal",
                description: "Meal coupons for this week",
                order_id: order.id,
                handler: async response => {
                    try {
                        await checkOrder(response, setBought);
                    } catch (error) {
                        message.error('Payment completed, but coupon confirmation failed. Contact the mess administrator.');
                    } finally {
                        setProcessing(false);
                    }
                },
                modal: {
                    ondismiss: () => setProcessing(false)
                }
            };
            const razorpay = new Razorpay(options);
            razorpay.on('payment.failed', () => {
                setProcessing(false);
                message.error('Payment failed. Your meal coupons were not activated.');
            });
            razorpay.open();
        } catch (error) {
            message.error(error.response?.data?.error || 'Unable to start payment. Please try again.');
            setProcessing(false);
        }
    }, [Razorpay, selected, setBought]);

    return (
        <Button
            disabled={disabled || processing || cost <= 0}
            loading={processing}
            onClick={handlePayment}
            className={classes.buy}
            type="primary"
            size="large"
            icon={<ShoppingCartOutlined />}
        >
            Continue with Payment
        </Button>
    );
}

const columns = [
    { title: 'Meal type', dataIndex: 'name', key: 'name', width: 170 },
    { title: 'Menu', dataIndex: 'item', key: 'item' },
    { title: 'Serving time', dataIndex: 'time', key: 'time', responsive: ['md'] },
    { title: 'Price', dataIndex: 'cost', key: 'cost', width: 115, render: cost => `₹${cost}` }
];

export default function BuyPage() {
    const [menu, setMenu] = useState([]);
    const [selected, setSelected] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingPurchase, setLoadingPurchase] = useState(true);
    const [bought, setBought] = useState(false);

    const cost = useMemo(() => menu.reduce((total, day) =>
        total + day.meals.reduce((dayTotal, meal) =>
            dayTotal + (selected[day.day]?.[meal.id] === true ? Number(meal.cost) : 0), 0
        ), 0
    ), [menu, selected]);

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const response = await axios.get(window.APIROOT + 'api/data/menu');
                setMenu(response.data);
            } catch (error) {
                message.error('Failed to fetch the weekly menu');
            } finally {
                setLoading(false);
            }
        };
        const fetchPurchaseStatus = async () => {
            try {
                const response = await axios.get(window.APIROOT + 'api/user/boughtThisWeek');
                setBought(response.data);
            } catch (error) {
                message.error('Failed to fetch purchase status');
            } finally {
                setLoadingPurchase(false);
            }
        };
        fetchMenu();
        fetchPurchaseStatus();
    }, []);

    if (bought) {
        return (
            <div className={classes.bought}>
                <Card title="Coupons already purchased" bordered={false}>
                    Your meal coupons for this week have already been purchased. Show your personal QR code at serving time to redeem them.
                </Card>
            </div>
        );
    }

    return (
        <main className={classes.buyBody}>
            <header className={classes.hero}>
                <span className={classes.eyebrow}>PLAN AHEAD</span>
                <h1>Choose this week’s meals</h1>
                <p>Select the meals you want for this week. Your total updates as you choose, then complete payment securely with Razorpay.</p>
            </header>
            {menu.map(day => {
                const meals = day.meals.filter(meal => meal.active !== false);
                const selectedRowKeys = meals
                    .filter(meal => selected[day.day]?.[meal.id] === true)
                    .map(meal => meal.id);
                return (
                    <section className={classes.daySection} key={day.day}>
                        <div className={classes.dayHeading}>
                            <h2>{day.day}</h2>
                            <Tag color="green">{meals.length} meal options</Tag>
                        </div>
                        <Table
                            loading={loading}
                            className={classes.table}
                            rowSelection={{
                                selectedRowKeys,
                                onChange: keys => {
                                    const next = Object.fromEntries(meals.map(meal => [meal.id, keys.includes(meal.id)]));
                                    setSelected(current => ({ ...current, [day.day]: next }));
                                }
                            }}
                            columns={columns}
                            dataSource={meals.map(meal => ({ ...meal, key: meal.id }))}
                            pagination={false}
                            bordered
                            locale={{ emptyText: 'No meals are available for this day.' }}
                            scroll={{ x: 620 }}
                        />
                    </section>
                );
            })}
            {!loading && menu.length === 0 && <p className={classes.empty}>The weekly menu is not available yet.</p>}
            <div className={classes.checkout}>
                <div className={classes.total}>
                    <span>Your total</span>
                    <strong>₹{cost.toFixed(2)}</strong>
                </div>
                <PayButton selected={selected} disabled={loading || loadingPurchase} cost={cost} setBought={setBought} />
            </div>
        </main>
    );
}
