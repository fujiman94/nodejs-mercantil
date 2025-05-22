const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { createHash } = require('crypto');
const bodyParser = require('body-parser');
const { Buffer } = require('buffer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Función de padding PKCS5 + cifrado AES-ECB
function aesEncrypt(text, key) {
  const hash = createHash('sha256').update(key, 'utf-8').digest().slice(0, 16);
  const cipher = crypto.createCipheriv('aes-128-ecb', hash, null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

app.post('/', async (req, res) => {
  const { origen, destino, referencia, monto, fecha } = req.body;

  const client_id = "81188330-c768-46fe-a378-ff3ac9e88824";
  const merchant_id = "200284";
  const terminal_id = "1";
  const integrator_id = "31";
  const secret_key = "A11103402525120190822HB01";

  const encrypted_origen = aesEncrypt(origen, secret_key);
  const encrypted_destino = aesEncrypt(destino, secret_key);

  const payload = {
    merchant_identify: {
      integratorId: integrator_id,
      merchantId: merchant_id,
      terminalId: terminal_id,
    },
    client_identify: {
      ipaddress: "127.0.0.1",
      browser_agent: "NodeScript/1.0",
      mobile: {
        manufacturer: "Generic",
        model: "Server",
        os_version: "Linux",
        location: {
          lat: 0,
          lng: 0,
        },
      },
    },
    search_by: {
      amount: monto,
      currency: "ves",
      origin_mobile_number: encrypted_origen,
      destination_mobile_number: encrypted_destino,
      payment_reference: referencia,
      trx_date: fecha,
    },
  };

  const headers = {
    "X-IBM-Client-Id": client_id,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(
      "https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/mobile-payment/search",
      payload,
      { headers }
    );

    if (response.data.transaction_list && response.data.transaction_list.length > 0) {
      const t = response.data.transaction_list[0];
      res.json({
        status: "ok",
        fecha: t.trx_date,
        monto: t.amount,
        referencia: t.payment_reference,
        metodo: t.payment_method,
        tipo: t.trx_type,
      });
    } else {
      res.json({ status: "no_encontrado", detalle: "No se encontró la transacción" });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      mensaje: "Error al conectar con Mercantil",
      detalles: error.response?.data || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
