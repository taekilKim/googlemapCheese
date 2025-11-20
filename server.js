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
        const { url, language } = req.body;

        if (!url) {
            return res.status(400).json({ error: '구글 지도 URL을 입력해주세요.' });
        }

        console.log('========================================');
        console.log('Fetching metadata from:', url);
        console.log('Requested language:', language || 'auto');

        // Detect language from URL or use provided language
        let detectedLang = language || 'en';

        // Try to detect language from URL domain
        if (url.includes('.co.jp')) {
            detectedLang = 'ja';
        } else if (url.includes('.co.kr')) {
            detectedLang = 'ko';
        } else if (url.includes('.fr')) {
            detectedLang = 'fr';
        } else if (url.includes('.de')) {
            detectedLang = 'de';
        } else if (url.includes('.it')) {
            detectedLang = 'it';
        } else if (url.includes('.es')) {
            detectedLang = 'es';
        } else if (url.includes('.cn') || url.includes('.com.cn')) {
            detectedLang = 'zh-CN';
        }

        console.log('Detected local language:', detectedLang);

        // Fetch both Korean and local language versions
        const fetchOptions = {
            maxRedirects: 20,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        };

        // Fetch Korean version first (primary display name - what Korean users see on Google Maps)
        const koreanResponse = await axios.get(url, {
            ...fetchOptions,
            headers: {
                ...fetchOptions.headers,
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        // Fetch local language version (secondary display name - for places outside Korea)
        let localResponse = null;
        if (detectedLang !== 'ko') {
            localResponse = await axios.get(url, {
                ...fetchOptions,
                headers: {
                    ...fetchOptions.headers,
                    'Accept-Language': `${detectedLang},en;q=0.9`
                }
            });
        }

        // Parse Korean version (primary)
        const $korean = cheerio.load(koreanResponse.data);
        const koreanName = $korean('meta[property="og:title"]').attr('content') ||
                          $korean('meta[itemprop="name"]').attr('content') ||
                          $korean('title').text();

        const description = $korean('meta[property="og:description"]').attr('content') ||
                           $korean('meta[itemprop="description"]').attr('content');

        const image = $korean('meta[property="og:image"]').attr('content') ||
                     $korean('meta[itemprop="image"]').attr('content');

        // Parse local language version if available (secondary)
        let localName = null;
        if (localResponse) {
            const $local = cheerio.load(localResponse.data);
            localName = $local('meta[property="og:title"]').attr('content') ||
                       $local('meta[itemprop="name"]').attr('content') ||
                       $local('title').text();
        }

        console.log('Korean Name (Primary):', koreanName);
        console.log('Local Name (Secondary):', localName);
        console.log('Description:', description);
        console.log('Image:', image);

        if (!koreanName || koreanName.includes('Google Maps') || koreanName.includes('Google 지도')) {
            return res.status(404).json({
                error: '장소 정보를 찾을 수 없습니다.',
                debug: { url }
            });
        }

        // Extract additional info from HTML: phone, website
        let phoneNumber = null;
        let website = null;

        // Try to find phone number in various formats
        const phoneLink = $korean('a[href^="tel:"]').first();
        if (phoneLink.length) {
            phoneNumber = phoneLink.attr('href').replace('tel:', '');
        } else {
            // Look for phone patterns in HTML text
            const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/;
            const bodyText = koreanResponse.data;
            const phoneMatch = bodyText.match(phonePattern);
            if (phoneMatch) {
                phoneNumber = phoneMatch[0];
            }
        }

        // Try to find website URL (not google.com, gstatic, etc.)
        const links = $korean('a[href^="http"]');
        links.each((i, elem) => {
            const href = $korean(elem).attr('href');
            if (href &&
                !href.includes('google.com') &&
                !href.includes('gstatic.com') &&
                !href.includes('googleapis.com') &&
                !href.includes('youtube.com')) {
                website = href;
                return false; // break loop
            }
        });

        console.log('Phone:', phoneNumber);
        console.log('Website:', website);

        // Parse the place name and address from Korean version
        const koreanNameParts = koreanName.split(' · ');
        const primaryName = koreanNameParts[0];
        const address = koreanNameParts.length > 1 ? koreanNameParts.slice(1).join(' · ') : '';

        // Parse local name if available and different
        let secondaryName = null;
        if (localName && !localName.includes('Google Maps') && !localName.includes('Google マップ')) {
            const localNameParts = localName.split(' · ');
            const localNameOnly = localNameParts[0];

            // Only show secondary name if it's different from primary
            if (localNameOnly !== primaryName) {
                secondaryName = localNameOnly;
            }
        }

        // Parse the description for rating, category, price, and business status
        let rating = 0;
        let category = '';
        let reviewCount = 0;
        let priceLevel = null;
        let businessStatus = null;

        if (description) {
            console.log('Raw description:', description);

            // Extract price level (₩₩, $$, ¥1~1,000, etc.)
            const priceMatch = description.match(/(₩+|\$+|¥[\d,~]+|€+)/);
            if (priceMatch) {
                priceLevel = priceMatch[1];
                console.log('Found price level:', priceLevel);
            }

            // Extract business status (폐업함, 영업 중, etc.)
            if (description.includes('폐업함') || description.includes('Permanently closed')) {
                businessStatus = '폐업함';
            } else if (description.includes('임시 휴업') || description.includes('Temporarily closed')) {
                businessStatus = '임시 휴업';
            } else if (description.includes('영업 중') || description.includes('Open')) {
                businessStatus = '영업 중';
            }

            // Count filled stars for rating (★ = filled, ☆ = empty)
            const filledStars = (description.match(/★/g) || []).length;
            const emptyStars = (description.match(/☆/g) || []).length;
            const totalStars = filledStars + emptyStars;

            // Calculate rating as decimal (e.g., 4 filled out of 5 total = 4.0)
            if (totalStars > 0) {
                rating = filledStars;
            }

            // Extract category (text after the stars and price)
            // Remove stars, price, and business status to get category
            let cleanDesc = description.replace(/[★☆]+/g, '').replace(/·/g, '').trim();
            if (priceLevel) {
                cleanDesc = cleanDesc.replace(priceLevel, '').trim();
            }
            if (businessStatus) {
                cleanDesc = cleanDesc.replace(businessStatus, '').trim();
            }

            // Category is usually the last part
            const parts = cleanDesc.split(/\s+/);
            if (parts.length > 0) {
                category = parts[parts.length - 1];
            }
        }

        // Try to extract actual rating and review count from page data
        // Google Maps embeds this data in JavaScript variables
        const htmlContent = koreanResponse.data;

        // Look for rating pattern like: ["4.1",123]
        const ratingPattern = /\["([\d.]+)",(\d+)\]/g;
        let matches;
        let foundRating = null;
        let foundReviews = null;

        while ((matches = ratingPattern.exec(htmlContent)) !== null) {
            const possibleRating = parseFloat(matches[1]);
            const possibleReviews = parseInt(matches[2]);

            // Validate that it looks like a real rating (between 1-5) and review count
            if (possibleRating >= 1 && possibleRating <= 5 && possibleReviews > 0) {
                foundRating = possibleRating;
                foundReviews = possibleReviews;
                break;
            }
        }

        if (foundRating !== null) {
            rating = foundRating;
            reviewCount = foundReviews;
            console.log('Found rating from page data:', rating, 'Reviews:', reviewCount);
        }

        // Build response matching Korean Google Maps display format
        const placeData = {
            name: primaryName, // Korean/English name (what Korean users see first)
            name_local: secondaryName, // Local language name (shown below if different)
            rating: rating,
            user_ratings_total: reviewCount,
            price_level: priceLevel, // Price range (₩₩, $$, ¥1~1,000, etc.)
            business_status: businessStatus, // 폐업함, 영업 중, etc.
            phone_number: phoneNumber, // Phone number if available
            website: website, // Website URL if available
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
