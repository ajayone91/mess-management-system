import classes from './index.module.css';
import { Table, message } from 'antd';
import WeekMenu from '../../components/WeekMenu';
import axios from "axios";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const timingCol = [
    {
        title: 'Day',
        dataIndex: 'day',
        key: 'day',
        render: day => <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{day}</span>
    },
    {
        title: 'Meal',
        dataIndex: 'name',
        key: 'name',
        render: name => <span style={{ fontWeight: 500 }}>{name}</span>
    },
    {
        title: 'Serving time',
        dataIndex: 'time',
        key: 'time'
    },
    {
        title: 'Price',
        dataIndex: 'cost',
        key: 'cost',
        render: cost => `₹${cost}`
    }
];

export default function SchedulePage() {
    const [timingRow, setTimingRow] = useState([]);
    const [menu, setMenu] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let response = await axios.get(window.APIROOT + 'api/data/time');
                setTimingRow(response.data.filter(meal => meal.active !== false));
            } catch (error) {
                message.error('Failed to fetch timing from server');
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(window.APIROOT + 'api/data/menu');
                setMenu(response.data);
            } catch (error) {
                message.error('Failed to fetch menu from server');
            }
        }
        fetchData();
    }, []);

    return (
        <div className={classes.menuBody}>
            <header className={classes.hero}>
                <span className={classes.eyebrow}>YOUR WEEK, SERVED FRESH</span>
                <h1>Good food. Better days.</h1>
                <p>Explore this week’s menu and find the right time to join us.</p>
            </header>

            <section className={classes.section}>
                <div className={classes.sectionHeading}>
                    <span className={classes.sectionEyebrow}>PLAN YOUR VISIT</span>
                    <h2>Meal timings</h2>
                </div>
                <Table loading={!timingRow.length} className={classes.table} columns={timingCol} dataSource={timingRow.map((row, index) => ({ ...row, key: `${row.day}-${row.meal || index}` }))} pagination={false} bordered />
            </section>

            <section className={classes.section}>
                <div className={classes.sectionHeading}>
                    <span className={classes.sectionEyebrow}>COOKED FOR THE WEEK</span>
                    <h2>Weekly menu</h2>
                </div>
                <motion.div layout>
                    <WeekMenu
                        loading={!menu.length}
                        menu={menu.map(day => ({
                            ...day,
                            meals: day.meals.filter(meal => meal.active !== false)
                        }))}
                    />
                </motion.div>
            </section>
        </div>
    );
}