function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Products");
  const data = sheet.getDataRange().getValues();
  
  // Skip header row
  const rows = data.slice(1);
  const productsMap = {};

  rows.forEach(row => {
    const [name, image, qty, price] = row;
    if (!name) return;

    if (!productsMap[name]) {
      productsMap[name] = {
        name: name,
        image: image,
        variants: []
      };
    }

    productsMap[name].variants.push({
      qty: qty,
      price: Number(price)
    });
  });

  const result = Object.values(productsMap);

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

