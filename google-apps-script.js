/**
 * Google Apps Script para Sistema de Ventas Feria ARIAS
 * Optimizado para máximo rendimiento y confiabilidad
 */

// Configuración
const SHEET_ID = '1KZ9mAt_uTDWQ6H9GmDC810Hbm9o7pOn7YPWCLJQW-Co';

/**
 * doGet - Obtener productos disponibles (no vendidos)
 * Optimizado con batch processing
 */
function doGet(e) {
  const startTime = new Date().getTime();
  
  try {
    console.log('📖 Iniciando lectura de productos...');
    
    // Abrir spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getActiveSheet();
    
    // Batch read - obtener TODOS los datos de una vez
    const allData = sheet.getDataRange().getValues();
    console.log(`📊 Datos obtenidos: ${allData.length} filas`);
    
    const productos = [];
    let productosVendidos = 0;
    
    // Procesar en memoria (mucho más rápido)
    for (let i = 1; i < allData.length; i++) { // Saltar header (fila 0)
      const row = allData[i];
      
      // Validar que la fila tenga datos suficientes
      if (row.length >= 6) {
        // Extraer y limpiar datos
        const tipo = String(row[0] || '').trim();
        const nombre = String(row[1] || '').trim();
        const descripcion = String(row[2] || '').trim();
        const precioStr = String(row[3] || '').replace(/[^0-9]/g, ''); // Solo números
        const rubro = String(row[4] || '').trim();
        const codigo = String(row[5] || '').trim();
        const fechaVenta = String(row[6] || '').trim(); // Columna G
        
        const precio = parseInt(precioStr) || 0;
        
        // Contar vendidos para estadísticas
        if (fechaVenta) {
          productosVendidos++;
        }
        
        // Solo incluir productos NO vendidos con datos válidos
        if (codigo && precio > 0 && !fechaVenta) {
          productos.push({
            codigo: codigo.toUpperCase(),
            nombre: nombre,
            descripcion: descripcion,
            precio: precio,
            tipo: tipo,
            rubro: rubro,
            fila: i + 1 // Guardar número de fila para updates rápidos
          });
        }
      }
    }
    
    const endTime = new Date().getTime();
    const processingTime = endTime - startTime;
    
    console.log(`✅ Procesamiento completado en ${processingTime}ms`);
    console.log(`📦 Productos disponibles: ${productos.length}`);
    console.log(`💰 Productos vendidos: ${productosVendidos}`);
    
    // Respuesta optimizada
    const response = {
      success: true,
      productos: productos,
      estadisticas: {
        disponibles: productos.length,
        vendidos: productosVendidos,
        total: productos.length + productosVendidos,
        tiempoProcesamiento: processingTime
      },
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ Error en doGet:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: `Error al cargar productos: ${error.toString()}`,
        productos: [],
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * doPost - Procesar venta y actualizar sheets INMEDIATAMENTE
 * Optimizado para escritura instantánea con flush forzado
 */
function doPost(e) {
  const startTime = new Date().getTime();
  
  try {
    console.log('💳 Procesando venta...');
    
    // Parsear datos de venta
    const ventaData = JSON.parse(e.postData.contents);
    const productosVenta = ventaData.productos;
    
    if (!productosVenta || productosVenta.length === 0) {
      throw new Error('No se recibieron productos para procesar');
    }
    
    console.log(`🛒 Productos a procesar: ${productosVenta.length}`);
    
    // Abrir spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getActiveSheet();
    
    // Batch read para encontrar filas rápidamente
    const allData = sheet.getDataRange().getValues();
    let productosActualizados = 0;
    
    // Procesar cada producto de la venta
    productosVenta.forEach((productoVenta, index) => {
      const codigo = productoVenta.codigo.toUpperCase().trim();
      const fechaHora = productoVenta.fechaHora;
      const medio = productoVenta.medio;
      
      console.log(`🔍 Procesando ${index + 1}/${productosVenta.length}: ${codigo}`);
      
      // Buscar producto en los datos
      for (let i = 1; i < allData.length; i++) {
        const codigoSheet = String(allData[i][5]).toUpperCase().trim();
        
        if (codigoSheet === codigo) {
          const rowNumber = i + 1; // Apps Script usa base 1
          
          // Verificar que no esté ya vendido
          const fechaVentaActual = String(allData[i][6] || '').trim();
          if (fechaVentaActual) {
            console.warn(`⚠️ Producto ${codigo} ya estaba vendido`);
            break;
          }
          
          try {
            // ACTUALIZACIÓN INMEDIATA
            sheet.getRange(rowNumber, 7).setValue(fechaHora);  // Columna G
            sheet.getRange(rowNumber, 8).setValue(medio);      // Columna H
            
            // FORZAR ESCRITURA INMEDIATA
            SpreadsheetApp.flush();
            
            console.log(`✅ ${codigo} actualizado en fila ${rowNumber}`);
            productosActualizados++;
            
            // Actualizar array local para evitar duplicados en la misma transacción
            allData[i][6] = fechaHora;
            allData[i][7] = medio;
            
          } catch (updateError) {
            console.error(`❌ Error actualizando ${codigo}:`, updateError);
          }
          
          break; // Salir del loop una vez encontrado
        }
      }
    });
    
    const endTime = new Date().getTime();
    const processingTime = endTime - startTime;
    
    console.log(`🎉 Venta completada en ${processingTime}ms`);
    console.log(`📊 Productos actualizados: ${productosActualizados}/${productosVenta.length}`);
    
    // Respuesta de éxito
    const response = {
      success: true,
      message: 'Venta procesada correctamente',
      detalles: {
        productosRecibidos: productosVenta.length,
        productosActualizados: productosActualizados,
        tiempoProcesamiento: processingTime
      },
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ Error en doPost:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: `Error procesando venta: ${error.toString()}`,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Función de prueba integrada
 * Ejecutar para verificar funcionamiento completo
 */
function testCompleto() {
  console.log('🧪 === PRUEBA COMPLETA INICIADA ===');
  
  try {
    // Test 1: Leer productos
    console.log('\n📖 Test 1: Lectura de productos');
    const getResult = doGet();
    const getData = JSON.parse(getResult.getContent());
    
    if (getData.success) {
      console.log(`✅ Lectura exitosa: ${getData.productos.length} productos`);
      console.log(`📊 Estadísticas: ${JSON.stringify(getData.estadisticas)}`);
      
      // Mostrar algunos productos de ejemplo
      if (getData.productos.length > 0) {
        console.log('📦 Primeros 5 productos:');
        getData.productos.slice(0, 5).forEach(p => {
          console.log(`  - ${p.codigo}: ${p.nombre} (${p.precio})`);
        });
      }
    } else {
      console.error('❌ Error en lectura:', getData.message);
      return;
    }
    
    // Test 2: Procesar venta (usando primer producto disponible)
    if (getData.productos.length > 0) {
      console.log('\n💳 Test 2: Procesamiento de venta');
      
      const productoTest = getData.productos[0];
      const testVenta = {
        postData: {
          contents: JSON.stringify({
            productos: [{
              codigo: productoTest.codigo,
              fechaHora: Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm'),
              medio: 'Test'
            }],
            total: productoTest.precio
          })
        }
      };
      
      const postResult = doPost(testVenta);
      const postData = JSON.parse(postResult.getContent());
      
      if (postData.success) {
        console.log(`✅ Venta exitosa: ${JSON.stringify(postData.detalles)}`);
        console.log(`⚠️ NOTA: El producto ${productoTest.codigo} ahora está marcado como vendido`);
      } else {
        console.error('❌ Error en venta:', postData.message);
      }
    }
    
    console.log('\n🎉 === PRUEBA COMPLETA FINALIZADA ===');
    console.log('💡 Tip: Si todo funcionó, ya puedes usar la aplicación web');
    
  } catch (error) {
    console.error('❌ Error en prueba completa:', error);
  }
}

/**
 * Función de diagnóstico
 * Útil para debugging
 */
function diagnosticar() {
  console.log('🔍 === DIAGNÓSTICO DEL SISTEMA ===');
  
  try {
    // Verificar acceso al spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    console.log(`✅ Spreadsheet accesible: ${spreadsheet.getName()}`);
    
    const sheet = spreadsheet.getActiveSheet();
    console.log(`✅ Hoja activa: ${sheet.getName()}`);
    
    // Verificar estructura
    const headers = sheet.getRange(1, 1, 1, 8).getValues()[0];
    console.log('📋 Headers encontrados:', headers);
    
    // Verificar datos
    const totalRows = sheet.getLastRow();
    console.log(`📊 Total de filas: ${totalRows}`);
    
    if (totalRows > 1) {
      // Mostrar primera fila de datos
      const firstDataRow = sheet.getRange(2, 1, 1, 8).getValues()[0];
      console.log('📝 Primera fila de datos:', firstDataRow);
      
      // Mostrar última fila de datos
      const lastDataRow = sheet.getRange(totalRows, 1, 1, 8).getValues()[0];
      console.log('📝 Última fila de datos:', lastDataRow);
    }
    
    console.log('\n✅ Diagnóstico completado. El sistema parece estar funcionando correctamente.');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    console.log('💡 Posibles soluciones:');
    console.log('  - Verificar que el SHEET_ID sea correcto');
    console.log('  - Verificar permisos de acceso al spreadsheet');
    console.log('  - Verificar que el spreadsheet exista y sea accesible');
  }
}
