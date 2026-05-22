import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';

const PORT = process.env.PORT || 3000;
const DESC_URL = 'https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.json';
const AVAIL_URL = 'https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.json';

async function startServer() {
  const app = express();

  // Cache for parking data
  let parkingDataCache: any = null;
  let lastFetchTime = 0;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async function fetchParkingData() {
    const now = Date.now();
    if (parkingDataCache && (now - lastFetchTime < CACHE_TTL)) {
      return parkingDataCache;
    }

    try {
      console.log('Fetching parking data from Taipei City API...');
      const [descRes, availRes] = await Promise.all([
        axios.get(DESC_URL),
        axios.get(AVAIL_URL)
      ]);

      const descMap = new Map();
      descRes.data.data.park.forEach((p: any) => {
        descMap.set(p.id, p);
      });

      const combined = availRes.data.data.park.map((avail: any) => {
        const desc = descMap.get(avail.id) || {};
        return {
          ...desc,
          ...avail,
        };
      });

      parkingDataCache = combined;
      lastFetchTime = now;
      return combined;
    } catch (error) {
      console.error('Error fetching parking data:', error);
      return parkingDataCache || []; // Return stale if exists
    }
  }

  app.get('/api/parking', async (req, res) => {
    const data = await fetchParkingData();
    res.json(data);
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
