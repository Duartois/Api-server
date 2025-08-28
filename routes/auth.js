import express from 'express';
import bcrypt from 'bcryptjs';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase.js';

const router = express.Router();

router.get('/register', (req, res) => {
  res.status(200).json({ message: 'Rota Register válida' });
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, number, tac } = req.body;
    if (name.length < 3) {
      return res.status(400).json({ alert: 'O nome precisa de pelo menos 3 letras.' });
    } else if (!email.length) {
      return res.status(400).json({ alert: 'Não está faltando nada não?' });
    } else if (password.length < 8) {
      return res.status(400).json({ alert: 'A senha precisa de pelo menos 8 letras.' });
    } else if (!Number(number) || number.length < 10) {
      return res.status(400).json({ alert: 'Número inválido. Digite um número válido.' });
    } else if (!tac) {
      return res.status(400).json({ alert: 'Você precisa concordar com os termos de uso' });
    }

    const users = collection(db, "users");
    const existing = await getDoc(doc(users, email));
    if (existing.exists()) {
      return res.status(409).json({ alert: 'email já existe' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const userData = { ...req.body, password: hash, seller: false };
    await setDoc(doc(users, email), userData);
    return res.status(201).json({ name: userData.name, email: userData.email, seller: userData.seller });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return res.status(500).json({ alert: 'Erro ao registrar usuário' });
  }
});

router.get('/login', (req, res) => {
  res.status(200).json({ message: 'Rota Login válida' });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ alert: 'Preencha todos os campos' });
    }

    const users = collection(db, "users");
    const userRef = doc(users, email);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return res.status(400).json({ alert: 'Esse email não existe' });
    }

    const data = userSnap.data();
    const hash = data.password;

    // Trate casos comuns que causam 500:
    if (!hash || typeof hash !== 'string') {
      // Conta sem senha ou dado incorreto no Firestore
      return res.status(400).json({ alert: 'Conta inválida ou sem senha cadastrada' });
    }

    // Se por acaso a senha foi salva em texto plano (legado), trate também:
    if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
      // hash não parece ser bcrypt — compare direto (para contas antigas)
      if (password !== hash) {
        return res.status(400).json({ alert: 'Senha incorreta' });
      }
    } else {
      // hash bcrypt normal
      const valid = await bcrypt.compare(password, hash);
      if (!valid) {
        return res.status(400).json({ alert: 'Senha incorreta' });
      }
    }

    // login OK — devolva os campos que o front precisa
    return res.status(200).json({
      name: data.name || '',
      email,
      seller: !!data.seller,
    });
  } catch (error) {
    console.error('[LOGIN] ERROR:', error?.message, error);
    // manter a mesma mensagem que você já usa para não quebrar o front
    return res.status(500).json({ alert: 'Erro ao realizar login' });
  }
});


router.get('/seller', (req, res) => {
  res.sendFile('seller.html', { root: 'public_html' });
});

router.post('/seller', async (req, res) => {
  try {
    let { name, address, about, number, email } = req.body;
    if (!name.length || !address.length || !about.length || number.length < 10 || isNaN(number)) {
      return res.status(400).json({ alert: 'Informações Incorretas' });
    }
    const sellers = collection(db, 'sellers');
    await setDoc(doc(sellers, email), req.body);
    const users = collection(db, 'users');
    await updateDoc(doc(users, email), { seller: true });
    return res.json({ seller: true });
  } catch (error) {
    console.error('Erro ao processar vendedor:', error);
    return res.status(500).json({ alert: 'Erro ao processar o vendedor.' });
  }
});

export default router;
