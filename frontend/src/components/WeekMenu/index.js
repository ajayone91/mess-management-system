import classes from './index.module.css';
import { Table, Tag } from 'antd';

export default function WeekMenu({ menu = [], loading, highlight }) {
    return menu.map(({ day, meals = [] }) => {
        const rows = meals.map(meal => ({
            ...meal,
            key: meal.id,
            mealName: meal.name,
            dish: meal.item,
            selected: meal.selected === true
        }));
        const columns = [
            {
                title: 'Meal',
                dataIndex: 'mealName',
                key: 'mealName',
                width: 170,
                render: value => <span className={classes.mealName}>{value}</span>
            },
            {
                title: 'Menu',
                dataIndex: 'dish',
                key: 'dish',
                render: (value, record) => (
                    <span className={highlight && !record.selected ? classes.notSelected : undefined}>
                        {value || '—'}
                    </span>
                )
            },
            {
                title: 'Serving time',
                dataIndex: 'time',
                key: 'time',
                width: 190,
                responsive: ['md']
            },
            ...(rows.some(row => row.count !== undefined) ? [{
                title: 'Meals needed',
                dataIndex: 'count',
                key: 'count',
                width: 140
            }] : []),
            ...(highlight ? [{
                title: 'Coupon',
                dataIndex: 'selected',
                key: 'selected',
                width: 115,
                render: selected => selected
                    ? <Tag color="green">Purchased</Tag>
                    : <Tag>Not selected</Tag>
            }] : [])
        ];

        return (
            <section className={classes.day} key={day}>
                <h3 className={classes.dayTitle}>{day}</h3>
                <Table
                    loading={loading}
                    className={classes.table}
                    columns={columns}
                    dataSource={rows}
                    pagination={false}
                    bordered
                    locale={{ emptyText: 'No meals are available for this day.' }}
                    rowClassName={record => highlight && !record.selected ? classes.unselectedRow : ''}
                    scroll={{ x: 520 }}
                />
            </section>
        );
    });
}
