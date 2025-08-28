import express from "express";
import cors from 'cors';
import 'dotenv/config';
import { doc, collection, setDoc, getDoc, updateDoc, getDocs, query, where, deleteDoc, limit } from "firebase/firestore";
import { db } from "./services/firebase.js";
import { generateURL } from "./services/s3Service.js";
import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";
import shippingRoutes from "./routes/shipping.js";

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  'https://www.bichinhosousados.com',
  'https://bichinhosousados.com',
  'https://api-server-orcin.vercel.app'
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions), (req, res) => {
  res.sendStatus(200);
});

app.use((req, res, next) => {
  if (req.originalUrl === '/stripe-webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

app.use(authRoutes);
app.use(paymentRoutes);
app.use(shippingRoutes);

app.get('/s3url', (req, res) => {
  const fileType = req.query.fileType;
  const allowedTypes = ['image/png', 'image/jpeg'];
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

app.get('/', (req, res) => {
  res.sendFile("index.html", { root: "public_html" });
});

app.get('/products', (req, res) => {
  res.sendFile("product.html", { root: "public_html" });
});

app.get('/category', (req, res) => {
  res.status(200).json({ message: 'Rota Category válida' });
});

// Dashboard e demais rotas
// Dashboard
app.get('/dashboard', (req, res) => {
  res.status(200).json({ message: 'Rota Dashboard válida' });
});
// Adicionar produto
app.get('/add-product', (req, res) => {
  res.sendFile('add-product.html', { root: "public_html"});
});
// Rota para editar o produto
app.get('/add-product-data', async (req, res) => {
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

app.post('/add-product', (req, res) => {
    let { name, shortDes, detail, price, images = [], tags = [], email, draft, oldPrice, savePrice, id, createdAt, salesCount, category } = req.body;

    // Validação dos campos obrigatórios
    if (!draft) {
        if (!name || !name.length) return res.json({ alert: 'Precisa adicionar um nome ao produto' });
        if (!category || !category.length) return res.json({ alert: 'Precisa adicionar uma categoria' });
        if (!price || !price.length || isNaN(Number(price))) return res.json({ alert: 'Adicione um preço válido' });
        if (oldPrice && (!oldPrice.length || isNaN(Number(oldPrice)))) return res.json({ alert: 'Adicione um valor antigo válido se aplicável' });
        if (savePrice && (!savePrice.length || isNaN(Number(savePrice)))) return res.json({ alert: 'Adicione um desconto válido se aplicável' });
        if (!shortDes || !shortDes.length) return res.json({ alert: 'Precisa adicionar uma curta descrição' });
        if (!detail || !detail.length) return res.json({ alert: 'Precisa adicionar uma descrição' });
    }

    if (savePrice && !oldPrice) {
        return res.json({ alert: 'Adicione um valor antigo (oldPrice) se estiver adicionando um desconto (savePrice)' });
    }

    let docName = id ? id : `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.floor(Math.random() * 50000)}`;
if (!createdAt) {
  createdAt = new Date().toISOString();
}

    let productWithBadges = {
        ...req.body,
        id: docName,
        badges: {
            new: isNewProduct(createdAt),
            featured: savePrice ? isFeaturedProduct(req.body) : false,
            popular: isPopularProduct(salesCount)
        }
    };

    const products = collection(db, "products");

    setDoc(doc(products, docName), productWithBadges)
        .then(() => {
            res.status(200).json({
                success: true,
                product: productWithBadges
            });
        })
        .catch(err => {
            console.error('Erro ao adicionar produto:', err);
            res.status(500).json({ alert: 'Ocorreu algum erro no servidor' });
        });
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
app.post('/get-products', async (req, res) => {
  try {
    const { tag, badge, email, searchParam } = req.body;

    const productsCollection = collection(db, "products");
    let q;

    if (email) {
      q = query(productsCollection, where("email", "==", email));
    } else if (badge) {
      q = query(productsCollection, where(`badges.${badge}`, "==", true));
    } else {
      // se for "all" ou não tiver filtro, pega tudo
      q = productsCollection;
    }

    const snap = await getDocs(q);
    const out = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();

      // Normalizar pro front (garante sempre id + image)
      const normalized = {
        id: docSnap.id,
        name: data.name || "",
        image: data.image || (Array.isArray(data.images) ? data.images[0] : ""),
        price: data.price || "",
        oldPrice: data.oldPrice || "",
        savePrice: data.savePrice || "",
        category: data.category || "",
        badges: data.badges || {},
        createdAt: data.createdAt || data.created_at || null,
        ...data,
      };

      if (searchParam) {
        const s = String(searchParam).toLowerCase().trim();
        const ok =
          (normalized.name || "").toLowerCase().includes(s) ||
          (normalized.id || "").toLowerCase().includes(s) ||
          (normalized.category || "").toLowerCase().includes(s);
        if (ok) out.push(normalized);
      } else if (tag && tag !== "all") {
        if ((normalized.category || "").toLowerCase() === String(tag).toLowerCase()) {
          out.push(normalized);
        }
      } else {
        out.push(normalized);
      }
    });

    return res.json(out);
  } catch (error) {
    console.error("[GET-PRODUCTS] ERROR:", error?.message, error);
    return res.status(500).json({ error: "DB_ERROR", detail: String(error?.message || error) });
  }
});


// Rota para buscar produtos pelo ID
app.get('/product-data', async (req, res) => {
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
app.get('/category/:key', (req, res) => {
res.sendFile("category.html", { root: "public_html" });
});

// Rota para deletar produtos
app.post('/delete-product', async (req, res) => {
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

app.post('/add-review', (req, res) => {
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

app.post('/get-reviews', (req, res) => {
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


app.get('/cart', (req, res) => {
  res.sendFile("cart.html", { root :"public_html" })
})

app.get('/checkout', (req, res) => {
  res.sendFile("checkout.html", { root : "public_html"})
})

app.get('/success', (req, res) => {
  console.log("Página de sucesso acessada com session_id:", req.query.session_id);
  res.sendFile("success.html", { root: "public_html"  });
});

app.get('/404', (req, res) => {
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





