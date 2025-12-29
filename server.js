const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Enable CORS for everyone
app.use(cors());

app.get('/proxy', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('URL parameter is required');
    }

    try {
        // 1. Fetch the playlist with "Stealth" headers
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
            
            // --- THE FIX IS HERE ---
            // We force 'https' because Render requires it.
            // We also use req.get('host') to get the correct Render URL.
            const proxyBase = `https://${req.get('host')}/proxy?url=`;

            // 3. Process the file LINE BY LINE
            const modifiedLines = lines.map(line => {
                const trimmed = line.trim();
                
                if (!trimmed || trimmed.startsWith('#')) {
                    return line;
                }

                try {
                    // Resolve relative paths (shortcuts) to full URLs
                    const absoluteUrl = new URL(trimmed, url).href;
                    return proxyBase + encodeURIComponent(absoluteUrl);
                } catch (e) {
                    return line; 
                }
            });

            const finalContent = modifiedLines.join('\n');

            res.set('Content-Type', 'application/vnd.apple.mpegurl');
            res.send(finalContent);
            
        } else {
            // 4. It is a video chunk (.ts)
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
