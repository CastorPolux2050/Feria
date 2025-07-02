// ⚠️ ¡IMPORTANTE! Pega aquí la URL de tu aplicación web de Google Apps Script.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxW-rYHx77BrMRRrrqGASm5xS2q8aGBaQOA2jmbRFM/dev';

// Espera a que todo el contenido del HTML se cargue antes de ejecutar el script.
document.addEventListener('DOMContentLoaded', () => {
    const productosContainer = document.getElementById('productos-container');

    // Función para cargar los productos desde Google Sheets.
    async function cargarProductos() {
        // Muestra un mensaje de carga mientras se obtienen los datos.
        productosContainer.innerHTML = '<p>Cargando productos...</p>';

        try {
            const response = await fetch(SCRIPT_URL);
            const data = await response.json();

            // Limpia el contenedor.
            productosContainer.innerHTML = '';

            if (data.success && data.productos.length > 0) {
                // Si hay productos, los muestra uno por uno.
                data.productos.forEach(producto => {
                    // Crea el HTML para cada tarjeta de producto.
                    const productoCard = `
                        <div class="producto-card">
                            <h3>${producto.nombre}</h3>
                            <p>${producto.descripcion}</p>
                            <p class="precio">$${producto.precio.toLocaleString('es-AR')}</p>
                            <span class="codigo">Código: ${producto.codigo}</span>
                        </div>
                    `;
                    // Agrega la tarjeta al contenedor.
                    productosContainer.innerHTML += productoCard;
                });
            } else if (data.success) {
                // Si no hay productos disponibles.
                productosContainer.innerHTML = '<p>No hay productos disponibles en este momento.</p>';
            } else {
                // Si el script de Google devuelve un error.
                console.error('Error del script:', data.message);
                productosContainer.innerHTML = '<p>No se pudieron cargar los productos. Intenta de nuevo más tarde.</p>';
            }
        } catch (error) {
            // Si hay un error de red o de conexión.
            console.error('Error al contactar el script:', error);
            productosContainer.innerHTML = '<p>Error de conexión. Revisa la consola para más detalles.</p>';
        }
    }

    // Llama a la función para que se ejecute al cargar la página.
    cargarProductos();
});
