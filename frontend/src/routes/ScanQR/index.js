import classes from './index.module.css';
import { useState, useEffect, useMemo } from 'react';
import { QrReader } from 'react-qr-reader';
import { Radio, Card, Button, message } from 'antd';
import { CloseSquareOutlined, CheckSquareOutlined, ReloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function ScanQRPage() {
    const [data, setData] = useState();
    const [type, setType] = useState(null);
    const [valid, setValid] = useState(null);
    const [dayMeals, setDayMeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanError, setScanError] = useState('');
    const day = useMemo(
        () => new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(new Date()).toLowerCase(),
        []
    );

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const response = await axios.get(window.APIROOT + 'api/data/menu');
                const todayMenu = response.data.find(item => item.day === day);
                setDayMeals(todayMenu?.meals || []);
            } catch (error) {
                message.error('Failed to load today’s meal types');
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();
    }, [day]);

    const checkCoupon = async (postData) => {
        try {
            const response = await axios.post(window.APIROOT + 'api/user/checkCoupon', postData);
            setValid(response.data);
        } catch (error) {
            message.error("Failed to reach server to verify coupon");
            setData(null);
        }
    }

    useEffect(() => {
        if (!data || !type) return;
        const secret = data?.substring(0, 4);
        const email = data?.substring(4, data.length);
        checkCoupon({ secret: secret, email: email, day: day, type: type });
    }, [data, type, day])

    return (
        <main className={classes.body}>
            <Card className={classes.card} bordered={false}>
                <span className={classes.eyebrow}>COUPON REDEMPTION</span>
                <h1>Scan student QR code</h1>
                <p className={classes.description}>Choose the meal being served today, then scan the student’s personal QR code.</p>
                <div className={classes.radio}>
                    <Radio.Group
                        buttonStyle="solid"
                        value={type}
                        disabled={loading || dayMeals.length === 0}
                        onChange={event => {
                            setType(event.target.value);
                            setData(null);
                            setValid(null);
                            setScanError('');
                        }}
                    >
                        {dayMeals.filter(meal => meal.active !== false).map(meal => (
                            <Radio.Button key={meal.id} value={meal.id}>{meal.name}</Radio.Button>
                        ))}
                    </Radio.Group>
                </div>
                <div className={classes.scanner}>
                    {!type ? (
                        <div className={classes.scannerMessage}>
                            {loading ? 'Loading today’s meals…' : 'Select a meal type to open the scanner.'}
                        </div>
                    ) : scanError ? (
                        <div className={classes.scannerMessage}>
                            {scanError}
                            <Button type="link" onClick={() => setScanError('')}>Try camera again</Button>
                        </div>
                    ) : data ? (
                        <div className={classes.result}>
                            <motion.div layout>
                                {valid === null
                                    ? <LoadingOutlined className={classes.icon} />
                                    : valid
                                        ? <CheckSquareOutlined className={`${classes.icon} ${classes.success}`} />
                                        : <CloseSquareOutlined className={`${classes.icon} ${classes.failure}`} />}
                            </motion.div>
                            <strong>
                                {valid === null ? 'Checking coupon…' : valid ? 'Coupon verified and redeemed' : 'Coupon invalid, not purchased, or already used'}
                            </strong>
                        </div>
                    ) : (
                        <QrReader
                            className={classes.qrreader}
                            constraints={{ facingMode: 'environment' }}
                            onResult={(result, error) => {
                                if (result?.text) setData(result.text);
                                else if (error && !['NotFoundException', 'ChecksumException', 'FormatException'].includes(error.name)) {
                                    setScanError('Could not access the camera. Allow camera permission and try again.');
                                }
                            }}
                        />
                    )}
                </div>
                {data && (
                    <Button
                        type="primary"
                        size="large"
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            setData(null);
                            setValid(null);
                            setScanError('');
                        }}
                    >
                        Scan next student
                    </Button>
                )}
            </Card>
        </main>
    );
}