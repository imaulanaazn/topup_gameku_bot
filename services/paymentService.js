const { BASE_URL } = require("../config/config");

async function getPaymentMethods() {
  try {
    const req = await fetch(
      `${BASE_URL}/v1/payments-method?query=9&type=payment`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-cache",
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      }
    );

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(
        response.message || "Tidak dapat mengambil metode pembayaran"
      );
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = { getPaymentMethods };
