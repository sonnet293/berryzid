import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const postList = document.getElementById("post-list");
const skeletonList = document.getElementById("skeleton-list");