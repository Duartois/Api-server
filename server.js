import express from "express";
import cors from 'cors';
import 'dotenv/config';
import { doc, collection, setDoc, getDoc, updateDoc, getDocs, query, where, deleteDoc, limit } from "firebase/firestore";
import { db } from "./services/firebase.js";
import { generateURL } from "./services/s3Service.js";
import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";
import shippingRoutes from "./routes/shipping.js";
import bodyParser from "body-parser";
import webhookRoutes from "./routes/webhook.js";
import ordersRoutes from "./routes/orders.js";

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://www.bichinhosousados.com",
  "https://bichinhosousados.com",
  "https://api-server-orcin.vercel.app"
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // responde preflight

 Body parsers (rawjson)
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe-webhook") {
    express.raw({ type: "applicationjson" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

 Rotas
app.use("/api", authRoutes);
app.use("/api", paymentRoutes);
app.use("/api", shippingRoutes);
app.use("/api", ordersRoutes);
app.use("/api", webhookRoutes);


app.get('s3url', (req, res) => {
  const fileType = req.query.fileType;
  const allowedTypes = ['imagepng', 'imagejpeg'];
  if (!fileType || !allowedTypes.includes(fileType)) {
    return res.status(400).json({ error: 'Tipo de arquivo inválido ou ausente' });
  }
  generateURL(fileType)
    .then(url => res.json({ url }))
    .catch(err => {
      console.error('Erro ao gerar URL:', err);
      res.status(500).json({ error: 'Falha ao gerar URL' });
    });
});

app.get('', (req, res) => {
  res.sendFile("index.html", { root: "public_html" });
});

app.get('products', (req, res) => {
  res.sendFile("product.html", { root: "public_html" });
});

app.get('category', (req, res) => {
  res.status(200).json({ message: 'Rota Category válida' });
});

 Dashboard e demais rotas
 Dashboard
app.get('dashboard', (req, res) => {
  res.status(200).json({ message: 'Rota Dashboard válida' });
});
/ Adicionar produto
app.get('/api/add-product', (req, res) => {
  res.sendFile('add-product.html', { root: "public_html"});
});
// Rota para editar o produto
app.get('/api/add-product-data', async (req, res) => {
  const productId = req.query.id;
  console.log("Product ID recebido:", productId);
  const products = collection(db, "products");

  try {
    const productDoc = await getDoc(doc(products, productId));

    if (productDoc.exists()) {
      const productData = productDoc.data();

      // Garante que todos os campos esperados existam, com fallback
      productData.oldPrice = productData.oldPrice || 'Valor Antigo';
      productData.savePrice = productData.savePrice || 'Desconto';
      productData.tags = productData.tags || [];

      // Garante que os campos de imagem estejam definidos corretamente
      productData.images = Array.isArray(productData.images) ? productData.images : [];
      productData.image = productData.image || (productData.images.length ? productData.images[0] : '');

      res.json(productData);
    } else {
      res.status(404).json({ error: "Produto não encontrado" });
    }
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});
// Funções para calcular badges
const isNewProduct = (createdDate) => {
    const currentDate = new Date();
    const productDate = new Date(createdDate);
    const daysDifference = Math.floor((currentDate - productDate) / (1000 * 60 * 60 * 24));
    return daysDifference <= 30; // Considera "novo" se o produto foi criado nos últimos 30 dias
};

const isFeaturedProduct = (product) => {
    const discountThreshold = 50; // Exemplo: Desconto acima de 50% marca como destaque
    const featuredCategories = ['Eletrônicos', 'Moda']; // Exemplo: Categorias específicas que são destaque
    return (Number(product.savePrice) >= discountThreshold) || featuredCategories.includes(product.category);
};

const isPopularProduct = (salesCount) => {
    const popularThreshold = 10; // Exemplo: Produtos com mais de 10 vendas são populares
    return salesCount > popularThreshold;
};

app.post('/api/add-product', async (req, res) => {
  let { 
    name, shortDes, detail, price, 
    images = [], tags = [], email, draft, 
    oldPrice, savePrice, id, createdAt, 
    salesCount = 0, category, type 
  } = req.body;

  // Validação dos campos obrigatórios
  if (!draft) {
  if (!name || !name.length) return res.json({ alert: 'Precisa adicionar um nome ao produto' });
  if (!category || !category.length) return res.json({ alert: 'Precisa adicionar uma categoria' });
  if (!price || !price.length || isNaN(Number(price))) return res.json({ alert: 'Adicione um preço válido' });
  if (!images || !images.length) return res.json({ alert: 'Adicione uma imagem principal' });
}

  if (savePrice && !oldPrice) {
    return res.json({ alert: 'Adicione um valor antigo (oldPrice) se estiver adicionando um desconto (savePrice)' });
  }

  let docName = id ? id : `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.floor(Math.random() * 50000)}`;
  if (!createdAt) {
    createdAt = new Date().toISOString();
  }

  // Normaliza imagens
  if (!Array.isArray(images)) {
    images = [images].filter(Boolean);
  }
  const image = images.length > 0 ? images[0] : "";

  let productWithBadges = {
    id: docName,
    name,
    type: type || "",        // novo campo
    category,
    shortDes,
    detail,
    price,
    oldPrice,
    savePrice,
    tags,
    email,
    draft,
    createdAt,
    salesCount,
    images,
    image,                   // principal
    badges: {
      new: isNewProduct(createdAt),
      featured: savePrice ? isFeaturedProduct(req.body) : false,
      popular: isPopularProduct(salesCount)
    }
  };

  try {
    const products = collection(db, "products");
    await setDoc(doc(products, docName), productWithBadges);
    return res.status(200).json({
      success: true,
      product: productWithBadges
    });
  } catch (err) {
    console.error('Erro ao adicionar produto:', err);
    return res.status(500).json({ alert: 'Ocorreu algum erro no servidor' });
  }
});

const generateTagVariants = (tag) => {
    if (!tag || !tag.trim()) {
        // Se a tag estiver vazia ou contiver apenas espaços em branco, retorna um array vazio
        return [];
    }

    const lowercaseTag = tag.toLowerCase();
    const uppercaseTag = tag.toUpperCase();
    const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();

    const pluralTag = pluralize(lowercaseTag);
    const pluralCapitalizedTag = pluralize(capitalizedTag);
    const pluralUppercaseTag = pluralize(uppercaseTag);

    return [lowercaseTag, uppercaseTag, capitalizedTag, pluralTag, pluralCapitalizedTag, pluralUppercaseTag];
};


// Função básica de pluralização
const pluralize = (word) => {
    if (word.endsWith('s')) {
        return word;
    } else if (word.endsWith('y') && !/[aeiou]y$/.test(word)) {
        return word.slice(0, -1) + 'ies';
    } else if (word.endsWith('ch') || word.endsWith('sh') || word.endsWith('x') || word.endsWith('z') || word.endsWith('o')) {
        return word + 'es';
    } else {
        return word + 's';
    }
};
app.post('/api/get-products', async (req, res) => {
  try {
    const { tag, badge, email, searchParam } = req.body;
    const productsCollection = collection(db, "products");

    let q;
    if (email) {
      q = query(productsCollection, where("email", "==", email));
    } else if (badge) {
      q = query(productsCollection, where(`badges.${badge}`, "==", true));
    } else {
      q = productsCollection; // pega todos
    }

    const snap = await getDocs(q);
    const out = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const normalized = {
        id: docSnap.id,
        name: data.name || "",
        image: data.image || (Array.isArray(data.images) && data.images.length ? data.images[0] : "/assets/img/placeholder.png"),
        price: data.price || "",
        oldPrice: data.oldPrice || "",
        savePrice: data.savePrice || "",
        category: data.category || "",
        badges: data.badges || {},
        draft: !!data.draft,
        ...data,
      };

      if (email) {
        // Dashboard: retorna tudo
        out.push(normalized);
      } else {
        // Público: só publicados
        if (normalized.draft) return;

        if (searchParam) {
          const s = String(searchParam).toLowerCase();
          const ok =
            (normalized.name || "").toLowerCase().includes(s) ||
            (normalized.id || "").toLowerCase().includes(s) ||
            (normalized.category || "").toLowerCase().includes(s);
          if (ok) out.push(normalized);
        } else if (tag && tag !== "all") {
          if ((normalized.category || "").toLowerCase() === tag.toLowerCase()) {
            out.push(normalized);
          }
        } else {
          out.push(normalized);
        }
      }
    });

    console.log("[GET-PRODUCTS] retornando", out.length, "produtos");
    return res.json(out); // <-- só aqui no final
  } catch (err) {
    console.error("[GET-PRODUCTS] ERROR:", err);
    return res.status(500).json({ error: "DB_ERROR", detail: String(err.message) });
  }
});

// Rota para buscar produtos pelo ID
app.get('/api/product-data', async (req, res) => {
  const productId = req.query.id; // Obtém o ID do produto da URL
    console.log('ID recebido:', productId);
    const productsCollection = collection(db, "products");

    try {
        const productDoc = await getDoc(doc(productsCollection, productId));
        if (productDoc.exists()) {
            res.json({ id: productDoc.id, ...productDoc.data() });  // Retorna os dados do produto em JSON, incluindo o ID
        } else {
            res.status(404).json({ error: "Produto não encontrado" });
        }
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: "Erro ao buscar produto" });
    }
});




// Rota de busca
app.get('/api/category/:key', (req, res) => {
res.sendFile("category.html", { root: "public_html" });
});

// Rota para deletar produtos
app.post('/api/delete-product', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'ID do produto é necessário.' });
    }

    const products = collection(db, "products");

    try {
        await deleteDoc(doc(products, id));
        return res.json('success');
    } catch (error) {
        console.error('Erro ao deletar o produto:', error);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/add-review', (req, res) => {
  let { headline, review, rate, email, product } = req.body;

  // Validação dos dados
  if (!headline || !review || !rate || !email || !product) {
    return res.json({ 'alert': 'Preencha todos os campos corretamente' });
  }

  // Objeto de revisão a ser adicionado ao Firestore
  const reviewData = {
    headline,
    review,
    rate,
    email,
    product,
    timestamp: new Date() // Adicione um timestamp se desejar
  };

  // Referência à coleção de revisões no Firestore
  const reviewsCollection = collection(db, "reviews");

  // Adicionar a revisão ao Firestore
  setDoc(doc(reviewsCollection, `review-${email}-${product}`), reviewData)
    .then(() => {
      res.json({ 'success': 'Review adicionada com sucesso' });
    })
    .catch(error => {
      console.error('Erro ao adicionar revisão:', error);
      res.status(500).json({ 'alert': 'Erro ao processar a revisão. Tente novamente mais tarde.' });
    });
});

app.post('/api/get-reviews', (req, res) => {
let { product, email } = req.body;
let reviews = collection(db, "reviews");

getDocs(query(reviews, where("product", "==", product)), limit(4))
.then(review => {
    let reviewArr = [];

    if(review.empty){
        return res.json(reviewArr);
    }

    let userEmail = false;

    review.forEach((item, i) => {
        let reivewEmail = item.data().email;
        if(reivewEmail == email){
            userEmail = true;
        }
        reviewArr.push(item.data());
    });

    if(!userEmail){
        getDoc(doc(reviews, `review-${email}-${product}`))
        .then(data => reviewArr.push(data.data()));
    }

    return res.json(reviewArr);
})
.catch(error => {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
});
});


app.get('/api/cart', (req, res) => {
  res.sendFile("cart.html", { root :"public_html" })
})

app.get('/api/checkout', (req, res) => {
  res.sendFile("checkout.html", { root : "public_html"})
})

app.get('/api/success', (req, res) => {
  console.log("Página de sucesso acessada com session_id:", req.query.session_id);
  res.sendFile("success.html", { root: "public_html"  });
});

app.get('/api/404', (req, res) => {
  res.sendFile("404.html", { root: "public_html" });
});

app.use((req, res) => {
  res.redirect('/404');
});

if (process.env.VERCEL !== '1') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Servidor local rodando na porta ${port}`);
  });
}

export default app;




















