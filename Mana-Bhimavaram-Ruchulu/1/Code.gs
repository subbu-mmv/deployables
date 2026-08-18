function doGet(e) {
  var data = getGroupedProducts(); // Your existing function that fetches sheet rows
  
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

