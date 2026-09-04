import { publicCatalogue, CURRENCIES, LANGUAGES, TONES } from '../lib/packs.js';

export default function handler(req, res) {
  res.setHeader('cache-control', 'public, max-age=300, s-maxage=3600');
  res.status(200).json({ packs: publicCatalogue(), currencies: CURRENCIES, languages: LANGUAGES, tones: TONES });
}
