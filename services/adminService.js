const { BASE_URL } = require("../config/config");

async function checkIsAdmin(ctx) {
  const cookies = ctx.session.cookies;
  try {
    const req = await fetch(`${BASE_URL}/v1/me-admin`, {
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
      throw new Error(
        "Login sebagai admin agar bisa mengakses sumber daya ini"
      );
    }

    return {
      success: true,
      data: response,
      message: "",
    };
  } catch (error) {
    return {
      success: false,
      data: {},
      message: error.message,
    };
  }
}

async function loginAdmin(username, password, ctx) {
  try {
    const req = await fetch(`${BASE_URL}/v1/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(response.message || "Gagal mengautentikasi pengguna");
    }

    ctx.session.cookies = req.headers.getSetCookie().join(";");
    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getOrderAnalytics(startDate, endDate, ctx) {
  const cookies = ctx.session.cookies;
  try {
    const req = await fetch(
      `${BASE_URL}/v2/order-analytics?startAt=${startDate}&endAt=${endDate}`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          "ngrok-skip-browser-warning": "true",
          Cookie: cookies,
        },
      }
    );

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(response.message || "Gagal mendapatkan data analytics");
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getRevenue(startDate, endDate, ctx) {
  const cookies = ctx.session.cookies;
  try {
    const req = await fetch(
      `${BASE_URL}/v1/order-revenue?startAt=${startDate}&endAt=${endDate}`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          "ngrok-skip-browser-warning": "true",
          Cookie: cookies,
        },
      }
    );

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(response.message || "Gagal mendapatakan data revenue");
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function editGame(updateData, ctx) {
  const cookies = ctx.session.cookies;
  try {
    const req = await fetch(`${BASE_URL}/v1/game`, {
      method: "PUT",
      cache: "no-cache",
      credentials: "include",
      headers: {
        "ngrok-skip-browser-warning": "true",
        Cookie: cookies,
      },
      body: updateData,
    });

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(response.message || "Gagal mengupdate data game");
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function downloadImage(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      responseType: "arraybuffer",
    });
    const data = await response.blob();
    return data;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = {
  checkIsAdmin,
  loginAdmin,
  getOrderAnalytics,
  getRevenue,
  editGame,
  downloadImage,
};
