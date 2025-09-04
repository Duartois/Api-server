import express from "express";
const router = express.Router();

const BASE_ZIP_CODE = "03346030"; // Anália Franco
const FREE_RADIUS_KM = 2; // raio grátis (mock)

router.post("/calculate-shipping", (req, res) => {
  const { customerZipCode } = req.body;

  if (!customerZipCode || customerZipCode.trim().length !== 8) {
    return res
      .status(400)
      .json({ error: "CEP inválido. Use 8 dígitos sem traço." });
  }

  let shipping;

  // Faixas de CEP SP Capital (01xxx até 05xxx = regiões centrais/zonas conhecidas)
  if (
    customerZipCode.startsWith("01") ||
    customerZipCode.startsWith("02") ||
    customerZipCode.startsWith("03") ||
    customerZipCode.startsWith("04") ||
    customerZipCode.startsWith("05")
  ) {
    shipping = {
      valor: 12,
      servico: "Entrega São Paulo - Capital",
      prazo: "1-2 dias úteis",
      message: "Entrega rápida dentro da capital",
    };
  }
  // Grande São Paulo (06xxx a 09xxx)
  else if (
    customerZipCode.startsWith("06") ||
    customerZipCode.startsWith("07") ||
    customerZipCode.startsWith("08") ||
    customerZipCode.startsWith("09")
  ) {
    shipping = {
      valor: 20,
      servico: "Entrega Região Metropolitana",
      prazo: "2-4 dias úteis",
      message: "Entrega região metropolitana de SP",
    };
  }
  // Outros estados (CEP 1xxxxx pra cima)
  else {
    shipping = {
      valor: 40,
      servico: "Entrega Nacional",
      prazo: "5-9 dias úteis",
      message: "Entrega para todo o Brasil",
    };
  }

  return res.json(shipping);
});

export default router;
