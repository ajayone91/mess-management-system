import { QRCodeSVG } from 'qrcode.react';
import classes from './index.module.css';
import { ReloadOutlined, QuestionOutlined, LoadingOutlined } from '@ant-design/icons';
import { Button, notification, Space, message } from 'antd';
import axios from "axios";
import { useState, useEffect } from "react";

export default function QRCodePage() {
    const [loading, setLoading] = useState(true);
    const [rawCode, setRawCode] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(window.APIROOT + 'api/user/data');
                const code = response.data.secret + response.data.email;
                setRawCode(code);
            } catch (error) {
                message.error('Failed to fetch QR code');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    return (
        <div className={classes.qrBody}>
            <section className={classes.qrCard}>
                <span className={classes.eyebrow}>YOUR MEAL PASS</span>
                <h1>One QR. Every meal.</h1>
                <p className={classes.description}>
                    Show this personal QR code to the mess administrator. They will select today’s meal and scan it to verify your purchased coupon.
                </p>
                <div className={classes.qrWrap}>
                    <div className={classes.loading} style={{ opacity: loading ? 1 : 0 }}>
                        <LoadingOutlined />
                    </div>
                    <QRCodeSVG className={classes.qr} size={256} value={rawCode || ''} />
                </div>
                <Space>
                    <Button
                        disabled={loading || !rawCode}
                        type="primary"
                        size="large"
                        icon={<ReloadOutlined />}
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const response = await axios.get(window.APIROOT + 'api/user/resetSecret');
                                setRawCode(response.data.secret + response.data.email);
                                message.success('New QR code created successfully');
                            } catch (error) {
                                message.error('Failed to create new QR code');
                            } finally {
                                setLoading(false);
                            }
                        }}
                    >
                        Create New
                    </Button>
                    <Button
                        size="large"
                        icon={<QuestionOutlined />}
                        onClick={() => notification.open({
                            message: <b>Information</b>,
                            description: 'Keep your QR code private. If it may have been compromised, create a new one. Your old QR code will stop working.',
                            placement: 'top',
                            closeIcon: '[ CLOSE ]',
                            duration: 10
                        })}
                    />
                </Space>
            </section>
        </div>
    );
}