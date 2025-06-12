const {
  BASE_URL,
  TV_BASE_URL,
  TV_MEMBER_CODE,
  TV_SECRET_KEY,
} = require("../config/config");
const crypto = require("crypto");

async function createOrderProduct(dataCheckout) {
  try {
    const req = await fetch(BASE_URL + "/v3/order", {
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      method: "POST",
      body: JSON.stringify(dataCheckout),
    });

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(
        response.message || "Gagal membuat order, silahkan coba lagi"
      );
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getInvoiceDetail(invoiceId) {
  try {
    const req = await fetch(BASE_URL + "/v2/order-detail/" + invoiceId, {
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      method: "GET",
    });

    const response = await req.json();

    if (response.errorCode) {
      throw new Error(
        response.message ||
          "Gagal mendapatkan detail invoice, silahkan coba lagi"
      );
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function orderHistory(ctx, telegramId) {
  const cookies = ctx.session.cookies;
  try {
    const req = await fetch(
      `${BASE_URL}/v1/order-history?telegramId=${telegramId}&limit=50`,
      {
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "ngrok-skip-browser-warning": "true",
          Cookie: cookies,
        },
        credentials: "include",
        cache: "no-cache",
        method: "GET",
      }
    );

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(response.message || "Gagal mendapatkan order history");
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getAllOrders(ctx) {
  const cookies = ctx.session.cookies;
  try {
    const req = await fetch(`${BASE_URL}/v1/orders?limit=100`, {
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "ngrok-skip-browser-warning": "true",
        Cookie: cookies,
      },
      credentials: "include",
      cache: "no-cache",
      method: "GET",
    });

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(response.message || "Gagal mendapatkan daftar transaksi");
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateStatusTV(invoiceId) {
  try {
    const req = await fetch(`${BASE_URL}/v1/order-status/${invoiceId}`, {
      headers: {
        "content-type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      method: "GET",
    });

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(
        response.message || "Gagal mendapatkan mengupdate status transaksi"
      );
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = {
  createOrderProduct,
  getInvoiceDetail,
  getAllOrders,
  updateStatusTV,
  orderHistory,
};
