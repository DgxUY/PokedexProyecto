// ------------------------------------
// Elementos del DOM
// ------------------------------------
const resultadoPokemon = document.getElementById("resultado-pokemon");
const buscarPokemon = document.getElementById("buscar-pokemon-button");
const inputPokemon = document.getElementById("pokemon-input");
const tiposFilter = document.querySelectorAll(".type-img");
const regionFilter = document.querySelectorAll(".btn-region");
const loader = document.querySelector(".loader-wrapper");
const btnFavoritos = document.getElementsByClassName("btn-favoritos")[0];
const cargarMasLeft = document.getElementsByClassName("cargar-mas-btn-left")[0];
const cargarMasRight = document.getElementsByClassName("cargar-mas-btn-right")[0];
let pokemonActual = 1;



// ------------------------------------
// Variables globales
// ------------------------------------
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];
let listaNombres = [];
console.log(favoritos)
// ------------------------------------
// Funciones auxiliares
// ------------------------------------
function toggleLoader(mostrar) {
  loader.style.display = mostrar ? "flex" : "none";
}

function isFavoritoImg(id) {
  id = id.toString().padStart(3, "0");
  return favoritos.includes(id) ? "/Icons/star-yellow.svg" : "/Icons/default/star.png";
}

async function renderizarPokemons(pokemons) {
  const cards = await Promise.all(pokemons.map(crearCard));
  resultadoPokemon.innerHTML = cards.join("");
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function limpiarResultado() {
  resultadoPokemon.innerHTML = "";
}

// ------------------------------------
// Funciones de obtención de datos
// ------------------------------------
async function obtenerPokemon(parametro, categoria = "pokemon") {
  const res = await fetch(`https://pokeapi.co/api/v2/${categoria}/${parametro}`);
  return await res.json();
}

async function obtenerListaNombres() {
  const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1300");
  const data = await res.json();
  listaNombres = data.results;
}


async function obtenerDescripcion(id) {
  if(id < 10000){
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    if (!res.ok) throw new Error("No encontrada");
    const data = await res.json();

    const entry = data.flavor_text_entries.find(e => e.language.name === "es");
    return entry ? entry.flavor_text.replace(/\f/g, " ") : "Descripción no disponible.";
  } catch (error) {
    console.warn(`Descripción no disponible para el Pokémon con ID ${id}.`, error);
    return "Descripción no disponible.";
  }
} else {
  return "Descripción no disponible.";
}
}


// ------------------------------------
// Funciones principales
// ------------------------------------
async function toggleFavorite(element) {
  const card = element.closest(".card-container");
  const id = card.querySelector(".pokemon-card-id").textContent.slice(1);

  const index = favoritos.indexOf(id);
  index !== -1 ? favoritos.splice(index, 1) : favoritos.push(id);

  element.querySelector(".favorite-icon").src = isFavoritoImg(id);
  localStorage.setItem("favoritos", JSON.stringify(favoritos));
}

async function mostrarFavoritos() {
  toggleLoader(true);
  limpiarResultado();
  cargarMasLeft.style.display = "none";
  cargarMasRight.style.display = "none";

  try {
    const pokemonIDs = favoritos
      .sort((a, b) => a - b)
      .map(id => parseInt(id, 10)); // quita ceros a la izquierda
      const promesas = pokemonIDs.map(id => obtenerPokemon(id));
      const pokemonData = await Promise.all(promesas);      
      renderizarPokemons(pokemonData);
  } catch (error) {
    console.error("Error al cargar favoritos:", error);
  } finally {
    toggleLoader(false);
  }
}


async function mostrarPokemonsPorRango(inicio, cantidad) {
  toggleLoader(true);
  try {
    const promesas = Array.from({ length: cantidad }, (_, i) => obtenerPokemon(inicio + i));
    const pokemonData = await Promise.all(promesas);
    await renderizarPokemons(pokemonData);

    pokemonActual = inicio + cantidad;
  } catch (error) {
    console.error("Error al cargar pokemons por rango:", error);
  } finally {
    toggleLoader(false);
  }
}


async function filtrarPorTipo(tipo) {
  toggleLoader(true)
  cargarMasLeft.style.display = "none";
  cargarMasRight.style.display = "none";
  try {
    const data = await obtenerPokemon(tipo, "type");
    const nombres = data.pokemon.map((p) => p.pokemon.name);
    const promesas = nombres.map((nombre) => obtenerPokemon(nombre));
    const pokemons = await Promise.all(promesas);
    const pokemonsFiltrados = pokemons.filter(p => p.sprites?.front_default && p.types?.length);
    renderizarPokemons(pokemonsFiltrados);
  } catch (error) {
    console.error("Error al filtrar por tipo:", error);
  } finally {
    toggleLoader(false)
  }
}

async function buscarPorNombre() {
  toggleLoader(true);
  limpiarResultado();
  cargarMasLeft.style.display = "none";
  cargarMasRight.style.display = "none";

  if (!inputPokemon.value) {
    await mostrarPokemonsPorRango(1, 12);
    toggleLoader(false);
    return;
  }

  try {
    const query = inputPokemon.value.toLowerCase();
    const coincidencias = listaNombres.filter(p => p.name.startsWith(query));
    const nombres = coincidencias.map(p => p.name);
    const promesas = nombres.map(nombre => obtenerPokemon(nombre));
    const resultados = await Promise.all(promesas);
    const filtrados = resultados.filter(p => p.sprites?.front_default && p.types?.length);
    await renderizarPokemons(filtrados);
  } catch (error) {
    console.error("Error al buscar por nombre:", error);
  } finally {
    toggleLoader(false);
  }
}


// ------------------------------------
// Event Listeners
// ------------------------------------
tiposFilter.forEach(tipo =>
  tipo.addEventListener("click", () => filtrarPorTipo(tipo.classList[1]))
);

buscarPokemon.addEventListener("click", buscarPorNombre);

btnFavoritos.addEventListener("click", mostrarFavoritos);

regionFilter.forEach(btn =>
  btn.addEventListener("click", () => {
    const inicio = parseInt(btn.dataset.start);
    const fin = parseInt(btn.dataset.end);
    mostrarPokemonsPorRango(inicio, fin - inicio + 1);
  })
);

cargarMasLeft.addEventListener("click", async () => {
  await mostrarPokemonsPorRango(pokemonActual -24, 12);
});
cargarMasRight.addEventListener("click", async () => {
  await mostrarPokemonsPorRango(pokemonActual, 12);
});

// ------------------------------------
// Crear Card HTML
// ------------------------------------

async function crearCard(pokemon) {
  
  const pokemonDescription = await obtenerDescripcion(pokemon.id); 

  const tiposHTML = pokemon.types.map(tipo => `
    <div class="front-info-pokemon-type ${tipo.type.name}">
      <img src="./Icons/${tipo.type.name}.svg" alt="${tipo.type.name}" class="front-info-pokemon-type-img" />
    </div>`).join("");

  return `
    <div class="card-container">
      <div class="card-inner">
        <!-- Frente -->
        <article class="pokemon-card card-front ${pokemon.types[0].type.name}">
          <header class="pokemon-card-header">
            <span class="pokemon-card-id">#${pokemon.id.toString().padStart(3, "0")}</span>
            <div class="favorite-button" onclick="toggleFavorite(this)">
              <img src="${isFavoritoImg(pokemon.id.toString())}" alt="star" class="favorite-icon"/>
            </div>
          </header>
          <div class="front-image-container" onclick="window.location.href='details.html?name=${pokemon.name}'">
            <img src="./Icons/default/pokeball.svg" alt="pokeball-svg" class="front-image-container-svg" />
            <img src="${pokemon.sprites.front_default}" alt="imagen no disponible" class="front-image-container-pokemon-img" />
          </div>
          <div class="front-info">
            <h2 class="front-info-pokemon-name">${capitalizar(pokemon.name)}</h2>
            <div class="front-info-pokemon-types">${tiposHTML}</div>
          </div>
          <div class="front-details">
            <p class="front-details-text">Altura: ${pokemon.height / 10} m</p>
            <p class="front-details-text">Peso: ${pokemon.weight / 10} kg</p>
          </div>
        </article>

        <!-- Reverso -->
        <article class="pokemon-card card-back ${pokemon.types[0].type.name}"  >
          <header class="pokemon-card-header">
            <span class="pokemon-card-id">#${pokemon.id.toString().padStart(3, "0")}</span>
            <div class="favorite-button" onclick="toggleFavorite(this)">
              <img src="${isFavoritoImg(pokemon.id.toString())}" alt="star" class="favorite-icon"/>
            </div>
          </header>
          <div class="front-image-container" onclick="window.location.href='details.html?name=${pokemon.name}'">
            <img src="./Icons/default/pokeball.svg" alt="pokeball-svg" class="front-image-container-svg" />
            <img src="${pokemon.sprites.back_default}" alt="${pokemon.name}" class="front-image-container-pokemon-img" />
          </div>
          <div class="back-details">
            <p class="description-text">${pokemonDescription}</p>
          </div>
        </article>
      </div>
    </div>
  `;
}


// ------------------------------------
// Inicialización
// ------------------------------------
(async function iniciarApp() {
  await obtenerListaNombres();
  await mostrarPokemonsPorRango(1, 12);
})();
