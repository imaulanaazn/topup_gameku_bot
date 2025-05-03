module.exports = {
  createGamesInlineKeyboard: (
    gamesList,
    page,
    gamesPerPage,
    totalPages,
    query
  ) => {
    const startIndex = page * gamesPerPage;
    const endIndex = startIndex + gamesPerPage;
    const gamesToDisplay = gamesList.slice(startIndex, endIndex);

    let inline_keyboard = gamesToDisplay.reduce((acc, curr, index) => {
      if (index % 2 === 0) {
        acc.push([]);
      }
      acc[acc.length - 1].push({
        text: curr.name,
        callback_data: `gameDetailsCb:${curr.slug}`,
      });
      return acc;
    }, []);

    // Add navigation buttons
    if (page > 0) {
      inline_keyboard.push(
        query
          ? [{ text: "<< Sebelumnya", callback_data: `prevGameList:${query}` }]
          : [{ text: "<< Sebelumnya", callback_data: `prevGameList` }]
      );
    }
    if (page < totalPages - 1) {
      inline_keyboard.push(
        query
          ? [{ text: "Selanjutnya >>", callback_data: `nextGameList:${query}` }]
          : [{ text: "Selanjutnya >>", callback_data: `nextGameList` }]
      );
    }

    return inline_keyboard;
  },

  createTransactionHistoryRes: (trxList, page, trxPerPage, totalPages) => {
    const startIndex = page * trxPerPage;
    const endIndex = startIndex + trxPerPage;
    const trxToDisplay = trxList.slice(startIndex, endIndex);

    let inline_keyboard = [];

    // Add navigation buttons
    if (page > 0) {
      inline_keyboard.push([
        { text: "<< Sebelumnya", callback_data: `prevTrxList` },
      ]);
    }
    if (page < totalPages - 1) {
      inline_keyboard.push([
        { text: "Selanjutnya >>", callback_data: `nextTrxList` },
      ]);
    }

    return { inline_keyboard, trxToDisplay };
  },
};
