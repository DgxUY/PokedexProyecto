const detallePokemonContainer = document.getElementById("detalle-pokemon-container");
const header = document.getElementById("header");
const body = document.getElementById("body");
const loader = document.querySelector(".loader-wrapper");
const btnMovimientos = document.getElementById("movimientos");
const btnCadena = document.getElementById("cadena");
const btnEstadisticas = document.getElementById("estadisticas");
const id = new URLSearchParams(window.location.search).get('name');

let pokemonActual = null;
let habilidades = [];
let movimientos = [];
let cadenaEvolutiva = [];

// FUNCIONES AUXILIARES
function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerNombreTraducido(lista, idioma, valorPredeterminado) {
  const item = lista.find(item => item.language.name === idioma);
  return item ? item.name : valorPredeterminado;
}

function toggleLoader(mostrar) {
  loader.style.display = mostrar ? "flex" : "none";
}

// FUNCIONES DE FETCHING
async function obtenerPokemon(id) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  return await res.json();
}

async function obtenerEspecie(id) {
  let nombreParaEspecie = id.split('-')[0];
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${nombreParaEspecie}`);
  const data = await res.json();
  const descripcion = data.flavor_text_entries.find(e => e.language.name === "es");

  return {
    texto: descripcion ? descripcion.flavor_text.replace(/\f/g, " ") : "Descripción no disponible.",
    cadenaUrl: data.evolution_chain.url
  };
}

async function obtenerHabilidad(nombre) {
  const res = await fetch(`https://pokeapi.co/api/v2/ability/${nombre}`);
  const data = await res.json();
  const traduccion = data.names.find(n => n.language.name === "es");
  return traduccion ? traduccion.name : nombre;
}

async function obtenerMovimiento(nombre) {
  const res = await fetch(`https://pokeapi.co/api/v2/move/${nombre}`);
  const data = await res.json();

  const tipoRes = await fetch(data.type.url);
  const tipoData = await tipoRes.json();

  const claseRes = await fetch(data.damage_class.url);
  const claseData = await claseRes.json();

  return {
    nombreEsp: obtenerNombreTraducido(data.names, "es", nombre),
    nombreIng: obtenerNombreTraducido(data.names, "en", nombre),
    tipoEsp: obtenerNombreTraducido(tipoData.names, "es", data.type.name),
    tipoIng: obtenerNombreTraducido(tipoData.names, "en", data.type.name),
    claseEsp: obtenerNombreTraducido(claseData.names, "es", data.damage_class.name),
    claseIng: obtenerNombreTraducido(claseData.names, "en", data.damage_class.name)
  };
}

async function obtenerCadenaEvolutiva(url) {
  const res = await fetch(url);
  const data = await res.json();
  const cadena = [];

  function recorrerEvolucion(nodo) {
    const nombre = nodo.species.name;
    const id = nodo.species.url.split("/").filter(Boolean).pop();
    cadena.push({ nombre, id });

    if (nodo.evolves_to.length > 0) {
      recorrerEvolucion(nodo.evolves_to[0]);
    }
  }

  recorrerEvolucion(data.chain);
  return cadena;
}

// FUNCIONES DE RENDER
function renderizarStats(stats) {
  const statNames = {
    'hp': 'HP',
    'attack': 'Ataque',
    'defense': 'Defensa',
    'special-attack': 'Atq. Esp.',
    'special-defense': 'Def. Esp.',
    'speed': 'Velocidad'
  };

  const maxStatValue = 255;

  return `
    <div class="pokemon-stats-container">
      ${stats.map(stat => {
        const statName = statNames[stat.stat.name] || capitalizar(stat.stat.name);
        const statValue = stat.base_stat;
        const fillPercentage = Math.min((statValue / maxStatValue) * 100, 100);

        let fillColor = "#d32f2f"; // Rojo por defecto (Muy bajo)
        if (statValue >= 140) fillColor = "#1976d2"; // Azul (Excelente)
        else if (statValue >= 120) fillColor = "#388e3c"; // Verde muy alto
        else if (statValue >= 100) fillColor = "#689f38"; // Verde (Alto)
        else if (statValue >= 75) fillColor = "#fbc02d"; // Amarillo (Normal)
        else if (statValue >= 50) fillColor = "#f57c00"; // Naranja (Bajo)

        return `
          <div class="stat-bar">
            <span class="stat-label">${statName}</span>
            <div class="stat-bar-container">
              <div class="stat-bar-fill" data-stat="${statValue}" style="width: ${fillPercentage}%; background-color: ${fillColor};"></div>
            </div>
            <span class="stat-value">${statValue}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderizarHeader(pokemon, habilidades) {
  header.classList.add(pokemon.types[0].type.name);
  body.classList.add(pokemon.types[0].type.name);

  header.innerHTML = `
    <div class="header-button-left">
      <img class="arrow" src="./Icons/arrowLeft.svg"></img>
    </div>
    <div class="header-button-home">
      <img class="arrow" src="./Icons/home.svg"></img>
    </div>
    <div class="header-button-right">
      <img class="arrow" src="./Icons/arrow.svg"></img>
    </div>
    <h1 class="header-pokemon-name">#${pokemon.id} ${pokemon.name}</h1>
    <div id='detalle-pokemon-header'>
      <img src="./Icons/default/pokeball.svg" alt="pokeball-svg" class="front-image-container-svg" />
      <img class="pokemon-img" src="${pokemon.sprites.other["official-artwork"].front_default}" style="width: 100px;" alt="${pokemon.name}">
    </div>
    <div class="div-habilidades">
      <h3>Habilidades</h3>
      <ul>
        ${habilidades.map(h => `<li class="li-habilidades">${h}</li>`).join("")}
      </ul>
    </div>
  `;

  const buttonLeft = document.getElementsByClassName('header-button-left')[0];
  const buttonRight = document.getElementsByClassName('header-button-right')[0];
  const buttonHome = document.getElementsByClassName("header-button-home")[0];

  if (buttonLeft) {
    buttonLeft.addEventListener('click', function () {
      const previousId = pokemonActual.id - 1;
      if (previousId > 0) {
        cargarPokemon(previousId);
      }
    });
  }

  if (buttonRight) {
    buttonRight.addEventListener('click', function () {
      const nextId = pokemonActual.id + 1;
      cargarPokemon(nextId);
    });
  }

  if (buttonHome) {
    buttonHome.addEventListener('click', function () {
      window.location.href = '/PokedexProyecto';
    });
  }
}

function renderizarMovimientos(movimientos) {
  detallePokemonContainer.innerHTML = `
    <ul class="detalle-pokemon-habilidades-list">
      ${movimientos.map(m => `
        <li class='${m.tipoIng} li-moves'>
          ${m.nombreEsp}
          <img class="tipo-ataque" src="./Icons/${m.tipoIng.toLowerCase()}.svg" alt="${m.tipoIng}">
        </li>
      `).join("")}
    </ul>
  `;
}

async function renderizarCadenaEvolutiva(cadena) {
  try {
    const pokemonesEnCadena = await Promise.all(
      cadena.map(async (p) => {
        const pokemon = await obtenerPokemon(p.id);
        return {
          id: p.id,
          name: capitalizar(p.nombre),
          sprite: pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default
        };
      })
    );

    detallePokemonContainer.innerHTML = `
      ${pokemonesEnCadena.map(p => `
        <div class="evo-container" data-pokemon-id="${p.id}">
          <div class="evo">
            <h2 class="evo-text">${p.name}</h2>
            <img class="evo-img" src="${p.sprite}" alt="${p.name}">
          </div>
        </div>
      `).join(`<img class="arrow" src="./Icons/arrow.svg"></img>`)}
    `;

    document.querySelectorAll('.evo-container').forEach(container => {
      container.addEventListener('click', function () {
        const pokemonId = this.getAttribute('data-pokemon-id');
        cargarPokemon(pokemonId);
      });
    });

  } catch (error) {
    console.error("Error al mostrar la cadena evolutiva:", error);
    detallePokemonContainer.innerHTML = `<p>Error al cargar la cadena evolutiva</p>`;
  }
}

function mostrarStats() {
  if (pokemonActual && pokemonActual.stats) {
    detallePokemonContainer.innerHTML = renderizarStats(pokemonActual.stats);
  } else {
    detallePokemonContainer.innerHTML = `<p>No se pudieron cargar las estadísticas</p>`;
  }
}

function mostrarMovimientos() {
  renderizarMovimientos(movimientos);
}

function mostrarCadena() {
  renderizarCadenaEvolutiva(cadenaEvolutiva);
}

// Funcion para cargar datos del pokemon
async function cargarDatos(pokemonId) {
  toggleLoader(true);
  try {
    const pokemon = await obtenerPokemon(pokemonId);
    if (!pokemon) return;

    pokemonActual = pokemon;

    const { cadenaUrl } = await obtenerEspecie(pokemonId);
    cadenaEvolutiva = await obtenerCadenaEvolutiva(cadenaUrl);

    habilidades = await Promise.all(
      pokemon.abilities.map(h => obtenerHabilidad(h.ability.name))
    );

    movimientos = await Promise.all(
      pokemon.moves.map(m => obtenerMovimiento(m.move.name))
    );

    renderizarHeader(pokemon, habilidades);
    mostrarStats();

  } catch (error) {
    console.error("Error al cargar datos del Pokémon:", error);
    detallePokemonContainer.innerHTML = `<p>Error al cargar los detalles del Pokémon</p>`;
  } finally {
    toggleLoader(false);
  }
}

async function cargarPokemon(pokemonId) {
  const siguientePokemon = await obtenerPokemon(pokemonId);  // Añadir await
  window.location.href = `?name=${siguientePokemon.name}`;
}

function inicializar() {
  btnMovimientos.addEventListener("click", mostrarMovimientos);
  btnCadena.addEventListener("click", mostrarCadena);
  btnEstadisticas.addEventListener("click", mostrarStats);

  const id = new URLSearchParams(window.location.search).get('id');
  const name = new URLSearchParams(window.location.search).get('name');
  const identificador = name || id;
  cargarDatos(identificador);
}

inicializar();
