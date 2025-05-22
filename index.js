const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://api.github.com');
    res.json({ message: 'Todo ok', data: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Error llamando a GitHub' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
