import express from "express";
import cors from "cors";
import "dotenv/config";
import debugRoutes from "./routes/debug.js";
import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";
import shippingRoutes from "./routes/shipping.js";
import webhookRoutes from "./routes/webhook.js";
import orderRoutes from "./routes/order.js";

import {
  doc, collection, setDoc, getDoc,
  getDocs, query, where, deleteDoc, limit
} from "firebase/firestore";
import { db } from "./services/firebase.js";
import { generateURL } from "./services/s3Service.js";

const app = express();

// -----------------------------
// 1. CORS no topo
// -----------------------------
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://www.bichinhosousados.com",
  "https://bichinhosousados.com",
  "https://api-server-orcin.vercel.app"
];

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigins.includes(req.headers.origin) ? req.headers.origin : "");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// -----------------------------
// 2. Body parser / webhook
// -----------------------------
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe-webhook") {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// -----------------------------
// 3. Rotas de API
// -----------------------------
app.use("/api", authRoutes);
app.use("/api", paymentRoutes);
app.use("/api", shippingRoutes);
app.use("/api", orderRoutes);
app.use("/api", webhookRoutes);
app.use("/api", debugRoutes);

// -----------------------------
// S3 upload
// -----------------------------
app.get("/api/s3url", async (req, res) => {
  try {
    const fileType = req.query.fileType;
    const allowedTypes = ["image/png", "image/jpeg"];
    if (!fileType || !allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: "Tipo de arquivo inválido ou ausente" });
    }
    const url = await generateURL(fileType);
    return res.json({ url });
  } catch (err) {
    console.error("[S3URL] Erro ao gerar URL:", err);
    return res.status(500).json({ error: "Falha ao gerar URL" });
  }
});

// -----------------------------
// Produtos
// -----------------------------
app.post("/api/add-product", async (req, res) => {
  try {
    const {
      id,
      name,
      shortDes,
      detail,
      price,
      images = [],
      tags = [],
      email,
      draft,
      oldPrice,
      savePrice,
      createdAt,
      salesCount = 0,
      category,
      type,
    } = req.body;

    if (!draft) {
      if (!name) return res.json({ alert: "Precisa adicionar um nome ao produto" });
      if (!category) return res.json({ alert: "Precisa adicionar uma categoria" });
      if (!price || isNaN(Number(price)))
        return res.json({ alert: "Adicione um preço válido" });
      if (!images || !images.length)
        return res.json({ alert: "Adicione uma imagem principal" });
    }

    const docName =
      id ||
      `${(name || "produto").toLowerCase().replace(/\s+/g, "-")}-${Math.floor(
        Math.random() * 50000
      )}`;
    const newCreatedAt = createdAt || new Date().toISOString();
    const finalImages = Array.isArray(images) ? images : [images].filter(Boolean);

    const product = {
      id: docName,
      name: name || "",
      type: type || "",
      category: category || "",
      shortDes: shortDes || "",
      detail: detail || "",
      price: price || "",
      oldPrice: oldPrice || "",
      savePrice: savePrice || "",
      tags: Array.isArray(tags) ? tags : [],
      email: email || "",
      draft: !!draft,
      createdAt: newCreatedAt,
      salesCount: Number(salesCount) || 0,
      images: finalImages,
      image: finalImages[0] || "",
      badges: {
        new: isNewProduct(newCreatedAt),
        featured: savePrice ? isFeaturedProduct({ savePrice, category }) : false,
        popular: isPopularProduct(salesCount),
      },
    };

    await setDoc(doc(collection(db, "products"), docName), product);
    return res.status(200).json({ success: true, product });
  } catch (err) {
    console.error("[ADD-PRODUCT] ERROR:", err);
    return res.status(500).json({ alert: "Erro no servidor" });
  }
});

app.post("/api/get-products", async (req, res) => {
  try {
    const { tag, badge, email, searchParam } = req.body;
    const productsCol = collection(db, "products");

    let qRef;
    if (email) {
      qRef = query(productsCol, where("email", "==", email));
    } else if (badge) {
      qRef = query(productsCol, where(`badges.${badge}`, "==", true));
    } else {
      qRef = productsCol;
    }

    const snap = await getDocs(qRef);
    const out = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const normalized = {
        id: docSnap.id,
        name: data.name || "",
        image:
          data.image ||
          (Array.isArray(data.images) && data.images.length
            ? data.images[0]
            : "/assets/img/placeholder.png"),
        price: data.price || "",
        oldPrice: data.oldPrice || "",
        savePrice: data.savePrice || "",
        category: data.category || "",
        badges: data.badges || {},
        draft: !!data.draft,
        ...data,
      };

      if (email) return out.push(normalized);
      if (normalized.draft) return;

      if (searchParam) {
        const s = String(searchParam).toLowerCase();
        if (
          (normalized.name || "").toLowerCase().includes(s) ||
          (normalized.id || "").toLowerCase().includes(s) ||
          (normalized.category || "").toLowerCase().includes(s)
        ) {
          return out.push(normalized);
        }
      } else if (tag && tag !== "all") {
        if ((normalized.category || "").toLowerCase() === tag.toLowerCase()) {
          return out.push(normalized);
        }
      } else {
        out.push(normalized);
      }
    });

    return res.json(out);
  } catch (err) {
    console.error("[GET-PRODUCTS] ERROR:", err);
    return res.status(500).json({ error: "DB_ERROR", detail: String(err.message) });
  }
});

app.get("/api/product-data", async (req, res) => {
  try {
    const productId = req.query.id;
    if (!productId) return res.status(400).json({ error: "ID é obrigatório" });

    const productDoc = await getDoc(doc(collection(db, "products"), productId));
    if (!productDoc.exists()) return res.status(404).json({ error: "Produto não encontrado" });

    return res.json({ id: productDoc.id, ...productDoc.data() });
  } catch (err) {
    console.error("[PRODUCT-DATA] ERROR:", err);
    return res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

app.post("/api/delete-product", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID do produto é necessário." });

    await deleteDoc(doc(collection(db, "products"), id));
    return res.json("success");
  } catch (err) {
    console.error("[DELETE-PRODUCT] ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Reviews
// -----------------------------
app.post("/api/add-review", async (req, res) => {
  try {
    const { headline, review, rate, email, product } = req.body;
    if (!headline || !review || !rate || !email || !product) {
      return res.json({ alert: "Preencha todos os campos corretamente" });
    }
    const payload = {
      headline,
      review,
      rate,
      email,
      product,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(collection(db, "reviews"), `review-${email}-${product}`), payload);
    return res.json({ success: "Review adicionada com sucesso" });
  } catch (err) {
    console.error("[ADD-REVIEW] ERROR:", err);
    return res.status(500).json({ alert: "Erro ao processar a review" });
  }
});

app.post("/api/get-reviews", async (req, res) => {
  try {
    const { product, email } = req.body;
    if (!product) return res.json([]);

    const reviewsCol = collection(db, "reviews");
    const snap = await getDocs(query(reviewsCol, where("product", "==", product), limit(4)));

    const reviewArr = [];
    let userHasReview = false;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data?.email === email) userHasReview = true;
      reviewArr.push(data);
    });

    if (!userHasReview && email) {
      const own = await getDoc(doc(reviewsCol, `review-${email}-${product}`));
      if (own.exists()) reviewArr.push(own.data());
    }

    return res.json(reviewArr);
  } catch (err) {
    console.error("[GET-REVIEWS] ERROR:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// -----------------------------
// Páginas públicas (sem /api)
// -----------------------------
app.get("/", (req, res) => res.sendFile("index.html", { root: "public_html" }));
app.get("/products", (req, res) => res.sendFile("product.html", { root: "public_html" }));
app.get("/category/:key", (req, res) => res.sendFile("category.html", { root: "public_html" }));
app.get("/cart", (req, res) => res.sendFile("cart.html", { root: "public_html" }));
app.get("/checkout", (req, res) => res.sendFile("checkout.html", { root: "public_html" }));
app.get("/success", (req, res) => res.sendFile("success.html", { root: "public_html" }));
app.get("/404", (req, res) => res.sendFile("404.html", { root: "public_html" }));

// -----------------------------
// Fallback
// -----------------------------
app.use((req, res) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  res.status(404).json({ error: "Not found" });
});

// -----------------------------
// Local dev
// -----------------------------
if (process.env.VERCEL !== "1") {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
}

export default app;

// -----------------------------
// Helpers
// -----------------------------
function isNewProduct(createdDate) {
  const currentDate = new Date();
  const productDate = new Date(createdDate);
  const days = Math.floor((currentDate - productDate) / (1000 * 60 * 60 * 24));
  return days <= 30;
}
function isFeaturedProduct(product) {
  const discountThreshold = 50;
  const featuredCategories = ["Eletrônicos", "Moda"];
  return (
    Number(product.savePrice) >= discountThreshold ||
    featuredCategories.includes(product.category)
  );
}
function isPopularProduct(salesCount) {
  return Number(salesCount) > 10;
}


