const SHEET_ID = '1KZ9mAt_uTDWQ6H9GmDC810Hbm9o7pOn7YPWCLJQW-Co';

function doGet(e) {
  try {
    console.log('📖 Iniciando lectura de productos...');
    
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getActiveSheet();
    const allData = sheet.getDataRange().getValues();
    
    console.log('📊 Datos obtenidos:', allData.length, 'filas');
    
    const productos = [];
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      
      if (row.length >= 6) {
        const tipo = String(row[0] || '').trim();
        const nombre = String(row[1] || '').trim();
        const descripcion = String(row[2] || '').trim();
        const precioStr = String(row[3] || '').replace(/[^0-9]/g, '');
        const rubro = String(row[4] || '').trim();
        const codigo = String(row[5] || '').trim();
        const fechaVenta = String(row[6] || '').trim();
        
        const precio = parseInt(precioStr) || 0;
        
        if (codigo && precio > 0 && !fechaVenta) {
          productos.push({
            codigo: codigo.toUpperCase(),
            nombre: nombre,
            descripcion: descripcion,
            precio: precio,
            tipo: tipo,
            rubro: rubro
          });
        }
      }
    }
    
    console.log('✅ Productos disponibles:', productos.length);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        productos: productos
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ Error en doGet:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.toString(),
        productos: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    console.log('💳 Procesando venta...');
    
    const ventaData = JSON.parse(e.postData.contents);
    const productosVenta = ventaData.productos;
    
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getActiveSheet();
    const allData = sheet.getDataRange().getValues();
    
    let productosActualizados = 0;
    
    productosVenta.forEach(productoVenta => {
      const codigo = productoVenta.codigo.toUpperCase().trim();
      const fechaHora = productoVenta.fechaHora;
      const medio = productoVenta.medio;
      
      for (let i = 1; i < allData.length; i++) {
        const codigoSheet = String(allData[i][5]).toUpperCase().trim();
        
        if (codigoSheet === codigo) {
          const rowNumber = i + 1;
          
          sheet.getRange(rowNumber, 7).setValue(fechaHora);
          sheet.getRange(rowNumber, 8).setValue(medio);
          SpreadsheetApp.flush();
          
          console.log('✅', codigo, 'actualizado en fila', rowNumber);
          productosActualizados++;
          break;
        }
      }
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Venta procesada correctamente',
        productosActualizados: productosActualizados
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ Error en doPost:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function testScript() {
  console.log('🧪 Probando doGet:');
  const getResult = doGet();
  console.log(getResult.getContent());
}
