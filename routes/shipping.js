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

async function getCoordsByCep(cep) {
  const response = await fetch(`https://www.cepaberto.com/api/v3/cep?cep=${cep}`, {
    headers: { Authorization: `Token token=${process.env.CEPABERTO_TOKEN}` }
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (data.latitude && data.longitude) {
    return { lat: parseFloat(data.latitude), lon: parseFloat(data.longitude) };
  }
  return null;
}


router.post("/calculate-shipping", async (req, res) => {
  let { customerZipCode } = req.body;
  if (!customerZipCode) return res.status(400).json({ error: "CEP ausente" });

  customerZipCode = customerZipCode.replace(/\D/g, "");
  if (customerZipCode.length !== 8) {
    return res.status(400).json({ error: "CEP inválido. Use 8 dígitos." });
  }

  try {
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${customerZipCode}/json/`);
    const viaCepData = await viaCepRes.json();

    if (viaCepData.erro) {
      return res.status(400).json({ error: "CEP não encontrado no ViaCEP" });
    }

    const { logradouro, bairro, localidade, uf } = viaCepData;

    const addressOptions = [
      `${logradouro || ""}, ${bairro || ""}, ${localidade}, ${uf}`,
      `${bairro || ""}, ${localidade}, ${uf}`,
      `${localidade}, ${uf}`,
    ];

    const coords = await getCoordsByAddress(addressOptions);

    if (!coords) {
  const frete = {
    valor: 35,
    servico: "Entrega Nacional (fallback)",
    prazo: "5-9 dias úteis",
    message: "Não foi possível localizar o endereço no mapa. Aplicado frete nacional."
  };
  return res.json(frete);
}
    const km = haversine(BASE_COORDS, coords);
    const frete = calcularFretePorDistancia(km);

    return res.json({ ...frete, distanciaKm: km.toFixed(2) });
  } catch (err) {
    console.error("Erro no cálculo de frete:", err);
    return res.status(500).json({ error: "Falha ao calcular frete" });
  }
});

export default router;
