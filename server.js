require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to get place details from Google Maps URL
app.post('/api/place-from-url', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: '구글 지도 URL을 입력해주세요.' });
        }

        console.log('========================================');
        console.log('Fetching metadata from:', url);

        // Fetch the HTML page
        const response = await axios.get(url, {
            maxRedirects: 20,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        // Parse HTML with cheerio
        const $ = cheerio.load(response.data);

        // Extract metadata from Open Graph and schema.org tags
        const placeName = $('meta[property="og:title"]').attr('content') ||
                         $('meta[itemprop="name"]').attr('content') ||
                         $('title').text();

        const description = $('meta[property="og:description"]').attr('content') ||
                           $('meta[itemprop="description"]').attr('content');

        const image = $('meta[property="og:image"]').attr('content') ||
                     $('meta[itemprop="image"]').attr('content');

        console.log('Place Name:', placeName);
        console.log('Description:', description);
        console.log('Image:', image);

        if (!placeName || placeName.includes('Google Maps')) {
            return res.status(404).json({
                error: '장소 정보를 찾을 수 없습니다.',
                debug: { url }
            });
        }

        // Parse the place name and address
        const nameParts = placeName.split(' · ');
        const name = nameParts[0];
        const address = nameParts.length > 1 ? nameParts.slice(1).join(' · ') : '';

        // Parse the description for rating and category
        let rating = 0;
        let category = '';
        let reviewCount = 0;

        if (description) {
            // Extract rating from stars (★★★★☆ = 4.0)
            const stars = description.match(/★/g);
            if (stars) {
                rating = stars.length;
            }

            // Extract category (text after the stars)
            const categoryMatch = description.match(/[★☆]+\s*·\s*(.+)/);
            if (categoryMatch) {
                category = categoryMatch[1];
            }
        }

        // Build response in the same format as Places API
        const placeData = {
            name: name,
            rating: rating,
            user_ratings_total: reviewCount,
            formatted_address: address,
            types: category ? [category.toLowerCase().replace(/\s+/g, '_')] : [],
            photos: image ? [{ photo_reference: image }] : []
        };

        console.log('Extracted place data:', placeData);
        console.log('========================================');

        res.json({
            success: true,
            place: placeData
        });

    } catch (error) {
        console.error('========================================');
        console.error('ERROR:', error.message);
        console.error('========================================');
        res.status(500).json({
            error: '서버 오류가 발생했습니다.',
            details: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server only in development (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다!`);
    });
}

// Export for Vercel serverless
module.exports = app;
