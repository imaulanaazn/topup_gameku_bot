const { BASE_URL } = require("../config/config");

async function getAvailGames(query) {
  try {
    const req = await fetch(
      `${BASE_URL}/v1/games${query ? "?search=" + query : ""}`,
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
      throw new Error(response.message || "Tidak dapat menemukan games");
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getAllGames(ctx, query) {
  const cookies = ctx.session.cookies;
  try {
    const req = await fetch(
      `${BASE_URL}/v1/game?limit=${300}${query ? "&name=" + query : ""}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-cache",
        headers: {
          "ngrok-skip-browser-warning": "true",
          Cookie: cookies,
        },
      }
    );

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(response.message || "Tidak dapat menemukan games");
    }

    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getGameDetails(slug) {
  try {
    const req = await fetch(`${BASE_URL}/v1/game-detail?slug=${slug}`, {
      method: "GET",
      credentials: "include",
      cache: "no-cache",
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    const response = await req.json();
    if (response.errorCode) {
      throw new Error(response.message || "Gagal mendapatkan detail game");
    }
    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = { getAvailGames, getGameDetails, getAllGames };
