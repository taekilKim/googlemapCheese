require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
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

// Extract Place ID from Google Maps URL
function extractPlaceId(url) {
    // Method 1: Direct place_id parameter
    const placeIdMatch = url.match(/place_id[=:]([^&\s]+)/i);
    if (placeIdMatch) {
        return placeIdMatch[1];
    }

    // Method 2: From /place/ URL with ftid
    const ftidMatch = url.match(/ftid=(0x[a-f0-9]+:0x[a-f0-9]+)/i);
    if (ftidMatch) {
        return ftidMatch[1];
    }

    // Method 3: From data parameter
    const dataMatch = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/i);
    if (dataMatch) {
        return dataMatch[1];
    }

    // Method 4: CID (Customer ID)
    const cidMatch = url.match(/cid=(\d+)/i);
    if (cidMatch) {
        return cidMatch[1];
    }

    return null;
}

// Extract place name from URL for text search
function extractPlaceName(url) {
    // Method 1: /place/ format
    const placeNameMatch = url.match(/\/place\/([^\/\?&@]+)/);
    if (placeNameMatch) {
        return decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' '));
    }

    // Method 2: ?q= parameter
    const qMatch = url.match(/[?&]q=([^&]+)/);
    if (qMatch) {
        return decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
    }

    // Method 3: /search/ format
    const searchMatch = url.match(/\/search\/([^\/\?&]+)/);
    if (searchMatch) {
        return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
    }

    return null;
}

// Function to expand shortened URLs using axios
async function expandUrl(url) {
    try {
        const response = await axios.get(url, {
            maxRedirects: 10,
            validateStatus: (status) => status >= 200 && status < 400,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Get final URL from response
        const finalUrl = response.request.res.responseUrl ||
                        response.config.url ||
                        url;

        console.log('Expanded to:', finalUrl);
        return finalUrl;
    } catch (error) {
        console.error('URL expansion error:', error.message);
        return url; // Return original URL on error
    }
}

// API endpoint to get place details from Google Maps URL
app.post('/api/place-from-url', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: '구글 지도 URL을 입력해주세요.' });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.' });
        }

        // Expand shortened URLs using follow-redirects
        let expandedUrl = url;
        if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
            expandedUrl = await expandUrl(url);
            console.log('URL expansion:', url !== expandedUrl ? 'successful' : 'failed or not needed');
        }

        console.log('========================================');
        console.log('Original URL:', url);
        console.log('Expanded URL:', expandedUrl);
        console.log('URL changed:', url !== expandedUrl);

        // Try to extract place ID
        let placeId = extractPlaceId(expandedUrl);
        console.log('Extracted Place ID:', placeId);

        // If no place ID, try text search
        if (!placeId) {
            const placeName = extractPlaceName(expandedUrl);
            console.log('Extracted Place Name:', placeName);

            if (placeName) {
                const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json`;
                const searchParams = {
                    input: placeName,
                    inputtype: 'textquery',
                    fields: 'place_id',
                    key: apiKey,
                    language: 'ko'
                };

                console.log('Searching for:', placeName);
                const searchResponse = await axios.get(searchUrl, { params: searchParams });
                console.log('Search API status:', searchResponse.data.status);

                if (searchResponse.data.candidates && searchResponse.data.candidates.length > 0) {
                    placeId = searchResponse.data.candidates[0].place_id;
                    console.log('Found Place ID:', placeId);
                } else {
                    console.log('No candidates found');
                    return res.status(404).json({
                        error: '장소를 찾을 수 없습니다.',
                        debug: { url: expandedUrl, placeName }
                    });
                }
            } else {
                console.log('Could not extract place name from URL');
                return res.status(400).json({
                    error: '유효한 구글 지도 URL이 아닙니다.',
                    debug: { url: expandedUrl }
                });
            }
        }

        // Get place details
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
        const detailsParams = {
            place_id: placeId,
            fields: 'name,rating,user_ratings_total,formatted_address,types,geometry,photos,opening_hours,formatted_phone_number,website',
            key: apiKey,
            language: 'ko'
        };

        const detailsResponse = await axios.get(detailsUrl, { params: detailsParams });

        if (detailsResponse.data.status === 'OK') {
            res.json({
                success: true,
                place: detailsResponse.data.result
            });
        } else {
            res.status(400).json({
                error: `장소 정보를 가져올 수 없습니다: ${detailsResponse.data.status}`
            });
        }

    } catch (error) {
        console.error('========================================');
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
        console.error('========================================');
        res.status(500).json({
            error: '서버 오류가 발생했습니다.',
            details: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', apiKeyConfigured: !!process.env.GOOGLE_MAPS_API_KEY });
});

// Start server only in development (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다!`);
        console.log(`📝 API Key 설정 상태: ${process.env.GOOGLE_MAPS_API_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
    });
}

// Export for Vercel serverless
module.exports = app;
