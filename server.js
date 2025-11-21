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

        // REMOVED: ftid URL conversion - it doesn't work reliably
        // Instead, we'll extract coordinates directly from the HTML response

        // Extract coordinates from URL for Places API
        let coordinates = null;
        let placeId = null;  // Will be used for ftid-based URLs

        const coordMatch = finalUrl.match(/@(-?[\d.]+),(-?[\d.]+)/);
        if (coordMatch) {
            coordinates = {
                lat: parseFloat(coordMatch[1]),
                lng: parseFloat(coordMatch[2])
            };
            console.log('Extracted coordinates:', coordinates);
        }

        // Also check for 3d/4d parameters (more accurate)
        const latMatch = finalUrl.match(/!3d(-?[\d.]+)/);
        const lngMatch = finalUrl.match(/!4d(-?[\d.]+)/);
        if (latMatch && lngMatch) {
            coordinates = {
                lat: parseFloat(latMatch[1]),
                lng: parseFloat(lngMatch[1])
            };
            console.log('Extracted precise coordinates:', coordinates);
        }

        // Extract ftid parameter for query-based URLs
        const ftidMatch = finalUrl.match(/[?&]ftid=([^&]+)/);
        if (ftidMatch) {
            placeId = ftidMatch[1];  // Store ftid as placeId for now
            console.log('Extracted ftid:', placeId);
        }

        // Detect language from URL or use provided language
        // IMPORTANT: This must happen AFTER URL expansion and coordinate extraction
        let detectedLang = language || 'en';

        // Try to detect language from URL domain
        if (finalUrl.includes('.co.jp') || finalUrl.includes('Japan') || finalUrl.includes('日本')) {
            detectedLang = 'ja';
        } else if (finalUrl.includes('.co.kr') || finalUrl.includes('Korea') || finalUrl.includes('한국')) {
            detectedLang = 'ko';
        } else if (finalUrl.includes('.fr') || finalUrl.includes('France')) {
            detectedLang = 'fr';
        } else if (finalUrl.includes('.de') || finalUrl.includes('Germany') || finalUrl.includes('Deutschland')) {
            detectedLang = 'de';
        } else if (finalUrl.includes('.it') || finalUrl.includes('Italy') || finalUrl.includes('Italia')) {
            detectedLang = 'it';
        } else if (finalUrl.includes('.es') || finalUrl.includes('Spain') || finalUrl.includes('España')) {
            detectedLang = 'es';
        } else if (finalUrl.includes('.cn') || finalUrl.includes('.com.cn') || finalUrl.includes('China')) {
            detectedLang = 'zh-CN';
        } else if (coordinates) {
            // Fallback: detect language from coordinates if available
            const lat = coordinates.lat;
            const lng = coordinates.lng;

            // Coordinate-based country detection (approximate bounding boxes)
            if (lat >= 24 && lat <= 46 && lng >= 123 && lng <= 146) {
                detectedLang = 'ja'; // Japan
            } else if (lat >= 33 && lat <= 43 && lng >= 124 && lng <= 132) {
                detectedLang = 'ko'; // South Korea
            } else if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) {
                detectedLang = 'zh-CN'; // China
            } else if (lat >= 41 && lat <= 51 && lng >= -5 && lng <= 10) {
                detectedLang = 'fr'; // France
            } else if (lat >= 47 && lat <= 55 && lng >= 5 && lng <= 15) {
                detectedLang = 'de'; // Germany
            } else if (lat >= 36 && lat <= 47 && lng >= 6 && lng <= 19) {
                detectedLang = 'it'; // Italy
            } else if (lat >= 36 && lat <= 44 && lng >= -9 && lng <= 4) {
                detectedLang = 'es'; // Spain
            }
        }

        console.log('Detected local language:', detectedLang);

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

        // If we have ftid but no coordinates, try to extract from HTML
        if (placeId && !coordinates) {
            console.log('Attempting to extract coordinates and Place ID from HTML for ftid URL...');
            const htmlContent = koreanResponse.data;

            // Method 1: Convert ftid to ludocid (decimal Place ID)
            // ftid format: 0x357c99005667dab9:0x79a9350da17f03e3
            // Second part after colon is the ludocid in hexadecimal
            let ludocidFromFtid = null;
            const ftidParts = placeId.split(':');
            if (ftidParts.length === 2) {
                const hexLudocid = ftidParts[1].replace('0x', '');
                try {
                    ludocidFromFtid = BigInt('0x' + hexLudocid).toString();
                    console.log('Converted ftid to ludocid:', ludocidFromFtid);

                    // Search for this ludocid in HTML
                    if (htmlContent.includes(ludocidFromFtid)) {
                        console.log('✓ Found ludocid in HTML content');
                    }
                } catch (e) {
                    console.log('Could not convert ftid to ludocid:', e.message);
                }
            }

            // Method 2: Try to find ChIJ Place ID in HTML (Google's standard format)
            let extractedPlaceId = null;

            // Pattern 1: ChIJ... format (most common)
            const chijPattern = /(ChIJ[A-Za-z0-9_-]{20,})/;
            const chijMatch = htmlContent.match(chijPattern);
            if (chijMatch) {
                extractedPlaceId = chijMatch[1];
                console.log('✓ Found ChIJ Place ID:', extractedPlaceId);
            }

            // Pattern 2: ludocid in HTML
            if (!extractedPlaceId) {
                const ludocidPattern = /ludocid[=:](\d+)/i;
                const ludocidMatch = htmlContent.match(ludocidPattern);
                if (ludocidMatch) {
                    extractedPlaceId = ludocidMatch[1];
                    console.log('✓ Found ludocid in HTML:', extractedPlaceId);
                }
            }

            // Pattern 3: Use ludocid converted from ftid as fallback
            if (!extractedPlaceId && ludocidFromFtid) {
                extractedPlaceId = ludocidFromFtid;
                console.log('✓ Using ludocid from ftid conversion:', extractedPlaceId);
            }

            // If we found a Place ID, store it for Place Details API
            if (extractedPlaceId) {
                placeId = extractedPlaceId;
            }

            // Try to extract coordinates from HTML with validation
            const isValidCoord = (lat, lng) => {
                return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
            };

            // Method 1: !3d and !4d patterns (HIGHEST PRIORITY - most reliable)
            const all3d = htmlContent.match(/!3d(-?[\d.]+)/g);
            const all4d = htmlContent.match(/!4d(-?[\d.]+)/g);

            if (all3d && all4d && all3d.length > 0 && all4d.length > 0) {
                // Try all combinations to find valid coordinates
                for (let i = 0; i < Math.min(all3d.length, all4d.length); i++) {
                    const lat = parseFloat(all3d[i].replace('!3d', ''));
                    const lng = parseFloat(all4d[i].replace('!4d', ''));
                    if (isValidCoord(lat, lng)) {
                        coordinates = { lat, lng };
                        console.log(`✓ Extracted coordinates from HTML (!3d/!4d pair ${i}):`, coordinates);
                        break;
                    } else {
                        console.log(`  Tried !3d/!4d pair ${i}:`, { lat, lng }, '- invalid');
                    }
                }
            }

            // Method 2: center= parameter
            if (!coordinates) {
                const centerMatch = htmlContent.match(/center=(-?[\d.]+)%2C(-?[\d.]+)/);
                if (centerMatch) {
                    const lat = parseFloat(centerMatch[1]);
                    const lng = parseFloat(centerMatch[2]);
                    if (isValidCoord(lat, lng)) {
                        coordinates = { lat, lng };
                        console.log('✓ Extracted coordinates from HTML (center):', coordinates);
                    } else {
                        console.log('  Tried center parameter:', { lat, lng }, '- invalid');
                    }
                }
            }

            // Method 3: ll= parameter
            if (!coordinates) {
                const llMatch = htmlContent.match(/ll=(-?[\d.]+)%2C(-?[\d.]+)/);
                if (llMatch) {
                    const lat = parseFloat(llMatch[1]);
                    const lng = parseFloat(llMatch[2]);
                    if (isValidCoord(lat, lng)) {
                        coordinates = { lat, lng };
                        console.log('✓ Extracted coordinates from HTML (ll):', coordinates);
                    } else {
                        console.log('  Tried ll parameter:', { lat, lng }, '- invalid');
                    }
                }
            }

            // Method 4: JSON-LD or embedded data
            if (!coordinates) {
                const coordPattern = /"latitude["\s:]+(-?[\d.]+)[\s,]+"longitude["\s:]+(-?[\d.]+)/i;
                const coordMatch = htmlContent.match(coordPattern);
                if (coordMatch) {
                    const lat = parseFloat(coordMatch[1]);
                    const lng = parseFloat(coordMatch[2]);
                    if (isValidCoord(lat, lng)) {
                        coordinates = { lat, lng };
                        console.log('✓ Extracted coordinates from HTML (JSON-LD):', coordinates);
                    } else {
                        console.log('  Tried JSON-LD:', { lat, lng }, '- invalid');
                    }
                }
            }

            if (!coordinates) {
                console.log('⚠ Could not extract valid coordinates from HTML after trying all methods');
                console.log('  Will attempt Text Search API without location bias (less accurate but still works)');
            }
        }

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

            // Extract price level (₩₩, $$, ¥1~1,000, 5,000원~10,000원, etc.)
            // Try to match actual price ranges first (with numbers), then fall back to symbols
            const priceMatch = description.match(/(₩[\d,~]+|¥[\d,~]+|€[\d,~]+|£[\d,~]+|\$[\d,~]+|[\d,~]+원(?:~[\d,~]+원)?|₩{1,4}|\${1,4}|€{1,4}|£{1,4})/);
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

            // Pattern 3: Star symbols only "★★★★☆" without number - ALWAYS TRY THIS
            if (rating === 0) {
                const starOnly = description.match(/([★☆]{3,})/);
                if (starOnly) {
                    const stars = starOnly[1];
                    const filledStars = (stars.match(/★/g) || []).length;
                    const totalStars = stars.length;
                    rating = (filledStars / totalStars) * 5;
                    console.log('Found rating from stars only (pattern 3):', rating, 'filled:', filledStars, 'total:', totalStars);
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

        // Try to get accurate rating/review data from Places API (New v1)
        let apiData = null;
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        // Strategy 1: If we have Place ID in ChIJ format, use Place Details API directly (NO COORDINATES NEEDED!)
        // NOTE: ludocid (numeric IDs) are NOT valid Place IDs for the API - only ChIJ format works
        if (apiKey && placeId && placeId.startsWith('ChIJ')) {
            console.log('Attempting Places API (New) v1 with Place Details...');
            console.log('Using Place ID:', placeId);
            try {
                const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;

                const detailsResponse = await axios.get(detailsUrl, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,priceRange,priceLevel,businessStatus,types,formattedAddress,internationalPhoneNumber,nationalPhoneNumber,websiteUri,googleMapsUri,location,delivery,takeout,dineIn,currentOpeningHours.openNow,currentOpeningHours.nextOpenTime,currentOpeningHours.nextCloseTime'
                    },
                    timeout: 10000
                });

                const place = detailsResponse.data;
                console.log('✓ Places API Place Details success!');
                console.log('  Full API response:', JSON.stringify(place, null, 2));
                console.log('  Rating:', place.rating);
                console.log('  User Rating Count:', place.userRatingCount);
                console.log('  Price Range:', place.priceRange);
                console.log('  Delivery:', place.delivery);
                console.log('  Takeout:', place.takeout);

                // Extract coordinates from API response if available
                if (place.location && !coordinates) {
                    coordinates = {
                        lat: place.location.latitude,
                        lng: place.location.longitude
                    };
                    console.log('  Coordinates from API:', coordinates);
                }

                // Map to our format
                apiData = {
                    name: place.displayName?.text || place.displayName,
                    rating: place.rating,
                    user_ratings_total: place.userRatingCount,
                    price_range: place.priceRange,
                    price_level: place.priceLevel,
                    business_status: place.businessStatus,
                    types: place.types,
                    formatted_phone_number: place.internationalPhoneNumber,
                    national_phone_number: place.nationalPhoneNumber,
                    website: place.websiteUri,
                    google_maps_uri: place.googleMapsUri,
                    delivery: place.delivery,
                    takeout: place.takeout,
                    dine_in: place.dineIn,
                    opening_hours: place.currentOpeningHours
                };

                console.log('Mapped apiData from Place Details:', JSON.stringify(apiData, null, 2));
            } catch (error) {
                console.log('Places API Place Details error:', error.message);
                if (error.response) {
                    console.log('Error response:', error.response.data);
                }
            }
        }

        // Strategy 2: Use Text Search API (works with or without coordinates)
        // For ftid URLs without coordinates, we can still search by name + address
        if (!apiData && apiKey && primaryName) {
            console.log('Attempting Places API (New) v1 with Text Search...');
            try {
                // Use Text Search API to find place and get all details in one call
                console.log('Searching for place with Text Search API...');
                const searchUrl = 'https://places.googleapis.com/v1/places:searchText';

                // Build request body - include location bias only if coordinates available
                const requestBody = {
                    textQuery: address ? `${primaryName} ${address}` : primaryName,
                    languageCode: detectedLang,
                    maxResultCount: 1
                };

                // Add location bias if coordinates are available (improves accuracy)
                if (coordinates) {
                    requestBody.locationBias = {
                        circle: {
                            center: {
                                latitude: coordinates.lat,
                                longitude: coordinates.lng
                            },
                            radius: 500.0  // 500 meters radius
                        }
                    };
                    console.log('Using location bias with coordinates:', coordinates);
                } else {
                    console.log('No coordinates available, searching by name and address only');
                }

                console.log('Request body:', JSON.stringify(requestBody, null, 2));

                const searchResponse = await axios.post(searchUrl, requestBody, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.priceRange,places.priceLevel,places.businessStatus,places.types,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.googleMapsLinks,places.reservable,places.delivery,places.takeout,places.dineIn,places.currentOpeningHours.openNow,places.currentOpeningHours.nextOpenTime,places.currentOpeningHours.nextCloseTime'
                    },
                    timeout: 10000
                });

                if (searchResponse.data.places && searchResponse.data.places.length > 0) {
                    const place = searchResponse.data.places[0];
                    console.log('✓ Places API (New) success!');
                    console.log('  Full API response:', JSON.stringify(place, null, 2));
                    console.log('  Place ID:', place.id);
                    console.log('  Display Name:', place.displayName);
                    console.log('  Rating:', place.rating);
                    console.log('  User Rating Count:', place.userRatingCount);
                    console.log('  Price Range:', place.priceRange);
                    console.log('  Price Level:', place.priceLevel);
                    console.log('  Business Status:', place.businessStatus);
                    console.log('  Google Maps URI:', place.googleMapsUri);
                    console.log('  Google Maps Links:', place.googleMapsLinks);
                    console.log('  Delivery:', place.delivery);
                    console.log('  Takeout:', place.takeout);
                    console.log('  Phone:', place.internationalPhoneNumber);

                    // Map new API format to old format for compatibility
                    apiData = {
                        name: place.displayName?.text || place.displayName,
                        rating: place.rating,
                        user_ratings_total: place.userRatingCount,
                        price_range: place.priceRange,  // NEW: Actual price range with amounts
                        price_level: place.priceLevel,  // Still available as fallback
                        business_status: place.businessStatus,
                        types: place.types,
                        // formatted_address: place.formattedAddress,  // Removed - not displayed
                        formatted_phone_number: place.internationalPhoneNumber,
                        national_phone_number: place.nationalPhoneNumber,
                        website: place.websiteUri,
                        // Action buttons data
                        google_maps_uri: place.googleMapsUri || place.googleMapsLinks?.placeUri,
                        directions_uri: place.googleMapsLinks?.directionsUri,
                        reservable: place.reservable,
                        delivery: place.delivery,
                        takeout: place.takeout,
                        dine_in: place.dineIn,
                        opening_hours: place.currentOpeningHours
                    };

                    console.log('Mapped apiData:', JSON.stringify(apiData, null, 2));
                } else {
                    console.log('Text Search returned no results');
                }
            } catch (error) {
                console.log('Places API (New) error:', error.message);
                if (error.response) {
                    console.log('Error response:', error.response.data);
                }
                console.log('Falling back to HTML parsing...');
            }
        } else {
            if (!process.env.GOOGLE_MAPS_API_KEY) console.log('No API key configured - skipping Places API');
            if (!primaryName) console.log('No place name extracted - skipping Places API');
        }

        // Priority: API priceRange > HTML parsing > API priceLevel
        // Use Places API data if available (most accurate)
        if (apiData) {
            console.log('Using Places API data as primary source');
            if (apiData.rating !== undefined && apiData.rating !== null) rating = apiData.rating;
            if (apiData.user_ratings_total !== undefined && apiData.user_ratings_total !== null) reviewCount = apiData.user_ratings_total;

            // Handle price information with priority order:
            // 1. API priceRange (actual amounts like ₩10,000~₩20,000)
            // 2. HTML parsed price (from og:description)
            // 3. API priceLevel (relative symbols like ₩₩₩)
            if (apiData.price_range && apiData.price_range.startPrice) {
                // NEW API provides actual price range with currency!
                const startPrice = apiData.price_range.startPrice;
                const endPrice = apiData.price_range.endPrice;

                // Map currency code to symbol
                const currencySymbols = {
                    'KRW': '₩', 'USD': '$', 'JPY': '¥', 'CNY': '¥',
                    'EUR': '€', 'GBP': '£', 'TWD': 'NT$', 'HKD': 'HK$'
                };
                const symbol = currencySymbols[startPrice.currencyCode] || startPrice.currencyCode;

                // Format price with thousands separator
                const formatPrice = (priceObj) => {
                    const amount = parseInt(priceObj.units || 0);
                    return amount.toLocaleString('en-US');
                };

                if (endPrice && endPrice.units) {
                    priceLevel = `${symbol}${formatPrice(startPrice)}~${symbol}${formatPrice(endPrice)}`;
                } else {
                    // No upper limit (e.g., "$100 and above")
                    priceLevel = `${symbol}${formatPrice(startPrice)}+`;
                }
                console.log('Using API price range (with actual amounts):', priceLevel);
            } else if (priceLevel && /\d/.test(priceLevel)) {
                // HTML already has actual price range, keep it
                console.log('Keeping HTML price range (has actual amounts):', priceLevel);
            } else if (apiData.price_level !== undefined) {
                // Fallback to price level symbols (PRICE_LEVEL_INEXPENSIVE, etc.)
                // Map enum values to numeric levels
                const levelMap = {
                    'PRICE_LEVEL_FREE': 0,
                    'PRICE_LEVEL_INEXPENSIVE': 1,
                    'PRICE_LEVEL_MODERATE': 2,
                    'PRICE_LEVEL_EXPENSIVE': 3,
                    'PRICE_LEVEL_VERY_EXPENSIVE': 4
                };

                const numLevel = typeof apiData.price_level === 'string'
                    ? levelMap[apiData.price_level]
                    : apiData.price_level;

                if (numLevel !== undefined && numLevel > 0) {
                    let currencySymbol = '$';
                    if (detectedLang === 'ko') currencySymbol = '₩';
                    else if (detectedLang === 'ja') currencySymbol = '¥';
                    else if (detectedLang === 'zh-CN' || detectedLang === 'zh-TW') currencySymbol = '¥';
                    else if (detectedLang === 'fr' || detectedLang === 'de' || detectedLang === 'it' || detectedLang === 'es') currencySymbol = '€';
                    else if (detectedLang === 'en-GB') currencySymbol = '£';

                    priceLevel = currencySymbol.repeat(numLevel);
                    console.log('Using API price level symbols:', priceLevel);
                }
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
            // if (apiData.formatted_address && !address) address = apiData.formatted_address;  // Removed - not displayed
            if (apiData.types && apiData.types.length > 0 && !category) {
                // Use first type as category
                category = apiData.types[0].replace(/_/g, ' ');
            }
        }

        console.log('========================================');
        console.log('FINAL VALUES BEFORE SENDING TO CLIENT:');
        console.log('  Rating:', rating);
        console.log('  Review Count:', reviewCount);
        console.log('  Primary Name:', primaryName);
        console.log('  Category:', category);
        console.log('  Price Level:', priceLevel);
        console.log('  Business Status:', businessStatus);
        console.log('  Has API Data:', !!apiData);
        if (apiData) {
            console.log('  API Rating:', apiData.rating);
            console.log('  API Review Count:', apiData.user_ratings_total);
        }
        console.log('========================================');

        // Fallback for missing API data
        // ONLY use fallback if API completely failed (apiData is null)
        const googleMapsUri = apiData?.google_maps_uri || finalUrl;
        const directionsUri = apiData?.directions_uri || (finalUrl ? finalUrl + '/directions' : null);

        // Only infer delivery/takeout if API completely failed
        // If API succeeded but didn't return these fields, respect that (don't guess)
        let delivery = apiData?.delivery;
        let takeout = apiData?.takeout;

        if (!apiData) {
            // API completely failed - use category-based inference as fallback
            const isRestaurant = category && (
                category.includes('레스토랑') || category.includes('음식점') || category.includes('restaurant') ||
                category.includes('cafe') || category.includes('카페') || category.includes('food')
            );
            delivery = isRestaurant ? true : undefined;
            takeout = isRestaurant ? true : undefined;
            console.log('Using fallback for delivery/takeout (API failed):', { delivery, takeout, category });
        } else {
            console.log('Using API data for delivery/takeout:', { delivery, takeout });
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
            national_phone_number: apiData?.national_phone_number, // National format phone
            website: website, // Website URL if available
            // formatted_address removed - not displayed in UI
            types: category ? [category.toLowerCase().replace(/\s+/g, '_')] : [],
            photos: image ? [{ photo_reference: image }] : [],
            // Action buttons (with fallbacks)
            google_maps_uri: googleMapsUri,
            directions_uri: directionsUri,
            reservable: apiData?.reservable,
            delivery: delivery,
            takeout: takeout,
            dine_in: apiData?.dine_in,
            opening_hours: apiData?.opening_hours
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
