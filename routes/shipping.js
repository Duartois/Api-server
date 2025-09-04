import express from "express";
import fetch from "node-fetch";
const router = express.Router();

// Função para buscar dados do CEP na BrasilAPI
async function getCepInfo(cep) {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Erro BrasilAPI:", err);
    return null;
  }
}

// Função de regras fixas
function calcularFretePorCep(cep, bairro, cidade, estado) {
  // Rua (CEP exato) → grátis
  if (cep === "03314030") {
    return { valor: "Grátis", servico: "Entrega Local", prazo: "1 dia útil" };
  }

  // Bairro específico
  if (cep.startsWith("03346") || bairro?.toLowerCase() === "tatuapé") {
    return { valor: 10, servico: "Entrega Bairro", prazo: "2-3 dias úteis" };
  }

  // Zona Leste (03000–03999)
  if (/^03\d{5}$/.test(cep)) {
    return { valor: 15, servico: "Entrega Zona Leste", prazo: "3-4 dias úteis" };
  }

  // Outras zonas da capital
  if (cidade?.toLowerCase() === "são paulo" && estado === "SP") {
    return { valor: 18, servico: "Entrega Capital", prazo: "4-5 dias úteis" };
  }

  // Região Metropolitana
  const regioesMetropolitanas = [
    "guarulhos",
    "osasco",
    "santo andré",
    "são bernardo do campo",
    "são caetano do sul",
    "diadema",
    "mauá"
  ];
  if (regioesMetropolitanas.includes(cidade?.toLowerCase())) {
    return { valor: 25, servico: "Entrega Região Metropolitana", prazo: "5-6 dias úteis" };
  }

  // Brasil (fallback)
  return { valor: 35, servico: "Entrega Nacional", prazo: "7-10 dias úteis" };
}

router.post("/calculate-shipping", async (req, res) => {
  let { customerZipCode } = req.body;
  if (!customerZipCode) return res.status(400).json({ error: "CEP ausente" });

  customerZipCode = customerZipCode.replace(/\D/g, "");
  if (customerZipCode.length !== 8) {
    return res.status(400).json({ error: "CEP inválido. Use 8 dígitos." });
  }

  try {
    const cepInfo = await getCepInfo(customerZipCode);
    if (!cepInfo) {
      return res.status(400).json({ error: "CEP não encontrado na BrasilAPI" });
    }

    const frete = calcularFretePorCep(
      customerZipCode,
      cepInfo.neighborhood,
      cepInfo.city,
      cepInfo.state
    );

    return res.json(frete);
  } catch (err) {
    console.error("Erro no cálculo de frete:", err);
    return res.status(500).json({ error: "Falha ao calcular frete" });
  }
});

export default router;
