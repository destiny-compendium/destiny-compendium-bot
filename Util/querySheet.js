const google = require("googleapis");

async function querySheet(sheets, sheetId, range, pattern) {
    console.log("in the func");
    const res = await sheets.spreadsheets.values.get({
        sheetId,
        range,
        majorDimension: "ROWS",
    });

    const values = res.data.values;

    console.log(values);

    if (!Array.isArray(values) || values.length === 0) {
        return []; // no data or sheet is empty
    }

    const [headers, ...rows] = values;
    const regex = new RegExp(pattern, 'i');  // case-insensitive partial match

    console.log(rows);

    return rows
        .filter(row => row.some(cell => regex.test(cell || '')))
        .map(row => headers.reduce((o, h, i) => ({ ...o, [h]: row[i] || '' }), {}));
}