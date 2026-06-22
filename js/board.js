// js/board.js
import { auth, db, OWNER_UID } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ───────────────────────────────────────────
   전광판 초기화
   사용법: <div id="marquee-board" data-page-id="about"></div>
─────────────────────────────────────────── */
async function initBoard() {
  const boardEl = document.getElementById("marquee-board");
  if (!boardEl) return;

  const pageId = boardEl.dataset.pageId || "default";

  // DOM 구조 주입
  boardEl.innerHTML = `
    <div class="marquee-wrap">
      <div class="marquee-track">
        <span class="marquee-text"></span>
        <span class="marquee-text" aria-hidden="true"></span>
      </div>
      <button class="marquee-edit-btn" title="전광판 수정" style="display:none;">✏️</button>
    </div>

    <!-- 수정 모달 -->
    <div class="marquee-modal-overlay" style="display:none;">
      <div class="marquee-modal">
        <h3 class="marquee-modal-title">전광판 문구 수정</h3>
        <p class="marquee-modal-page">페이지: <strong>${pageId}</strong></p>
        <textarea class="marquee-modal-textarea" rows="3" maxlength="300"
          placeholder="표시할 문구를 입력하세요..."></textarea>
        <div class="marquee-modal-actions">
          <button class="marquee-btn-cancel">취소</button>
          <button class="marquee-btn-save">저장</button>
        </div>
        <p class="marquee-modal-msg"></p>
      </div>
    </div>
  `;

  const textEls    = boardEl.querySelectorAll(".marquee-text");
  const editBtn    = boardEl.querySelector(".marquee-edit-btn");
  const overlay    = boardEl.querySelector(".marquee-modal-overlay");
  const textarea   = boardEl.querySelector(".marquee-modal-textarea");
  const btnCancel  = boardEl.querySelector(".marquee-btn-cancel");
  const btnSave    = boardEl.querySelector(".marquee-btn-save");
  const msgEl      = boardEl.querySelector(".marquee-modal-msg");

  // ── Firestore에서 문구 읽기 ──
  async function loadText() {
    try {
      const snap = await getDoc(doc(db, "marquee", pageId));
      return snap.exists() ? snap.data().text || "" : "";
    } catch {
      return "";
    }
  }

  // ── 마퀴 텍스트 세팅 ──
  function applyText(text) {
    const display = text.trim() || "문구를 설정해주세요.";
    textEls.forEach((el) => (el.textContent = display + "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"));
  }

  // 초기 로드
  const initialText = await loadText();
  applyText(initialText);

  // ── 인증 상태 감지 → 주인이면 편집 버튼 표시 ──
  onAuthStateChanged(auth, (user) => {
    if (user && user.uid === OWNER_UID) {
      editBtn.style.display = "flex";
    } else {
      editBtn.style.display = "none";
    }
  });

  // ── 편집 버튼 클릭 → 모달 열기 ──
  editBtn.addEventListener("click", async () => {
    const current = await loadText();
    textarea.value = current;
    msgEl.textContent = "";
    overlay.style.display = "flex";
    textarea.focus();
  });

  // ── 취소 ──
  btnCancel.addEventListener("click", () => {
    overlay.style.display = "none";
  });

  // ── 오버레이 클릭으로 닫기 ──
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  });

  // ── 저장 ──
  btnSave.addEventListener("click", async () => {
    const newText = textarea.value.trim();
    if (!newText) {
      msgEl.textContent = "⚠️ 문구를 입력해주세요.";
      return;
    }

    btnSave.disabled = true;
    msgEl.textContent = "저장 중...";

    try {
      await setDoc(doc(db, "marquee", pageId), {
        text: newText,
        updatedAt: new Date().toISOString(),
      });
      applyText(newText);
      msgEl.textContent = "✅ 저장됐어!";
      setTimeout(() => (overlay.style.display = "none"), 800);
    } catch (err) {
      console.error(err);
      msgEl.textContent = "❌ 저장 실패. 다시 시도해줘.";
    } finally {
      btnSave.disabled = false;
    }
  });
}

// 실행
initBoard();