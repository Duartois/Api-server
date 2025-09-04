import express from "express";
const router = express.Router();

// CEP base Anália Franco
const BASE_ZIP = "03346030";

function calcularFretePorCep(customerZipCode) {
  // Mesmo CEP (mesma rua) → grátis
  if (customerZipCode === BASE_ZIP) {
    return {
      valor: 0,
      servico: "Entrega Local",
      prazo: "Mesmo dia",
      message: "Frete grátis - mesma rua",
    };
  }

  // Mesmo bairro (prefixo 03346)
  if (customerZipCode.startsWith("03346")) {
    return {
      valor: 10,
      servico: "Entrega Bairro",
      prazo: "1 dia útil",
      message: "Entrega no mesmo bairro",
    };
  }

  // Zona Leste (03000–03999)
  const cepNum = parseInt(customerZipCode, 10);
  if (cepNum >= 30000 && cepNum <= 39999) {
    return {
      valor: 15,
      servico: "Entrega Zona Leste",
      prazo: "1-2 dias úteis",
      message: "Entrega dentro da Zona Leste",
    };
  }

  // Outras zonas da capital (01xxx–05xxx e 04xxx etc.)
  if (
    customerZipCode.startsWith("01") ||
    customerZipCode.startsWith("02") ||
    customerZipCode.startsWith("04") ||
    customerZipCode.startsWith("05")
  ) {
    return {
      valor: 18,
      servico: "Entrega São Paulo - Capital",
      prazo: "2-3 dias úteis",
      message: "Entrega em outras zonas da capital",
    };
  }

  // Região Metropolitana (06xxx–09xxx → Guarulhos, Osasco, ABC, etc.)
  if (
    customerZipCode.startsWith("06") ||
    customerZipCode.startsWith("07") ||
    customerZipCode.startsWith("08") ||
    customerZipCode.startsWith("09")
  ) {
    return {
      valor: 25,
      servico: "Entrega Região Metropolitana",
      prazo: "3-4 dias úteis",
      message: "Entrega na Grande São Paulo",
    };
  }

  // Brasil (fora de SP)
  return {
    valor: 35,
    servico: "Entrega Nacional",
    prazo: "5-9 dias úteis",
    message: "Entrega para outras regiões do Brasil",
  };
}

router.post("/calculate-shipping", (req, res) => {
  const { customerZipCode } = req.body;

  if (!customerZipCode || customerZipCode.trim().length !== 8) {
    return res.status(400).json({ error: "CEP inválido. Use 8 dígitos sem traço." });
  }

  const frete = calcularFretePorCep(customerZipCode);
  return res.json(frete);
});

export default router;
