const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/proxy', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('URL parameter is required');
    }

    try {
        console.log(`Attempting to fetch: ${url}`);
        
        // 1. "Super Stealth" Headers to mimic a real VLC/Web Player
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000, // Wait 10 seconds before giving up
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'http://king4k.tv/',
                'Origin': 'http://king4k.tv',
                'Host': 'king4k.tv' // This sometimes tricks the server
            }
        });

        const contentType = response.headers['content-type'];
        console.log(`Success! Content-Type: ${contentType}`);

        if ((contentType && contentType.includes('mpegurl')) || url.includes('.m3u8')) {
            let m3u8Content = response.data.toString('utf8');
            
            const currentHost = req.get('host');
            const protocol = req.protocol;
            const baseUrl = `${protocol}://${currentHost}/proxy?url=`;
            
            m3u8Content = m3u8Content.replace(/(http:\/\/[^\s]+)/g, (match) => {
                return baseUrl + encodeURIComponent(match);
            });

            res.set('Content-Type', 'application/vnd.apple.mpegurl');
            res.send(m3u8Content);
        } else {
            if (contentType) res.set('Content-Type', contentType);
            res.send(response.data);
        }

    } catch (error) {
        // Log the specific error to help us debug
        if (error.code === 'ECONNRESET') {
             console.error("BLOCKED: The provider hung up (ECONNRESET). They are blocking Render IPs.");
        } else if (error.response) {
            console.error("Provider Error:", error.response.status, error.response.statusText);
        } else {
            console.error("Proxy Error:", error.message);
        }
        res.status(500).send('Error fetching stream.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
