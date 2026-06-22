// js/character.js
import { auth, db, OWNER_UID } from "./firebase.js";
import { uploadImage } from "./supabase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  onSnapshot,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 카드 8개 고정 (윗줄 4 + 아랫줄 4)
const CARD_COUNT = 8;
const docRef = doc(db, "characterCards", "main");

let cardsData = makeEmptyCards();
let isOwner = false;
let currentEditIndex = null;
let selectedFile = null;
let photoRemoved = false; // "사진 삭제" 버튼을 눌렀는지 여부

function makeEmptyCards() {
  return Array.from({ length: CARD_COUNT }, () => ({ name: "", imageUrl: "" }));
}

// ===== DOM =====
const gallery = document.getElementById("gallery");
const loginToggleBtn = document.getElementById("loginToggleBtn");
const logoutBtn = document.getElementById("logoutBtn");
const ownerBadge = document.getElementById("ownerBadge");

const loginPanel = document.getElementById("loginPanel");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");
const loginCancelBtn = document.getElementById("loginCancelBtn");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");

const editModal = document.getElementById("editModal");
const previewImg = document.getElementById("previewImg");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const fileInput = document.getElementById("fileInput");
const nameInput = document.getElementById("nameInput");
const modalError = document.getElementById("modalError");
const removePhotoBtn = document.getElementById("removePhotoBtn");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");

// ===== 카드 8개 DOM 한 번만 만들고, 내용은 계속 갱신 =====
function buildGallery() {
  for (let i = 0; i < CARD_COUNT; i++) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.index = String(i);
    card.innerHTML = `
      <div class="photo-frame is-empty">
        <span class="tape"></span>
        <img class="photo-img" alt="" />
        <div class="photo-placeholder">
          <span class="plus">＋</span>
          <span class="placeholder-text">사진 없음</span>
        </div>
        <button type="button" class="edit-btn" aria-label="편집" title="편집">✏️</button>
      </div>
      <p class="card-name is-empty">이름 없음</p>
    `;

    const photoFrame = card.querySelector(".photo-frame");
    const editBtn = card.querySelector(".edit-btn");

    // 연필 버튼 클릭 -> 편집 모달 열기 (주인만 버튼이 보이긴 하지만 한 번 더 체크)
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isOwner) return;
      openEditModal(i);
    });

    // 사진 영역 자체를 눌러도 주인이면 편집 가능
    photoFrame.addEventListener("click", () => {
      if (!isOwner) return;
      openEditModal(i);
    });

    gallery.appendChild(card);
  }
}

// ===== Firestore 데이터로 카드 내용 갱신 =====
function renderCards() {
  const cards = gallery.querySelectorAll(".card");
  cards.forEach((card, i) => {
    const data = cardsData[i] || { name: "", imageUrl: "" };
    const photoFrame = card.querySelector(".photo-frame");
    const img = card.querySelector(".photo-img");
    const nameEl = card.querySelector(".card-name");

    if (data.imageUrl) {
      img.src = data.imageUrl;
      img.alt = data.name || "";
      photoFrame.classList.remove("is-empty");
    } else {
      img.src = "";
      photoFrame.classList.add("is-empty");
    }

    if (data.name) {
      nameEl.textContent = data.name;
      nameEl.classList.remove("is-empty");
    } else {
      nameEl.textContent = "이름 없음";
      nameEl.classList.add("is-empty");
    }
  });
}

// ===== Firestore 실시간 구독 =====
onSnapshot(
  docRef,
  (snap) => {
    if (snap.exists() && Array.isArray(snap.data().cards)) {
      const saved = snap.data().cards;
      // 저장된 카드 수가 8개보다 적어도 비어있는 카드로 채워줌
      cardsData = makeEmptyCards().map((empty, i) => ({ ...empty, ...saved[i] }));
    } else {
      cardsData = makeEmptyCards();
    }
    renderCards();
  },
  (err) => {
    console.error("카드 불러오기 실패:", err);
  }
);

// ===== 주인 인증 =====
function updateAuthUI() {
  if (isOwner) {
    loginToggleBtn.hidden = true;
    logoutBtn.hidden = false;
    ownerBadge.hidden = false;
    loginPanel.hidden = true;
  } else {
    loginToggleBtn.hidden = false;
    logoutBtn.hidden = true;
    ownerBadge.hidden = true;
  }
  document.body.classList.toggle("is-owner", isOwner);
}

onAuthStateChanged(auth, (user) => {
  isOwner = !!user && user.uid === OWNER_UID;
  updateAuthUI();

  // 주인이 아닌 다른 계정으로 로그인된 경우, 바로 로그아웃 처리
  if (user && !isOwner) {
    alert("주인 계정이 아니에요!");
    signOut(auth);
  }
});

// 로그인 버튼 누르면 이메일/비밀번호 패널 열고 닫기
loginToggleBtn.addEventListener("click", () => {
  loginPanel.hidden = !loginPanel.hidden;
  loginError.hidden = true;
  if (!loginPanel.hidden) emailInput.focus();
});

loginCancelBtn.addEventListener("click", () => {
  loginPanel.hidden = true;
  loginError.hidden = true;
});

async function tryLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    loginError.textContent = "이메일/비밀번호를 입력해줘";
    loginError.hidden = false;
    return;
  }

  loginSubmitBtn.disabled = true;
  loginError.hidden = true;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginPanel.hidden = true;
    emailInput.value = "";
    passwordInput.value = "";
  } catch (err) {
    console.error("로그인 실패:", err);
    loginError.textContent = "이메일 또는 비밀번호가 틀렸어요";
    loginError.hidden = false;
  } finally {
    loginSubmitBtn.disabled = false;
  }
}

loginSubmitBtn.addEventListener("click", tryLogin);

passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryLogin();
});

logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

// ===== 편집 모달 =====
function openEditModal(index) {
  currentEditIndex = index;
  selectedFile = null;
  photoRemoved = false;
  fileInput.value = "";
  modalError.hidden = true;

  const data = cardsData[index] || { name: "", imageUrl: "" };
  nameInput.value = data.name || "";
  setPreview(data.imageUrl || "");

  editModal.hidden = false;
}

function closeEditModal() {
  editModal.hidden = true;
  currentEditIndex = null;
  selectedFile = null;
}

function setPreview(url) {
  if (url) {
    previewImg.src = url;
    previewImg.hidden = false;
    previewPlaceholder.hidden = true;
  } else {
    previewImg.src = "";
    previewImg.hidden = true;
    previewPlaceholder.hidden = false;
  }
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  selectedFile = file;
  photoRemoved = false;
  setPreview(URL.createObjectURL(file));
});

removePhotoBtn.addEventListener("click", () => {
  selectedFile = null;
  photoRemoved = true;
  fileInput.value = "";
  setPreview("");
});

cancelBtn.addEventListener("click", closeEditModal);

editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

saveBtn.addEventListener("click", async () => {
  if (currentEditIndex === null) return;

  modalError.hidden = true;
  saveBtn.disabled = true;
  cancelBtn.disabled = true;
  const originalLabel = saveBtn.textContent;
  saveBtn.textContent = "저장 중...";

  try {
    let imageUrl = cardsData[currentEditIndex].imageUrl || "";

    if (selectedFile) {
      imageUrl = await uploadImage(selectedFile, selectedFile.name);
    } else if (photoRemoved) {
      imageUrl = "";
    }

    const newCards = cardsData.map((c, i) =>
      i === currentEditIndex ? { name: nameInput.value.trim(), imageUrl } : c
    );

    await setDoc(docRef, { cards: newCards }, { merge: true });
    closeEditModal();
  } catch (err) {
    console.error("저장 실패:", err);
    modalError.textContent = "저장에 실패했어요: " + err.message;
    modalError.hidden = false;
  } finally {
    saveBtn.disabled = false;
    cancelBtn.disabled = false;
    saveBtn.textContent = originalLabel;
  }
});

// ===== 초기화 =====
buildGallery();
renderCards();