/* =========================================================
   VERDE VIVO / SMARTPLANT
   SCRIPT PRINCIPAL
   Integração com Spring Boot e MySQL
========================================================= */


/* =========================================================
   1. CONFIGURAÇÕES
========================================================= */

const API_URL = "http://localhost:8080/api";
const SESSION_KEY = "smartPlant.session";

let currentSession = null;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const $ = selector => document.querySelector(selector);

let plants = [];
let activePlant = null;
let activePlantReports = [];
let chart = null;
let toastTimer;


/* =========================================================
   2. CONFIGURAÇÃO DOS GRÁFICOS
========================================================= */

const metrics = {
  soil: {
    label: "Umidade do solo",
    field: "umidadeSolo",
    unit: "%",
    color: "#42966a",
    background: "rgba(66, 150, 106, 0.15)"
  },

  temp: {
    label: "Temperatura",
    field: "temperatura",
    unit: " °C",
    color: "#e58b43",
    background: "rgba(229, 139, 67, 0.16)"
  },

  air: {
    label: "Umidade do ar",
    field: "umidadeAr",
    unit: "%",
    color: "#4298c7",
    background: "rgba(66, 152, 199, 0.15)"
  },

  water: {
    label: "Nível de água",
    field: "nivelAgua",
    unit: "%",
    color: "#8270ce",
    background: "rgba(130, 112, 206, 0.15)"
  }
};


/* =========================================================
   3. SESSÃO DO USUÁRIO
========================================================= */

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch (sessionError) {
    console.error("Erro ao recuperar a sessão:", sessionError);
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}


/* =========================================================
   4. COMUNICAÇÃO COM A API
========================================================= */

async function apiRequest(endpoint, options = {}) {

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    const message = await response.text();

    const requestError = new Error(
      message || `Erro HTTP ${response.status}`
    );

    requestError.status = response.status;

    throw requestError;
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  return text ? JSON.parse(text) : null;
}


/* =========================================================
   5. CONVERSÃO DOS DADOS DO BACKEND
========================================================= */

function normalizePlant(data) {

  return {
    id: String(data.id),
    name: data.nomePlanta || "",
    latin: data.especie || "",
    photo: data.url || data.image || "",
    place: "Ambiente não informado",
    device: "",
    soil: null,
    temp: null,
    air: null,
    water: null
  };
}


/* =========================================================
   6. BUSCAR PLANTAS NO BANCO
========================================================= */

async function loadPlantsFromApi() {

  const session = currentSession || readSession();

  if (!session?.id) {
    plants = [];
    renderPlants();

    $("#galleryStatus").textContent =
      "Entre na sua conta para visualizar suas plantas.";

    return false;
  }

  try {

    // Busca somente as plantas vinculadas ao usuário conectado.
    const data = await apiRequest(
      `/plantas/usuario/${encodeURIComponent(session.id)}`
    );

    plants = Array.isArray(data)
      ? data.map(normalizePlant)
      : [];

    renderPlants();

    $("#galleryStatus").textContent =
      `${plants.length} planta(s) cadastrada(s) na sua conta.`;

    return true;

  } catch (error) {

    console.error("Erro ao carregar plantas:", error);

    plants = [];
    renderPlants();

    $("#galleryStatus").textContent =
      "Não foi possível carregar suas plantas.";

    toast("Erro ao carregar as plantas. Verifique o servidor.");

    return false;
  }
}


/* =========================================================
   7. CADASTRAR PLANTA NA API
========================================================= */

async function createPlantApi(plant) {

  const session = currentSession || readSession();

  if (!session?.id) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  const data = await apiRequest("/plantas", {

    method: "POST",

    body: JSON.stringify({

      nomePlanta: plant.name,
      especie: plant.latin,
      url: plant.photo || "",

      usuario: {
        id: session.id
      }

    })

  });

  return normalizePlant(data);
}


/* =========================================================
   8. ATUALIZAR PLANTA NA API
========================================================= */

async function updatePlantApi(plant) {

  const session = currentSession || readSession();

  if (!session?.id) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  const data = await apiRequest(
    `/plantas/${plant.id}`,
    {

      method: "PUT",

      body: JSON.stringify({

        nomePlanta: plant.name,
        especie: plant.latin,
        url: plant.photo || "",

        usuario: {
          id: session.id
        }

      })

    }
  );

  return normalizePlant(data);
}


/* =========================================================
   9. EXCLUIR PLANTA DA API
========================================================= */

async function deletePlantApi(id) {

  return apiRequest(`/plantas/${id}`, {
    method: "DELETE"
  });

}


/* =========================================================
   10. BUSCAR RELATÓRIOS DOS SENSORES
========================================================= */

async function loadReportsFromApi(plantId) {

  try {

    const reports = await apiRequest(
      `/relatorios/planta/${plantId}`
    );

    activePlantReports = Array.isArray(reports)
      ? reports
      : [];

    activePlantReports.sort((a, b) => {
      return new Date(a.dataHora) - new Date(b.dataHora);
    });

    return activePlantReports;

  } catch (error) {

    console.error("Erro ao buscar relatórios:", error);

    activePlantReports = [];

    toast("Não foi possível carregar os sensores.");

    return [];
  }
}


/* =========================================================
   11. ATUALIZAR VALORES DOS SENSORES
========================================================= */

function updateSensorsFromReports(reports) {

  if (!activePlant) return;

  if (!reports || reports.length === 0) {

    activePlant.soil = null;
    activePlant.temp = null;
    activePlant.air = null;
    activePlant.water = null;

    return;
  }

  const latest = reports[reports.length - 1];

  activePlant.soil = latest.umidadeSolo;
  activePlant.temp = latest.temperatura;
  activePlant.air = latest.umidadeAr;
  activePlant.water = latest.nivelAgua;
}


/* =========================================================
   12. FUNÇÕES GERAIS
========================================================= */

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function error(selector, message = "") {

  const element = $(selector);

  if (element) {
    element.textContent = message;
  }
}

function escapeHTML(value) {

  return String(value ?? "").replace(/[&<>"']/g, character => ({

    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"

  })[character]);

}

function showView(id) {

  document.querySelectorAll(".screen, #appView")
    .forEach(element => {
      element.classList.add("hidden");
    });

  const target = $("#" + id);

  if (target) {
    target.classList.remove("hidden");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function toast(message) {

  const element = $("#toast");

  if (!element) return;

  element.textContent = message;

  element.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    element.classList.remove("show");
  }, 2800);
}


/* =========================================================
   13. VALIDAÇÃO DE IMAGENS
========================================================= */

function validateImage(file) {

  if (!file) return null;

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Formato inválido. Envie JPG, PNG ou WEBP.";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "A imagem deve ter no máximo 5 MB.";
  }

  return null;
}


/* =========================================================
   14. COMPRESSÃO DE IMAGENS
========================================================= */

function compressImage(file, maxSize = 1000, quality = 0.78) {

  return new Promise((resolve, reject) => {

    if (!file) {
      reject(new Error("Selecione uma imagem."));
      return;
    }

    const validationError = validateImage(file);

    if (validationError) {
      reject(new Error(validationError));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Não foi possível ler a imagem."));
    };

    reader.onload = () => {

      const image = new Image();

      image.onerror = () => {
        reject(new Error("A imagem selecionada não é válida."));
      };

      image.onload = () => {

        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height)
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(
          1,
          Math.round(image.width * scale)
        );

        canvas.height = Math.max(
          1,
          Math.round(image.height * scale)
        );

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        resolve(
          canvas.toDataURL("image/jpeg", quality)
        );
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);

  });
}


/* =========================================================
   15. PRÉ-VISUALIZAÇÃO DA FOTO
========================================================= */

const newPhotoInput = $("#newPlantPhoto");

if (newPhotoInput) {

  newPhotoInput.addEventListener("change", async () => {

    const preview = $("#newPlantPhotoPreview");
    const previewImage = preview?.querySelector("img");
    const file = newPhotoInput.files?.[0];

    error("#addPlantError");

    if (!file) {
      preview?.classList.add("hidden");
      return;
    }

    const validationError = validateImage(file);

    if (validationError) {

      newPhotoInput.value = "";
      preview?.classList.add("hidden");

      error("#addPlantError", validationError);

      return;
    }

    try {

      const photo = await compressImage(file);

      if (previewImage) {
        previewImage.src = photo;
      }

      preview?.classList.remove("hidden");

    } catch (imageError) {

      newPhotoInput.value = "";
      preview?.classList.add("hidden");

      error("#addPlantError", imageError.message);
    }

  });

}


/* =========================================================
   16. MOSTRAR E OCULTAR SENHAS
========================================================= */

document.querySelectorAll("[data-toggle-password]")
  .forEach(button => {

    button.addEventListener("click", () => {

      const inputId = button.dataset.togglePassword;
      const input = $("#" + inputId);

      if (!input) return;

      const showPassword = input.type === "password";

      input.type = showPassword ? "text" : "password";

      button.setAttribute(
        "aria-label",
        showPassword ? "Ocultar senha" : "Mostrar senha"
      );

      button.setAttribute(
        "aria-pressed",
        String(showPassword)
      );

    });

  });


/* =========================================================
   17. NAVEGAÇÃO ENTRE TELAS
========================================================= */

document.querySelectorAll("[data-view]")
  .forEach(button => {

    button.addEventListener("click", () => {

      const target = button.dataset.view;

      error("#loginError");
      error("#registerError");
      error("#forgotError");

      showView(target);

    });

  });


/* =========================================================
   18. ENTRAR NO SISTEMA
========================================================= */

async function enterApp(account) {

  const session = {
    id: Number(account.id),
    name: account.nome || account.name,
    email: account.email
  };

  if (!session.id || !session.name || !session.email) {
    throw new Error(
      "O servidor não retornou os dados completos do usuário."
    );
  }

  currentSession = session;

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session)
  );

  const userName = $("#userName");

  if (userName) {
    userName.textContent = session.name;
  }

  showView("appView");

  await showGallery();

  toast(`Bem-vindo ao SmartPlant, ${session.name}!`);
}


/* =========================================================
   19. CADASTRO DE USUÁRIO NO SPRING BOOT
========================================================= */

$("#registerForm").addEventListener("submit", async event => {

  event.preventDefault();

  error("#registerError");

  const name = $("#registerName").value.trim();
  const email = $("#registerEmail").value.trim().toLowerCase();
  const password = $("#registerPassword").value;
  const confirm = $("#registerConfirm").value;

  if (name.length < 2) {
    return error("#registerError", "Informe seu nome completo.");
  }

  if (!validEmail(email)) {
    return error("#registerError", "Digite um e-mail válido.");
  }

  if (password.length !== 8) {
    return error(
      "#registerError",
      "A senha deve conter exatamente 8 caracteres."
    );
  }

  if (password !== confirm) {
    return error("#registerError", "As senhas não coincidem.");
  }

  const submitButton = event.submitter;

  if (submitButton) {
    submitButton.disabled = true;
  }

  try {

    const usuario = await apiRequest("/usuarios", {

      method: "POST",

      body: JSON.stringify({
        nome: name,
        email,
        senha: password
      })

    });

    await enterApp(usuario);

    $("#registerForm").reset();

  } catch (registerError) {

    console.error("Erro ao cadastrar usuário:", registerError);

    error(
      "#registerError",
      registerError.status === 409
        ? "Este e-mail já está cadastrado. Faça login."
        : registerError.message ||
          "Não foi possível criar sua conta. Verifique o servidor."
    );

  } finally {

    if (submitButton) {
      submitButton.disabled = false;
    }

  }

});


/* =========================================================
   20. LOGIN PELO SPRING BOOT
========================================================= */

$("#loginForm").addEventListener("submit", async event => {

  event.preventDefault();

  error("#loginError");

  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;

  if (!validEmail(email)) {
    return error("#loginError", "Digite um e-mail válido.");
  }

  if (!password) {
    return error("#loginError", "Digite sua senha.");
  }

  const submitButton = event.submitter;

  if (submitButton) {
    submitButton.disabled = true;
  }

  try {

    const usuario = await apiRequest("/usuarios/login", {

      method: "POST",

      body: JSON.stringify({
        email,
        senha: password
      })

    });

    await enterApp(usuario);

    $("#loginForm").reset();

  } catch (loginError) {

    console.error("Erro ao realizar login:", loginError);

    error(
      "#loginError",
      loginError.message || "E-mail ou senha incorretos."
    );

  } finally {

    if (submitButton) {
      submitButton.disabled = false;
    }

  }

});


/* =========================================================
   21. RECUPERAÇÃO DE SENHA DEMONSTRATIVA
========================================================= */

$("#forgotForm").addEventListener("submit", event => {

  event.preventDefault();

  error("#forgotError");

  const email = $("#forgotEmail").value.trim();

  if (!validEmail(email)) {

    return error(
      "#forgotError",
      "Digite um e-mail válido."
    );
  }

  $("#forgotSuccess").classList.remove("hidden");

});


/* =========================================================
   22. ABRIR GALERIA
========================================================= */

async function showGallery() {

  $("#galleryView").classList.remove("hidden");
  $("#detailView").classList.add("hidden");

  activePlant = null;
  activePlantReports = [];

  closeAddPlantForm();

  $("#galleryStatus").textContent = "Carregando plantas...";

  await loadPlantsFromApi();

}


/* =========================================================
   23. RENDERIZAR PLANTAS
========================================================= */

function renderPlants() {

  const search = $("#plantSearch");
  const grid = $("#plantsGrid");

  if (!search || !grid) return;

  const query = search.value
    .trim()
    .toLocaleLowerCase("pt-BR");

  const filtered = plants.filter(plant => {

    const text = [
      plant.name,
      plant.latin,
      plant.place,
      plant.device
    ].join(" ").toLocaleLowerCase("pt-BR");

    return text.includes(query);

  });

  $("#totalPlants").textContent = plants.length;

  $("#connectedDevices").textContent = plants.filter(
    plant => plant.device && plant.device.trim()
  ).length;

  grid.innerHTML = filtered.map(plant => `

    <article
      class="plant-card"
      data-plant="${escapeHTML(plant.id)}"
      tabindex="0"
    >

      <div class="plant-card-photo">

        ${
          plant.photo
            ? `
              <img
                src="${escapeHTML(plant.photo)}"
                alt="Foto de ${escapeHTML(plant.name)}"
                loading="lazy"
              >
            `
            : `
              <div class="plant-photo-placeholder">
                🌿
              </div>
            `
        }

      </div>

      <div class="plant-card-content">

        <h3>${escapeHTML(plant.name)}</h3>

        <p class="plant-species">
          ${escapeHTML(plant.latin || "Espécie não informada")}
        </p>

        <p class="plant-place">
          ${escapeHTML(plant.place)}
        </p>

        <div class="plant-card-actions">

          <button
            type="button"
            class="plant-details-button"
            data-open="${escapeHTML(plant.id)}"
          >
            Ver detalhes
          </button>

          <button
            type="button"
            class="plant-edit-button"
            data-edit="${escapeHTML(plant.id)}"
            aria-label="Editar planta"
          >
            ✎
          </button>

          <button
            type="button"
            class="plant-delete-button"
            data-delete="${escapeHTML(plant.id)}"
            aria-label="Excluir planta"
          >
            ×
          </button>

        </div>

      </div>

    </article>

  `).join("");

  if (filtered.length === 0) {

    grid.innerHTML = `

      <div class="empty-state">

        <h3>Nenhuma planta encontrada</h3>

        <p>Experimente outro nome ou cadastre uma nova planta.</p>

      </div>

    `;
  }

  $("#galleryStatus").textContent =
    `${filtered.length} planta(s) encontrada(s).`;
}


/* =========================================================
   24. PESQUISA E ATUALIZAÇÃO DA GALERIA
========================================================= */

$("#plantSearch").addEventListener("input", renderPlants);

$("#refreshGallery").addEventListener("click", async () => {

  $("#plantSearch").value = "";

  await loadPlantsFromApi();

  toast("Galeria atualizada.");

});


/* =========================================================
   25. FORMULÁRIO DE ADICIONAR PLANTA
========================================================= */

function openAddPlantForm() {

  const container = $("#addPlantFormContainer");
  const button = $("#openAddPlantForm");

  if (!container || !button) return;

  container.classList.remove("hidden");
  button.classList.add("hidden");

  button.setAttribute("aria-expanded", "true");

  error("#addPlantError");

  container.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  $("#newPlantName").focus();

}

function closeAddPlantForm() {

  const container = $("#addPlantFormContainer");
  const button = $("#openAddPlantForm");

  if (!container || !button) return;

  container.classList.add("hidden");
  button.classList.remove("hidden");

  button.setAttribute("aria-expanded", "false");

}

$("#openAddPlantForm").addEventListener(
  "click",
  openAddPlantForm
);

$("#cancelAddPlant").addEventListener("click", () => {

  $("#addPlantForm").reset();

  $("#newPlantPhotoPreview").classList.add("hidden");

  error("#addPlantError");

  closeAddPlantForm();

});


/* =========================================================
   26. CADASTRAR NOVA PLANTA
========================================================= */

$("#addPlantForm").addEventListener("submit", async event => {

  event.preventDefault();

  error("#addPlantError");

  const name = $("#newPlantName").value.trim();
  const latin = $("#newPlantLatin").value.trim();

  const photoFile = $("#newPlantPhoto").files?.[0] || null;

  if (name.length < 2) {

    return error(
      "#addPlantError",
      "Digite um nome válido para a planta."
    );
  }

  if (photoFile) {

    const validationError = validateImage(photoFile);

    if (validationError) {
      return error("#addPlantError", validationError);
    }
  }

  let photo = "";

  if (photoFile) {

    try {
      photo = await compressImage(photoFile);
    } catch (imageError) {
      return error("#addPlantError", imageError.message);
    }
  }

  try {

    const newPlant = await createPlantApi({
      name,
      latin,
      photo
    });

    plants.push(newPlant);

    $("#addPlantForm").reset();

    $("#newPlantPhotoPreview").classList.add("hidden");

    closeAddPlantForm();

    $("#plantSearch").value = "";

    renderPlants();

    toast(`${name} foi cadastrada no banco de dados!`);

  } catch (apiError) {

    console.error("Erro ao cadastrar planta:", apiError);

    error(
      "#addPlantError",
      "Não foi possível cadastrar. Verifique a conexão com o servidor."
    );

  }

});


/* =========================================================
   27. AÇÕES DOS CARDS
========================================================= */

$("#plantsGrid").addEventListener("click", async event => {

  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  const detailsButton = event.target.closest("[data-open]");
  const card = event.target.closest("[data-plant]");

  if (editButton) {

    event.stopPropagation();

    openPlantEditor(editButton.dataset.edit);

    return;
  }

  if (deleteButton) {

    event.stopPropagation();

    const plant = plants.find(
      item => item.id === deleteButton.dataset.delete
    );

    if (!plant) return;

    const confirmed = window.confirm(
      `Tem certeza de que deseja excluir ${plant.name}?`
    );

    if (!confirmed) return;

    try {

      await deletePlantApi(plant.id);

      plants = plants.filter(
        item => item.id !== plant.id
      );

      renderPlants();

      toast(`${plant.name} foi excluída.`);

    } catch (deleteError) {

      console.error(deleteError);

      toast("Não foi possível excluir a planta.");

    }

    return;
  }

  if (detailsButton) {

    await showPlant(detailsButton.dataset.open);

    return;
  }

  if (card && !event.target.closest("button")) {
    await showPlant(card.dataset.plant);
  }

});


$("#plantsGrid").addEventListener("keydown", async event => {

  if (
    (event.key === "Enter" || event.key === " ") &&
    event.target.matches("[data-plant]")
  ) {

    event.preventDefault();

    await showPlant(event.target.dataset.plant);

  }

});


/* =========================================================
   28. MODAL DE EDIÇÃO
========================================================= */

function closePlantModal() {

  const modal = $("#plantEditModal");

  if (modal) {
    modal.remove();
  }

}


async function openPlantEditor(id) {

  const plant = plants.find(item => item.id === id);

  if (!plant) return;

  closePlantModal();

  const modal = document.createElement("div");

  modal.id = "plantEditModal";
  modal.className = "plant-modal";

  modal.innerHTML = `

    <div
      class="plant-modal-backdrop"
      data-close-modal
    ></div>

    <section
      class="plant-modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editPlantTitle"
    >

      <div class="plant-modal-heading">

        <div>

          <p class="eyebrow">MINHA GALERIA</p>

          <h2 id="editPlantTitle">Editar planta</h2>

          <p class="modal-description">
            Atualize as informações da sua planta.
          </p>

        </div>

        <button
          type="button"
          class="modal-close"
          data-close-modal
        >
          ×
        </button>

      </div>

      <form id="editPlantForm" class="plant-edit-form">

        <div class="edit-photo-section">

          <div class="edit-photo-preview">

            <img
              id="editPlantPreview"
              src="${escapeHTML(plant.photo || "")}"
              alt="Foto da planta"
              class="${plant.photo ? "" : "hidden"}"
            >

            <span
              id="editPlantPhotoFallback"
              class="${plant.photo ? "hidden" : ""}"
            >
              🌿
            </span>

          </div>

          <div class="edit-photo-information">

            <strong>Foto da planta</strong>

            <p>Escolha uma imagem para representar sua planta.</p>

            <label
              for="editPlantPhoto"
              class="edit-photo-button"
            >
              Alterar imagem
            </label>

            <input
              type="file"
              id="editPlantPhoto"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
            >

            <small class="field-hint">
              JPG, PNG ou WEBP · Máximo 5 MB
            </small>

            <label class="remove-photo-label">

              <input
                type="checkbox"
                id="removePlantPhoto"
              >

              Remover foto atual

            </label>

          </div>

        </div>

        <div class="edit-form-divider"></div>

        <div class="edit-form-section">

          <div class="edit-section-title">

            <h3>Informações da planta</h3>

            <p>Altere os dados de identificação.</p>

          </div>

          <div class="form-field">

            <label for="editPlantName">
              Nome popular *
            </label>

            <input
              type="text"
              id="editPlantName"
              value="${escapeHTML(plant.name)}"
              required
            >

          </div>

          <div class="form-field">

            <label for="editPlantLatin">
              Nome científico
            </label>

            <input
              type="text"
              id="editPlantLatin"
              value="${escapeHTML(plant.latin)}"
            >

          </div>

        </div>

        <p
          id="editPlantError"
          class="form-error full-width"
          role="alert"
        ></p>

        <div class="form-actions full-width">

          <button
            type="button"
            class="secondary-button"
            data-close-modal
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="primary-button"
          >
            Salvar alterações
          </button>

        </div>

      </form>

    </section>

  `;

  document.body.appendChild(modal);

  const photoInput = modal.querySelector("#editPlantPhoto");

  photoInput.addEventListener("change", async event => {

    const file = event.target.files?.[0];

    error("#editPlantError");

    if (!file) return;

    const validationError = validateImage(file);

    if (validationError) {

      photoInput.value = "";

      error("#editPlantError", validationError);

      return;
    }

    try {

      const photo = await compressImage(file);

      modal.querySelector("#editPlantPreview").src = photo;

      modal.querySelector("#editPlantPreview")
        .classList.remove("hidden");

      modal.querySelector("#editPlantPhotoFallback")
        .classList.add("hidden");

      modal.querySelector("#removePlantPhoto").checked = false;

    } catch (imageError) {

      photoInput.value = "";

      error("#editPlantError", imageError.message);

    }

  });


  modal.querySelector("#removePlantPhoto")
    .addEventListener("change", event => {

      if (event.target.checked) {

        modal.querySelector("#editPlantPreview")
          .classList.add("hidden");

        modal.querySelector("#editPlantPhotoFallback")
          .classList.remove("hidden");

        photoInput.value = "";

      } else if (plant.photo) {

        modal.querySelector("#editPlantPreview")
          .classList.remove("hidden");

        modal.querySelector("#editPlantPhotoFallback")
          .classList.add("hidden");

      }

    });


  modal.querySelector("#editPlantForm")
    .addEventListener("submit", async event => {

      event.preventDefault();

      error("#editPlantError");

      const name = modal.querySelector("#editPlantName")
        .value.trim();

      const latin = modal.querySelector("#editPlantLatin")
        .value.trim();

      if (name.length < 2) {

        return error(
          "#editPlantError",
          "Digite um nome válido para a planta."
        );

      }

      const newFile = photoInput.files?.[0];

      if (newFile) {

        const validationError = validateImage(newFile);

        if (validationError) {
          return error("#editPlantError", validationError);
        }

      }

      try {

        let photo = plant.photo || "";

        if (newFile) {
          photo = await compressImage(newFile);
        }

        if (modal.querySelector("#removePlantPhoto").checked) {
          photo = "";
        }

        const updatedPlant = await updatePlantApi({

          id: plant.id,
          name,
          latin,
          photo

        });

        Object.assign(plant, updatedPlant);

        closePlantModal();

        renderPlants();

        if (activePlant?.id === id) {
          await showPlant(id);
        }

        toast(`${plant.name} foi atualizada!`);

      } catch (saveError) {

        console.error(saveError);

        error(
          "#editPlantError",
          "Não foi possível salvar as alterações no banco."
        );

      }

    });


  modal.querySelectorAll("[data-close-modal]")
    .forEach(button => {
      button.addEventListener("click", closePlantModal);
    });

  modal.querySelector("#editPlantName").focus();

}


/* =========================================================
   29. ATUALIZAÇÃO DOS CARDS DOS SENSORES
========================================================= */

function setSensor(key, value, unit, percent) {

  const valueElement = $(`#${key}Value`);
  const meter = $(`#${key}Meter`);

  if (!valueElement || !meter) return;

  if (value === null || value === undefined || value === "") {

    valueElement.textContent = "--";
    meter.style.width = "0%";

    return;
  }

  valueElement.textContent =
    `${Number(value).toLocaleString("pt-BR")}${unit}`;

  meter.style.width =
    `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;

}


/* =========================================================
   30. EXIBIR DETALHES DA PLANTA
========================================================= */

async function showPlant(id) {

  activePlant = plants.find(
    plant => plant.id === String(id)
  );

  if (!activePlant) return;

  $("#galleryView").classList.add("hidden");
  $("#detailView").classList.remove("hidden");

  $("#detailPlantName").textContent = activePlant.name;

  $("#detailPlantMeta").textContent =
    `${activePlant.latin || "Espécie não informada"} · ${activePlant.place}`;

  $("#detailStatus").textContent = "Carregando dados...";

  $("#connectionBadge").textContent = "● Consultando sensores";

  // Carrega os relatórios reais da API.
  activePlantReports = await loadReportsFromApi(activePlant.id);

  updateSensorsFromReports(activePlantReports);

  // Foto da planta.
  if (activePlant.photo) {

    $("#detailPlantIcon").innerHTML = `

      <img
        src="${escapeHTML(activePlant.photo)}"
        alt="Foto de ${escapeHTML(activePlant.name)}"
      >

    `;

    $("#detailPlantIcon").classList.add("has-photo");

  } else {

    $("#detailPlantIcon").textContent = "🌿";

    $("#detailPlantIcon").classList.remove("has-photo");

  }

  // Cards dos sensores.
  setSensor(
    "soil",
    activePlant.soil,
    "%",
    activePlant.soil
  );

  setSensor(
    "temp",
    activePlant.temp,
    " °C",
    activePlant.temp !== null
      ? ((activePlant.temp + 20) / 100) * 100
      : 0
  );

  setSensor(
    "air",
    activePlant.air,
    "%",
    activePlant.air
  );

  setSensor(
    "water",
    activePlant.water,
    "%",
    activePlant.water
  );

  const latest = activePlantReports.length
    ? activePlantReports[activePlantReports.length - 1]
    : null;

  $("#infoDate").textContent = latest?.dataHora
    ? new Date(latest.dataHora).toLocaleString("pt-BR")
    : "Aguardando dados";

  $("#infoDevice").textContent = "Não informado";

  $("#detailStatus").textContent = latest
    ? "Dados reais do IoT"
    : "Aguardando leituras";

  $("#connectionBadge").textContent = latest
    ? "● Sensores conectados"
    : "● Sem leituras registradas";

  updateCareInfo(activePlant);

  renderChart($("#chartMetric").value);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   31. ORIENTAÇÕES DA PLANTA
========================================================= */

function updateCareInfo(plant) {

  const hasSensorData =
    plant.soil !== null &&
    plant.soil !== undefined;

  $("#careTitle").textContent =
    `Cuidados com ${plant.name}`;

  if (!hasSensorData) {

    $("#careText").textContent =
      "As informações de monitoramento estarão disponíveis após o recebimento das leituras dos sensores IoT.";

    return;
  }

  const suggestions = [];

  if (plant.soil < 35) {

    suggestions.push(
      "A umidade do solo está baixa; verifique a necessidade de rega."
    );

  } else if (plant.soil > 80) {

    suggestions.push(
      "A umidade do solo está elevada; observe se há excesso de água."
    );

  } else {

    suggestions.push(
      "A umidade do solo está dentro da faixa ilustrativa."
    );

  }

  if (plant.temp > 32) {

    suggestions.push(
      "A temperatura está alta; avalie a ventilação do ambiente."
    );

  } else if (plant.temp < 12) {

    suggestions.push(
      "A temperatura está baixa; confira as necessidades da espécie."
    );

  }

  $("#careText").textContent =
    suggestions.join(" ") +
    " Consulte também as necessidades específicas da espécie.";

}


/* =========================================================
   32. GRÁFICO COM DADOS REAIS
========================================================= */

function renderChart(metric) {

  if (!activePlant) return;

  const config = metrics[metric] || metrics.soil;

  const reports = activePlantReports;

  $("#metricLabel").textContent =
    `${config.label} atual`;

  if (!reports || reports.length === 0) {

    $("#metricCurrent").textContent = "--";

    $("#metricTrend").textContent =
      "Aguardando integração com sensores";

    if (chart) {
      chart.destroy();
      chart = null;
    }

    return;
  }

  const latest = reports[reports.length - 1];

  const current = latest[config.field];

  if (current === null || current === undefined) {

    $("#metricCurrent").textContent = "--";

    $("#metricTrend").textContent =
      "Sem leitura disponível para esta categoria";

    if (chart) {
      chart.destroy();
      chart = null;
    }

    return;
  }

  $("#metricCurrent").textContent =
    `${Number(current).toLocaleString("pt-BR")}${config.unit}`;

  $("#metricTrend").textContent =
    "Histórico real das medições";

  if (typeof Chart === "undefined") {

    $("#metricTrend").textContent =
      "Biblioteca de gráfico indisponível";

    return;
  }

  const validReports = reports.filter(report => {

    return report[config.field] !== null &&
      report[config.field] !== undefined;

  });

  const labels = validReports.map(report => {

    return report.dataHora
      ? new Date(report.dataHora).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "Sem data";

  });

  const values = validReports.map(report => {
    return Number(report[config.field]);
  });

  if (chart) {
    chart.destroy();
    chart = null;
  }

  chart = new Chart($("#plantChart"), {

    type: "line",

    data: {

      labels,

      datasets: [

        {

          label: config.label,

          data: values,

          borderColor: config.color,

          backgroundColor: config.background,

          pointBackgroundColor: config.color,

          pointBorderColor: "#ffffff",

          pointBorderWidth: 2,

          pointRadius: 3,

          pointHoverRadius: 5,

          borderWidth: 3,

          fill: true,

          tension: 0.35

        }

      ]

    },

    options: {

      responsive: true,

      maintainAspectRatio: false,

      interaction: {
        intersect: false,
        mode: "index"
      },

      plugins: {

        legend: {
          display: false
        },

        tooltip: {

          backgroundColor: "#243b2c",

          padding: 12,

          displayColors: false,

          callbacks: {

            label(context) {

              return `${config.label}: ${context.parsed.y.toLocaleString("pt-BR")}${config.unit}`;

            }

          }

        }

      },

      scales: {

        x: {

          grid: {
            display: false
          },

          border: {
            display: false
          }

        },

        y: {

          beginAtZero: metric !== "temp",

          grid: {
            color: "#edf1eb"
          },

          border: {
            display: false
          },

          ticks: {

            callback(value) {
              return `${value}${config.unit}`;
            }

          }

        }

      }

    }

  });

}


/* =========================================================
   33. ALTERAR CATEGORIA DO GRÁFICO
========================================================= */

$("#chartMetric").addEventListener("change", event => {
  renderChart(event.target.value);
});


/* =========================================================
   34. FECHAR MODAL COM ESC
========================================================= */

document.addEventListener("keydown", event => {

  if (event.key === "Escape") {
    closePlantModal();
  }

});


/* =========================================================
   35. NAVEGAÇÃO, LOGOUT E LIMPEZA DOS DADOS
========================================================= */

$("#backToGallery").addEventListener("click", showGallery);

$("#navPlants").addEventListener("click", showGallery);

$("#logoutButton").addEventListener("click", () => {

  // Encerra a sessão e limpa os dados locais solicitados.
  sessionStorage.clear();
  localStorage.clear();

  currentSession = null;
  plants = [];
  activePlant = null;
  activePlantReports = [];

  if (chart) {
    chart.destroy();
    chart = null;
  }

  closePlantModal();
  closeAddPlantForm();

  $("#loginForm").reset();
  $("#registerForm").reset();
  $("#forgotForm").reset();
  $("#plantSearch").value = "";

  renderPlants();

  showView("welcomeView");

  toast("Você saiu da conta.");

});


/* =========================================================
   36. RESTAURAR SESSÃO
========================================================= */

const savedSession = readSession();

if (
  savedSession &&
  savedSession.id &&
  savedSession.name &&
  savedSession.email
) {

  enterApp(savedSession).catch(sessionError => {

    console.error(
      "Não foi possível restaurar a sessão:",
      sessionError
    );

    sessionStorage.removeItem(SESSION_KEY);

    currentSession = null;

    showView("welcomeView");

  });

} else {

  sessionStorage.removeItem(SESSION_KEY);

  currentSession = null;

  showView("welcomeView");

}