
// ==================================================
// SMARTPLANT / VERDE VIVO
// JavaScript principal
// ==================================================

const ACCOUNTS_KEY = "verdeVivo.accounts";
const SESSION_KEY = "verdeVivo.session";
const PLANTS_KEY = "verdeVivo.plants";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const $ = selector => document.querySelector(selector);

let activePlant = null;
let chart = null;
let toastTimer;

// ==================================================
// PLANTAS INICIAIS DE DEMONSTRAÇÃO
// ==================================================

const defaultPlants = [
  {
    id: "jiboia",
    name: "Jiboia",
    latin: "Epipremnum aureum",
    photo: "",
    soil: 64,
    temp: 24.8,
    air: 58,
    water: 72
  },
  {
    id: "espada",
    name: "Espada-de-São-Jorge",
    latin: "Dracaena trifasciata",
    photo: "",
    soil: 42,
    temp: 23.4,
    air: 51,
    water: 80
  },
  {
    id: "manjericao",
    name: "Manjericão",
    latin: "Ocimum basilicum",
    photo: "",
    soil: 71,
    temp: 26.1,
    air: 62,
    water: 46
  },
  {
    id: "suculenta",
    name: "Suculenta",
    latin: "Echeveria elegans",
    photo: "",
    soil: 35,
    temp: 25.2,
    air: 47,
    water: 60
  }
];

// ==================================================
// CONFIGURAÇÃO DOS GRÁFICOS
// ==================================================

const metrics = {
  soil: {
    label: "Umidade do solo",
    field: "soil",
    unit: "%",
    color: "#42966a",
    background: "rgba(66, 150, 106, 0.15)"
  },

  temp: {
    label: "Temperatura",
    field: "temp",
    unit: " °C",
    color: "#e58b43",
    background: "rgba(229, 139, 67, 0.16)"
  },

  air: {
    label: "Umidade do ar",
    field: "air",
    unit: "%",
    color: "#4298c7",
    background: "rgba(66, 152, 199, 0.15)"
  },

  water: {
    label: "Nível de água",
    field: "water",
    unit: "%",
    color: "#8270ce",
    background: "rgba(130, 112, 206, 0.15)"
  }
};

// ==================================================
// ARMAZENAMENTO
// ==================================================

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Erro ao ler ${key}:`, error);
    return fallback;
  }
}

function readAccounts() {
  return readStorage(ACCOUNTS_KEY, []);
}

function saveAccounts(accounts) {
  localStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify(accounts)
  );
}

function readPlants() {
  const saved = readStorage(PLANTS_KEY, null);

  if (Array.isArray(saved)) {
    return saved;
  }

  return defaultPlants.map(plant => ({ ...plant }));
}

let plants = readPlants();

function savePlants() {
  localStorage.setItem(
    PLANTS_KEY,
    JSON.stringify(plants)
  );
}

// ==================================================
// FUNÇÕES GERAIS
// ==================================================

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
  return String(value).replace(/[&<>"']/g, character => ({
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

// ==================================================
// VALIDAÇÃO DE IMAGENS
// ==================================================

function validateImage(file) {
  if (!file) {
    return null;
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Formato inválido. Envie uma imagem JPG, PNG ou WEBP.";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "A imagem deve ter no máximo 5 MB.";
  }

  return null;
}

// ==================================================
// COMPRESSÃO DE IMAGENS
// ==================================================

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

// ==================================================
// PRÉ-VISUALIZAÇÃO DA IMAGEM NO CADASTRO
// ==================================================

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

      previewImage.src = photo;
      preview.classList.remove("hidden");

    } catch (imageError) {
      newPhotoInput.value = "";
      preview?.classList.add("hidden");

      error("#addPlantError", imageError.message);
    }
  });
}

// ==================================================
// MOSTRAR E OCULTAR SENHAS
// ==================================================

document.querySelectorAll("[data-toggle-password]")
  .forEach(button => {

    button.addEventListener("click", () => {
      const inputId = button.dataset.togglePassword;
      const input = $("#" + inputId);

      if (!input) return;

      const showPassword = input.type === "password";

      input.type = showPassword ? "text" : "password";

      button.textContent = showPassword ? "👁" : "👁";

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

// ==================================================
// NAVEGAÇÃO ENTRE TELAS
// ==================================================

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

// ==================================================
// LOGIN E CADASTRO
// ==================================================

function enterApp(account) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      name: account.name,
      email: account.email
    })
  );

  $("#userName").textContent = account.name;

  showView("appView");
  showGallery();

  toast(`Bem-vindo ao SmartPlant, ${account.name}!`);
}

$("#registerForm").addEventListener("submit", event => {
  event.preventDefault();

  error("#registerError");

  const name = $("#registerName").value.trim();
  const email = $("#registerEmail").value.trim().toLowerCase();
  const password = $("#registerPassword").value;
  const confirm = $("#registerConfirm").value;

  if (name.length < 2) {
    return error(
      "#registerError",
      "Informe seu nome completo."
    );
  }

  if (!validEmail(email)) {
    return error(
      "#registerError",
      "Digite um e-mail válido."
    );
  }

  if (password.length < 4) {
    return error(
      "#registerError",
      "A senha precisa ter pelo menos 4 caracteres."
    );
  }

  if (password !== confirm) {
    return error(
      "#registerError",
      "As senhas não coincidem."
    );
  }

  const accounts = readAccounts();

  if (accounts.some(account => account.email === email)) {
    return error(
      "#registerError",
      "Este e-mail já está cadastrado. Faça login."
    );
  }

  accounts.push({
    name,
    email,
    password
  });

  saveAccounts(accounts);

  enterApp({ name, email });
});

$("#loginForm").addEventListener("submit", event => {
  event.preventDefault();

  error("#loginError");

  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;

  if (!validEmail(email)) {
    return error(
      "#loginError",
      "Digite um e-mail válido."
    );
  }

  if (!password) {
    return error(
      "#loginError",
      "Digite sua senha."
    );
  }

  const accounts = readAccounts();

  const account = accounts.find(item =>
    item.email === email && item.password === password
  );

  const existingEmail = accounts.some(
    item => item.email === email
  );

  if (existingEmail && !account) {
    return error(
      "#loginError",
      "Senha incorreta. Confira os dados."
    );
  }

  // Login demonstrativo.
  const name = account?.name ||
    email.split("@")[0].replace(/[._-]+/g, " ");

  enterApp({ name, email });
});

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

// ==================================================
// GALERIA DE PLANTAS
// ==================================================

function showGallery() {
  $("#galleryView").classList.remove("hidden");
  $("#detailView").classList.add("hidden");

  activePlant = null;

  closeAddPlantForm();
  renderPlants();
}

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

  $("#galleryStatus").textContent =
    `${filtered.length} planta(s) encontrada(s) · dados demonstrativos`;

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
                src="${plant.photo}"
                alt="Foto de ${escapeHTML(plant.name)}"
                loading="lazy"
              >
            `
            : `
              <div
                class="plant-photo-placeholder"
                aria-label="Foto não cadastrada"
              >
                ${escapeHTML(plant.emoji || "🌿")}
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
          ${escapeHTML(plant.place || "Ambiente não informado")}
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
            aria-label="Editar ${escapeHTML(plant.name)}"
            title="Editar planta"
          >
            ✎
          </button>

          <button
            type="button"
            class="plant-delete-button"
            data-delete="${escapeHTML(plant.id)}"
            aria-label="Excluir ${escapeHTML(plant.name)}"
            title="Excluir planta"
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
}

$("#plantSearch").addEventListener("input", renderPlants);

$("#refreshGallery").addEventListener("click", () => {
  $("#plantSearch").value = "";

  renderPlants();

  toast("Galeria atualizada.");
});

// ==================================================
// CARD DE ADICIONAR PLANTA
// ==================================================

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

$("#openAddPlantForm").addEventListener("click", openAddPlantForm);

$("#cancelAddPlant").addEventListener("click", () => {
  $("#addPlantForm").reset();

  $("#newPlantPhotoPreview").classList.add("hidden");

  error("#addPlantError");

  closeAddPlantForm();
});

// ==================================================
// AÇÕES DOS CARDS: DETALHES, EDIÇÃO E EXCLUSÃO
// ==================================================

$("#plantsGrid").addEventListener("click", event => {
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
      `Tem certeza de que deseja excluir ${plant.name}? Essa ação não poderá ser desfeita.`
    );

    if (!confirmed) return;

    const previousPlants = [...plants];

    plants = plants.filter(
      item => item.id !== plant.id
    );

    try {
      savePlants();
    } catch (saveError) {
      plants = previousPlants;

      toast("Não foi possível excluir a planta.");
      return;
    }

    if (activePlant?.id === plant.id) {
      showGallery();
    } else {
      renderPlants();
    }

    toast(`${plant.name} foi excluída da galeria.`);
    return;
  }

  if (detailsButton) {
    showPlant(detailsButton.dataset.open);
    return;
  }

  if (card && !event.target.closest("button")) {
    showPlant(card.dataset.plant);
  }
});

$("#plantsGrid").addEventListener("keydown", event => {
  if (
    (event.key === "Enter" || event.key === " ") &&
    event.target.matches("[data-plant]")
  ) {
    event.preventDefault();

    showPlant(event.target.dataset.plant);
  }
});

// ==================================================
// MODAL DE EDIÇÃO DE PLANTA
// ==================================================

function closePlantModal() {
  const modal = $("#plantEditModal");

  if (modal) {
    modal.remove();
  }
}

function openPlantEditor(id) {
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
          aria-label="Fechar"
        >
          ×
        </button>

      </div>

      <form id="editPlantForm" class="plant-edit-form">

        <div class="edit-photo-section">

          <div class="edit-photo-preview">

            <img
              id="editPlantPreview"
              src="${plant.photo || ""}"
              alt="Pré-visualização da planta"
              class="${plant.photo ? "" : "hidden"}"
            >

            <span
              id="editPlantPhotoFallback"
              class="${plant.photo ? "hidden" : ""}"
            >
              ${escapeHTML(plant.emoji || "🌿")}
            </span>

          </div>

          <div class="edit-photo-information">

            <strong>Foto da planta</strong>

            <p>
              Escolha uma imagem para representar sua planta.
            </p>

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
              placeholder="Ex.: Jiboia"
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
              value="${escapeHTML(plant.latin || "")}"
              placeholder="Ex.: Epipremnum aureum"
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

  // Pré-visualização da nova imagem.
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

  // Remoção da foto atual.
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

  // Salvar alterações.
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

      const oldPlant = { ...plant };

      try {
        let photo = plant.photo || "";

        if (newFile) {
          photo = await compressImage(newFile);
        }

        if (modal.querySelector("#removePlantPhoto").checked) {
          photo = "";
        }

        // Atualiza somente os campos permitidos.
        // Dados de sensores, ambiente e dispositivo permanecem intactos.
        Object.assign(plant, {
          name,
          latin: latin || "Espécie não informada",
          photo
        });

        savePlants();

      } catch (saveError) {
        Object.assign(plant, oldPlant);

        return error(
          "#editPlantError",
          "Não foi possível salvar. Verifique o espaço disponível no navegador."
        );
      }

      closePlantModal();

      renderPlants();

      if (activePlant?.id === id) {
        showPlant(id);
      }

      toast(`${plant.name} foi atualizada!`);
    });

  // Fechar modal.
  modal.querySelectorAll("[data-close-modal]")
    .forEach(button => {
      button.addEventListener("click", closePlantModal);
    });

  modal.querySelector("#editPlantName").focus();
}

// ==================================================
// ADICIONAR NOVA PLANTA
// ==================================================

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

  // Validação da imagem.
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

  const newPlant = {
    id: "planta-" + Date.now(),

    name,

    latin: latin || "Espécie não informada",

    emoji: "🌿",

    photo,

    // Dados aguardando integração com IoT.
    place: "Aguardando integração",

    device: "",

    soil: null,

    temp: null,

    air: null,

    water: null
  };

  plants.push(newPlant);

  try {
    savePlants();

  } catch (storageError) {
    plants.pop();

    return error(
      "#addPlantError",
      "Não foi possível salvar. Verifique o armazenamento disponível no navegador."
    );
  }

  // Limpar formulário.
  $("#addPlantForm").reset();

  $("#newPlantPhotoPreview").classList.add("hidden");

  error("#addPlantError");

  // Fechar formulário.
  closeAddPlantForm();

  // Atualizar galeria.
  $("#plantSearch").value = "";

  renderPlants();

  toast(`${name} foi adicionada à galeria!`);

  $("#plantsGrid").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

// ==================================================
// DETALHES DA PLANTA
// ==================================================

function setSensor(key, value, unit, percent) {
  const valueElement = $(`#${key}Value`);
  const meter = $(`#${key}Meter`);

  if (value === null || value === undefined || value === "") {
    valueElement.textContent = "--";
    meter.style.width = "0%";
    return;
  }

  valueElement.textContent = `${value}${unit}`;

  meter.style.width =
    `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
}

function showPlant(id) {
  activePlant = plants.find(plant => plant.id === id);

  if (!activePlant) return;

  $("#galleryView").classList.add("hidden");
  $("#detailView").classList.remove("hidden");

  // Foto ou emoji da planta.
  if (activePlant.photo) {
    $("#detailPlantIcon").innerHTML = `
      <img
        src="${activePlant.photo}"
        alt="Foto de ${escapeHTML(activePlant.name)}"
      >
    `;

    $("#detailPlantIcon").classList.add("has-photo");

  } else {
    $("#detailPlantIcon").textContent =
      activePlant.emoji || "🌿";

    $("#detailPlantIcon").classList.remove("has-photo");
  }

  $("#detailPlantName").textContent = activePlant.name;

  $("#detailPlantMeta").textContent =
    `${activePlant.latin || "Espécie não informada"} · ${activePlant.place || "Ambiente não informado"}`;

  $("#connectionBadge").textContent =
    activePlant.device
      ? "● Dados simulados"
      : "● Aguardando integração";

  // Sensores.
  setSensor(
    "soil",
    activePlant.soil,
    "%",
    activePlant.soil
  );

  const temperature = activePlant.temp;

  setSensor(
    "temp",
    temperature !== null && temperature !== undefined
      ? Number(temperature).toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        })
      : null,
    " °C",
    temperature !== null
      ? ((temperature + 20) / 100) * 100
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

  $("#infoDate").textContent = activePlant.device
    ? new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Aguardando dados";

  $("#infoDevice").textContent =
    activePlant.device || "Não informado";

  $("#detailStatus").textContent =
    activePlant.device
      ? "Demonstração"
      : "Aguardando integração";

  updateCareInfo(activePlant);

  renderChart($("#chartMetric").value);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// ==================================================
// ORIENTAÇÕES DA PLANTA
// ==================================================

function updateCareInfo(plant) {
  const hasSensorData =
    plant.soil !== null &&
    plant.soil !== undefined;

  $("#careTitle").textContent =
    `Cuidados com ${plant.name}`;

  if (!hasSensorData) {
    $("#careText").textContent =
      "As informações de monitoramento desta planta estarão disponíveis após a integração com os sensores IoT.";

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
      "A umidade do solo está dentro da faixa demonstrativa."
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
    " Consulte as necessidades específicas da espécie. Estes limites são apenas ilustrativos.";
}

// ==================================================
// GRÁFICO
// ==================================================

function renderChart(metric) {
  if (!activePlant) return;

  const config = metrics[metric] || metrics.soil;

  const current = activePlant[config.field];

  $("#metricLabel").textContent =
    `${config.label} atual`;

  if (current === null || current === undefined) {
    $("#metricCurrent").textContent = "--";

    $("#metricTrend").textContent =
      "Aguardando integração com sensores";

    if (chart) {
      chart.destroy();
      chart = null;
    }

    return;
  }

  $("#metricCurrent").textContent =
    `${Number(current).toLocaleString("pt-BR")}${config.unit}`;

  $("#metricTrend").textContent =
    "Histórico ilustrativo";

  if (typeof Chart === "undefined") {
    $("#metricTrend").textContent =
      "Biblioteca de gráfico indisponível";

    return;
  }

  const offsets = [
    -12, -7, -9, -3,
    2, -4, 1, 0,
    -5, 4, -2, 0
  ];

  const factor = metric === "temp" ? 0.25 : 1;

  const values = offsets.map(offset => {
    return Number(
      (Number(current) + offset * factor).toFixed(1)
    );
  });

  if (chart) {
    chart.destroy();
    chart = null;
  }

  chart = new Chart($("#plantChart"), {
    type: "line",

    data: {
      labels: [
        "08h", "09h", "10h", "11h",
        "12h", "13h", "14h", "15h",
        "16h", "17h", "18h", "Agora"
      ],

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

$("#chartMetric").addEventListener("change", event => {
  renderChart(event.target.value);
});

// ==================================================
// FECHAR MODAL COM ESC
// ==================================================

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closePlantModal();
  }
});

// ==================================================
// NAVEGAÇÃO E BOTÕES
// ==================================================

$("#backToGallery").addEventListener("click", showGallery);

$("#navPlants").addEventListener("click", showGallery);

$("#logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);

  if (chart) {
    chart.destroy();
    chart = null;
  }

  activePlant = null;

  closePlantModal();
  closeAddPlantForm();

  showView("welcomeView");

  toast("Você saiu da conta.");
});

// ==================================================
// RESTAURAR SESSÃO
// ==================================================

try {
  const session = JSON.parse(
    sessionStorage.getItem(SESSION_KEY) || "null"
  );

  if (session && session.name && session.email) {
    enterApp(session);

  } else {
    showView("welcomeView");
  }

} catch (errorSession) {
  console.error(
    "Não foi possível restaurar a sessão:",
    errorSession
  );

  showView("welcomeView");
}
