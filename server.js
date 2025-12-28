console.log("Starting server..."); // This is the line we added to test
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
        console.log(`Fetching: ${url}`);
        
        const response = await axios.get(url, {
            responseType: 'arraybuffer' 
        });

        const contentType = response.headers['content-type'];

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
        console.error("Proxy Error:", error.message);
        res.status(500).send('Error fetching the stream');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));