// js/board.js
import { auth, db, OWNER_UID } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function initBoard() {
    const boardEl = document.getElementById("marquee-board");
    if (!boardEl) return;

    const pageId = boardEl.dataset.pageId || "default";

    // DOM 구조 삽입

}