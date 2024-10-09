require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let accessToken = null;
let tokenExpiry = null;

const CLIENT_ID = process.env.BCA_CLIENT_ID;
const CLIENT_SECRET = process.env.BCA_CLIENT_SECRET;

const getToken = async () => {
    const url = 'https://sandbox.bca.co.id/api/oauth/token';
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const body = new URLSearchParams({
        'grant_type': 'client_credentials',
    });

    try {
        const response = await axios.post(url, body, {
            headers,
            auth: {
                username: CLIENT_ID,
                password: CLIENT_SECRET,
            },
        });

        accessToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    } catch (error) {
        console.error('Error getting token:', error.response ? error.response.data : error.message);
        throw new Error('Gagal mendapatkan token');
    }
};

const ensureToken = async () => {
    if (!accessToken || Date.now() >= tokenExpiry) {
        await getToken();
    }
    return accessToken;
};

const getMutasiBCA = async (accountNumber, startDate, endDate) => {
    await ensureToken();

    const url = 'https://sandbox.bca.co.id/api/v1/mutasi';
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };

    const body = {
        accountNumber,
        startDate,
        endDate,
    };

    try {
        const response = await axios.post(url, body, { headers });
        return response.data;
    } catch (error) {
        console.error('Error fetching mutasi:', error.response ? error.response.data : error.message);
        throw new Error('Gagal mengambil mutasi');
    }
};

// Middleware untuk validasi input
const validateInput = (req, res, next) => {
    const { accountNumber, startDate, endDate } = req.body;
    const accountNumberPattern = /^[0-9]{10,12}$/;

    if (!accountNumberPattern.test(accountNumber)) {
        return res.status(400).json({ error: 'Nomor akun tidak valid.' });
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({ error: 'Tanggal akhir harus lebih besar dari tanggal mulai.' });
    }

    next();
};

// Endpoint untuk cek mutasi
app.post('/cek', validateInput, async (req, res) => {
    const { accountNumber, startDate, endDate } = req.body;

    try {
        const dataMutasi = await getMutasiBCA(accountNumber, startDate, endDate);
        res.status(200).json(dataMutasi);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Menyajikan index.html saat mengakses root URL
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// Memulai server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
