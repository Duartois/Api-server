import express from "express";
const router = express.Router();

const BASE_COORDS = { lat: -23.5612, lon: -46.5604 }; // CEP base

// Consulta ViaCEP
async function getAddressByCep(zip) {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return `${data.logradouro || ""}, ${data.bairro || ""}, ${data.localidade}, ${data.uf}`;
  } catch {
    return null;
  }
}

// Consulta Nominatim (OpenStreetMap)
async function getCoordsByAddress(address) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&country=Brazil&format=json&limit=1`);
    const data = await response.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// Fórmula de Haversine (km)
function haversine(coord1, coord2) {
  const R = 6371;
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
  const lat1 = coord1.lat * Math.PI / 180;
  const lat2 = coord2.lat * Math.PI / 180;

  const a =
    Math.sin(dLat/2) ** 2 +
    Math.sin(dLon/2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Calcula frete baseado em distância
function calcularFretePorDistancia(km) {
  if (km <= 0.5) return { valor: 0, servico: "Entrega Local", prazo: "Mesmo dia" };
  if (km <= 3) return { valor: 10, servico: "Entrega Bairro", prazo: "1 dia útil" };
  if (km <= 15) return { valor: 15, servico: "Entrega Zona Leste", prazo: "1-2 dias úteis" };
  if (km <= 30) return { valor: 18, servico: "Entrega São Paulo - Capital", prazo: "2-3 dias úteis" };
  if (km <= 60) return { valor: 25, servico: "Entrega Região Metropolitana", prazo: "3-4 dias úteis" };
  return { valor: 35, servico: "Entrega Nacional", prazo: "5-9 dias úteis" };
}

router.post("/calculate-shipping", async (req, res) => {
  let { customerZipCode } = req.body;
  if (!customerZipCode) return res.status(400).json({ error: "CEP ausente" });

  customerZipCode = customerZipCode.replace(/\D/g, "");
  if (customerZipCode.length !== 8) {
    return res.status(400).json({ error: "CEP inválido. Use 8 dígitos." });
  }

  try {
    const address = await getAddressByCep(customerZipCode);
    if (!address) return res.status(400).json({ error: "CEP não encontrado no ViaCEP" });

    const coords = await getCoordsByAddress(address);
    if (!coords) return res.status(400).json({ error: "Não foi possível localizar o endereço no mapa" });

    const km = haversine(BASE_COORDS, coords);
    const frete = calcularFretePorDistancia(km);

    return res.json({ ...frete, distanciaKm: km.toFixed(2), endereco: address });
  } catch (err) {
    console.error("Erro no cálculo de frete:", err);
    return res.status(500).json({ error: "Falha ao calcular frete" });
  }
});

export default router;
