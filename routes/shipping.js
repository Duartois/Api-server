import express from "express";
const router = express.Router();

const BASE_ZIP = "03346030"; // Anália Franco
const BASE_COORDS = { lat: -23.5612, lon: -46.5604 }; // exemplo fixo do CEP base

// Função para obter coordenadas de um CEP usando Nominatim (OpenStreetMap)
async function getCoordsByZip(zip) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=Brazil&format=json&limit=1`);
    const data = await response.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (err) {
    console.error("Erro ao buscar coordenadas:", err);
    return null;
  }
}

// Fórmula de Haversine (distância em km)
function haversine(coord1, coord2) {
  const R = 6371; // raio da Terra em km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
  const lat1 = coord1.lat * Math.PI / 180;
  const lat2 = coord2.lat * Math.PI / 180;

  const a =
    Math.sin(dLat/2) ** 2 +
    Math.sin(dLon/2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calcula frete baseado em distância
function calcularFretePorDistancia(km) {
  if (km <= 0.5) return { valor: "Gratis", servico: "Entrega Local", prazo: "Mesmo dia", message: "Frete grátis - mesma rua" };
  if (km <= 3) return { valor: 10, servico: "Entrega Bairro", prazo: "1 dia útil", message: "Entrega no mesmo bairro" };
  if (km <= 15) return { valor: 15, servico: "Entrega Zona Leste", prazo: "1-2 dias úteis", message: "Entrega dentro da Zona Leste" };
  if (km <= 30) return { valor: 18, servico: "Entrega São Paulo - Capital", prazo: "2-3 dias úteis", message: "Entrega em outras zonas da capital" };
  if (km <= 60) return { valor: 25, servico: "Entrega Região Metropolitana", prazo: "3-4 dias úteis", message: "Entrega na Grande São Paulo" };
  return { valor: 35, servico: "Entrega Nacional", prazo: "5-9 dias úteis", message: "Entrega para outras regiões do Brasil" };
}

router.post("/calculate-shipping", async (req, res) => {
  const { customerZipCode } = req.body;

  if (!customerZipCode || customerZipCode.trim().length !== 8) {
    return res.status(400).json({ error: "CEP inválido. Use 8 dígitos sem traço." });
  }

  const customerCoords = await getCoordsByZip(customerZipCode);
  if (!customerCoords) {
    return res.status(400).json({ error: "Não foi possível localizar o CEP." });
  }

  const km = haversine(BASE_COORDS, customerCoords);
  const frete = calcularFretePorDistancia(km);

  return res.json({ ...frete, distanciaKm: km.toFixed(2) });
});

export default router;
