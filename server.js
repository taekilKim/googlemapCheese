// Google Places API 프록시 서버
// npm install express cors axios dotenv 필요

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Google Places API 프록시 엔드포인트
app.get('/api/place/:placeId', async (req, res) => {
    try {
        const { placeId } = req.params;
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ 
                error: 'GOOGLE_PLACES_API_KEY가 설정되지 않았습니다.' 
            });
        }

        const fields = [
            'name',
            'rating',
            'user_ratings_total',
            'types',
            'price_level',
            'formatted_address',
            'opening_hours',
            'formatted_phone_number',
            'website'
        ].join(',');

        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/place/details/json',
            {
                params: {
                    place_id: placeId,
                    fields: fields,
                    key: apiKey,
                    language: 'ko'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('API 호출 오류:', error.message);
        res.status(500).json({ 
            error: 'Google Places API 호출 중 오류가 발생했습니다.',
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`프록시 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`환경 변수 GOOGLE_PLACES_API_KEY: ${process.env.GOOGLE_PLACES_API_KEY ? '설정됨' : '미설정'}`);
});
