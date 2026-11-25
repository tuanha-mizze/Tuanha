
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { timingSafeEqual } from 'node:crypto';
import { supabase } from './supabase.js';
import { hashValue } from './keys.js';
import './bot.js';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10kb' }));

const secret = process.env.API_SECRET;

if (!secret || secret.length < 32) {
  throw new Error('API_SECRET must be at least 32 characters');
}

function authorized(req, res, next) {
  const a = Buffer.from(req.headers.authorization || '');
  const b = Buffer.from(`Bearer ${secret}`);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ valid: false });
  }

  next();
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'TH SV Key API' });
});

app.post(
  '/api/validate',
  rateLimit({
    windowMs: 60000,
    limit: 30
  }),
  authorized,
  async (req, res) => {
    try {
      const { key, deviceId } = req.body || {};

      if (
        typeof key !== 'string' ||
        !/^TH-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(key) ||
        typeof deviceId !== 'string' ||
        deviceId.length < 8 ||
        deviceId.length > 200
      ) {
        return res.status(400).json({
          valid: false,
          error: 'Invalid request'
        });
      }

      const { data, error } = await supabase.rpc(
        'activate_sv_key',
        {
          p_key_hash: hashValue(key.trim().toUpperCase()),
          p_device_hash: hashValue(deviceId)
        }
      );

      if (error) throw error;

      return res.json(data);
    } catch (error) {
      console.error(error.message);

      return res.status(500).json({
        valid: false,
        error: 'Internal server error'
      });
    }
  }
);

const port = Number(process.env.PORT || 3000);

app.listen(port, '0.0.0.0', () => {
  console.log(`TH SV KEY API running on ${port}`);
});
