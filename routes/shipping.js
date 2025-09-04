import express from 'express';
import { Client } from '@googlemaps/google-maps-services-js';

const router = express.Router();
const googleMapsClient = new Client({});

const BASE_ZIP_CODE = '03346030';
const FREE_SHIPPING_RADIUS_KM = 2;

router.post('/calculate-shipping', async (req, res) => {
  const { customerZipCode } = req.body;

  if (!customerZipCode || customerZipCode.trim().length !== 8) {
    return res.status(400).json({ error: 'CEP inválido. Certifique-se de enviar um CEP de 8 dígitos.' });
  }

  try {
    const response = await googleMapsClient.distancematrix({
      params: {
        origins: [BASE_ZIP_CODE],
        destinations: [customerZipCode],
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000,
    });

    console.log('Resposta da API do Google Maps:', JSON.stringify(response.data, null, 2));

    if (response.data.rows[0].elements[0].status === 'OK') {
      const distanceInMeters = response.data.rows[0].elements[0].distance.value;
      const distanceInKm = distanceInMeters / 1000;

      if (distanceInKm <= FREE_SHIPPING_RADIUS_KM) {
        res.json({ shippingCost: 0, distance: distanceInKm, message: 'Frete grátis!' });
      } else {
        const shippingCost = Math.max(11, Math.min(55, distanceInKm * 1.5)); // valores em reais
res.json({
  valor: shippingCost,
  distancia: distanceInKm,
  servico: distanceInKm <= FREE_SHIPPING_RADIUS_KM ? "Frete Local" : "Entrega Padrão",
  prazo: distanceInKm <= FREE_SHIPPING_RADIUS_KM ? "1 dia útil" : "3-7 dias úteis",
  message: distanceInKm <= FREE_SHIPPING_RADIUS_KM ? "Frete grátis!" : "Frete calculado pela distância."
});

      }
    } else {
      throw new Error(`Google Maps API Error: ${response.data.rows[0].elements[0].status}`);
    }
  } catch (error) {
    console.error('Erro ao calcular o frete:', error.message);
    res.status(500).json({ error: 'Erro ao calcular o frete.' });
  }
});

export default router;
