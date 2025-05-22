const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // para parsear JSON en POST

// === CONFIGURACIÓN / CREDENCIALES ===
const client_id = "81188330-c768-46fe-a378-ff3ac9e88824";
const merchant_id = "200284";
const terminal_id = "1";
const integrator_id = "31";
const secret_key = "A11103402525120190822HB01";

// === FUNCIÓN DE CIFRADO AES ECB ===
function aesEncrypt(text, key) {
  const keyHash = crypto.createHash('sha256').update(key, 'utf8').digest().slice(0, 16);
  const cipher = crypto.createCipheriv('aes-128-ecb', keyHash, null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

// === RUTA PRINCIPAL ===
app.post('/verificar', async (req, res) => {
  try {
    const { origen, destino, referencia, monto, fecha } = req.body;

    // Cifrar los teléfonos
    const encrypted_origen = aesEncrypt(origen, secret_key);
    const encrypted_destino = aesEncrypt(destino, secret_key);

    // Construir el payload
    const payload = {
      merchant_identify: {
        integratorId: integrator_id,
        merchantId: merchant_id,
        terminalId: terminal_id,
      },
      client_identify: {
        ipaddress: "127.0.0.1",
        browser_agent: "NodeServer/1.0",
        mobile: {
          manufacturer: "Generic",
          model: "Server",
          os_version: "NodeJS",
          location: { lat: 0, lng: 0 }
        }
      },
      search_by: {
        amount: monto,
        currency: "ves",
        origin_mobile_number: encrypted_origen,
        destination_mobile_number: encrypted_destino,
        payment_reference: referencia,
        trx_date: fecha
      }
    };

    // Enviar a la API de Mercantil
    const response = await axios.post(
      "https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/mobile-payment/search",
      payload,
      {
        headers: {
          "X-IBM-Client-Id": client_id,
          "Content-Type": "application/json"
        }
      }
    );

    const data = response.data;
    const transactions = data.transaction_list || [];

    if (transactions.length > 0) {
      const t = transactions[0];
      res.json({
        mensaje: "✅ ¡Pago encontrado!",
        fecha: t.trx_date,
        monto: t.amount,
        referencia: t.payment_reference,
        metodo: t.payment_method,
        tipo: t.trx_type
      });
    } else {
      res.status(404).json({ mensaje: "❌ No se encontró ninguna transacción con esa referencia." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "❌ Error en la validación del pago", detalle: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
