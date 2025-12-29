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
        // 1. Fetch the playlist with the "Stealth" headers
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'http://king4k.tv/',
                'Origin': 'http://king4k.tv'
            }
        });

        const contentType = response.headers['content-type'];
        
        // 2. Identify if this is a Playlist (.m3u8)
        if ((contentType && contentType.includes('mpegurl')) || url.includes('.m3u8')) {
            console.log(`Processing Playlist: ${url}`);
            
            let m3u8Content = response.data.toString('utf8');
            const lines = m3u8Content.split('\n');
            const proxyBase = `${req.protocol}://${req.get('host')}/proxy?url=`;

            // 3. Process the file LINE BY LINE (The Fix for 404s)
            const modifiedLines = lines.map(line => {
                const trimmed = line.trim();
                
                // If the line is empty or a comment, leave it alone
                if (!trimmed || trimmed.startsWith('#')) {
                    return line;
                }

                // It is a link (chunk or sub-playlist). We must make it absolute.
                try {
                    // This magic line resolves "shortcuts" (relative paths) against the original URL
                    const absoluteUrl = new URL(trimmed, url).href;
                    return proxyBase + encodeURIComponent(absoluteUrl);
                } catch (e) {
                    return line; // If it fails, leave it alone
                }
            });

            const finalContent = modifiedLines.join('\n');

            res.set('Content-Type', 'application/vnd.apple.mpegurl');
            res.send(finalContent);
            
        } else {
            // 4. It is a video chunk (.ts) - Just pass it through
            if (contentType) res.set('Content-Type', contentType);
            res.send(response.data);
        }

    } catch (error) {
        console.error("Proxy Error:", error.message);
        res.status(500).send('Error fetching stream');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
