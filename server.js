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

        // Extract Place ID from URL for Places API
        let placeId = null;

        // Pattern 1: /g/PLACE_ID format
        const placeIdMatch1 = url.match(/\/g\/([a-zA-Z0-9_-]+)/);
        if (placeIdMatch1) {
            // Convert short ID to full Place ID (ChIJ format)
            // We'll use the hex ID instead if available
            placeId = placeIdMatch1[1];
            console.log('Found short place ID:', placeId);
        }

        // Pattern 2: data=...!1s0xHEXID:0xHEXID format
        const placeIdMatch2 = url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
        if (placeIdMatch2) {
            placeId = placeIdMatch2[1];
            console.log('Found hex place ID:', placeId);
        }

        // Pattern 3: ftid= parameter
        const placeIdMatch3 = url.match(/ftid=([^&]+)/);
        if (placeIdMatch3) {
            placeId = placeIdMatch3[1];
            console.log('Found ftid place ID:', placeId);
        }

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

        // Try to get place details from Places API if we have a Place ID
        let apiData = null;
        if (placeId && process.env.GOOGLE_MAPS_API_KEY) {
            console.log('Attempting to fetch from Places API...');
            try {
                const apiKey = process.env.GOOGLE_MAPS_API_KEY;

                // Use the legacy Places API (more compatible)
                const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
                const apiParams = {
                    place_id: placeId,
                    key: apiKey,
                    language: detectedLang,
                    fields: 'name,rating,user_ratings_total,price_level,business_status,types,formatted_address,formatted_phone_number,website,opening_hours'
                };

                const apiResponse = await axios.get(apiUrl, { params: apiParams, timeout: 5000 });

                if (apiResponse.data.status === 'OK' && apiResponse.data.result) {
                    apiData = apiResponse.data.result;
                    console.log('✓ Places API success!');
                    console.log('  Rating:', apiData.rating);
                    console.log('  Reviews:', apiData.user_ratings_total);
                    console.log('  Price Level:', apiData.price_level);
                    console.log('  Business Status:', apiData.business_status);
                } else {
                    console.log('Places API returned:', apiResponse.data.status);
                }
            } catch (error) {
                console.log('Places API error:', error.message);
                console.log('Falling back to HTML parsing...');
            }
        } else {
            console.log('No Place ID or API key, using HTML parsing only');
        }

        // If it's a shortened URL (goo.gl or maps.app.goo.gl), expand it first using curl
        let finalUrl = url;
        if (url.includes('goo.gl')) {
            console.log('Expanding shortened URL with curl...');
            try {
                const { execSync } = require('child_process');
                // Use curl to follow redirects and get final URL
                const curlCommand = `curl -Ls -o /dev/null -w %{url_effective} "${url}"`;
                const expandedUrl = execSync(curlCommand, { encoding: 'utf8', timeout: 10000 }).trim();
                if (expandedUrl && expandedUrl.startsWith('http')) {
                    finalUrl = expandedUrl;
                    console.log('Expanded URL:', finalUrl);
                } else {
                    console.log('Could not expand URL, using original');
                }
            } catch (error) {
                console.log('Error expanding URL:', error.message);
                console.log('Using original URL');
            }
        }

        // Fetch both Korean and local language versions
        const fetchOptions = {
            maxRedirects: 20,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Accept redirects
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        };

        // Fetch Korean version first (primary display name - what Korean users see on Google Maps)
        const koreanResponse = await axios.get(finalUrl, {
            ...fetchOptions,
            headers: {
                ...fetchOptions.headers,
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        // Fetch local language version (secondary display name - for places outside Korea)
        let localResponse = null;
        if (detectedLang !== 'ko') {
            localResponse = await axios.get(finalUrl, {
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

            // Extract price level (₩₩, $$, ¥1~1,000, etc.) - improved pattern
            const priceMatch = description.match(/(₩{1,4}|\${1,4}|¥[\d,~]+|€{1,4}|£{1,4})/);
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

            // Try multiple patterns to extract rating from description
            // Pattern 1: "4.5(433)" or "3.7 (649)"
            let ratingFromDesc = description.match(/([\d.]+)\s*\(([,\d]+)\)/);
            if (ratingFromDesc) {
                rating = parseFloat(ratingFromDesc[1]);
                reviewCount = parseInt(ratingFromDesc[2].replace(/,/g, ''));
                console.log('Found rating from description (pattern 1):', rating, 'Reviews:', reviewCount);
            }

            // Pattern 2: Star symbols "★★★★☆" followed by number "(433)"
            if (!ratingFromDesc) {
                const starRating = description.match(/([★☆]+)\s*\(([,\d]+)\)/);
                if (starRating) {
                    const stars = starRating[1];
                    const filledStars = (stars.match(/★/g) || []).length;
                    rating = filledStars;
                    reviewCount = parseInt(starRating[2].replace(/,/g, ''));
                    console.log('Found rating from stars (pattern 2):', rating, 'Reviews:', reviewCount);
                }
            }

            // Extract category - try different patterns
            // Pattern 1: After rating/price
            const categoryMatch1 = description.match(/[\d.()★☆,\s]+·\s*(.+?)(?:·|$)/);
            if (categoryMatch1) {
                let cat = categoryMatch1[1].trim();
                // Remove price if it's included in category
                cat = cat.replace(/₩+|\$+|¥[\d,~]+|€+|£+/g, '').trim();
                if (cat && cat.length > 0 && cat.length < 50) {
                    category = cat;
                }
            }

            // Pattern 2: Last non-empty item after splitting by ·
            if (!category) {
                const parts = description.split('·').map(p => p.trim()).filter(p => p);
                if (parts.length > 0) {
                    let lastPart = parts[parts.length - 1];
                    // Clean up
                    lastPart = lastPart.replace(/₩+|\$+|¥[\d,~]+|€+|£+/g, '').trim();
                    lastPart = lastPart.replace(/[★☆]+/g, '').trim();
                    if (lastPart && lastPart.length > 0 && lastPart.length < 50) {
                        category = lastPart;
                    }
                }
            }

            console.log('Category from description:', category);
        }

        // Try to extract actual rating and review count from page data if not found in description
        // Google Maps embeds this data in JavaScript variables in various formats
        const htmlContent = koreanResponse.data;

        if (rating === 0 || reviewCount === 0) {
            console.log('Rating/reviews not found in description, searching HTML content...');

            // Pattern 1: ["4.1",123] or ["3.7",649]
            const pattern1 = /\["([\d.]+)",(\d+)\]/g;
            let matches1;
            while ((matches1 = pattern1.exec(htmlContent)) !== null) {
                const possibleRating = parseFloat(matches1[1]);
                const possibleReviews = parseInt(matches1[2]);

                if (possibleRating >= 1 && possibleRating <= 5 && possibleReviews > 0 && possibleReviews < 10000000) {
                    if (rating === 0) rating = possibleRating;
                    if (reviewCount === 0) reviewCount = possibleReviews;
                    console.log('Found from pattern 1:', rating, 'Reviews:', reviewCount);
                    break;
                }
            }
        }

        if (rating === 0 || reviewCount === 0) {
            // Pattern 2: Look for aria-label with rating info
            // Korean format: aria-label="별표 3.5개 "
            const ariaRatingPattern = /aria-label="별표\s+([\d.]+)개/i;
            const ariaRatingMatch = htmlContent.match(ariaRatingPattern);
            if (ariaRatingMatch && rating === 0) {
                rating = parseFloat(ariaRatingMatch[1]);
                console.log('Found rating from aria-label (별표):', rating);
            }

            // Look for review count in aria-label
            // Format: aria-label="리뷰 123개" or aria-label="123 reviews"
            const ariaReviewPattern = /aria-label="(?:리뷰\s+)?([\d,]+)(?:\s*개|\s*reviews?)"/i;
            const ariaReviewMatch = htmlContent.match(ariaReviewPattern);
            if (ariaReviewMatch && reviewCount === 0) {
                const possibleReviews = parseInt(ariaReviewMatch[1].replace(/,/g, ''));
                if (possibleReviews > 0 && possibleReviews < 10000000) {
                    reviewCount = possibleReviews;
                    console.log('Found reviews from aria-label:', reviewCount);
                }
            }
        }

        if (rating === 0 || reviewCount === 0) {
            // Pattern 3: More aggressive number search near rating keywords
            const ratingKeywords = /([\d.]+)\s*(?:별|stars?|rating)/i;
            const ratingMatch = htmlContent.match(ratingKeywords);
            if (ratingMatch) {
                const possibleRating = parseFloat(ratingMatch[1]);
                if (possibleRating >= 1 && possibleRating <= 5 && rating === 0) {
                    rating = possibleRating;
                    console.log('Found rating from keywords:', rating);
                }
            }

            const reviewKeywords = /([\d,]+)\s*(?:리뷰|reviews?|건)/i;
            const reviewMatch = htmlContent.match(reviewKeywords);
            if (reviewMatch) {
                const possibleReviews = parseInt(reviewMatch[1].replace(/,/g, ''));
                if (possibleReviews > 0 && possibleReviews < 10000000 && reviewCount === 0) {
                    reviewCount = possibleReviews;
                    console.log('Found reviews from keywords:', reviewCount);
                }
            }
        }

        // Use API data if available, otherwise use HTML-parsed data
        if (apiData) {
            console.log('Using Places API data as primary source');
            if (apiData.rating) rating = apiData.rating;
            if (apiData.user_ratings_total) reviewCount = apiData.user_ratings_total;
            if (apiData.price_level !== undefined) {
                // Convert numeric price level (0-4) to symbols based on language
                let currencySymbol = '$';
                if (detectedLang === 'ko') currencySymbol = '₩';
                else if (detectedLang === 'ja') currencySymbol = '¥';
                else if (detectedLang === 'zh-CN' || detectedLang === 'zh-TW') currencySymbol = '¥';
                else if (detectedLang === 'fr' || detectedLang === 'de' || detectedLang === 'it' || detectedLang === 'es') currencySymbol = '€';
                else if (detectedLang === 'en-GB') currencySymbol = '£';

                const priceSymbols = ['', currencySymbol, currencySymbol.repeat(2), currencySymbol.repeat(3), currencySymbol.repeat(4)];
                priceLevel = priceSymbols[apiData.price_level] || priceLevel;
            }
            if (apiData.business_status) {
                // Convert to Korean
                const statusMap = {
                    'OPERATIONAL': '영업 중',
                    'CLOSED_TEMPORARILY': '임시 휴업',
                    'CLOSED_PERMANENTLY': '폐업함'
                };
                businessStatus = statusMap[apiData.business_status] || apiData.business_status;
            }
            if (apiData.formatted_phone_number) phoneNumber = apiData.formatted_phone_number;
            if (apiData.website) website = apiData.website;
            if (apiData.formatted_address && !address) address = apiData.formatted_address;
            if (apiData.types && apiData.types.length > 0 && !category) {
                // Use first type as category
                category = apiData.types[0].replace(/_/g, ' ');
            }
        }

        console.log('Final rating:', rating, 'Final reviews:', reviewCount);

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
