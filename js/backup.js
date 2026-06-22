// js/backup.js
import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─────────────────────────────────────────────
// DOM
// ─────────────────────────────────────────────
const postList       = document.getElementById("post-list");
const skeletonList   = document.getElementById("skeleton-list");
const emptyState     = document.getElementById("empty-state");
const toastEl        = document.getElementById("toast");

// 비밀번호 모달
const secretModal       = document.getElementById("secret-modal");
const secretModalClose  = document.getElementById("secret-modal-close");
const secretModalCancel = document.getElementById("secret-modal-cancel");
const secretModalConfirm= document.getElementById("secret-modal-confirm");
const secretPwInput     = document.getElementById("secret-pw-input");
const modalPwError      = document.getElementById("modal-pw-error");

// 글 상세 모달
const postModal      = document.getElementById("post-modal");
const postModalClose = document.getElementById("post-modal-close");
const postModalTitle = document.getElementById("post-modal-title");
const postModalBody  = document.getElementById("post-modal-body");
const postModalMeta  = document.getElementById("post-modal-meta");

// ─────────────────────────────────────────────
// 상태
// ─────────────────────────────────────────────
let allPosts = [];                    // 전체 게시글 캐시
let pendingPost = null;               // 비밀번호 확인 대기 중인 post

// ─────────────────────────────────────────────
// 날짜 포맷
// ─────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

// ─────────────────────────────────────────────
// 글 목록 로드
// ─────────────────────────────────────────────
async function loadPosts() {
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    skeletonList.style.display = "none";

    if (allPosts.length === 0) {
      emptyState.style.display = "flex";
      return;
    }

    postList.style.display = "flex";
    renderCards(allPosts);
  } catch (err) {
    skeletonList.style.display = "none";
    showToast("글을 불러오는 데 실패했어요: " + err.message, true);
  }
}

// ─────────────────────────────────────────────
// 카드 렌더링
// ─────────────────────────────────────────────
function renderCards(posts) {
  postList.innerHTML = "";
  posts.forEach(post => {
    const card = document.createElement("article");
    card.className = "post-card";
    card.dataset.id = post.id;

    const thumb = post.thumbnailUrl
      ? `<div class="card-thumb"><img src="${post.thumbnailUrl}" alt="" loading="lazy" /></div>`
      : `<div class="card-thumb card-thumb--empty">
           <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
             <rect x="3" y="5" width="26" height="22" rx="4" stroke="currentColor" stroke-width="1.5"/>
             <path d="M3 19l7-6 6 6 4-4 9 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>
         </div>`;

    const secretBadge = post.isSecret
      ? `<span class="badge badge-secret">
           <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
             <rect x="2" y="4.5" width="6" height="5" rx="1" stroke="currentColor" stroke-width="1.1"/>
             <path d="M3.5 4.5V3.5a1.5 1.5 0 013 0v1" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
           </svg>
           비밀글
         </span>`
      : "";

    card.innerHTML = `
      ${thumb}
      <div class="card-body">
        <div class="card-top">
          <h2 class="card-title">${post.title}</h2>
          ${secretBadge}
        </div>
        <p class="card-date">${formatDate(post.createdAt)}</p>
      </div>
    `;

    card.addEventListener("click", () => handleCardClick(post));
    postList.appendChild(card);
  });
}

// ─────────────────────────────────────────────
// 카드 클릭
// ─────────────────────────────────────────────
function handleCardClick(post) {
  if (post.isSecret) {
    openSecretModal(post);
  } else {
    openPostModal(post);
  }
}

// ─────────────────────────────────────────────
// 비밀번호 모달
// ─────────────────────────────────────────────
function openSecretModal(post) {
  pendingPost = post;
  secretPwInput.value = "";
  modalPwError.textContent = "";
  secretModal.classList.add("active");
  setTimeout(() => secretPwInput.focus(), 100);
}

function closeSecretModal() {
  secretModal.classList.remove("active");
  pendingPost = null;
  secretPwInput.value = "";
  modalPwError.textContent = "";
}

secretModalClose.addEventListener("click", closeSecretModal);
secretModalCancel.addEventListener("click", closeSecretModal);
secretModal.addEventListener("click", (e) => { if (e.target === secretModal) closeSecretModal(); });

secretPwInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") secretModalConfirm.click();
});

secretModalConfirm.addEventListener("click", () => {
  if (!pendingPost) return;
  const input = secretPwInput.value;
  if (input === pendingPost.secretPassword) {
    closeSecretModal();
    openPostModal(pendingPost);
  } else {
    modalPwError.textContent = "비밀번호가 올바르지 않아요.";
    secretPwInput.value = "";
    secretPwInput.focus();
    // 흔들기 애니메이션
    secretPwInput.classList.add("shake");
    setTimeout(() => secretPwInput.classList.remove("shake"), 400);
  }
});

// ─────────────────────────────────────────────
// 글 상세 모달
// ─────────────────────────────────────────────
function openPostModal(post) {
  postModalTitle.textContent = post.title;
  postModalBody.innerHTML = post.content;
  postModalMeta.textContent = formatDate(post.createdAt);
  postModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePostModal() {
  postModal.classList.remove("active");
  document.body.style.overflow = "";
}

postModalClose.addEventListener("click", closePostModal);
// ESC 키
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (postModal.classList.contains("active")) closePostModal();
    if (secretModal.classList.contains("active")) closeSecretModal();
  }
});

// ─────────────────────────────────────────────
// 토스트
// ─────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError=false) {
  toastEl.textContent = msg;
  toastEl.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
}

// ─────────────────────────────────────────────
// 시작
// ─────────────────────────────────────────────
loadPosts();