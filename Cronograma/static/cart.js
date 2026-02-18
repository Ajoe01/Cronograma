console.log("Carrito cargado");
console.log("Carrito cargado");

function agregarAlCarrito(id, nombre, precio) {
    const cantidad = parseInt(document.getElementById(`cantidad-${id}`).value);

    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    carrito.push({
        nombre: nombre,
        precio: precio,
        cantidad: cantidad
    });

    localStorage.setItem("carrito", JSON.stringify(carrito));

    mostrarMensaje(`${nombre} agregado al carrito ✅`);
}

function mostrarMensaje(texto) {
    const msg = document.createElement("div");
    msg.textContent = texto;
    msg.style.position = "fixed";
    msg.style.bottom = "20px";
    msg.style.right = "20px";
    msg.style.background = "#ff4d6d";
    msg.style.color = "white";
    msg.style.padding = "12px 18px";
    msg.style.borderRadius = "8px";
    msg.style.zIndex = "9999";
    msg.style.fontWeight = "bold";

    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 1800);
}
function incrementar(id) {
    const input = document.getElementById(`cantidad-${id}`);
    input.value = parseInt(input.value) + 1;
}

function decrementar(id) {
    const input = document.getElementById(`cantidad-${id}`);
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}